import { Component, inject, input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { PixPaymentService } from '../../shared/api/pix-payment.service';
import { SellOrderService } from '../../shared/api/sell-order.service';
import { PixPayoutRequestService } from '../../shared/api/pix-payout-request.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import {
  CommonOrder,
  OrderStatus,
  getOrderStatusLabel,
  getOrderStatusClass
} from '../../shared/models/pix-payment.model';
import {
  PixPayoutRequest,
  PayoutRequestStatus,
  PayoutSourceType,
  isPayoutRequestFinalStatus
} from '../../shared/models/pix-payout-request.model';
import { MessageSenderRole } from '../../shared/models/message.model';
import { environment } from '../../../environments/environment';
import {
  formatBrlCents,
  formatSats,
  formatSatsToBtc,
  formatDateTime,
  formatTruncated,
  getExplorerUrl
} from '../../shared/utils/format.util';
import { DisputeModalComponent } from './components/dispute-modal/dispute-modal.component';
import { MessageChatComponent } from './components/message-chat/message-chat.component';
import { PixReceiptComponent } from './components/pix-receipt/pix-receipt.component';
import { TechnicalDetailsComponent } from '../technical-details/technical-details.component';

@Component({
  selector: 'app-order-status',
  standalone: true,
  imports: [DisputeModalComponent, MessageChatComponent, PixReceiptComponent, TechnicalDetailsComponent],
  templateUrl: './order-status.component.html',
  styleUrl: './order-status.component.scss'
})
export class OrderStatusComponent implements OnInit, OnDestroy {
  // Required inputs
  orderId = input.required<string>();
  sourceType = input.required<PayoutSourceType>();

  // Optional inputs
  detailsTitle = input<string>('Detalhes da Ordem');
  refreshInterval = input<number>(5000);

  // Services
  private pixPaymentService = inject(PixPaymentService);
  private sellOrderService = inject(SellOrderService);
  private payoutRequestService = inject(PixPayoutRequestService);
  private walletManager = inject(WalletManagerService);
  private orderRefreshSubscription?: Subscription;
  private payoutRefreshSubscription?: Subscription;

  // Order state
  order = signal<CommonOrder | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Payout request state
  payoutRequests = signal<PixPayoutRequest[]>([]);
  latestPayoutRequest = computed(() => this.payoutRequests()[0] ?? null);
  isPayoutPhase = computed(() => this.order()?.status === 'settlement_created');
  isPayoutFinal = computed(() => {
    const pr = this.latestPayoutRequest();
    return pr ? isPayoutRequestFinalStatus(pr.status) : false;
  });
  isFullyComplete = computed(() => {
    const o = this.order();
    if (!o?.is_final) return false;
    if (o.status !== 'settlement_created') return true;
    return this.isPayoutFinal();
  });

  showDisputeModal = signal(false);
  isDisputing = signal(false);
  disputeError = signal<string | null>(null);
  isConfirmingReceipt = signal(false);
  confirmReceiptError = signal<string | null>(null);
  isPayoutLoading = signal(false);

  // Computed: current user role for messaging
  currentUserRole = computed((): MessageSenderRole | null => {
    const pr = this.latestPayoutRequest();
    const address = this.walletManager.getSTXAddress();
    if (!pr || !address) return null;
    if (address === environment.b2pixAddress) return 'moderator';
    if (pr.payer_address === address) return 'customer';
    if (pr.lp_address === address) return 'payer';
    return null;
  });

  // Computed: payout request status checks
  isPayoutPaid = computed(() => this.latestPayoutRequest()?.status === PayoutRequestStatus.Paid);
  isPayoutDisputed = computed(() => this.latestPayoutRequest()?.status === PayoutRequestStatus.Disputed);
  isPayoutError = computed(() => this.latestPayoutRequest()?.status === PayoutRequestStatus.Error);
  isPayoutErrorEscalated = computed(() => this.latestPayoutRequest()?.status === PayoutRequestStatus.ErrorEscalated);
  isPayoutDisputeRejected = computed(() => this.latestPayoutRequest()?.status === PayoutRequestStatus.DisputeRejected);

  ngOnInit() {
    this.loadOrder();
  }

  ngOnDestroy() {
    this.stopOrderPolling();
    this.stopPayoutPolling();
  }

