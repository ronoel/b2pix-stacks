import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin, interval, Subscription, switchMap } from 'rxjs';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { PixVerificationStep, PixVerificationStatus } from '../../shared/models/account-validation.model';
import { CountdownTimerComponent } from '../../components/countdown-timer/countdown-timer.component';
import { PixKeyInputComponent } from './components/pix-key-input.component';
import { PixCopiaColaComponent } from '../../components/pix-copia-cola/pix-copia-cola.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { formatBrlCents } from '../../shared/utils/format.util';

@Component({
  selector: 'app-pix-validation',
  standalone: true,
  imports: [FormsModule, CountdownTimerComponent, PixKeyInputComponent, PixCopiaColaComponent, PageHeaderComponent],
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

  pixKeyConfirmed = signal(false);

  // Deposit amount upfront (fetched on init from pending verification or will be revealed on step 2)
  depositAmountCents = signal<number | null>(null);

  // Polling
  private pollInterval: any;
  private pollSubscription: Subscription | null = null;

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
        this.showAwaitingValidation();
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
        // Previous verification ended — let user start a new one
        this.step.set('enter-pix');
        break;
    }
  }

  onPixKeyChange(value: string): void {
    this.userPixKey.set(value);
  }

  onPixKeyValidChange(isValid: boolean): void {
    this.pixKeyValid.set(isValid);
  }

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

  confirmDeposit(): void {
    this.loading.set(true);
    this.error.set('');

    this.validationService.confirmPixPayment().subscribe({
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
          this.validationService.getAccount().subscribe({
            next: () => this.router.navigateByUrl(this.returnUrl),
            error: () => this.router.navigateByUrl(this.returnUrl)
          });
        } else if (response.status === 'failed') {
          this.navigateToFailure('Máximo de tentativas excedido. Você precisará iniciar uma nova verificação.');
        } else if (response.status === 'processing') {
          this.showAwaitingValidation();
        } else if (response.status === 'awaiting') {
          this.error.set(response.message || 'Depósito PIX não encontrado. Verifique se o depósito foi realizado e tente novamente.');
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

        this.error.set(err.message || 'Erro ao confirmar depósito');
      }
    });
  }

  private showAwaitingValidation(): void {
    this.validationService.pendingVerification.set(true);
    this.step.set('awaiting-validation');
    this.startPolling();
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollSubscription = interval(10000).pipe(
      switchMap(() => this.validationService.getPixVerification())
    ).subscribe({
      next: (pixVerify) => {
        if (!pixVerify) return;
        if (pixVerify.status === 'verified') {
          this.stopPolling();
          this.validationService.pendingVerification.set(false);
          this.step.set('validated');
        } else if (pixVerify.status === 'failed') {
          this.stopPolling();
          this.validationService.pendingVerification.set(false);
          this.step.set('validation-failed');
        }
      },
      error: () => {}
    });
  }

  private stopPolling(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = null;
    }
  }

  retryValidation(): void {
    this.router.navigate(['/account-validation-required']);
  }

  goToDashboard(): void {
    this.router.navigateByUrl(this.returnUrl);
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
    this.stopPolling();
  }
}
