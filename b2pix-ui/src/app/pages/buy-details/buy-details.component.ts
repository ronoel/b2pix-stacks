import { Component, inject, OnInit, OnDestroy, signal, ViewEncapsulation, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { BuyOrderService } from '../../shared/api/buy-order.service';
import { PaymentRequestService } from '../../shared/api/payment-request.service';
import { BuyOrderResponse, VerificationOutcome } from '../../shared/models/buy-order.model';
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
import { ConfirmActionSheetComponent } from '../../components/confirm-action-sheet/confirm-action-sheet.component';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-buy-details',
  standalone: true,
  imports: [NgClass, PaymentFormComponent, PageHeaderComponent, StatusSheetComponent, TechnicalDetailsComponent, CountdownTimerComponent, ConfirmActionSheetComponent],
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
  buyData = signal<BuyOrderResponse | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  // PIX info from creation response (passed via router state)
  pixKey = signal('');
  pixExpiresAt = signal('');

  // Time warning sheet state (bottom sheet, triggers at 3 minutes)
  showTimeWarningSheet = signal(false);
  showConfirmCancel = signal(false);
  private hasShownTimeWarning = false;

  // Resubmit state
  isResubmitting = signal(false);
  resubmitOutcome = signal<VerificationOutcome | null>(null);

  // Payment request state (for completed status)
  paymentRequest = signal<PaymentRequest | null>(null);
  isLoadingPaymentRequest = signal(false);

  // Auto-refresh polling
  private pollSubscription?: Subscription;

  ngOnInit() {
    // Read PIX data passed via router state from the creation page
    const state = history.state;
    if (state?.expires_at) {
      this.pixExpiresAt.set(state.expires_at);
    }
    if (state?.pix_key) {
      this.pixKey.set(state.pix_key);
    }

    const buyId = this.route.snapshot.paramMap.get('id');

    if (buyId) {
      this.loadBuyData(buyId);
    } else {
      this.errorMessage.set('ID da compra não encontrado na URL');
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    this.stopPolling();
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

        // If completed status, load payment request
        if (this.shouldShowPaymentDetails()) {
          this.loadPaymentRequest(buy.id);
        }

        if (showLoading) {
          this.isLoading.set(false);
        }

        // Start polling for status updates
        this.startPolling();
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

  // --- Status helpers ---

  /**
   * Get the effective display status combining buy order + PIX inbound status.
   * For non-final orders, PIX status drives the UI. For final orders, order status.
   */
  getEffectiveStatus(): string {
    const buy = this.buyData();
    if (!buy) return '';

    // Final orders: use order status directly
    if (buy.is_final) return buy.status;

    // Non-final: use pix status if available
    if (buy.pix) {
      // If pix is 'created' but locally expired, show as expired
      if (buy.pix.status === 'created' && this.isLocallyExpired()) {
        return 'expired';
      }
      return buy.pix.status;
    }

    return buy.status;
  }

  /**
   * Check if the PIX payment window has elapsed locally,
   * even if the server hasn't caught up yet.
   */
  private isLocallyExpired(): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return false;
    return new Date().getTime() > new Date(expiresAt).getTime();
  }

  /**
   * Show payment form only when PIX is active and waiting for payment.
   */
  isPendingPayment(): boolean {
    const buy = this.buyData();
    if (!buy) return false;

    const pixStatus = buy.pix?.status;

    // Show payment form when PIX is active (created) and not locally expired
    if (pixStatus === 'created') {
      return !this.isLocallyExpired();
    }

    return false;
  }

  getExpiresAt(): string {
    return this.pixExpiresAt() || this.buyData()?.pix?.expires_at || '';
  }

  getPixKey(): string {
    return this.pixKey() || this.buyData()?.pix?.pix_key || '';
  }

  onTimerWarning() {
    if (!this.hasShownTimeWarning) {
      this.hasShownTimeWarning = true;
      this.showTimeWarningSheet.set(true);
    }
  }

  handlePaymentTimeout() {
    // Reload data — server will have PIX marked as expired.
    // Template will automatically show the expired state.
    const buy = this.buyData();
    if (buy) {
      this.loadBuyData(buy.id, false);
    }
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
    const key = this.getPixKey();
    if (key) {
      navigator.clipboard.writeText(key).then(() => {
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
    this.openCancelConfirm();
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
      next: () => {
        this.loadingService.hide();

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

  openCancelConfirm() {
    this.showConfirmCancel.set(true);
  }

  cancelPurchase() {
    const buy = this.buyData();

    if (!buy) {
      return;
    }

    this.loadingService.show();

    this.buyOrderService.cancelBuyOrder(buy.id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.showConfirmCancel.set(false);

        alert('Compra cancelada com sucesso!');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Error canceling buy:', error);
        this.loadingService.hide();
        this.showConfirmCancel.set(false);

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
    const status = this.getEffectiveStatus();
    return status === 'confirmed' ||
           status === 'rejected' ||
           status === 'analyzing';
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
    const status = this.getEffectiveStatus();
    if (status === 'created') {
      return 'Pagamento PIX';
    }
    return 'Detalhes da compra';
  }

  getStatusClass(status?: string): string {
    const effectiveStatus = status || this.getEffectiveStatus();

    if (this.isSuccessStatus(effectiveStatus)) return 'completed';
    if (this.isProcessingStatus(effectiveStatus)) return 'processing';
    return 'warning';
  }

  isSuccessStatus(status?: string): boolean {
    const s = (status || this.getEffectiveStatus()).toLowerCase();
    return s === 'confirmed';
  }

  isProcessingStatus(status?: string): boolean {
    const s = (status || this.getEffectiveStatus()).toLowerCase();
    return s === 'processing' || s === 'analyzing';
  }

  getStatusLabel(status?: string): string {
    const s = (status || this.getEffectiveStatus()).toLowerCase();

    switch (s) {
      case 'created':
        return 'Aguardando Pagamento';
      case 'processing':
        return 'Verificando Pagamento';
      case 'analyzing':
        return 'Pagamento em Análise';
      case 'confirmed':
        return 'Pagamento Confirmado';
      case 'rejected':
        return 'Ordem Rejeitada';
      case 'canceled':
        return 'Cancelada';
      case 'expired':
        return 'PIX Expirado';
      default:
        return 'Em análise';
    }
  }

  getStatusDescription(status?: string): string {
    const s = (status || this.getEffectiveStatus()).toLowerCase();

    switch (s) {
      case 'created':
        return 'Complete o pagamento para prosseguir';
      case 'processing':
        return 'Estamos verificando seu pagamento junto ao banco...';
      case 'analyzing':
        return 'Não conseguimos identificar seu pagamento automaticamente. Sua ordem está sendo analisada.';
      case 'confirmed':
        return 'Seu pagamento foi confirmado! Os bitcoins foram enviados para sua carteira.';
      case 'rejected':
        return 'Esta ordem foi rejeitada, o pagamento não foi identificado.';
      case 'canceled':
        return 'Esta compra foi cancelada.';
      case 'expired': {
        const buy = this.buyData();
        if (buy && !buy.is_final && buy.can_resubmit) {
          return 'O prazo para pagamento expirou. Se você já pagou, verifique o pagamento.';
        }
        return 'O prazo para pagamento expirou.';
      }
      default:
        return 'Acompanhe o status da sua compra.';
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

  // --- Resubmit flow ---

  canResubmit(): boolean {
    return this.buyData()?.can_resubmit === true;
  }

  canCancel(): boolean {
    const buy = this.buyData();
    if (!buy || buy.is_final) return false;
    const status = this.getEffectiveStatus();
    return status === 'expired' || status === 'analyzing';
  }

  getRemainingAttempts(): number {
    return this.buyData()?.remaining_attempts ?? 0;
  }

  resubmitPayment(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const buy = this.buyData();
    if (!buy) return;

    this.isResubmitting.set(true);
    this.resubmitOutcome.set(null);

    this.buyOrderService.resubmitPayment(buy.id).subscribe({
      next: (response) => {
        this.isResubmitting.set(false);
        this.resubmitOutcome.set(response.verification_outcome);

        // Reload data to reflect updated state
        this.loadBuyData(buy.id, false);
      },
      error: (error) => {
        console.error('Error resubmitting payment:', error);
        this.isResubmitting.set(false);

        let errorMessage = 'Erro ao verificar pagamento. Tente novamente.';
        if (error.error?.error) {
          errorMessage = error.error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        alert(errorMessage);
      }
    });
  }

  getOutcomeMessage(): string {
    switch (this.resubmitOutcome()) {
      case 'confirmed':
        return 'Pagamento confirmado! Processando sua compra...';
      case 'not_found':
        return 'Pagamento não encontrado. Sua ordem será analisada manualmente.';
      case 'query_failed':
        return 'Falha na consulta ao banco. Tente novamente.';
      default:
        return '';
    }
  }

  getOutcomeClass(): string {
    switch (this.resubmitOutcome()) {
      case 'confirmed':
        return 'completed';
      case 'not_found':
        return 'processing';
      case 'query_failed':
        return 'warning';
      default:
        return '';
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Start polling for status updates every 10 seconds.
   * Polls for all non-final orders except when PIX is active (created).
   */
  private startPolling() {
    this.stopPolling();

    this.pollSubscription = interval(10000).subscribe(() => {
      const buy = this.buyData();
      if (!buy) return;

      // Stop polling for final orders
      if (buy.is_final) {
        this.stopPolling();
        return;
      }

      // Don't poll while waiting for payment (pix active)
      if (buy.pix?.status === 'created' && !this.isLocallyExpired()) return;

      this.buyOrderService.getBuyOrderById(buy.id).subscribe({
        next: (updated) => {
          this.buyData.set(updated);
          if (this.shouldShowPaymentDetails()) {
            this.loadPaymentRequest(updated.id);
          }
          if (updated.is_final) {
            this.stopPolling();
          }
        },
        error: (err) => {
          console.error('Erro ao atualizar dados da compra:', err);
        }
      });
    });
  }

  private stopPolling() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = undefined;
    }
  }
}
