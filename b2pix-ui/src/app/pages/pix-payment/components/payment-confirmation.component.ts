import { Component, input, output, computed } from '@angular/core';
import { formatSats, formatSatsToBtc } from '../../../shared/utils/format.util';
import { PixKeyType, formatPixKeyForDisplay, getPixKeyTypeLabel } from '../../../shared/utils/pix-validation.util';

export interface PixQrData {
  payload: string;
  pixKey?: string;
  pixKeyType?: PixKeyType;
  valueInCents: number;
  recipientName: string | null;
}

@Component({
  selector: 'app-payment-confirmation',
  standalone: true,
  imports: [],
  template: `
    <div class="confirmation">

      <!-- Payment summary — compact single card -->
      <div class="payment-summary">
        @if (qrData().recipientName) {
          <span class="summary-recipient">{{ qrData().recipientName }}</span>
        } @else if (qrData().pixKey && qrData().pixKeyType) {
          <span class="summary-recipient">{{ pixKeyLabel() }}</span>
        }
        <span class="summary-amount">{{ formatBrl(pixValueInBrl()) }}</span>
        <span class="summary-sats">≈ {{ formatSats(totalInSats()) }} sats</span>
      </div>

      <!-- Insufficient balance warning -->
      @if (insufficientBalance()) {
        <div class="alert-box alert-warning" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Saldo insuficiente. Você precisa de {{ formatSats(totalInSats()) }} sats mas possui {{ formatSats(balanceInSats()) }} sats.</span>
        </div>
      }

      <!-- Action buttons -->
      <div class="actions">
        <button
          class="btn btn-primary btn-lg full-width"
          [disabled]="insufficientBalance() || isProcessing()"
          [attr.aria-disabled]="insufficientBalance() || isProcessing()"
          (click)="confirmed.emit()">
          @if (isProcessing()) {
            <div class="btn-spinner"></div>
            Processando...
          } @else {
            Confirmar pagamento
          }
        </button>
        <button class="btn btn-ghost full-width" (click)="cancelled.emit()">
          Cancelar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirmation {
      width: 100%;
    }

    // Payment summary — compact single card
    .payment-summary {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      margin-bottom: 16px;
      text-align: center;
    }

    .summary-recipient {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .summary-amount {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 700;
      color: var(--success);
      line-height: 1.2;
    }

    .summary-sats {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 14px;
      font-weight: 600;
      color: var(--btc);
    }

    // Actions
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }

    .full-width {
      width: 100%;
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
  `]
})
export class PaymentConfirmationComponent {
  qrData = input.required<PixQrData>();
  amountInSats = input.required<number>();
  fee = input.required<number>();
  feeInBrl = input<number>(0);
  totalInBrl = input<number>(0);
  balanceInBrl = input<number>(0);
  balanceAfterBrl = input<number>(0);
  isProcessing = input<boolean>(false);

  confirmed = output<void>();
  cancelled = output<void>();

  pixValueInBrl = computed(() => this.qrData().valueInCents / 100);

  pixKeyLabel = computed(() => {
    const data = this.qrData();
    if (data.pixKey && data.pixKeyType) {
      return `${getPixKeyTypeLabel(data.pixKeyType)}: ${formatPixKeyForDisplay(data.pixKey, data.pixKeyType)}`;
    }
    return '';
  });

  totalInSats = computed(() => this.amountInSats() + this.fee());

  balanceInSats = computed(() => {
    // Convert BRL balance back to sats approximation for display
    const brlPerSat = this.totalInBrl() > 0 && this.totalInSats() > 0
      ? this.totalInBrl() / this.totalInSats()
      : 0;
    return brlPerSat > 0 ? Math.floor(this.balanceInBrl() / brlPerSat) : 0;
  });

  insufficientBalance = computed(() => {
    return this.balanceInBrl() < this.totalInBrl();
  });

  formatBrl(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatSats = formatSats;
  formatSatsToBtc = formatSatsToBtc;
}
