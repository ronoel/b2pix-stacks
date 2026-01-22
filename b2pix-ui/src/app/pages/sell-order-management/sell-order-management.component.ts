import { Component, inject, OnInit, ViewEncapsulation, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SellOrderService } from '../../shared/api/sell-order.service';
import { SellOrder } from '../../shared/models/sell-order.model';
import { SellOrderCardComponent } from './components/sell-order-card.component';

@Component({
  selector: 'app-sell-order-management',
  standalone: true,
  imports: [SellOrderCardComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="sell-order-management">
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
            <h1 class="page-title">Gerenciamento de Vendas</h1>
            <p class="page-subtitle">Confirme pagamentos PIX para ordens de venda confirmadas</p>
          </div>
        </div>

        @if (loading()) {
          <!-- Loading State -->
          <div class="loading-section">
            <div class="loading-spinner"></div>
            <p>Carregando ordens...</p>
          </div>
        } @else if (error()) {
          <!-- Error State -->
          <div class="error-state">
            <div class="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <h2>Erro ao carregar ordens</h2>
            <p>{{ error() }}</p>
            <button class="retry-button" (click)="loadConfirmedOrders()">Tentar Novamente</button>
          </div>
        } @else if (confirmedOrders().length === 0) {
          <!-- Empty State -->
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <h2>Nenhuma ordem aguardando pagamento</h2>
            <p>Não há ordens de venda confirmadas aguardando pagamento no momento.</p>
          </div>
        } @else {
          <!-- Orders List -->
          <div class="orders-list">
            <div class="orders-header">
              <h2>Ordens Confirmadas ({{ confirmedOrders().length }})</h2>
              <button class="btn btn-outline btn-sm" (click)="loadConfirmedOrders()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Atualizar
              </button>
            </div>

            <div class="order-cards">
              @for (order of confirmedOrders(); track order.id) {
                <app-sell-order-card
                  [order]="order"
                  [isProcessing]="processingOrderId() === order.id"
                  (confirmPayment)="onConfirmPayment($event)"
                />
              }
            </div>

            @if (hasMore()) {
              <div class="load-more-section">
                <button
                  class="btn btn-outline load-more-btn"
                  (click)="loadMoreOrders()"
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
                    Carregar mais ordens
                  }
                </button>
              </div>
            }
          </div>
        }

        <!-- Success/Error Toast -->
        @if (toastMessage()) {
          <div class="toast" [class.success]="toastType() === 'success'" [class.error]="toastType() === 'error'">
            @if (toastType() === 'success') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              </svg>
            } @else {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
              </svg>
            }
            <span>{{ toastMessage() }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px;
    }

    .sell-order-management {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 32px 0;
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

    .btn-ghost {
      background: transparent;
      color: #6B7280;
      border: none;
    }

    .btn-ghost:hover:not(:disabled) {
      background: #F3F4F6;
      color: #374151;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #E5E7EB;
      color: #374151;
    }

    .btn-outline:hover:not(:disabled) {
      background: #F3F4F6;
      border-color: #D1D5DB;
    }

    .btn-sm {
      padding: 8px 16px;
      font-size: 13px;
    }

    /* Loading State */
    .loading-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 0;
      text-align: center;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #E5E7EB;
      border-top: 4px solid #F59E0B;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 0;
      text-align: center;
    }

    .empty-icon {
      color: #9CA3AF;
      margin-bottom: 24px;
    }

    .empty-state h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 12px 0;
    }

    .empty-state p {
      font-size: 16px;
      color: #6B7280;
      margin: 0;
    }

    /* Error State */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 0;
      text-align: center;
    }

    .error-icon {
      color: #DC2626;
      margin-bottom: 24px;
    }

    .error-state h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 12px 0;
    }

    .error-state p {
      font-size: 16px;
      color: #6B7280;
      margin: 0 0 24px 0;
    }

    .retry-button {
      padding: 12px 24px;
      background: #F59E0B;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retry-button:hover {
      background: #D97706;
      transform: translateY(-1px);
    }

    /* Orders List */
    .orders-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .orders-header h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .order-cards {
      display: flex;
      flex-direction: column;
      gap: 24px;
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

    .loading-spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 0, 0, 0.3);
      border-top: 2px solid #374151;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 10px 25px -3px rgb(0 0 0 / 0.1);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    }

    .toast.success {
      background: #D1FAE5;
      color: #065F46;
      border: 1px solid #6EE7B7;
    }

    .toast.error {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FCA5A5;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .sell-order-management {
        padding: 24px 0;
      }

      .container {
        padding: 0 12px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .page-title {
        font-size: 28px;
      }

      .page-subtitle {
        font-size: 14px;
      }

      .orders-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .toast {
        left: 16px;
        right: 16px;
        bottom: 16px;
      }
    }

    @media (max-width: 480px) {
      .sell-order-management {
        padding: 16px 0;
      }

      .container {
        padding: 0 8px;
      }

      .page-title {
        font-size: 24px;
      }
    }
  `]
})
export class SellOrderManagementComponent implements OnInit {
  private router = inject(Router);
  private sellOrderService = inject(SellOrderService);

  // Signals
  confirmedOrders = signal<SellOrder[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  processingOrderId = signal<string | null>(null);

  // Pagination
  currentPage = signal(1);
  hasMore = signal(false);
  isLoadingMore = signal(false);

  // Toast
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  ngOnInit() {
    this.loadConfirmedOrders();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadConfirmedOrders(append: boolean = false) {
    if (append) {
      this.isLoadingMore.set(true);
    } else {
      this.loading.set(true);
      this.currentPage.set(1);
    }

    this.error.set(null);

    const page = append ? this.currentPage() : 1;

    this.sellOrderService.getConfirmedSellOrders({ page, limit: 5 }).subscribe({
      next: (response) => {
        if (append) {
          this.confirmedOrders.set([...this.confirmedOrders(), ...response.items]);
          this.isLoadingMore.set(false);
        } else {
          this.confirmedOrders.set(response.items);
          this.loading.set(false);
        }
        this.hasMore.set(response.has_more);
      },
      error: (error) => {
        console.error('Error loading confirmed sell orders:', error);
        this.error.set('Erro ao carregar ordens confirmadas. Tente novamente.');
        this.loading.set(false);
        this.isLoadingMore.set(false);
      }
    });
  }

  loadMoreOrders() {
    this.currentPage.set(this.currentPage() + 1);
    this.loadConfirmedOrders(true);
  }

  onConfirmPayment(event: { orderId: string; pixId: string | null }) {
    this.processingOrderId.set(event.orderId);

    this.sellOrderService.confirmPayment(event.orderId, event.pixId).subscribe({
      next: () => {
        // Remove from list
        const current = this.confirmedOrders();
        this.confirmedOrders.set(current.filter(o => o.id !== event.orderId));
        this.processingOrderId.set(null);

        // Show success toast
        this.showToast('Pagamento confirmado com sucesso!', 'success');
      },
      error: (error) => {
        console.error('Error confirming payment:', error);
        this.processingOrderId.set(null);

        // Extract error message
        let errorMessage = 'Erro ao confirmar pagamento';
        if (error.error?.error) {
          errorMessage = error.error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.showToast(errorMessage, 'error');
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toastMessage.set(message);
    this.toastType.set(type);

    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }
}
