import {
  Component,
  OnDestroy,
  signal,
  output,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Html5Qrcode } from 'html5-qrcode';

type CameraErrorType = 'denied' | 'not-found' | 'generic' | null;

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="qr-scanner">
      <div class="scanner-tabs" role="tablist" aria-label="Modo de leitura do QR Code">
        <button
          class="tab"
          role="tab"
          [class.active]="mode() === 'camera'"
          [attr.aria-selected]="mode() === 'camera'"
          (click)="switchMode('camera')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/>
          </svg>
          Câmera
        </button>
        <button
          class="tab"
          role="tab"
          [class.active]="mode() === 'manual'"
          [attr.aria-selected]="mode() === 'manual'"
          (click)="switchMode('manual')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke="currentColor" stroke-width="2"/>
          </svg>
          Colar código
        </button>
      </div>

      @if (mode() === 'camera') {
        <div class="camera-section">
          @if (cameraErrorType()) {
            <div class="camera-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" class="camera-error__icon">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>

              @if (cameraErrorType() === 'denied') {
                <h3 class="camera-error__title">Acesso à câmera negado</h3>
                <p class="camera-error__body">Para escanear QR Codes, permita o acesso à câmera nas configurações do seu navegador.</p>
              } @else if (cameraErrorType() === 'not-found') {
                <h3 class="camera-error__title">Câmera não encontrada</h3>
                <p class="camera-error__body">Nenhuma câmera disponível neste dispositivo.</p>
              } @else {
                <h3 class="camera-error__title">Erro ao acessar câmera</h3>
                <p class="camera-error__body">Não foi possível iniciar a câmera.</p>
              }

              <button class="btn btn-outline btn-sm" (click)="startCamera()">
                Tentar novamente
              </button>

              <div class="camera-error__divider">
                <span>ou</span>
              </div>

              <p class="camera-error__fallback">
                Use a aba
                <button class="link-btn" (click)="switchMode('manual')">"Colar código"</button>
                para colar o código PIX diretamente.
              </p>
            </div>
          } @else {
            <div
              class="camera-container"
              aria-label="Área de escaneamento de QR Code">
              <div id="qr-reader" #qrReader></div>
              @if (isStartingCamera()) {
                <div class="camera-loading">
                  <div class="loading-spinner"></div>
                  <p>Iniciando câmera...</p>
                </div>
              }
            </div>
            <p class="camera-hint">Aponte para o QR Code PIX</p>
          }
        </div>
      } @else {
        <div class="manual-section">
          <label class="form-label">Código PIX (Copia e Cola)</label>
          <textarea
            class="form-input pix-input"
            rows="4"
            placeholder="Cole aqui o código PIX que recebeu por WhatsApp, e-mail ou app do banco..."
            [ngModel]="manualCode()"
            (ngModelChange)="manualCode.set($event)"
          ></textarea>
          <button
            class="btn btn-primary btn-lg full-width"
            [disabled]="!manualCode().trim()"
            (click)="submitManualCode()">
            Usar código colado
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
      background: var(--bg-elevated);
      border-radius: var(--r-md);
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
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &.active {
        background: var(--bg-primary);
        color: var(--text-primary);
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
      border-radius: var(--r-lg);
      overflow: hidden;
      background: #000;
      min-height: 300px;
    }

    #qr-reader {
      width: 100%;
    }

    :host ::ng-deep #qr-reader video {
      border-radius: var(--r-lg);
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
      color: var(--text-muted);
      margin-top: 12px;
      text-align: center;
    }

    // Camera error state
    .camera-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px 24px;
      text-align: center;
      width: 100%;
    }

    .camera-error__icon {
      color: var(--text-muted);
    }

    .camera-error__title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .camera-error__body {
      font-size: 14px;
      color: var(--text-muted);
      margin: 0;
      max-width: 280px;
      line-height: 1.5;
    }

    .camera-error__divider {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      max-width: 200px;
      color: var(--text-muted);
      font-size: 13px;

      &::before,
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border);
      }
    }

    .camera-error__fallback {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.6;
    }

    .link-btn {
      background: none;
      border: none;
      color: var(--primary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;

      &:hover {
        opacity: 0.8;
      }
    }

    // Manual / paste section
    .manual-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .pix-input {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      font-size: 14px;
      color: var(--text-primary);
      background: var(--bg-primary);
      resize: vertical;
      font-family: var(--font-mono);
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-glow);
      }

      &::placeholder {
        color: var(--text-muted);
        font-family: var(--font-body);
        font-size: 13px;
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

  mode = signal<'camera' | 'manual'>('camera');
  manualCode = signal('');
  cameraErrorType = signal<CameraErrorType>(null);
  isStartingCamera = signal(false);

  private html5QrCode: Html5Qrcode | null = null;

  async ngAfterViewInit() {
    // Check if any camera device is available — if not, auto-switch to paste mode
    const hasCamera = await this.detectCamera();
    if (!hasCamera) {
      this.mode.set('manual');
      return;
    }

    if (this.mode() === 'camera') {
      setTimeout(() => this.startCamera(), 100);
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  private async detectCamera(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return false;
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(d => d.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  switchMode(newMode: 'camera' | 'manual') {
    if (this.mode() === newMode) return;

    if (this.mode() === 'camera') {
      this.stopCamera();
    }

    this.mode.set(newMode);

    if (newMode === 'camera') {
      this.cameraErrorType.set(null);
      setTimeout(() => this.startCamera(), 100);
    }
  }

  async startCamera() {
    this.cameraErrorType.set(null);
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
          // QR code not found in frame — ignore
        }
      );

      this.isStartingCamera.set(false);
    } catch (err: any) {
      this.isStartingCamera.set(false);
      console.error('Camera error:', err);

      const errStr = err?.toString() ?? '';
      if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
        this.cameraErrorType.set('denied');
      } else if (errStr.includes('NotFoundError')) {
        this.cameraErrorType.set('not-found');
      } else {
        this.cameraErrorType.set('generic');
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
