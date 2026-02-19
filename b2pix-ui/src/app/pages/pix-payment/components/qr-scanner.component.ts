import {
  Component,
  OnDestroy,
  signal,
  output,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="qr-scanner">
      <div class="scanner-tabs">
        <button
          class="tab"
          [class.active]="mode() === 'camera'"
          (click)="switchMode('camera')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/>
          </svg>
          Camera
        </button>
        <button
          class="tab"
          [class.active]="mode() === 'manual'"
          (click)="switchMode('manual')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke="currentColor" stroke-width="2"/>
          </svg>
          Colar Codigo
        </button>
      </div>

      @if (mode() === 'camera') {
        <div class="camera-section">
          @if (cameraError()) {
            <div class="camera-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
              </svg>
              <p>{{ cameraError() }}</p>
              <button class="btn btn-outline btn-sm" (click)="startCamera()">
                Tentar novamente
              </button>
            </div>
          } @else {
            <div class="camera-container">
              <div id="qr-reader" #qrReader></div>
              @if (isStartingCamera()) {
                <div class="camera-loading">
                  <div class="loading-spinner"></div>
                  <p>Iniciando camera...</p>
                </div>
              }
            </div>
            <p class="camera-hint">Aponte a camera para o QR Code do PIX</p>
          }
        </div>
      } @else {
        <div class="manual-section">
          <label class="form-label">Codigo PIX (Copia e Cola)</label>
          <textarea
            class="form-input pix-input"
            rows="4"
            placeholder="Cole aqui o codigo PIX do pagamento..."
            [ngModel]="manualCode()"
            (ngModelChange)="manualCode.set($event)"
          ></textarea>
          <button
            class="btn btn-primary btn-lg full-width"
            [disabled]="!manualCode().trim()"
            (click)="submitManualCode()">
            Continuar
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .qr-scanner {
      width: 100%;
    }

    .scanner-tabs {
      display: flex;
      gap: 4px;
      background: #F3F4F6;
      border-radius: 12px;
      padding: 4px;
      margin-bottom: 20px;
    }

    .tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: #6B7280;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &.active {
        background: #FFFFFF;
        color: #1F2937;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
    }

    .camera-section {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .camera-container {
      position: relative;
      width: 100%;
      max-width: 400px;
      border-radius: 16px;
      overflow: hidden;
      background: #000;
      min-height: 300px;
    }

    #qr-reader {
      width: 100%;
    }

    :host ::ng-deep #qr-reader video {
      border-radius: 16px;
    }

    :host ::ng-deep #qr-reader__scan_region {
      min-height: 300px;
    }

    :host ::ng-deep #qr-reader__dashboard {
      display: none !important;
    }

    .camera-loading {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(0, 0, 0, 0.7);
      color: white;

      p {
        font-size: 14px;
        margin: 0;
      }
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top: 3px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .camera-hint {
      font-size: 13px;
      color: #6B7280;
      margin-top: 12px;
      text-align: center;
    }

    .camera-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 24px;
      text-align: center;
      color: #DC2626;

      p {
        color: #6B7280;
        font-size: 14px;
        margin: 0;
      }
    }

    .manual-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }

    .pix-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      color: #1F2937;
      resize: vertical;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: #F59E0B;
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
      }
    }

    .full-width {
      width: 100%;
    }
  `]
})
export class QrScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('qrReader') qrReaderEl!: ElementRef;

  qrCodeScanned = output<string>();

  mode = signal<'camera' | 'manual'>('manual');
  manualCode = signal('');
  cameraError = signal<string | null>(null);
  isStartingCamera = signal(false);

  private html5QrCode: Html5Qrcode | null = null;

  ngAfterViewInit() {
    if (this.mode() === 'camera') {
      setTimeout(() => this.startCamera(), 100);
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  switchMode(newMode: 'camera' | 'manual') {
    if (this.mode() === newMode) return;

    if (this.mode() === 'camera') {
      this.stopCamera();
    }

    this.mode.set(newMode);

    if (newMode === 'camera') {
      setTimeout(() => this.startCamera(), 100);
    }
  }

  async startCamera() {
    this.cameraError.set(null);
    this.isStartingCamera.set(true);

    try {
      this.html5QrCode = new Html5Qrcode('qr-reader');

      await this.html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1
        },
        (decodedText) => {
          this.onQrCodeDetected(decodedText);
        },
        () => {
          // QR code not found in frame - ignore
        }
      );

      this.isStartingCamera.set(false);
    } catch (err: any) {
      this.isStartingCamera.set(false);
      console.error('Camera error:', err);

      if (err?.toString().includes('NotAllowedError') || err?.toString().includes('Permission')) {
        this.cameraError.set('Permissao de camera negada. Habilite nas configuracoes do navegador.');
      } else if (err?.toString().includes('NotFoundError')) {
        this.cameraError.set('Camera nao encontrada. Use a opcao "Colar Codigo".');
      } else {
        this.cameraError.set('Erro ao acessar a camera. Use a opcao "Colar Codigo".');
      }
    }
  }

  private async stopCamera() {
    if (this.html5QrCode) {
      try {
        const state = this.html5QrCode.getState();
        if (state === 2) { // Html5QrcodeScannerState.SCANNING
          await this.html5QrCode.stop();
        }
      } catch {
        // Ignore errors during cleanup
      }
      this.html5QrCode = null;
    }
  }

  private onQrCodeDetected(decodedText: string) {
    this.stopCamera();
    this.qrCodeScanned.emit(decodedText);
  }

  submitManualCode() {
    const code = this.manualCode().trim();
    if (code) {
      this.qrCodeScanned.emit(code);
    }
  }
}
