import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Advertisement, AdvertisementStatus } from '../../../shared/models/advertisement.model';

@Component({
  selector: 'app-listing-card',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="listing-section">
      <div class="listing-card">
        <div class="listing-header">
          <div class="listing-status-badge" [ngClass]="getStatusClass(advertisement().status)">
            {{ getStatusLabel(advertisement().status) }}
          </div>
          @if (canEdit() || canFinish() || canAddFund()) {
            <div class="listing-actions">
              @if (canAddFund()) {
                <button class="btn btn-success btn-sm" (click)="onAddFund()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8V16M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  Adicionar Fundos
                </button>
              }
              @if (canEdit()) {
                <button class="btn btn-primary btn-sm" (click)="onEdit()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Editar
                </button>
              }
              @if (canFinish()) {
                <button class="btn btn-danger btn-sm" (click)="onFinish()" [disabled]="isFinishing()">
                  @if (!isFinishing()) {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  }
                  @if (isFinishing()) {
                    <span class="loading-spinner-sm"></span>
                  }
                  {{ isFinishing() ? 'Finalizando...' : 'Finalizar Anúncio' }}
                </button>
              }
            </div>
          }
        </div>
        <div class="listing-content">
          <div class="listing-main-info">
            <div class="listing-price">
              <span class="price-label">Preço por Bitcoin:</span>
              <span class="price-value">
                @if (advertisement().pricing_mode === 'fixed') {
                  {{ formatPriceCurrency(advertisement().price!) }}
                } @else {
                  Dinâmico ({{ (advertisement().percentage_offset ?? 0) > 0 ? '+' : '' }}{{ advertisement().percentage_offset ?? 0 }}%)
                }
              </span>
            </div>
            <div class="detail-item">
              <span class="amount-label">Quantidade:</span>
              <span class="amount-value">{{ formatBTC(advertisement().total_deposited) }} BTC</span>
            </div>
          </div>
          <div class="listing-details-grid">
            <div class="detail-item">
              <span class="detail-label">Restante:</span>
              <span class="detail-value">{{ formatBTC(advertisement().available_amount) }} BTC</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Valor Mínimo:</span>
              <span class="detail-value">{{ formatCentsToReais(advertisement().min_amount) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Valor Máximo:</span>
              <span class="detail-value">{{ formatCentsToReais(advertisement().max_amount) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Criado:</span>
              <span class="detail-value">{{ formatDate(advertisement().created_at) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Depósitos:</span>
              <span class="detail-value">
                <button class="deposits-link" (click)="onShowDeposits()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
                  </svg>
                  Ver Depósitos
                </button>
              </span>
            </div>
          </div>
          @if (advertisement().status === 'ready') {
            <div class="listing-progress">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="getProgressPercentage(advertisement())"></div>
              </div>
              <div class="progress-text">{{ getProgressPercentage(advertisement()) }}% vendido</div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .listing-section {
      margin-bottom: 32px;
    }
    .listing-card {
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      padding: 24px;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    .listing-card:hover {
      border-color: #1E40AF;
      box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1);
      transform: translateY(-2px);
    }
    .listing-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      position: relative;
    }
    .listing-status-badge {
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
    .listing-status-badge.ready {
      background: #22c55e20;
      color: #22c55e;
    }
    .listing-status-badge.pending {
      background: #f59e0b20;
      color: #f59e0b;
    }
    .listing-status-badge.disabled {
      background: #64748b20;
      color: #64748b;
    }
    .listing-status-badge.closed {
      background: #ef444420;
      color: #ef4444;
    }
    .listing-actions {
      display: flex;
      gap: 8px;
    }
    .listing-content {
      padding: 0 0 16px 0;
    }
    .listing-main-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #E5E7EB;
    }
    .listing-price, .listing-amount {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .price-label, .amount-label {
      color: #6B7280;
      font-size: 14px;
    }
    .price-value {
      font-size: 22px;
      font-weight: 700;
      color: #F59E0B;
    }
    .amount-value {
      font-size: 22px;
      font-weight: 700;
      color: #1E40AF;
    }
    .listing-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
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
    .listing-progress {
      margin-top: 16px;
    }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #E5E7EB;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .progress-fill {
      height: 100%;
      background: #1E40AF;
      transition: width 0.3s ease;
    }
    .progress-text {
      text-align: center;
      color: #6B7280;
      font-size: 13px;
    }
    .deposits-link {
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
    .deposits-link:hover {
      background: #1D4ED8;
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
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-success {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      border-color: #10B981;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
    }
    .btn-success:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
      transform: translateY(-1px);
    }
    .btn-success:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(16, 185, 129, 0.2);
    }
    .btn-danger {
      background: #ef4444;
      color: white;
      border-color: #ef4444;
    }
    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
    }
    .btn-primary {
      background: #1E40AF;
      color: white;
      border-color: #1E40AF;
    }
    .btn-primary:hover:not(:disabled) {
      background: #1D4ED8;
    }
    .btn-sm {
      padding: 8px 16px;
      font-size: 12px;
    }
    .loading-spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @media (max-width: 768px) {
      .listing-main-info {
        grid-template-columns: 1fr;
      }
      .listing-details-grid {
        grid-template-columns: 1fr;
      }
      .listing-card {
        padding: 16px;
      }
    }
  `]
})
export class ListingCardComponent {
  advertisement = input.required<Advertisement>();
  canFinish = input.required<boolean>();
  isFinishing = input.required<boolean>();
  canEdit = input<boolean>(false);

  finish = output<void>();
  showDeposits = output<void>();
  edit = output<void>();
  addFund = output<void>();

  onFinish() {
    this.finish.emit();
  }

  onShowDeposits() {
    this.showDeposits.emit();
  }

  onEdit() {
    this.edit.emit();
  }

  onAddFund() {
    this.addFund.emit();
  }

  canAddFund(): boolean {
    return this.advertisement().status === AdvertisementStatus.READY;
  }

  getStatusClass(status: AdvertisementStatus): string {
    switch (status) {
      case AdvertisementStatus.READY:
        return 'ready';
      case AdvertisementStatus.PENDING:
        return 'pending';
      case AdvertisementStatus.CLOSED:
        return 'closed';
      case AdvertisementStatus.DISABLED:
        return 'disabled';
      default:
        return 'pending';
    }
  }

  getStatusLabel(status: AdvertisementStatus): string {
    switch (status) {
      case AdvertisementStatus.DRAFT:
        return 'Rascunho';
      case AdvertisementStatus.PENDING:
        return 'Aguardando';
      case AdvertisementStatus.READY:
        return 'Ativo';
      case AdvertisementStatus.BANK_FAILED:
        return 'Erro Bancário';
      case AdvertisementStatus.DEPOSIT_FAILED:
        return 'Erro Depósito';
      case AdvertisementStatus.CLOSED:
        return 'Fechado';
      case AdvertisementStatus.DISABLED:
        return 'Pausado';
      default:
        return status;
    }
  }

  formatPriceCurrency(price: number): string {
    const priceInReais = price / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(priceInReais);
  }

  formatBTC(amount: number): string {
    const btcAmount = amount / 100000000;
    return btcAmount.toFixed(8);
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

  getProgressPercentage(ad: Advertisement): number {
    const total = ad.total_deposited;
    const available = ad.available_amount;
    const sold = total - available;

    if (total === 0) {
      return 0;
    }

    // Round to 1 decimal place to show small percentages like 0.1%, 0.5%, etc.
    const percentage = Math.round((sold / total) * 1000) / 10;
    return percentage;
  }
}
