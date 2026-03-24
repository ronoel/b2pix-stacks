import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PixQrData } from './payment-confirmation.component';
import { QuickAmountChipsComponent } from '../../../components/quick-amount-chips/quick-amount-chips.component';
import { formatBrlCents } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-value-input',
  standalone: true,
  imports: [FormsModule, QuickAmountChipsComponent],
  template: `
    <div class="value-input">
      <div class="alert-box alert-info">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>O QR Code não possui valor definido. Informe o valor do pagamento.</span>
      </div>

      @if (qrData().recipientName) {
        <div class="recipient-info">
          <span class="recipient-label">Recebedor</span>
          <span class="recipient-name">{{ qrData().recipientName }}</span>
        </div>
      }

      <div class="value-section">
        <label class="form-label">Valor do pagamento</label>

        <app-quick-amount-chips
          [amounts]="quickAmounts"
          [selectedAmount]="selectedQuickAmount()"
          [formatLabel]="formatChipLabel"
          (amountSelected)="onQuickAmountSelected($event)"
        />

        <div class="input-with-addon">
          <span class="input-prefix">R$</span>
          <input
            type="text"
            inputmode="decimal"
            class="form-input has-prefix"
            placeholder="0,00"
            [ngModel]="displayValue()"
            (ngModelChange)="onValueChange($event)"
          />
        </div>

        <span class="limit-hint">Máx: R$ 1.000,00 por operação</span>
      </div>

      @if (valueError()) {
        <div class="alert-box alert-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>{{ valueError() }}</span>
        </div>
      }

      <div class="actions">
        <button
          class="btn btn-primary btn-lg full-width"
          [disabled]="!isValid()"
          (click)="onSubmit()">
          Continuar
        </button>
        <button class="btn btn-ghost full-width" (click)="cancelled.emit()">
          Voltar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .value-input {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .recipient-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
    }

    .recipient-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .recipient-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .value-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .limit-hint {
      font-size: 13px;
      color: var(--text-muted);
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }

    .full-width { width: 100%; }
  `]
})
export class ValueInputComponent {
  readonly MAX_VALUE_CENTS = 100000;

  qrData = input.required<PixQrData>();
  valueSubmitted = output<number>();
  cancelled = output<void>();

  valueInCents = signal(0);
  selectedQuickAmount = signal(0);
  quickAmounts = [20, 50, 100, 250];

  displayValue = computed(() => {
    const cents = this.valueInCents();
    if (cents <= 0) return '';
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });

  valueError = computed(() => {
    const cents = this.valueInCents();
    if (cents > this.MAX_VALUE_CENTS) {
      return `Valor acima do limite de ${formatBrlCents(this.MAX_VALUE_CENTS)}.`;
    }
    return '';
  });

  isValid = computed(() => {
    const cents = this.valueInCents();
    return cents > 0 && cents <= this.MAX_VALUE_CENTS;
  });

  formatChipLabel = (amount: number) => `R$ ${amount}`;

  onQuickAmountSelected(amountBrl: number) {
    const cents = amountBrl * 100;
    this.valueInCents.set(cents);
    this.selectedQuickAmount.set(amountBrl);
  }

  onValueChange(displayStr: string) {
    this.selectedQuickAmount.set(0);
    const cleaned = displayStr.replace(/[^\d,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      this.valueInCents.set(Math.round(parsed * 100));
    } else {
      this.valueInCents.set(0);
    }
  }

  onSubmit() {
    if (this.isValid()) {
      this.valueSubmitted.emit(this.valueInCents());
    }
  }
}
