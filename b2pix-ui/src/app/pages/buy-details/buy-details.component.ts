import { Component, inject, OnInit, OnDestroy, signal, ViewEncapsulation, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { BuyOrderService } from '../../shared/api/buy-order.service';
import { PaymentRequestService } from '../../shared/api/payment-request.service';
import { BuyOrder, BuyOrderStatus } from '../../shared/models/buy-order.model';
import { PaymentRequest, PaymentRequestStatus, PaymentSourceType } from '../../shared/models/payment-request.model';
import {
  formatBrlCents,
  formatSats,
  formatSatsToBtc,
  formatDateTime as formatDateTimeUtil,
  formatTruncated,
  getExplorerUrl
} from '../../shared/utils/format.util';
import { PaymentFormComponent } from './payment-form.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { StatusSheetComponent } from '../../components/status-sheet/status-sheet.component';
import { TechnicalDetailsComponent } from '../../components/technical-details/technical-details.component';
import { CountdownTimerComponent } from '../../components/countdown-timer/countdown-timer.component';

@Component({
  selector: 'app-buy-details',
  standalone: true,
  imports: [NgClass, PaymentFormComponent, PageHeaderComponent, StatusSheetComponent, TechnicalDetailsComponent, CountdownTimerComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './buy-details.component.html',
  styleUrl: './buy-details.component.scss'
})
export class BuyDetailsComponent implements OnInit, OnDestroy {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private loadingService = inject(LoadingService);
  private buyOrderService = inject(BuyOrderService);
  private paymentRequestService = inject(PaymentRequestService);

  // Countdown timer ref
  countdownTimer = viewChild(CountdownTimerComponent);

  // Component state
  buyData = signal<BuyOrder | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  // Time warning sheet state (bottom sheet, triggers at 3 minutes)
  showTimeWarningSheet = signal(false);
  private hasShownTimeWarning = false;
  private hasShownTimeoutAlert = false;

  // Payment request state (for completed status)
  paymentRequest = signal<PaymentRequest | null>(null);
  isLoadingPaymentRequest = signal(false);

  // Auto-refresh timer
  private refreshTimeout: any = null;

  ngOnInit() {
    const buyId = this.route.snapshot.paramMap.get('id');

    if (buyId) {
      this.loadBuyData(buyId);
    } else {
      this.errorMessage.set('ID da compra não encontrado na URL');
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    this.clearRefreshTimeout();
  }

  loadBuyData(buyId?: string, showLoading: boolean = true) {
    const id = buyId || this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('ID da compra não encontrado');
      this.isLoading.set(false);
      return;
    }

    if (showLoading) {
      this.isLoading.set(true);
    }
    this.errorMessage.set('');

    this.buyOrderService.getBuyOrderById(id).subscribe({
      next: (buy) => {
        this.buyData.set(buy);

        // Timer is handled by the countdown-timer component via getExpiresAt()

        // If completed status, load payment request
        if (this.shouldShowPaymentDetails()) {
          this.loadPaymentRequest(buy.id);
        }

        if (showLoading) {
          this.isLoading.set(false);
        }

        // Schedule auto-refresh if needed
        this.scheduleAutoRefresh();
      },
      error: (error) => {
        console.error('Erro ao carregar dados da compra:', error);
        if (showLoading) {
          this.errorMessage.set('Não foi possível carregar os dados da compra. Verifique se o ID está correto.');
          this.isLoading.set(false);
        }
      }
    });
  }

  refreshBuyData() {
    const buy = this.buyData();
    const buyId = buy?.id;

    // Don't refresh if buy is pending but actually expired
    if (buy && this.isActuallyExpired(buy)) {
      return;
    }

    if (buyId) {
      // Silent refresh - don't show loading spinner
      this.loadBuyData(buyId, false);
    }
  }

  /**
   * Check if a buy is actually expired (expires_at has passed)
   * even if the server status still shows as created
   */
  isActuallyExpired(buy: BuyOrder | null): boolean {
    if (!buy || !buy.expires_at) return false;

    const now = new Date();
    const expiresAt = new Date(buy.expires_at);
    return now.getTime() > expiresAt.getTime();
  }

  isPendingPayment(): boolean {
    const buy = this.buyData();
    const status = buy?.status;
    const statusStr = status?.toString().toLowerCase();

    // If status is created but it's actually expired, don't show payment form
    if (statusStr === 'created' && this.isActuallyExpired(buy)) {
      return false;
    }

    return statusStr === 'created';
  }

  getExpiresAt(): string {
    return this.buyData()?.expires_at || '';
  }

  onTimerWarning() {
    if (!this.hasShownTimeWarning) {
      this.hasShownTimeWarning = true;
      this.showTimeWarningSheet.set(true);
    }
  }

  handlePaymentTimeout() {
    // Only show alert once
    if (!this.hasShownTimeoutAlert) {
      this.hasShownTimeoutAlert = true;
      alert('O tempo de pagamento foi excedido. Sua compra foi cancelada.');
    }

    // Don't reload buy data - the component will automatically show expired state
    // based on local time check. No need to fetch from server since status
    // might still be "pending" on server side, but we know it's expired locally.
  }

  getTotalFiatAmount(): number {
    const buy = this.buyData();
    if (!buy) return 0;

    return buy.buy_value / 100;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  getBtcAmount(): number {
    const buy = this.buyData();
    if (!buy?.amount) return 0;
    return buy.amount / 100_000_000;
  }

  formatBTC(amount: number): string {
    return amount.toFixed(8);
  }

  formatSats = formatSats;

  copyPixKey() {
    const buy = this.buyData();
    if (buy?.pix_key) {
      navigator.clipboard.writeText(buy.pix_key).then(() => {
        alert('Chave PIX copiada para a área de transferência!');
      }).catch(() => {
        alert('Erro ao copiar chave PIX. Copie manualmente.');
      });
    }
  }

  closeTimeWarningSheet() {
    this.showTimeWarningSheet.set(false);
  }

  cancelFromWarningSheet() {
    this.showTimeWarningSheet.set(false);
    this.cancelPurchase();
  }

  confirmPayment(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const buy = this.buyData();

    if (!buy) {
      return;
    }

    this.loadingService.show();

    this.buyOrderService.markBuyOrderAsPaid(buy.id).subscribe({
      next: (updatedBuy) => {
        this.loadingService.hide();
        this.buyData.set(updatedBuy);

        // Show success message
        // alert('Pagamento confirmado com sucesso! Aguarde a liberação dos bitcoins.');

        // Reload to show details view and start auto-refresh
        this.loadBuyData(buy.id, false);
      },
      error: (error) => {
        console.error('Error confirming payment:', error);
        this.loadingService.hide();

        let errorMessage = 'Erro ao confirmar pagamento. Tente novamente.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        alert(errorMessage);
      }
    });
  }

  cancelPurchase() {
    const buy = this.buyData();

    if (!buy) {
      return;
    }

    if (!confirm('Tem certeza que deseja cancelar esta compra?')) {
      return;
    }

    this.loadingService.show();

    this.buyOrderService.cancelBuyOrder(buy.id).subscribe({
      next: () => {
        this.loadingService.hide();

        alert('Compra cancelada com sucesso!');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Error canceling buy:', error);
        this.loadingService.hide();

        let errorMessage = 'Erro ao cancelar compra. Tente novamente.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        alert(errorMessage);
      }
    });
  }

  shouldShowPaymentDetails(): boolean {
    const status = this.buyData()?.status;
    const statusStr = status?.toString().toLowerCase();
    return statusStr === 'confirmed' ||
           statusStr === 'rejected' ||
           statusStr === 'analyzing';
  }

  loadPaymentRequest(buyId: string) {
    this.isLoadingPaymentRequest.set(true);

    this.paymentRequestService.getPaymentRequestsBySource(PaymentSourceType.Buy, buyId).subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          this.paymentRequest.set(response.data[0]);
        }
        this.isLoadingPaymentRequest.set(false);
      },
      error: (error) => {
        console.error('Error loading payment request:', error);
        this.isLoadingPaymentRequest.set(false);
      }
    });
  }

  getPageTitle(): string {
    const status = this.buyData()?.status;
    const statusStr = status?.toString().toLowerCase();
    if (statusStr === 'created') {
      return 'Pagamento PIX';
    }
    return 'Detalhes da compra';
  }

  getStatusClass(status: BuyOrderStatus): string {
    const buy = this.buyData();

    // Check if it's actually expired even if status is created
    if (status?.toString().toLowerCase() === 'created' && this.isActuallyExpired(buy)) {
      return 'warning';
    }

    if (this.isSuccessStatus(status)) return 'completed';
    if (this.isProcessingStatus(status)) return 'processing';
    return 'warning';
  }

  isSuccessStatus(status: BuyOrderStatus): boolean {
    const statusStr = status?.toString().toLowerCase();
    return statusStr === 'confirmed';
  }

  isProcessingStatus(status: BuyOrderStatus): boolean {
    const statusStr = status?.toString().toLowerCase();
    return statusStr === 'processing' || statusStr === 'analyzing';
  }

  getStatusLabel(status: BuyOrderStatus): string {
    // Use string comparison for more robust matching
    const statusStr = status?.toString().toLowerCase();
    const buy = this.buyData();

    // Check if it's actually expired even if status is created
    if (statusStr === 'created' && this.isActuallyExpired(buy)) {
      return 'Expirada';
    }

    switch (statusStr) {
      case 'created':
        return 'Aguardando Pagamento';
      case 'processing':
        return 'Verificando Pagamento';
      case 'analyzing':
        return 'Em Análise';
      case 'confirmed':
        return 'Pagamento Confirmado';
      case 'rejected':
        return 'Ordem Rejeitada';
      case 'canceled':
        return 'Cancelada';
      case 'expired':
        return 'Expirada';
      default:
        console.warn('Unknown status:', status, 'Type:', typeof status);
        return 'Em análise';
    }
  }

  getStatusDescription(status: BuyOrderStatus): string {
    // Use string comparison for more robust matching
    const statusStr = status?.toString().toLowerCase();
    const buy = this.buyData();

    // Check if it's actually expired even if status is created
    if (statusStr === 'created' && this.isActuallyExpired(buy)) {
      return 'O prazo para pagamento expirou.';
    }

    switch (statusStr) {
      case 'created':
        return 'Complete o pagamento para prosseguir';
      case 'processing':
        return 'Estamos verificando seu pagamento...';
      case 'analyzing':
        return 'Não conseguimos identificar seu pagamento automaticamente. Sua ordem está sendo analisada.';
      case 'confirmed':
        return 'Seu pagamento foi confirmado! Os bitcoins foram enviados para sua carteira.';
      case 'rejected':
        return 'Esta ordem foi rejeitada, o pagamento não foi identificado.';
      case 'canceled':
        return 'Esta compra foi cancelada.';
      case 'expired': {
        const expiredBuy = this.buyData();
        if (expiredBuy && !expiredBuy.is_final) {
          return 'O prazo para pagamento expirou, mas caso você já tenha pago, envie o comprovante.';
        }
        return 'O prazo para pagamento expirou.';
      }
      default:
        return 'Acompanhe o status da sua compra. Em caso de dúvidas, entre em contato com o suporte.';
    }
  }

  getFormattedTime(): string {
    const timer = this.countdownTimer();
    if (!timer) return '00:00';
    return timer.formatTime(timer.timeLeft());
  }

  formatBRLCurrency(valueInCents: string | number): string {
    const value = typeof valueInCents === 'string' ? parseInt(valueInCents) : valueInCents;
    return formatBrlCents(value);
  }

  formatSatoshisToBTC(satoshis: string | number): string {
    const sats = typeof satoshis === 'string' ? parseInt(satoshis) : satoshis;
    return formatSatsToBtc(sats);
  }

  formatDateTime = formatDateTimeUtil;

  getPaymentRequestStatusClass(status: PaymentRequestStatus): string {
    switch (status) {
      case PaymentRequestStatus.Waiting:
      case PaymentRequestStatus.Processing:
      case PaymentRequestStatus.Broadcast:
        return 'pending';
      case PaymentRequestStatus.Confirmed:
        return 'completed';
      case PaymentRequestStatus.Failed:
        return 'failed';
      default:
        return 'pending';
    }
  }

  getPaymentRequestStatusLabel(status: PaymentRequestStatus): string {
    switch (status) {
      case PaymentRequestStatus.Waiting:
        return 'Aguardando';
      case PaymentRequestStatus.Processing:
        return 'Processando';
      case PaymentRequestStatus.Broadcast:
        return 'Transmitido';
      case PaymentRequestStatus.Confirmed:
        return 'Confirmado';
      case PaymentRequestStatus.Failed:
        return 'Falhou';
      default:
        return status;
    }
  }

  formatTransactionId(txId: string): string {
    return formatTruncated(txId, 8, 4);
  }

  getBlockchainExplorerUrl = getExplorerUrl;

  isExpiredNonFinal(): boolean {
    const buy = this.buyData();
    if (!buy) return false;
    return buy.status?.toString().toLowerCase() === 'expired' && !buy.is_final;
  }

  resubmitPayment(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const buy = this.buyData();
    if (!buy) return;

    this.loadingService.show();

    this.buyOrderService.resubmitPayment(buy.id).subscribe({
      next: (updatedBuy) => {
        this.loadingService.hide();
        this.buyData.set(updatedBuy);
        this.loadBuyData(buy.id, false);
      },
      error: (error) => {
        console.error('Error resubmitting payment:', error);
        this.loadingService.hide();

        let errorMessage = 'Erro ao reenviar comprovante. Tente novamente.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        alert(errorMessage);
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Check if buy needs monitoring (is not in a final state and not created payment)
   */
  private needsMonitoring(): boolean {
    const buy = this.buyData();
    if (!buy) return false;
    return !buy.is_final;
  }

  /**
   * Schedule auto-refresh if buy needs monitoring
   */
  private scheduleAutoRefresh() {
    this.clearRefreshTimeout();

    const buy = this.buyData();

    // Don't schedule refresh if buy is actually expired
    if (buy && this.isActuallyExpired(buy)) {
      return;
    }

    if (this.needsMonitoring()) {
      this.refreshTimeout = setTimeout(() => {
        this.refreshBuyData();
      }, 10000); // 10 seconds
    }
  }

  /**
   * Clear auto-refresh timeout
   */
  private clearRefreshTimeout() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }
}
