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
  templateUrl: './transaction-card.component.html',
  styleUrl: './transaction-card.component.scss'
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
