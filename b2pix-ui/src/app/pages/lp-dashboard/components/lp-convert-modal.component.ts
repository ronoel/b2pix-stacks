import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatBrlCents } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-lp-convert-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="sheet-overlay" (click)="cancel.emit()">
      <div class="sheet" (click)="$event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h3 class="sheet-title">Converter saldo para Bitcoin</h3>
        <p class="sheet-text">Saldo disponível: {{ formatBrlCents(maxAmountCents()) }}</p>

        <div class="input-group">
          <label>Valor a converter</label>
          <input
            type="number"
            class="form-input"
            [(ngModel)]="amountReais"
            [max]="maxAmountCents() / 100"
            min="0.01"
            step="0.01"
          />
          <button class="btn-link" (click)="useMax()">Usar todo o saldo</button>
        </div>

        <div class="sheet-actions">
          <button class="btn btn-primary btn-full" (click)="onConfirm()" [disabled]="isProcessing() || !isValid()">
            @if (isProcessing()) {
              <div class="loading-spinner-sm"></div>
              Convertendo...
            } @else {
              Confirmar conversão
            }
          </button>
          <button class="btn btn-ghost btn-full" (click)="cancel.emit()" [disabled]="isProcessing()">Cancelar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sheet-title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 8px;
    }
    .sheet-text {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
      margin: 0 0 20px;
    }
    .input-group {
      margin-bottom: 24px;
      label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 6px;
      }
    }
    .form-input {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid var(--border);
      border-radius: var(--r-md);
      font-size: 16px;
      box-sizing: border-box;
      color: var(--text-primary);
      background: var(--bg-primary);
      font-family: var(--font-body);
      &:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-glow);
      }
    }
    .btn-link {
      background: none;
      border: none;
      color: var(--primary);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      padding: 4px 0;
      margin-top: 4px;
      &:hover { text-decoration: underline; }
    }
    .sheet-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 24px;
      border-radius: var(--r-sm);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .btn-full { width: 100%; }
    .btn-primary {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
      &:hover:not(:disabled) { background: var(--primary-light); }
    }
    .btn-ghost {
      background: transparent;
      color: var(--text-muted);
      border: none;
      &:hover:not(:disabled) { background: var(--bg-elevated); }
    }
    .loading-spinner-sm {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
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
