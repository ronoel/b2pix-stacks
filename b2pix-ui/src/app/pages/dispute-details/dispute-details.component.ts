import { Component, inject, OnInit, ViewEncapsulation, signal } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { BuyOrderService } from '../../shared/api/buy-order.service';
import { BuyOrder, BuyOrderStatus } from '../../shared/models/buy-order.model';

@Component({
  selector: 'app-analyzing-order',
  standalone: true,
  imports: [],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dispute-details">
      <div class="container">
        <!-- Header -->
        <div class="page-header">
          <button class="back-button" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Voltar para Análise de Ordens
          </button>
          <h1 class="page-title">Detalhes da Ordem em Análise</h1>
          <p class="page-subtitle">Analise e resolva esta ordem pendente</p>
        </div>

        @if (loading()) {
          <!-- Loading State -->
          <div class="loading-section">
            <div class="loading-spinner"></div>
            <p>Carregando detalhes da ordem...</p>
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
            <h2>Erro ao carregar ordem</h2>
            <p>{{ error() }}</p>
            <button class="retry-button" (click)="loadOrderDetails()">Tentar Novamente</button>
          </div>
        } @else if (order()) {
          <!-- Order Details -->
          <div class="buy-details">
          <!-- Status Card -->
          <div class="status-card">
            <div class="status-header">
              <h2>Status da Transação</h2>
              <span class="status-badge" [class.analyzing]="order()!.status === 'analyzing'" [class.confirmed]="order()!.status === 'confirmed'" [class.rejected]="order()!.status === 'rejected'">{{ getStatusText(order()!.status) }}</span>
            </div>
            <div class="status-info">
              <div class="info-row">
                <span class="label">ID da Transação:</span>
                <span class="value">{{ order()!.id }}</span>
              </div>
              <div class="info-row">
                <span class="label">Data de Criação:</span>
                <span class="value">{{ formatDate(order()!.created_at) }}</span>
              </div>
              <div class="info-row">
                <span class="label">Última Atualização:</span>
                <span class="value">{{ formatDate(order()!.updated_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Transaction Details -->
          <div class="transaction-details">
            <h2>Detalhes da Transação</h2>
            <div class="details-grid">
              <div class="detail-card">
                <div class="detail-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="detail-content">
                  <h3>Bitcoin</h3>
                  <p class="detail-value">{{ formatBitcoin(order()!.amount) }} BTC</p>
                  <p class="detail-label">Valor em Bitcoin</p>
                </div>
              </div>

              <div class="detail-card">
                <div class="detail-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="detail-content">
                  <h3>Valor PIX</h3>
                  <p class="detail-value">R$ {{ formatCurrency(order()!.buy_value) }}</p>
                  <p class="detail-label">Valor a ser pago</p>
                </div>
              </div>

              <div class="detail-card">
                <div class="detail-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" stroke-width="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="detail-content">
                  <h3>Comprador</h3>
                  <p class="detail-value">{{ formatAddress(order()!.address_buy) }}</p>
                  <p class="detail-label">Endereço da carteira</p>
                </div>
              </div>

              <div class="detail-card">
                <div class="detail-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="detail-content">
                  <h3>Chave PIX</h3>
                  <p class="detail-value">{{ order()!.pix_key }}</p>
                  <p class="detail-label">Chave de recebimento</p>
                </div>
              </div>

            </div>
          </div>

          <!-- Resolution Actions -->
          <div class="resolution-actions">
            <h2>Resolver Análise</h2>
            <p class="resolution-description">
              Escolha uma das opções abaixo para resolver esta análise. Esta ação não pode ser desfeita.
            </p>

            <div class="action-buttons">
              <button
                class="resolution-button buyer"
                (click)="resolveOrder('confirmed')"
                [disabled]="resolving()"
              >
                <div class="button-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" stroke-width="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="button-content">
                  <span class="button-title">Confirmar Ordem</span>
                  <span class="button-description">A ordem será confirmada e o comprador receberá os bitcoins</span>
                </div>
              </button>

              <button
                class="resolution-button seller"
                (click)="resolveOrder('rejected')"
                [disabled]="resolving()"
              >
                <div class="button-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M16 21V19C16 16.7909 14.2091 15 12 15H4C1.79086 15 0 16.7909 0 19V21" stroke="currentColor" stroke-width="2"/>
                    <circle cx="8" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M23 11L20 8L17 11" stroke="currentColor" stroke-width="2"/>
                    <path d="M20 8V16" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="button-content">
                  <span class="button-title">Rejeitar Ordem</span>
                  <span class="button-description">A ordem será rejeitada</span>
                </div>
              </button>
            </div>

            @if (resolving()) {
              <div class="resolution-loading">
                <div class="loading-spinner small"></div>
                <span>Resolvendo ordem...</span>
              </div>
            }
          </div>
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

    .dispute-details {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 32px 0;
    }

    /* Header */
    .page-header {
      margin-bottom: 48px;
      padding-bottom: 24px;
      border-bottom: 1px solid #E5E7EB;
    }

    .back-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: none;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      color: #6B7280;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 24px;
    }

    .back-button:hover {
      background: #F9FAFB;
      border-color: #D1D5DB;
      color: #374151;
    }

    .page-title {
      font-size: 36px;
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

    .loading-spinner.small {
      width: 24px;
      height: 24px;
      border-width: 2px;
      margin-bottom: 0;
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

    /* Buy Details */
    .buy-details {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    /* Status Card */
    .status-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .status-header h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.analyzing {
      background: #FEF3C7;
      color: #D97706;
      border: 1px solid #FCD34D;
    }

    .status-badge.confirmed {
      background: #D1FAE5;
      color: #059669;
      border: 1px solid #6EE7B7;
    }

    .status-badge.rejected {
      background: #FEE2E2;
      color: #DC2626;
      border: 1px solid #FECACA;
    }

    .status-info {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid #F3F4F6;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-row .label {
      font-size: 16px;
      color: #6B7280;
      font-weight: 500;
    }

    .info-row .value {
      font-size: 16px;
      color: #1F2937;
      font-weight: 600;
      font-family: monospace;
    }

    /* Transaction Details */
    .transaction-details {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .transaction-details h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 24px 0;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }

    .detail-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      background: #F9FAFB;
      border: 1px solid #F3F4F6;
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .detail-card:hover {
      background: #F3F4F6;
      transform: translateY(-1px);
    }

    .detail-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #FFFFFF;
      color: #F59E0B;
      flex-shrink: 0;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .detail-content {
      flex: 1;
      min-width: 0;
    }

    .detail-content h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .detail-value {
      font-size: 18px;
      font-weight: 700;
      color: #374151;
      margin: 0 0 4px 0;
      font-family: monospace;
      word-break: break-all;
    }

    .detail-label {
      font-size: 12px;
      color: #6B7280;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Blockchain Link */
    .blockchain-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #3B82F6;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .blockchain-link:hover {
      color: #2563EB;
      text-decoration: underline;
    }

    .external-link-icon {
      margin-left: 2px;
      opacity: 0.7;
    }

    /* Resolution Actions */
    .resolution-actions {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .resolution-actions h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 12px 0;
    }

    .resolution-description {
      font-size: 16px;
      color: #6B7280;
      margin: 0 0 32px 0;
      line-height: 1.6;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .resolution-button {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }

    .resolution-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
    }

    .resolution-button.buyer {
      border-color: #3B82F6;
    }

    .resolution-button.buyer:hover:not(:disabled) {
      background: #EFF6FF;
      border-color: #2563EB;
    }

    .resolution-button.seller {
      border-color: #16A34A;
    }

    .resolution-button.seller:hover:not(:disabled) {
      background: #F0FDF4;
      border-color: #15803D;
    }

    .resolution-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .button-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      color: #FFFFFF;
      flex-shrink: 0;
    }

    .resolution-button.buyer .button-icon {
      background: #3B82F6;
    }

    .resolution-button.seller .button-icon {
      background: #16A34A;
    }

    .button-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .button-title {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
    }

    .button-description {
      font-size: 14px;
      color: #6B7280;
    }

    .resolution-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      font-size: 14px;
      color: #6B7280;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .dispute-details {
        padding: 24px 0;
      }

      .container {
        padding: 0 12px;
      }

      .page-header {
        margin-bottom: 32px;
        padding-bottom: 16px;
      }

      .page-title {
        font-size: 28px;
      }

      .page-subtitle {
        font-size: 14px;
      }

      .status-card,
      .transaction-details,
      .resolution-actions {
        padding: 24px;
      }

      .details-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .detail-card {
        padding: 20px;
        gap: 12px;
      }

      .detail-icon {
        width: 40px;
        height: 40px;
      }

      .status-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .info-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .resolution-button {
        padding: 20px;
        gap: 16px;
      }

      .button-icon {
        width: 40px;
        height: 40px;
      }

      .button-title {
        font-size: 16px;
      }

      .button-description {
        font-size: 13px;
      }
    }

    @media (max-width: 480px) {
      .dispute-details {
        padding: 16px 0;
      }

      .container {
        padding: 0 8px;
      }

      .page-title {
        font-size: 24px;
      }

      .status-card,
      .transaction-details,
      .resolution-actions {
        padding: 20px;
      }

      .detail-card {
        flex-direction: column;
        text-align: center;
        padding: 16px;
      }

      .resolution-button {
        flex-direction: column;
        text-align: center;
        padding: 20px;
        gap: 16px;
      }
    }
  `]
})
export class AnalyzingOrderComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private buyOrderService = inject(BuyOrderService);

  // Signals
  order = signal<BuyOrder | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  resolving = signal(false);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const orderId = params['id'];
      if (orderId) {
        this.loadOrderDetails(orderId);
      } else {
        this.error.set('ID da ordem não encontrado');
        this.loading.set(false);
      }
    });
  }

  loadOrderDetails(orderId?: string) {
    this.loading.set(true);
    this.error.set(null);

    const id = orderId || this.route.snapshot.params['id'];
    if (!id) {
      this.error.set('ID da ordem não encontrado');
      this.loading.set(false);
      return;
    }

    this.buyOrderService.getBuyOrderById(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading order details:', error);
        this.error.set('Erro ao carregar detalhes da ordem. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  resolveOrder(resolution: 'confirmed' | 'rejected') {
    const currentOrder = this.order();
    if (!currentOrder || this.resolving()) return;

    this.resolving.set(true);

    this.buyOrderService.resolveAnalyzingOrder(currentOrder.id, resolution).subscribe({
      next: (updatedOrder) => {
        this.order.set(updatedOrder);
        this.resolving.set(false);
        // Show success message or redirect
        this.router.navigate(['/order-analysis']);
      },
      error: (error) => {
        console.error('Error resolving order:', error);
        this.resolving.set(false);
        alert('Erro ao resolver ordem. Tente novamente.');
      }
    });
  }

  goBack() {
    this.router.navigate(['/order-analysis']);
  }

  getStatusText(status: BuyOrderStatus): string {
    switch (status) {
      case BuyOrderStatus.Analyzing:
        return 'Em Análise';
      case BuyOrderStatus.Confirmed:
        return 'Confirmada';
      case BuyOrderStatus.Rejected:
        return 'Rejeitada';
      default:
        return status;
    }
  }

  formatCurrency(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    // Convert from cents to BRL by dividing by 100
    const valueInBRL = numValue / 100;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valueInBRL);
  }

  formatBitcoin(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '0.00000000';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return (numValue / 100000000).toFixed(8);
  }

  formatAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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
