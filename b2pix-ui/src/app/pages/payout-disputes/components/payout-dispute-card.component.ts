import { Component, input, output, signal } from '@angular/core';
import { PixPayoutRequest, PayoutRequestStatus, getSourceTypeLabel, getPayoutRequestStatusLabel, getPayoutRequestStatusClass } from '../../../shared/models/pix-payout-request.model';
import { MessageChatComponent } from '../../../components/order-status/components/message-chat/message-chat.component';

@Component({
  selector: 'app-payout-dispute-card',
  standalone: true,
  imports: [MessageChatComponent],
  template: `
    <div class="dispute-card">
      <div class="card-header">
        <div class="card-left">
          <span class="pix-value">R$ {{ formatBrlCents(item().pix_value) }}</span>
          <span class="source-badge" [class]="item().source_type">{{ getSourceLabel(item().source_type) }}</span>
          @if (item().attempt_number > 1) {
            <span class="attempt-badge">Tentativa #{{ item().attempt_number }}</span>
          }
        </div>
        <span class="status-badge" [class]="getStatusClass(item().status)">{{ getStatusLabel(item().status) }}</span>
      </div>

      <div class="card-body">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Pagador</span>
            <span class="value mono">{{ formatAddress(item().payer_address) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">LP</span>
            <span class="value mono">{{ item().lp_address ? formatAddress(item().lp_address!) : '-' }}</span>
          </div>
          @if (item().pix_end_to_end_id) {
            <div class="detail-item">
              <span class="label">PIX E2E ID</span>
              <span class="value mono">{{ item().pix_end_to_end_id }}</span>
            </div>
          }
          @if (item().disputed_at) {
            <div class="detail-item">
              <span class="label">Disputado em</span>
              <span class="value">{{ formatDate(item().disputed_at!) }}</span>
            </div>
          }
          @if (item().error_message) {
            <div class="detail-item full-width">
              <span class="label">Erro</span>
              <span class="value error-text">{{ item().error_message }}</span>
            </div>
          }
        </div>
      </div>

      <div class="chat-toggle">
        <button class="btn btn-chat" (click)="toggleChat()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ showChat() ? 'Ocultar mensagens' : 'Ver mensagens' }}
        </button>
      </div>

      @if (showChat()) {
        <div class="card-chat">
          <app-message-chat
            [sourceType]="item().source_type"
            [sourceId]="item().source_id"
            currentUserRole="moderator"
          />
        </div>
      }

      <div class="card-footer">
        @if (mode() === 'disputed') {
          <button
            class="btn btn-confirm"
            (click)="disputeResolved.emit({ id: item().id, ruling: 'lp' })"
            [disabled]="isProcessing()">
            @if (isProcessing()) {
              <div class="loading-spinner-sm"></div>
            }
            PIX foi recebido
          </button>
          <button
            class="btn btn-reject"
            (click)="disputeResolved.emit({ id: item().id, ruling: 'customer' })"
            [disabled]="isProcessing()">
            @if (isProcessing()) {
              <div class="loading-spinner-sm"></div>
            }
            PIX não recebido
          </button>
        } @else {
          <button
            class="btn btn-resolve"
            (click)="resolveEscalation.emit(item().id)"
            [disabled]="isProcessing()">
            @if (isProcessing()) {
              <div class="loading-spinner-sm"></div>
            }
            Resolver Escalacao
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .dispute-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .dispute-card:hover {
      border-color: #D1D5DB;
      box-shadow: 0 4px 12px 0 rgb(0 0 0 / 0.08);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .card-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pix-value {
      font-size: 20px;
      font-weight: 700;
      color: #16A34A;
    }

    .source-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &.pix_order { background: #DBEAFE; color: #1E40AF; }
      &.sell_order { background: #FEF3C7; color: #92400E; }
    }

    .attempt-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      background: #DBEAFE;
      color: #1E40AF;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;

      &.completed { background: #F0FDF4; color: #166534; }
      &.processing { background: #FEF3C7; color: #92400E; }
      &.pending { background: #DBEAFE; color: #1E40AF; }
      &.failed { background: #FEF2F2; color: #991B1B; }
      &.warning { background: #FEF3C7; color: #92400E; }
      &.escalated { background: #FEF3C7; color: #D97706; }
    }

    .card-body {
      padding: 16px 0;
      border-top: 1px solid #F3F4F6;
      border-bottom: 1px solid #F3F4F6;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      &.full-width { grid-column: 1 / -1; }
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
        font-size: 13px;
        word-break: break-all;
      }

      &.error-text { color: #DC2626; }
    }

    .chat-toggle {
      padding: 12px 0;
      text-align: center;
    }

    .btn-chat {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #F3F4F6;
        border-color: #D1D5DB;
      }
    }

    .card-chat {
      padding: 0 0 12px;
      border-bottom: 1px solid #F3F4F6;
    }

    .card-footer {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-confirm {
      background: #16A34A;
      color: white;

      &:hover:not(:disabled) {
        background: #15803D;
        transform: translateY(-1px);
      }
    }

    .btn-reject {
      background: #DC2626;
      color: white;

      &:hover:not(:disabled) {
        background: #B91C1C;
        transform: translateY(-1px);
      }
    }

    .btn-resolve {
      background: #1E40AF;
      color: white;

      &:hover:not(:disabled) {
        background: #1D4ED8;
        transform: translateY(-1px);
      }
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
      .card-header { flex-direction: column; align-items: flex-start; gap: 8px; }
      .detail-grid { grid-template-columns: 1fr; }
      .card-footer { flex-direction: column; }
    }
  `]
})
export class PayoutDisputeCardComponent {
  item = input.required<PixPayoutRequest>();
  mode = input.required<'disputed' | 'escalated'>();
  isProcessing = input<boolean>(false);

  showChat = signal(false);

  disputeResolved = output<{ id: string; ruling: 'lp' | 'customer' }>();
  resolveEscalation = output<string>();

  toggleChat() {
    this.showChat.update(v => !v);
  }

  formatBrlCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  }

  getSourceLabel(sourceType: string): string {
    return getSourceTypeLabel(sourceType as any);
  }

  getStatusLabel(status: PayoutRequestStatus): string {
    return getPayoutRequestStatusLabel(status);
  }

  getStatusClass(status: PayoutRequestStatus): string {
    return getPayoutRequestStatusClass(status);
  }

  formatAddress(address: string): string {
    if (!address || address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  }

  formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }
}
