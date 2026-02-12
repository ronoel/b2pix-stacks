import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PixQrData {
  payload: string;
  valueInCents: number;
  recipientName: string | null;
}

@Component({
  selector: 'app-payment-confirmation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="confirmation">
      <div class="confirmation-header">
        <div class="confirmation-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2V22" stroke="currentColor" stroke-width="2"/>
            <path d="M17 5H9.5C8.11929 5 7 6.11929 7 7.5V7.5C7 8.88071 8.11929 10 9.5 10H14.5C15.8807 10 17 11.1193 17 12.5V12.5C17 13.8807 15.8807 15 14.5 15H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2>Confirmar Pagamento</h2>
        <p>Revise os detalhes antes de confirmar</p>
      </div>

      <div class="details-card">
        <div class="detail-row highlight">
          <span class="label">Valor PIX</span>
          <span class="value brl">R$ {{ formatCurrency(pixValueInBrl()) }}</span>
        </div>

        @if (qrData().recipientName) {
          <div class="detail-row">
            <span class="label">Destinatario</span>
            <span class="value">{{ qrData().recipientName }}</span>
          </div>
        }

        <div class="divider"></div>

        <div class="detail-row">
          <span class="label">Valor em sats</span>
          <span class="value mono">{{ formatSats(amountInSats()) }} sats</span>
        </div>

        <div class="detail-row">
          <span class="label">Em BTC</span>
          <span class="value mono">{{ formatSatsToBtc(amountInSats()) }} BTC</span>
        </div>

        <div class="detail-row">
          <span class="label">Taxa de rede</span>
          <span class="value mono">{{ formatSats(fee()) }} sats</span>
        </div>

        <div class="divider"></div>

        <div class="detail-row total">
          <span class="label">Total debitado</span>
          <span class="value mono">{{ formatSats(amountInSats() + fee()) }} sats</span>
        </div>
      </div>

      @if (insufficientBalance()) {
        <div class="error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
          </svg>
          <p>Saldo insuficiente. Voce precisa de {{ formatSats(amountInSats() + fee()) }} sats mas possui {{ formatSats(balance()) }} sats.</p>
        </div>
      }

      <div class="actions">
        <button class="btn btn-outline" (click)="cancelled.emit()">
          Voltar
        </button>
        <button
          class="btn btn-primary btn-lg"
          [disabled]="insufficientBalance() || isProcessing()"
          (click)="confirmed.emit()">
          @if (isProcessing()) {
            <div class="btn-spinner"></div>
            Processando...
          } @else {
            Confirmar Pagamento
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirmation {
      width: 100%;
    }

    .confirmation-header {
      text-align: center;
      margin-bottom: 24px;

      h2 {
        font-size: 22px;
        font-weight: 700;
        color: #1F2937;
        margin: 12px 0 6px;
      }

      p {
        font-size: 14px;
        color: #6B7280;
        margin: 0;
      }
    }

    .confirmation-icon {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
      border: 2px solid #F59E0B;
      border-radius: 50%;
      color: #D97706;
      margin: 0 auto;
    }

    .details-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;

      &.highlight {
        background: #F0FDF4;
        margin: -10px -12px 0;
        padding: 14px 12px;
        border-radius: 12px;
        border: 1px solid #BBF7D0;
        margin-bottom: 4px;
      }

      &.total {
        padding-top: 12px;

        .label {
          font-weight: 700;
          color: #1F2937;
          font-size: 14px;
        }

        .value {
          font-weight: 700;
          color: #1F2937;
          font-size: 15px;
        }
      }
    }

    .label {
      font-size: 13px;
      color: #6B7280;
      font-weight: 500;
    }

    .value {
      font-size: 14px;
      color: #1F2937;
      font-weight: 600;

      &.brl {
        font-size: 20px;
        font-weight: 700;
        color: #16A34A;
      }

      &.mono {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      }
    }

    .divider {
      height: 1px;
      background: #E5E7EB;
      margin: 4px 0;
    }

    .error-banner {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #FEE2E2;
      border: 1px solid #FCA5A5;
      border-radius: 8px;
      color: #991B1B;
      margin-bottom: 20px;

      svg { flex-shrink: 0; margin-top: 2px; }

      p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
      }
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    .actions .btn {
      flex: 1;
    }

    .btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      display: inline-block;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 480px) {
      .actions {
        flex-direction: column;
      }
    }
  `]
})
export class PaymentConfirmationComponent {
  qrData = input.required<PixQrData>();
  amountInSats = input.required<number>();
  fee = input.required<number>();
  balance = input.required<number>();
  isProcessing = input<boolean>(false);

  confirmed = output<void>();
  cancelled = output<void>();

  pixValueInBrl = computed(() => this.qrData().valueInCents / 100);

  insufficientBalance = computed(() => {
    return this.balance() < (this.amountInSats() + this.fee());
  });

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatSats(amount: number): string {
    return new Intl.NumberFormat('pt-BR').format(amount);
  }

  formatSatsToBtc(sats: number): string {
    return (sats / 100000000).toFixed(8);
  }
}
