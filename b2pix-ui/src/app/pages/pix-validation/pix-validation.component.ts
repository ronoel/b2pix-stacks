import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { PixVerificationStep, PixVerificationStatus } from '../../shared/models/account-validation.model';
import { PixTimerComponent } from './components/pix-timer.component';
import { PixKeyInputComponent } from './components/pix-key-input.component';
import { PixCopiaColaComponent } from '../../components/pix-copia-cola/pix-copia-cola.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { formatBrlCents } from '../../shared/utils/format.util';

@Component({
  selector: 'app-pix-validation',
  standalone: true,
  imports: [FormsModule, PixTimerComponent, PixKeyInputComponent, PixCopiaColaComponent, PageHeaderComponent],
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

  // Deposit amount upfront (fetched on init from pending verification or will be revealed on step 2)
  depositAmountCents = signal<number | null>(null);

  // Confirmation code individual chars (3 boxes)
  confirmCodeChars = signal<string[]>(['', '', '']);

  // Polling
  private pollInterval: any;

  // Return URL
  private returnUrl = '/dashboard';

  // Expose format function to template
  readonly formatBrlCents = formatBrlCents;

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

        // Already validated — redirect
        if (status.pix_verified) {
          this.router.navigateByUrl(this.returnUrl);
          return;
        }

        // Email not verified — go back
        if (!status.email_verified) {
          this.router.navigate(['/email-validation']);
          return;
        }

        // Has pending/ongoing verification
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

    if (pixVerify.confirmation_value_cents) {
      this.depositAmountCents.set(pixVerify.confirmation_value_cents);
    }

    switch (pixVerify.status) {
      case 'awaiting':
        this.step.set('deposit-instructions');
        break;
      case 'processing':
        // Navigate to dashboard — processing is handled there
        this.navigateToDashboardWithBanner();
        break;
      case 'verified':
        // Already verified — redirect
        this.validationService.getAccount().subscribe({
          next: () => this.router.navigateByUrl(this.returnUrl),
          error: () => this.router.navigateByUrl(this.returnUrl)
        });
        break;
      case 'failed':
      case 'expired':
        // Show failure on account-validation-required
        this.router.navigate(['/account-validation-required'], {
          queryParams: {
            pixFailed: 'true',
            message: pixVerify.status === 'expired'
              ? 'Verificação expirada. Tente novamente.'
              : 'Verificação falhou. Tente novamente.'
          }
        });
        break;
    }
  }

  onPixKeyChange(value: string): void {
    this.userPixKey.set(value);
  }

  onPixKeyValidChange(isValid: boolean): void {
    this.pixKeyValid.set(isValid);
  }

  /**
   * View 1 → API call → View 2
   * The old confirm-pix-key step is now merged here (checkbox in view 1).
   */
  submitPixKey(): void {
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
          status: 'awaiting',
          user_pix_key: this.userPixKey(),
          destination_pix_key: verify.destination_pix_key,
          confirmation_value_cents: verify.confirmation_value_cents,
          expires_at: verify.expires_at,
          attempts: verify.attempts,
          max_attempts: verify.max_attempts
        });
        this.depositAmountCents.set(verify.confirmation_value_cents);
        this.step.set('deposit-instructions');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Erro ao iniciar verificação PIX');
      }
    });
  }

  onConfirmationCodeChange(value: string): void {
    this.confirmationCode.set(value.toUpperCase());
    if (this.error()) this.error.set('');
  }

  confirmDeposit(): void {
    this.loading.set(true);
    this.error.set('');

    const code = this.noConfirmationCode() ? undefined : this.confirmationCode() || undefined;

    this.validationService.confirmPixPayment(code).subscribe({
      next: (response) => {
        this.loading.set(false);

        const currentVerification = this.pixVerification();
        if (currentVerification) {
          this.pixVerification.set({
            ...currentVerification,
            status: response.status,
            attempts: response.attempts,
            max_attempts: response.max_attempts
          });
        }

        if (response.status === 'verified') {
          // Verified immediately
          this.validationService.getAccount().subscribe({
            next: () => this.router.navigateByUrl(this.returnUrl),
            error: () => this.router.navigateByUrl(this.returnUrl)
          });
        } else if (response.status === 'failed') {
          this.navigateToFailure('Máximo de tentativas excedido. Você precisará iniciar uma nova verificação.');
        } else if (response.status === 'processing') {
          // Navigate to dashboard with banner
          this.navigateToDashboardWithBanner();
        } else if (response.status === 'awaiting') {
          // Payment not found yet — let user retry
          this.error.set(response.message || 'Depósito PIX não encontrado. Verifique se o depósito foi realizado e tente novamente.');
          this.confirmationCode.set('');
        } else if (response.status === 'expired') {
          this.navigateToFailure('Verificação expirada. Tente novamente.');
        } else {
          this.error.set(response.message || 'Erro ao confirmar depósito');
        }
      },
      error: (err) => {
        this.loading.set(false);

        if (
          err.message.includes('Max attempts exceeded') ||
          err.message.includes('maximum') ||
          err.message.includes('attempt')
        ) {
          this.navigateToFailure('Máximo de tentativas excedido. Você precisará iniciar uma nova verificação.');
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

  private navigateToDashboardWithBanner(): void {
    this.validationService.pendingVerification.set(true);
    this.router.navigate(['/dashboard']);
  }

  private navigateToFailure(message: string): void {
    this.router.navigate(['/account-validation-required'], {
      queryParams: { pixFailed: 'true', message }
    });
  }

  isLastAttempt(): boolean {
    const v = this.pixVerification();
    if (!v || !v.attempts || !v.max_attempts) return false;
    return v.attempts >= v.max_attempts - 1;
  }

  getRemainingAttempts(): number {
    const v = this.pixVerification();
    if (!v || !v.attempts || !v.max_attempts) return 0;
    return v.max_attempts - v.attempts;
  }

  handleTimeout(): void {
    this.navigateToFailure('Tempo expirado. Tente novamente.');
  }

  depositAmountFormatted(): string {
    const cents = this.depositAmountCents();
    if (cents == null) return '';
    return formatBrlCents(cents);
  }

  depositAmountValue(): number {
    return (this.depositAmountCents() ?? 0) / 100;
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}
