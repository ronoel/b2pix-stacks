import { Component, input, output } from '@angular/core';

import { PixPayoutRequest, getSourceTypeLabel } from '../../../shared/models/pix-payout-request.model';
import { formatBrlCents } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-lp-queue-card',
  standalone: true,
  imports: [],
  template: `
    <div class="queue-card">
      <div class="card-row">
        <div class="card-info">
          <span class="card-brl">{{ formatBrlCents(item().pix_value) }}</span>
          <div class="card-meta">
            <span class="source-label">{{ getSourceLabel(item().source_type) }}</span>
            @if (item().attempt_number > 1) {
              <span class="meta-dot">&middot;</span>
              <span class="attempt-label">Tentativa #{{ item().attempt_number }}</span>
            }
            <span class="meta-dot">&middot;</span>
            <span class="time-ago">{{ getTimeAgo(item().created_at) }}</span>
          </div>
          @if (item().lp_cancel_count > 0) {
            <span class="cancel-badge">{{ item().lp_cancel_count }}x cancelada</span>
          }
        </div>
        <button
          class="btn-accept"
          (click)="accept.emit(item().id)"
          [disabled]="isAccepting()"
          [attr.aria-label]="'Aceitar pagamento de ' + formatBrlCents(item().pix_value)">
          @if (isAccepting()) {
            <div class="loading-spinner-sm"></div>
          } @else {
            Aceitar
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .queue-card {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      padding: 16px;
      transition: all 0.2s ease;
    }

    .queue-card:hover {
      border-color: var(--primary);
      box-shadow: 0 2px 8px 0 var(--primary-glow);
    }

    .card-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .card-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .card-brl {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .card-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .source-label {
      font-weight: 500;
    }

    .meta-dot {
      color: var(--text-muted);
    }

    .attempt-label {
      color: var(--primary);
      font-weight: 500;
    }

    .time-ago {
      color: var(--text-muted);
    }

    .cancel-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      background: var(--danger-bg);
      color: var(--danger);
      border-radius: var(--r-full);
      font-size: 11px;
      font-weight: 600;
      width: fit-content;
    }

    .btn-accept {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 20px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: var(--r-sm);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .btn-accept:hover:not(:disabled) {
      background: var(--primary-light);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px 0 var(--primary-glow);
    }

    .btn-accept:disabled {
      opacity: 0.6;
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
  `]
})
export class LpQueueCardComponent {
  item = input.required<PixPayoutRequest>();
  isAccepting = input<boolean>(false);
  accept = output<string>();

  formatBrlCents = formatBrlCents;

  getSourceLabel(sourceType: string): string {
    return getSourceTypeLabel(sourceType as any);
  }

  getTimeAgo(dateString: string): string {
    const now = Date.now();
    const created = new Date(dateString).getTime();
    const diffMinutes = Math.floor((now - created) / 60000);

    if (diffMinutes < 1) return 'Agora';
    if (diffMinutes < 60) return `${diffMinutes} min atrás`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${Math.floor(diffHours / 24)}d atrás`;
  }

}
