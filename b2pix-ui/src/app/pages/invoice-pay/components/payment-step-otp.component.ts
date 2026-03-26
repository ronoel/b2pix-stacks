import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CodeInputComponent } from '../../../components/code-input/code-input.component';

@Component({
  selector: 'app-payment-step-otp',
  standalone: true,
  imports: [CodeInputComponent],
  template: `
    <div class="step-otp fade-up">
      <div class="otp-header">
        <p class="otp-sent-to">Código enviado para</p>
        <p class="otp-email font-mono">{{ maskedEmail }}</p>
        <button class="btn-text" (click)="changeEmail.emit()">Alterar email</button>
      </div>

      <label class="otp-label">Digite o código de 6 dígitos</label>

      <app-code-input
        (codeComplete)="onCodeComplete($event)"
        (codeChange)="onCodeChange($event)"
      />

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

      @if (isLoading) {
        <div class="otp-loading">
          <div class="loading-spinner-sm"></div>
          <span>Verificando...</span>
        </div>
      }

      <div class="otp-resend">
        @if (resendCooldown > 0) {
          <span class="otp-resend__timer">Reenviar código em {{ formatCooldown(resendCooldown) }}</span>
        } @else {
          <button class="btn-text" (click)="resend.emit()">Reenviar código</button>
        }
      </div>

      <div class="otp-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16V12"/>
          <path d="M12 8H12.01"/>
        </svg>
        <span>Não recebeu? Verifique sua caixa de spam.</span>
      </div>
    </div>
  `,
  styles: [`
    .step-otp { display: flex; flex-direction: column; gap: 16px; text-align: center; }
    .otp-header { margin-bottom: 8px; }
    .otp-sent-to { font-size: 14px; color: var(--text-muted); margin: 0 0 4px; }
    .otp-email { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px; }
    .otp-label { font-size: 14px; font-weight: 600; color: var(--text-secondary); }
    .otp-loading {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-size: 14px; color: var(--text-muted);
    }
    .otp-resend { font-size: 13px; }
    .otp-resend__timer { color: var(--text-muted); }
    .otp-hint {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      font-size: 12px; color: var(--text-dim);
    }
    .btn-text {
      background: none; border: none; cursor: pointer;
      color: var(--primary); font-size: 13px; font-weight: 600;
      font-family: var(--font-body); padding: 0;
    }
    .btn-text:hover { text-decoration: underline; }
  `]
})
export class PaymentStepOtpComponent {
  @Input() maskedEmail = '';
  @Input() isLoading = false;
  @Input() error = '';
  @Input() resendCooldown = 0;
  @Output() codeComplete = new EventEmitter<string>();
  @Output() changeEmail = new EventEmitter<void>();
  @Output() resend = new EventEmitter<void>();
  @ViewChild(CodeInputComponent) codeInput?: CodeInputComponent;

  onCodeComplete(code: string): void {
    this.codeComplete.emit(code);
  }

  onCodeChange(_code: string): void {
    // Could clear error
  }

  formatCooldown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
