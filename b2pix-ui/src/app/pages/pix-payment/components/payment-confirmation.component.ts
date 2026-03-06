import { Component, input, output, computed } from '@angular/core';
import { formatSats, formatSatsToBtc } from '../../../shared/utils/format.util';
import { TechnicalDetailsComponent } from '../../../components/technical-details/technical-details.component';

export interface PixQrData {
  payload: string;
  valueInCents: number;
  recipientName: string | null;
}

@Component({
  selector: 'app-payment-confirmation',
  standalone: true,
  imports: [TechnicalDetailsComponent],
  template: `
    <div class="confirmation">

      <!-- Recipient name (from EMV tag 59) — shown only when present -->
      @if (qrData().recipientName) {
        <div class="recipient-block">
          <span class="recipient-label">Destinatário</span>
          <span class="recipient-name">{{ qrData().recipientName }}</span>
        </div>
      }

      <!-- PIX value — BRL primary, BTC secondary -->
      <div class="amount-block">
        <span class="amount-label">Valor do PIX</span>
        <span class="amount-brl">{{ formatBrl(pixValueInBrl()) }}</span>
        <span class="amount-btc">≈ {{ formatSatsToBtc(amountInSats()) }} BTC</span>
      </div>

      <!-- Breakdown -->
      <div class="details-card">
        <div class="detail-row">
          <span class="detail-label">Taxa de processamento</span>
          <span class="detail-value">{{ formatBrl(feeInBrl()) }}</span>
        </div>
        <div class="divider"></div>
        <div class="detail-row total-row">
          <span class="detail-label">Total</span>
          <span class="detail-value total-value">{{ formatBrl(totalInBrl()) }}</span>
        </div>
      </div>

      <!-- Balance after payment -->
      <div class="balance-card" [class.balance-danger]="insufficientBalance()">
        <div class="balance-row">
          <span class="balance-label">Saldo atual</span>
          <span class="balance-value" [class.text-success]="!insufficientBalance()">
            {{ formatBrl(balanceInBrl()) }}
          </span>
        </div>
        <div class="balance-row">
          <span class="balance-label">Saldo após</span>
          <span class="balance-value" [class.text-danger]="insufficientBalance()">
            {{ formatBrl(balanceAfterBrl()) }}
          </span>
        </div>
      </div>

      <!-- Insufficient balance warning -->
      @if (insufficientBalance()) {
        <div class="alert-box alert-warning" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Saldo insuficiente. Você precisa de {{ formatBrl(totalInBrl()) }} mas possui {{ formatBrl(balanceInBrl()) }}.</span>
        </div>
      }

      <!-- Technical details — collapsed by default -->
      <app-technical-details
        [satoshis]="amountInSats()"
      />

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

    // Recipient
    .recipient-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 14px 16px;
      background: var(--bg-secondary);
      border-radius: var(--r-md);
      margin-bottom: 16px;
    }

    .recipient-label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .recipient-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      word-break: break-word;
    }

    // Amount
    .amount-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 16px 0;
      margin-bottom: 16px;
      text-align: center;
    }

    .amount-label {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .amount-brl {
      font-family: var(--font-display);
      font-size: 32px;
      font-weight: 700;
      color: var(--success);
      line-height: 1.1;
    }

    .amount-btc {
      font-size: 13px;
      color: var(--text-muted);
    }

    // Breakdown card
    .details-card {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 16px;
      margin-bottom: 12px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
    }

    .detail-label {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .detail-value {
      font-size: 14px;
      color: var(--text-primary);
      font-weight: 500;
    }

    .total-row {
      padding-top: 10px;
    }

    .total-value {
      font-weight: 700;
      font-size: 15px;
    }

    .divider {
      height: 1px;
      background: var(--border);
      margin: 6px 0;
    }

    // Balance card
    .balance-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      padding: 12px 16px;
      margin-bottom: 16px;

      &.balance-danger {
        border-color: var(--danger);
        background: var(--danger-bg);
      }
    }

    .balance-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }

    .balance-label {
      font-size: 13px;
      color: var(--text-muted);
    }

    .balance-value {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .text-success {
      color: var(--success);
    }

    .text-danger {
      color: var(--danger);
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

  insufficientBalance = computed(() => {
    // Compare balance (in BRL) vs total (in BRL)
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
