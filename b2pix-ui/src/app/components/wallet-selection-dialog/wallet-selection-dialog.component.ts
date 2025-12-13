import { Component, output, signal } from '@angular/core';


export type WalletChoice = 'external' | 'embedded' | null;

@Component({
  selector: 'app-wallet-selection-dialog',
  standalone: true,
  imports: [],
  template: `
    <div class="dialog-overlay" (click)="onClose()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <button class="close-button" (click)="onClose()" aria-label="Close dialog">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <h2 class="dialog-title">Conectar Carteira</h2>
        <p class="dialog-subtitle">Escolha como você deseja acessar o B2PIX</p>

        <div class="wallet-options">
          <!-- External Wallet Option -->
          <button class="wallet-option" (click)="selectWallet('external')">
            <div class="option-icon external">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="17" cy="14" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <div class="option-content">
              <h3 class="option-title">Carteira Externa</h3>
              <p class="option-description">
                Conecte usando Leather, Xverse ou outra wallet extension do navegador
              </p>
              <div class="option-badge recommended">Recomendado para usuários experientes</div>
            </div>
            <div class="option-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
          </button>

          <!-- Embedded Wallet Option -->
          <button class="wallet-option" (click)="selectWallet('embedded')">
            <div class="option-icon embedded">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="option-content">
              <h3 class="option-title">Carteira Fácil</h3>
              <p class="option-description">
                Crie uma carteira integrada protegida por senha - ideal para iniciantes
              </p>
              <div class="option-badge easy">Mais fácil de usar</div>
            </div>
            <div class="option-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
          </button>
        </div>

        <div class="dialog-footer">
          <p class="footer-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Você sempre terá controle total dos seus fundos
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
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
      z-index: 1000;
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

    .dialog-content {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 32px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
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

    .close-button {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      color: #6B7280;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: #F3F4F6;
      color: #1F2937;
    }

    .dialog-title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .dialog-subtitle {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 24px 0;
    }

    .wallet-options {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .wallet-option {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      width: 100%;
    }

    .wallet-option:hover {
      border-color: #3B82F6;
      background: #F9FAFB;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }

    .option-icon {
      flex-shrink: 0;
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
    }

    .option-icon.external {
      background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
    }

    .option-icon.embedded {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    }

    .option-content {
      flex: 1;
    }

    .option-title {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 4px 0;
    }

    .option-description {
      font-size: 13px;
      color: #6B7280;
      margin: 0 0 8px 0;
      line-height: 1.5;
    }

    .option-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .option-badge.recommended {
      background: #DBEAFE;
      color: #1E40AF;
    }

    .option-badge.easy {
      background: #D1FAE5;
      color: #065F46;
    }

    .option-arrow {
      flex-shrink: 0;
      color: #9CA3AF;
    }

    .dialog-footer {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #E5E7EB;
    }

    .footer-text {
      font-size: 13px;
      color: #6B7280;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    @media (max-width: 640px) {
      .dialog-content {
        padding: 24px;
      }

      .dialog-title {
        font-size: 20px;
      }

      .wallet-option {
        padding: 16px;
      }

      .option-icon {
        width: 48px;
        height: 48px;
      }

      .option-icon svg {
        width: 24px;
        height: 24px;
      }

      .option-title {
        font-size: 16px;
      }

      .option-description {
        font-size: 12px;
      }
    }
  `]
})
export class WalletSelectionDialogComponent {
  readonly walletSelected = output<WalletChoice>();
  readonly dialogClosed = output<void>();

  selectWallet(choice: WalletChoice) {
    this.walletSelected.emit(choice);
  }

  onClose() {
    this.dialogClosed.emit();
  }
}
