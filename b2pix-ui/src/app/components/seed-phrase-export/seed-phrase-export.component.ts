import { Component, inject, signal, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';

@Component({
  selector: 'app-seed-phrase-export',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="export-overlay" (click)="onClose()">
      <div class="export-dialog" (click)="$event.stopPropagation()">
        <button class="close-button" (click)="onClose()" aria-label="Close dialog">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        @if (!showMnemonic()) {
          <!-- Warning Screen -->
          <div class="warning-content">
            <div class="danger-icon">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
            </div>

            <h2 class="export-title">ATENÇÃO: Frase de Recuperação</h2>
            <p class="export-subtitle">
              Sua frase de recuperação é a chave mestra da sua carteira. Quem tiver acesso a ela terá controle total dos seus fundos.
            </p>

            <div class="warning-list">
              <div class="warning-item danger">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <div>
                  <strong>NUNCA compartilhe sua frase de recuperação</strong>
                  <p>Nenhum membro da equipe do B2PIX irá pedir por ela</p>
                </div>
              </div>

              <div class="warning-item danger">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M9 18v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                </svg>
                <div>
                  <strong>NÃO tire screenshots</strong>
                  <p>Malware pode acessar suas capturas de tela</p>
                </div>
              </div>

              <div class="warning-item danger">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="2"/>
                  <circle cx="12" cy="14" r="2" stroke="currentColor" stroke-width="2"/>
                </svg>
                <div>
                  <strong>NÃO armazene em nuvem ou email</strong>
                  <p>Sempre pode haver vazamento de dados</p>
                </div>
              </div>

              <div class="warning-item success">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <div>
                  <strong>Escreva em papel</strong>
                  <p>Guarde em local seguro, como um cofre</p>
                </div>
              </div>
            </div>

            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="understood1" />
                <span>Entendo que qualquer pessoa com esta frase terá acesso aos meus fundos</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="understood2" />
                <span>Entendo que se eu perder esta frase, perderei acesso permanente à minha carteira</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="understood3" />
                <span>Vou escrever esta frase em papel e guardar em local seguro</span>
              </label>
            </div>

            <button
              class="btn btn-danger btn-full"
              (click)="revealMnemonic()"
              [disabled]="!canReveal()"
            >
              Revelar Frase de Recuperação
            </button>
          </div>
        } @else {
          <!-- Mnemonic Display -->
          <div class="mnemonic-content">
            <div class="success-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
            </div>

            <h2 class="export-title">Sua Frase de Recuperação</h2>
            <p class="export-subtitle">
              Escreva estas palavras na ordem exata. Você precisará delas para recuperar sua carteira.
            </p>

            <div class="mnemonic-container">
              <div class="mnemonic-grid">
                @for (word of mnemonicWords(); track $index) {
                  <div class="mnemonic-word">
                    <span class="word-number">{{ $index + 1 }}</span>
                    <span class="word-text">{{ word }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="reminder-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>Lembre-se: NUNCA compartilhe sua frase de recuperação com ninguém!</span>
            </div>

            <button class="btn btn-primary btn-full" (click)="onClose()">
              Fechar (Já anotei minha frase)
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .export-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
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

    .export-dialog {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 32px;
      max-width: 650px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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
      z-index: 10;
    }

    .close-button:hover {
      background: #F3F4F6;
      color: #1F2937;
    }

    .danger-icon {
      width: 96px;
      height: 96px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #DC2626;
    }

    .success-icon {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D1FAE5 0%, #6EE7B7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #059669;
    }

    .export-title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 8px 0;
      text-align: center;
    }

    .export-subtitle {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 24px 0;
      line-height: 1.6;
      text-align: center;
    }

    .warning-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .warning-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      border-radius: 12px;
      border: 2px solid;
    }

    .warning-item.danger {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: #991B1B;
    }

    .warning-item.danger svg {
      flex-shrink: 0;
      color: #DC2626;
    }

    .warning-item.success {
      background: #ECFDF5;
      border-color: #6EE7B7;
      color: #065F46;
    }

    .warning-item.success svg {
      flex-shrink: 0;
      color: #10B981;
    }

    .warning-item strong {
      display: block;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .warning-item p {
      font-size: 13px;
      margin: 0;
      opacity: 0.9;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
      padding: 20px;
      background: #F9FAFB;
      border-radius: 12px;
    }

    .checkbox-label {
      display: flex;
      align-items: start;
      gap: 12px;
      cursor: pointer;
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
      font-weight: 500;
    }

    .checkbox-label input[type="checkbox"] {
      margin-top: 2px;
      width: 18px;
      height: 18px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .mnemonic-container {
      background: #F9FAFB;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .mnemonic-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }

    .mnemonic-word {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      user-select: all;
    }

    .word-number {
      font-size: 11px;
      color: #9CA3AF;
      font-weight: 700;
      min-width: 22px;
    }

    .word-text {
      font-size: 15px;
      color: #1F2937;
      font-weight: 700;
    }

    .reminder-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #FEF3C7;
      border: 2px solid #F59E0B;
      border-radius: 12px;
      color: #92400E;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
    }

    .reminder-box svg {
      flex-shrink: 0;
      color: #F59E0B;
    }

    .btn {
      padding: 14px 24px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
    }

    .btn-danger {
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .btn-danger:hover:not(:disabled) {
      background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
    }

    .btn-full {
      width: 100%;
    }

    @media (max-width: 640px) {
      .export-dialog {
        padding: 24px;
      }

      .export-title {
        font-size: 20px;
      }

      .danger-icon {
        width: 80px;
        height: 80px;
      }

      .success-icon {
        width: 64px;
        height: 64px;
      }

      .mnemonic-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .warning-item {
        padding: 12px;
      }
    }
  `]
})
export class SeedPhraseExportComponent {
  private walletManager = inject(WalletManagerService);

  readonly closed = output<void>();

  showMnemonic = signal(false);
  mnemonicWords = signal<string[]>([]);

  understood1 = false;
  understood2 = false;
  understood3 = false;

  canReveal() {
    return this.understood1 && this.understood2 && this.understood3;
  }

  revealMnemonic() {
    const mnemonic = this.walletManager.getEmbeddedWalletMnemonic();
    if (mnemonic) {
      this.mnemonicWords.set(mnemonic.split(' '));
      this.showMnemonic.set(true);
    }
  }

  onClose() {
    this.closed.emit();
  }
}
