import { Component, input, output, signal, computed, linkedSignal, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-currency-input',
  standalone: true,
  templateUrl: './currency-input.component.html',
  styleUrl: './currency-input.component.scss'
})
export class CurrencyInputComponent {
  /** Current value in cents. Two-way bindable via [(valueCents)] */
  valueCents = input<number>(0);
  valueCentsChange = output<number>();

  /** Currency prefix shown inside the input */
  prefix = input<string>('R$');

  /** Placeholder when value is zero */
  placeholder = input<string>('0,00');

  /** Font size class: 'default' or 'large' */
  size = input<'default' | 'large'>('default');

  private inputRef = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  /** Internal cents tracked independently so we can update from both typing and external changes */
  private internalCents = linkedSignal(() => this.valueCents());

  displayValue = computed(() => {
    const cents = this.internalCents();
    if (cents <= 0) return '';
    return this.formatCents(cents);
  });

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const current = this.internalCents();
      const next = Math.floor(current / 10);
      this.internalCents.set(next);
      this.valueCentsChange.emit(next);
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      this.internalCents.set(0);
      this.valueCentsChange.emit(0);
      return;
    }

    const digit = event.key;
    if (!/^\d$/.test(digit)) {
      if (!event.ctrlKey && !event.metaKey && event.key !== 'Tab' && event.key !== 'Enter') {
        event.preventDefault();
      }
      return;
    }

    event.preventDefault();
    const d = parseInt(digit, 10);
    const current = this.internalCents();
    const next = current * 10 + d;

    // Cap at 99_999_999 cents (R$ 999.999,99) to avoid overflow
    if (next > 99_999_999) return;

    this.internalCents.set(next);
    this.valueCentsChange.emit(next);
  }

  onInput(event: Event): void {
    // Prevent any direct input (handled via keydown)
    const el = event.target as HTMLInputElement;
    el.value = this.displayValue();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') || '';
    const digits = text.replace(/\D/g, '');
    if (!digits) return;

    let cents = parseInt(digits, 10);
    if (cents > 99_999_999) cents = 99_999_999;

    this.internalCents.set(cents);
    this.valueCentsChange.emit(cents);
  }

  /** Set value programmatically (used by quick-amount chips) */
  setValue(cents: number): void {
    this.internalCents.set(cents);
    this.valueCentsChange.emit(cents);
  }

  private formatCents(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
