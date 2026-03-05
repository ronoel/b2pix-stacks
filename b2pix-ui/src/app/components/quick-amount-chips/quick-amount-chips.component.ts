import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-quick-amount-chips',
  standalone: true,
  templateUrl: './quick-amount-chips.component.html',
  styleUrl: './quick-amount-chips.component.scss'
})
export class QuickAmountChipsComponent {
  amounts = input.required<number[]>();
  selectedAmount = input<number>(0);
  disabledAmounts = input<number[]>([]);
  formatLabel = input<(amount: number) => string>();

  amountSelected = output<number>();

  getLabel(amount: number): string {
    const customFormatter = this.formatLabel();
    if (customFormatter) {
      return customFormatter(amount);
    }
    if (amount >= 1000) {
      return `R$ ${amount / 1000}K`;
    }
    return `R$ ${amount}`;
  }

  isDisabled(amount: number): boolean {
    return this.disabledAmounts().includes(amount);
  }

  select(amount: number) {
    this.amountSelected.emit(amount);
  }
}
