import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BitcoinListing } from '../../interfaces/transaction.interface';

@Component({
  selector: 'app-offer-card',
  standalone: true,
  imports: [],
  template: `
    <div class="offer-card">
      @if (isLowestPrice) {
        <div class="best-price-badge">
          <span>Melhor Preço</span>
        </div>
      }

      <!-- Price Display -->
      <div class="price-display">
        <div class="bitcoin-price">
          <span class="price-label">Bitcoin a</span>
          <span class="price-value">R$ {{ formatCurrency(listing.pricePerBtc) }}</span>
        </div>

        @if (currentAmount > 0) {
          <div class="you-get">
            <span class="you-get-label">Você recebe:</span>
            <span class="bitcoin-amount">{{ formatBitcoinAmount(calculateBitcoinAmount()) }}</span>
            <span class="bitcoin-symbol">BTC</span>
          </div>
          <div class="total-cost">
            <span class="total-label">Total:</span>
            <span class="total-value">R$ {{ formatCurrency(currentAmount) }}</span>
          </div>
        }
      </div>

      <!-- Buy Button -->
      <div class="buy-action">
        @if (currentAmount > 0 && canBuyWithAmount()) {
          <button
            class="btn btn-success btn-lg buy-btn"
            (click)="onBuyClick()"
            [disabled]="isProcessing"
          >
            @if (isProcessing) {
              <div class="loading-spinner-sm"></div>
              Processando...
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              </svg>
              Comprar com PIX
            }
          </button>
        } @else if (currentAmount === 0) {
          <button class="btn btn-outline btn-lg" disabled>
            Escolha um valor acima
          </button>
        } @else {
          <button class="btn btn-outline btn-lg" disabled>
            Valor mín: R$ {{ formatCurrency(listing.minPurchase) }}
          </button>
        }
      </div>

      <!-- Limits Display -->
      <div class="limits-info">
        <div class="limit-item">
          <span class="limit-label">Mínimo:</span>
          <span class="limit-value">R$ {{ formatCurrency(listing.minPurchase) }}</span>
        </div>
        <div class="limit-item">
          <span class="limit-label">Máximo:</span>
          <span class="limit-value">R$ {{ formatCurrency(effectiveMaxPurchase) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .offer-card {
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      padding: 24px;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    .offer-card:hover {
      border-color: #1E40AF;
      box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1);
      transform: translateY(-2px);
    }

    .best-price-badge {
      position: absolute;
      top: 16px;
      right: 16px;
      background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
      color: white;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 4px 6px -1px rgb(245 158 11 / 0.4);
      z-index: 1;
    }

    /* Price Display */
    .price-display {
      margin-bottom: 24px;
      padding: 16px;
      background: #F9FAFB;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
    }

    .bitcoin-price {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 12px;
    }

    .price-label {
      font-size: 14px;
      color: #6B7280;
      font-weight: 500;
    }

    .price-value {
      font-size: 20px;
      font-weight: 700;
      color: #F59E0B;
    }

    .you-get {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding: 12px;
      background: #ECFDF5;
      border-radius: 8px;
      border: 1px solid #A7F3D0;
    }

    .you-get-label {
      font-size: 14px;
      color: #6B7280;
    }

    .bitcoin-amount {
      font-size: 18px;
      font-weight: 700;
      color: #059669;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .bitcoin-symbol {
      font-size: 14px;
      color: #059669;
      font-weight: 600;
    }

    .total-cost {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
      border-top: 1px solid #E5E7EB;
    }

    .total-label {
      font-size: 14px;
      color: #6B7280;
    }

    .total-value {
      font-size: 18px;
      font-weight: 700;
      color: #1F2937;
    }

    /* Buy Action */
    .buy-action {
      margin-bottom: 16px;
    }

    .buy-btn {
      width: 100%;
      font-weight: 700;
      border-radius: 12px;
      font-size: 16px;
      background: #16A34A !important;
      color: #FFFFFF !important;
      border: 2px solid #16A34A !important;
      box-shadow: 0 4px 12px 0 rgb(22 163 74 / 0.4);
      text-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .buy-btn:hover:not(:disabled) {
      background: #15803D !important;
      border-color: #15803D !important;
      color: #FFFFFF !important;
      box-shadow: 0 6px 16px 0 rgb(21 128 61 / 0.5);
      transform: translateY(-2px);
    }

    .buy-btn:disabled {
      background: #9CA3AF !important;
      border-color: #9CA3AF !important;
      color: #FFFFFF !important;
      opacity: 0.7;
      transform: none;
      box-shadow: none;
      cursor: not-allowed;
    }

    .btn-outline {
      width: 100%;
      padding: 16px;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      background: #FFFFFF;
      color: #6B7280;
      font-size: 16px;
      font-weight: 600;
      cursor: not-allowed;
    }

    .loading-spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Limits Info */
    .limits-info {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 12px;
      background: #F9FAFB;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
    }

    .limit-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .limit-label {
      font-size: 12px;
      color: #9CA3AF;
      font-weight: 500;
    }

    .limit-value {
      font-size: 14px;
      color: #1F2937;
      font-weight: 600;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .offer-card {
        padding: 16px;
      }

      .best-price-badge {
        top: 12px;
        right: 12px;
        padding: 5px 10px;
        font-size: 11px;
      }
    }

    @media (max-width: 480px) {
      .limits-info {
        flex-direction: column;
        gap: 8px;
      }

      .limit-item {
        flex-direction: row;
        justify-content: space-between;
      }

      .bitcoin-price {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .you-get {
        flex-wrap: wrap;
      }
    }
  `]
})
export class OfferCardComponent {
  @Input({ required: true }) listing!: BitcoinListing;
  @Input() currentAmount: number = 0;
  @Input() isLowestPrice: boolean = false;
  @Input() isProcessing: boolean = false;
  @Input() effectiveMaxPurchase: number = 0;
  @Output() buyClick = new EventEmitter<BitcoinListing>();

  onBuyClick(): void {
    this.buyClick.emit(this.listing);
  }

  calculateBitcoinAmount(): number {
    return this.currentAmount / this.listing.pricePerBtc;
  }

  canBuyWithAmount(): boolean {
    return this.currentAmount >= this.listing.minPurchase && 
           this.currentAmount <= this.effectiveMaxPurchase;
  }

  formatBitcoinAmount(amount: number): string {
    return amount.toFixed(8);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
