import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { SellOrderService } from '../../../shared/api/sell-order.service';
import {
  SellOrder,
  OrderStatus,
  isFinalStatus,
  getStatusLabel,
  getStatusClass
} from '../../../shared/models/sell-order.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-sell-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sell-details-page">
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
            <h1 class="page-title">Detalhes da Venda</h1>
            <p class="page-subtitle">Acompanhe o status da sua ordem de venda</p>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Carregando detalhes...</p>
          </div>
        } @else if (error()) {
          <div class="error-state">
            <div class="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <h3>Erro ao carregar</h3>
            <p>{{ error() }}</p>
            <button class="btn btn-primary" (click)="loadOrder()">Tentar novamente</button>
          </div>
        } @else if (order()) {
          <!-- Status Card -->
          <div class="status-card" [class]="'status-' + getStatusClass(order()!.status)">
            <div class="status-icon">
              @switch (order()!.status) {
                @case ('completed') {
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  </svg>
                }
                @case ('failed') {
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                  </svg>
                }
                @case ('error') {
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                }
                @case ('expired') {
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                }
                @case ('refunded') {
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                }
                @default {
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                }
              }
            </div>
            <div class="status-content">
              <h2>{{ getStatusLabel(order()!.status) }}</h2>
              <p>{{ getStatusDescription(order()!.status) }}</p>
            </div>
          </div>

          <!-- Progress Steps (4 steps) -->
          <div class="progress-steps">
            <div class="step" [class.completed]="isStepCompleted(1)" [class.active]="isStepActive(1)">
              <div class="step-icon">1</div>
              <div class="step-label">Enviada</div>
            </div>
            <div class="step-line" [class.completed]="isStepCompleted(2)"></div>
            <div class="step" [class.completed]="isStepCompleted(2)" [class.active]="isStepActive(2)">
              <div class="step-icon">2</div>
              <div class="step-label">Transmitida</div>
            </div>
            <div class="step-line" [class.completed]="isStepCompleted(3)"></div>
            <div class="step" [class.completed]="isStepCompleted(3)" [class.active]="isStepActive(3)">
              <div class="step-icon">3</div>
              <div class="step-label">Pagando</div>
            </div>
            <div class="step-line" [class.completed]="isStepCompleted(4)"></div>
            <div class="step"
              [class.completed]="isStepCompleted(4)"
              [class.active]="isStepActive(4)"
              [class.failed]="isErrorStatus(order()!.status)">
              <div class="step-icon">4</div>
              <div class="step-label">{{ getLastStepLabel(order()!.status) }}</div>
            </div>
          </div>

          <!-- Order Details -->
          <div class="details-card">
            <h3>Detalhes da Ordem</h3>
            <div class="details-grid">
              <div class="detail-item">
                <span class="label">ID da Ordem</span>
                <span class="value mono">{{ order()!.id }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Quantidade</span>
                <span class="value mono">{{ formatSats(order()!.amount) }} sats</span>
              </div>
              <div class="detail-item">
                <span class="label">Em BTC</span>
                <span class="value mono">{{ formatSatsToBtc(order()!.amount) }} BTC</span>
              </div>
              @if (order()!.pix_value) {
                <div class="detail-item highlight">
                  <span class="label">Valor PIX</span>
                  <span class="value brl">R$ {{ formatBrlCents(order()!.pix_value!) }}</span>
                </div>
              }
              <div class="detail-item">
                <span class="label">Chave PIX</span>
                <span class="value">{{ order()!.pix_target }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Criada em</span>
                <span class="value">{{ formatDateTime(order()!.created_at) }}</span>
              </div>
              @if (order()!.confirmed_at) {
                <div class="detail-item">
                  <span class="label">Confirmada em</span>
                  <span class="value">{{ formatDateTime(order()!.confirmed_at!) }}</span>
                </div>
              }
              @if (order()!.tx_hash) {
                <div class="detail-item full-width">
                  <span class="label">Transação Blockchain</span>
                  <a [href]="getExplorerUrl(order()!.tx_hash!)" target="_blank" class="value tx-link">
                    {{ formatTxHash(order()!.tx_hash!) }}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M15 3h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </a>
                </div>
              }
              @if (order()!.payout_request_id) {
                <div class="detail-item full-width">
                  <span class="label">Solicitação de Pagamento</span>
                  <span class="value mono">{{ order()!.payout_request_id }}</span>
                </div>
              }
              @if (order()!.error_message) {
                <div class="detail-item full-width error">
                  <span class="label">Erro</span>
                  <span class="value">{{ order()!.error_message }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Auto-refresh notice -->
          @if (!order()!.is_final) {
            <div class="refresh-notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Atualizando automaticamente...</span>
            </div>
          }

          <!-- Actions -->
          <div class="actions">
            <button class="btn btn-outline" (click)="goBack()">
              Voltar para Vendas
            </button>
            <button class="btn btn-primary" (click)="loadOrder()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Atualizar
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sell-details-page {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 24px 0;
    }

    .page-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #E5E7EB;
    }

    .header-content {
      margin-top: 16px;
    }

    .page-title {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 6px 0;
    }

    .page-subtitle {
      font-size: 15px;
      color: #6B7280;
      margin: 0;
    }

    // Loading & Error States
    .loading-state,
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 64px;
      text-align: center;

      p {
        color: #6B7280;
        margin: 0;
      }
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 3px solid #E5E7EB;
      border-top: 3px solid #1E40AF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-icon {
      color: #DC2626;
    }

    .error-state h3 {
      font-size: 20px;
      color: #1F2937;
      margin: 0;
    }

    // Status Card
    .status-card {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px;
      border-radius: 16px;
      margin-bottom: 24px;

      &.status-pending {
        background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);
        border: 2px solid #3B82F6;
        color: #1E40AF;
      }

      &.status-processing {
        background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
        border: 2px solid #F59E0B;
        color: #92400E;
      }

      &.status-completed {
        background: linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%);
        border: 2px solid #16A34A;
        color: #166534;
      }

      &.status-failed {
        background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
        border: 2px solid #DC2626;
        color: #991B1B;
      }

      &.status-warning {
        background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
        border: 2px solid #F59E0B;
        color: #92400E;
      }
    }

    .status-icon {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-content {
      h2 {
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 8px 0;
      }

      p {
        font-size: 14px;
        margin: 0;
        opacity: 0.9;
      }
    }

    // Progress Steps
    .progress-steps {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      padding: 24px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      margin-bottom: 24px;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;

      .step-icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #E5E7EB;
        color: #9CA3AF;
        border-radius: 50%;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.3s ease;
      }

      .step-label {
        font-size: 12px;
        color: #9CA3AF;
        font-weight: 500;
        text-align: center;
        max-width: 70px;
      }

      &.active {
        .step-icon {
          background: #3B82F6;
          color: #FFFFFF;
          box-shadow: 0 4px 12px 0 rgb(59 130 246 / 0.4);
        }

        .step-label {
          color: #1E40AF;
          font-weight: 600;
        }
      }

      &.completed {
        .step-icon {
          background: #16A34A;
          color: #FFFFFF;
        }

        .step-label {
          color: #166534;
        }
      }

      &.failed {
        .step-icon {
          background: #DC2626;
          color: #FFFFFF;
        }

        .step-label {
          color: #991B1B;
        }
      }
    }

    .step-line {
      flex: 1;
      height: 3px;
      background: #E5E7EB;
      max-width: 60px;
      margin: 0 8px;
      margin-bottom: 28px;
      transition: all 0.3s ease;

      &.completed {
        background: #16A34A;
      }
    }

    // Details Card
    .details-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;

      h3 {
        font-size: 18px;
        font-weight: 600;
        color: #1F2937;
        margin: 0 0 20px 0;
        padding-bottom: 12px;
        border-bottom: 1px solid #E5E7EB;
      }
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      &.full-width {
        grid-column: 1 / -1;
      }

      &.highlight {
        background: #F0FDF4;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #BBF7D0;
      }

      &.error {
        background: #FEF2F2;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #FECACA;

        .value {
          color: #DC2626;
        }
      }

      .label {
        font-size: 12px;
        color: #6B7280;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .value {
        font-size: 14px;
        color: #1F2937;
        font-weight: 500;

        &.mono {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        &.brl {
          font-size: 18px;
          font-weight: 700;
          color: #16A34A;
        }
      }

      .tx-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #1E40AF;
        text-decoration: none;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    // Refresh Notice
    .refresh-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 8px;
      margin-bottom: 24px;

      svg {
        color: #1E40AF;
        animation: spin 2s linear infinite;
      }

      span {
        font-size: 13px;
        color: #1E40AF;
        font-weight: 500;
      }
    }

    // Actions
    .actions {
      display: flex;
      gap: 16px;
      justify-content: center;
    }

    // Responsive
    @media (max-width: 768px) {
      .page-title {
        font-size: 24px;
      }

      .status-card {
        flex-direction: column;
        text-align: center;
      }

      .progress-steps {
        padding: 16px;
        overflow-x: auto;
      }

      .step-line {
        max-width: 40px;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }

      .actions {
        flex-direction: column;
      }
    }

    @media (max-width: 480px) {
      .page-title {
        font-size: 22px;
      }

      .status-content h2 {
        font-size: 20px;
      }

      .step .step-label {
        font-size: 10px;
        max-width: 50px;
      }
    }
  `]
})
export class SellDetailsComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private sellOrderService = inject(SellOrderService);

  // State
  order = signal<SellOrder | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Auto-refresh
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 10000; // 10 seconds

  ngOnInit() {
    this.loadOrder();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  loadOrder() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID da ordem não encontrado');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.sellOrderService.getSellOrderById(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.isLoading.set(false);

        if (!order.is_final) {
          this.startAutoRefresh(id);
        } else {
          this.stopAutoRefresh();
        }
      },
      error: (err) => {
        console.error('Error loading sell order:', err);
        this.error.set('Erro ao carregar detalhes da ordem');
        this.isLoading.set(false);
      }
    });
  }

  private startAutoRefresh(orderId: string) {
    this.stopAutoRefresh();
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      this.sellOrderService.getSellOrderById(orderId).subscribe({
        next: (order) => {
          this.order.set(order);
          if (order.is_final) {
            this.stopAutoRefresh();
          }
        },
        error: (err) => {
          console.error('Error refreshing sell order:', err);
        }
      });
    });
  }

  private stopAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  // Status helpers
  getStatusLabel(status: OrderStatus): string {
    return getStatusLabel(status);
  }

  getStatusClass(status: OrderStatus): string {
    return getStatusClass(status);
  }

  getStatusDescription(status: OrderStatus): string {
    switch (status) {
      case 'pending':
        return 'Sua ordem foi criada e está aguardando transmissão para a blockchain.';
      case 'broadcasted':
      case 'awaiting_confirmation':
        return 'A transação foi transmitida e está aguardando confirmação na blockchain.';
      case 'confirmed':
        return 'Transação confirmada na blockchain! Aguardando processamento do pagamento.';
      case 'settlement_created':
        return 'Pagamento sendo processado. O PIX será enviado em breve.';
      case 'completed':
        return 'PIX enviado com sucesso! Verifique sua conta.';
      case 'expired':
        return 'A ordem expirou sem ser processada.';
      case 'error':
      case 'failed':
        return 'Ocorreu um erro durante o processamento da ordem.';
      case 'refunded':
        return 'A ordem foi reembolsada. Os fundos foram devolvidos.';
      default:
        return '';
    }
  }

  isErrorStatus(status: OrderStatus): boolean {
    return status === 'failed' || status === 'error' || status === 'expired';
  }

  getLastStepLabel(status: OrderStatus): string {
    switch (status) {
      case 'failed':
      case 'error':
        return 'Falhou';
      case 'expired':
        return 'Expirado';
      case 'refunded':
        return 'Reembolsado';
      default:
        return 'Pago';
    }
  }

  private getStepNumber(status: OrderStatus): number {
    switch (status) {
      case 'broadcasted':
      case 'awaiting_confirmation':
        return 1;
      case 'confirmed':
        return 2;
      case 'settlement_created':
        return 3;
      case 'completed':
        return 4;
      default:
        return 0;
    }
  }

  isStepCompleted(step: number): boolean {
    const currentOrder = this.order();
    if (!currentOrder) return false;
    return this.getStepNumber(currentOrder.status) >= step;
  }

  isStepActive(step: number): boolean {
    const currentOrder = this.order();
    if (!currentOrder) return false;

    const currentStep = this.getStepNumber(currentOrder.status);

    // For error statuses, mark step 4 as active
    if (this.isErrorStatus(currentOrder.status) && step === 4) return true;

    return currentStep === step;
  }

  // Formatting
  formatSats(amount: number): string {
    return new Intl.NumberFormat('pt-BR').format(amount);
  }

  formatSatsToBtc(sats: number): string {
    return (sats / 100000000).toFixed(8);
  }

  formatBrlCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  }

  formatDateTime(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }

  formatTxHash(txHash: string): string {
    if (!txHash || txHash.length <= 16) return txHash;
    return `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}`;
  }

  getExplorerUrl(txHash: string): string {
    const tx = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    const chain = environment.network === 'mainnet' ? 'mainnet' : 'testnet';
    return `https://explorer.hiro.so/txid/${tx}?chain=${chain}`;
  }

  // Navigation
  goBack() {
    this.router.navigate(['/sell']);
  }
}
