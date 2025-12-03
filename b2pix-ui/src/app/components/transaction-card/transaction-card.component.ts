import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuyStatus } from '../../shared/models/buy.model';
import { PaymentRequest, PaymentRequestStatus } from '../../shared/models/payment-request.model';
import { environment } from '../../../environments/environment';

export interface TransactionCardData {
  id: string;
  type: string;
  amount: string;
  price: string;
  payValue: string;
  pricePerBtc: string;
  status: BuyStatus;
  createdAt: string;
}

@Component({
  selector: 'app-transaction-card',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div
      class="transaction-card"
      [class.clickable]="transaction.status === 'pending'"
      (click)="onCardClick()"
    >
      <div class="transaction-header">
        <div class="transaction-type">
          <div class="transaction-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M7 17L17 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 7H17V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="type-info">
            <h4 class="type-title">Compra de Bitcoin</h4>
            <span class="transaction-id">#{{ transaction.id.slice(-8) }}</span>
          </div>
        </div>
        <div class="status-badge" [ngClass]="getDisplayStatusClass()">
          {{ getDisplayStatusLabel() }}
        </div>
      </div>

      <div class="transaction-details">
        <div class="detail-row">
          <span class="detail-label">Compra:</span>
          <span class="detail-value amount">{{ formatBRLCurrency(transaction.payValue) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Bitcoin:</span>
          <span class="detail-value btc">{{ formatSatoshisToBTC(transaction.amount) }} BTC</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Preço:</span>
          <span class="detail-value price">{{ formatBRLCurrency(transaction.pricePerBtc) }}/BTC</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Data e hora:</span>
          <span class="detail-value">{{ formatDateTime(transaction.createdAt) }}</span>
        </div>
      </div>

      @if (transaction.status === 'pending') {
        <div class="pending-action-hint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Clique para realizar o pagamento</span>
        </div>
      }

      @if (shouldShowPaymentDetails()) {
        @if (paymentRequest) {
          <div class="payment-details-inline">
            <div class="payment-info-compact">
              <div class="payment-item">
                <span class="payment-label">Pagamento:</span>
                <span class="payment-value">{{ formatSats(paymentRequest.amount.toString()) }} sats</span>
              </div>
              @if (paymentRequest.blockchain_tx_id) {
                <div class="payment-item full">
                  <span class="payment-label">Transação:</span>
                  <a
                    [href]="getBlockchainExplorerUrl(paymentRequest.blockchain_tx_id)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="blockchain-link"
                  >
                    {{ formatTransactionId(paymentRequest.blockchain_tx_id) }}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <polyline points="15,3 21,3 21,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </a>
                </div>
              }
            </div>
          </div>
        } @else if (isLoadingPayment) {
          <div class="payment-loading">
            <div class="loading-spinner-sm"></div>
            <span>Carregando detalhes do pagamento...</span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    /* Transaction Card Design */
    .transaction-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .transaction-card.clickable {
      cursor: pointer;
      position: relative;
      padding-right: 40px;
    }

    .transaction-card.clickable:hover {
      border-color: #F59E0B;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px -4px rgb(0 0 0 / 0.15);
    }

    .transaction-card.clickable::after {
      content: '';
      position: absolute;
      top: 50%;
      right: 16px;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      border-top: 2px solid #F59E0B;
      border-right: 2px solid #F59E0B;
      transform: translateY(-50%) rotate(45deg);
      opacity: 0;
      transition: all 0.2s ease;
    }

    .transaction-card.clickable:hover::after {
      opacity: 1;
      right: 20px;
    }

    .transaction-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #F3F4F6;
    }

    .transaction-type {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .transaction-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: #EFF6FF;
      border-radius: 8px;
      color: #F59E0B;
      flex-shrink: 0;
    }

    .type-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .type-title {
      font-size: 14px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .transaction-id {
      font-size: 11px;
      color: #6B7280;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-weight: 500;
    }

    .transaction-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .detail-label {
      font-size: 12px;
      color: #6B7280;
      font-weight: 500;
    }

    .detail-value {
      font-size: 13px;
      color: #1F2937;
      font-weight: 600;
    }

    .detail-value.amount {
      font-size: 14px;
      color: #F59E0B;
      font-weight: 700;
    }

    .detail-value.btc {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      color: #059669;
      font-weight: 700;
      font-size: 13px;
    }

    .detail-value.price {
      color: #6B7280;
      font-weight: 600;
      font-size: 12px;
    }

    /* Pending Action Hint */
    .pending-action-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 10px 12px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 8px;
      color: #1E40AF;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .transaction-card.clickable:hover .pending-action-hint {
      background: #DBEAFE;
      border-color: #93C5FD;
    }

    .pending-action-hint svg {
      flex-shrink: 0;
      color: #3B82F6;
    }

    /* Payment Details Inline (Compact) */
    .payment-details-inline {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #F3F4F6;
    }

    .payment-info-compact {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
    }

    .payment-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .payment-item.full {
      grid-column: 1 / -1;
    }

    .payment-label {
      font-size: 12px;
      color: #6B7280;
      font-weight: 500;
    }

    .payment-value {
      font-size: 13px;
      color: #1F2937;
      font-weight: 600;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .blockchain-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #3B82F6;
      text-decoration: none;
      font-weight: 600;
      font-size: 12px;
      transition: all 0.2s ease;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .blockchain-link:hover {
      color: #2563EB;
      text-decoration: underline;
    }

    .blockchain-link svg {
      opacity: 0.7;
      flex-shrink: 0;
    }

    .payment-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 10px;
      background: #F9FAFB;
      border-radius: 8px;
      color: #6B7280;
      font-size: 12px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .transaction-card {
        padding: 14px;
      }

      .transaction-header {
        margin-bottom: 10px;
        padding-bottom: 10px;
      }

      .transaction-type {
        gap: 8px;
      }

      .transaction-icon {
        width: 32px;
        height: 32px;
        border-radius: 6px;
      }

      .type-title {
        font-size: 13px;
      }

      .transaction-id {
        font-size: 10px;
      }

      .transaction-details {
        grid-template-columns: 1fr;
        gap: 6px;
      }

      .detail-row {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
      }

      .detail-label {
        font-size: 11px;
      }

      .detail-value {
        font-size: 12px;
      }

      .detail-value.amount {
        font-size: 13px;
      }

      .detail-value.btc {
        font-size: 12px;
      }

      .detail-value.price {
        font-size: 11px;
      }

      .payment-info-compact {
        grid-template-columns: 1fr;
      }

      .payment-item {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }

      .payment-item.full {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `]
})
export class TransactionCardComponent {
  @Input() transaction!: TransactionCardData;
  @Input() paymentRequest?: PaymentRequest | null;
  @Input() isLoadingPayment = false;
  @Output() cardClick = new EventEmitter<TransactionCardData>();

  onCardClick() {
    if (this.transaction.status === BuyStatus.Pending) {
      this.cardClick.emit(this.transaction);
    }
  }

  /**
   * Check if payment details should be shown (only for specific statuses)
   */
  shouldShowPaymentDetails(): boolean {
    return this.transaction.status === BuyStatus.PaymentConfirmed ||
           this.transaction.status === BuyStatus.DisputeResolvedBuyer;
  }

  /**
   * Get the status class to display (payment request status if available, otherwise buy status)
   */
  getDisplayStatusClass(): string {
    if (this.shouldShowPaymentDetails() && this.paymentRequest) {
      return this.getPaymentRequestStatusClass(this.paymentRequest.status);
    }
    return this.getStatusClass(this.transaction.status);
  }

  /**
   * Get the status label to display (payment request status if available, otherwise buy status)
   */
  getDisplayStatusLabel(): string {
    if (this.shouldShowPaymentDetails() && this.paymentRequest) {
      return this.getPaymentRequestStatusLabel(this.paymentRequest.status);
    }
    return this.getStatusLabel(this.transaction.status);
  }

  getStatusClass(status: BuyStatus): string {
    switch (status) {
      // case BuyStatus.Completed:
      case BuyStatus.PaymentConfirmed:
      case BuyStatus.DisputeFavorBuyer:
      case BuyStatus.DisputeResolvedBuyer:
        return 'completed';
      case BuyStatus.Pending:
        return 'pending';
      case BuyStatus.Paid:
        return 'processing';
      case BuyStatus.Cancelled:
      case BuyStatus.Expired:
        return 'warning';
      case BuyStatus.InDispute:
      case BuyStatus.DisputeFavorSeller:
      case BuyStatus.DisputeResolvedSeller:
        return 'warning';
      default:
        return 'warning';
    }
  }

  getStatusLabel(status: BuyStatus): string {
    switch (status) {
      case BuyStatus.Pending:
        return 'Pendente';
      case BuyStatus.Paid:
        return 'Verificando Pagamento';
      case BuyStatus.PaymentConfirmed:
        return 'Pagamento Confirmado';
      // case BuyStatus.Completed:
      //   return 'Concluída';
      case BuyStatus.Cancelled:
        return 'Cancelada';
      case BuyStatus.Expired:
        return 'Expirada';
      case BuyStatus.InDispute:
        return 'Em Disputa';
      case BuyStatus.DisputeFavorBuyer:
        return 'Disputa a Favor do Comprador';
      case BuyStatus.DisputeFavorSeller:
        return 'Disputa a Favor do Vendedor';
      case BuyStatus.DisputeResolvedBuyer:
        return 'Disputa Resolvida a Favor do Comprador';
      case BuyStatus.DisputeResolvedSeller:
        return 'Disputa Resolvida a Favor do Vendedor';
      default:
        return 'Em análise';
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

  formatSats(amount: string): string {
    return new Intl.NumberFormat('pt-BR').format(Number(amount));
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
}
