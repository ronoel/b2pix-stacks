import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-payment-step-error',
  standalone: true,
  template: `
    <div class="step-error fade-up">
      <div class="result-icon error">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <h2 class="error-title font-display">Erro</h2>
      <p class="error-text">{{ message || 'Ocorreu um erro inesperado.' }}</p>
    </div>
  `,
  styles: [`
    .step-error { text-align: center; padding: 40px 0; }
    .error-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; }
    .error-text { font-size: 14px; color: var(--text-muted); line-height: 1.6; margin: 0; }
  `]
})
export class PaymentStepErrorComponent {
  @Input() message = '';
}
