import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { StatusSheetComponent } from '../../components/status-sheet/status-sheet.component';
import { ConfirmActionSheetComponent } from '../../components/confirm-action-sheet/confirm-action-sheet.component';
import { CountdownTimerComponent } from '../../components/countdown-timer/countdown-timer.component';
import { PixCopiaColaComponent } from '../../components/pix-copia-cola/pix-copia-cola.component';
import { InvoiceApiService } from '../../shared/api/invoice.service';
import {
  Invoice, InvoiceStatus,
  PayInPersonResponse, PaymentStatusResponse, CancelPaymentResponse,
  getInvoiceStatusLabel, getInvoiceStatusClass,
  getPaymentStatusLabel, getPaymentStatusClass,
} from '../../shared/models/invoice.model';
import { formatBrlCents, formatSats, formatSatsToBtc, formatDateTime } from '../../shared/utils/format.util';

@Component({
  selector: 'app-invoice-details',
  standalone: true,
  imports: [
    FormsModule, PageHeaderComponent, StatusSheetComponent,
    ConfirmActionSheetComponent, CountdownTimerComponent, PixCopiaColaComponent,
  ],
  templateUrl: './invoice-details.component.html',
  styleUrl: './invoice-details.component.scss'
})
export class InvoiceDetailsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private invoiceApi = inject(InvoiceApiService);
  private pollSubscription?: Subscription;

  invoice = signal<Invoice | null>(null);
  isLoading = signal(true);
  error = signal('');

  // In-person payment
  payInPersonResponse = signal<PayInPersonResponse | null>(null);
  paymentStatus = signal<PaymentStatusResponse | null>(null);
  showQrSheet = signal(false);
  isStartingInPerson = signal(false);
  isCheckingPayment = signal(false);
  isCancellingPayment = signal(false);
  isLoadingPaymentStatus = signal(false);

  // Share
  showShareSheet = signal(false);
  linkCopied = signal(false);

  // Cancel invoice
  showCancelConfirm = signal(false);
  isCancelling = signal(false);

  // Client email
  showEmailSheet = signal(false);
  clientEmail = signal('');
  isSavingEmail = signal(false);

  // Formatting helpers
  formatBrlCents = formatBrlCents;
  formatSats = formatSats;
  formatSatsToBtc = formatSatsToBtc;
  formatDateTime = formatDateTime;
  getInvoiceStatusLabel = getInvoiceStatusLabel;
  getInvoiceStatusClass = getInvoiceStatusClass;
  getPaymentStatusLabel = getPaymentStatusLabel;
  getPaymentStatusClass = getPaymentStatusClass;

  paymentLink = computed(() => {
    const inv = this.invoice();
    return inv ? this.invoiceApi.getPaymentLink(inv.payment_token) : '';
  });

  isActive = computed(() => this.invoice()?.status === InvoiceStatus.Active);
  isPaid = computed(() => this.invoice()?.status === InvoiceStatus.Paid);

  activePaymentPixKey = computed(() => this.paymentStatus()?.pix_key ?? this.payInPersonResponse()?.pix_key ?? '');
  activePaymentValueBrl = computed(() => this.paymentStatus()?.value_brl ?? this.payInPersonResponse()?.value_brl ?? 0);
  activePaymentExpiresAt = computed(() => this.paymentStatus()?.expires_at ?? this.payInPersonResponse()?.expires_at ?? '');
  activePaymentStatus = computed(() => this.paymentStatus()?.status ?? 'created');

  hasActivePayment = computed(() => {
    const ps = this.paymentStatus();
    return ps !== null && !ps.is_final;
  });

  showCountdown = computed(() => {
    const status = this.activePaymentStatus();
    return status === 'created' && !this.paymentStatus()?.is_expired;
  });

  private scrollOnQrSheet = effect(() => {
    if (this.showQrSheet()) {
      window.scrollTo({ top: 0 });
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/invoices']);
      return;
    }
    this.loadInvoice(id);
  }

  private loadInvoice(id: string): void {
    this.isLoading.set(true);
    this.invoiceApi.getInvoiceById(id).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        this.isLoading.set(false);
        if (invoice.client_email) {
          this.clientEmail.set(invoice.client_email);
        }
        if (invoice.status === InvoiceStatus.Active) {
          this.checkPaymentStatus(id);
        }
      },
      error: () => {
        this.error.set('Cobrança não encontrada');
        this.isLoading.set(false);
      }
    });
  }

  private checkPaymentStatus(invoiceId: string): void {
    this.isLoadingPaymentStatus.set(true);
    this.invoiceApi.getPaymentStatus(invoiceId).subscribe({
      next: (status) => {
        this.paymentStatus.set(status);
        this.isLoadingPaymentStatus.set(false);
        if (!status.is_final) {
          this.showQrSheet.set(true);
          if (status.status === 'created' || status.status === 'processing') {
            this.startPaymentStatusPolling();
          }
        }
      },
      error: () => {
        this.paymentStatus.set(null);
        this.isLoadingPaymentStatus.set(false);
      }
    });
  }

  // =========================================================================
  // Share Link
  // =========================================================================

  copyLink(): void {
    navigator.clipboard.writeText(this.paymentLink()).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2000);
    });
  }

  shareLink(): void {
    if (navigator.share) {
      navigator.share({
        title: 'Pagamento B2PIX',
        text: `Pagamento de ${formatBrlCents(this.invoice()!.value_brl)}`,
        url: this.paymentLink()
      }).catch(() => {});
    } else {
      this.copyLink();
    }
  }

  // =========================================================================
  // In-Person Payment
  // =========================================================================

  startInPersonPayment(): void {
    const inv = this.invoice();
    if (!inv) return;

    this.isStartingInPerson.set(true);
    this.error.set('');
    this.invoiceApi.payInPerson(inv.id).subscribe({
      next: (response) => {
        this.payInPersonResponse.set(response);
        this.paymentStatus.set({
          inbound_request_id: response.inbound_request_id,
          status: 'created',
          pix_key: response.pix_key,
          value_brl: response.value_brl,
          expires_at: response.expires_at,
          is_expired: false,
          is_final: false,
        });
        this.isStartingInPerson.set(false);
        this.showQrSheet.set(true);
        this.startPaymentStatusPolling();
      },
      error: (err) => {
        this.isStartingInPerson.set(false);
        this.error.set(err.message || 'Erro ao iniciar pagamento presencial');
      }
    });
  }

  checkInPersonPayment(): void {
    const inv = this.invoice();
    if (!inv) return;

    this.isCheckingPayment.set(true);
    this.error.set('');
    this.invoiceApi.checkPaymentInPerson(inv.id).subscribe({
      next: (response) => {
        this.isCheckingPayment.set(false);
        this.paymentStatus.set(response);
        if (response.is_final) {
          this.stopPolling();
          if (response.status === 'confirmed') {
            this.loadInvoice(inv.id);
          }
        }
      },
      error: (err) => {
        this.isCheckingPayment.set(false);
        this.error.set(err.message || 'Erro ao verificar pagamento');
      }
    });
  }

  cancelInPersonPayment(): void {
    const inv = this.invoice();
    if (!inv) return;

    this.isCancellingPayment.set(true);
    this.invoiceApi.cancelPayment(inv.id).subscribe({
      next: (response: CancelPaymentResponse) => {
        this.isCancellingPayment.set(false);
        this.payInPersonResponse.set(null);
        this.paymentStatus.set(null);
        this.showQrSheet.set(false);
        this.stopPolling();
        if (response.outcome === 'confirmed') {
          this.loadInvoice(inv.id);
        }
      },
      error: (err) => {
        this.isCancellingPayment.set(false);
        this.error.set(err.message || 'Erro ao cancelar pagamento');
      }
    });
  }

  onInPersonExpired(): void {
    this.refreshPaymentStatus(this.invoice()!.id);
  }

  private refreshPaymentStatus(invoiceId: string): void {
    this.invoiceApi.getPaymentStatus(invoiceId).subscribe({
      next: (status) => {
        this.paymentStatus.set(status);
        if (status.is_final) {
          this.stopPolling();
          if (status.status === 'confirmed') {
            this.loadInvoice(invoiceId);
          }
        }
      },
      error: () => {
        this.paymentStatus.set(null);
        this.stopPolling();
      }
    });
  }

  private startPaymentStatusPolling(): void {
    this.stopPolling();
    const inv = this.invoice();
    if (!inv) return;

    this.pollSubscription = interval(5000).subscribe(() => {
      this.invoiceApi.getPaymentStatus(inv.id).subscribe({
        next: (status) => {
          this.paymentStatus.set(status);
          if (status.is_final || (status.status !== 'created' && status.status !== 'processing')) {
            this.stopPolling();
            if (status.status === 'confirmed') {
              this.loadInvoice(inv.id);
            }
          }
        },
        error: () => {
          this.stopPolling();
        }
      });
    });
  }

  // =========================================================================
  // Cancel Invoice
  // =========================================================================

  confirmCancelInvoice(): void {
    const inv = this.invoice();
    if (!inv) return;

    this.isCancelling.set(true);
    this.invoiceApi.cancelInvoice(inv.id).subscribe({
      next: (updated) => {
        this.isCancelling.set(false);
        this.invoice.set(updated);
        this.showCancelConfirm.set(false);
      },
      error: (err) => {
        this.isCancelling.set(false);
        this.showCancelConfirm.set(false);
        if (err.status === 409) {
          this.loadInvoice(inv.id);
        } else {
          this.error.set(err.message || 'Erro ao cancelar cobrança');
        }
      }
    });
  }

  // =========================================================================
  // Client Email
  // =========================================================================

  saveClientEmail(): void {
    const inv = this.invoice();
    const email = this.clientEmail().trim();
    if (!inv || !email) return;

    this.isSavingEmail.set(true);
    this.invoiceApi.setClientEmail(inv.id, email).subscribe({
      next: () => {
        this.isSavingEmail.set(false);
        this.showEmailSheet.set(false);
        this.loadInvoice(inv.id);
      },
      error: (err) => {
        this.isSavingEmail.set(false);
        this.error.set(err.message || 'Erro ao salvar email');
      }
    });
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  private stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = undefined;
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
