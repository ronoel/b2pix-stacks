import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { PixVerificationStep, PixVerificationStatus } from '../../shared/models/account-validation.model';
import { PixTimerComponent } from './components/pix-timer.component';
import { PixKeyInputComponent } from './components/pix-key-input.component';

@Component({
  selector: 'app-pix-validation',
  standalone: true,
  imports: [CommonModule, FormsModule, PixTimerComponent, PixKeyInputComponent],
  templateUrl: './pix-validation.component.html',
  styleUrl: './pix-validation.component.scss'
})
export class PixValidationComponent implements OnInit, OnDestroy {
  private validationService = inject(AccountValidationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // State
  userPixKey = signal('');
  pixKeyValid = signal(false);
  pixVerification = signal<PixVerificationStatus | null>(null);
  step = signal<PixVerificationStep>('enter-pix');
  loading = signal(false);
  error = signal('');

  // Confirmation
  confirmationCode = signal('');
  noConfirmationCode = signal(false);
  pixKeyConfirmed = signal(false);
  pixKeyCopied = signal(false);

  onConfirmationCodeChange(value: string): void {
    this.confirmationCode.set(value);
    // Limpar mensagem de erro quando usuário começa a digitar
    if (this.error()) {
      this.error.set('');
    }
  }

  // Polling
  private pollInterval: any;

  // Return URL
  private returnUrl = '/dashboard';

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.loadCurrentStatus();
  }

  loadCurrentStatus(): void {
    this.loading.set(true);

    forkJoin({
      status: this.validationService.getValidationStatus(),
      pixVerify: this.validationService.getPixVerification()
    }).subscribe({
      next: ({ status, pixVerify }) => {
        this.loading.set(false);

        // Já validado - redirecionar
        if (status.pix_verified) {
          this.router.navigateByUrl(this.returnUrl);
          return;
        }

        // Email não validado - voltar
        if (!status.email_verified) {
          this.router.navigate(['/email-validation']);
          return;
        }

        // Tem verificação em andamento
        if (pixVerify && pixVerify.status !== null) {
          this.handlePixVerificationStatus(pixVerify);
        }
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error loading status:', err);
      }
    });
  }

  private handlePixVerificationStatus(pixVerify: PixVerificationStatus): void {
    this.pixVerification.set(pixVerify);

    if (pixVerify.user_pix_key) {
      this.userPixKey.set(pixVerify.user_pix_key);
      this.pixKeyValid.set(true);
    }

    switch (pixVerify.status) {
      case 'awaiting':
        // Aguardando depósito do usuário
        this.step.set('deposit-instructions');
        break;
      case 'processing':
        // Pagamento sendo processado - não permite mais entrada de dados
        this.step.set('processing');
        this.startPolling();
        break;
      case 'verified':
        this.step.set('success');
        setTimeout(() => this.router.navigateByUrl(this.returnUrl), 1500);
        break;
      case 'failed':
        this.step.set('failed');
        this.error.set('Código de confirmação incorreto. Solicite nova validação.');
        break;
      case 'expired':
        this.step.set('failed');
        this.error.set('Validação expirada. Solicite nova validação.');
        break;
    }
  }

  onPixKeyChange(value: string): void {
    this.userPixKey.set(value);
  }

  onPixKeyValidChange(isValid: boolean): void {
    this.pixKeyValid.set(isValid);
  }

  confirmPixKeyAndProceed(): void {
    if (!this.pixKeyValid()) {
      this.error.set('CPF ou CNPJ inválido');
      return;
    }

    // Avança para confirmação sem chamar API ainda
    this.step.set('confirm-pix-key');
    this.error.set('');
  }

