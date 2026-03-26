import { Component, Input } from '@angular/core';
import { InvoicePublicSummary } from '../../../shared/models/invoice.model';
import { formatBrlCents } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-payment-step-success',
  standalone: true,
  template: `
    <div class="step-success fade-up">
      <div class="result-icon success">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17L4 12"/>
        </svg>
      </div>
      <h2 class="success-title font-display">Pagamento confirmado!</h2>
      @if (invoiceSummary) {
        <p class="success-amount">{{ formatBrlCents(invoiceSummary.value_brl) }}</p>
      }
      <p class="success-text">
        Seu pagamento foi recebido e confirmado com sucesso. Você receberá uma confirmação por email.
      </p>
    </div>
  `,
  styles: [`
    .step-success { text-align: center; padding: 40px 0; }
    .success-title { font-size: 22px; font-weight: 700; color: var(--success); margin: 0 0 8px; }
    .success-amount { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px; }
    .success-text { font-size: 14px; color: var(--text-muted); line-height: 1.6; margin: 0; }
  `]
})
export class PaymentStepSuccessComponent {
  @Input() invoiceSummary: InvoicePublicSummary | null = null;
  formatBrlCents = formatBrlCents;
}
