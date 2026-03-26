import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CountdownTimerComponent } from '../../../components/countdown-timer/countdown-timer.component';
import { PixCopiaColaComponent } from '../../../components/pix-copia-cola/pix-copia-cola.component';
import { SessionStatusResponse } from '../../../shared/models/invoice.model';
import { formatBrlCents } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-payment-step-qr',
  standalone: true,
  imports: [CountdownTimerComponent, PixCopiaColaComponent],
  template: `
    <div class="step-qr fade-up">
      <app-countdown-timer
        [expiresAt]="session.expires_at"
        (expired)="expired.emit()"
      />

      <div class="qr-amount">
        <span class="qr-amount__label">Valor a pagar</span>
        <span class="qr-amount__value font-display">{{ formatBrlCents(session.value_brl) }}</span>
      </div>

      <app-pix-copia-cola
        [pixKey]="session.pix_key"
        [amount]="session.value_brl / 100"
        labelText="Chave PIX"
        [showLabel]="true"
      />

      <button
        class="btn btn-primary btn-lg btn-full"
        [disabled]="isLoading"
        (click)="markPaid.emit()"
      >
        @if (isLoading) {
          <div class="loading-spinner-sm"></div>
          Verificando...
        } @else {
          Paguei
        }
      </button>
    </div>
  `,
  styles: [`
    .step-qr { display: flex; flex-direction: column; gap: 20px; }
    .qr-amount {
      text-align: center;
      padding: 16px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
    }
    .qr-amount__label {
      display: block;
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    .qr-amount__value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }
  `]
})
export class PaymentStepQrComponent {
  @Input({ required: true }) session!: SessionStatusResponse;
  @Input() isLoading = false;
  @Output() markPaid = new EventEmitter<void>();
  @Output() expired = new EventEmitter<void>();

  formatBrlCents = formatBrlCents;
}
