import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { BuyOrderService } from '../../shared/api/buy-order.service';
import { InvitesService } from '../../shared/api/invites.service';
import { QuoteService } from '../../shared/api/quote.service';

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
            <p class="page-subtitle">Escolha quanto você quer comprar e pague com PIX instantâneo</p>
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

        <!-- Bitcoin Estimate Display -->
        <div class="estimate-section">
          <div class="section-header">
            <h2 class="section-title">Estimativa de Compra</h2>
            @if (currentQuotePrice()) {
              <div class="btc-price-display">
                <span class="price-label">Preço BTC:</span>
                <span class="price-value">R$ {{ formatCurrency(currentQuotePrice()! / 100) }}</span>
              </div>
            }
          </div>

          @if (isLoadingQuote()) {
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <p>Buscando cotação...</p>
            </div>
          } @else if (getCurrentAmount() > 0 && currentQuotePrice()) {
            <div class="estimate-card">
              <div class="estimate-row">
                <span class="estimate-label">Você está comprando:</span>
                <span class="estimate-value">R$ {{ formatCurrency(getCurrentAmount()) }}</span>
              </div>
              <div class="estimate-row highlight">
                <span class="estimate-label">Você receberá (estimativa):</span>
                <span class="estimate-value btc">{{ formatBitcoinAmount(getEstimatedBitcoinAmount()) }} BTC</span>
              </div>
              <div class="estimate-row">
                <span class="estimate-label">Em satoshis:</span>
                <span class="estimate-value sats">{{ formatSats(getEstimatedBitcoinAmountInSats().toString()) }} sats</span>
              </div>
              <div class="estimate-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>O valor final em BTC será calculado no momento da confirmação do pagamento</span>
              </div>
            </div>

            <div class="buy-action-container">
              <button
                class="btn btn-success btn-lg buy-btn"
                (click)="startBuyProcess()"
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
            <div class="info-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Digite um valor para ver a estimativa</span>
            </div>
          } @else {
            <div class="info-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Selecione um valor para começar</span>
            </div>
          }
        </div>

        <!-- Purchase Confirmation Modal - Step by Step (keeping same 4-step flow) -->
        @if (showConfirmationModal()) {
          <div class="modal-overlay">
            <div class="confirmation-modal" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <div class="header-content">
                  <h3>Preparação para Compra</h3>
                  <div class="step-indicator">Passo {{ currentModalStep() }}/4</div>
                </div>
                <button class="close-btn" (click)="closeConfirmationModal()">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>

              <div class="modal-content">
                <!-- Step 1: Open Banking App -->
                @if (currentModalStep() === 1) {
                  <div class="step-content">
                    <div class="step-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <h4 class="step-title">Abra seu aplicativo do banco</h4>
                    <p class="step-description">Para agilizar o processo, abra agora seu aplicativo bancário</p>

                    <div class="step-checkbox">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [checked]="step1Confirmed()"
                          (change)="toggleStep1($any($event.target).checked)"
                        >
                        <span class="checkbox-custom"></span>
                        <span class="checkbox-text">Abri meu aplicativo bancário e estou pronto para fazer o PIX</span>
                      </label>
                    </div>
                  </div>
                }

                <!-- Step 2: Confirm Balance -->
                @if (currentModalStep() === 2) {
                  <div class="step-content">
                    <div class="step-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <h4 class="step-title">Confirme seu saldo</h4>
                    <div class="amount-highlight">
                      <span class="amount-label">Você precisa ter disponível:</span>
                      <span class="amount-value">R$ {{ formatCurrency(getCurrentAmount()) }}</span>
                    </div>

                    <div class="step-checkbox">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [checked]="step2Confirmed()"
                          (change)="toggleStep2($any($event.target).checked)"
                        >
                        <span class="checkbox-custom"></span>
                        <span class="checkbox-text">Confirmei que tenho saldo disponível de R$ {{ formatCurrency(getCurrentAmount()) }}</span>
                      </label>
                    </div>
                  </div>
                }

                <!-- Step 3: PIX Instructions -->
                @if (currentModalStep() === 3) {
                  <div class="step-content">
                    <div class="step-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <h4 class="step-title">Como funciona o pagamento</h4>
                    <ul class="instruction-list">
                      <li>Você receberá uma <strong>chave PIX</strong> para pagar</li>
                      <li>Após fazer o PIX, precisará informar os <strong>3 últimos caracteres</strong> do ID da transação</li>
                      <li>Exemplo: ID da transação <span class="id-example">E000-12A<span class="highlight-chars">9Z7</span></span></li>
                    </ul>

                    <div class="step-checkbox">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [checked]="step3Confirmed()"
                          (change)="toggleStep3($any($event.target).checked)"
                        >
                        <span class="checkbox-custom"></span>
                        <span class="checkbox-text">Entendi como fazer o PIX e informar os 3 últimos caracteres</span>
                      </label>
                    </div>
                  </div>
                }

                <!-- Step 4: Final Confirmation -->
                @if (currentModalStep() === 4) {
                  <div class="step-content">
                    <div class="final-amount">
                      <span class="final-label">Valor a pagar:</span>
                      <span class="final-value">R$ {{ formatCurrency(getCurrentAmount()) }}</span>
                    </div>

                    <div class="final-estimate">
                      <span class="estimate-label">Estimativa de Bitcoin:</span>
                      <span class="estimate-value">{{ formatBitcoinAmount(getEstimatedBitcoinAmount()) }} BTC</span>
                      <span class="estimate-sats">({{ formatSats(getEstimatedBitcoinAmountInSats().toString()) }} sats)</span>
                    </div>

                    <div class="final-warning">
                      <div class="warning-header">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <strong>ATENÇÃO - Informações importantes:</strong>
                      </div>
                      <ul class="warning-list">
                        <li>Você terá <strong>5 minutos</strong> após confirmar para fazer o PIX e informar os 3 últimos caracteres</li>
                        <li>O valor final em BTC será calculado no momento da <strong>confirmação do pagamento</strong></li>
                        <li>Se tiver algum problema, <strong>CANCELE</strong> esta compra e comece uma nova</li>
                      </ul>
                    </div>
                  </div>
                }

                <!-- Navigation Buttons -->
                <div class="modal-actions">
                  @if (currentModalStep() === 1) {
                    <button class="btn btn-outline" (click)="closeConfirmationModal()">
                      Cancelar
                    </button>
                    <button
                      class="btn btn-primary"
                      (click)="nextStep()"
                      [disabled]="!canProceedToNextStep()"
                    >
                      Próximo
                    </button>
                  } @else if (currentModalStep() === 4) {
                    <button class="btn btn-outline" (click)="previousStep()">
                      Voltar
                    </button>
                    <button
                      class="btn btn-success btn-lg confirm-purchase-btn"
                      (click)="confirmPurchase()"
                      [disabled]="isProcessingPurchase() || !allStepsCompleted()"
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
                  } @else {
                    <button class="btn btn-outline" (click)="previousStep()">
                      Voltar
                    </button>
                    <button
                      class="btn btn-primary"
                      (click)="nextStep()"
                      [disabled]="!canProceedToNextStep()"
                    >
                      Próximo
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    /* Keeping all existing styles - only the template and logic changed */
    .buy-page {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 0;
    }

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

    .estimate-section {
      margin-bottom: 32px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .btc-price-display {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #FEF3C7;
      border-radius: 8px;
      border: 1px solid #FCD34D;
    }

    .price-label {
      font-size: 13px;
      color: #92400E;
      font-weight: 500;
    }

    .price-value {
      font-size: 14px;
      color: #78350F;
      font-weight: 700;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .estimate-card {
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
      margin-bottom: 24px;
    }

    .estimate-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #F3F4F6;
    }

    .estimate-row:last-of-type {
      border-bottom: none;
    }

    .estimate-row.highlight {
      background: #F0FDF4;
      padding: 16px;
      border-radius: 8px;
      border: 2px solid #BBF7D0;
      margin: 12px 0;
    }

    .estimate-label {
      font-size: 14px;
      color: #6B7280;
      font-weight: 500;
    }

    .estimate-value {
      font-size: 16px;
      color: #1F2937;
      font-weight: 700;
    }

    .estimate-value.btc {
      color: #16A34A;
      font-size: 20px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .estimate-value.sats {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .estimate-note {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: #DBEAFE;
      border: 1px solid #93C5FD;
      border-radius: 8px;
      margin-top: 16px;
    }

    .estimate-note svg {
      flex-shrink: 0;
      color: #1E40AF;
      margin-top: 2px;
    }

    .estimate-note span {
      flex: 1;
      font-size: 13px;
      color: #1E40AF;
      line-height: 1.5;
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

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      text-align: center;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #E5E7EB;
      border-top: 3px solid #1E40AF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    /* Modal styles - keeping all existing modal styles */
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
      max-width: 560px;
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

    .modal-header .header-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-right: 16px;
    }

    .modal-header h3 {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .step-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 12px;
      background: #EFF6FF;
      color: #1E40AF;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
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
      min-height: 300px;
    }

    .step-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 8px 0;
    }

    .step-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      margin: 0 auto;
      background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
      border-radius: 50%;
      color: #1E40AF;
    }

    .step-title {
      text-align: center;
      font-size: 22px;
      font-weight: 700;
      color: #1F2937;
      margin: 0;
    }

    .step-description {
      text-align: center;
      font-size: 15px;
      color: #6B7280;
      margin: 0;
      line-height: 1.6;
    }

    .step-checkbox {
      padding: 16px;
      background: #F9FAFB;
      border-radius: 12px;
      border: 2px solid #E5E7EB;
    }

    .amount-highlight {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 20px;
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
      border: 2px solid #FCD34D;
      border-radius: 12px;
      text-align: center;
    }

    .amount-label {
      font-size: 14px;
      color: #92400E;
      font-weight: 500;
    }

    .amount-value {
      font-size: 32px;
      font-weight: 800;
      color: #78350F;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .id-example {
      display: inline-block;
      padding: 4px 8px;
      background: #F3F4F6;
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      font-weight: 600;
      color: #1F2937;
    }

    .highlight-chars {
      background: #F59E0B;
      color: #FFFFFF;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
    }

    .final-amount {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 24px;
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
      border: 2px solid #F59E0B;
      border-radius: 12px;
      text-align: center;
    }

    .final-label {
      font-size: 14px;
      color: #92400E;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .final-value {
      font-size: 36px;
      font-weight: 800;
      color: #78350F;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .final-estimate {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 20px;
      background: linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%);
      border: 2px solid #16A34A;
      border-radius: 12px;
      text-align: center;
    }

    .final-estimate .estimate-label {
      font-size: 13px;
      color: #166534;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .final-estimate .estimate-value {
      font-size: 28px;
      font-weight: 800;
      color: #15803D;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .final-estimate .estimate-sats {
      font-size: 14px;
      color: #166534;
      font-weight: 500;
    }

    .final-warning {
      padding: 20px;
      background: #FEF3C7;
      border: 2px solid #FCD34D;
      border-radius: 12px;
    }

    .warning-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      color: #92400E;
    }

    .warning-header svg {
      flex-shrink: 0;
      color: #D97706;
    }

    .warning-header strong {
      font-size: 15px;
      font-weight: 700;
    }

    .warning-list {
      margin: 0;
      padding-left: 20px;
      list-style: none;
    }

    .warning-list li {
      position: relative;
      font-size: 14px;
      color: #78350F;
      line-height: 1.7;
      margin-bottom: 10px;
      padding-left: 8px;
    }

    .warning-list li:last-child {
      margin-bottom: 0;
    }

    .warning-list li::before {
      content: '•';
      position: absolute;
      left: -12px;
      color: #D97706;
      font-weight: bold;
      font-size: 18px;
    }

    .warning-list li strong {
      color: #92400E;
      font-weight: 700;
    }

    .instruction-list {
      margin: 0;
      padding-left: 20px;
      list-style: none;
    }

    .instruction-list li {
      position: relative;
      font-size: 15px;
      color: #1F2937;
      line-height: 1.8;
      margin-bottom: 12px;
      padding-left: 8px;
    }

    .instruction-list li:last-child {
      margin-bottom: 0;
    }

    .instruction-list li::before {
      content: '•';
      position: absolute;
      left: -12px;
      color: #1E40AF;
      font-weight: bold;
      font-size: 18px;
    }

    .instruction-list li strong {
      color: #1E40AF;
      font-weight: 700;
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

      .modal-actions {
        flex-direction: column;
      }

      .confirmation-modal {
        margin: 8px;
        max-height: calc(100vh - 16px);
      }

      .modal-content {
        padding: 16px;
        min-height: 250px;
      }

      .modal-header {
        padding: 16px;
      }

      .modal-header .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .step-icon {
        width: 64px;
        height: 64px;
      }

      .step-icon svg {
        width: 36px;
        height: 36px;
      }

      .step-title {
        font-size: 18px;
      }

      .step-description {
        font-size: 14px;
      }

      .amount-value {
        font-size: 28px;
      }

      .final-value {
        font-size: 30px;
      }

      .instruction-list li {
        font-size: 14px;
        margin-bottom: 10px;
      }

      .final-warning {
        padding: 16px;
      }

      .warning-list li {
        font-size: 13px;
      }

      .checkbox-text {
        font-size: 13px;
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

      .step-title {
        font-size: 16px;
      }

      .amount-value {
        font-size: 24px;
      }

      .final-value {
        font-size: 26px;
      }

      .step-icon {
        width: 56px;
        height: 56px;
      }

      .step-icon svg {
        width: 32px;
        height: 32px;
      }
    }
  `]
})
export class BuyComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  private walletManagerService = inject(WalletManagerService);
  private buyOrderService = inject(BuyOrderService);
  private invitesService = inject(InvitesService);
  private quoteService = inject(QuoteService);

  // Core signals
  selectedQuickAmount = signal<number>(0);
  customAmount = signal<number>(0);
  showConfirmationModal = signal<boolean>(false);
  isProcessingPurchase = signal<boolean>(false);

  // Step-by-step modal state
  currentModalStep = signal<number>(1);
  step1Confirmed = signal<boolean>(false);
  step2Confirmed = signal<boolean>(false);
  step3Confirmed = signal<boolean>(false);

  // Quote signals
  currentQuotePrice = signal<number | null>(null);
  isLoadingQuote = signal(true);
  private quoteSubscription?: Subscription;

  ngOnInit() {
    // Start quote polling
    this.quoteSubscription = this.quoteService.getBtcPriceStream().subscribe({
      next: (quote) => {
        const priceInCents = parseInt(quote.price, 10);
        this.currentQuotePrice.set(priceInCents);
        this.isLoadingQuote.set(false);
      },
      error: (err) => {
        console.error('Quote polling error:', err);
        this.isLoadingQuote.set(false);
      }
    });

    // Check for active order
    this.checkForActiveOrder();
  }

  ngOnDestroy() {
    if (this.quoteSubscription) {
      this.quoteSubscription.unsubscribe();
    }
  }

  /**
   * Check if user has an active buy order and redirect to it
   */
  private checkForActiveOrder() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      this.buyOrderService.getBuyOrdersByAddress(address, { page: 1, limit: 1 }).subscribe({
        next: (response) => {
          if (response.buy_orders.length > 0) {
            const order = response.buy_orders[0];
            // Check if order is active (not final)
            if (!order.is_final) {
              this.router.navigate(['/buy', order.id]);
            }
          }
        },
        error: (error) => {
          console.error('Error checking for active order:', error);
        }
      });
    }
  }

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

  getEstimatedBitcoinAmount(): number {
    const amountBrl = this.getCurrentAmount();
    const quote = this.currentQuotePrice();

    if (!quote || amountBrl <= 0) return 0;

    // Convert BRL to cents, then to BTC
    const amountInCents = amountBrl * 100;
    const pricePerBtcInCents = quote;

    // BTC = (amount in cents) / (price per BTC in cents)
    return amountInCents / pricePerBtcInCents;
  }

  getEstimatedBitcoinAmountInSats(): number {
    return Math.floor(this.getEstimatedBitcoinAmount() * 100000000);
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

  formatSats(amount: string): string {
    return new Intl.NumberFormat('pt-BR').format(Number(amount));
  }

  startBuyProcess() {
    // Check invite status before showing modal
    this.loadingService.show('Verificando convite...');

    this.invitesService.getWalletInvite().subscribe({
      next: (invite) => {
        this.loadingService.hide();

        if (!invite) {
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

        // Invite is valid, show confirmation modal
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
    this.resetModalState();
  }

  resetModalState() {
    this.currentModalStep.set(1);
    this.step1Confirmed.set(false);
    this.step2Confirmed.set(false);
    this.step3Confirmed.set(false);
  }

  canProceedToNextStep(): boolean {
    const step = this.currentModalStep();
    if (step === 1) return this.step1Confirmed();
    if (step === 2) return this.step2Confirmed();
    if (step === 3) return this.step3Confirmed();
    return false;
  }

  allStepsCompleted(): boolean {
    return this.step1Confirmed() && this.step2Confirmed() && this.step3Confirmed();
  }

  nextStep() {
    if (this.canProceedToNextStep() && this.currentModalStep() < 4) {
      this.currentModalStep.set(this.currentModalStep() + 1);
    }
  }

  previousStep() {
    if (this.currentModalStep() > 1) {
      this.currentModalStep.set(this.currentModalStep() - 1);
    }
  }

  toggleStep1(checked: boolean) {
    this.step1Confirmed.set(checked);
  }

  toggleStep2(checked: boolean) {
    this.step2Confirmed.set(checked);
  }

  toggleStep3(checked: boolean) {
    this.step3Confirmed.set(checked);
  }

  confirmPurchase() {
    const amount = this.getCurrentAmount();

    if (amount <= 0) {
      alert('Por favor, selecione um valor válido.');
      return;
    }

    this.isProcessingPurchase.set(true);
    this.loadingService.show('Criando ordem de compra...');

    // Convert BRL to cents
    const buyValueInCents = Math.round(amount * 100);

    this.buyOrderService.createBuyOrder(buyValueInCents).subscribe({
      next: (buyOrder) => {
        this.isProcessingPurchase.set(false);
        this.loadingService.hide();
        this.showConfirmationModal.set(false);

        // Navigate to buy-details page
        this.router.navigate(['/buy', buyOrder.id]);
      },
      error: (error: any) => {
        console.error('Erro ao criar ordem de compra:', error);
        this.isProcessingPurchase.set(false);
        this.loadingService.hide();

        // Handle specific error cases
        if (error.message && error.message.includes('cancelada')) {
          // User cancelled signature - don't show error
          this.showConfirmationModal.set(false);
        } else if (error.message && error.message.includes('Active order already exists')) {
          alert('Você já possui uma ordem ativa. Complete ou cancele a ordem anterior antes de criar uma nova.');
          this.showConfirmationModal.set(false);
          this.checkForActiveOrder(); // Redirect to active order
        } else {
          alert(error.message || 'Erro ao criar a ordem de compra. Tente novamente.');
        }
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