  loadOrder() {
    const id = this.orderId();
    if (!id) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.fetchOrder(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.isLoading.set(false);

        if (order.status === 'settlement_created') {
          this.stopOrderPolling();
          this.loadPayoutRequests();
          this.startPayoutPolling();
        } else if (!order.is_final) {
          this.startOrderPolling(id);
        } else {
          this.stopOrderPolling();
        }
      },
      error: (err) => {
        console.error('Error loading order:', err);
        this.error.set('Erro ao carregar detalhes da ordem');
        this.isLoading.set(false);
      }
    });
  }

  private fetchOrder(id: string) {
    return this.sourceType() === 'pix_order'
      ? this.pixPaymentService.getPixPaymentById(id)
      : this.sellOrderService.getSellOrderById(id);
  }

  private loadPayoutRequests(): void {
    this.isPayoutLoading.set(true);
    this.payoutRequestService.getBySource(this.sourceType(), this.orderId()).subscribe({
      next: (prs) => {
        this.payoutRequests.set(prs);
        this.isPayoutLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading payout requests:', err);
        this.isPayoutLoading.set(false);
      }
    });
  }

  private startOrderPolling(orderId: string) {
    this.stopOrderPolling();
    this.orderRefreshSubscription = interval(this.refreshInterval()).subscribe(() => {
      this.fetchOrder(orderId).subscribe({
        next: (order) => {
          this.order.set(order);

          if (order.status === 'settlement_created') {
            this.stopOrderPolling();
            this.loadPayoutRequests();
            this.startPayoutPolling();
          } else if (order.is_final) {
            this.stopOrderPolling();
          }
        },
        error: (err) => {
          console.error('Error refreshing order:', err);
        }
      });
    });
  }

  private startPayoutPolling() {
    this.stopPayoutPolling();
    this.payoutRefreshSubscription = interval(this.refreshInterval()).subscribe(() => {
      this.payoutRequestService.getBySource(this.sourceType(), this.orderId()).subscribe({
        next: (prs) => {
          this.payoutRequests.set(prs);
          const latest = prs[0];
          if (latest && isPayoutRequestFinalStatus(latest.status)) {
            this.stopPayoutPolling();
          }
        },
        error: (err) => {
          console.error('Error refreshing payout requests:', err);
        }
      });
    });
  }

  private stopOrderPolling() {
    if (this.orderRefreshSubscription) {
      this.orderRefreshSubscription.unsubscribe();
      this.orderRefreshSubscription = undefined;
    }
  }

  private stopPayoutPolling() {
    if (this.payoutRefreshSubscription) {
      this.payoutRefreshSubscription.unsubscribe();
      this.payoutRefreshSubscription = undefined;
    }
  }

  // Dispute handlers
  onOpenDisputeModal(): void {
    this.showDisputeModal.set(true);
    this.disputeError.set(null);
  }

  onCloseDisputeModal(): void {
    this.showDisputeModal.set(false);
  }

  onDisputeSubmitted(): void {
    const pr = this.latestPayoutRequest();
    if (!pr) return;

    this.isDisputing.set(true);
    this.disputeError.set(null);

    this.payoutRequestService.disputeRequest(pr.id).subscribe({
      next: () => {
        this.isDisputing.set(false);
        this.showDisputeModal.set(false);
        this.loadPayoutRequests();
      },
      error: (error) => {
        this.isDisputing.set(false);
        if (error?.message?.includes('cancelada') || error?.message?.includes('canceled')) {
          this.disputeError.set('Assinatura cancelada');
        } else {
          this.disputeError.set(error?.error?.error || 'Erro ao abrir disputa');
        }
      }
    });
  }

  onConfirmReceipt(): void {
    const pr = this.latestPayoutRequest();
    if (!pr) return;

    this.isConfirmingReceipt.set(true);
    this.confirmReceiptError.set(null);

    this.payoutRequestService.confirmReceipt(pr.id).subscribe({
      next: () => {
        this.isConfirmingReceipt.set(false);
        this.loadPayoutRequests();
      },
      error: (error) => {
        this.isConfirmingReceipt.set(false);
        if (error?.message?.includes('cancelada') || error?.message?.includes('canceled')) {
          this.confirmReceiptError.set('Assinatura cancelada');
        } else {
          this.confirmReceiptError.set(error?.error?.error || 'Erro ao confirmar recebimento');
        }
      }
    });
  }

  isOrderFinal(): boolean {
    const o = this.order();
    return o ? o.is_final : false;
  }

  getStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
  }

  getStatusClass(status: OrderStatus): string {
    return getOrderStatusClass(status);
  }

  getStatusDescription(status: OrderStatus): string {
    if (status === 'settlement_created') {
      const pr = this.latestPayoutRequest();
      if (pr) {
        switch (pr.status) {
          case PayoutRequestStatus.Disputed:
            return 'Disputa aberta. Um moderador está analisando o caso.';
          case PayoutRequestStatus.Paid:
            return 'O operador PIX informou que realizou o pagamento. Confirme o recebimento ou abra uma disputa.';
          case PayoutRequestStatus.Error:
            return 'Ocorreu um erro no pagamento. Um novo pagamento será criado automaticamente.';
          case PayoutRequestStatus.ErrorEscalated:
            return 'Ocorreu um erro recorrente no pagamento. Um moderador está analisando.';
          case PayoutRequestStatus.DisputeRejected:
            return 'A disputa foi rejeitada. Um novo pagamento está sendo processado.';
          case PayoutRequestStatus.Confirmed:
            return 'Pagamento PIX confirmado com sucesso!';
          case PayoutRequestStatus.LpAssigned:
            return 'Um operador PIX aceitou e está processando o pagamento.';
          default:
            return 'Aguardando um operador PIX processar o pagamento.';
        }
      }
      return 'Aguardando um operador PIX processar o pagamento.';
    }

    switch (status) {
      case 'broadcasted':
        return 'A transação foi transmitida e está aguardando confirmação na blockchain.';
      case 'awaiting_confirmation':
        return 'Aguardando confirmação na blockchain. Isso pode levar alguns minutos.';
      case 'confirmed':
        return 'Transação confirmada na blockchain. Preparando pagamento.';
      case 'pending':
        return 'Pedido criado. Aguardando processamento.';
      case 'failed':
        return 'Ocorreu um erro durante o processamento.';
      case 'error':
        return 'Ocorreu um problema durante o pagamento. Em análise.';
      case 'expired':
        return 'O pedido expirou sem ser processado. Reembolso em andamento.';
      case 'refunded':
        return 'O pagamento falhou e seus bitcoins foram devolvidos.';
      default:
        return '';
    }
  }

  // 3-step order stepper logic
  private getStepNumber(status: OrderStatus): number {
    switch (status) {
      case 'broadcasted':
      case 'awaiting_confirmation':
        return 1;
      case 'confirmed':
        return 2;
      case 'settlement_created':
        return 3;
      default:
        return 0;
    }
  }

  isStepCompleted(step: number): boolean {
    const o = this.order();
    if (!o) return false;
    return this.getStepNumber(o.status) >= step;
  }

  isStepActive(step: number): boolean {
    const o = this.order();
    if (!o) return false;
    if (this.isErrorStatus(o.status)) {
      return step === 3;
    }
    return this.getStepNumber(o.status) === step;
  }

  isErrorStatus(status: OrderStatus): boolean {
    return status === 'failed' || status === 'error' || status === 'expired' || status === 'refunded';
  }

  getLastStepLabel(status: OrderStatus): string {
    switch (status) {
      case 'failed':
      case 'error':
        return 'Falhou';
      case 'expired':
        return 'Expirada';
      case 'refunded':
        return 'Reembolsado';
      default:
        return 'Recebendo Bitcoin';
    }
  }

  // Step labels based on source type
  getOrderStepLabel(step: number): string {
    if (this.sourceType() === 'sell_order') {
      switch (step) {
        case 1: return 'Pedido criado';
        case 2: return 'Pagamento confirmado';
        case 3: return this.getLastStepLabel(this.order()?.status ?? 'pending');
        default: return '';
      }
    }
    // pix_order (buy flow)
    switch (step) {
      case 1: return 'Pedido criado';
      case 2: return 'Pagamento confirmado';
      case 3: return this.getLastStepLabel(this.order()?.status ?? 'pending');
      default: return '';
    }
  }

  getPayoutStepLabel(step: number): string {
    switch (step) {
      case 1: return 'Aguardando pagamento';
      case 2: return 'Processando PIX';
      case 3: return 'PIX enviado';
      case 4: return this.getPayoutLastStepLabel();
      default: return '';
    }
  }

  // Payout stepper logic (4 steps)
  getPayoutStepNumber(status: PayoutRequestStatus): number {
    switch (status) {
      case PayoutRequestStatus.Pending:
        return 1;
      case PayoutRequestStatus.LpAssigned:
        return 2;
      case PayoutRequestStatus.Paid:
      case PayoutRequestStatus.Disputed:
        return 3;
      case PayoutRequestStatus.Confirmed:
      case PayoutRequestStatus.Failed:
      case PayoutRequestStatus.Error:
      case PayoutRequestStatus.ErrorEscalated:
      case PayoutRequestStatus.DisputeRejected:
        return 4;
      default:
        return 0;
    }
  }

  isPayoutStepCompleted(step: number): boolean {
    const pr = this.latestPayoutRequest();
    if (!pr) return false;
    return this.getPayoutStepNumber(pr.status) >= step;
  }

  isPayoutStepActive(step: number): boolean {
    const pr = this.latestPayoutRequest();
    if (!pr) return false;
    if (this.isPayoutErrorState()) {
      return step === 4;
    }
    return this.getPayoutStepNumber(pr.status) === step;
  }

  isPayoutErrorState(): boolean {
    const pr = this.latestPayoutRequest();
    if (!pr) return false;
    return pr.status === PayoutRequestStatus.Failed
      || pr.status === PayoutRequestStatus.Error
      || pr.status === PayoutRequestStatus.ErrorEscalated
      || pr.status === PayoutRequestStatus.DisputeRejected;
  }

  getPayoutLastStepLabel(): string {
    const pr = this.latestPayoutRequest();
    if (!pr) return 'Concluído';
    switch (pr.status) {
      case PayoutRequestStatus.Failed:
      case PayoutRequestStatus.Error:
      case PayoutRequestStatus.ErrorEscalated:
        return 'Falhou';
      case PayoutRequestStatus.DisputeRejected:
        return 'Disputa rejeitada';
      default:
        return 'Concluído';
    }
  }

  // Formatting — delegated to shared utils
  formatBrlCents = formatBrlCents;
  formatSats = formatSats;
  formatSatsToBtc = formatSatsToBtc;
  formatDateTime = formatDateTime;
  formatTruncated = formatTruncated;
  getExplorerUrl = getExplorerUrl;
}
