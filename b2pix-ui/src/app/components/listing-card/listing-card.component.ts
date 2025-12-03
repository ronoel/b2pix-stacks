import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Advertisement, AdvertisementStatus } from '../../shared/models/advertisement.model';
import { PricingUtils } from '../../shared/utils/pricing.utils';

@Component({
  selector: 'app-listing-card',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="listing-card" (click)="onCardClick()">
      <div class="listing-header">
        <div class="listing-date">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
          </svg>
          {{ formatDate(ad.created_at) }}
        </div>
        <div class="listing-status" [ngClass]="getStatusClass(ad.status)">
          <span class="status-dot"></span>
          {{ getStatusLabel(ad.status) }}
        </div>
      </div>
      <div class="listing-content">
        <div class="listing-amount">
          <span class="amount-label">Quantidade:</span>
          <span class="amount-value">{{ formatBTC(ad.total_deposited) }} BTC</span>
        </div>
        <div class="listing-price">
          <div class="price-header">
            <span class="price-label">Preço:</span>
            <span class="pricing-mode-badge" [ngClass]="getPricingModeBadgeClass()">
              {{ getPricingModeLabel() }}
            </span>
          </div>
          <span class="price-value">{{ getPriceDisplay() }}</span>
        </div>
        <div class="listing-limits">
          <span class="limits-label">Limites:</span>
          <span class="limits-value">{{ formatCentsToReais(ad.min_amount) }} - {{ formatCentsToReais(ad.max_amount) }}</span>
        </div>
      </div>

      <!-- Progress Bar for Bitcoin Sold -->
      @if (getProgressPercentage() > 0) {
        <div class="listing-progress" [ngClass]="getProgressColorClass()">
          <div class="progress-info">
            <span class="progress-label">Vendido</span>
            <span class="progress-percentage">{{ getProgressPercentage() }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="getProgressPercentage()" [ngClass]="getProgressColorClass()"></div>
          </div>
          <div class="progress-details">
            <span class="sold-amount">{{ formatBTC(getSoldAmount()) }} BTC vendido</span>
            <span class="available-amount">{{ formatBTC(ad.available_amount) }} BTC disponível</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .listing-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 24px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      cursor: pointer;
    }

    .listing-card:hover {
      border-color: #3B82F6;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
      background-color: #F8FAFC;
    }

    .listing-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .listing-date {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #6B7280;
      font-weight: 500;
    }

    .listing-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .listing-status.ready {
      background: #DCFCE7;
      color: #166534;
    }

    .listing-status.pending {
      background: #FEF3C7;
      color: #92400E;
    }

    .listing-status.draft {
      background: #F3F4F6;
      color: #374151;
    }

    .listing-status.disabled {
      background: #FEE2E2;
      color: #991B1B;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .listing-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .listing-amount,
    .listing-price,
    .listing-limits {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .price-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .pricing-mode-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pricing-mode-badge.badge-fixed {
      background: #DBEAFE;
      color: #1E40AF;
    }

    .pricing-mode-badge.badge-dynamic {
      background: #E0E7FF;
      color: #4F46E5;
    }

    .pricing-mode-badge.badge-discount {
      background: #DCFCE7;
      color: #166534;
    }

    .pricing-mode-badge.badge-premium {
      background: #FEF3C7;
      color: #92400E;
    }

    .amount-label,
    .price-label,
    .limits-label {
      font-size: 12px;
      color: #6B7280;
      font-weight: 500;
    }

    .amount-value,
    .price-value,
    .limits-value {
      font-size: 14px;
      color: #1F2937;
      font-weight: 600;
    }

    .listing-progress {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid;
      transition: all 0.3s ease;
    }

    /* Color themes based on percentage sold */
    .listing-progress.progress-good {
      background: linear-gradient(135deg, #F0FDF4, #DCFCE7);
      border-color: #BBF7D0;
    }

    .listing-progress.progress-moderate {
      background: linear-gradient(135deg, #FEFCE8, #FEF3C7);
      border-color: #FDE68A;
    }

    .listing-progress.progress-warning {
      background: linear-gradient(135deg, #FFF7ED, #FFEDD5);
      border-color: #FED7AA;
    }

    .listing-progress.progress-critical {
      background: linear-gradient(135deg, #FEF2F2, #FEE2E2);
      border-color: #FECACA;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .progress-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .progress-good .progress-label,
    .progress-good .progress-percentage {
      color: #166534;
    }

    .progress-moderate .progress-label,
    .progress-moderate .progress-percentage {
      color: #92400E;
    }

    .progress-warning .progress-label,
    .progress-warning .progress-percentage {
      color: #C2410C;
    }

    .progress-critical .progress-label,
    .progress-critical .progress-percentage {
      color: #991B1B;
    }

    .progress-percentage {
      font-size: 13px;
      color: #0369A1;
      font-weight: 700;
    }

    .progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 8px;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
      border-radius: 3px;
      position: relative;
    }

    .progress-fill.progress-good {
      background: linear-gradient(90deg, #10B981, #059669, #047857);
    }

    .progress-fill.progress-moderate {
      background: linear-gradient(90deg, #F59E0B, #D97706, #B45309);
    }

    .progress-fill.progress-warning {
      background: linear-gradient(90deg, #F97316, #EA580C, #C2410C);
    }

    .progress-fill.progress-critical {
      background: linear-gradient(90deg, #EF4444, #DC2626, #B91C1C);
    }

    .progress-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .progress-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }

    .progress-good .progress-details {
      color: #166534;
    }

    .progress-moderate .progress-details {
      color: #92400E;
    }

    .progress-warning .progress-details {
      color: #C2410C;
    }

    .progress-critical .progress-details {
      color: #991B1B;
    }

    .sold-amount {
      font-weight: 600;
    }

    .available-amount {
      font-weight: 500;
      opacity: 0.8;
    }
  `]
})
export class ListingCardComponent {
  @Input({ required: true }) ad!: Advertisement;
  @Output() cardClick = new EventEmitter<Advertisement>();

  onCardClick(): void {
    this.cardClick.emit(this.ad);
  }

  getStatusClass(status: AdvertisementStatus): string {
    switch (status) {
      case AdvertisementStatus.READY:
        return 'ready';
      case AdvertisementStatus.PENDING:
        return 'pending';
      case AdvertisementStatus.DRAFT:
        return 'draft';
      case AdvertisementStatus.DISABLED:
      case AdvertisementStatus.CLOSED:
        return 'disabled';
      default:
        return 'draft';
    }
  }

  getStatusLabel(status: AdvertisementStatus): string {
    switch (status) {
      case AdvertisementStatus.READY:
        return 'Ativo';
      case AdvertisementStatus.PENDING:
        return 'Pendente';
      case AdvertisementStatus.DRAFT:
        return 'Rascunho';
      case AdvertisementStatus.DISABLED:
        return 'Pausado';
      case AdvertisementStatus.CLOSED:
        return 'Fechado';
      case AdvertisementStatus.BANK_FAILED:
        return 'Erro Bancário';
      case AdvertisementStatus.DEPOSIT_FAILED:
        return 'Falha Depósito';
      case AdvertisementStatus.FINISHING:
        return 'Finalizando';
      default:
        return 'Desconhecido';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatPriceCurrency(priceCentsPerBtc: number): string {
    const priceReaisPerBtc = priceCentsPerBtc / 100;
    return this.formatCurrency(priceReaisPerBtc);
  }

  formatBTC(satoshis: number): string {
    const btc = satoshis / 100000000;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8
    }).format(btc);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  formatCentsToReais(cents: number): string {
    const reais = cents / 100;
    return this.formatCurrency(reais);
  }

  getProgressPercentage(): number {
    const total = this.ad.total_deposited;
    const available = this.ad.available_amount;
    const sold = total - available;

    if (total === 0) {
      return 0;
    }

    // Round to 1 decimal place to show small percentages like 0.1%, 0.5%, etc.
    const percentage = Math.round((sold / total) * 1000) / 10;
    return percentage;
  }

  getSoldAmount(): number {
    return this.ad.total_deposited - this.ad.available_amount;
  }

  getProgressColorClass(): string {
    const percentage = this.getProgressPercentage();
    if (percentage >= 91) return 'progress-critical'; // 91-100%: Red (nearly/completely sold)
    if (percentage >= 67) return 'progress-warning';  // 67-90%: Orange (low availability)
    if (percentage >= 34) return 'progress-moderate'; // 34-66%: Yellow (medium availability)
    return 'progress-good';                            // 0-33%: Green (plenty available)
  }

  // Pricing Mode Methods
  getPricingModeLabel(): string {
    if (this.ad.pricing_mode === 'fixed') {
      return 'Fixo';
    }
    const offset = this.ad.percentage_offset || 0;
    const sign = offset >= 0 ? '+' : '';
    return `${sign}${offset.toFixed(2)}%`;
  }

  getPricingModeBadgeClass(): string {
    if (this.ad.pricing_mode === 'fixed') {
      return 'badge-fixed';
    }
    const offset = this.ad.percentage_offset || 0;
    if (offset < 0) return 'badge-discount';  // Discount
    if (offset > 2) return 'badge-premium';    // High premium
    return 'badge-dynamic';                     // Normal
  }

  getPriceDisplay(): string {
    if (this.ad.pricing_mode === 'fixed') {
      return this.formatPriceCurrency(this.ad.price!);
    }
    return 'Dinâmico';
  }
}
