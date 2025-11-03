import { Component, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export type WalletSelectionType = 'create' | 'import' | 'external';

@Component({
  selector: 'app-wallet-selection-modal',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="wallet-selection-overlay" (click)="onCancel()">
      <div class="wallet-selection-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Conectar ou Criar Carteira</h2>
          <button class="close-btn" (click)="onCancel()" aria-label="Fechar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Embedded Wallet Section -->
          <div class="wallet-section embedded-section">
            <div class="section-header">
              <div class="section-icon embedded-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M7 10h10M7 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="section-info">
                <h3 class="section-title">Carteira B2PIX Integrada</h3>
                <p class="section-description">Carteira com autocustódia integrada</p>
              </div>
            </div>

            <div class="features-list">
              <div class="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="feature-icon">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>Fácil de usar, sem extensões necessárias</span>
              </div>
              <div class="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="feature-icon">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>Acesso rápido com senha</span>
              </div>
              <div class="feature-item warning">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="feature-icon">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>Você é responsável por guardar sua seed phrase</span>
              </div>
            </div>

            <div class="action-buttons">
              <button class="btn btn-primary" (click)="onSelect('create')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14m7-7H5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>Criar Nova Carteira</span>
              </button>
              <button class="btn btn-secondary" (click)="onSelect('import')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>Importar Carteira Existente</span>
              </button>
            </div>
          </div>

          <div class="divider">
            <span class="divider-text">ou</span>
          </div>

          <!-- External Wallet Section -->
          <div class="wallet-section external-section">
            <div class="section-header">
              <div class="section-icon external-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="section-info">
                <h3 class="section-title">Carteira Externa</h3>
                <p class="section-description">Conecte sua Leather, Xverse ou outra carteira Stacks</p>
              </div>
            </div>

            <div class="features-list">
              <div class="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="feature-icon">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>Controle total sobre suas chaves privadas</span>
              </div>
              <div class="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="feature-icon">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>Use sua carteira existente</span>
              </div>
              <div class="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="feature-icon">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>Requer extensão do navegador</span>
              </div>
            </div>

            <div class="action-buttons">
              <button class="btn btn-outline" (click)="onSelect('external')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
                  <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Conectar Carteira Externa</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wallet-selection-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 16px;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .wallet-selection-modal {
      background: var(--background-card, #FFFFFF);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      border-bottom: 1px solid var(--border-color, #E5E7EB);
    }

    .modal-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary, #1F2937);
      margin: 0;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary, #6B7280);
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: var(--background-elevated, #F3F4F6);
      color: var(--text-primary, #1F2937);
    }

    .modal-body {
      padding: 24px;
    }

    .wallet-section {
      background: var(--background-elevated, #F9FAFB);
      border: 2px solid var(--border-color, #E5E7EB);
      border-radius: 12px;
      padding: 24px;
      transition: all 0.3s ease;
    }

    .wallet-section:hover {
      border-color: var(--primary-trust-blue-light, #93C5FD);
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.1);
    }

    .embedded-section {
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }

    .section-icon {
      flex-shrink: 0;
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .embedded-icon {
      background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
      color: var(--primary-trust-blue, #1E40AF);
    }

    .external-icon {
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
      color: #F59E0B;
    }

    .section-info {
      flex: 1;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary, #1F2937);
      margin: 0 0 4px 0;
    }

    .section-description {
      font-size: 14px;
      color: var(--text-secondary, #6B7280);
      margin: 0;
      line-height: 1.5;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 14px;
      color: var(--text-secondary, #4B5563);
      line-height: 1.5;
    }

    .feature-item.warning {
      color: #D97706;
    }

    .feature-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .feature-item svg {
      stroke: currentColor;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px 20px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      width: 100%;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
      color: white;
      border-color: #1E40AF;
      box-shadow: 0 2px 8px rgba(30, 64, 175, 0.3);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.4);
    }

    .btn-secondary {
      background: transparent;
      color: var(--primary-trust-blue, #1E40AF);
      border-color: var(--primary-trust-blue, #1E40AF);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--background-accent, #EFF6FF);
      transform: translateY(-2px);
    }

    .btn-outline {
      background: transparent;
      color: #F59E0B;
      border-color: #F59E0B;
    }

    .btn-outline:hover:not(:disabled) {
      background: #FEF3C7;
      transform: translateY(-2px);
    }

    .divider {
      position: relative;
      text-align: center;
      margin: 24px 0;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--border-color, #E5E7EB);
    }

    .divider-text {
      position: relative;
      display: inline-block;
      background: var(--background-card, #FFFFFF);
      padding: 0 16px;
      color: var(--text-muted, #9CA3AF);
      font-size: 14px;
      font-weight: 500;
    }

    /* Responsive Design */
    @media (max-width: 640px) {
      .wallet-selection-modal {
        max-height: 95vh;
      }

      .modal-header {
        padding: 20px;
      }

      .modal-title {
        font-size: 20px;
      }

      .modal-body {
        padding: 20px;
      }

      .wallet-section {
        padding: 20px;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .section-icon {
        width: 48px;
        height: 48px;
      }

      .section-icon svg {
        width: 28px;
        height: 28px;
      }

      .section-title {
        font-size: 16px;
      }

      .section-description {
        font-size: 13px;
      }

      .feature-item {
        font-size: 13px;
      }

      .btn {
        padding: 12px 16px;
        font-size: 14px;
      }
    }

    /* Scrollbar styling */
    .wallet-selection-modal::-webkit-scrollbar {
      width: 8px;
    }

    .wallet-selection-modal::-webkit-scrollbar-track {
      background: transparent;
    }

    .wallet-selection-modal::-webkit-scrollbar-thumb {
      background: var(--border-color, #E5E7EB);
      border-radius: 4px;
    }

    .wallet-selection-modal::-webkit-scrollbar-thumb:hover {
      background: var(--text-muted, #9CA3AF);
    }
  `]
})
export class WalletSelectionModalComponent {
  @Output() walletSelected = new EventEmitter<WalletSelectionType>();
  @Output() cancelled = new EventEmitter<void>();

  onSelect(type: WalletSelectionType) {
    this.walletSelected.emit(type);
  }

  onCancel() {
    this.cancelled.emit();
  }
}
