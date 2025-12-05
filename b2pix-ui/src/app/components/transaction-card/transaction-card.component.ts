import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuyStatus } from '../../shared/models/buy.model';

export interface TransactionCardData {
  id: string;
  type: string;
  amount: string;
  price: string;
  payValue: string;
  pricePerBtc: string;
  status: BuyStatus;
  createdAt: string;
  expiresAt?: string;
}

@Component({
  selector: 'app-transaction-card',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div
      class="transaction-card clickable"
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
          <span class="detail-label">Valor:</span>
          <span class="detail-value amount">{{ formatBRLCurrency(transaction.payValue) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Bitcoin:</span>
          <span class="detail-value btc">{{ formatSatoshisToBTC(transaction.amount) }} BTC</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Data:</span>
          <span class="detail-value">{{ formatDate(transaction.createdAt) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Transaction Card Design */
    .transaction-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 12px 14px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    .transaction-card.clickable {
      cursor: pointer;
    }

    .transaction-card.clickable:hover {
      border-color: #F59E0B;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px 0 rgb(0 0 0 / 0.1);
      background: #FFFBF5;
    }

    .transaction-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #F3F4F6;
    }

    .transaction-type {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .transaction-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: #EFF6FF;
      border-radius: 8px;
      color: #F59E0B;
      flex-shrink: 0;
    }

    .transaction-icon svg {
      width: 16px;
      height: 16px;
    }

    .type-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .type-title {
      font-size: 13px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .transaction-id {
      font-size: 10px;
      color: #6B7280;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-weight: 500;
    }

    .transaction-details {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px 12px;
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .detail-label {
      font-size: 11px;
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
    }
  `]
})
export class TransactionCardComponent {
  @Input() transaction!: TransactionCardData;
  @Output() cardClick = new EventEmitter<TransactionCardData>();

  onCardClick() {
    this.cardClick.emit(this.transaction);
  }

  /**
   * Check if a transaction is actually expired (expiresAt has passed)
   * even if the server status still shows as pending
   */
  private isTransactionExpired(): boolean {
    if (!this.transaction || !this.transaction.expiresAt) return false;

    const now = new Date();
    const expiresAt = new Date(this.transaction.expiresAt);
    return now.getTime() > expiresAt.getTime();
  }

  getDisplayStatusClass(): string {
    return this.getStatusClass(this.transaction.status);
  }

  getDisplayStatusLabel(): string {
    return this.getStatusLabel(this.transaction.status);
  }

  getStatusClass(status: BuyStatus): string {
    // Check if it's pending but actually expired
    if (status === BuyStatus.Pending && this.isTransactionExpired()) {
      return 'warning';
    }

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
    // Check if it's pending but actually expired
    if (status === BuyStatus.Pending && this.isTransactionExpired()) {
      return 'Expirada';
    }

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

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }
}
