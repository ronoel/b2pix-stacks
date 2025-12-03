import { Component, inject, OnInit, OnDestroy, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { BuyService } from '../../shared/api/buy.service';
import { Buy } from '../../shared/models/buy.model';

@Component({
  selector: 'app-buy-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="buy-payment-page">
      <div class="container">
        <!-- Header -->
        <div class="page-header">
          <button class="btn btn-ghost" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Voltar
          </button>
          <div class="header-content">
            <h1 class="page-title">Pagamento via PIX</h1>
            <p class="page-subtitle">Complete o pagamento para receber seus Bitcoins</p>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Carregando dados da compra...</p>
          </div>
        } @else if (isCancelled()) {
          <div class="success-state">
            <div class="success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3>Compra Cancelada com Sucesso</h3>
            <p>Sua compra foi cancelada. Os fundos serão devolvidos em breve.</p>
            <div class="success-actions">
              <button class="btn btn-primary btn-lg" (click)="router.navigate(['/buy'])">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Fazer Nova Compra
              </button>
              <button class="btn btn-outline btn-lg" (click)="router.navigate(['/dashboard'])">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M9 22V12h6v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Ir para Dashboard
              </button>
            </div>
          </div>
        } @else if (errorMessage()) {
          <div class="error-state">
            <div class="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M15 9L9 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3>Erro ao carregar compra</h3>
            <p>{{ errorMessage() }}</p>
            <button class="btn btn-primary" (click)="loadBuyData()">Tentar novamente</button>
          </div>
        } @else if (buyData()) {
          <div class="payment-container">
            <!-- Timer Warning -->
            <div class="timer-warning">
              <div class="timer-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="timer-content">
                <p class="timer-label">Tempo restante para pagamento:</p>
                <div class="timer-display">{{ getFormattedTime() }}</div>
              </div>
            </div>

            <div class="payment-card">
              <!-- Amount Section -->
              <div class="amount-section">
                <div class="amount-row">
                  <div class="amount-item">
                    <p class="amount-label">Valor exato a pagar:</p>
                    <div class="payment-amount">R$ {{ formatCurrency(getTotalFiatAmount()) }}</div>
                    <p class="amount-help">Pague exatamente este valor via PIX</p>
                  </div>
                  <div class="amount-divider"></div>
                  <div class="amount-item">
                    <p class="amount-label">Você receberá:</p>
                    <div class="btc-amount">{{ formatBTC(getBtcAmount()) }} <span class="btc-unit">BTC</span></div>
                    <p class="amount-help">{{ formatSats(getBtcAmountInSats()) }} satoshis</p>
                  </div>
                </div>
              </div>

              <!-- PIX Key Section -->
              <div class="pix-section">
                <label class="pix-label">Chave PIX do vendedor:</label>
                <div class="pix-key-container">
                  <input type="text" readonly [value]="buyData()!.pix_key" class="pix-key-input">
                  <button type="button" class="btn btn-primary btn-sm" (click)="copyPixKey()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                      <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Copiar
                  </button>
                </div>
              </div>

              <!-- Transaction ID Section -->
              <div class="transaction-id-section">
                <div class="instruction-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <p>Após realizar o pagamento, informe os <strong>3 últimos caracteres</strong> do ID da transação que aparecem no comprovante PIX.</p>
                </div>

                <div class="form-group">
                  <label for="transactionId" class="form-label">ID da Transação (3 últimos caracteres)</label>
                  <input
                    type="text"
                    id="transactionId"
                    maxlength="3"
                    [value]="transactionId()"
                    (input)="onTransactionIdChange($any($event.target).value)"
                    [disabled]="noTransactionId()"
                    class="form-input transaction-input"
                    [class.disabled]="noTransactionId()"
                    placeholder="Ex: 9Z7"
                    autocomplete="off"
                  >
                  @if (transactionId().length > 0 && !canConfirmPayment() && !noTransactionId()) {
                    <div class="error-message">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      Informe exatamente 3 caracteres (letras e/ou números)
                    </div>
                  }
                </div>

                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [checked]="noTransactionId()"
                      (change)="onNoTransactionIdChange($any($event.target).checked)"
                    >
                    <span class="checkbox-custom"></span>
                    <span class="checkbox-text">Não encontrei o ID da transação no comprovante</span>
                  </label>
                  @if (noTransactionId()) {
                    <div class="warning-message">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <span>Isso pode atrasar a validação do seu pagamento</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="action-buttons">
                <button type="button" class="btn btn-outline cancel-btn" (click)="cancelPurchase()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Cancelar Compra
                </button>
                <button
                  type="button"
                  class="btn btn-success btn-lg confirm-btn"
                  [disabled]="!canConfirmPayment()"
                  (click)="confirmPayment($event)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`

    .buy-payment-page {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 0;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 16px;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px 0;
      margin-bottom: 32px;
    }

    .header-content {
      flex: 1;
    }

    .page-title {
      font-size: 30px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .page-subtitle {
      font-size: 16px;
      color: #6B7280;
      margin: 0;
    }

    /* Loading State */
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

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Error State */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      text-align: center;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .error-icon {
      color: #EF4444;
    }

    .error-state h3 {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .error-state p {
      color: #6B7280;
      margin: 0;
    }

    /* Success State */
    .success-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      padding: 48px;
      text-align: center;
      background: #FFFFFF;
      border: 2px solid #D1FAE5;
      border-radius: 16px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .success-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 96px;
      height: 96px;
      background: #D1FAE5;
      border-radius: 50%;
      color: #16A34A;
      margin-bottom: 8px;
    }

    .success-state h3 {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin: 0;
    }

    .success-state p {
      color: #6B7280;
      margin: 0;
      font-size: 16px;
      max-width: 400px;
    }

    .success-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 400px;
      margin-top: 8px;
    }

    .success-actions .btn {
      width: 100%;
    }

    /* Payment Container */
    .payment-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Timer Warning */
    .timer-warning {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      background: #FEF3C7;
      border: 2px solid #FCD34D;
      border-radius: 12px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .timer-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: #FDE68A;
      border-radius: 50%;
      color: #D97706;
      flex-shrink: 0;
    }

    .timer-content {
      flex: 1;
    }

    .timer-label {
      margin: 0 0 4px 0;
      color: #92400E;
      font-size: 14px;
      font-weight: 500;
    }

    .timer-display {
      font-size: 28px;
      font-weight: 700;
      color: #B45309;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      letter-spacing: 2px;
    }

    /* Payment Card */
    .payment-card {
      padding: 32px;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    /* Amount Section */
    .amount-section {
      margin-bottom: 32px;
      padding: 24px;
      background: #F9FAFB;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
    }

    .amount-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 24px;
      align-items: center;
    }

    .amount-item {
      text-align: center;
    }

    .amount-divider {
      width: 2px;
      height: 80px;
      background: linear-gradient(to bottom, transparent, #D1D5DB, transparent);
    }

    .amount-label {
      margin: 0 0 8px 0;
      color: #6B7280;
      font-size: 14px;
      font-weight: 500;
    }

    .payment-amount {
      font-size: 36px;
      font-weight: 700;
      color: #F59E0B;
      margin: 0 0 8px 0;
    }

    .btc-amount {
      font-size: 32px;
      font-weight: 700;
      color: #1E40AF;
      margin: 0 0 8px 0;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .btc-unit {
      font-size: 20px;
      font-weight: 600;
      color: #6B7280;
      margin-left: 4px;
    }

    .amount-help {
      margin: 0;
      color: #9CA3AF;
      font-size: 13px;
    }

    /* PIX Section */
    .pix-section {
      margin-bottom: 32px;
    }

    .pix-label {
      display: block;
      margin-bottom: 12px;
      color: #1F2937;
      font-size: 14px;
      font-weight: 600;
    }

    .pix-key-container {
      display: flex;
      gap: 12px;
      align-items: stretch;
    }

    .pix-key-input {
      flex: 1;
      padding: 14px 16px;
      background: #F9FAFB;
      border: 2px solid #E5E7EB;
      border-radius: 8px;
      color: #1F2937;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      font-weight: 500;
    }

    /* Transaction ID Section */
    .transaction-id-section {
      margin-bottom: 24px;
    }

    .instruction-box {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .instruction-box svg {
      color: #1E40AF;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .instruction-box p {
      margin: 0;
      color: #1F2937;
      font-size: 14px;
      line-height: 1.5;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      color: #1F2937;
      font-size: 14px;
      font-weight: 600;
    }

    .form-input {
      width: 100%;
      padding: 14px 16px;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 8px;
      color: #1F2937;
      font-size: 16px;
      transition: all 0.2s ease;
    }

    .form-input:focus {
      border-color: #1E40AF;
      outline: none;
      box-shadow: 0 0 0 3px #EFF6FF;
    }

    .transaction-input {
      text-transform: uppercase;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-weight: 700;
      text-align: center;
      font-size: 20px;
      letter-spacing: 4px;
    }

    .transaction-input.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #F9FAFB;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 12px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 8px;
      color: #DC2626;
      font-size: 13px;
      font-weight: 500;
    }

    .error-message svg {
      flex-shrink: 0;
      color: #DC2626;
    }

    /* Checkbox */
    .checkbox-group {
      margin-bottom: 24px;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      user-select: none;
      padding: 12px;
      background: #F9FAFB;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .checkbox-label:hover {
      background: #F3F4F6;
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
      border-color: #1E40AF;
    }

    .checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
      background: #1E40AF;
      border-color: #1E40AF;
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

    .warning-message {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      margin-left: 32px;
      padding: 12px;
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      color: #92400E;
      font-size: 13px;
    }

    .warning-message svg {
      flex-shrink: 0;
      color: #D97706;
    }

    /* Action Buttons */
    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 24px;
      border-top: 1px solid #E5E7EB;
    }

    .cancel-btn {
      color: #EF4444;
      border-color: #FEE2E2;
      background: #FFFFFF;
    }

    .cancel-btn:hover:not(:disabled) {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: #DC2626;
    }

    .confirm-btn {
      background: #16A34A !important;
      color: #FFFFFF !important;
      border: 2px solid #16A34A !important;
      font-weight: 700;
      box-shadow: 0 4px 12px 0 rgb(22 163 74 / 0.4);
      text-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
    }

    .confirm-btn:hover:not(:disabled) {
      background: #15803D !important;
      border-color: #15803D !important;
      color: #FFFFFF !important;
      box-shadow: 0 6px 16px 0 rgb(21 128 61 / 0.5);
      transform: translateY(-1px);
    }

    .confirm-btn:disabled {
      background: #9CA3AF !important;
      border-color: #9CA3AF !important;
      color: #FFFFFF !important;
      opacity: 0.7;
      transform: none;
      box-shadow: none;
    }

    /* Common Button Styles */
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

    .btn-primary {
      background: #1E40AF;
      color: white;
      border-color: #1E40AF;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1D4ED8;
    }

    .btn-success {
      background: #16A34A;
      color: #FFFFFF;
      border-color: #16A34A;
      font-weight: 700;
      box-shadow: 0 2px 4px 0 rgb(22 163 74 / 0.3);
    }

    .btn-success:hover:not(:disabled) {
      background: #15803D;
      border-color: #15803D;
      box-shadow: 0 4px 8px 0 rgb(21 128 61 / 0.4);
      transform: translateY(-1px);
    }

    .btn-outline {
      background: transparent;
      color: #374151;
      border-color: #D1D5DB;
    }

    .btn-outline:hover:not(:disabled) {
      background: #F9FAFB;
    }

    .btn-ghost {
      background: transparent;
      color: #6B7280;
      border: none;
    }

    .btn-ghost:hover:not(:disabled) {
      background: #F3F4F6;
      color: #374151;
    }

    .btn-lg {
      padding: 16px 32px;
      font-size: 16px;
    }

    .btn-sm {
      padding: 8px 16px;
      font-size: 12px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .container {
        padding: 0 12px;
      }

      .buy-payment-page {
        padding: 16px 0;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        padding: 16px 0;
      }

      .page-title {
        font-size: 24px;
      }

      .timer-warning {
        flex-direction: column;
        text-align: center;
      }

      .timer-icon-wrapper {
        margin: 0 auto;
      }

      .payment-card {
        padding: 20px;
      }

      .amount-row {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .amount-divider {
        width: 100%;
        height: 2px;
        background: linear-gradient(to right, transparent, #D1D5DB, transparent);
      }

      .payment-amount,
      .btc-amount {
        font-size: 28px;
      }

      .pix-key-container {
        flex-direction: column;
      }

      .action-buttons {
        flex-direction: column-reverse;
      }

      .action-buttons button {
        width: 100%;
      }

      .warning-message {
        margin-left: 0;
      }

      .success-actions {
        gap: 10px;
      }
    }
  `]
})
export class BuyPaymentComponent implements OnInit, OnDestroy {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private loadingService = inject(LoadingService);
  private buyService = inject(BuyService);

  // Component state
  buyData = signal<Buy | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');
  isCancelled = signal(false);
  
  // Payment form state
  transactionId = signal('');
  noTransactionId = signal(false);
  
  // Timer for payment
  paymentTimeLeft = signal(0);
  private paymentTimer: any;

  ngOnInit() {
    // Get buy ID from route parameters
    const buyId = this.route.snapshot.paramMap.get('id');
    
    if (buyId) {
      this.loadBuyData(buyId);
    } else {
      this.errorMessage.set('ID da compra não encontrado na URL');
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    this.clearPaymentTimer();
  }

  loadBuyData(buyId?: string) {
    const id = buyId || this.route.snapshot.paramMap.get('id');
    
    if (!id) {
      this.errorMessage.set('ID da compra não encontrado');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.buyService.getBuyById(id).subscribe({
      next: (buy) => {
        this.buyData.set(buy);
        this.startPaymentTimer(buy);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erro ao carregar dados da compra:', error);
        this.errorMessage.set('Não foi possível carregar os dados da compra. Verifique se o ID está correto.');
        this.isLoading.set(false);
      }
    });
  }

  startPaymentTimer(buy: Buy) {
    if (!buy.expires_at) {
      return;
    }

    this.updatePaymentTimeLeft(buy);
    
    this.paymentTimer = setInterval(() => {
      this.updatePaymentTimeLeft(buy);
    }, 1000);
  }

  private updatePaymentTimeLeft(buy: Buy) {
    const now = new Date();
    const expiresAt = new Date(buy.expires_at);
    const timeLeftMs = expiresAt.getTime() - now.getTime();
    const timeLeftSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));
    
    this.paymentTimeLeft.set(timeLeftSeconds);
    
    if (timeLeftSeconds <= 0) {
      this.clearPaymentTimer();
      this.handlePaymentTimeout();
    }
  }

  clearPaymentTimer() {
    if (this.paymentTimer) {
      clearInterval(this.paymentTimer);
      this.paymentTimer = null;
    }
  }

  handlePaymentTimeout() {
    alert('O tempo de pagamento foi excedido. Sua compra foi cancelada.');
    this.router.navigate(['/buy']);
  }

  getFormattedTime(): string {
    const time = this.paymentTimeLeft();
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getTotalFiatAmount(): number {
    const buy = this.buyData();
    if (!buy) return 0;
    
    // Convert from cents to reais using pay_value
    return Number(buy.pay_value) / 100;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  getBtcAmountInSats(): number {
    const buy = this.buyData();
    if (!buy) return 0;
    return Number(buy.amount);
  }

  getBtcAmount(): number {
    const sats = this.getBtcAmountInSats();
    return sats / 100000000; // Convert sats to BTC
  }

  formatBTC(amount: number): string {
    return amount.toFixed(8);
  }

  formatSats(sats: number): string {
    return new Intl.NumberFormat('pt-BR').format(sats);
  }

  onTransactionIdChange(transactionId: string) {
    this.transactionId.set(transactionId.toUpperCase());
    if (transactionId.length > 0) {
      this.noTransactionId.set(false);
    }
  }

  onNoTransactionIdChange(noTransactionId: boolean) {
    this.noTransactionId.set(noTransactionId);
    if (noTransactionId) {
      this.transactionId.set('');
    }
  }

  canConfirmPayment(): boolean {
    if (this.noTransactionId()) {
      return true;
    }
    const txId = this.transactionId();
    return txId.length === 3 && /^[A-Z0-9]{3}$/.test(txId);
  }

  copyPixKey() {
    const buy = this.buyData();
    if (buy?.pix_key) {
      navigator.clipboard.writeText(buy.pix_key).then(() => {
        alert('Chave PIX copiada para a área de transferência!');
      }).catch(() => {
        alert('Erro ao copiar chave PIX. Copie manualmente.');
      });
    }
  }

  confirmPayment(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!this.canConfirmPayment()) {
      return;
    }
    
    const buy = this.buyData();
    
    if (!buy) {
      return;
    }
    
    this.loadingService.show();
    
    // Get the pix ID (transaction ID) or pass undefined if "no transaction ID" is checked
    const pixId = this.noTransactionId() ? undefined : this.transactionId();
    
    this.buyService.markBuyAsPaid(buy.id, pixId).subscribe({
      next: (updatedBuy) => {
        this.loadingService.hide();
        this.buyData.set(updatedBuy);
        
        // Show success message
        alert('Pagamento confirmado com sucesso! Aguarde a liberação dos bitcoins.');
        
        // Navigate back to dashboard or buy page
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Error confirming payment:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error body:', error.error);
        this.loadingService.hide();
        
        let errorMessage = 'Erro ao confirmar pagamento. Tente novamente.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        alert(errorMessage);
      }
    });
  }

  cancelPurchase() {
    const buy = this.buyData();
    
    if (!buy) {
      return;
    }
    
    if (!confirm('Tem certeza que deseja cancelar esta compra?')) {
      return;
    }
    
    this.loadingService.show();
    
    this.buyService.cancel(buy.id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.clearPaymentTimer();
        
        // Set a flag to show success state
        this.showCancellationSuccess();
      },
      error: (error) => {
        console.error('Error canceling buy:', error);
        this.loadingService.hide();
        
        let errorMessage = 'Erro ao cancelar compra. Tente novamente.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        alert(errorMessage);
      }
    });
  }

  showCancellationSuccess() {
    // Update the buy data to reflect cancelled status or set a flag
    this.isLoading.set(false);
    this.errorMessage.set('');
    // Navigate to a success state by setting buyData to null and using a cancellation flag
    this.buyData.set(null);
    this.isCancelled.set(true);
  }

  goBack() {
    this.router.navigate(['/buy']);
  }
}