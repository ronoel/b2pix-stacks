import { Component, inject, OnInit, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BuyService } from '../../shared/api/buy.service';
import { Buy, BuyStatus } from '../../shared/models/buy.model';

@Component({
  selector: 'app-dispute-management',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dispute-management">
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
            <h1 class="page-title">Gerenciamento de Disputas</h1>
            <p class="page-subtitle">Resolva disputas entre compradores e vendedores</p>
          </div>
        </div>

        @if (loading()) {
          <!-- Loading State -->
          <div class="loading-section">
            <div class="loading-spinner"></div>
            <p>Carregando disputas...</p>
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
            <h2>Erro ao carregar disputas</h2>
            <p>{{ error() }}</p>
            <button class="retry-button" (click)="loadDisputedBuys()">Tentar Novamente</button>
          </div>
        } @else if (disputedBuys().length === 0) {
          <!-- Empty State -->
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <h2>Nenhuma disputa ativa</h2>
            <p>Não há disputas pendentes para resolução no momento.</p>
          </div>
        } @else {
          <!-- Disputes List -->
          <div class="disputes-list">
            <div class="disputes-header">
              <h2>Disputas Pendentes ({{ disputedBuys().length }})</h2>
            </div>

            <div class="dispute-cards">
              @for (buy of disputedBuys(); track buy.id) {
                <div class="dispute-card" (click)="viewDisputeDetails(buy.id)">
                  <div class="dispute-header">
                    <div class="dispute-id">
                      <strong>ID:</strong> {{ buy.id }}
                    </div>
                    <div class="dispute-status">
                      <span class="status-badge dispute">{{ getStatusText(buy.status) }}</span>
                    </div>
                  </div>

                  <div class="dispute-details">
                    <div class="detail-row">
                      <span class="label">Valor:</span>
                      <span class="value">R$ {{ formatCurrency(buy.pay_value) }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Bitcoin:</span>
                      <span class="value">{{ formatBitcoin(buy.amount) }} BTC</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Comprador:</span>
                      <span class="value">{{ formatAddress(buy.address_buy) }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Data da Criação:</span>
                      <span class="value">{{ formatDate(buy.created_at) }}</span>
                    </div>
                  </div>

                  <div class="dispute-actions">
                    <div class="action-arrow">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
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
    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px;
    }

    .dispute-management {
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

    /* Disputes List */
    .disputes-header {
      margin-bottom: 24px;
    }

    .disputes-header h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .dispute-cards {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .dispute-card {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 32px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .dispute-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
      border-color: #DC2626;
    }

    .dispute-header {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 200px;
    }

    .dispute-id {
      font-size: 14px;
      color: #1F2937;
      font-weight: 500;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.dispute {
      background: #FEF2F2;
      color: #DC2626;
      border: 1px solid #FECACA;
    }

    .dispute-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .detail-row .label {
      font-size: 14px;
      color: #6B7280;
      font-weight: 500;
      min-width: 120px;
    }

    .detail-row .value {
      font-size: 14px;
      color: #1F2937;
      font-weight: 500;
    }

    .dispute-actions {
      display: flex;
      align-items: center;
    }

    .action-arrow {
      color: #9CA3AF;
      transition: all 0.2s ease;
    }

    .dispute-card:hover .action-arrow {
      color: #DC2626;
      transform: translateX(4px);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .dispute-management {
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

      .dispute-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        padding: 24px;
      }

      .dispute-header {
        min-width: auto;
        width: 100%;
      }

      .dispute-details {
        width: 100%;
      }

      .action-arrow {
        align-self: flex-end;
      }
    }

    @media (max-width: 480px) {
      .dispute-management {
        padding: 16px 0;
      }

      .container {
        padding: 0 8px;
      }

      .page-title {
        font-size: 24px;
      }

      .dispute-card {
        padding: 20px;
        gap: 12px;
      }

      .detail-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .detail-row .label {
        min-width: auto;
        font-size: 12px;
      }

      .detail-row .value {
        font-size: 13px;
      }
    }
  `]
})
export class DisputeManagementComponent implements OnInit {
  private router = inject(Router);
  private buyService = inject(BuyService);

  // Signals
  disputedBuys = signal<Buy[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadDisputedBuys();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadDisputedBuys() {
    this.loading.set(true);
    this.error.set(null);

    this.buyService.getDisputedBuys().subscribe({
      next: (buys) => {
        this.disputedBuys.set(buys);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading disputed buys:', error);
        this.error.set('Erro ao carregar disputas. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  viewDisputeDetails(buyId: string) {
    this.router.navigate(['/dispute-details', buyId]);
  }

  getStatusText(status: BuyStatus): string {
    switch (status) {
      case BuyStatus.InDispute:
        return 'Em Disputa';
      default:
        return status;
    }
  }

  formatCurrency(value: string | number): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    // Convert from cents to BRL by dividing by 100
    const valueInBRL = numValue / 100;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valueInBRL);
  }

  formatBitcoin(value: string | number): string {
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