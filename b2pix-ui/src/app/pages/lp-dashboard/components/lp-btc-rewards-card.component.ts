import { Component, input, output } from '@angular/core';
import { formatSats, formatSatsToBtc, formatBrlCents } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-lp-btc-rewards-card',
  standalone: true,
  template: `
    <div class="btc-rewards-card">
      <div class="rewards-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M11.5 6V2.5M12.5 6V2.5M8 13.5H16M8 10.5H16M9 21H15C15 21 16 21 16 20V17.5C17.3807 17.5 18.5 16.3807 18.5 15V9C18.5 7.61929 17.3807 6.5 16 6.5H8C6.61929 6.5 5.5 7.61929 5.5 9V15C5.5 16.3807 6.61929 17.5 8 17.5V20C8 21 9 21 9 21Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>Recompensas BTC</h3>
      </div>

      <div class="rewards-body">
        <div class="reward-stat">
          <span class="reward-label">Saldo BTC disponivel</span>
          <span class="reward-value">{{ formatSats(claimableSatoshis()) }} sats</span>
          <span class="reward-btc">{{ formatSatsToBtc(claimableSatoshis()) }} BTC</span>
        </div>
        <div class="reward-stat">
          <span class="reward-label">Saldo BRL conversivel</span>
          <span class="reward-value">{{ formatBrlCents(balanceCents()) }}</span>
        </div>
      </div>

      <div class="rewards-actions">
        <button
          class="btn btn-convert"
          [disabled]="balanceCents() <= 0 || isProcessing()"
          (click)="convert.emit()">
          Converter Saldo
        </button>
        <button
          class="btn btn-withdraw"
          [disabled]="claimableSatoshis() < 1500 || isProcessing()"
          (click)="withdraw.emit()">
          Sacar BTC
        </button>
      </div>
      @if (claimableSatoshis() < 1500 && claimableSatoshis() > 0) {
        <p class="min-hint">Minimo para saque: 1.500 sats</p>
      }
    </div>
  `,
  styles: [`
    .btc-rewards-card {
      background: #FFF7ED;
      border: 1px solid #FDBA74;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .rewards-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      color: #EA580C;
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
      color: #9A3412;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .reward-value {
      font-size: 20px;
      font-weight: 700;
      color: #EA580C;
    }
    .reward-btc {
      font-size: 13px;
      color: #C2410C;
      font-family: monospace;
    }
    .rewards-actions {
      display: flex;
      gap: 12px;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .btn-convert {
      background: #1E40AF;
      color: white;
      &:hover:not(:disabled) { background: #1D4ED8; }
    }
    .btn-withdraw {
      background: #EA580C;
      color: white;
      &:hover:not(:disabled) { background: #C2410C; }
    }
    .min-hint {
      margin: 12px 0 0;
      font-size: 12px;
      color: #9A3412;
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
