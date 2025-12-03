import { Component, OnInit, OnDestroy, signal, inject, ViewEncapsulation } from '@angular/core';
import { BuyStatus } from '../../shared/models/buy.model';
import { PaymentRequest, PaymentRequestStatus, PaymentSourceType } from '../../shared/models/payment-request.model';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { WalletType } from '../../libs/wallet/wallet.types';
import { BuyService } from '../../shared/api/buy.service';
import { PaymentRequestService } from '../../shared/api/payment-request.service';
import { environment } from '../../../environments/environment';
import { TransactionCardComponent } from '../../components/transaction-card/transaction-card.component';
import { sBTCTokenService } from '../../libs/sbtc-token.service';
import { QuoteService } from '../../shared/api/quote.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TransactionCardComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dashboard">
      <div class="container">
        <!-- Header -->
        <div class="dashboard-header">
          <div class="header-left">
            <h1 class="dashboard-title">Dashboard</h1>
            <p class="dashboard-subtitle">Plataforma P2P - Compre e venda Bitcoin com PIX</p>
          </div>
          <div class="wallet-balance">
            <div class="balance-label">Saldo sBTC</div>
            @if (isLoadingBalance()) {
              <div class="balance-loading">
                <div class="loading-spinner-sm"></div>
              </div>
            } @else {
              <div class="balance-amount">{{ formatSatoshisToBTC(sBtcBalance().toString()) }} BTC</div>
              <div class="balance-sats">{{ formatSats(sBtcBalance().toString()) }} sats</div>
              @if (btcPriceInCents() > 0) {
                <div class="balance-brl">≈ {{ formatBalanceInBRL() }}</div>
              }
            }
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="actions-section">
          <!-- Trade Section -->
          <div class="action-group">
            <h3 class="group-title">Negociar</h3>
            <div class="actions-grid compact">
              <button class="action-btn primary" (click)="goToBuy()">
                <div class="btn-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M7 17L17 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M7 7H17V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <span>Comprar Bitcoin</span>
              </button>

              <button class="action-btn secondary" (click)="goToMyAds()">
                <div class="btn-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <span>Vender Bitcoin</span>
              </button>
            </div>
          </div>

          <!-- Wallet Section -->
          <div class="action-group">
            <h3 class="group-title">Carteira</h3>
            <div class="actions-grid compact">
              <button class="action-btn" (click)="openReceiveBitcoinModal()">
                <div class="btn-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M19 12L12 19L5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <span>Receber</span>
              </button>

              <button class="action-btn" (click)="goToSendBitcoin()">
                <div class="btn-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 12L12 5L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <span>Enviar</span>
              </button>

              @if (isEmbeddedWallet()) {
                <button class="action-btn" (click)="goToWalletManagement()">
                  <div class="btn-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 15v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <path d="M8 11V7a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <span>Gerenciar</span>
                </button>
              }
            </div>
          </div>

          <!-- BTC Pegging Section -->
           <!-- REMOVED THIS FUNCTION FROM THE USER TO TEST MORE -->
          <!-- <div class="action-group">
            <h3 class="group-title">Peg BTC/sBTC</h3>
            <div class="actions-grid compact">
              <button class="action-btn pegging" (click)="goToBtcToSbtc()">
                <div class="btn-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M7 16V4M7 4L3 8M7 4L11 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M17 8V20M17 20L21 16M17 20L13 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <span>BTC → sBTC</span>
              </button>

              <button class="action-btn pegging" (click)="goToSbtcToBtc()">
                <div class="btn-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M7 8V20M7 20L3 16M7 20L11 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M17 16V4M17 4L21 8M17 4L13 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <span>sBTC → BTC</span>
              </button>
            </div>
          </div> -->

          <!-- Admin Section -->
          @if (isManager()) {
            <div class="action-group">
              <h3 class="group-title">Administração</h3>
              <div class="actions-grid compact">
                <button class="action-btn admin" (click)="goToDisputeManagement()">
                  <div class="btn-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 9V13L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </div>
                  <span>Disputas</span>
                </button>

                <button class="action-btn admin" (click)="goToSendInvite()">
                  <div class="btn-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <span>Convites</span>
                </button>

                <button class="action-btn admin" (click)="goToPaymentRequests()">
                  <div class="btn-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2V22" stroke="currentColor" stroke-width="2"/>
                      <path d="M17 5H9.5C8.11929 5 7 6.11929 7 7.5V7.5C7 8.88071 8.11929 10 9.5 10H14.5C15.8807 10 17 11.1193 17 12.5V12.5C17 13.8807 15.8807 15 14.5 15H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <span>Pagamentos</span>
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Recent Activity -->
        <div class="activity-section">
          <div class="section-header">
            <h2 class="section-title">Compras Recentes</h2>
            <button class="btn btn-outline btn-sm" (click)="loadRecentOrders()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Atualizar
            </button>
          </div>
          @if (recentTransactions().length > 0) {
            <div class="activity-list">
              @for (transaction of recentTransactions(); track transaction.id) {
                <app-transaction-card
                  [transaction]="transaction"
                  [paymentRequest]="paymentRequests().get(transaction.id)"
                  [isLoadingPayment]="loadingPaymentRequest() === transaction.id"
                  (cardClick)="onTransactionClick($event)"
                />
              }
            </div>

            @if (hasMoreBuys()) {
              <div class="load-more-section">
                <button
                  class="btn btn-outline load-more-btn"
                  (click)="loadMoreBuys()"
                  [disabled]="isLoadingMore()"
                >
                  @if (isLoadingMore()) {
                    <div class="loading-spinner-sm"></div>
                    Carregando...
                  } @else {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M5 12L12 19L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Carregar mais transações
                  }
                </button>
              </div>
            }
          } @else {
            <div class="empty-transactions">
              <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 8V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h3>Nenhuma transação encontrada</h3>
              <p>Você ainda não fez nenhuma compra de Bitcoin. Que tal começar agora?</p>
              <button class="btn btn-primary" (click)="goToBuy()">Comprar Bitcoin</button>
            </div>
          }
        </div>
      </div>

      <!-- Receive Bitcoin Modal -->
      @if (showReceiveModal()) {
        <div class="modal-overlay" (click)="closeReceiveBitcoinModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Receber Bitcoin</h2>
              <button class="modal-close" (click)="closeReceiveBitcoinModal()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="info-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>Este é seu endereço para receber sBTC na Stacks Blockchain</p>
              </div>
              <div class="wallet-address-container">
                <label class="form-label">Endereço da Carteira</label>
                <div class="address-display">
                  <code>{{ walletAddress() }}</code>
                  <button class="btn-copy" (click)="copyAddress()" [disabled]="addressCopied()">
                    @if (addressCopied()) {
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      Copiado!
                    } @else {
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      Copiar
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`

    .dashboard {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 24px 0;
    }

    /* Header */
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid #E5E7EB;
    }

    .dashboard-title {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 6px 0;
    }

    .dashboard-subtitle {
      font-size: 15px;
      color: #6B7280;
      margin: 0;
    }

    .wallet-balance {
      text-align: right;
      padding: 16px 20px;
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      border-radius: 12px;
      min-width: 200px;
    }

    .balance-label {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .balance-amount {
      font-size: 24px;
      font-weight: 700;
      color: white;
      margin-bottom: 4px;
    }

    .balance-sats {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
    }

    .balance-brl {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.95);
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
    }

    .balance-loading {
      display: flex;
      justify-content: flex-end;
      padding: 12px 0;
    }

    .wallet-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #16A34A;
      color: white;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
    }

    /* Actions Section */
    .actions-section {
      margin-bottom: 32px;
    }

    .action-group {
      margin-bottom: 24px;
    }

    .action-group:last-child {
      margin-bottom: 0;
    }

    .group-title {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 12px 0;
    }

    .actions-grid.compact {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 20px 16px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
      font-size: 14px;
      font-weight: 500;
      color: #1F2937;
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px 0 rgb(0 0 0 / 0.1);
      border-color: #F59E0B;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: white;
      border-color: #F59E0B;
    }

    .action-btn.primary:hover {
      background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
      border-color: #D97706;
    }

    .action-btn.secondary {
      background: #FFFFFF;
      color: #1F2937;
      border: 2px solid #F59E0B;
    }

    .action-btn.secondary:hover {
      background: #FEF3C7;
      border-color: #D97706;
    }

    .action-btn.admin {
      background: #F9FAFB;
      color: #6B7280;
      border-color: #D1D5DB;
    }

    .action-btn.admin:hover {
      background: #F3F4F6;
      border-color: #9CA3AF;
      color: #374151;
    }

    .action-btn.pegging {
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      color: white;
      border-color: #8B5CF6;
    }

    .action-btn.pegging:hover {
      background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
      border-color: #7C3AED;
    }

    .action-btn.pegging .btn-icon {
      background: rgba(255, 255, 255, 0.2);
    }

    .btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.05);
    }

    .action-btn.primary .btn-icon {
      background: rgba(255, 255, 255, 0.2);
    }

    .action-btn.secondary .btn-icon {
      background: rgba(245, 158, 11, 0.1);
      color: #F59E0B;
    }

    .action-btn span {
      text-align: center;
      line-height: 1.3;
    }

    /* Dashboard-specific button overrides */
    .btn-outline:hover:not(:disabled) {
      border-color: #1E40AF;
      color: #1E40AF;
    }

    /* Activity Section */
    .activity-section {
      margin-bottom: 32px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Load More Section */
    .load-more-section {
      display: flex;
      justify-content: center;
      padding: 20px 0;
      margin-top: 12px;
    }

    .load-more-btn {
      min-width: 200px;
      transition: all 0.2s ease;
    }

    .load-more-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px 0 rgb(0 0 0 / 0.1);
    }

    /* Empty Transactions State */
    .empty-transactions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px 24px;
      text-align: center;
      background: #FFFFFF;
      border-radius: 12px;
      border: 2px dashed #E5E7EB;
    }

    .empty-transactions .empty-icon {
      color: #9CA3AF;
    }

    .empty-transactions h3 {
      font-size: 18px;
      color: #1F2937;
      margin: 0;
      font-weight: 600;
    }

    .empty-transactions p {
      color: #6B7280;
      margin: 0;
      max-width: 300px;
      font-size: 14px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .dashboard {
        padding: 20px 0;
      }

      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
        margin-bottom: 24px;
        padding-bottom: 12px;
      }

      .dashboard-title {
        font-size: 24px;
      }

      .dashboard-subtitle {
        font-size: 14px;
      }

      .wallet-balance {
        align-self: stretch;
        width: 100%;
        min-width: auto;
      }

      .balance-amount {
        font-size: 20px;
      }

      .actions-section {
        margin-bottom: 24px;
      }

      .action-group {
        margin-bottom: 20px;
      }

      .group-title {
        font-size: 15px;
      }

      .actions-grid.compact {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .action-btn {
        padding: 16px 12px;
        font-size: 13px;
      }

      .btn-icon {
        width: 36px;
        height: 36px;
      }

      .activity-section {
        margin-bottom: 24px;
      }

      .section-title {
        font-size: 16px;
      }

      .empty-transactions {
        padding: 32px 20px;
      }
    }

    @media (max-width: 480px) {
      .dashboard {
        padding: 16px 0;
      }

      .dashboard-title {
        font-size: 22px;
      }

      .dashboard-header {
        gap: 16px;
        margin-bottom: 20px;
      }

      .actions-grid.compact {
        grid-template-columns: 1fr;
      }

      .action-btn {
        flex-direction: row;
        justify-content: flex-start;
        gap: 12px;
        padding: 14px 16px;
      }

      .btn-icon {
        width: 40px;
        height: 40px;
      }

      .action-btn span {
        text-align: left;
      }

      .empty-transactions {
        padding: 28px 16px;
      }
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #E5E7EB;
    }

    .modal-header h2 {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin: 0;
    }

    .modal-close {
      background: none;
      border: none;
      color: #6B7280;
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .modal-close:hover {
      background: #F3F4F6;
      color: #1F2937;
    }

    .modal-body {
      padding: 24px;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .info-banner {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #DBEAFE;
      border: 1px solid #93C5FD;
      border-radius: 8px;
      color: #1E40AF;
      margin-bottom: 24px;
    }

    .info-banner svg {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .info-banner p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .error-banner {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #FEE2E2;
      border: 1px solid #FCA5A5;
      border-radius: 8px;
      color: #991B1B;
      margin-bottom: 24px;
    }

    .error-banner svg {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .error-banner p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .success-banner {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #D1FAE5;
      border: 1px solid #6EE7B7;
      border-radius: 8px;
      color: #065F46;
      margin-bottom: 24px;
    }

    .success-banner svg {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .success-banner p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .wallet-address-container {
      margin-bottom: 16px;
    }

    .address-display {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      margin-top: 8px;
    }

    .address-display code {
      flex: 1;
      font-size: 13px;
      color: #1F2937;
      word-break: break-all;
      font-family: 'Courier New', monospace;
    }

    .btn-copy {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #F59E0B;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-copy:hover:not(:disabled) {
      background: #D97706;
    }

    .btn-copy:disabled {
      background: #16A34A;
      cursor: not-allowed;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .form-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      color: #1F2937;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #F59E0B;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    }

    .form-hint {
      display: block;
      font-size: 12px;
      color: #6B7280;
      margin-top: 6px;
    }

    @media (max-width: 480px) {
      .modal-content {
        margin: 0;
        max-height: 100vh;
        border-radius: 0;
      }

      .modal-actions {
        flex-direction: column;
      }

      .modal-actions button {
        width: 100%;
      }

      .address-display {
        flex-direction: column;
        align-items: stretch;
      }

      .btn-copy {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private userService = inject(UserService);
  private walletManagerService = inject(WalletManagerService);
  private buyService = inject(BuyService);
  private paymentRequestService = inject(PaymentRequestService);
  private sBTCTokenService = inject(sBTCTokenService);
  private quoteService = inject(QuoteService);

  recentOrders = signal<any[]>([]);
  currentPage = signal<number>(1);
  hasMoreBuys = signal<boolean>(false);
  isLoadingMore = signal<boolean>(false);
  paymentRequests = signal<Map<string, PaymentRequest>>(new Map());
  loadingPaymentRequest = signal<string | null>(null);

  // Receive modal states
  showReceiveModal = signal<boolean>(false);
  walletAddress = signal<string>('');
  addressCopied = signal<boolean>(false);

  // sBTC balance
  sBtcBalance = signal<bigint>(BigInt(0));
  isLoadingBalance = signal<boolean>(false);
  btcPriceInCents = signal<number>(0);

  // Auto-refresh timer
  private refreshTimeout: any = null;

  ngOnInit() {
    this.loadRecentOrders();
    this.walletAddress.set(this.walletManagerService.getSTXAddress() || '');
    this.loadBalance();
    this.loadBtcPrice();
  }

  ngOnDestroy() {
    // Clear the refresh timeout when component is destroyed
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  loadBalance() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      // Only show loading spinner if there's no balance loaded yet
      const hasExistingBalance = this.sBtcBalance() !== BigInt(0);
      if (!hasExistingBalance) {
        this.isLoadingBalance.set(true);
      }
      
      this.sBTCTokenService.getBalance().subscribe({
        next: (balance) => {
          this.sBtcBalance.set(balance);
          this.isLoadingBalance.set(false);
        },
        error: (error) => {
          console.error('Error fetching sBTC balance:', error);
          this.isLoadingBalance.set(false);
        }
      });
    }
  }

  loadBtcPrice() {
    this.quoteService.getBtcPrice().subscribe({
      next: (response) => {
        this.btcPriceInCents.set(parseInt(response.price));
      },
      error: (error) => {
        console.error('Error fetching BTC price:', error);
      }
    });
  }

  formatBalanceInBRL(): string {
    const balanceInSats = Number(this.sBtcBalance());
    const priceInCents = this.btcPriceInCents();

    if (balanceInSats === 0 || priceInCents === 0) {
      return 'R$ 0,00';
    }

    // Convert satoshis to BTC (1 BTC = 100,000,000 sats)
    const balanceInBTC = balanceInSats / 100000000;

    // Price is in cents, so convert to reais (divide by 100)
    const priceInReais = priceInCents / 100;

    // Calculate total value in BRL
    const valueInBRL = balanceInBTC * priceInReais;

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valueInBRL);
  }

  currentUser = this.userService.currentUser;
  currentBtcPrice = this.userService.currentBtcPrice;

  recentTransactions() {
    return this.recentOrders();
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/']);
  }

  goToBuy() {
    this.router.navigate(['/buy']);
  }

  goToMyAds() {
    this.router.navigate(['/my-ads']);
  }

  goToDisputeManagement() {
    this.router.navigate(['/dispute-management']);
  }

  goToSendInvite() {
    this.router.navigate(['/send-invite']);
  }

  goToPaymentRequests() {
    this.router.navigate(['/payment-requests']);
  }

  goToSendBitcoin() {
    this.router.navigate(['/send/sBTC']);
  }

  goToWalletManagement() {
    this.router.navigate(['/wallet']);
  }

  goToBtcToSbtc() {
    this.router.navigate(['/btc-to-sbtc']);
  }

  goToSbtcToBtc() {
    this.router.navigate(['/sbtc-to-btc']);
  }

  onTransactionClick(transaction: any) {
    // Only navigate if the transaction is pending
    if (transaction.status === BuyStatus.Pending) {
      this.router.navigate(['/buy', transaction.id]);
    }
  }

  isManager(): boolean {
    const currentAddress = this.walletManagerService.getSTXAddress();
    return currentAddress === environment.b2pixAddress;
  }

  isEmbeddedWallet(): boolean {
    return this.walletManagerService.getWalletType() === WalletType.EMBEDDED;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
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
    const btc = sats / 100000000; // Convert satoshis to BTC
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

  getStatusClass(status: BuyStatus): string {
    switch (status) {
      // case BuyStatus.Completed:
      case BuyStatus.PaymentConfirmed:
      case BuyStatus.DisputeFavorBuyer:
      case BuyStatus.DisputeResolvedBuyer:
        return 'completed';
      case BuyStatus.Pending:
        return 'pending';
      case BuyStatus.Paid:
        return 'processing';
      case BuyStatus.Cancelled:
      case BuyStatus.Expired:
        return 'warning';
      case BuyStatus.InDispute:
      case BuyStatus.DisputeFavorSeller:
      case BuyStatus.DisputeResolvedSeller:
        return 'warning';
      default:
        return 'warning';
    }
  }

  getStatusLabel(status: BuyStatus): string {
    switch (status) {
      case BuyStatus.Pending:
        return 'Pendente';
      case BuyStatus.Paid:
        return 'Verificando Pagamento';
      case BuyStatus.PaymentConfirmed:
        return 'Pagamento Confirmado';
      // case BuyStatus.Completed:
      //   return 'Concluída';
      case BuyStatus.Cancelled:
        return 'Cancelada';
      case BuyStatus.Expired:
        return 'Expirada';
      case BuyStatus.InDispute:
        return 'Em Disputa';
      case BuyStatus.DisputeFavorBuyer:
        return 'Disputa a Favor do Comprador';
      case BuyStatus.DisputeFavorSeller:
        return 'Disputa a Favor do Vendedor';
      case BuyStatus.DisputeResolvedBuyer:
        return 'Disputa Resolvida a Favor do Comprador';
      case BuyStatus.DisputeResolvedSeller:
        return 'Disputa Resolvida a Favor do Vendedor';
      default:
        return 'Em análise';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR');
  }

  getTransactionTitle(transaction: any): string {
    if (transaction.type === 'buy') return 'Compra de Bitcoin';
    if (transaction.type === 'sell') return 'Venda de Bitcoin';
    return 'Transação';
  }

  getTransactionDetails(transaction: any): string {
    const amount = transaction.amount || '0';
    const price = transaction.price || '0';
    return `${amount} BTC por R$ ${this.formatCurrency(parseFloat(price))}`;
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const transactionDate = new Date(date);
    const diffInMs = now.getTime() - transactionDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays}d atrás`;
    } else if (diffInHours > 0) {
      return `${diffInHours}h atrás`;
    } else {
      return 'Agora mesmo';
    }
  }

  loadRecentOrders(append: boolean = false) {
    const currentAddress = this.walletManagerService.getSTXAddress();
    if (currentAddress) {
      const page = append ? this.currentPage() : 1;

      if (append) {
        this.isLoadingMore.set(true);
      } else {
        // When refreshing (not appending), also update balance and BTC price
        this.loadBalance();
        this.loadBtcPrice();
      }

      this.buyService.getBuysByAddress(currentAddress, {
        page: page,
        limit: 3,
        sort_by: 'created_at',
        sort_order: 'desc'
      }).subscribe({
        next: (response) => {
          const mappedBuys = response.buys.map(buy => ({
            id: buy.id,
            type: 'buy',
            amount: buy.amount,
            price: buy.pay_value,
            payValue: buy.pay_value,
            pricePerBtc: buy.price,
            status: buy.status,
            createdAt: buy.created_at
          }));

          if (append) {
            // Append new buys to existing ones
            this.recentOrders.set([...this.recentOrders(), ...mappedBuys]);
            this.isLoadingMore.set(false);
          } else {
            // Replace with new buys (initial load)
            this.recentOrders.set(mappedBuys);
            this.currentPage.set(1);

            // Clear and reload payment requests for the new transactions
            this.paymentRequests.set(new Map());

            // Automatically load payment requests for specific statuses
            this.loadPaymentRequestsForCompletedBuys(mappedBuys);
          }

          // Check if there are more pages available
          this.hasMoreBuys.set(response.has_more);

          // Start auto-refresh if there are orders that need monitoring
          if (!append) {
            this.scheduleAutoRefresh();
          }
        },
        error: (error) => {
          console.error('Error loading recent orders:', error);
          if (!append) {
            this.recentOrders.set([]);
          }
          this.isLoadingMore.set(false);
        }
      });
    }
  }

  loadMoreBuys() {
    this.currentPage.set(this.currentPage() + 1);
    this.loadRecentOrders(true);
  }

  formatTransactionId(txId: string): string {
    if (!txId || txId.length <= 12) return txId;
    return `${txId.substring(0, 8)}...${txId.substring(txId.length - 4)}`;
  }

  getBlockchainExplorerUrl(txId: string): string {
    // Add 0x prefix if not present and generate Hiro explorer link
    const transactionId = txId.startsWith('0x') ? txId : `0x${txId}`;
    const chain = environment.network === 'mainnet' ? 'mainnet' : 'testnet';
    return `https://explorer.hiro.so/txid/${transactionId}?chain=${chain}`;
  }

  /**
   * Automatically load payment requests for buys with specific statuses
   * Only loads for PaymentConfirmed and DisputeResolvedBuyer statuses
   */
  private loadPaymentRequestsForCompletedBuys(buys: any[]) {
    const buysNeedingPaymentInfo = buys.filter(buy =>
      buy.status === BuyStatus.PaymentConfirmed ||
      buy.status === BuyStatus.DisputeResolvedBuyer
    );

    buysNeedingPaymentInfo.forEach(buy => {
      this.loadPaymentRequest(buy.id);
    });
  }

  loadPaymentRequest(buyId: string) {
    this.loadingPaymentRequest.set(buyId);

    this.paymentRequestService.getPaymentRequestsBySource(PaymentSourceType.Buy, buyId).subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          const newMap = new Map(this.paymentRequests());
          newMap.set(buyId, response.data[0]);
          this.paymentRequests.set(newMap);
        }
        this.loadingPaymentRequest.set(null);
      },
      error: (error) => {
        console.error('Error loading payment request:', error);
        this.loadingPaymentRequest.set(null);
      }
    });
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

  // Receive Bitcoin modal methods
  openReceiveBitcoinModal() {
    this.showReceiveModal.set(true);
    this.addressCopied.set(false);
  }

  closeReceiveBitcoinModal() {
    this.showReceiveModal.set(false);
    this.addressCopied.set(false);
  }

  copyAddress() {
    const address = this.walletAddress();
    if (address) {
      navigator.clipboard.writeText(address).then(() => {
        this.addressCopied.set(true);
        setTimeout(() => {
          this.addressCopied.set(false);
        }, 2000);
      });
    }
  }

  /**
   * Check if any orders need monitoring (have active statuses)
   * Returns true if at least one order is not in a final state
   */
  private hasOrdersNeedingMonitoring(): boolean {
    const orders = this.recentOrders();
    if (orders.length === 0) {
      return false;
    }

    // Final states that don't need monitoring
    const finalStatuses = [
      BuyStatus.Cancelled,
      BuyStatus.Expired,
      BuyStatus.PaymentConfirmed,
      // BuyStatus.Completed,
      BuyStatus.DisputeResolvedBuyer,
      BuyStatus.DisputeResolvedSeller
    ];

    // Check if any order is not in a final state
    return orders.some(order => !finalStatuses.includes(order.status));
  }

  /**
   * Schedule auto-refresh if there are orders needing monitoring
   */
  private scheduleAutoRefresh() {
    // Clear any existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }

    // Only schedule if there are orders that need monitoring
    if (this.hasOrdersNeedingMonitoring()) {
      this.refreshTimeout = setTimeout(() => {
        this.loadRecentOrders();
      }, 5000); // 5 seconds
    }
  }

}
