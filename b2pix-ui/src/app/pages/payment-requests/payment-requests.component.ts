import { Component, inject, OnInit, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PaymentRequestService } from '../../shared/api/payment-request.service';
import { PaymentRequest, PaymentRequestStatus, PaymentSourceType } from '../../shared/models/payment-request.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment-requests',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="payment-requests">
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
            <h1 class="page-title">Gerenciar Pagamentos</h1>
            <p class="page-subtitle">Visualize e gerencie todas as solicitações de pagamento</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-outline btn-sm" (click)="refreshPayments()" [disabled]="loading()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Atualizar
            </button>
          </div>
        </div>

        <!-- Tabs Section -->
        <div class="tabs-section">
          <div class="tabs">
            <button
              class="tab"
              [class.active]="selectedTab() === 'attention'"
              (click)="setTab('attention')">
              <span class="tab-label">Aguardando Atenção</span>
              <span class="tab-count">{{ getAttentionCount() }}</span>
            </button>
            <button
              class="tab"
              [class.active]="selectedTab() === 'processing'"
              (click)="setTab('processing')">
              <span class="tab-label">Em Processamento</span>
              <span class="tab-count">{{ getProcessingCount() }}</span>
            </button>
            <button
              class="tab"
              [class.active]="selectedTab() === 'failed'"
              (click)="setTab('failed')">
              <span class="tab-label">Falhados</span>
              <span class="tab-count">{{ getFailedCount() }}</span>
            </button>
            <button
              class="tab"
              [class.active]="selectedTab() === 'completed'"
              (click)="setTab('completed')">
              <span class="tab-label">Concluídos</span>
              <span class="tab-count">{{ getCompletedCount() }}</span>
            </button>
          </div>
        </div>

        @if (loading()) {
          <!-- Loading State -->
          <div class="loading-section">
            <div class="loading-spinner"></div>
            <p>Carregando solicitações de pagamento...</p>
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
            <h2>Erro ao carregar pagamentos</h2>
            <p>{{ error() }}</p>
            <button class="retry-button" (click)="loadPaymentRequests()">Tentar Novamente</button>
          </div>
        } @else if (paymentRequests().length === 0) {
          <!-- Empty State -->
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <h2>Nenhuma solicitação de pagamento</h2>
            <p>Não há solicitações de pagamento nesta categoria no momento.</p>
          </div>
        } @else {
          <!-- Payment Requests List -->
          <div class="payments-list">
            <div class="payments-header">
              <h2>Solicitações de Pagamento ({{ paymentRequests().length }}{{ hasMore() ? '+' : '' }})</h2>
            </div>

            <div class="payment-cards">
              @for (payment of paymentRequests(); track payment.id) {
                <div class="payment-card">
                  <div class="payment-header">
                    <div class="payment-id">
                      <strong>ID:</strong> <span class="mono-text">{{ payment.id.substring(0, 20) }}...</span>
                    </div>
                    <div class="payment-status">
                      <span class="status-badge" [ngClass]="getStatusClass(payment.status)">
                        {{ getStatusText(payment.status) }}
                      </span>
                    </div>
                  </div>

                  <div class="payment-details">
                    <div class="detail-row">
                      <span class="label">Tipo:</span>
                      <span class="value">{{ getSourceTypeText(payment.source_type) }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">ID da Origem:</span>
                      <span class="value mono-text">{{ payment.source_id }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Endereço do Destinatário:</span>
                      <span class="value mono-text">{{ formatAddress(payment.receiver_address) }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Valor (sats):</span>
                      <span class="value">{{ formatSatoshis(payment.amount) }}</span>
                    </div>
                    @if (payment.blockchain_tx_id) {
                      <div class="detail-row">
                        <span class="label">TX ID:</span>
                        <span class="value">
                          <a
                            class="tx-link"
                            [href]="getBlockchainExplorerLink(payment.blockchain_tx_id)"
                            target="_blank"
                            (click)="$event.stopPropagation()">
                            {{ formatAddress(payment.blockchain_tx_id) }}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              <path d="M15 3H21V9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </a>
                        </span>
                      </div>
                    }
                    <div class="detail-row">
                      <span class="label">Criado em:</span>
                      <span class="value">{{ formatDate(payment.created_at) }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Atualizado em:</span>
                      <span class="value">{{ formatDate(payment.updated_at) }}</span>
                    </div>
                  </div>

                  <!-- Payment Actions -->
                  @if (payment.status === PaymentRequestStatus.Waiting) {
                    <div class="payment-actions">
                      <button
                        class="btn btn-primary"
                        (click)="payPaymentRequest(payment); $event.stopPropagation()"
                        [disabled]="processingPayment() === payment.id">
                        @if (processingPayment() === payment.id) {
                          <div class="btn-spinner"></div>
                          Processando...
                        } @else {
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2V22" stroke="currentColor" stroke-width="2"/>
                            <path d="M17 5H9.5C8.11929 5 7 6.11929 7 7.5V7.5C7 8.88071 8.11929 10 9.5 10H14.5C15.8807 10 17 11.1193 17 12.5V12.5C17 13.8807 15.8807 15 14.5 15H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                          Pagar
                        }
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Pagination -->
            <div class="pagination">
              <button
                class="btn btn-outline"
                [disabled]="currentPage() === 1"
                (click)="previousPage()">
                Anterior
              </button>
              <span class="page-info">Página {{ currentPage() }}</span>
              <button
                class="btn btn-outline"
                [disabled]="!hasMore()"
                (click)="nextPage()">
                Próxima
              </button>
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

    .payment-requests {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 0;
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

    .header-actions {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    /* Tabs Section */
    .tabs-section {
      margin-bottom: 32px;
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      padding: 8px;
    }

    .tabs {
      display: flex;
      gap: 8px;
    }

    .tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: #6B7280;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .tab:hover:not(.active) {
      background: #F9FAFB;
      color: #374151;
    }

    .tab.active {
      background: #3B82F6;
      color: #FFFFFF;
    }

    .tab-label {
      display: inline;
    }

    .tab-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
    }

    .tab:not(.active) .tab-count {
      background: #E5E7EB;
      color: #6B7280;
    }

    .tab.active .tab-count {
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
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
      background: #FFFFFF;
      color: #374151;
      border: 1px solid #E5E7EB;
    }

    .btn-outline:hover:not(:disabled) {
      border-color: #3B82F6;
      color: #3B82F6;
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
      border-top-color: #3B82F6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Error State */
    .error-state {
      text-align: center;
      padding: 64px 24px;
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #FCA5A5;
    }

    .error-icon {
      margin: 0 auto 24px;
      color: #DC2626;
    }

    .error-state h2 {
      font-size: 22px;
      font-weight: 700;
      color: #991B1B;
      margin: 0 0 12px 0;
    }

    .error-state p {
      color: #B91C1C;
      margin: 0 0 28px 0;
      font-size: 16px;
    }

    .retry-button {
      padding: 12px 24px;
      background: #DC2626;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retry-button:hover {
      background: #B91C1C;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 64px 24px;
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
    }

    .empty-icon {
      margin: 0 auto 24px;
      color: #9CA3AF;
    }

    .empty-state h2 {
      font-size: 22px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 12px 0;
    }

    .empty-state p {
      color: #6B7280;
      margin: 0;
      font-size: 16px;
    }

    /* Payment Cards */
    .payments-list {
      margin-top: 32px;
    }

    .payments-header {
      margin-bottom: 24px;
    }

    .payments-header h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1F2937;
      margin: 0;
    }

    .payment-cards {
      display: grid;
      gap: 20px;
    }

    .payment-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 24px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .payment-card:hover {
      border-color: #3B82F6;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }

    .payment-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      gap: 16px;
    }

    .payment-id {
      font-size: 14px;
      color: #374151;
      word-break: break-all;
    }

    .payment-id strong {
      color: #1F2937;
    }

    .payment-status {
      flex-shrink: 0;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.waiting {
      background: #FEF3C7;
      color: #92400E;
    }

    .status-badge.processing {
      background: #DBEAFE;
      color: #1E40AF;
    }

    .status-badge.broadcast {
      background: #E0E7FF;
      color: #3730A3;
    }

    .status-badge.failed {
      background: #FEE2E2;
      color: #991B1B;
    }

    .status-badge.confirmed {
      background: #DCFCE7;
      color: #166534;
    }

    .payment-details {
      display: grid;
      gap: 12px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 0;
      border-bottom: 1px solid #F3F4F6;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row .label {
      font-size: 13px;
      color: #6B7280;
      font-weight: 500;
      flex-shrink: 0;
    }

    .detail-row .value {
      font-size: 13px;
      color: #1F2937;
      font-weight: 600;
      text-align: right;
      word-break: break-all;
    }

    .mono-text {
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }

    .tx-link {
      color: #3B82F6;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: color 0.2s ease;
    }

    .tx-link:hover {
      color: #1D4ED8;
      text-decoration: underline;
    }

    /* Payment Actions */
    .payment-actions {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: flex-end;
    }

    .btn-primary {
      background: #3B82F6;
      color: #FFFFFF;
      border: 1px solid #3B82F6;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563EB;
      border-color: #2563EB;
    }

    .btn-primary:disabled {
      background: #93C5FD;
      border-color: #93C5FD;
    }

    .btn-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid #FFFFFF;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* Pagination */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-top: 32px;
      padding: 24px 0;
    }

    .page-info {
      font-size: 14px;
      color: #6B7280;
      font-weight: 600;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .container {
        padding: 0 12px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .header-content {
        width: 100%;
      }

      .page-title {
        font-size: 24px;
      }

      .header-actions {
        width: 100%;
      }

      .tabs {
        flex-direction: column;
      }

      .tab {
        width: 100%;
        justify-content: space-between;
      }

      .payment-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .detail-row {
        flex-direction: column;
        gap: 4px;
      }

      .detail-row .value {
        text-align: left;
      }
    }
  `]
})
export class PaymentRequestsComponent implements OnInit {
  private router = inject(Router);
  private paymentRequestService = inject(PaymentRequestService);

  // Expose enum to template
  PaymentRequestStatus = PaymentRequestStatus;

  // Signals for reactive state management
  paymentRequests = signal<PaymentRequest[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  currentPage = signal<number>(1);
  hasMore = signal<boolean>(false);
  selectedTab = signal<'attention' | 'processing' | 'failed' | 'completed'>('attention');
  processingPayment = signal<string | null>(null);

  ngOnInit() {
    this.loadPaymentRequests();
  }

  loadPaymentRequests() {
    this.loading.set(true);
    this.error.set(null);

    const options: any = {
      page: this.currentPage(),
      limit: 10,
      sort_order: 'desc' as const
    };

    // Filter based on selected tab
    const tab = this.selectedTab();
    if (tab === 'attention') {
      // Waiting only
      options.status = [PaymentRequestStatus.Waiting];
    } else if (tab === 'processing') {
      // Processing and Broadcast
      options.status = [PaymentRequestStatus.Processing, PaymentRequestStatus.Broadcast];
    } else if (tab === 'failed') {
      // Failed only
      options.status = [PaymentRequestStatus.Failed];
    } else if (tab === 'completed') {
      // Confirmed
      options.status = [PaymentRequestStatus.Confirmed];
    }

    this.paymentRequestService.getPaymentRequests(options).subscribe({
      next: (response) => {
        this.paymentRequests.set(response.data);
        this.hasMore.set(response.has_more);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading payment requests:', error);
        this.error.set('Erro ao carregar solicitações de pagamento. Tente novamente.');
        this.loading.set(false);
        this.paymentRequests.set([]);
      }
    });
  }

  setTab(tab: 'attention' | 'processing' | 'failed' | 'completed') {
    this.selectedTab.set(tab);
    this.currentPage.set(1);
    this.loadPaymentRequests();
  }

  getAttentionCount(): number {
    return this.paymentRequests().filter(p =>
      p.status === PaymentRequestStatus.Waiting
    ).length;
  }

  getProcessingCount(): number {
    return this.paymentRequests().filter(p =>
      p.status === PaymentRequestStatus.Processing ||
      p.status === PaymentRequestStatus.Broadcast
    ).length;
  }

  getFailedCount(): number {
    return this.paymentRequests().filter(p =>
      p.status === PaymentRequestStatus.Failed
    ).length;
  }

  getCompletedCount(): number {
    return this.paymentRequests().filter(p =>
      p.status === PaymentRequestStatus.Confirmed
    ).length;
  }

  nextPage() {
    if (this.hasMore()) {
      this.currentPage.update(page => page + 1);
      this.loadPaymentRequests();
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadPaymentRequests();
    }
  }

  refreshPayments() {
    this.loadPaymentRequests();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  getStatusClass(status: PaymentRequestStatus): string {
    switch (status) {
      case PaymentRequestStatus.Waiting:
        return 'waiting';
      case PaymentRequestStatus.Processing:
        return 'processing';
      case PaymentRequestStatus.Broadcast:
        return 'broadcast';
      case PaymentRequestStatus.Failed:
        return 'failed';
      case PaymentRequestStatus.Confirmed:
        return 'confirmed';
      default:
        return 'waiting';
    }
  }

  getStatusText(status: PaymentRequestStatus): string {
    switch (status) {
      case PaymentRequestStatus.Waiting:
        return 'Aguardando';
      case PaymentRequestStatus.Processing:
        return 'Processando';
      case PaymentRequestStatus.Broadcast:
        return 'Broadcast';
      case PaymentRequestStatus.Failed:
        return 'Falhado';
      case PaymentRequestStatus.Confirmed:
        return 'Confirmado';
      default:
        return 'Desconhecido';
    }
  }

  getSourceTypeText(sourceType: PaymentSourceType): string {
    switch (sourceType) {
      case PaymentSourceType.Buy:
        return 'Compra';
      default:
        return 'Desconhecido';
    }
  }

  formatAddress(address: string): string {
    if (!address) return '';
    if (address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  }

  formatSatoshis(satoshis: number): string {
    return new Intl.NumberFormat('pt-BR').format(satoshis) + ' sats';
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

  getBlockchainExplorerLink(txId: string): string {
    // Use the appropriate explorer based on your environment
    const cleanTxId = txId.startsWith('0x') ? txId.substring(2) : txId;
    const chain = environment.network === 'mainnet' ? 'mainnet' : 'testnet';
    return `https://explorer.hiro.so/txid/0x${cleanTxId}?chain=${chain}`;
  }

  payPaymentRequest(payment: PaymentRequest) {
    if (this.processingPayment()) {
      return; // Already processing a payment
    }

    // Confirm payment action
    const confirmMessage = `Confirmar pagamento de ${this.formatSatoshis(payment.amount)} para ${this.formatAddress(payment.receiver_address)}?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    this.processingPayment.set(payment.id);

    this.paymentRequestService.pay(
      payment.id,
      payment.receiver_address,
      BigInt(payment.amount)
    ).subscribe({
      next: (response) => {
        this.processingPayment.set(null);

        // Show success message
        alert('Pagamento processado com sucesso!');

        // Reload payment requests to reflect the updated status
        this.loadPaymentRequests();
      },
      error: (error) => {
        console.error('Error processing payment:', error);
        this.processingPayment.set(null);

        // Show error message
        const errorMessage = error?.message || error?.error?.error || 'Erro ao processar pagamento. Tente novamente.';
        alert(`Erro: ${errorMessage}`);
      }
    });
  }
}
