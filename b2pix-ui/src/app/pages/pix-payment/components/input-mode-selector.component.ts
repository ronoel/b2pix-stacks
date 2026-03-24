import { Component, output } from '@angular/core';

export type PixInputMode = 'qr' | 'pix-key';

@Component({
  selector: 'app-input-mode-selector',
  standalone: true,
  template: `
    <div class="mode-selector">
      <button class="mode-card" (click)="modeSelected.emit('qr')">
        <div class="mode-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="2"/>
            <rect x="16" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="2"/>
            <rect x="2" y="16" width="6" height="6" rx="1" stroke="currentColor" stroke-width="2"/>
            <rect x="16" y="16" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="2"/>
            <path d="M10 4h2M10 6h2M4 10v2M6 10v2M10 10h2v4h-2M16 10v4M20 10v2M10 18h2M10 20h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="mode-content">
          <span class="mode-title">QR Code PIX</span>
          <span class="mode-subtitle">Escaneie ou cole um código QR</span>
        </div>
        <svg class="mode-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <button class="mode-card" (click)="modeSelected.emit('pix-key')">
        <div class="mode-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="mode-content">
          <span class="mode-title">Chave PIX</span>
          <span class="mode-subtitle">CPF, CNPJ, telefone, e-mail ou chave aleatória</span>
        </div>
        <svg class="mode-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    .mode-selector {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .mode-card {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 18px 16px;
      background: var(--bg-primary);
      border: 1.5px solid var(--border);
      border-radius: var(--r-lg);
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;

      &:hover {
        border-color: var(--primary);
        background: var(--primary-bg);
      }

      &:active {
        transform: scale(0.98);
      }
    }

    .mode-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: var(--primary-bg);
      color: var(--primary);
      border-radius: var(--r-md);
    }

    .mode-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .mode-title {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .mode-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .mode-arrow {
      flex-shrink: 0;
      color: var(--text-muted);
    }
  `]
})
export class InputModeSelectorComponent {
  modeSelected = output<PixInputMode>();
}
