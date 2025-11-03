import { Component, input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Buy, BuyStatus } from '../../../shared/models/buy.model';

@Component({
  selector: 'app-buys-list',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="buys-section">
      <div class="section-header">
        <h2 class="section-title">Vendas Realizadas</h2>
        <div class="buys-count">{{ buys().length }} vendas</div>
      </div>
      @if (buys().length > 0) {
        <div class="buys-list">
          @for (buy of buys(); track buy.id) {
            <div class="buy-card">
              <div class="buy-header">
                <div class="buy-id">ID: {{ buy.id.substring(0, 8) }}...</div>
                <div class="buy-status-badge" [ngClass]="getBuyStatusClass(buy.status)">
                  {{ getBuyStatusLabel(buy.status) }}
                </div>
              </div>
              <div class="buy-content">
                <div class="buy-amounts">
                  <div class="amount-item">
                    <span class="amount-label">Sats:</span>
                    <span class="amount-value">{{ formatSats(buy.amount) }}</span>
                  </div>
                  <div class="amount-item">
                    <span class="amount-label">Valor BRL:</span>
                    <span class="amount-value">{{ formatCentsToReais(buy.pay_value) }}</span>
                  </div>
                </div>
                <div class="buy-details-grid">
                  <div class="detail-item">
                    <span class="detail-label">Preço:</span>
                    <span class="detail-value">{{ formatCentsToReais(buy.price) }}/BTC</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Comprador:</span>
                    <span class="detail-value">{{ buy.address_buy.substring(0, 8) }}...</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">PIX:</span>
                    <span class="detail-value">{{ buy.pix_key.substring(0, 8) }}...</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Criado:</span>
                    <span class="detail-value">{{ formatDate(buy.created_at) }}</span>
                  </div>
                  @if (buy.expires_at) {
                    <div class="detail-item">
                      <span class="detail-label">Expira:</span>
                      <span class="detail-value">{{ formatDate(buy.expires_at) }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
      @if (buys().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M8 14S9.5 16 12 16S16 14 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 9H9.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M15 9H15.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3>Nenhuma venda realizada</h3>
          <p>Este anúncio ainda não possui vendas realizadas.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .buys-section {
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
    .buys-count {
      color: #6B7280;
      font-size: 14px;
      padding: 6px 16px;
      background: #F9FAFB;
      border-radius: 9999px;
    }
    .buys-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .buy-card {
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.2s ease;
      position: relative;
      padding: 16px;
    }
    .buy-card:hover {
      border-color: #1E40AF;
      box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1);
      transform: translateY(-2px);
    }
    .buy-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      position: relative;
    }
    .buy-id {
      font-family: monospace;
      color: #6B7280;
      font-size: 13px;
    }
    .buy-status-badge {
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #F9FAFB;
      color: #059669;
      border: 1px solid #A7F3D0;
    }
    .buy-status-badge.pending {
      background: #f59e0b20;
      color: #f59e0b;
    }
    .buy-status-badge.paid {
      background: #3b82f620;
      color: #3b82f6;
    }
    .buy-status-badge.completed {
      background: #22c55e20;
      color: #22c55e;
    }
    .buy-status-badge.cancelled,
    .buy-status-badge.expired {
      background: #ef444420;
      color: #ef4444;
    }
    .buy-content {
      padding: 0 0 8px 0;
    }
    .buy-amounts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #E5E7EB;
    }
    .amount-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .amount-label {
      color: #6B7280;
      font-size: 14px;
    }
    .amount-value {
      font-size: 22px;
      font-weight: 700;
      color: #1E40AF;
    }
    .buy-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
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
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      text-align: center;
      background: #FFFFFF;
      border-radius: 16px;
      border: 2px dashed #E5E7EB;
    }
    .empty-icon {
      color: #9CA3AF;
      margin-bottom: 16px;
    }
    .empty-state h3 {
      font-size: 18px;
      color: #1F2937;
      margin: 0;
    }
    .empty-state p {
      color: #6B7280;
      margin: 0;
    }
    @media (max-width: 768px) {
      .buy-amounts {
        grid-template-columns: 1fr;
      }
      .buy-details-grid {
        grid-template-columns: 1fr;
      }
      .buy-card {
        padding: 16px;
      }
      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }
    @media (max-width: 480px) {
      .buys-list {
        gap: 8px;
      }
      .buy-card {
        padding: 8px;
      }
      .empty-state {
        padding: 24px;
      }
    }
  `]
})
export class BuysListComponent {
  buys = input.required<Buy[]>();

  getBuyStatusClass(status: BuyStatus): string {
    switch (status) {
      case BuyStatus.Pending:
        return 'pending';
      case BuyStatus.Paid:
        return 'paid';
      case BuyStatus.Completed:
        return 'completed';
      case BuyStatus.Cancelled:
      case BuyStatus.Expired:
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  getBuyStatusLabel(status: BuyStatus): string {
    switch (status) {
      case BuyStatus.Pending:
        return 'Aguardando Pagamento';
      case BuyStatus.Paid:
        return 'Pago';
      case BuyStatus.Completed:
        return 'Concluído';
      case BuyStatus.Cancelled:
        return 'Cancelado';
      case BuyStatus.Expired:
        return 'Expirado';
      case BuyStatus.InDispute:
        return 'Em Disputa';
      case BuyStatus.DisputeResolvedBuyer:
        return 'Disputa - Comprador';
      case BuyStatus.DisputeResolvedSeller:
        return 'Disputa - Vendedor';
      default:
        return status;
    }
  }

  formatSats(amount: string): string {
    return new Intl.NumberFormat('pt-BR').format(Number(amount));
  }

  formatCentsToReais(cents: string | number): string {
    const reais = Number(cents) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(reais);
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
