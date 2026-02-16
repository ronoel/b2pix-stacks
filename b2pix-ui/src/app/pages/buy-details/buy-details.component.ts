import { Component, inject, OnInit, OnDestroy, signal, ViewEncapsulation, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, Subject } from 'rxjs';
import { takeUntil, startWith } from 'rxjs/operators';
import { LoadingService } from '../../services/loading.service';
import { BuyOrderService } from '../../shared/api/buy-order.service';
import { PaymentRequestService } from '../../shared/api/payment-request.service';
import { BuyOrder, BuyOrderStatus } from '../../shared/models/buy-order.model';
import { PaymentRequest, PaymentRequestStatus, PaymentSourceType } from '../../shared/models/payment-request.model';
import { environment } from '../../../environments/environment';
import { PaymentFormComponent } from './payment-form.component';

@Component({
  selector: 'app-buy-details',
  standalone: true,
  imports: [CommonModule, PaymentFormComponent],
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

  // Component state
  buyData = signal<BuyOrder | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  // Payment form state (for pending status)
  transactionId = signal('');
  noTransactionId = signal(false);

  // Timer warning modal state
  showTimeWarningModal = signal(false);
  hasReadWarning = signal(false);
  private hasShownTimeWarning = false;
  private hasShownTimeoutAlert = false;

  // Timer for payment using pure signals
  private expiresAt = signal<Date | null>(null);
  private timerActive = signal(false);
  private destroy$ = new Subject<void>();
  
  // Create a tick signal from RxJS interval - updates every second when timer is active
  private tick = toSignal(
    interval(1000).pipe(startWith(0)),
    { initialValue: 0 }
  );
  
  // Computed signal for time left - recalculates on every tick
  paymentTimeLeft = computed(() => {
    // Read tick to trigger recalculation every second
    this.tick();
    
    const expires = this.expiresAt();
    if (!expires || !this.timerActive()) return 0;
    
    const now = new Date();
    const timeLeftMs = expires.getTime() - now.getTime();
    // Return actual remaining seconds (never negative)
    return Math.max(0, Math.floor(timeLeftMs / 1000));
  });
  
  // Computed signal for formatted time
  formattedTime = computed(() => {
    const time = this.paymentTimeLeft();
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  // Payment request state (for completed status)
  paymentRequest = signal<PaymentRequest | null>(null);
  isLoadingPaymentRequest = signal(false);

  // BTC amount in sats cache
  private btcAmountInSats = signal(0);
  private btcAmountInBtc = computed(() => {
    const sats = this.btcAmountInSats();
    return sats / 100000000;
  });

  // Auto-refresh timer
  private refreshTimeout: any = null;

  constructor() {
    // Watch for buyData changes and calculate BTC amount
    effect(() => {
      const buy = this.buyData();
      if (buy?.buy_value) {
        this.buyOrderService.getSatoshisForPrice(buy.buy_value).subscribe({
          next: (sats) => {
            this.btcAmountInSats.set(sats);
          },
          error: (error) => {
            console.error('Error getting sats for price:', error);
            this.btcAmountInSats.set(0);
          }
        });
      } else {
        this.btcAmountInSats.set(0);
      }
    });
    
    // Watch for timer changes and handle warnings/timeout
    effect(() => {
      const timeLeft = this.paymentTimeLeft();
      
      // Show warning modal when less than 1 minute remaining (only once)
      if (timeLeft > 0 && timeLeft < 60 && !this.hasShownTimeWarning) {
        this.hasShownTimeWarning = true;
        this.hasReadWarning.set(false);
        this.showTimeWarningModal.set(true);
      }
      
      // Handle timeout
      if (this.timerActive() && timeLeft <= 0) {
        this.timerActive.set(false);
        this.handlePaymentTimeout();
      }
    });
  }

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
    this.clearPaymentTimer();
    this.clearRefreshTimeout();
    this.destroy$.next();
    this.destroy$.complete();
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

        // If created, start payment timer
        const statusStr = buy.status?.toString().toLowerCase();
        if (statusStr === 'created') {
          this.startPaymentTimer(buy);
        }

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

  startPaymentTimer(buy: BuyOrder) {
    if (!buy.expires_at) {
      return;
    }

    // Set expiration time and activate timer
    this.expiresAt.set(new Date(buy.expires_at));
    this.timerActive.set(true);
  }

  clearPaymentTimer() {
    this.timerActive.set(false);
    this.expiresAt.set(null);
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

  getBtcAmountInSats(): number {
    return this.btcAmountInSats();
  }

  getBtcAmount(): number {
    return this.btcAmountInBtc();
  }

  formatBTC(amount: number): string {
    return amount.toFixed(8);
  }

  formatSats(sats: number): string {
    return new Intl.NumberFormat('pt-BR').format(sats);
  }

  onTransactionIdChange(transactionId: string) {
    this.transactionId.set(transactionId.toUpperCase());
    if (transactionId.length > 0) {
      this.noTransactionId.set(false);
    }
  }

  onNoTransactionIdChange(noTransactionId: boolean) {
    this.noTransactionId.set(noTransactionId);
    if (noTransactionId) {
      this.transactionId.set('');
    }
  }

  canConfirmPayment(): boolean {
    if (this.noTransactionId()) {
      return true;
    }
    const txId = this.transactionId();
    return txId.length === 3 && /^[A-Z0-9]{3}$/.test(txId);
  }

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

  closeTimeWarningModal() {
    this.showTimeWarningModal.set(false);
    this.hasReadWarning.set(false); // Reset checkbox when closing modal
  }

  cancelFromWarningModal() {
    this.showTimeWarningModal.set(false);
    this.hasReadWarning.set(false); // Reset checkbox when closing modal
    this.cancelPurchase();
  }

  onWarningReadChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.hasReadWarning.set(target.checked);
  }

  confirmPayment(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.canConfirmPayment()) {
      return;
    }

    const buy = this.buyData();

    if (!buy) {
      return;
    }

    this.loadingService.show();

    const pixId = this.noTransactionId() ? undefined : this.transactionId();

    this.buyOrderService.markBuyOrderAsPaid(buy.id, pixId).subscribe({
      next: (updatedBuy) => {
        this.loadingService.hide();
        this.buyData.set(updatedBuy);
        this.clearPaymentTimer();

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
        this.clearPaymentTimer();

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
      return 'Pagamento via PIX';
    }
    return 'Detalhes da Compra';
  }

  getPageSubtitle(): string {
    const status = this.buyData()?.status;
    const statusStr = status?.toString().toLowerCase();
    if (statusStr === 'created') {
      return 'Complete o pagamento para receber seus Bitcoins';
    }
    return 'Acompanhe o status da sua compra de Bitcoin';
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
      case 'expired':
        return 'O prazo para pagamento expirou.';
      default:
        return 'Acompanhe o status da sua compra. Em caso de dúvidas, entre em contato com o suporte.';
    }
  }

  formatBRLCurrency(valueInCents: string | number): string {
    const value = typeof valueInCents === 'string' ? parseInt(valueInCents) : valueInCents;
    const valueInReais = value / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valueInReais);
  }

  formatSatoshisToBTC(satoshis: string | number): string {
    const sats = typeof satoshis === 'string' ? parseInt(satoshis) : satoshis;
    const btc = sats / 100000000;
    return btc.toFixed(8);
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  }

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
    if (!txId || txId.length <= 12) return txId;
    return `${txId.substring(0, 8)}...${txId.substring(txId.length - 4)}`;
  }

  getBlockchainExplorerUrl(txId: string): string {
    const transactionId = txId.startsWith('0x') ? txId : `0x${txId}`;
    const chain = environment.network === 'mainnet' ? 'mainnet' : 'testnet';
    return `https://explorer.hiro.so/txid/${transactionId}?chain=${chain}`;
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
    const status = this.buyData()?.status;
    if (!status) return false;

    const statusStr = status.toString().toLowerCase();

    // Explicitly monitor these statuses that need auto-refresh
    const statusesNeedingMonitoring = [
      'processing',  // User marked as paid, payment being verified
      'analyzing'    // Payment verification failed, manual review needed
    ];

    return statusesNeedingMonitoring.includes(statusStr);
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
      }, 5000); // 5 seconds
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
