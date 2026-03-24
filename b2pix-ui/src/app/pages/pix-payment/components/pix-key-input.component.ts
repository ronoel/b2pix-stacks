import { Component, output, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuickAmountChipsComponent } from '../../../components/quick-amount-chips/quick-amount-chips.component';
import { formatBrlCents } from '../../../shared/utils/format.util';
import {
  PixKeyType,
  detectPixKeyType,
  getPixKeyTypeLabel,
  normalizePixKey
} from '../../../shared/utils/pix-validation.util';

export interface PixKeySubmitData {
  pixKey: string;
  pixKeyType: PixKeyType;
  valueInCents: number;
}

@Component({
  selector: 'app-pix-key-input',
  standalone: true,
  imports: [FormsModule, QuickAmountChipsComponent],
  templateUrl: './pix-key-input.component.html',
  styleUrls: ['./pix-key-input.component.scss']
})
export class PixKeyInputComponent {
  readonly MAX_VALUE_CENTS = 100000;

  pixKeySubmitted = output<PixKeySubmitData>();
  cancelled = output<void>();

  // Key input
  pixKeyValue = signal('');
  detectedKeyType = signal<PixKeyType | null>(null);
  isKeyValid = signal(false);
  keyTouched = signal(false);

  // Value input
  valueInCents = signal(0);
  selectedQuickAmount = signal(0);
  quickAmounts = [20, 50, 100, 250];

  constructor() {
    // Auto-detect key type as user types
    effect(() => {
      const key = this.pixKeyValue().trim();
      if (key.length === 0) {
        this.detectedKeyType.set(null);
        this.isKeyValid.set(false);
        return;
      }
      const type = detectPixKeyType(key);
      this.detectedKeyType.set(type);
      this.isKeyValid.set(type !== null);
    });
  }

  keyTypeLabel = computed(() => {
    const type = this.detectedKeyType();
    return type ? getPixKeyTypeLabel(type) : '';
  });

  keyError = computed(() => {
    if (!this.keyTouched() || this.pixKeyValue().trim().length === 0) return '';
    if (!this.isKeyValid()) {
      return 'Chave PIX inválida. Formatos aceitos: CPF, CNPJ, telefone (+55), e-mail ou chave aleatória (UUID).';
    }
    return '';
  });

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

  isFormValid = computed(() => {
    const cents = this.valueInCents();
    return this.isKeyValid() && cents > 0 && cents <= this.MAX_VALUE_CENTS;
  });

  formatChipLabel = (amount: number) => `R$ ${amount}`;

  onKeyBlur() {
    this.keyTouched.set(true);
  }

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
    if (this.isFormValid()) {
      this.pixKeySubmitted.emit({
        pixKey: normalizePixKey(this.pixKeyValue()),
        pixKeyType: this.detectedKeyType()!,
        valueInCents: this.valueInCents()
      });
    }
  }
}
