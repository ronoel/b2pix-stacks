import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { InvoiceApiService } from '../../shared/api/invoice.service';
import {
  InvoicePublicSummary, InvoiceStatus,
  PayResponse, SessionStatusResponse,
  PaymentStep,
} from '../../shared/models/invoice.model';
import { formatBrlCents } from '../../shared/utils/format.util';
import { PaymentStepSummaryComponent } from './components/payment-step-summary.component';
import { PaymentStepOtpComponent } from './components/payment-step-otp.component';
import { PaymentStepQrComponent } from './components/payment-step-qr.component';
import { PaymentStepExpiredComponent } from './components/payment-step-expired.component';
import { PaymentStepSuccessComponent } from './components/payment-step-success.component';
import { PaymentStepProcessingComponent } from './components/payment-step-processing.component';
import { PaymentStepErrorComponent } from './components/payment-step-error.component';

@Component({
  selector: 'app-invoice-pay',
  standalone: true,
  imports: [
    PaymentStepSummaryComponent, PaymentStepOtpComponent, PaymentStepQrComponent,
    PaymentStepExpiredComponent, PaymentStepSuccessComponent,
    PaymentStepProcessingComponent, PaymentStepErrorComponent,
  ],
  templateUrl: './invoice-pay.component.html',
  styleUrl: './invoice-pay.component.scss'
})
export class InvoicePayComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private invoiceApi = inject(InvoiceApiService);
  private pollSubscription?: Subscription;
  private resendTimer?: ReturnType<typeof setInterval>;

  paymentToken = '';

  step = signal<PaymentStep>('loading');
  invoiceSummary = signal<InvoicePublicSummary | null>(null);
  email = signal('');
  otpCode = signal('');
  sessionToken = signal('');
  paymentSession = signal<SessionStatusResponse | null>(null);

  resendCooldown = signal(0);
  isLoading = signal(false);
  error = signal('');
  resubmitAttempts = signal(0);

  formatBrlCents = formatBrlCents;

  private readonly STORAGE_KEY_PREFIX = 'invoice_session_';
  private readonly MAX_RESUBMIT_ATTEMPTS = 3;

  constructor() {
    effect(() => {
      this.step();
      window.scrollTo({ top: 0 });
    });
  }

  ngOnInit(): void {
    this.paymentToken = this.route.snapshot.paramMap.get('payment_token') || '';
    if (!this.paymentToken) {
      this.step.set('error');
      this.error.set('Link de pagamento inválido');
      return;
    }

    this.loadInvoice();
  }

  private loadInvoice(): void {
    this.step.set('loading');
    this.invoiceApi.getInvoiceByToken(this.paymentToken).subscribe({
      next: (summary) => {
        this.invoiceSummary.set(summary);

        if (summary.status === InvoiceStatus.Paid) {
          this.step.set('invoice-paid');
          return;
        }
        if (summary.status === InvoiceStatus.Cancelled) {
          this.step.set('invoice-cancelled');
          return;
        }

        // Check for existing session
        const savedToken = this.loadSessionToken(this.paymentToken);
        if (savedToken) {
          this.sessionToken.set(savedToken);
          this.resumeSession();
        } else {
          this.step.set('invoice-summary');
        }
      },
      error: (err) => {
        this.step.set('error');
        this.error.set(err.status === 404
          ? 'Cobrança não encontrada'
          : 'Erro ao carregar cobrança. Tente novamente.');
      }
    });
  }

  private resumeSession(): void {
    this.invoiceApi.getSessionStatus(this.paymentToken, this.sessionToken()).subscribe({
      next: (session) => {
        this.paymentSession.set(session);
        this.updateStepFromSession(session);
        if (!session.is_final) {
          this.startPolling();
        }
      },
      error: (err) => {
        // Session expired
        if (err.status === 401 || err.status === 403) {
          this.clearSessionToken(this.paymentToken);
          this.sessionToken.set('');
          this.step.set('invoice-summary');
        } else {
          this.step.set('invoice-summary');
        }
      }
    });
  }

  // =========================================================================
  // Email + OTP
  // =========================================================================

  onEmailSubmit(email: string): void {
    this.email.set(email);
    this.isLoading.set(true);
    this.error.set('');

    this.invoiceApi.sendOtpCode(this.paymentToken, email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.step.set('otp-verify');
        this.startResendCooldown(60);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 429) {
          this.error.set('Muitas tentativas. Aguarde antes de tentar novamente.');
        } else {
          this.error.set(err.message || 'Erro ao enviar código');
        }
      }
    });
  }

  onOtpComplete(code: string): void {
    this.otpCode.set(code);
    this.initiatePayment(code);
  }

  onChangeEmail(): void {
    this.step.set('invoice-summary');
    this.otpCode.set('');
    this.error.set('');
  }

  onResendOtp(): void {
    if (this.resendCooldown() > 0) return;
    this.onEmailSubmit(this.email());
  }

  private initiatePayment(code: string): void {
    this.isLoading.set(true);
    this.error.set('');

    this.invoiceApi.initiatePayment(this.paymentToken, this.email(), code).subscribe({
      next: (response: PayResponse) => {
        this.isLoading.set(false);
        this.sessionToken.set(response.session_token);
        this.persistSessionToken(this.paymentToken, response.session_token);

        const session: SessionStatusResponse = {
          status: 'created',
          pix_key: response.pix_key,
          value_brl: response.value_brl,
          expires_at: response.expires_at,
          is_expired: false,
          is_final: false,
        };
        this.paymentSession.set(session);
        this.step.set('payment-active');
        this.startPolling();
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 409) {
          this.error.set('Já existe um pagamento em andamento para esta cobrança. Entre em contato com o comerciante para mais informações.');
        } else if (err.status === 400 || err.status === 401) {
          this.error.set('Código inválido. Tente novamente.');
        } else {
          this.error.set(err.message || 'Erro ao processar pagamento');
        }
      }
    });
  }

  // =========================================================================
  // Payment Session
  // =========================================================================

  onMarkPaid(): void {
    this.isLoading.set(true);
    this.invoiceApi.markSessionPaid(this.paymentToken, this.sessionToken()).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.paymentSession.set(response);
        this.updateStepFromSession(response);
        if (!response.is_final) {
          this.startPolling();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.step.set('payment-processing');
      }
    });
  }

  onResubmit(): void {
    if (this.resubmitAttempts() >= this.MAX_RESUBMIT_ATTEMPTS) return;

    this.isLoading.set(true);
    this.error.set('');
    this.invoiceApi.resubmitSession(this.paymentToken, this.sessionToken()).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.resubmitAttempts.update(n => n + 1);
        this.paymentSession.set(response);
        this.updateStepFromSession(response);
        if (!response.is_final) {
          this.startPolling();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(err.message || 'Erro ao reenviar. Tente novamente.');
      }
    });
  }

  onNewPayment(): void {
    this.stopPolling();
    this.paymentSession.set(null);
    this.clearSessionToken(this.paymentToken);
    this.sessionToken.set('');
    this.resubmitAttempts.set(0);
    this.step.set('invoice-summary');
  }

  onPaymentExpired(): void {
    this.stopPolling();
    this.step.set('payment-expired');
  }

  // =========================================================================
  // Polling
  // =========================================================================

  private startPolling(): void {
    this.stopPolling();
    this.pollSubscription = interval(5000).subscribe(() => {
      const session = this.paymentSession();
      if (!session || session.is_final) {
        this.stopPolling();
        return;
      }
      this.invoiceApi.getSessionStatus(this.paymentToken, this.sessionToken()).subscribe({
        next: (updated) => {
          this.paymentSession.set(updated);
          this.updateStepFromSession(updated);
          if (updated.is_final) this.stopPolling();
        },
        error: (err) => {
          if (err.status === 401 || err.status === 403) {
            this.stopPolling();
            this.clearSessionToken(this.paymentToken);
            this.sessionToken.set('');
            // Session expired — re-fetch invoice to check if it was paid
            this.invoiceApi.getInvoiceByToken(this.paymentToken).subscribe({
              next: (summary) => {
                this.invoiceSummary.set(summary);
                if (summary.status === InvoiceStatus.Paid) {
                  this.step.set('payment-confirmed');
                } else if (summary.status === InvoiceStatus.Cancelled) {
                  this.step.set('invoice-cancelled');
                } else {
                  this.error.set('Sua sessão expirou. Informe seu email novamente para continuar.');
                  this.step.set('invoice-summary');
                }
              },
              error: () => {
                this.error.set('Sua sessão expirou. Informe seu email novamente para continuar.');
                this.step.set('invoice-summary');
              }
            });
          }
        }
      });
    });
  }

  private stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = undefined;
  }

  private updateStepFromSession(session: SessionStatusResponse): void {
    switch (session.status) {
      case 'created':
        this.step.set(session.is_expired ? 'payment-expired' : 'payment-active');
        break;
      case 'processing':
        this.step.set('payment-processing');
        break;
      case 'analyzing':
        this.step.set('payment-analyzing');
        break;
      case 'confirmed':
        this.step.set('payment-confirmed');
        break;
      case 'rejected':
        this.step.set('payment-rejected');
        break;
      case 'expired':
        this.step.set('payment-expired');
        break;
    }
  }

  // =========================================================================
  // Session Storage
  // =========================================================================

  private persistSessionToken(paymentToken: string, sessionToken: string): void {
    sessionStorage.setItem(this.STORAGE_KEY_PREFIX + paymentToken, sessionToken);
  }

  private loadSessionToken(paymentToken: string): string | null {
    return sessionStorage.getItem(this.STORAGE_KEY_PREFIX + paymentToken);
  }

  private clearSessionToken(paymentToken: string): void {
    sessionStorage.removeItem(this.STORAGE_KEY_PREFIX + paymentToken);
  }

  // =========================================================================
  // Resend Cooldown
  // =========================================================================

  private startResendCooldown(seconds: number): void {
    this.resendCooldown.set(seconds);
    if (this.resendTimer) clearInterval(this.resendTimer);

    this.resendTimer = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 0) {
        clearInterval(this.resendTimer);
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }

  maskedEmail(): string {
    const e = this.email();
    const atIndex = e.indexOf('@');
    if (atIndex <= 0) return e;
    return e.charAt(0) + '***' + e.slice(atIndex);
  }

  ngOnDestroy(): void {
    this.stopPolling();
    if (this.resendTimer) clearInterval(this.resendTimer);
  }
}
