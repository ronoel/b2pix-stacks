import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TransactionService } from '../../services/transaction.service';
import { UserService } from '../../services/user.service';
import { LoadingService } from '../../services/loading.service';
import { AdvertisementService } from '../../shared/api/advertisement.service';
import { BuyService } from '../../shared/api/buy.service';
import { InvitesService } from '../../shared/api/invites.service';
import { QuoteService } from '../../shared/api/quote.service';
import { Advertisement } from '../../shared/models/advertisement.model';
import { Buy } from '../../shared/models/buy.model';
import { BitcoinListing } from '../../interfaces/transaction.interface';
import { PricingUtils } from '../../shared/utils/pricing.utils';

interface PriceRange {
  advertisement: BitcoinListing;
  minAmount: number;
  maxAmount: number;
  pricePerBtc: number;
}

interface ExtendedBitcoinListing extends BitcoinListing {
  _advertisement?: Advertisement; // Store original advertisement for reference
}

@Component({
  selector: 'app-buy',
  standalone: true,
  imports: [],
  template: `
    <div class="buy-page">
      <!-- Main Content -->
      <div class="container">
        <!-- Simple Header -->
        <div class="page-header">
          <button class="btn btn-ghost" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Voltar
          </button>
          <div class="header-content">
            <h1 class="page-title">Comprar Bitcoin</h1>
            <p class="page-subtitle">Escolha uma oferta e compre com PIX instantâneo</p>
          </div>
        </div>

        <!-- Quick Buy Amount Selector -->
        <div class="quick-buy-section">
          <h2 class="section-title">Quanto você quer comprar?</h2>
          <div class="amount-selector">
            <div class="quick-amounts">
              <button
                class="quick-amount-btn"
                [class.active]="selectedQuickAmount() === 50"
                (click)="selectQuickAmount(50)"
              >
                R$ 50
              </button>
              <button
                class="quick-amount-btn"
                [class.active]="selectedQuickAmount() === 250"
                (click)="selectQuickAmount(250)"
              >
                R$ 250
              </button>
              <button
                class="quick-amount-btn"
                [class.active]="selectedQuickAmount() === 500"
                (click)="selectQuickAmount(500)"
              >
                R$ 500
              </button>
              <button
                class="quick-amount-btn"
                [class.active]="selectedQuickAmount() === 1000"
                (click)="selectQuickAmount(1000)"
              >
                R$ 1.000
              </button>
            </div>
            <div class="custom-amount">
              <label for="customAmount">Ou digite o valor:</label>
              <div class="amount-input-group">
                <span class="currency-symbol">R$</span>
                <input
                  type="number"
                  id="customAmount"
                  [value]="customAmount()"
                  (input)="onCustomAmountChange(+$any($event.target).value)"
                  placeholder="0,00"
                  class="amount-input"
                  min="50"
                  max="10000"
                  step="0.01"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Bitcoin Price Ranges -->
        <div class="offers-section">
          <div class="section-header">
            <h2 class="section-title">Cotações Disponíveis</h2>
            <button class="btn btn-outline btn-sm" (click)="loadListings()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Atualizar
            </button>
          </div>

          @if (isLoadingListings()) {
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <p>Buscando as melhores ofertas...</p>
            </div>
          } @else if (priceRanges().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 8V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h3>Nenhuma oferta disponível</h3>
              <p>Não há ofertas de Bitcoin no momento. Tente novamente mais tarde.</p>
              <button class="btn btn-primary" (click)="loadListings()">Tentar Novamente</button>
            </div>
          } @else {
            <div class="price-ranges-container">
              <div class="price-ranges-list">
                @for (range of priceRanges(); track $index) {
                  <div
                    class="price-range-card"
                    [class.active]="isRangeApplicable(range)"
                  >
                    <div class="range-header">
                      <div class="range-amount">
                        <span class="range-label">Para compras de:</span>
                        <span class="range-value">
                          R$ {{ formatCurrency(range.minAmount) }} - R$ {{ formatCurrency(range.maxAmount) }}
                        </span>
                      </div>
                      @if (isRangeApplicable(range)) {
                        <div class="active-badge">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                          </svg>
                          Melhor preço
                        </div>
                      }
                    </div>

                    <div class="range-price">
                      <span class="price-label">Preço do Bitcoin:</span>
                      <span class="price-value">R$ {{ formatCurrency(range.pricePerBtc) }}/BTC</span>
                    </div>

                    @if (isRangeApplicable(range)) {
                      <div class="range-details">
                        <div class="detail-item">
                          <span class="detail-label">Você está comprando:</span>
                          <span class="detail-value">R$ {{ formatCurrency(getCurrentAmount()) }}</span>
                        </div>
                        <div class="detail-item">
                          <span class="detail-label">Você receberá:</span>
                          <span class="detail-value btc-amount">
                            {{ formatBitcoinAmount(calculateBitcoinAmount(range.advertisement, getCurrentAmount())) }} BTC
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              @if (getCurrentAmount() > 0 && getBestAdvertisementForAmount()) {
                <div class="buy-action-container">
                  <button
                    class="btn btn-success btn-lg buy-btn"
                    (click)="buyInstant(getBestAdvertisementForAmount()!)"
                    [disabled]="isProcessingPurchase()"
                  >
                    @if (isProcessingPurchase()) {
                      <div class="loading-spinner-sm"></div>
                      Processando...
                    } @else {
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      Comprar Bitcoin com PIX
                    }
                  </button>
                </div>
              } @else if (getCurrentAmount() > 0) {
                <div class="buy-action-container">
                  <div class="info-message">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>Nenhuma oferta disponível para este valor. Tente outro valor.</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Purchase Confirmation Modal -->
        @if (showConfirmationModal()) {
          <div class="modal-overlay" (click)="closeConfirmationModal()">
            <div class="confirmation-modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3>Confirmar Compra</h3>
                <button class="close-btn" (click)="closeConfirmationModal()">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>

              @if (selectedListing()) {
                <div class="modal-content">
                  <div class="purchase-summary">
                    <div class="summary-item">
                      <span class="label">Você está comprando:</span>
                      <span class="value">{{ formatBitcoinAmount(calculateBitcoinAmount(selectedListing()!, getCurrentAmount())) }} BTC</span>
                    </div>
                    <div class="summary-item">
                      <span class="label">Por:</span>
                      <span class="value strong">R$ {{ formatCurrency(getCurrentAmount()) }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="label">Taxa de câmbio:</span>
                      <span class="value">R$ {{ formatCurrency(selectedListing()!.pricePerBtc) }}/BTC</span>
                    </div>
                  </div>

                  <div class="important-instructions">
                    <div class="instruction-header">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <h4>Importante!</h4>
                    </div>
                    <div class="instruction-content">
                      <p>Após realizar o pagamento via PIX, você precisará informar os <strong>3 últimos caracteres</strong> do ID da transação que aparecem no comprovante.</p>
                      <div class="instruction-example">
                        <span class="example-label">Exemplo:</span>
                        <span class="example-text">Se o ID for E000-12A9Z7, informe <span class="highlight-chars">9Z7</span></span>
                      </div>
                    </div>
                  </div>

                  <div class="payment-info">
                    <div class="info-badge info-badge-blue">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <span>Certifique-se de ter saldo suficiente para realizar o PIX de <strong>R$ {{ formatCurrency(getCurrentAmount()) }}</strong></span>
                    </div>
                  </div>

                  <div class="confirmation-checkbox">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="userConfirmedInstructions()"
                        (change)="toggleInstructionConfirmation($any($event.target).checked)"
                      >
                      <span class="checkbox-custom"></span>
                      <span class="checkbox-text">Li e estou ciente das instruções. Tenho saldo para realizar o PIX.</span>
                    </label>
                  </div>

                  <div class="modal-actions">
                    <button class="btn btn-outline" (click)="closeConfirmationModal()">
                      Cancelar
                    </button>
                    <button
                      class="btn btn-success btn-lg confirm-purchase-btn"
                      (click)="confirmPurchase()"
                      [disabled]="isProcessingPurchase() || !userConfirmedInstructions()"
                    >
                      @if (isProcessingPurchase()) {
                        <div class="loading-spinner-sm"></div>
                        Processando...
                      } @else {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        Confirmar Compra
                      }
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .buy-page {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 0;
    }

    /* Quick Buy Section */
    .quick-buy-section {
      margin-bottom: 32px;
      padding: 24px;
      background: #FFFFFF;
      border-radius: 16px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .section-title { text-align: center; }

    .quick-amounts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .quick-amount-btn {
      padding: 16px 24px;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      background: #FFFFFF;
      color: #1F2937;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .quick-amount-btn:hover {
      border-color: #1E40AF;
      background: #EFF6FF;
    }

    .quick-amount-btn.active {
      border-color: #1E40AF;
      background: #1E40AF;
      color: white;
      box-shadow: 0 10px 15px -3px rgb(30 64 175 / 0.1);
    }

    .custom-amount {
      padding-top: 24px;
      border-top: 1px solid #E5E7EB;
    }

    .custom-amount label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #1F2937;
      margin-bottom: 12px;
    }

    .amount-input-group {
      display: flex;
      align-items: center;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      overflow: hidden;
      transition: border-color 0.2s ease;
      max-width: 300px;
    }

    .amount-input-group:focus-within {
      border-color: #1E40AF;
      box-shadow: 0 0 0 3px #EFF6FF;
    }

    .currency-symbol {
      padding: 16px;
      background: #F9FAFB;
      color: #6B7280;
      font-weight: 500;
      border-right: 1px solid #E5E7EB;
    }

    .amount-input {
      flex: 1;
      padding: 16px;
      border: none;
      background: #FFFFFF;
      color: #1F2937;
      font-size: 16px;
      font-weight: 500;
      outline: none;
    }

    /* Offers Section */
    .offers-section { margin-bottom: 32px; }

    .price-ranges-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .price-ranges-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .price-range-card {
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      padding: 20px;
      transition: all 0.3s ease;
    }

    .price-range-card.active {
      border-color: #16A34A;
      background: #F0FDF4;
      box-shadow: 0 4px 12px 0 rgb(22 163 74 / 0.15);
      transform: scale(1.02);
    }

    .range-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      gap: 16px;
    }

    .range-amount {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .range-label {
      font-size: 12px;
      font-weight: 500;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .range-value {
      font-size: 18px;
      font-weight: 700;
      color: #1F2937;
    }

    .active-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: linear-gradient(135deg, #16A34A 0%, #15803D 100%);
      color: white;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 4px 6px -1px rgb(22 163 74 / 0.4);
      white-space: nowrap;
    }

    .active-badge svg {
      width: 14px;
      height: 14px;
    }

    .range-price {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 16px;
      background: #F9FAFB;
      border-radius: 12px;
      margin-bottom: 12px;
    }

    .price-range-card.active .range-price {
      background: #DCFCE7;
      border: 1px solid #BBF7D0;
    }

    .price-label {
      font-size: 13px;
      font-weight: 500;
      color: #6B7280;
    }

    .price-value {
      font-size: 24px;
      font-weight: 700;
      color: #F59E0B;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .range-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: #FFFFFF;
      border-radius: 12px;
      border: 2px solid #BBF7D0;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-label {
      font-size: 14px;
      color: #6B7280;
      font-weight: 500;
    }

    .detail-value {
      font-size: 16px;
      font-weight: 700;
      color: #1F2937;
    }

    .detail-value.btc-amount {
      color: #16A34A;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .buy-action-container {
      position: sticky;
      bottom: 0;
      padding: 20px;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      box-shadow: 0 -4px 12px 0 rgb(0 0 0 / 0.05);
    }

    .buy-btn {
      width: 100%;
      padding: 18px 24px;
      font-size: 18px;
      font-weight: 700;
      border-radius: 12px;
      background: #16A34A !important;
      color: #FFFFFF !important;
      border: 2px solid #16A34A !important;
      box-shadow: 0 4px 12px 0 rgb(22 163 74 / 0.4);
      text-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .buy-btn:hover:not(:disabled) {
      background: #15803D !important;
      border-color: #15803D !important;
      box-shadow: 0 6px 16px 0 rgb(21 128 61 / 0.5);
      transform: translateY(-2px);
    }

    .buy-btn:disabled {
      background: #9CA3AF !important;
      border-color: #9CA3AF !important;
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .loading-spinner-sm {
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .info-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #FEF3C7;
      border-radius: 12px;
      border: 2px solid #FCD34D;
      color: #92400E;
      font-size: 14px;
      font-weight: 500;
    }

    .info-message svg {
      flex-shrink: 0;
      color: #D97706;
    }

    .empty-state {
      background: #FFFFFF;
      border-radius: 16px;
      border: 2px dashed #E5E7EB;
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

    /* Confirmation Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .confirmation-modal {
      background: #FFFFFF;
      border-radius: 24px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      border-bottom: 1px solid #E5E7EB;
    }

    .modal-header h3 {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: #9CA3AF;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: #F9FAFB;
      color: #1F2937;
    }

    .modal-content {
      padding: 24px;
    }

    .purchase-summary {
      margin-bottom: 24px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #E5E7EB;
    }

    .summary-item:last-child {
      border-bottom: none;
    }

    .summary-item .label {
      font-size: 14px;
      color: #6B7280;
    }

    .summary-item .value {
      font-size: 16px;
      color: #1F2937;
      font-weight: 500;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .summary-item .value.strong {
      font-size: 18px;
      font-weight: 700;
      color: #F59E0B;
    }

    .important-instructions {
      margin-bottom: 24px;
      padding: 20px;
      background: #FEF3C7;
      border: 2px solid #FCD34D;
      border-radius: 12px;
    }

    .instruction-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .instruction-header svg {
      color: #D97706;
      flex-shrink: 0;
    }

    .instruction-header h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #92400E;
    }

    .instruction-content p {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #78350F;
      line-height: 1.5;
    }

    .instruction-example {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px;
      background: #FFFBEB;
      border-radius: 8px;
      border: 1px solid #FDE68A;
    }

    .example-label {
      font-size: 12px;
      font-weight: 600;
      color: #92400E;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .example-text {
      font-size: 13px;
      color: #78350F;
    }

    .highlight-chars {
      background: #F59E0B;
      color: #FFFFFF;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      letter-spacing: 1px;
    }

    .payment-info {
      margin-bottom: 24px;
    }

    .info-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #EFF6FF;
      border-radius: 12px;
      border: 1px solid #BFDBFE;
      font-size: 14px;
      color: #1F2937;
    }

    .info-badge svg {
      color: #1E40AF;
      flex-shrink: 0;
    }

    .info-badge-blue {
      background: #EFF6FF;
      border-color: #BFDBFE;
    }

    .info-badge-blue svg {
      color: #1E40AF;
    }

    .confirmation-checkbox {
      margin-bottom: 24px;
      padding: 16px;
      background: #F9FAFB;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      user-select: none;
    }

    .checkbox-label input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .checkbox-custom {
      width: 20px;
      height: 20px;
      min-width: 20px;
      min-height: 20px;
      border: 2px solid #D1D5DB;
      border-radius: 6px;
      background: #FFFFFF;
      position: relative;
      transition: all 0.2s ease;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .checkbox-custom:hover {
      border-color: #16A34A;
    }

    .checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
      background: #16A34A;
      border-color: #16A34A;
    }

    .checkbox-label input[type="checkbox"]:checked + .checkbox-custom::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 6px;
      width: 5px;
      height: 10px;
      border: solid #FFFFFF;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .checkbox-text {
      flex: 1;
      font-size: 14px;
      color: #374151;
      line-height: 1.5;
      font-weight: 500;
    }

    .modal-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
    }

    .confirm-purchase-btn {
      background: #16A34A !important;
      color: #FFFFFF !important;
      border: 2px solid #16A34A !important;
      font-weight: 700;
      box-shadow: 0 4px 12px 0 rgb(22 163 74 / 0.4);
      text-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
    }

    .confirm-purchase-btn:hover:not(:disabled) {
      background: #15803D !important;
      border-color: #15803D !important;
      color: #FFFFFF !important;
      box-shadow: 0 6px 16px 0 rgb(21 128 61 / 0.5);
      transform: translateY(-1px);
    }

    .confirm-purchase-btn:disabled {
      background: #9CA3AF !important;
      border-color: #9CA3AF !important;
      color: #FFFFFF !important;
      opacity: 0.7;
      transform: none;
      box-shadow: none;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .quick-amounts {
        grid-template-columns: repeat(2, 1fr);
      }

      .range-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .active-badge {
        align-self: flex-start;
      }

      .detail-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .modal-actions {
        flex-direction: column;
      }

      .confirmation-modal {
        margin: 8px;
        max-height: calc(100vh - 16px);
      }

      .buy-btn {
        font-size: 16px;
        padding: 16px 20px;
      }
    }

    @media (max-width: 480px) {
      .quick-amounts {
        grid-template-columns: 1fr;
      }

      .range-value {
        font-size: 16px;
      }

      .price-value {
        font-size: 20px;
      }

      .price-range-card {
        padding: 16px;
      }

      .price-range-card.active {
        transform: scale(1.01);
      }
    }
  `]
})
export class BuyComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  protected transactionService = inject(TransactionService);
  protected userService = inject(UserService);
  protected loadingService = inject(LoadingService);
  private advertisementService = inject(AdvertisementService);
  private buyService = inject(BuyService);
  private invitesService = inject(InvitesService);
  private quoteService = inject(QuoteService);

  // Core signals
  listings = signal<ExtendedBitcoinListing[]>([]);
  selectedListing = signal<ExtendedBitcoinListing | null>(null);
  isLoadingListings = signal(false);

  // Simplified purchase flow
  selectedQuickAmount = signal<number>(0);
  customAmount = signal<number>(0);
  showConfirmationModal = signal<boolean>(false);
  isProcessingPurchase = signal<boolean>(false);
  userConfirmedInstructions = signal<boolean>(false);

  // Buy record from API
  buyRecord = signal<Buy | null>(null);

  // Price ranges for the new UX
  priceRanges = signal<PriceRange[]>([]);

  // Quote polling (silent - for dynamic pricing)
  currentQuotePrice = signal<number | null>(null);
  private quoteSubscription?: Subscription;
  private hasReceivedFirstQuote = false;

  ngOnInit() {
    // Show loading state while waiting for first quote
    this.isLoadingListings.set(true);
    // Start quote polling - listings will load after first quote arrives
    this.startSilentQuotePolling();
  }

  /**
   * Start silent 30-second quote polling (no UI indication to buyers)
   * Listings are loaded after the first quote arrives to ensure dynamic pricing works correctly
   */
  private startSilentQuotePolling(): void {
    this.quoteSubscription = this.quoteService.getBtcPriceStream().subscribe({
      next: (quote) => {
        const priceInCents = parseInt(quote.price, 10);
        this.currentQuotePrice.set(priceInCents);

        // Load listings after first quote arrives (ensures dynamic pricing has the quote available)
        if (!this.hasReceivedFirstQuote) {
          this.hasReceivedFirstQuote = true;
          this.loadListings();
        } else {
          // Subsequent quotes just update dynamic prices silently
          this.updateDynamicPrices();
        }
      },
      error: (err) => {
        // Silent failure - just keep last known prices
        console.error('Quote polling error (silent):', err);
      }
    });
  }

  /**
   * Update only dynamic advertisement prices (silent background update)
   */
  private updateDynamicPrices(): void {
    const quote = this.currentQuotePrice();
    if (!quote) return;

    const updatedListings = this.listings().map(listing => {
      const ad = listing._advertisement;
      if (!ad) return listing;

      // Only update if dynamic mode
      if (ad.pricing_mode === 'dynamic') {
        const newPrice = PricingUtils.getEffectivePrice(ad, quote);
        if (newPrice) {
          // Update the pricePerBtc in the listing (convert cents to BRL)
          return { ...listing, pricePerBtc: Math.floor(newPrice / 100) };
        }
      }

      return listing;
    });

    this.listings.set(updatedListings);

    // Recalculate price ranges with updated prices
    this.calculateAndSetPriceRanges(updatedListings);
  }

  loadListings() {
    this.isLoadingListings.set(true);

    // Get ready advertisements with active_only filter
    this.advertisementService.getReadyAdvertisements(true, 1, 100).subscribe({
      next: (response: any) => {
        try {
          const mappedListings = this.mapAdvertisementsToListings(response.data);
          this.listings.set(mappedListings);
          this.calculateAndSetPriceRanges(mappedListings);
          this.isLoadingListings.set(false);
        } catch (error) {
          console.error('Error mapping advertisements:', error);
          this.listings.set([]);
          this.priceRanges.set([]);
          this.isLoadingListings.set(false);
        }
      },
      error: (error: any) => {
        console.error('Error loading advertisements:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url
        });
        this.listings.set([]);
        this.priceRanges.set([]);
        this.isLoadingListings.set(false);
      },
      complete: () => {
      }
    });
  }

  /**
   * Maps Advertisement objects to BitcoinListing objects for compatibility
   * Handles both fixed and dynamic pricing
   */
  private mapAdvertisementsToListings(advertisements: Advertisement[]): ExtendedBitcoinListing[] {
    const currentQuote = this.currentQuotePrice();

    return advertisements.map(ad => {
      const availableAmountSats = ad.available_amount;

      // Calculate effective price in cents
      let priceCentsPerBtc: number;

      if (ad.pricing_mode === 'fixed') {
        priceCentsPerBtc = ad.price!;
      } else {
        // Dynamic pricing
        const effectivePrice = PricingUtils.getEffectivePrice(ad, currentQuote);
        if (effectivePrice) {
          priceCentsPerBtc = effectivePrice;
        } else {
          // Fallback if quote not available yet - skip this ad or use 0
          priceCentsPerBtc = 0;
        }
      }

      // Convert from cents per Bitcoin to BRL per Bitcoin for display
      // price_cents_per_btc / 100_cents_per_real = price_reais_per_btc
      const pricePerBtc = Math.floor(priceCentsPerBtc / 100);

      // Convert min/max amounts from cents to reais
      const minPurchaseReais = ad.min_amount / 100;
      const maxPurchaseReais = ad.max_amount / 100;

      const mapped: ExtendedBitcoinListing = {
        id: ad.id,
        sellerId: ad.seller_address,
        sellerName: this.formatSellerName(ad.seller_address),
        pricePerBtc: pricePerBtc, // This is now in BRL per BTC for display
        availableAmount: Math.max(availableAmountSats, 1000), // Ensure minimum viable amount in sats
        minPurchase: minPurchaseReais, // Use the min_amount from API (converted from cents)
        maxPurchase: maxPurchaseReais, // Use the max_amount from API (converted from cents)
        pixKey: 'PIX disponível', // Placeholder since PIX key isn't in Advertisement model
        createdAt: new Date(ad.created_at),
        _advertisement: ad // Store original advertisement for reference
      };

      return mapped;
    }).filter(listing => listing.pricePerBtc > 0); // Filter out ads without valid price
  }

  /**
   * Formats seller address to a more user-friendly name
   */
  private formatSellerName(address: string): string {
    return `Vendedor ${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Calculates price ranges where each advertisement is the best option
   * This creates a simplified view showing the best price for each amount range
   */
  private calculateAndSetPriceRanges(listings: BitcoinListing[]): void {
    if (listings.length === 0) {
      this.priceRanges.set([]);
      return;
    }

    // Collect all breakpoints (min and max values from all listings)
    const breakpoints = new Set<number>();
    for (const listing of listings) {
      breakpoints.add(listing.minPurchase);
      breakpoints.add(listing.maxPurchase);
    }

    const sortedBreakpoints = Array.from(breakpoints).sort((a, b) => a - b);
    const ranges: PriceRange[] = [];

    // For each segment between breakpoints, find the best price
    for (let i = 0; i < sortedBreakpoints.length - 1; i++) {
      const rangeStart = sortedBreakpoints[i];
      const rangeEnd = sortedBreakpoints[i + 1];
      const midPoint = (rangeStart + rangeEnd) / 2;

      // Find all listings that cover this range
      const applicableListings = listings.filter(l =>
        l.minPurchase <= midPoint && l.maxPurchase >= midPoint
      );

      if (applicableListings.length > 0) {
        // Get the one with the best (lowest) price
        const bestListing = applicableListings.reduce((best, current) =>
          current.pricePerBtc < best.pricePerBtc ? current : best
        );

        // Check if we can merge with the previous range
        const lastRange = ranges[ranges.length - 1];
        if (lastRange && lastRange.advertisement.id === bestListing.id) {
          // Extend the previous range
          lastRange.maxAmount = rangeEnd;
        } else {
          // Add new range
          ranges.push({
            advertisement: bestListing,
            minAmount: rangeStart,
            maxAmount: rangeEnd,
            pricePerBtc: bestListing.pricePerBtc
          });
        }
      }
    }

    this.priceRanges.set(ranges);
  }

  /**
   * Gets the best advertisement for the current amount
   */
  getBestAdvertisementForAmount(): BitcoinListing | null {
    const amount = this.getCurrentAmount();
    if (amount <= 0) return null;

    const applicableRange = this.priceRanges().find(
      range => amount >= range.minAmount && amount <= range.maxAmount
    );

    return applicableRange ? applicableRange.advertisement : null;
  }

  /**
   * Checks if a price range is applicable for the current amount
   */
  isRangeApplicable(range: PriceRange): boolean {
    const amount = this.getCurrentAmount();
    return amount > 0 && amount >= range.minAmount && amount <= range.maxAmount;
  }

  // New simplified interface methods
  selectQuickAmount(amount: number) {
    this.selectedQuickAmount.set(amount);
    this.customAmount.set(amount);
  }

  onCustomAmountChange(amount: number) {
    this.customAmount.set(amount);
    this.selectedQuickAmount.set(0); // Clear quick amount selection
  }

  getCurrentAmount(): number {
    return this.customAmount();
  }

  calculateBitcoinAmount(listing: BitcoinListing, amountBrl: number): number {
    return amountBrl / listing.pricePerBtc;
  }

  formatBitcoinAmount(amount: number): string {
    return amount.toFixed(8);
  }

  isLowestPrice(listing: BitcoinListing): boolean {
    const allListings = this.listings();
    if (allListings.length === 0) return false;
    const lowestPrice = Math.min(...allListings.map((l: BitcoinListing) => l.pricePerBtc));
    return listing.pricePerBtc === lowestPrice;
  }

  buyInstant(listing: BitcoinListing) {
    // Check invite status before allowing purchase
    this.loadingService.show('Verificando convite...');

    this.invitesService.getWalletInvite().subscribe({
      next: (invite) => {
        this.loadingService.hide();

        if (!invite) {
          // No invite found, redirect to invite validation with returnUrl
          this.router.navigate(['/invite-validation'], {
            queryParams: { returnUrl: '/buy' }
          });
          return;
        }

        if (invite.status === 'blocked') {
          this.router.navigate(['/blocked']);
          return;
        }

        if (invite.status !== 'claimed') {
          this.router.navigate(['/invite-validation'], {
            queryParams: { returnUrl: '/buy' }
          });
          return;
        }

        // Invite is valid, proceed with purchase
        this.selectedListing.set(listing);
        this.showConfirmationModal.set(true);
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Error checking invite status:', error);
        this.router.navigate(['/invite-validation'], {
          queryParams: { returnUrl: '/buy' }
        });
      }
    });
  }

  closeConfirmationModal() {
    this.showConfirmationModal.set(false);
    this.selectedListing.set(null);
    this.userConfirmedInstructions.set(false);
  }

  toggleInstructionConfirmation(checked: boolean) {
    this.userConfirmedInstructions.set(checked);
  }

  confirmPurchase() {
    const listing = this.selectedListing();
    const amount = this.getCurrentAmount();

    if (!listing || amount <= 0) return;

    // Get the original advertisement to determine pricing mode
    const advertisement = listing._advertisement;
    if (!advertisement) {
      alert('Erro: informações do anúncio não encontradas.');
      return;
    }

    // Calculate quoted price in cents based on pricing mode
    let quotedPriceCents: number;

    if (advertisement.pricing_mode === 'fixed') {
      quotedPriceCents = advertisement.price!;
    } else {
      // Dynamic pricing - use current quote
      const currentQuote = this.currentQuotePrice();
      if (!currentQuote) {
        alert('Cotação indisponível. Por favor, aguarde.');
        return;
      }
      const effectivePrice = PricingUtils.getEffectivePrice(advertisement, currentQuote);
      if (!effectivePrice) {
        alert('Não foi possível calcular o preço. Tente novamente.');
        return;
      }
      quotedPriceCents = effectivePrice;
    }

    this.isProcessingPurchase.set(true);
    this.loadingService.show('Iniciando compra...');

    // Calculate the total amount in cents for the API
    const payAmountCents = Math.round(amount * 100);

    this.buyService.startBuy(payAmountCents, listing.id, quotedPriceCents).subscribe({
      next: (buyResponse: any) => {
        this.buyRecord.set(buyResponse);
        this.isProcessingPurchase.set(false);
        this.loadingService.hide();
        this.showConfirmationModal.set(false);

        // Navigate to payment page
        this.router.navigate(['/buy', buyResponse.id]);
      },
      error: (error: any) => {
        console.error('Erro ao iniciar compra:', error);
        this.isProcessingPurchase.set(false);
        this.loadingService.hide();

        // Handle specific error cases
        if (error.message === 'PRICE_MISMATCH' || error.message === 'PRICE_TOO_LOW') {
          // Price changed - refresh listings
          this.loadListings();
          this.showConfirmationModal.set(false);
          alert('O preço mudou. Por favor, selecione novamente.');
        } else if (error.message === 'QUOTE_UNAVAILABLE') {
          alert('Sistema de cotação temporariamente indisponível. Tente novamente em alguns instantes.');
        } else if (error.message && error.message.includes('cancelada')) {
          // User cancelled signature - don't show error
          this.showConfirmationModal.set(false);
        } else {
          alert('Erro ao iniciar a compra. Tente novamente.');
        }
      }
    });
  }

  // Step 1 methods

  getTotalValue(): number {
    return this.getCurrentAmount();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Calculates the effective maximum purchase amount based on available satoshis
   */
  getEffectiveMaxPurchase(listing: BitcoinListing): number {
    // Calculate the maximum value possible based on available satoshis
    // availableAmount is now in satoshis, convert to BTC then to BRL
    const availableBtc = listing.availableAmount / Number(this.SATS_PER_BTC);
    const maxValueFromAvailability = availableBtc * listing.pricePerBtc;
    
    // Return the smaller of the two: listing max purchase or available value
    return Math.min(listing.maxPurchase, maxValueFromAvailability);
  }

  /**
   * Checks if the maximum purchase is limited by availability rather than listing limit
   */
  isMaxPurchaseLimitedByAvailability(listing: BitcoinListing): boolean {
    const availableBtc = listing.availableAmount / Number(this.SATS_PER_BTC);
    const maxValueFromAvailability = availableBtc * listing.pricePerBtc;
    return maxValueFromAvailability < listing.maxPurchase;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  // Constants for satoshi conversions
  readonly SATS_PER_BTC = 100000000n; // 100 million satoshis per bitcoin as BigInt

  ngOnDestroy() {
    // Unsubscribe from quote polling
    if (this.quoteSubscription) {
      this.quoteSubscription.unsubscribe();
    }
  }
}
