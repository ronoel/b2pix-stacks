import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-payment-step-expired',
  standalone: true,
  template: `
    <div class="step-expired fade-up">
      <div class="expired-header">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <h2 class="expired-title font-display">Tempo esgotado</h2>
        <p class="expired-text">O prazo de 15 minutos para pagamento expirou.</p>
      </div>

      <div class="expired-warning">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <strong>Você já fez o PIX?</strong>
          <p>Se você já enviou o pagamento, clique em "Verificar pagamento" para que possamos confirmar. Não faça um novo pagamento.</p>
        </div>
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
        [disabled]="isLoading || resubmitAttempts >= maxResubmitAttempts"
        (click)="resubmit.emit()"
      >
        @if (isLoading) {
          <div class="loading-spinner-sm"></div>
          Verificando...
        } @else if (resubmitAttempts >= maxResubmitAttempts) {
          Tentativas esgotadas. Aguarde a análise.
        } @else {
          Verificar pagamento
        }
      </button>

      <button class="btn btn-ghost btn-lg btn-full" (click)="newPayment.emit()">
        Fazer novo pagamento
      </button>

      @if (resubmitAttempts > 0 && resubmitAttempts < maxResubmitAttempts) {
        <p class="new-payment-warning">
          Se você fizer um novo pagamento, o PIX anterior não poderá ser verificado automaticamente.
        </p>
      }
    </div>
  `,
  styles: [`
    .step-expired { display: flex; flex-direction: column; gap: 16px; }
    .expired-header { text-align: center; padding: 20px 0 8px; }
    .expired-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 16px 0 8px; }
    .expired-text { font-size: 14px; color: var(--text-muted); margin: 0; }
    .expired-warning {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 14px 16px;
      background: var(--btc-bg);
      border: 1px solid var(--warning);
      border-radius: var(--r-md);
    }
    .expired-warning strong { display: block; font-size: 14px; color: #92400E; margin-bottom: 4px; }
    .expired-warning p { font-size: 13px; color: #78350F; line-height: 1.5; margin: 0; }
    .expired-warning svg { flex-shrink: 0; margin-top: 2px; }
    .new-payment-warning {
      font-size: 12px; color: var(--text-dim); text-align: center;
      line-height: 1.5; margin: 0;
    }
  `]
})
export class PaymentStepExpiredComponent {
  @Input() isLoading = false;
  @Input() error = '';
  @Input() resubmitAttempts = 0;
  @Input() maxResubmitAttempts = 3;
  @Output() resubmit = new EventEmitter<void>();
  @Output() newPayment = new EventEmitter<void>();
}
