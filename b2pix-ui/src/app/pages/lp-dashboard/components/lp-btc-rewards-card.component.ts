import { Component, input, output } from '@angular/core';
import { formatSats, formatSatsToBtc, formatBrlCents } from '../../../shared/utils/format.util';

/**
 * LpBtcRewardsCardComponent
 *
 * Note: In the redesign, the rewards data moved to the main balance card
 * at the top of the dashboard. This component is kept for backwards
 * compatibility but is no longer rendered in the main dashboard template.
 */
@Component({
  selector: 'app-lp-btc-rewards-card',
  standalone: true,
  template: `
    <div class="btc-rewards-card">
      <div class="rewards-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M11.5 6V2.5M12.5 6V2.5M8 13.5H16M8 10.5H16M9 21H15C15 21 16 21 16 20V17.5C17.3807 17.5 18.5 16.3807 18.5 15V9C18.5 7.61929 17.3807 6.5 16 6.5H8C6.61929 6.5 5.5 7.61929 5.5 9V15C5.5 16.3807 6.61929 17.5 8 17.5V20C8 21 9 21 9 21Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>sBTC a receber</h3>
      </div>

      <div class="rewards-body">
        <div class="reward-stat">
          <span class="reward-label">sBTC disponível</span>
          <span class="reward-value-brl">{{ formatBrlCents(balanceCents()) }}</span>
          <span class="reward-sats">{{ formatSats(claimableSatoshis()) }} sats</span>
        </div>
        <div class="reward-stat">
          <span class="reward-label">Saldo disponível para conversão</span>
          <span class="reward-value-brl">{{ formatBrlCents(balanceCents()) }}</span>
        </div>
      </div>

      <div class="rewards-actions">
        <button
          class="btn btn-convert"
          [disabled]="balanceCents() <= 0 || isProcessing()"
          (click)="convert.emit()">
          Converter
        </button>
        <button
          class="btn btn-withdraw"
          [disabled]="claimableSatoshis() < 1500 || isProcessing()"
          (click)="withdraw.emit()">
          Sacar sBTC
        </button>
      </div>
      @if (claimableSatoshis() < 1500 && claimableSatoshis() > 0) {
        <p class="min-hint">Mínimo para saque: 1.500 sats</p>
      }
    </div>
  `,
  styles: [`
    .btc-rewards-card {
      background: var(--btc-bg);
      border: 1px solid var(--warning);
      border-radius: var(--r-lg);
      padding: 24px;
      margin-bottom: 24px;
    }
    .rewards-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      color: var(--btc);
      h3 { margin: 0; font-size: 16px; font-weight: 600; }
    }
    .rewards-body {
      display: flex;
      gap: 32px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .reward-stat {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .reward-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .reward-value-brl {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .reward-sats {
      font-size: 13px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .rewards-actions {
      display: flex;
      gap: 12px;
    }
    .btn {
      padding: 10px 20px;
      border-radius: var(--r-sm);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .btn-convert {
      background: var(--primary);
      color: white;
      &:hover:not(:disabled) { background: var(--primary-light); }
    }
    .btn-withdraw {
      background: var(--btc);
      color: white;
      &:hover:not(:disabled) { background: var(--btc-light); }
    }
    .min-hint {
      margin: 12px 0 0;
      font-size: 12px;
      color: var(--text-muted);
    }
  `]
})
export class LpBtcRewardsCardComponent {
  claimableSatoshis = input.required<number>();
  balanceCents = input.required<number>();
  isProcessing = input(false);

  convert = output<void>();
  withdraw = output<void>();

  formatSats = formatSats;
  formatSatsToBtc = formatSatsToBtc;
  formatBrlCents = formatBrlCents;
}
