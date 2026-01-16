import { Component, Input, Output, EventEmitter, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="payment-container">
      <!-- Timer Warning - Compact -->
      <div class="timer-warning-compact">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="timer-label-compact">Tempo restante:</span>
        <div class="timer-display-compact">{{ formattedTime }}</div>
      </div>

      <div class="payment-card">
        <!-- Amount Section - Compact -->
        <div class="amount-section-compact">
          <div class="amount-row-compact">
            <div class="amount-item-compact">
              <span class="amount-label-compact">Você pagará</span>
              <div class="payment-amount-compact">R$ {{ fiatAmount }}</div>
            </div>
            <div class="amount-item-compact">
              <span class="amount-label-compact">Receberá</span>
              <div class="btc-amount-container">
                <span class="btc-approximation-symbol">~</span>
                <div class="btc-amount-compact">{{ btcAmount }} BTC</div>
                <svg class="btc-info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" title="Valor aproximado, pode variar conforme taxa de câmbio">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- PIX Key Section - HIGHLIGHTED -->
        <div class="pix-section-highlight">
          <div class="section-header-highlight">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M2 10h20" stroke="currentColor" stroke-width="2"/>
            </svg>
            <label class="pix-label-highlight">1. Chave PIX do Vendedor</label>
          </div>
          <div class="pix-key-container-highlight">
            <input type="text" readonly [value]="pixKey" class="pix-key-input-highlight">
            <button type="button" class="btn-copy-highlight" (click)="copyPix.emit()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
              </svg>
              Copiar
            </button>
          </div>
          <p class="pix-help-text">Use esta chave PIX para fazer o pagamento</p>
        </div>

        <!-- Transaction ID Section - HIGHLIGHTED -->
        <div class="transaction-id-section-highlight">
          <div class="section-header-highlight">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            </svg>
            <label class="txid-label-highlight">2. ID da Transação PIX</label>
          </div>

          <p class="instruction-text-compact">Após realizar o pagamento, informe os <strong>3 últimos caracteres</strong> do ID da transação do comprovante PIX.</p>

          <div class="form-group-compact">
            <input
              type="text"
              id="transactionId"
              maxlength="3"
              [value]="transactionId()"
              (input)="onTransactionIdChange($any($event.target).value)"
              [disabled]="noTransactionId()"
              class="transaction-input-highlight"
              [class.disabled]="noTransactionId()"
              placeholder="Ex: 9Z7"
              autocomplete="off"
            >
            @if (transactionId().length > 0 && !canConfirm && !noTransactionId()) {
              <div class="error-message-compact">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Informe exatamente 3 caracteres
              </div>
            }
          </div>

          <div class="checkbox-group-compact">
            <label class="checkbox-label-compact">
              <input
                type="checkbox"
                [checked]="noTransactionId()"
                (change)="onNoTransactionIdChange($any($event.target).checked)"
              >
              <span class="checkbox-custom"></span>
              <span class="checkbox-text-compact">Não encontrei o ID da transação</span>
            </label>
            @if (noTransactionId()) {
              <div class="warning-message-compact">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Isso pode atrasar a validação</span>
              </div>
            }
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button type="button" class="btn btn-outline cancel-btn" (click)="cancel.emit()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Cancelar Compra
          </button>
          <button
            type="button"
            class="btn btn-success btn-lg confirm-btn"
            [disabled]="!canConfirm"
            (click)="confirm.emit()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            </svg>
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Payment Container */
    .payment-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Timer Warning - Compact */
    .timer-warning-compact {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #FEF3C7;
      border: 1px solid #FCD34D;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .timer-warning-compact svg {
      color: #D97706;
      flex-shrink: 0;
    }

    .timer-label-compact {
      color: #92400E;
      font-size: 11px;
      font-weight: 500;
      margin: 0;
    }

    .timer-display-compact {
      font-size: 16px;
      font-weight: 700;
      color: #B45309;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      letter-spacing: 1px;
      margin-left: auto;
    }

    /* Payment Card */
    .payment-card {
      padding: 24px;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    /* Amount Section - Ultra Compact */
    .amount-section-compact {
      margin-bottom: 16px;
      padding: 10px 14px;
      background: #F9FAFB;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
    }

    .amount-row-compact {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .amount-item-compact {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .amount-label-compact {
      font-size: 10px;
      color: #6B7280;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .payment-amount-compact {
      font-size: 16px;
      font-weight: 700;
      color: #F59E0B;
    }

    .btc-amount-compact {
      font-size: 14px;
      font-weight: 700;
      color: #059669;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    /* BTC Approximation Indicator */
    .btc-amount-container {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .btc-approximation-symbol {
      font-size: 16px;
      font-weight: 700;
      color: #059669;
      line-height: 1;
    }

    .btc-info-icon {
      color: #6B7280;
      flex-shrink: 0;
      cursor: help;
      transition: color 0.2s ease;
    }

    .btc-info-icon:hover {
      color: #059669;
    }

    /* PIX Section - Highlighted */
    .pix-section-highlight {
      margin-bottom: 24px;
      padding: 20px;
      background: linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%);
      border: 2px solid #3B82F6;
      border-radius: 12px;
      box-shadow: 0 4px 12px 0 rgb(59 130 246 / 0.15);
    }

    .section-header-highlight {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .section-header-highlight svg {
      color: #1E40AF;
      flex-shrink: 0;
    }

    .pix-label-highlight {
      font-size: 16px;
      font-weight: 700;
      color: #1E40AF;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pix-key-container-highlight {
      display: flex;
      gap: 12px;
      align-items: stretch;
      margin-bottom: 12px;
    }

    .pix-key-input-highlight {
      flex: 1;
      padding: 16px 18px;
      background: #FFFFFF;
      border: 2px solid #60A5FA;
      border-radius: 10px;
      color: #1E40AF;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 15px;
      font-weight: 600;
      box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
    }

    .btn-copy-highlight {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px 24px;
      background: #3B82F6;
      color: #FFFFFF;
      border: 2px solid #2563EB;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px 0 rgb(59 130 246 / 0.3);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .btn-copy-highlight:hover {
      background: #2563EB;
      border-color: #1E40AF;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px 0 rgb(37 99 235 / 0.4);
    }

    .pix-help-text {
      margin: 0;
      color: #1E40AF;
      font-size: 12px;
      font-weight: 500;
    }

    /* Transaction ID Section - Highlighted */
    .transaction-id-section-highlight {
      margin-bottom: 24px;
      padding: 20px;
      background: linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%);
      border: 2px solid #10B981;
      border-radius: 12px;
      box-shadow: 0 4px 12px 0 rgb(16 185 129 / 0.15);
    }

    .txid-label-highlight {
      font-size: 16px;
      font-weight: 700;
      color: #047857;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .instruction-text-compact {
      margin: 12px 0 16px 0;
      color: #065F46;
      font-size: 13px;
      line-height: 1.5;
      font-weight: 500;
    }

    .form-group-compact {
      margin-bottom: 16px;
    }

    .transaction-input-highlight {
      width: 100%;
      padding: 18px 20px;
      background: #FFFFFF;
      border: 2px solid #34D399;
      border-radius: 10px;
      color: #047857;
      font-size: 24px;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      letter-spacing: 8px;
      transition: all 0.2s ease;
      box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
    }

    .transaction-input-highlight:focus {
      border-color: #10B981;
      outline: none;
      box-shadow: 0 0 0 4px #D1FAE5, inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
    }

    .transaction-input-highlight.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #F3F4F6;
    }

    .error-message-compact {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding: 8px 12px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 8px;
      color: #DC2626;
      font-size: 12px;
      font-weight: 500;
    }

    .error-message-compact svg {
      flex-shrink: 0;
      color: #DC2626;
    }

    /* Checkbox */
    .checkbox-group-compact {
      margin-bottom: 0;
    }

    .checkbox-label-compact {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      padding: 10px;
      background: transparent;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .checkbox-label-compact:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    .checkbox-label-compact input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .checkbox-custom {
      width: 20px;
      height: 20px;
      min-width: 20px;
      min-height: 20px;
      border: 2px solid #D1D5DB;
      border-radius: 6px;
      background: #FFFFFF;
      position: relative;
      transition: all 0.2s ease;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .checkbox-custom:hover {
      border-color: #1E40AF;
    }

    .checkbox-label-compact input[type="checkbox"]:checked + .checkbox-custom {
      background: #10B981;
      border-color: #10B981;
    }

    .checkbox-label-compact input[type="checkbox"]:checked + .checkbox-custom::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 6px;
      width: 5px;
      height: 10px;
      border: solid #FFFFFF;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .checkbox-text-compact {
      flex: 1;
      font-size: 13px;
      color: #065F46;
      line-height: 1.4;
      font-weight: 500;
    }

    .warning-message-compact {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      margin-left: 0;
      padding: 8px 10px;
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      border-radius: 6px;
      color: #92400E;
      font-size: 11px;
    }

    .warning-message-compact svg {
      flex-shrink: 0;
      color: #D97706;
    }

    /* Action Buttons */
    .action-buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding-top: 20px;
      margin-top: 4px;
      border-top: 1px solid #E5E7EB;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-outline {
      background: transparent;
      color: #374151;
      border-color: #D1D5DB;
    }

    .btn-outline:hover:not(:disabled) {
      background: #F9FAFB;
    }

    .cancel-btn {
      color: #EF4444;
      border-color: #FEE2E2;
      background: #FFFFFF;
    }

    .cancel-btn:hover:not(:disabled) {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: #DC2626;
    }

    .btn-success {
      background: #16A34A;
      color: #FFFFFF;
      border-color: #16A34A;
      font-weight: 700;
      box-shadow: 0 2px 4px 0 rgb(22 163 74 / 0.3);
    }

    .btn-success:hover:not(:disabled) {
      background: #15803D;
      border-color: #15803D;
      box-shadow: 0 4px 8px 0 rgb(21 128 61 / 0.4);
      transform: translateY(-1px);
    }

    .btn-lg {
      padding: 16px 32px;
      font-size: 16px;
    }

    .confirm-btn {
      background: #16A34A !important;
      color: #FFFFFF !important;
      border: 2px solid #16A34A !important;
      font-weight: 700;
      box-shadow: 0 4px 12px 0 rgb(22 163 74 / 0.4);
      text-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
    }

    .confirm-btn:hover:not(:disabled) {
      background: #15803D !important;
      border-color: #15803D !important;
      color: #FFFFFF !important;
      box-shadow: 0 6px 16px 0 rgb(21 128 61 / 0.5);
      transform: translateY(-1px);
    }

    .confirm-btn:disabled {
      background: #9CA3AF !important;
      border-color: #9CA3AF !important;
      color: #FFFFFF !important;
      opacity: 0.7;
      transform: none;
      box-shadow: none;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .timer-warning-compact {
        gap: 6px;
        padding: 6px 10px;
      }

      .timer-label-compact {
        font-size: 10px;
      }

      .timer-display-compact {
        font-size: 14px;
      }

      .payment-card {
        padding: 20px;
      }

      .amount-section-compact {
        padding: 8px 12px;
      }

      .amount-row-compact {
        gap: 8px;
      }

      .amount-label-compact {
        font-size: 9px;
      }

      .payment-amount-compact {
        font-size: 14px;
      }

      .btc-amount-compact {
        font-size: 12px;
      }

      .pix-key-container-highlight {
        flex-direction: column;
      }

      .btn-copy-highlight {
        width: 100%;
        padding: 14px 16px;
        font-size: 13px;
        justify-content: center;
      }

      .action-buttons {
        flex-direction: column-reverse;
      }

      .action-buttons button {
        width: 100%;
      }
    }
  `]
})
export class PaymentFormComponent {
  @Input() formattedTime = '00:00';
  @Input() fiatAmount = '';
  @Input() btcAmount = '';
  @Input() pixKey = '';
  @Input() canConfirm = false;

  @Output() copyPix = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() transactionIdChanged = new EventEmitter<string>();
  @Output() noTransactionIdChanged = new EventEmitter<boolean>();

  transactionId = signal('');
  noTransactionId = signal(false);

  onTransactionIdChange(value: string) {
    this.transactionId.set(value.toUpperCase());
    this.transactionIdChanged.emit(value.toUpperCase());
    if (value.length > 0) {
      this.noTransactionId.set(false);
      this.noTransactionIdChanged.emit(false);
    }
  }

  onNoTransactionIdChange(checked: boolean) {
    this.noTransactionId.set(checked);
    this.noTransactionIdChanged.emit(checked);
    if (checked) {
      this.transactionId.set('');
      this.transactionIdChanged.emit('');
    }
  }
}
