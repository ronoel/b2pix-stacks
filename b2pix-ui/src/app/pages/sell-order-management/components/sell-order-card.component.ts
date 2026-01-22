import { Component, Input, Output, EventEmitter, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SellOrder } from '../../../shared/models/sell-order.model';

@Component({
  selector: 'app-sell-order-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="sell-order-card" [class.processing]="isProcessing">
      <div class="card-header">
        <div class="card-info">
          <div class="order-id-badge">
            <span class="label">ID da Ordem</span>
            <span class="value">{{ formatOrderId(order.id) }}</span>
          </div>
          <div class="status-badge confirmed">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            </svg>
            Confirmada
          </div>
        </div>
        <div class="card-date">
          <span class="label">Criada em</span>
          <span class="value">{{ formatDate(order.created_at) }}</span>
        </div>
      </div>

      <div class="card-body">
        <div class="details-grid">
          <div class="detail-item">
            <span class="label">Vendedor</span>
            <span class="value address">{{ formatAddress(order.address_seller) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Chave PIX</span>
            <span class="value pix-key">{{ order.pix_key }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Valor a Pagar</span>
            <span class="value highlight">{{ formatBRLCurrency(order.sell_value) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Bitcoin (sats)</span>
            <span class="value">{{ formatSats(order.amount) }} sats</span>
          </div>
          <div class="detail-item">
            <span class="label">Bitcoin (BTC)</span>
            <span class="value">{{ formatBTC(order.amount) }} BTC</span>
          </div>
          <div class="detail-item">
            <span class="label">Confirmada em</span>
            <span class="value">{{ formatDate(order.confirmed_at || order.created_at) }}</span>
          </div>
        </div>

        <div class="pix-id-section">
          <label class="pix-id-label">ID da Transação PIX (opcional)</label>
          <input
            type="text"
            class="pix-id-input"
            [(ngModel)]="pixIdValue"
            placeholder="Digite o ID da transação PIX ou deixe vazio"
            [disabled]="isProcessing"
          />
          <span class="pix-id-hint">Se não tiver o ID, deixe vazio. O campo será preenchido com "NONE".</span>
        </div>
      </div>

      <div class="card-footer">
        <button
          class="btn btn-confirm"
          (click)="onConfirmPayment()"
          [disabled]="isProcessing"
        >
          @if (isProcessing) {
            <div class="loading-spinner-sm"></div>
            Processando...
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            </svg>
            Confirmar Pagamento
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sell-order-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .sell-order-card:hover {
      box-shadow: 0 10px 25px -3px rgb(0 0 0 / 0.1);
    }

    .sell-order-card.processing {
      opacity: 0.7;
      pointer-events: none;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
    }

    .card-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .order-id-badge {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .order-id-badge .label {
      font-size: 12px;
      font-weight: 500;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .order-id-badge .value {
      font-size: 14px;
      font-weight: 600;
      color: #1F2937;
      font-family: 'Courier New', monospace;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      width: fit-content;
    }

    .status-badge.confirmed {
      background: #D1FAE5;
      color: #065F46;
      border: 1px solid #6EE7B7;
    }

    .card-date {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: right;
    }

    .card-date .label {
      font-size: 12px;
      font-weight: 500;
      color: #6B7280;
    }

    .card-date .value {
      font-size: 14px;
      font-weight: 500;
      color: #1F2937;
    }

    .card-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .detail-item .label {
      font-size: 12px;
      font-weight: 500;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-item .value {
      font-size: 14px;
      font-weight: 500;
      color: #1F2937;
    }

    .detail-item .value.address {
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }

    .detail-item .value.pix-key {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      word-break: break-all;
    }

    .detail-item .value.highlight {
      font-size: 20px;
      font-weight: 700;
      color: #16A34A;
    }

    .pix-id-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: #F9FAFB;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
    }

    .pix-id-label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }

    .pix-id-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      color: #1F2937;
      font-family: 'Courier New', monospace;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .pix-id-input:focus {
      outline: none;
      border-color: #F59E0B;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    }

    .pix-id-input:disabled {
      background: #F3F4F6;
      cursor: not-allowed;
    }

    .pix-id-hint {
      font-size: 12px;
      color: #6B7280;
      font-style: italic;
    }

    .card-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      background: #F9FAFB;
      border-top: 1px solid #E5E7EB;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-confirm {
      background: #F59E0B;
      color: white;
    }

    .btn-confirm:hover:not(:disabled) {
      background: #D97706;
      transform: translateY(-1px);
    }

    .loading-spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .card-header {
        flex-direction: column;
        gap: 16px;
      }

      .card-date {
        text-align: left;
      }

      .details-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .card-footer {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .card-header,
      .card-body,
      .card-footer {
        padding: 16px;
      }

      .detail-item .value.highlight {
        font-size: 18px;
      }
    }
  `]
})
export class SellOrderCardComponent {
  @Input() order!: SellOrder;
  @Input() isProcessing = false;

  @Output() confirmPayment = new EventEmitter<{ orderId: string; pixId: string | null }>();

  pixIdValue = signal<string>('');

  onConfirmPayment() {
    const pixId = this.pixIdValue().trim() || null;
    this.confirmPayment.emit({ orderId: this.order.id, pixId });
  }

  formatOrderId(id: string): string {
    if (id.length <= 16) return id;
    return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`;
  }

  formatAddress(address: string): string {
    if (address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  }

  formatBRLCurrency(valueInCents: number | null): string {
    if (valueInCents === null) return 'R$ 0,00';
    const valueInReais = valueInCents / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valueInReais);
  }

  formatSats(sats: number): string {
    return new Intl.NumberFormat('pt-BR').format(sats);
  }

  formatBTC(sats: number): string {
    return (sats / 100000000).toFixed(8);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
