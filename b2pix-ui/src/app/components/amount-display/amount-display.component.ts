import { Component, computed, input } from '@angular/core';
import { formatBrlCents, formatSatsToBtc } from '../../shared/utils/format.util';

@Component({
  selector: 'app-amount-display',
  standalone: true,
  template: `
    <div class="amount-display" [class]="'amount-display--' + size()">
      @if (label()) {
        <span class="amount-display__label">{{ label() }}</span>
      }
      <span class="amount-display__brl">{{ formattedBrl() }}</span>
      @if (showBtc() && amountSats() > 0) {
        <span class="amount-display__btc">&asymp; {{ formattedBtc() }} sBTC</span>
      }
    </div>
  `,
  styles: [`
    .amount-display {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .amount-display__label {
      font-size: 13px;
      font-weight: 500;
      opacity: 0.7;
    }

    .amount-display__brl {
      font-family: var(--font-display);
      font-weight: 700;
      color: inherit;
    }

    .amount-display__btc {
      font-family: var(--font-mono);
      font-weight: 500;
      opacity: 0.7;
    }

    .amount-display--sm {
      .amount-display__label { font-size: 11px; }
      .amount-display__brl { font-size: 16px; }
      .amount-display__btc { font-size: 12px; }
    }

    .amount-display--md {
      .amount-display__label { font-size: 13px; }
      .amount-display__brl { font-size: 24px; }
      .amount-display__btc { font-size: 14px; }
    }

    .amount-display--lg {
      .amount-display__label { font-size: 14px; }
      .amount-display__brl { font-size: 32px; }
      .amount-display__btc { font-size: 16px; }
    }
  `]
})
export class AmountDisplayComponent {
  amountCents = input<number>(0);
  amountSats = input<number>(0);
  size = input<'sm' | 'md' | 'lg'>('md');
  showBtc = input<boolean>(true);
  label = input<string>('');

  formattedBrl = computed(() => formatBrlCents(this.amountCents()));
  formattedBtc = computed(() => formatSatsToBtc(this.amountSats()));
}
