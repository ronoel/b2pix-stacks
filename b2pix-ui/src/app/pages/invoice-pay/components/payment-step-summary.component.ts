import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvoicePublicSummary } from '../../../shared/models/invoice.model';
import { formatBrlCents, formatTruncated } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-payment-step-summary',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="step-summary fade-up">
      @if (invoiceSummary; as inv) {
        <div class="invoice-card">
          <div class="invoice-card__amount-section">
            <span class="invoice-card__currency">R$</span>
            <h2 class="invoice-card__amount font-display">{{ formatAmountWhole(inv.value_brl) }}</h2>
            <span class="invoice-card__cents font-mono">,{{ formatAmountCents(inv.value_brl) }}</span>
          </div>
          <div class="invoice-card__meta">
            <span class="invoice-card__merchant font-mono">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              {{ truncateAddress(inv.creator_address) }}
            </span>
          </div>
          <p class="invoice-card__note">
            Pagamento instantâneo via PIX convertido em Bitcoin
          </p>
        </div>
      }

      <div class="email-section">
        <label class="email-label">Informe seu email para continuar</label>
        <input
          type="email"
          class="form-input"
          placeholder="seu&#64;email.com"
          autocomplete="email"
          inputmode="email"
          [value]="emailValue()"
          (input)="emailValue.set($any($event.target).value)"
          (keydown.enter)="submit()"
        />
      </div>

      @if (error) {
        <div class="alert-box alert-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>{{ error }}</span>
        </div>
      }

      <button
        class="btn btn-primary btn-lg btn-full"
        [disabled]="!isValidEmail() || isLoading"
        (click)="submit()"
      >
        @if (isLoading) {
          <div class="loading-spinner-sm"></div>
          Enviando...
        } @else {
          Continuar
        }
      </button>
    </div>
  `,
  styles: [`
    .step-summary { display: flex; flex-direction: column; gap: 20px; }

    .invoice-card {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--r-xl);
      padding: 28px 20px 20px;
      text-align: center;
    }

    .invoice-card__amount-section {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 2px;
      margin-bottom: 14px;
    }

    .invoice-card__currency {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-muted);
      margin-right: 2px;
    }

    .invoice-card__amount {
      font-size: 40px;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0;
      letter-spacing: -1px;
      line-height: 1;
    }

    .invoice-card__cents {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-muted);
      align-self: flex-start;
      margin-top: 4px;
    }

    .invoice-card__meta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }

    .invoice-card__merchant {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .invoice-card__separator { color: var(--text-dim); font-size: 12px; }

    .invoice-card__label {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .invoice-card__note {
      font-size: 11px;
      color: var(--text-dim);
      line-height: 1.5;
      margin: 0;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .email-section { display: flex; flex-direction: column; gap: 8px; }
    .email-label { font-size: 14px; font-weight: 600; color: var(--text-secondary); }
  `]
})
export class PaymentStepSummaryComponent {
  @Input() invoiceSummary: InvoicePublicSummary | null = null;
  @Input() email = '';
  @Input() isLoading = false;
  @Input() error = '';
  @Output() emailSubmit = new EventEmitter<string>();

  emailValue = signal('');

  formatBrlCents = formatBrlCents;

  ngOnInit(): void {
    if (this.email) this.emailValue.set(this.email);
  }

  truncateAddress(address: string): string {
    return formatTruncated(address, 6, 4);
  }

  formatAmountWhole(cents: number): string {
    const whole = Math.floor(cents / 100);
    return new Intl.NumberFormat('pt-BR').format(whole);
  }

  formatAmountCents(cents: number): string {
    return (cents % 100).toString().padStart(2, '0');
  }

  isValidEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.emailValue());
  }

  submit(): void {
    if (this.isValidEmail() && !this.isLoading) {
      this.emailSubmit.emit(this.emailValue());
    }
  }
}
