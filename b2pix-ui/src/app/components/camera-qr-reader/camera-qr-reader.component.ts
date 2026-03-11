import {
  Component,
  OnDestroy,
  signal,
  output,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';

import { Html5Qrcode } from 'html5-qrcode';

type CameraErrorType = 'denied' | 'not-found' | 'generic' | null;

@Component({
  selector: 'app-camera-qr-reader',
  standalone: true,
  imports: [],
  template: `
    <div class="camera-qr-reader">
      @if (cameraErrorType()) {
        <div class="camera-error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" class="camera-error__icon">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>

          @if (cameraErrorType() === 'denied') {
            <h3 class="camera-error__title">Acesso à câmera negado</h3>
            <p class="camera-error__body">Permita o acesso à câmera nas configurações do navegador.</p>
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
        </div>
      } @else {
        <div class="camera-viewport">
          <div id="camera-qr-reader" #cameraQrReader></div>
          @if (isStartingCamera()) {
            <div class="camera-loading">
              <div class="loading-spinner"></div>
              <p>Iniciando câmera...</p>
            </div>
          }
        </div>
        <p class="camera-hint">Aponte a câmera para o QR Code</p>
      }
    </div>
  `,
  styles: [`
    .camera-qr-reader {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .camera-viewport {
      position: relative;
      width: 100%;
      max-width: 400px;
      border-radius: var(--r-lg);
      overflow: hidden;
      background: #000;
      min-height: 300px;
    }

    #camera-qr-reader {
      width: 100%;
    }

    :host ::ng-deep #camera-qr-reader video {
      border-radius: var(--r-lg);
    }

    :host ::ng-deep #camera-qr-reader__scan_region {
      min-height: 300px;
    }

    :host ::ng-deep #camera-qr-reader__dashboard {
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
  `]
})
export class CameraQrReaderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cameraQrReader') cameraQrReaderEl!: ElementRef;

  qrCodeScanned = output<string>();

  cameraErrorType = signal<CameraErrorType>(null);
  isStartingCamera = signal(false);

  private html5QrCode: Html5Qrcode | null = null;

  async ngAfterViewInit() {
    const hasCamera = await this.detectCamera();
    if (!hasCamera) {
      this.cameraErrorType.set('not-found');
      return;
    }
    setTimeout(() => this.startCamera(), 100);
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

  async startCamera() {
    this.cameraErrorType.set(null);
    this.isStartingCamera.set(true);

    try {
      this.html5QrCode = new Html5Qrcode('camera-qr-reader');

      await this.html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1
        },
        (decodedText) => {
          this.stopCamera();
          this.qrCodeScanned.emit(decodedText);
        },
        () => {}
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
        if (state === 2) {
          await this.html5QrCode.stop();
        }
      } catch {
        // Ignore errors during cleanup
      }
      this.html5QrCode = null;
    }
  }
}
