import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatSats, formatSatsToBtc } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-lp-withdraw-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="cancel.emit()">
      <div class="confirm-modal" (click)="$event.stopPropagation()">
        <div class="confirm-icon orange">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M5 12L12 19L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3>Sacar BTC</h3>
        <p>Informe a quantidade de satoshis para sacar. Disponivel: {{ formatSats(maxAmountSats()) }} sats ({{ formatSatsToBtc(maxAmountSats()) }} BTC)</p>

        <div class="input-group">
          <label>Quantidade (sats)</label>
          <input
            type="number"
            [(ngModel)]="amountSats"
            [max]="maxAmountSats()"
            min="1500"
            step="1"
          />
          <button class="btn-link" (click)="useMax()">Usar maximo</button>
          @if (amountSats > 0 && amountSats < 1500) {
            <p class="warning">Minimo para saque: 1.500 sats</p>
          }
        </div>

        <div class="confirm-actions">
          <button class="btn btn-outline" (click)="cancel.emit()" [disabled]="isProcessing()">Cancelar</button>
          <button class="btn btn-primary" (click)="onConfirm()" [disabled]="isProcessing() || !isValid()">
            @if (isProcessing()) {
              <div class="loading-spinner-sm"></div>
              Sacando...
            } @else {
              Confirmar Saque
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 20px;
    }
    .confirm-modal {
      background: #fff; border-radius: 16px; padding: 32px;
      max-width: 440px; width: 100%; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      h3 { font-size: 18px; font-weight: 600; color: #1F2937; margin: 0 0 12px; }
      p { font-size: 14px; color: #6B7280; line-height: 1.6; margin: 0 0 24px; }
    }
    .confirm-icon {
      display: flex; justify-content: center; margin-bottom: 16px;
      &.orange { color: #EA580C; }
    }
    .input-group {
      margin-bottom: 24px; text-align: left;
      label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
      input {
        width: 100%; padding: 10px 14px; border: 1px solid #D1D5DB;
        border-radius: 8px; font-size: 16px; box-sizing: border-box;
        &:focus { outline: none; border-color: #EA580C; box-shadow: 0 0 0 3px rgba(234,88,12,0.1); }
      }
    }
    .btn-link {
      background: none; border: none; color: #EA580C; font-size: 13px;
      cursor: pointer; padding: 4px 0; margin-top: 4px;
      &:hover { text-decoration: underline; }
    }
    .warning {
      color: #DC2626; font-size: 12px; margin: 6px 0 0;
    }
    .confirm-actions { display: flex; gap: 12px; justify-content: center; }
    .btn {
      flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: all 0.2s ease; border: none;
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .btn-outline {
      background: #fff; color: #374151; border: 1px solid #D1D5DB;
      &:hover:not(:disabled) { border-color: #9CA3AF; background: #F9FAFB; }
    }
    .btn-primary {
      background: #EA580C; color: white;
      &:hover:not(:disabled) { background: #C2410C; }
    }
    .loading-spinner-sm {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white;
      border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LpWithdrawModalComponent {
  maxAmountSats = input.required<number>();
  isProcessing = input(false);

  confirm = output<number>();
  cancel = output<void>();

  amountSats = 0;
  formatSats = formatSats;
  formatSatsToBtc = formatSatsToBtc;

  ngOnInit() {
    this.useMax();
  }

  useMax() {
    this.amountSats = this.maxAmountSats();
  }

  isValid(): boolean {
    return this.amountSats >= 1500 && this.amountSats <= this.maxAmountSats();
  }

  onConfirm() {
    if (this.isValid()) {
      this.confirm.emit(this.amountSats);
    }
  }
}
