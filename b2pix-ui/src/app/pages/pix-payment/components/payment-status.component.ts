import { Component, inject, input, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { PixPaymentService } from '../../../shared/api/pix-payment.service';
import {
  PixPaymentOrder,
  PixPaymentStatus,
  isPixPaymentFinalStatus,
  getPixPaymentStatusLabel,
  getPixPaymentStatusClass
} from '../../../shared/models/pix-payment.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-payment-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="payment-status">
      @if (isLoading() && !order()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Carregando...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
          </svg>
          <h3>Erro</h3>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" (click)="loadOrder()">Tentar novamente</button>
        </div>
      } @else if (order()) {
        <!-- Status Card -->
        <div class="status-card" [class]="'status-' + getStatusClass(order()!.status)">
          <div class="status-icon">
            @switch (order()!.status) {
              @case (PixPaymentStatus.Paid) {
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                </svg>
              }
              @case (PixPaymentStatus.Failed) {
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                </svg>
              }
              @case (PixPaymentStatus.Error) {
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="12" cy="16" r="1" fill="currentColor"/>
                </svg>
              }
              @case (PixPaymentStatus.Expired) {
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              }
              @case (PixPaymentStatus.Refunded) {
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

        <!-- Progress Steps -->
        <div class="progress-steps">
          <div class="step" [class.completed]="isStepCompleted(1)" [class.active]="isStepActive(1)">
            <div class="step-icon">1</div>
            <div class="step-label">Enviada</div>
          </div>
          <div class="step-line" [class.completed]="isStepCompleted(2)"></div>
          <div class="step" [class.completed]="isStepCompleted(2)" [class.active]="isStepActive(2)">
            <div class="step-icon">2</div>
            <div class="step-label">Confirmada</div>
          </div>
          <div class="step-line" [class.completed]="isStepCompleted(3)"></div>
          <div class="step" [class.completed]="isStepCompleted(3)" [class.active]="isStepActive(3)">
            <div class="step-icon">3</div>
            <div class="step-label">LP Pagando</div>
          </div>
          <div class="step-line" [class.completed]="isStepCompleted(4)"></div>
          <div class="step" [class.completed]="isStepCompleted(4)" [class.active]="isStepActive(4)" [class.failed]="order()!.status === PixPaymentStatus.Failed || order()!.status === PixPaymentStatus.Error">
            <div class="step-icon">4</div>
            <div class="step-label">{{ getLastStepLabel(order()!.status) }}</div>
          </div>
        </div>

        <!-- Order Details -->
        <div class="details-card">
          <h3>Detalhes do Pagamento</h3>
          <div class="details-grid">
            <div class="detail-item highlight">
              <span class="label">Valor PIX</span>
              <span class="value brl">R$ {{ formatBrlCents(order()!.pix_value) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Quantidade</span>
              <span class="value mono">{{ formatSats(order()!.amount) }} sats</span>
            </div>
            @if (order()!.tx_hash) {
              <div class="detail-item full-width">
                <span class="label">Transacao Blockchain</span>
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
            @if (order()!.pix_end_to_end_id) {
              <div class="detail-item">
                <span class="label">ID do PIX</span>
                <span class="value mono">{{ order()!.pix_end_to_end_id }}</span>
              </div>
            }
            <div class="detail-item">
              <span class="label">Criado em</span>
              <span class="value">{{ formatDateTime(order()!.created_at) }}</span>
            </div>
            @if (order()!.error_message) {
              <div class="detail-item full-width error">
                <span class="label">Erro</span>
                <span class="value">{{ order()!.error_message }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Auto-refresh notice -->
        @if (!isOrderFinal()) {
          <div class="refresh-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Atualizando automaticamente...</span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .payment-status {
      width: 100%;
    }

    .loading-state,
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      text-align: center;

      p { color: #6B7280; margin: 0; }
      h3 { font-size: 20px; color: #1F2937; margin: 0; }
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

    .error-state { color: #DC2626; }

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
      h2 { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
      p { font-size: 14px; margin: 0; opacity: 0.9; }
    }

    .progress-steps {
      display: flex;
      align-items: center;
      justify-content: center;
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
        max-width: 80px;
      }

      &.active {
        .step-icon {
          background: #3B82F6;
          color: #FFFFFF;
          box-shadow: 0 4px 12px 0 rgb(59 130 246 / 0.4);
        }
        .step-label { color: #1E40AF; font-weight: 600; }
      }

      &.completed {
        .step-icon { background: #16A34A; color: #FFFFFF; }
        .step-label { color: #166534; }
      }

      &.failed {
        .step-icon { background: #DC2626; color: #FFFFFF; }
        .step-label { color: #991B1B; }
      }
    }

    .step-line {
      flex: 1;
      height: 3px;
      background: #E5E7EB;
      max-width: 80px;
      margin: 0 12px;
      margin-bottom: 28px;
      transition: all 0.3s ease;

      &.completed { background: #16A34A; }
    }

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
        margin: 0 0 20px;
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

      &.full-width { grid-column: 1 / -1; }

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
        .value { color: #DC2626; }
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

        &.mono { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; }
        &.brl { font-size: 18px; font-weight: 700; color: #16A34A; }
      }

      .tx-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #1E40AF;
        text-decoration: none;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;

        &:hover { text-decoration: underline; }
      }
    }

    .refresh-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 8px;

      svg { color: #1E40AF; animation: spin 2s linear infinite; }
      span { font-size: 13px; color: #1E40AF; font-weight: 500; }
    }

    @media (max-width: 768px) {
      .status-card { flex-direction: column; text-align: center; }
      .details-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class PaymentStatusComponent implements OnInit, OnDestroy {
  orderId = input.required<string>();

  private pixPaymentService = inject(PixPaymentService);
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 5000;

  order = signal<PixPaymentOrder | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  PixPaymentStatus = PixPaymentStatus;

  ngOnInit() {
    this.loadOrder();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  loadOrder() {
    const id = this.orderId();
    if (!id) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.pixPaymentService.getPixPaymentById(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.isLoading.set(false);

        if (!isPixPaymentFinalStatus(order.status)) {
          this.startAutoRefresh(id);
        } else {
          this.stopAutoRefresh();
        }
      },
      error: (err) => {
        console.error('Error loading PIX payment:', err);
        this.error.set('Erro ao carregar detalhes do pagamento');
        this.isLoading.set(false);
      }
    });
  }

  private startAutoRefresh(orderId: string) {
    this.stopAutoRefresh();
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      this.pixPaymentService.getPixPaymentById(orderId).subscribe({
        next: (order) => {
          this.order.set(order);
          if (isPixPaymentFinalStatus(order.status)) {
            this.stopAutoRefresh();
          }
        },
        error: (err) => {
          console.error('Error refreshing PIX payment:', err);
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

  isOrderFinal(): boolean {
    const o = this.order();
    return o ? isPixPaymentFinalStatus(o.status) : false;
  }

  getStatusLabel(status: PixPaymentStatus): string {
    return getPixPaymentStatusLabel(status);
  }

  getStatusClass(status: PixPaymentStatus): string {
    return getPixPaymentStatusClass(status);
  }

  getStatusDescription(status: PixPaymentStatus): string {
    switch (status) {
      case PixPaymentStatus.Created:
        return 'Sua ordem foi criada e esta aguardando transmissao.';
      case PixPaymentStatus.Broadcasted:
        return 'A transacao foi transmitida e esta aguardando confirmacao na blockchain.';
      case PixPaymentStatus.AwaitingConfirmation:
        return 'Aguardando confirmacao na blockchain. Isso pode levar alguns minutos.';
      case PixPaymentStatus.Confirmed:
        return 'Transacao confirmada! Aguardando um Liquidity Provider aceitar o pagamento.';
      case PixPaymentStatus.LpAssigned:
        return 'Um Liquidity Provider esta processando o pagamento PIX.';
      case PixPaymentStatus.Paid:
        return 'PIX pago com sucesso!';
      case PixPaymentStatus.Failed:
        return 'Ocorreu um erro durante o processamento.';
      case PixPaymentStatus.Error:
        return 'Ocorreu um problema durante o pagamento. Em analise.';
      case PixPaymentStatus.Expired:
        return 'A ordem expirou sem ser processada. Reembolso em andamento.';
      case PixPaymentStatus.Refunded:
        return 'O pagamento falhou e seus satoshis foram devolvidos.';
      default:
        return '';
    }
  }

  getLastStepLabel(status: PixPaymentStatus): string {
    switch (status) {
      case PixPaymentStatus.Failed:
      case PixPaymentStatus.Error:
        return 'Falhou';
      case PixPaymentStatus.Expired:
        return 'Expirada';
      case PixPaymentStatus.Refunded:
        return 'Reembolsado';
      default:
        return 'PIX Pago';
    }
  }

  isStepCompleted(step: number): boolean {
    const o = this.order();
    if (!o) return false;
    const statusOrder: { [key in PixPaymentStatus]: number } = {
      [PixPaymentStatus.Created]: 0,
      [PixPaymentStatus.Broadcasted]: 1,
      [PixPaymentStatus.AwaitingConfirmation]: 1,
      [PixPaymentStatus.Confirmed]: 2,
      [PixPaymentStatus.LpAssigned]: 3,
      [PixPaymentStatus.Paid]: 4,
      [PixPaymentStatus.Failed]: 0,
      [PixPaymentStatus.Error]: 3,
      [PixPaymentStatus.Expired]: 2,
      [PixPaymentStatus.Refunded]: 0
    };
    return statusOrder[o.status] >= step;
  }

  isStepActive(step: number): boolean {
    const o = this.order();
    if (!o) return false;
    const statusOrder: { [key in PixPaymentStatus]: number } = {
      [PixPaymentStatus.Created]: 0,
      [PixPaymentStatus.Broadcasted]: 1,
      [PixPaymentStatus.AwaitingConfirmation]: 1,
      [PixPaymentStatus.Confirmed]: 2,
      [PixPaymentStatus.LpAssigned]: 3,
      [PixPaymentStatus.Paid]: 4,
      [PixPaymentStatus.Failed]: 4,
      [PixPaymentStatus.Error]: 4,
      [PixPaymentStatus.Expired]: 4,
      [PixPaymentStatus.Refunded]: 4
    };
    return statusOrder[o.status] === step;
  }

  formatSats(amount: number): string {
    return new Intl.NumberFormat('pt-BR').format(amount);
  }

  formatBrlCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
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
}
