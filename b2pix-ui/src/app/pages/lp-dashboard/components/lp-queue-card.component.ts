import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PixPaymentQueueItem } from '../../../shared/models/pix-payment.model';

@Component({
  selector: 'app-lp-queue-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="queue-card">
      <div class="card-header">
        <div class="card-values">
          <div class="pix-value">
            <span class="label">Valor PIX</span>
            <span class="value brl">R$ {{ formatBrlCents(item().pix_value) }}</span>
          </div>
        </div>
        @if (item().lp_cancel_count > 0) {
          <div class="cancel-badge" title="Cancelamentos anteriores">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="17" r="1" fill="currentColor"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            </svg>
            {{ item().lp_cancel_count }}x cancelada
          </div>
        }
      </div>

      <div class="card-meta">
        <div class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ getTimeAgo(item().created_at) }}</span>
        </div>
        <div class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z" stroke="currentColor" stroke-width="2"/>
            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Expira {{ formatDateTime(item().expires_at) }}</span>
        </div>
      </div>

      <button class="btn-accept" (click)="accept.emit(item().id)" [disabled]="isAccepting()">
        @if (isAccepting()) {
          <div class="loading-spinner-sm"></div>
          Aceitando...
        } @else {
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          </svg>
          Aceitar Ordem
        }
      </button>
    </div>
  `,
  styles: [`
    .queue-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .queue-card:hover {
      border-color: #3B82F6;
      box-shadow: 0 4px 12px 0 rgb(59 130 246 / 0.1);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .card-values {
      display: flex;
      gap: 24px;
    }

    .pix-value {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      font-size: 12px;
      color: #6B7280;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;

      &.brl { color: #16A34A; font-size: 20px; font-weight: 700; }
    }

    .cancel-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #FEF3C7;
      color: #92400E;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }

    .card-meta {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      padding-top: 12px;
      border-top: 1px solid #F3F4F6;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #6B7280;
    }

    .btn-accept {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-accept:hover:not(:disabled) {
      background: linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
    }

    .btn-accept:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .loading-spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 480px) {
      .card-values { flex-direction: column; gap: 12px; }
      .card-meta { flex-direction: column; gap: 8px; }
    }
  `]
})
export class LpQueueCardComponent {
  item = input.required<PixPaymentQueueItem>();
  isAccepting = input<boolean>(false);
  accept = output<string>();

  formatBrlCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  }

  getTimeAgo(dateString: string): string {
    const now = Date.now();
    const created = new Date(dateString).getTime();
    const diffMinutes = Math.floor((now - created) / 60000);

    if (diffMinutes < 1) return 'Agora';
    if (diffMinutes < 60) return `${diffMinutes} min atras`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atras`;
    return `${Math.floor(diffHours / 24)}d atras`;
  }

  formatDateTime(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }
}