  createPixVerification(): void {
    if (!this.pixKeyValid()) {
      this.error.set('CPF ou CNPJ inválido');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.validationService.createPixVerification(this.userPixKey()).subscribe({
      next: (verify) => {
        this.loading.set(false);
        this.pixVerification.set({
          status: 'processing',
          user_pix_key: this.userPixKey(),
          destination_pix_key: verify.destination_pix_key,
          confirmation_value_cents: verify.confirmation_value_cents,
          confirmation_value_brl: verify.confirmation_value_brl,
          expires_at: verify.expires_at,
          attempts: verify.attempts,
          max_attempts: verify.max_attempts
        });
        this.step.set('deposit-instructions');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Erro ao criar verificação PIX');
      }
    });
  }

  confirmDeposit(): void {
    this.loading.set(true);
    this.error.set('');

    const code = this.noConfirmationCode() ? undefined : this.confirmationCode();

    this.validationService.confirmPixPayment(code).subscribe({
      next: (response) => {
        this.loading.set(false);

        // Atualizar dados de verificação com resposta
        const currentVerification = this.pixVerification();
        if (currentVerification) {
          this.pixVerification.set({
            ...currentVerification,
            status: response.status,
            attempts: response.attempts,
            max_attempts: response.max_attempts
          });
        }

        // Verificar status da resposta
        if (response.status === 'verified') {
          // Pagamento encontrado e validado - sucesso!
          this.step.set('success');
          setTimeout(() => this.router.navigateByUrl(this.returnUrl), 2000);
        } else if (response.status === 'failed') {
          // Máximo de tentativas excedido
          this.step.set('failed');
          this.error.set('Máximo de tentativas excedido. Você precisará iniciar uma nova validação com um novo depósito.');
        } else if (response.status === 'awaiting') {
          // Sistema aguardando nova entrada do usuário
          // PIX não encontrado - permanece na mesma tela para usuário tentar novamente
          // Mostrar mensagem do servidor (ex: "Payment not found yet. You have 3 attempt(s) remaining.")
          this.error.set(response.message || 'Depósito PIX não encontrado. Verifique se o depósito foi realizado e tente novamente.');
          // Limpar o código para usuário digitar novamente
          this.confirmationCode.set('');
        } else if (response.status === 'processing') {
          // Processando internamente - mostrar tela de processamento e iniciar polling
          this.step.set('processing');
          this.startPolling();
        } else if (response.status === 'expired') {
          // Expirado
          this.step.set('failed');
          this.error.set('Validação expirada. Solicite nova validação.');
        } else {
          // Outro status
          this.error.set(response.message || 'Erro ao confirmar depósito');
        }
      },
      error: (err) => {
        this.loading.set(false);

        // Verificar se excedeu tentativas ou se o status mudou para 'failed'
        if (err.message.includes('Max attempts exceeded') || err.message.includes('maximum') || err.message.includes('attempt')) {
          this.step.set('failed');
          this.error.set('Máximo de tentativas excedido. Você precisará iniciar uma nova validação com um novo depósito.');
          return;
        }

        if (err.message.includes('Invalid confirmation code') || err.message.includes('incorrect')) {
          this.error.set('Código de confirmação incorreto. Verifique os 3 últimos caracteres do ID da transação PIX.');
        } else {
          this.error.set(err.message || 'Erro ao confirmar depósito');
        }
      }
    });
  }

  private startPolling(): void {
    this.stopPolling();

    this.pollInterval = setInterval(() => {
      this.validationService.getPixVerification().subscribe({
        next: (verify) => {
          // Atualizar dados de verificação incluindo tentativas
          if (verify && verify.status !== null) {
            const currentVerification = this.pixVerification();
            if (currentVerification) {
              this.pixVerification.set({
                ...currentVerification,
                status: verify.status,
                attempts: verify.attempts,
                max_attempts: verify.max_attempts
              });
            }
          }

          if (verify?.status === 'verified') {
            this.stopPolling();
            this.step.set('success');
            setTimeout(() => this.router.navigateByUrl(this.returnUrl), 2000);
          } else if (verify?.status === 'failed') {
            this.stopPolling();
            this.step.set('failed');
            this.error.set('Validação falhou. Solicite nova validação.');
          } else if (verify?.status === 'expired') {
            this.stopPolling();
            this.step.set('failed');
            this.error.set('Validação expirada. Solicite nova validação.');
          } else if (verify?.status === 'awaiting') {
            // Sistema aguardando nova entrada - voltar para tela de confirmação
            this.stopPolling();
            this.step.set('deposit-instructions');
            this.error.set('Depósito não encontrado. Por favor, verifique se realizou o depósito e tente novamente.');
          }
          // Continue polling if status is still 'processing'
        },
        error: (err) => {
          // Continue polling even on error
        }
      });
    }, 10000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  requestNewVerification(): void {
    this.step.set('enter-pix');
    this.pixVerification.set(null);
    this.confirmationCode.set('');
    this.noConfirmationCode.set(false);
    this.error.set('');
    this.stopPolling();
  }

  copyPixKey(): void {
    const pixKey = this.pixVerification()?.destination_pix_key;
    if (pixKey) {
      navigator.clipboard.writeText(pixKey).then(() => {
        this.pixKeyCopied.set(true);
        setTimeout(() => this.pixKeyCopied.set(false), 3000);
      });
    }
  }

  isLastAttempt(): boolean {
    const verification = this.pixVerification();
    if (!verification || !verification.attempts || !verification.max_attempts) {
      return false;
    }
    return verification.attempts >= verification.max_attempts - 1;
  }

  getRemainingAttempts(): number {
    const verification = this.pixVerification();
    if (!verification || !verification.attempts || !verification.max_attempts) {
      return 0;
    }
    return verification.max_attempts - verification.attempts;
  }

  handleTimeout(): void {
    this.stopPolling();
    this.step.set('failed');
    this.error.set('Tempo expirado. Solicite nova validação.');
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
