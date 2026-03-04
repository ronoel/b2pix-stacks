import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatBrlCents } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-lp-convert-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-overlay" (click)="cancel.emit()">
      <div class="confirm-modal" (click)="$event.stopPropagation()">
        <div class="confirm-icon orange">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 2V22" stroke="currentColor" stroke-width="2"/>
            <path d="M17 5H9.5C8.11929 5 7 6.11929 7 7.5V7.5C7 8.88071 8.11929 10 9.5 10H14.5C15.8807 10 17 11.1193 17 12.5V12.5C17 13.8807 15.8807 15 14.5 15H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3>Converter Saldo para BTC</h3>
        <p>Informe o valor em BRL que deseja converter para BTC. Maximo: {{ formatBrlCents(maxAmountCents()) }}</p>

        <div class="input-group">
          <label>Valor (R$)</label>
          <input
            type="number"
            [(ngModel)]="amountReais"
            [max]="maxAmountCents() / 100"
            min="0.01"
            step="0.01"
          />
          <button class="btn-link" (click)="useMax()">Usar maximo</button>
        </div>

        <div class="confirm-actions">
          <button class="btn btn-outline" (click)="cancel.emit()" [disabled]="isProcessing()">Cancelar</button>
          <button class="btn btn-primary" (click)="onConfirm()" [disabled]="isProcessing() || !isValid()">
            @if (isProcessing()) {
              <div class="loading-spinner-sm"></div>
              Convertendo...
            } @else {
              Confirmar
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
export class LpConvertModalComponent {
  maxAmountCents = input.required<number>();
  isProcessing = input(false);

  confirm = output<number>();
  cancel = output<void>();

  amountReais = 0;
  formatBrlCents = formatBrlCents;

  ngOnInit() {
    this.useMax();
  }

  useMax() {
    this.amountReais = Math.floor(this.maxAmountCents() / 100 * 100) / 100;
  }

  isValid(): boolean {
    return this.amountReais > 0 && Math.round(this.amountReais * 100) <= this.maxAmountCents();
  }

  onConfirm() {
    if (this.isValid()) {
      this.confirm.emit(Math.round(this.amountReais * 100));
    }
  }
}
