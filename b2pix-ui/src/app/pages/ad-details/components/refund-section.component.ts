import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentRequest, PaymentRequestStatus } from '../../../shared/models/payment-request.model';

@Component({
  selector: 'app-refund-section',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="refund-section">
      <div class="section-header">
        <h2 class="section-title">Reembolso de Sats Não Vendidos</h2>
      </div>
      <div class="refund-card">
        <div class="refund-header">
          <div class="refund-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M9 14L4 9L9 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 20V13C20 11.9391 19.5786 10.9217 18.8284 10.1716C18.0783 9.42143 17.0609 9 16 9H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="refund-status-badge" [ngClass]="getPaymentRequestStatusClass(refundPaymentRequest().status)">
            {{ getPaymentRequestStatusLabel(refundPaymentRequest().status) }}
          </div>
        </div>
        <div class="refund-content">
          <div class="refund-info">
            <div class="detail-item">
              <span class="detail-label">Valor:</span>
              <span class="detail-value">{{ formatSats(refundPaymentRequest().amount.toString()) }} sats</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Criado em:</span>
              <span class="detail-value">{{ formatDate(refundPaymentRequest().created_at) }}</span>
            </div>
            @if (refundPaymentRequest().blockchain_tx_id) {
              <div class="detail-item">
                <span class="detail-label">Transação:</span>
                <span class="detail-value">
                  <button class="blockchain-link" (click)="onOpenBlockchainExplorer()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M18 13V19C18 20.1046 17.1046 21 16 21H5C3.89543 21 3 20.1046 3 19V8C3 6.89543 3.89543 6 5 6H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M15 3H21V9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Ver na Blockchain
                  </button>
                </span>
              </div>
            }
            @if (!refundPaymentRequest().blockchain_tx_id) {
              <div class="detail-item">
                <span class="detail-label">Transação:</span>
                <span class="no-transaction">Aguardando processamento</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .refund-section {
      margin-bottom: 32px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }
    .refund-card {
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
      border: 2px solid #F59E0B;
      border-radius: 16px;
      padding: 24px;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    .refund-card:hover {
      box-shadow: 0 10px 25px -5px rgb(245 158 11 / 0.3);
      transform: translateY(-2px);
    }
    .refund-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .refund-icon {
      color: #F59E0B;
    }
    .refund-status-badge {
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #F9FAFB;
      color: #059669;
      border: 1px solid #A7F3D0;
    }
    .refund-status-badge.pending {
      background: #f59e0b20;
      color: #f59e0b;
      border-color: #f59e0b;
    }
    .refund-status-badge.completed {
      background: #22c55e20;
      color: #22c55e;
      border-color: #22c55e;
    }
    .refund-status-badge.failed {
      background: #ef444420;
      color: #ef4444;
      border-color: #ef4444;
    }
    .refund-content {
      padding: 0;
    }
    .refund-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      background: rgba(255, 255, 255, 0.8);
      padding: 16px;
      border-radius: 12px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .detail-label {
      color: #6B7280;
      font-size: 13px;
    }
    .detail-value {
      color: #1F2937;
      font-weight: 500;
    }
    .blockchain-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #1E40AF;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 4px 12px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .blockchain-link:hover {
      background: #1D4ED8;
    }
    .no-transaction {
      color: #9CA3AF;
      font-style: italic;
    }
  `]
})
export class RefundSectionComponent {
  refundPaymentRequest = input.required<PaymentRequest>();
  openBlockchainExplorer = output<string>();

  onOpenBlockchainExplorer() {
    const txId = this.refundPaymentRequest().blockchain_tx_id;
    if (txId) {
      this.openBlockchainExplorer.emit(txId);
    }
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

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
