import { Component } from '@angular/core';

@Component({
  selector: 'app-payment-step-processing',
  standalone: true,
  template: `
    <div class="step-processing fade-up">
      <div class="processing-spinner">
        <div class="loading-spinner"></div>
      </div>
      <h2 class="processing-title font-display">Verificando seu pagamento...</h2>
      <p class="processing-text">
        Estamos verificando se o PIX foi recebido. Isso pode levar alguns segundos.
      </p>
      <p class="processing-hint">Não feche esta página.</p>
    </div>
  `,
  styles: [`
    .step-processing { text-align: center; padding: 40px 0; }
    .processing-spinner { margin-bottom: 24px; display: flex; justify-content: center; }
    .processing-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; }
    .processing-text { font-size: 14px; color: var(--text-muted); line-height: 1.6; margin: 0 0 12px; }
    .processing-hint { font-size: 12px; color: var(--text-dim); margin: 0; }
  `]
})
export class PaymentStepProcessingComponent {}
