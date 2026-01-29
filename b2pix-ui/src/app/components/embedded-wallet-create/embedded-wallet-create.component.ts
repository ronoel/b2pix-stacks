import { Component, inject, signal, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';

@Component({
  selector: 'app-embedded-wallet-create',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="wallet-create-container">
      @if (currentStep() === 'method') {
        <div class="step-content">
          <h2 class="step-title">Escolha o método de segurança</h2>
          <p class="step-description">
            Selecione como você deseja proteger sua carteira.
          </p>

          <div class="method-options">
            @if (isPasskeyAvailable()) {
              <button class="method-card" (click)="selectMethod('passkey')" autofocus>
                <div class="method-icon passkey-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                  </svg>
                </div>
                <div class="method-content">
                  <h3>Passkey (Recomendado)</h3>
                  <p>Use biometria ou PIN do dispositivo. Mais rápido e seguro.</p>
                  <ul class="method-benefits">
                    <li>Face ID, Touch ID ou Windows Hello</li>
                    <li>Não precisa lembrar senha</li>
                    <li>Proteção contra phishing</li>
                  </ul>
                </div>
              </button>
            }

            <button class="method-card" (click)="selectMethod('password')">
              <div class="method-icon password-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="method-content">
                <h3>Senha</h3>
                <p>Método tradicional com senha mestre.</p>
                <ul class="method-benefits">
                  <li>Funciona em qualquer dispositivo</li>
                  <li>Fácil de usar</li>
                  <li>Compatível com todos navegadores</li>
                </ul>
              </div>
            </button>
          </div>

          <div class="button-group">
            <button class="btn btn-secondary" (click)="onCancel()">
              Cancelar
            </button>
          </div>
        </div>
      }

      @if (currentStep() === 'password') {
        <div class="step-content">
          <h2 class="step-title">Criar Carteira</h2>
          <p class="step-description">
            Crie uma senha segura para proteger sua carteira. Você precisará dessa senha toda vez que quiser acessar sua carteira.
          </p>

          <div class="form-group">
            <label for="password" class="form-label">Senha</label>
            <div class="input-with-toggle">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                class="form-input"
                [(ngModel)]="password"
                placeholder="Digite uma senha forte"
                [disabled]="isLoading()"
                (keyup.enter)="createWallet()"
              />
              <button
                type="button"
                class="toggle-visibility"
                (click)="showPassword.set(!showPassword())"
                [disabled]="isLoading()"
                tabindex="-1"
              >
                @if (showPassword()) {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                } @else {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                }
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword" class="form-label">Confirmar Senha</label>
            <div class="input-with-toggle">
              <input
                id="confirmPassword"
                [type]="showConfirmPassword() ? 'text' : 'password'"
                class="form-input"
                [(ngModel)]="confirmPassword"
                placeholder="Digite a senha novamente"
                [disabled]="isLoading()"
                (keyup.enter)="createWallet()"
              />
              <button
                type="button"
                class="toggle-visibility"
                (click)="showConfirmPassword.set(!showConfirmPassword())"
                [disabled]="isLoading()"
                tabindex="-1"
              >
                @if (showConfirmPassword()) {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                } @else {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                }
              </button>
            </div>
          </div>

          @if (errorMessage()) {
            <div class="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              {{ errorMessage() }}
            </div>
          }

          <div class="button-group">
            <button class="btn btn-secondary" (click)="onCancel()" [disabled]="isLoading()">
              Cancelar
            </button>
            <button class="btn btn-primary" (click)="createWallet()" [disabled]="isLoading()">
              @if (isLoading()) {
                <span class="spinner"></span>
                Criando...
              } @else {
                Criar Carteira
              }
            </button>
          </div>
        </div>
      }

      @if (currentStep() === 'mnemonic') {
        <div class="step-content mnemonic-step">
          <div class="step-header">
            <div class="warning-banner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
              <div>
                <h3>IMPORTANTE: Guarde sua Frase de Recuperação</h3>
                <p>Esta é a única maneira de recuperar sua carteira se você esquecer a senha.</p>
              </div>
            </div>
          </div>

          <div class="step-body">
            <div class="mnemonic-container">
              <div class="mnemonic-header">
                <h4 class="mnemonic-title">Suas 24 palavras de recuperação</h4>
                <button class="btn-copy" (click)="copyMnemonic()" [class.copied]="isCopied()">
                  @if (isCopied()) {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Copiado!
                  } @else {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Copiar
                  }
                </button>
              </div>
              <div class="mnemonic-grid">
                @for (word of mnemonicWords(); track $index) {
                  <div class="mnemonic-word">
                    <span class="word-number">{{ $index + 1 }}</span>
                    <span class="word-text">{{ word }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="warning-list">
              <div class="warning-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/>
                </svg>
                <span>Escreva estas palavras em papel e guarde em local seguro</span>
              </div>
              <div class="warning-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>NUNCA compartilhe sua frase de recuperação com ninguém</span>
              </div>
              <div class="warning-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="2"/>
                  <path d="M9 22V12h6v10" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span>Não tire screenshots - pode ser vazado por malware</span>
              </div>
            </div>

            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="confirmedBackup" />
                <span>Eu entendo que se eu perder esta frase, perderei acesso permanente à minha carteira e fundos</span>
              </label>
            </div>
          </div>

          <div class="step-footer">
            <div class="button-group">
              <button class="btn btn-primary btn-full" (click)="completeSetup()" [disabled]="!confirmedBackup">
                Continuar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .wallet-create-container {
      max-width: 600px;
      margin: 0 auto;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .step-content {
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow: hidden;
    }

    .step-content:not(.mnemonic-step) {
      padding: 32px;
    }

    .mnemonic-step {
      display: flex;
      flex-direction: column;
      height: auto;
    }

    .step-header {
      padding: 24px 32px 0;
      flex-shrink: 0;
    }

    .step-body {
      padding: 0 32px;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }

    .step-footer {
      padding: 0 32px 24px;
      flex-shrink: 0;
      background: #FFFFFF;
      border-top: 1px solid #F3F4F6;
      padding-top: 20px;
      margin-top: 20px;
    }

    .step-title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .step-description {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 24px 0;
      line-height: 1.6;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      font-size: 14px;
      border: 2px solid #E5E7EB;
      border-radius: 8px;
      transition: all 0.2s;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #3B82F6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-input:disabled {
      background: #F3F4F6;
      cursor: not-allowed;
    }

    .input-with-toggle {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-with-toggle .form-input {
      padding-right: 48px;
    }

    .toggle-visibility {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: #6B7280;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .toggle-visibility:hover:not(:disabled) {
      color: #374151;
    }

    .toggle-visibility:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #FEE2E2;
      border: 1px solid #FCA5A5;
      border-radius: 8px;
      color: #991B1B;
      font-size: 14px;
      margin-bottom: 20px;
    }

    .warning-banner {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
      border: 2px solid #F59E0B;
      border-radius: 12px;
      margin-bottom: 24px;
      color: #92400E;
    }

    .warning-banner svg {
      flex-shrink: 0;
      color: #F59E0B;
    }

    .warning-banner h3 {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 4px 0;
    }

    .warning-banner p {
      font-size: 13px;
      margin: 0;
      line-height: 1.5;
    }

    .mnemonic-container {
      background: #F9FAFB;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .mnemonic-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      gap: 12px;
    }

    .mnemonic-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin: 0;
    }

    .btn-copy {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #FFFFFF;
      border: 1.5px solid #D1D5DB;
      border-radius: 6px;
      color: #374151;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn-copy:hover {
      background: #F9FAFB;
      border-color: #3B82F6;
      color: #3B82F6;
    }

    .btn-copy.copied {
      background: #DEF7EC;
      border-color: #10B981;
      color: #059669;
    }

    .btn-copy svg {
      flex-shrink: 0;
    }

    .mnemonic-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .mnemonic-word {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
    }

    .word-number {
      font-size: 11px;
      color: #9CA3AF;
      font-weight: 600;
      min-width: 20px;
    }

    .word-text {
      font-size: 14px;
      color: #1F2937;
      font-weight: 600;
    }

    .warning-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .warning-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #FEF2F2;
      border-left: 4px solid #EF4444;
      border-radius: 8px;
      font-size: 13px;
      color: #991B1B;
    }

    .warning-item svg {
      flex-shrink: 0;
      color: #EF4444;
    }

    .checkbox-group {
      margin-bottom: 24px;
    }

    .checkbox-label {
      display: flex;
      align-items: start;
      gap: 12px;
      cursor: pointer;
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
    }

    .checkbox-label input[type="checkbox"] {
      margin-top: 2px;
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .button-group {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn {
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
    }

    .btn-secondary {
      background: #FFFFFF;
      color: #374151;
      border: 2px solid #E5E7EB;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #F9FAFB;
      border-color: #D1D5DB;
    }

    .btn-full {
      width: 100%;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Scrollbar styling for step-body */
    .step-body::-webkit-scrollbar {
      width: 8px;
    }

    .step-body::-webkit-scrollbar-track {
      background: transparent;
    }

    .step-body::-webkit-scrollbar-thumb {
      background: #E5E7EB;
      border-radius: 4px;
    }

    .step-body::-webkit-scrollbar-thumb:hover {
      background: #D1D5DB;
    }

    .method-options {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .method-card {
      display: flex;
      align-items: start;
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

    .method-card:hover {
      border-color: #3B82F6;
      background: #F9FAFB;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }

    .method-icon {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .passkey-icon {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
    }

    .password-icon {
      background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
      color: #FFFFFF;
    }

    .method-content {
      flex: 1;
    }

    .method-content h3 {
      font-size: 16px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 6px 0;
    }

    .method-content > p {
      font-size: 13px;
      color: #6B7280;
      margin: 0 0 12px 0;
    }

    .method-benefits {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .method-benefits li {
      font-size: 12px;
      color: #9CA3AF;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .method-benefits li::before {
      content: '✓';
      color: #10B981;
      font-weight: bold;
    }

    @media (max-width: 640px) {
      .wallet-create-container {
        max-height: 95vh;
      }

      .step-content {
        max-height: 95vh;
      }

      .step-content:not(.mnemonic-step) {
        padding: 24px;
      }

      .step-header {
        padding: 20px 24px 0;
      }

      .step-body {
        padding: 0 24px;
      }

      .step-footer {
        padding: 0 24px 20px;
      }

      .step-title {
        font-size: 20px;
      }

      .warning-banner {
        flex-direction: column;
        gap: 12px;
        padding: 16px;
      }

      .mnemonic-container {
        padding: 16px;
      }

      .mnemonic-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .btn-copy {
        width: 100%;
        justify-content: center;
      }

      .mnemonic-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .mnemonic-word {
        padding: 10px;
      }

      .word-text {
        font-size: 13px;
      }

      .warning-list {
        gap: 10px;
      }

      .warning-item {
        padding: 10px 12px;
        font-size: 12px;
      }

      .button-group {
        flex-direction: column-reverse;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class EmbeddedWalletCreateComponent {
  private walletManager = inject(WalletManagerService);

  readonly walletCreated = output<void>();
  readonly cancelled = output<void>();

  currentStep = signal<'method' | 'password' | 'mnemonic'>('method');
  selectedMethod: 'password' | 'passkey' = 'password';
  password = '';
  confirmPassword = '';
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  mnemonic = signal<string>('');
  mnemonicWords = signal<string[]>([]);
  confirmedBackup = false;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  isCopied = signal(false);
  isPasskeyAvailable = signal(false);

  async ngOnInit() {
    // Check if passkey is available
    const isWebAuthnSupported = this.walletManager.isWebAuthnSupported();
    if (isWebAuthnSupported) {
      const isPlatformAvailable = await this.walletManager.isPlatformAuthenticatorAvailable();
      this.isPasskeyAvailable.set(isPlatformAvailable);
    }

    // If passkey is not available, skip method selection and go directly to password
    if (!this.isPasskeyAvailable()) {
      this.currentStep.set('password');
    }
  }

  selectMethod(method: 'password' | 'passkey') {
    this.selectedMethod = method;
    this.errorMessage.set(null);

    if (method === 'passkey') {
      // Skip password step and create wallet with passkey
      this.createWalletWithPasskey();
    } else {
      // Go to password step
      this.currentStep.set('password');
    }
  }

  async createWalletWithPasskey() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const result = await this.walletManager.generateEmbeddedWalletWithPasskey();
      this.mnemonic.set(result.mnemonic);
      this.mnemonicWords.set(result.mnemonic.split(' '));
      this.currentStep.set('mnemonic');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Erro ao criar carteira com passkey'
      );
      // Go back to method selection
      this.currentStep.set('method');
    } finally {
      this.isLoading.set(false);
    }
  }

  async createWallet() {
    this.errorMessage.set(null);

    // Validation
    if (!this.password || !this.confirmPassword) {
      this.errorMessage.set('Por favor, preencha todos os campos');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('As senhas não coincidem');
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage.set('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    this.isLoading.set(true);

    try {
      const result = await this.walletManager.generateEmbeddedWallet(this.password);
      this.mnemonic.set(result.mnemonic);
      this.mnemonicWords.set(result.mnemonic.split(' '));
      this.currentStep.set('mnemonic');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Erro ao criar carteira'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  completeSetup() {
    this.walletCreated.emit();
  }

  async copyMnemonic() {
    try {
      await navigator.clipboard.writeText(this.mnemonic());
      this.isCopied.set(true);
      setTimeout(() => {
        this.isCopied.set(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy mnemonic:', error);
    }
  }

  onCancel() {
    this.cancelled.emit();
  }
}
