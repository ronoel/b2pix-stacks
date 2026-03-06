import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentRequestService } from '../../shared/api/payment-request.service';
import { PaymentRequest, PaymentRequestStatus, PaymentSourceType } from '../../shared/models/payment-request.model';
import { formatTruncated, formatSats, formatDateTime, getExplorerUrl } from '../../shared/utils/format.util';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { StatusSheetComponent } from '../../components/status-sheet/status-sheet.component';

@Component({
  selector: 'app-payment-requests',
  standalone: true,
  imports: [PageHeaderComponent, StatusSheetComponent],
  templateUrl: './payment-requests.component.html',
  styleUrl: './payment-requests.component.scss'
})
export class PaymentRequestsComponent implements OnInit {
  private router = inject(Router);
  private paymentRequestService = inject(PaymentRequestService);

  // Expose enum to template
  PaymentRequestStatus = PaymentRequestStatus;

  // Signals for reactive state management
  paymentRequests = signal<PaymentRequest[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  currentPage = signal<number>(1);
  hasMore = signal<boolean>(false);
  selectedTab = signal<'attention' | 'processing' | 'failed' | 'completed'>('attention');
  processingPayment = signal<string | null>(null);

  // Confirmation sheet
  showConfirmSheet = signal(false);
  confirmingPayment = signal<PaymentRequest | null>(null);

  // Toast
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  ngOnInit() {
    this.loadPaymentRequests();
  }

  loadPaymentRequests() {
    this.loading.set(true);
    this.error.set(null);

    const options: any = {
      page: this.currentPage(),
      limit: 10,
      sort_order: 'desc' as const
    };

    // Filter based on selected tab
    const tab = this.selectedTab();
    if (tab === 'attention') {
      options.status = [PaymentRequestStatus.Waiting];
    } else if (tab === 'processing') {
      options.status = [PaymentRequestStatus.Processing, PaymentRequestStatus.Broadcast];
    } else if (tab === 'failed') {
      options.status = [PaymentRequestStatus.Failed];
    } else if (tab === 'completed') {
      options.status = [PaymentRequestStatus.Confirmed];
    }

    this.paymentRequestService.getPaymentRequests(options).subscribe({
      next: (response) => {
        this.paymentRequests.set(response.data);
        this.hasMore.set(response.has_more);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading payment requests:', error);
        this.error.set('Erro ao carregar solicitações de pagamento. Tente novamente.');
        this.loading.set(false);
        this.paymentRequests.set([]);
      }
    });
  }

  setTab(tab: 'attention' | 'processing' | 'failed' | 'completed') {
    this.selectedTab.set(tab);
    this.currentPage.set(1);
    this.loadPaymentRequests();
  }

  getAttentionCount(): number {
    return this.paymentRequests().filter(p =>
      p.status === PaymentRequestStatus.Waiting
    ).length;
  }

  getProcessingCount(): number {
    return this.paymentRequests().filter(p =>
      p.status === PaymentRequestStatus.Processing ||
      p.status === PaymentRequestStatus.Broadcast
    ).length;
  }

  getFailedCount(): number {
    return this.paymentRequests().filter(p =>
      p.status === PaymentRequestStatus.Failed
    ).length;
  }

  getCompletedCount(): number {
    return this.paymentRequests().filter(p =>
      p.status === PaymentRequestStatus.Confirmed
    ).length;
  }

  nextPage() {
    if (this.hasMore()) {
      this.currentPage.update(page => page + 1);
      this.loadPaymentRequests();
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadPaymentRequests();
    }
  }

  refreshPayments() {
    this.loadPaymentRequests();
  }

  goBack() {
    this.router.navigate(['/manager-dashboard']);
  }

  getStatusClass(status: PaymentRequestStatus): string {
    switch (status) {
      case PaymentRequestStatus.Waiting:
        return 'processing';
      case PaymentRequestStatus.Processing:
        return 'pending';
      case PaymentRequestStatus.Broadcast:
        return 'pending';
      case PaymentRequestStatus.Failed:
        return 'failed';
      case PaymentRequestStatus.Confirmed:
        return 'completed';
      default:
        return 'processing';
    }
  }

  getStatusText(status: PaymentRequestStatus): string {
    switch (status) {
      case PaymentRequestStatus.Waiting:
        return 'Aguardando';
      case PaymentRequestStatus.Processing:
        return 'Processando';
      case PaymentRequestStatus.Broadcast:
        return 'Transmitido';
      case PaymentRequestStatus.Failed:
        return 'Falha';
      case PaymentRequestStatus.Confirmed:
        return 'Confirmado';
      default:
        return 'Desconhecido';
    }
  }

  getSourceTypeText(sourceType: PaymentSourceType): string {
    switch (sourceType) {
      case PaymentSourceType.Buy:
        return 'Compra';
      default:
        return 'Desconhecido';
    }
  }

  formatTruncated = formatTruncated;
  formatDateTime = formatDateTime;
  getExplorerUrl = getExplorerUrl;

  formatSatoshis(satoshis: number): string {
    return formatSats(satoshis) + ' sats';
  }

  // Confirmation flow - replaces window.confirm / window.alert
  requestPayConfirmation(payment: PaymentRequest) {
    if (this.processingPayment()) return;
    this.confirmingPayment.set(payment);
    this.showConfirmSheet.set(true);
  }

  cancelPayConfirmation() {
    this.showConfirmSheet.set(false);
    this.confirmingPayment.set(null);
  }

  confirmPay() {
    const payment = this.confirmingPayment();
    if (!payment) return;

    this.showConfirmSheet.set(false);
    this.confirmingPayment.set(null);
    this.processingPayment.set(payment.id);

    this.paymentRequestService.pay(
      payment.id,
      payment.receiver_address,
      BigInt(payment.amount)
    ).subscribe({
      next: () => {
        this.processingPayment.set(null);
        this.showToast('Pagamento processado com sucesso!', 'success');
        this.loadPaymentRequests();
      },
      error: (error) => {
        console.error('Error processing payment:', error);
        this.processingPayment.set(null);
        const errorMessage = error?.message || error?.error?.error || 'Erro ao processar pagamento. Tente novamente.';
        this.showToast(errorMessage, 'error');
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toastMessage.set(message);
    this.toastType.set(type);

    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }
}
