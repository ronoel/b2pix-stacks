import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-qr-code-modal',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (show) {
      <div class="qr-modal-overlay" (click)="onClose()">
        <div class="qr-modal-content" (click)="$event.stopPropagation()">
          <div class="qr-modal-header">
            <h3 class="qr-modal-title">QR Code - Chave PIX</h3>
            <button class="qr-modal-close" (click)="onClose()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="qr-modal-body">
            @if (qrCodeDataUrl) {
              <img [src]="qrCodeDataUrl" alt="QR Code PIX" class="qr-code-image">
            }
            <p class="qr-instruction">Escaneie este QR Code com o app do seu banco para fazer o pagamento</p>
            <div class="qr-pix-key">
              <span class="qr-pix-label">Chave PIX:</span>
              <span class="qr-pix-value">{{ pixKey }}</span>
            </div>
          </div>
          <div class="qr-modal-footer">
            <button class="btn btn-primary" (click)="onClose()">Fechar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* QR Code Modal */
    .qr-modal-overlay {
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
      backdrop-filter: blur(4px);
    }

    .qr-modal-content {
      background: #FFFFFF;
      border-radius: 16px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      animation: modalSlideIn 0.2s ease-out;
    }

    @keyframes modalSlideIn {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .qr-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #E5E7EB;
    }

    .qr-modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #1F2937;
      margin: 0;
    }

    .qr-modal-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: #6B7280;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .qr-modal-close:hover {
      background: #F3F4F6;
      color: #1F2937;
    }

    .qr-modal-body {
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .qr-code-image {
      width: 300px;
      height: 300px;
      border: 4px solid #3B82F6;
      border-radius: 12px;
      box-shadow: 0 4px 12px 0 rgb(59 130 246 / 0.2);
    }

    .qr-instruction {
      text-align: center;
      color: #6B7280;
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
      max-width: 300px;
    }

    .qr-pix-key {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 16px;
      background: #F9FAFB;
      border-radius: 8px;
      width: 100%;
      border: 1px solid #E5E7EB;
    }

    .qr-pix-label {
      font-size: 11px;
      color: #6B7280;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .qr-pix-value {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      color: #1F2937;
      font-weight: 600;
      word-break: break-all;
    }

    .qr-modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: flex-end;
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
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn-primary {
      background: #1E40AF;
      color: white;
      border-color: #1E40AF;
    }

    .btn-primary:hover {
      background: #1D4ED8;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .qr-modal-overlay {
        padding: 12px;
      }

      .qr-modal-content {
        max-width: 100%;
      }

      .qr-code-image {
        width: 250px;
        height: 250px;
      }

      .qr-modal-body {
        padding: 24px 16px;
      }
    }
  `]
})
export class QrCodeModalComponent {
  @Input() show = false;
  @Input() qrCodeDataUrl: string | null = null;
  @Input() pixKey = '';
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
