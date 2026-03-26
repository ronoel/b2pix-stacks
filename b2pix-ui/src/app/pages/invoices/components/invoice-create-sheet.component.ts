import { Component, Input, Output, EventEmitter, inject, signal, computed, viewChild } from '@angular/core';
import { StatusSheetComponent } from '../../../components/status-sheet/status-sheet.component';
import { QuickAmountChipsComponent } from '../../../components/quick-amount-chips/quick-amount-chips.component';
import { CurrencyInputComponent } from '../../../components/currency-input/currency-input.component';
import { InvoiceApiService } from '../../../shared/api/invoice.service';
import { QuoteService } from '../../../shared/api/quote.service';
import { Invoice, estimateInvoiceSbtc } from '../../../shared/models/invoice.model';
import { formatSats } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-invoice-create-sheet',
  standalone: true,
  imports: [StatusSheetComponent, QuickAmountChipsComponent, CurrencyInputComponent],
  templateUrl: './invoice-create-sheet.component.html',
  styleUrl: './invoice-create-sheet.component.scss'
})
export class InvoiceCreateSheetComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<Invoice>();

  private invoiceApi = inject(InvoiceApiService);
  private quoteService = inject(QuoteService);
  private currencyInput = viewChild<CurrencyInputComponent>('currencyInput');

  /** Amount in cents */
  amountCents = signal(0);
  label = signal('');
  isCreating = signal(false);
  error = signal('');

  readonly MIN_BRL_CENTS = 100; // R$ 1,00
  readonly MAX_BRL_CENTS = 500000; // R$ 5.000,00
  readonly quickAmounts = [50, 100, 250, 500];

  btcPriceCents = computed(() => {
    const price = this.quoteService.getLastKnownPrice();
    return price ? parseInt(price.toString(), 10) : 0;
  });

  estimatedSats = computed(() => {
    return estimateInvoiceSbtc(this.amountCents(), this.btcPriceCents());
  });

  canCreate = computed(() =>
    this.amountCents() >= this.MIN_BRL_CENTS &&
    this.amountCents() <= this.MAX_BRL_CENTS &&
    !this.isCreating()
  );

  formatSats = formatSats;

  onAmountChange(cents: number): void {
    this.amountCents.set(cents);
    this.error.set('');
  }

  onQuickAmount(amountBrl: number): void {
    const cents = amountBrl * 100;
    this.amountCents.set(cents);
    this.currencyInput()?.setValue(cents);
    this.error.set('');
  }

  onLabelInput(event: Event): void {
    this.label.set((event.target as HTMLInputElement).value);
  }

  create(): void {
    if (!this.canCreate()) return;

    const labelValue = this.label().trim() || undefined;

    this.isCreating.set(true);
    this.error.set('');

    this.invoiceApi.createInvoice(this.amountCents(), labelValue).subscribe({
      next: (invoice) => {
        this.isCreating.set(false);
        this.reset();
        this.created.emit(invoice);
      },
      error: (err) => {
        this.isCreating.set(false);
        this.error.set(err.message || 'Erro ao criar cobrança. Tente novamente.');
      }
    });
  }

  private reset(): void {
    this.amountCents.set(0);
    this.currencyInput()?.setValue(0);
    this.label.set('');
    this.error.set('');
  }
}
