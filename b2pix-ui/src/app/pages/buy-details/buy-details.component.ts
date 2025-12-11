import { Component, inject, OnInit, OnDestroy, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { BuyService } from '../../shared/api/buy.service';
import { PaymentRequestService } from '../../shared/api/payment-request.service';
import { Buy, BuyStatus } from '../../shared/models/buy.model';
import { PaymentRequest, PaymentRequestStatus, PaymentSourceType } from '../../shared/models/payment-request.model';
import { environment } from '../../../environments/environment';
import { PaymentFormComponent } from './payment-form.component';

@Component({
  selector: 'app-buy-details',
  standalone: true,
  imports: [CommonModule, PaymentFormComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="buy-details-page">
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
            <h1 class="page-title">{{ getPageTitle() }}</h1>
            <p class="page-subtitle">{{ getPageSubtitle() }}</p>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Carregando dados da compra...</p>
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
          <!-- Payment Form for Pending Status -->
          @if (isPendingPayment()) {
            <app-payment-form
              [formattedTime]="getFormattedTime()"
              [fiatAmount]="formatCurrency(getTotalFiatAmount())"
              [btcAmount]="formatBTC(getBtcAmount())"
              [pixKey]="buyData()!.pix_key"
              [canConfirm]="canConfirmPayment()"
              (copyPix)="copyPixKey()"
              (confirm)="confirmPayment()"
              (cancel)="cancelPurchase()"
              (transactionIdChanged)="onTransactionIdChange($event)"
              (noTransactionIdChanged)="onNoTransactionIdChange($event)"
            />
          } @else {
            <!-- Buy Details for Non-Pending Status -->
            <div class="details-container">
              <!-- Status Banner -->
              <div class="status-banner" [ngClass]="getStatusClass(buyData()!.status)">
                <div class="status-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    @if (isSuccessStatus(buyData()!.status)) {
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    } @else if (isProcessingStatus(buyData()!.status)) {
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    } @else {
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    }
                  </svg>
                </div>
                <div class="status-content">
                  <h3 class="status-title">{{ getStatusLabel(buyData()!.status) }}</h3>
                  <p class="status-description">{{ getStatusDescription(buyData()!.status) }}</p>
                </div>
              </div>

              <!-- Buy Information Card -->
              <div class="info-card">
                <h3 class="card-title">Informações da Compra</h3>

                <div class="info-grid">
                  <div class="info-item full-width">
                    <span class="info-label">ID da Compra:</span>
                    <span class="info-value mono">{{ buyData()!.id }}</span>
                  </div>

                  <div class="info-item">
                    <span class="info-label">Data e Hora:</span>
                    <span class="info-value">{{ formatDateTime(buyData()!.created_at) }}</span>
                  </div>

                  <div class="info-item highlight">
                    <span class="info-label">Valor Pago:</span>
                    <span class="info-value amount">{{ formatBRLCurrency(buyData()!.pay_value) }}</span>
                  </div>

                  <div class="info-item highlight">
                    <span class="info-label">Bitcoin Recebido:</span>
                    <span class="info-value btc">{{ formatSatoshisToBTC(buyData()!.amount) }} BTC</span>
                  </div>

                  <div class="info-item">
                    <span class="info-label">Satoshis:</span>
                    <span class="info-value mono">{{ formatSats(buyData()!.amount.toString()) }} sats</span>
                  </div>

                  <div class="info-item">
                    <span class="info-label">Preço por BTC:</span>
                    <span class="info-value">{{ formatBRLCurrency(buyData()!.price) }}</span>
                  </div>
                </div>
              </div>

              <!-- Payment Request Details (if available) -->
              @if (shouldShowPaymentDetails()) {
                @if (paymentRequest()) {
                  <div class="info-card">
                    <h3 class="card-title">Detalhes do Pagamento Blockchain</h3>

                    <div class="info-grid">
                      <div class="info-item">
                        <span class="info-label">Status:</span>
                        <span class="status-badge small" [ngClass]="getPaymentRequestStatusClass(paymentRequest()!.status)">
                          {{ getPaymentRequestStatusLabel(paymentRequest()!.status) }}
                        </span>
                      </div>

                      <div class="info-item">
                        <span class="info-label">Valor:</span>
                        <span class="info-value mono">{{ formatSats(paymentRequest()!.amount.toString()) }} sats</span>
                      </div>

                      @if (paymentRequest()!.blockchain_tx_id) {
                        <div class="info-item full-width">
                          <span class="info-label">Transação Blockchain:</span>
                          <a
                            [href]="getBlockchainExplorerUrl(paymentRequest()!.blockchain_tx_id!)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="blockchain-link"
                          >
                            {{ formatTransactionId(paymentRequest()!.blockchain_tx_id!) }}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              <polyline points="15,3 21,3 21,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </a>
                        </div>
                      }
                    </div>
                  </div>
                } @else if (isLoadingPaymentRequest()) {
                  <div class="info-card">
                    <div class="loading-inline">
                      <div class="loading-spinner-sm"></div>
                      <span>Carregando detalhes do pagamento...</span>
                    </div>
                  </div>
                }
              }

              <!-- Action Buttons for Details View -->
              <div class="details-actions">
                <button class="btn btn-outline" (click)="refreshBuyData()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Atualizar
                </button>
                <button class="btn btn-primary" (click)="goToDashboard()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 22V12h6v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Ir para Dashboard
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Time Warning Modal -->
      @if (showTimeWarningModal()) {
        <div class="warning-modal-overlay" (click)="closeTimeWarningModal()">
          <div class="warning-modal-content" (click)="$event.stopPropagation()">
            <div class="warning-modal-header">
              <div class="warning-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <h3 class="warning-modal-title">Atenção: Tempo Restante</h3>
            </div>
            <div class="warning-modal-body">
              <div class="warning-timer">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="warning-timer-display">{{ getFormattedTime() }}</div>
              </div>
              <p class="warning-message-text">
                Resta menos de <strong>1 minuto</strong> para concluir o pagamento.
              </p>
              <p class="warning-suggestion">
                Se você ainda não está pronto para realizar o pagamento, recomendamos cancelar esta compra e iniciar uma nova quando estiver preparado.
              </p>
              <div class="warning-confirmation">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="hasReadWarning()"
                    (change)="onWarningReadChange($event)"
                    class="warning-checkbox"
                  />
                  <span class="checkbox-text">Li e compreendi o aviso acima</span>
                </label>
              </div>
            </div>
            <div class="warning-modal-footer">
              <button class="btn btn-outline btn-cancel-warning" (click)="cancelFromWarningModal()" [disabled]="!hasReadWarning()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Cancelar Compra
              </button>
              <button class="btn btn-primary btn-continue" (click)="closeTimeWarningModal()" [disabled]="!hasReadWarning()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                </svg>
                Continuar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .buy-details-page {
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

    .loading-spinner-sm {
      width: 20px;
      height: 20px;
      border: 2px solid #E5E7EB;
      border-top: 2px solid #1E40AF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-inline {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      color: #6B7280;
      font-size: 14px;
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

    /* Details Container */
    .details-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Status Banner */
    .status-banner {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .status-banner.completed {
      background: #D1FAE5;
      border-color: #6EE7B7;
    }

    .status-banner.processing {
      background: #DBEAFE;
      border-color: #93C5FD;
    }

    .status-banner.warning {
      background: #FEF3C7;
      border-color: #FCD34D;
    }

    .status-banner.pending {
      background: #FEF3C7;
      border-color: #FCD34D;
    }

    .status-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-banner.completed .status-icon {
      background: #ECFDF5;
      color: #16A34A;
    }

    .status-banner.processing .status-icon {
      background: #EFF6FF;
      color: #3B82F6;
    }

    .status-banner.warning .status-icon,
    .status-banner.pending .status-icon {
      background: #FFFBEB;
      color: #F59E0B;
    }

    .status-content {
      flex: 1;
    }

    .status-title {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .status-banner.completed .status-title {
      color: #065F46;
    }

    .status-banner.processing .status-title {
      color: #1E40AF;
    }

    .status-banner.warning .status-title,
    .status-banner.pending .status-title {
      color: #92400E;
    }

    .status-description {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .status-banner.completed .status-description {
      color: #047857;
    }

    .status-banner.processing .status-description {
      color: #1E40AF;
    }

    .status-banner.warning .status-description,
    .status-banner.pending .status-description {
      color: #B45309;
    }

    /* Info Card */
    .info-card {
      padding: 24px;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 20px 0;
      padding-bottom: 16px;
      border-bottom: 1px solid #E5E7EB;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .info-item.full-width {
      grid-column: 1 / -1;
    }

    .info-item.highlight {
      padding: 12px;
      background: #F9FAFB;
      border-radius: 8px;
    }

    .info-label {
      font-size: 13px;
      color: #6B7280;
      font-weight: 500;
    }

    .info-value {
      font-size: 14px;
      color: #1F2937;
      font-weight: 600;
    }

    .info-value.mono {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .info-value.amount {
      font-size: 20px;
      color: #F59E0B;
      font-weight: 700;
    }

    .info-value.btc {
      font-size: 18px;
      color: #059669;
      font-weight: 700;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .blockchain-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #3B82F6;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.2s ease;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .blockchain-link:hover {
      color: #2563EB;
      text-decoration: underline;
    }

    .blockchain-link svg {
      opacity: 0.7;
      flex-shrink: 0;
    }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
    }

    .status-badge.small {
      padding: 4px 8px;
      font-size: 12px;
    }

    .status-badge.completed {
      background: #D1FAE5;
      color: #065F46;
    }

    .status-badge.pending {
      background: #FEF3C7;
      color: #92400E;
    }

    .status-badge.failed {
      background: #FEE2E2;
      color: #991B1B;
    }

    /* Details Actions */
    .details-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 8px;
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

    /* Time Warning Modal */
    .warning-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
      padding: 20px;
      backdrop-filter: blur(4px);
    }

    .warning-modal-content {
      background: #FFFFFF;
      border-radius: 16px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      animation: warningModalSlideIn 0.3s ease-out;
    }

    @keyframes warningModalSlideIn {
      from {
        transform: scale(0.95) translateY(-20px);
        opacity: 0;
      }
      to {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }

    .warning-modal-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 32px 24px 24px;
      border-bottom: 1px solid #FEE2E2;
      background: linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 100%);
      border-radius: 16px 16px 0 0;
    }

    .warning-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%);
      border-radius: 50%;
      color: #DC2626;
      box-shadow: 0 4px 12px 0 rgb(220 38 38 / 0.2);
    }

    .warning-modal-title {
      font-size: 22px;
      font-weight: 700;
      color: #991B1B;
      margin: 0;
      text-align: center;
    }

    .warning-modal-body {
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .warning-timer {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      background: linear-gradient(135deg, #FEF3C7 0%, #FEF9E7 100%);
      border: 2px solid #F59E0B;
      border-radius: 12px;
      box-shadow: 0 4px 12px 0 rgb(245 158 11 / 0.2);
    }

    .warning-timer svg {
      color: #D97706;
      flex-shrink: 0;
    }

    .warning-timer-display {
      font-size: 32px;
      font-weight: 700;
      color: #92400E;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      letter-spacing: 2px;
    }

    .warning-message-text {
      text-align: center;
      color: #1F2937;
      font-size: 16px;
      line-height: 1.6;
      margin: 0;
      font-weight: 500;
    }

    .warning-message-text strong {
      color: #DC2626;
      font-weight: 700;
    }

    .warning-suggestion {
      text-align: center;
      color: #6B7280;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
      padding: 16px;
      background: #F9FAFB;
      border-radius: 8px;
      border-left: 4px solid #F59E0B;
    }

    .warning-confirmation {
      width: 100%;
      padding: 16px;
      background: #FFFBEB;
      border: 2px solid #FCD34D;
      border-radius: 8px;
      margin-top: 8px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      user-select: none;
    }

    .warning-checkbox {
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: #F59E0B;
      flex-shrink: 0;
    }

    .checkbox-text {
      color: #92400E;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
    }

    .warning-modal-footer {
      padding: 20px 24px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-cancel-warning {
      color: #DC2626;
      border-color: #FEE2E2;
      background: #FFFFFF;
      flex: 1;
    }

    .btn-cancel-warning:hover {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: #991B1B;
    }

    .btn-continue {
      flex: 1;
      background: #1E40AF;
      color: #FFFFFF;
      border-color: #1E40AF;
    }

    .btn-continue:hover {
      background: #1D4ED8;
      border-color: #1D4ED8;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .container {
        padding: 0 12px;
      }

      .buy-details-page {
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


      .status-banner {
        flex-direction: column;
        text-align: center;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .details-actions {
        flex-direction: column;
      }

      .details-actions button {
        width: 100%;
      }

      .warning-modal-overlay {
        padding: 16px;
      }

      .warning-modal-content {
        max-width: 100%;
      }

      .warning-modal-header {
        padding: 24px 20px 20px;
      }

      .warning-icon {
        width: 64px;
        height: 64px;
      }

      .warning-icon svg {
        width: 36px;
        height: 36px;
      }

      .warning-modal-title {
        font-size: 18px;
      }

      .warning-modal-body {
        padding: 24px 20px;
      }

      .warning-timer {
        padding: 12px 16px;
        gap: 12px;
      }

      .warning-timer svg {
        width: 24px;
        height: 24px;
      }

      .warning-timer-display {
        font-size: 24px;
      }

      .warning-message-text {
        font-size: 15px;
      }

      .warning-suggestion {
        font-size: 13px;
        padding: 12px;
      }

      .warning-confirmation {
        padding: 12px;
      }

      .checkbox-text {
        font-size: 13px;
      }

      .warning-modal-footer {
        flex-direction: column;
        padding: 16px 20px;
      }

      .btn-cancel-warning,
      .btn-continue {
        width: 100%;
      }
    }
  `]
})
export class BuyDetailsComponent implements OnInit, OnDestroy {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private loadingService = inject(LoadingService);
  private buyService = inject(BuyService);
  private paymentRequestService = inject(PaymentRequestService);

  // Component state
  buyData = signal<Buy | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  // Payment form state (for pending status)
  transactionId = signal('');
  noTransactionId = signal(false);

  // Timer warning modal state
  showTimeWarningModal = signal(false);
  hasReadWarning = signal(false);
  private hasShownTimeWarning = false;
  private hasShownTimeoutAlert = false;

  // Timer for payment (for pending status)
  paymentTimeLeft = signal(0);
  private paymentTimer: any;

  // Payment request state (for completed status)
  paymentRequest = signal<PaymentRequest | null>(null);
  isLoadingPaymentRequest = signal(false);

  // Auto-refresh timer
  private refreshTimeout: any = null;

  ngOnInit() {
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
    this.clearRefreshTimeout();
  }

  loadBuyData(buyId?: string, showLoading: boolean = true) {
    const id = buyId || this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('ID da compra não encontrado');
      this.isLoading.set(false);
      return;
    }

    if (showLoading) {
      this.isLoading.set(true);
    }
    this.errorMessage.set('');

    this.buyService.getBuyById(id).subscribe({
      next: (buy) => {
        this.buyData.set(buy);

        // If pending, start payment timer
        const statusStr = buy.status?.toString().toLowerCase();
        if (statusStr === 'pending') {
          this.startPaymentTimer(buy);
        }

        // If completed status, load payment request
        if (this.shouldShowPaymentDetails()) {
          this.loadPaymentRequest(buy.id);
        }

        if (showLoading) {
          this.isLoading.set(false);
        }

        // Schedule auto-refresh if needed
        this.scheduleAutoRefresh();
      },
      error: (error) => {
        console.error('Erro ao carregar dados da compra:', error);
        if (showLoading) {
          this.errorMessage.set('Não foi possível carregar os dados da compra. Verifique se o ID está correto.');
          this.isLoading.set(false);
        }
      }
    });
  }

  refreshBuyData() {
    const buyId = this.buyData()?.id;
    if (buyId) {
      // Silent refresh - don't show loading spinner
      this.loadBuyData(buyId, false);
    }
  }

  /**
   * Check if a buy is actually expired (expires_at has passed)
   * even if the server status still shows as pending
   */
  isActuallyExpired(buy: Buy | null): boolean {
    if (!buy || !buy.expires_at) return false;

    const now = new Date();
    const expiresAt = new Date(buy.expires_at);
    return now.getTime() > expiresAt.getTime();
  }

  isPendingPayment(): boolean {
    const buy = this.buyData();
    const status = buy?.status;
    const statusStr = status?.toString().toLowerCase();

    // If status is pending but it's actually expired, don't show payment form
    if (statusStr === 'pending' && this.isActuallyExpired(buy)) {
      return false;
    }

    return statusStr === 'pending';
  }

  startPaymentTimer(buy: Buy) {
    if (!buy.expires_at) {
      return;
    }

    this.updatePaymentTimeLeft(buy);

    this.paymentTimer = setInterval(() => {
      this.updatePaymentTimeLeft(buy);
    }, 5000);
  }

  private updatePaymentTimeLeft(buy: Buy) {
    const now = new Date();
    const expiresAt = new Date(buy.expires_at);
    const timeLeftMs = expiresAt.getTime() - now.getTime();
    const timeLeftSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));

    this.paymentTimeLeft.set(timeLeftSeconds);

    // Show warning modal when less than 1 minute remaining (only once)
    if (timeLeftSeconds > 0 && timeLeftSeconds < 60 && !this.hasShownTimeWarning) {
      this.hasShownTimeWarning = true;
      this.hasReadWarning.set(false); // Reset checkbox when opening modal
      this.showTimeWarningModal.set(true);
    }

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
    // Only show alert once
    if (!this.hasShownTimeoutAlert) {
      this.hasShownTimeoutAlert = true;
      alert('O tempo de pagamento foi excedido. Sua compra foi cancelada.');
    }

    // Reload buy data to show expired state instead of redirecting
    const buyId = this.buyData()?.id;
    if (buyId) {
      this.loadBuyData(buyId);
    }
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
    return sats / 100000000;
  }

  formatBTC(amount: number): string {
    return amount.toFixed(8);
  }

  formatSats(sats: number | string): string {
    return new Intl.NumberFormat('pt-BR').format(Number(sats));
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

  closeTimeWarningModal() {
    this.showTimeWarningModal.set(false);
    this.hasReadWarning.set(false); // Reset checkbox when closing modal
  }

  cancelFromWarningModal() {
    this.showTimeWarningModal.set(false);
    this.hasReadWarning.set(false); // Reset checkbox when closing modal
    this.cancelPurchase();
  }

  onWarningReadChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.hasReadWarning.set(target.checked);
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

    const pixId = this.noTransactionId() ? undefined : this.transactionId();

    this.buyService.markBuyAsPaid(buy.id, pixId).subscribe({
      next: (updatedBuy) => {
        this.loadingService.hide();
        this.buyData.set(updatedBuy);
        this.clearPaymentTimer();

        // Show success message
        alert('Pagamento confirmado com sucesso! Aguarde a liberação dos bitcoins.');

        // Reload to show details view
        this.loadBuyData(buy.id);
      },
      error: (error) => {
        console.error('Error confirming payment:', error);
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

        alert('Compra cancelada com sucesso!');
        this.router.navigate(['/dashboard']);
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

  shouldShowPaymentDetails(): boolean {
    const status = this.buyData()?.status;
    const statusStr = status?.toString().toLowerCase();
    return statusStr === 'payment_confirmed' ||
           statusStr === 'dispute_resolved_buyer';
  }

  loadPaymentRequest(buyId: string) {
    this.isLoadingPaymentRequest.set(true);

    this.paymentRequestService.getPaymentRequestsBySource(PaymentSourceType.Buy, buyId).subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          this.paymentRequest.set(response.data[0]);
        }
        this.isLoadingPaymentRequest.set(false);
      },
      error: (error) => {
        console.error('Error loading payment request:', error);
        this.isLoadingPaymentRequest.set(false);
      }
    });
  }

  getPageTitle(): string {
    const status = this.buyData()?.status;
    const statusStr = status?.toString().toLowerCase();
    if (statusStr === 'pending') {
      return 'Pagamento via PIX';
    }
    return 'Detalhes da Compra';
  }

  getPageSubtitle(): string {
    const status = this.buyData()?.status;
    const statusStr = status?.toString().toLowerCase();
    if (statusStr === 'pending') {
      return 'Complete o pagamento para receber seus Bitcoins';
    }
    return 'Acompanhe o status da sua compra de Bitcoin';
  }

  getStatusClass(status: BuyStatus): string {
    const buy = this.buyData();

    // Check if it's actually expired even if status is pending
    if (status?.toString().toLowerCase() === 'pending' && this.isActuallyExpired(buy)) {
      return 'warning';
    }

    if (this.isSuccessStatus(status)) return 'completed';
    if (this.isProcessingStatus(status)) return 'processing';
    return 'warning';
  }

  isSuccessStatus(status: BuyStatus): boolean {
    const statusStr = status?.toString().toLowerCase();
    return statusStr === 'payment_confirmed' ||
           statusStr === 'dispute_resolved_buyer';
  }

  isProcessingStatus(status: BuyStatus): boolean {
    const statusStr = status?.toString().toLowerCase();
    return statusStr === 'paid';
  }

  getStatusLabel(status: BuyStatus): string {
    // Use string comparison for more robust matching
    const statusStr = status?.toString().toLowerCase();
    const buy = this.buyData();

    // Check if it's actually expired even if status is pending
    if (statusStr === 'pending' && this.isActuallyExpired(buy)) {
      return 'Expirada';
    }

    switch (statusStr) {
      case 'pending':
        return 'Pendente';
      case 'paid':
        return 'Verificando Pagamento';
      case 'payment_confirmed':
        return 'Pagamento Confirmado';
      case 'cancelled':
        return 'Cancelada';
      case 'expired':
        return 'Expirada';
      case 'indispute':
        return 'Em Disputa';
      case 'dispute_favor_buyer':
        return 'Disputa a Favor do Comprador';
      case 'dispute_favor_seller':
        return 'Disputa a Favor do Vendedor';
      case 'dispute_resolved_buyer':
        return 'Disputa Resolvida a Favor do Comprador';
      case 'dispute_resolved_seller':
        return 'Disputa Resolvida a Favor do Vendedor';
      default:
        console.warn('Unknown status:', status, 'Type:', typeof status);
        return 'Em análise';
    }
  }

  getStatusDescription(status: BuyStatus): string {
    // Use string comparison for more robust matching
    const statusStr = status?.toString().toLowerCase();
    const buy = this.buyData();

    // Check if it's actually expired even if status is pending
    if (statusStr === 'pending' && this.isActuallyExpired(buy)) {
      return 'O prazo para pagamento expirou. Você pode fazer uma nova compra.';
    }

    switch (statusStr) {
      case 'pending':
        return 'Complete o pagamento para prosseguir com sua compra.';
      case 'paid':
        return 'Estamos verificando seu pagamento. Aguarde enquanto processamos a transação.';
      case 'payment_confirmed':
        return 'Seu pagamento foi confirmado! Os bitcoins foram enviados para sua carteira.';
      case 'cancelled':
        return 'Esta compra foi cancelada.';
      case 'expired':
        return 'O prazo para pagamento expirou. Você pode fazer uma nova compra.';
      case 'indispute':
        return 'Não conseguimos identificar seu pagamento e a transação será apurada. Fique atento ao seu e-mail para acompanhar a resolução.';
      case 'dispute_favor_buyer':
        return 'A disputa foi resolvida a seu favor. Aguarde o processamento.';
      case 'dispute_favor_seller':
        return 'A disputa foi resolvida a favor do vendedor.';
      case 'dispute_resolved_buyer':
        return 'A disputa foi resolvida a seu favor. Os bitcoins foram enviados para sua carteira.';
      case 'dispute_resolved_seller':
        return 'A disputa foi resolvida a favor do vendedor.';
      default:
        return 'Acompanhe o status da sua compra. Em caso de dúvidas, entre em contato com o suporte.';
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

  formatTransactionId(txId: string): string {
    if (!txId || txId.length <= 12) return txId;
    return `${txId.substring(0, 8)}...${txId.substring(txId.length - 4)}`;
  }

  getBlockchainExplorerUrl(txId: string): string {
    const transactionId = txId.startsWith('0x') ? txId : `0x${txId}`;
    const chain = environment.network === 'mainnet' ? 'mainnet' : 'testnet';
    return `https://explorer.hiro.so/txid/${transactionId}?chain=${chain}`;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Check if buy needs monitoring (is not in a final state and not pending payment)
   */
  private needsMonitoring(): boolean {
    const status = this.buyData()?.status;
    if (!status) return false;

    const statusStr = status.toString().toLowerCase();

    // Don't monitor pending (user is on payment form) or final statuses
    const noMonitoringNeeded = [
      'pending',              // User is filling payment form
      'cancelled',
      'expired',
      'payment_confirmed',
      'dispute_resolved_buyer',
      'dispute_resolved_seller'
    ];

    return !noMonitoringNeeded.includes(statusStr);
  }

  /**
   * Schedule auto-refresh if buy needs monitoring
   */
  private scheduleAutoRefresh() {
    this.clearRefreshTimeout();

    if (this.needsMonitoring()) {
      this.refreshTimeout = setTimeout(() => {
        this.refreshBuyData();
      }, 5000); // 5 seconds
    }
  }

  /**
   * Clear auto-refresh timeout
   */
  private clearRefreshTimeout() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }
}
