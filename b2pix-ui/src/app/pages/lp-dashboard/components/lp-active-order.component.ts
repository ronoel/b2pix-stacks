import { Component, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PixPayoutRequest, getSourceTypeLabel } from '../../../shared/models/pix-payout-request.model';

@Component({
  selector: 'app-lp-active-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="active-order">
      <!-- Timer -->
      <div class="timer-bar" [class.warning]="remainingMinutes() < 5" [class.critical]="remainingMinutes() < 2">
        <div class="timer-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="timer-text">
          <span class="timer-label">Tempo restante</span>
          <span class="timer-value">{{ formatCountdown() }}</span>
        </div>
        <div class="timer-progress">
          <div class="timer-progress-bar" [style.width.%]="progressPercent()"></div>
        </div>
      </div>

      <!-- Values -->
      <div class="values-section">
        <div class="value-card highlight">
          <span class="label">Valor PIX</span>
          <span class="value brl">R$ {{ formatBrlCents(order().pix_value) }}</span>
        </div>
        <div class="value-card">
          <span class="label">Tipo</span>
          <span class="value">{{ getSourceLabel(order().source_type) }}</span>
        </div>
      </div>

      <!-- PIX Payment Info (conditional on source_type) -->
      @if (order().qr_code_payload) {
        <!-- PIX Copia e Cola (for pix_order) -->
        <div class="pix-payload-section">
          <h3>PIX Copia e Cola</h3>
          <p class="instruction">Copie o codigo abaixo e cole no aplicativo do seu banco para pagar o PIX.</p>
          <div class="payload-display">
            <code>{{ order().qr_code_payload }}</code>
            <button class="btn-copy" (click)="copyPayload()" [disabled]="payloadCopied()">
              @if (payloadCopied()) {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Copiado!
              } @else {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" stroke-width="2"/>
                </svg>
                Copiar
              }
            </button>
          </div>
        </div>
      } @else if (order().pix_key) {
        <!-- PIX Key (for sell_order) -->
        <div class="pix-payload-section">
          <h3>Chave PIX do Vendedor</h3>
          <p class="instruction">Realize o pagamento PIX para a chave abaixo.</p>
          <div class="payload-display">
            <code>{{ order().pix_key }}</code>
            <button class="btn-copy" (click)="copyPixKey()" [disabled]="payloadCopied()">
              @if (payloadCopied()) {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Copiado!
              } @else {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" stroke-width="2"/>
                </svg>
                Copiar
              }
            </button>
          </div>
        </div>
      }

      <!-- PIX ID Input -->
      <div class="pix-id-section">
        <h3>Confirmar Pagamento</h3>
        <p class="instruction">Apos pagar o PIX, informe o ID da transacao (End-to-End ID) para confirmar.</p>
        <div class="form-group">
          <label class="form-label">ID da Transacao PIX (E2E)</label>
          <input
            type="text"
            class="form-input"
            placeholder="E12345678202506151230abcdef123456"
            [(ngModel)]="pixIdValue"
            [disabled]="isProcessing()"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button
          class="btn btn-success btn-lg"
          (click)="onConfirmPayment()"
          [disabled]="!pixIdValue.trim() || isProcessing()">
          @if (isProcessing() && processingAction() === 'pay') {
            <div class="loading-spinner-sm"></div>
            Confirmando...
          } @else {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            </svg>
            Confirmar Pagamento
          }
        </button>

        <div class="secondary-actions">
          <button
            class="btn btn-outline"
            (click)="onCancel()"
            [disabled]="isProcessing()">
            @if (isProcessing() && processingAction() === 'cancel') {
              <div class="loading-spinner-sm"></div>
              Cancelando...
            } @else {
              Cancelar
            }
          </button>

          <button
            class="btn btn-ghost"
            (click)="showReportModal.set(true)"
            [disabled]="isProcessing()">
            Reportar Problema
          </button>
        </div>
      </div>

      <!-- Report Modal -->
      @if (showReportModal()) {
        <div class="modal-overlay" (click)="showReportModal.set(false)">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Reportar Problema</h3>
              <button class="modal-close" (click)="showReportModal.set(false)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <p>Descreva o problema encontrado ao tentar pagar este PIX.</p>
              <textarea
                class="form-input"
                rows="4"
                placeholder="Ex: PIX rejeitado pelo banco, dados invalidos..."
                [(ngModel)]="reportReason"
              ></textarea>
            </div>
            <div class="modal-actions">
              <button class="btn btn-outline" (click)="showReportModal.set(false)">Cancelar</button>
              <button
                class="btn btn-primary"
                [disabled]="!reportReason.trim() || isProcessing()"
                (click)="onReport()">
                @if (isProcessing() && processingAction() === 'report') {
                  <div class="loading-spinner-sm"></div>
                  Enviando...
                } @else {
                  Enviar Report
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .active-order {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Timer */
    .timer-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: #EFF6FF;
      border: 2px solid #3B82F6;
      border-radius: 12px;
      color: #1E40AF;
      flex-wrap: wrap;

      &.warning {
        background: #FEF3C7;
        border-color: #F59E0B;
        color: #92400E;
        .timer-progress-bar { background: #F59E0B; }
      }

      &.critical {
        background: #FEE2E2;
        border-color: #DC2626;
        color: #991B1B;
        .timer-progress-bar { background: #DC2626; }
      }
    }

    .timer-icon {
      flex-shrink: 0;
    }

    .timer-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .timer-label {
      font-size: 12px;
      font-weight: 500;
      opacity: 0.8;
    }

    .timer-value {
      font-size: 20px;
      font-weight: 700;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .timer-progress {
      width: 100%;
      height: 4px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 2px;
    }

    .timer-progress-bar {
      height: 100%;
      background: #3B82F6;
      border-radius: 2px;
      transition: width 1s linear;
    }

    /* Values */
    .values-section {
      display: flex;
      gap: 12px;
    }

    .value-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 16px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      flex: 1;

      &.highlight {
        background: #F0FDF4;
        border-color: #BBF7D0;
      }
    }

    .label {
      font-size: 12px;
      color: #6B7280;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      font-size: 18px;
      font-weight: 700;
      color: #1F2937;

      &.brl { color: #16A34A; font-size: 22px; }
    }

    /* PIX Payload */
    .pix-payload-section, .pix-id-section {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 20px;

      h3 {
        font-size: 16px;
        font-weight: 600;
        color: #1F2937;
        margin: 0 0 8px;
      }
    }

    .instruction {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 16px;
      line-height: 1.5;
    }

    .payload-display {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
    }

    .payload-display code {
      flex: 1;
      font-size: 12px;
      color: #1F2937;
      word-break: break-all;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      line-height: 1.6;
      max-height: 120px;
      overflow-y: auto;
    }

    .btn-copy {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #1E40AF;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .btn-copy:hover:not(:disabled) { background: #1D4ED8; }
    .btn-copy:disabled { background: #16A34A; cursor: default; }

    /* Form */
    .form-group { margin-bottom: 0; }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .form-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      color: #1F2937;
      transition: all 0.2s ease;
      box-sizing: border-box;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .form-input:focus {
      outline: none;
      border-color: #3B82F6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    textarea.form-input {
      font-family: inherit;
      resize: vertical;
    }

    /* Actions */
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-lg { padding: 14px 24px; font-size: 16px; }

    .btn-success {
      background: linear-gradient(135deg, #16A34A 0%, #15803D 100%);
      color: white;
    }
    .btn-success:hover:not(:disabled) {
      background: linear-gradient(135deg, #15803D 0%, #166534 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
    }

    .btn-primary {
      background: #1E40AF;
      color: white;
    }
    .btn-primary:hover:not(:disabled) { background: #1D4ED8; }

    .btn-outline {
      background: transparent;
      color: #6B7280;
      border: 1px solid #D1D5DB;
    }
    .btn-outline:hover:not(:disabled) { border-color: #9CA3AF; color: #374151; background: #F9FAFB; }

    .btn-ghost {
      background: transparent;
      color: #DC2626;
      border: none;
    }
    .btn-ghost:hover:not(:disabled) { background: #FEF2F2; }

    .secondary-actions {
      display: flex;
      gap: 12px;
    }

    .secondary-actions .btn { flex: 1; }

    .loading-spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .btn-outline .loading-spinner-sm, .btn-ghost .loading-spinner-sm {
      border-color: rgba(0, 0, 0, 0.1);
      border-top-color: currentColor;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #E5E7EB;

      h3 { font-size: 18px; font-weight: 600; color: #1F2937; margin: 0; }
    }

    .modal-close {
      background: none;
      border: none;
      color: #6B7280;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
    }
    .modal-close:hover { background: #F3F4F6; color: #1F2937; }

    .modal-body {
      padding: 24px;

      p { font-size: 14px; color: #6B7280; margin: 0 0 16px; line-height: 1.5; }
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid #E5E7EB;
    }

    @media (max-width: 480px) {
      .secondary-actions { flex-direction: column; }
      .payload-display { flex-direction: column; }
      .btn-copy { width: 100%; justify-content: center; }
    }
  `]
})
export class LpActiveOrderComponent implements OnInit, OnDestroy {
  order = input.required<PixPayoutRequest>();
  isProcessing = input<boolean>(false);
  processingAction = input<string>('');

  paid = output<string>();       // emits pixEndToEndId
  cancelled = output<void>();
  reported = output<string>();   // emits reason

  pixIdValue = '';
  reportReason = '';
  showReportModal = signal(false);
  payloadCopied = signal(false);

  remainingSeconds = signal(0);
  private timerInterval?: ReturnType<typeof setInterval>;
  private readonly LP_TIMEOUT_MINUTES = 15;

  ngOnInit() {
    this.updateTimer();
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private updateTimer() {
    const acceptedAt = this.order().lp_accepted_at;
    if (!acceptedAt) {
      this.remainingSeconds.set(0);
      return;
    }

    const deadline = new Date(acceptedAt).getTime() + (this.LP_TIMEOUT_MINUTES * 60 * 1000);
    const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
    this.remainingSeconds.set(remaining);
  }

  remainingMinutes(): number {
    return Math.floor(this.remainingSeconds() / 60);
  }

  progressPercent(): number {
    const totalSeconds = this.LP_TIMEOUT_MINUTES * 60;
    return Math.max(0, (this.remainingSeconds() / totalSeconds) * 100);
  }

  formatCountdown(): string {
    const total = this.remainingSeconds();
    if (total <= 0) return '00:00';
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  formatBrlCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  }

  getSourceLabel(sourceType: string): string {
    return getSourceTypeLabel(sourceType as any);
  }

  copyPayload() {
    const payload = this.order().qr_code_payload;
    if (payload) {
      navigator.clipboard.writeText(payload).then(() => {
        this.payloadCopied.set(true);
        setTimeout(() => this.payloadCopied.set(false), 2000);
      });
    }
  }

  copyPixKey() {
    const pixKey = this.order().pix_key;
    if (pixKey) {
      navigator.clipboard.writeText(pixKey).then(() => {
        this.payloadCopied.set(true);
        setTimeout(() => this.payloadCopied.set(false), 2000);
      });
    }
  }

  onConfirmPayment() {
    const pixId = this.pixIdValue.trim();
    if (pixId) {
      this.paid.emit(pixId);
    }
  }

  onCancel() {
    this.cancelled.emit();
  }

  onReport() {
    const reason = this.reportReason.trim();
    if (reason) {
      this.showReportModal.set(false);
      this.reported.emit(reason);
    }
  }
}
