import { Component, OnInit, inject, signal, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';

@Component({
  selector: 'app-embedded-wallet-import',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="import-container">
      <div class="import-card">
        <div class="import-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <h2 class="import-title">Importar Carteira Embarcada</h2>
        <p class="import-description">
          Cole sua frase de recuperação de 24 palavras e escolha como proteger sua carteira.
        </p>

        @if (currentStep() === 1) {
          <!-- Step 1: Seed Phrase Input -->
          <div class="step-content">
            <div class="form-group">
              <label for="seedPhrase" class="form-label">Frase de Recuperação (24 palavras)</label>
              <textarea
                id="seedPhrase"
                class="form-textarea"
                [(ngModel)]="seedPhrase"
                placeholder="Cole aqui sua frase de recuperação de 24 palavras separadas por espaços"
                rows="4"
                [disabled]="isImporting()"
              ></textarea>
              <span class="form-hint">
                As palavras devem estar separadas por espaços. Total de palavras: {{ wordCount() }}
              </span>
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
              <button class="btn btn-secondary" (click)="onCancel()" [disabled]="isImporting()">
                Cancelar
              </button>
              <button class="btn btn-primary" (click)="validateAndProceed()" [disabled]="isImporting()">
                Continuar
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        } @else if (currentStep() === 2) {
          <!-- Step 2: Security Method Selection -->
          <div class="step-content">
            <div class="security-notice">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Escolha como proteger sua carteira neste dispositivo</span>
            </div>

            <!-- Security Method Selector -->
            <div class="security-method-selector">
              <button
                type="button"
                class="method-option"
                [class.selected]="securityMethod() === 'passkey'"
                (click)="securityMethod.set('passkey')"
                [disabled]="isImporting()"
              >
                <div class="method-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C9.79 2 8 3.79 8 6C8 8.21 9.79 10 12 10C14.21 10 16 8.21 16 6C16 3.79 14.21 2 12 2Z" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 14C7.58 14 4 16.69 4 20V22H20V20C20 16.69 16.42 14 12 14Z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="method-content">
                  <span class="method-title">Passkey</span>
                  <span class="method-description">Use biometria ou PIN do dispositivo</span>
                </div>
                <span class="method-badge">Recomendado</span>
              </button>

              <button
                type="button"
                class="method-option"
                [class.selected]="securityMethod() === 'password'"
                (click)="securityMethod.set('password')"
                [disabled]="isImporting()"
              >
                <div class="method-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" stroke="currentColor" stroke-width="2"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <div class="method-content">
                  <span class="method-title">Senha</span>
                  <span class="method-description">Crie uma senha para proteger sua carteira</span>
                </div>
              </button>
            </div>

            @if (securityMethod() === 'password') {
              <!-- Password Fields -->
              <div class="form-group">
                <label for="password" class="form-label">Senha</label>
                <div class="input-with-toggle">
                  <input
                    id="password"
                    [type]="showPassword() ? 'text' : 'password'"
                    class="form-input"
                    [(ngModel)]="password"
                    placeholder="Digite uma senha forte"
                    [disabled]="isImporting()"
                  />
                  <button
                    type="button"
                    class="toggle-visibility"
                    (click)="showPassword.set(!showPassword())"
                    [disabled]="isImporting()"
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
                    [disabled]="isImporting()"
                  />
                  <button
                    type="button"
                    class="toggle-visibility"
                    (click)="showConfirmPassword.set(!showConfirmPassword())"
                    [disabled]="isImporting()"
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
            }

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
              <button class="btn btn-secondary" (click)="goBack()" [disabled]="isImporting()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <polyline points="15 18 9 12 15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Voltar
              </button>
              <button class="btn btn-primary" (click)="importWallet()" [disabled]="isImporting()">
                @if (isImporting()) {
                  <span class="spinner"></span>
                  Importando...
                } @else {
                  Importar Carteira
                }
              </button>
            </div>
          </div>
        }

        <div class="step-indicator">
          <div class="step" [class.active]="currentStep() === 1" [class.completed]="currentStep() > 1">1</div>
          <div class="step-line" [class.completed]="currentStep() > 1"></div>
          <div class="step" [class.active]="currentStep() === 2">2</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .import-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
    }

    .import-card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      position: relative;
    }

    .import-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
    }

    .import-title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 8px 0;
      text-align: center;
    }

    .import-description {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 32px 0;
      text-align: center;
      line-height: 1.6;
    }

    .step-content {
      margin-bottom: 32px;
    }

    .security-notice {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #DBEAFE;
      border: 1px solid #93C5FD;
      border-radius: 8px;
      color: #1E40AF;
      margin-bottom: 24px;
      font-size: 14px;
    }

    .security-notice svg {
      flex-shrink: 0;
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

    .security-method-selector {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .method-option {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .method-option:hover:not(:disabled) {
      border-color: #93C5FD;
      background: #F8FAFC;
    }

    .method-option.selected {
      border-color: #3B82F6;
      background: #EFF6FF;
    }

    .method-option:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .method-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #F3F4F6;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6B7280;
      flex-shrink: 0;
    }

    .method-option.selected .method-icon {
      background: #DBEAFE;
      color: #2563EB;
    }

    .method-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .method-title {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;
    }

    .method-description {
      font-size: 13px;
      color: #6B7280;
    }

    .method-badge {
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #047857;
      background: #D1FAE5;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-textarea {
      width: 100%;
      padding: 12px 16px;
      font-size: 14px;
      border: 2px solid #E5E7EB;
      border-radius: 8px;
      transition: all 0.2s;
      box-sizing: border-box;
      font-family: 'Courier New', monospace;
      resize: vertical;
      min-height: 100px;
    }

    .form-textarea:focus {
      outline: none;
      border-color: #3B82F6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-textarea:disabled {
      background: #F3F4F6;
      cursor: not-allowed;
    }

    .form-hint {
      display: block;
      font-size: 12px;
      color: #6B7280;
      margin-top: 6px;
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

    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .btn {
      flex: 1;
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
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
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

    .step-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #E5E7EB;
    }

    .step {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #E5E7EB;
      color: #9CA3AF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
    }

    .step.active {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .step.completed {
      background: #10B981;
      color: #FFFFFF;
    }

    .step-line {
      width: 80px;
      height: 2px;
      background: #E5E7EB;
      transition: all 0.2s;
    }

    .step-line.completed {
      background: #10B981;
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

    @media (max-width: 640px) {
      .import-container {
        padding: 16px;
      }

      .import-card {
        padding: 24px;
      }

      .import-title {
        font-size: 20px;
      }

      .button-group {
        flex-direction: column-reverse;
      }

      .step-line {
        width: 40px;
      }
    }
  `]
})
export class EmbeddedWalletImportComponent implements OnInit {
  private walletManager = inject(WalletManagerService);

  readonly walletImported = output<void>();
  readonly cancelled = output<void>();

  currentStep = signal(1);
  seedPhrase = '';
  password = '';
  confirmPassword = '';
  isImporting = signal(false);
  errorMessage = signal<string | null>(null);

  wordCount = signal(0);

  // Password visibility toggles
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  // Security method: 'password' or 'passkey'
  securityMethod = signal<'password' | 'passkey'>('password');

  ngOnInit() {
    // Watch for changes in seed phrase to update word count
    setInterval(() => {
      const words = this.seedPhrase.trim().split(/\s+/).filter(word => word.length > 0);
      this.wordCount.set(words.length);
    }, 100);
  }

  validateAndProceed() {
    this.errorMessage.set(null);

    const words = this.seedPhrase.trim().split(/\s+/).filter(word => word.length > 0);

    if (words.length === 0) {
      this.errorMessage.set('Por favor, cole sua frase de recuperação');
      return;
    }

    if (words.length !== 24) {
      this.errorMessage.set(`A frase de recuperação deve ter exatamente 24 palavras. Você digitou ${words.length} palavras.`);
      return;
    }

    // Validate that all words are non-empty
    if (words.some(word => !word || word.length === 0)) {
      this.errorMessage.set('Todas as palavras devem ser válidas');
      return;
    }

    // Proceed to password step
    this.currentStep.set(2);
  }

  goBack() {
    this.currentStep.set(1);
    this.password = '';
    this.confirmPassword = '';
    this.errorMessage.set(null);
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
  }

  async importWallet() {
    this.errorMessage.set(null);

    if (this.securityMethod() === 'password') {
      if (!this.password) {
        this.errorMessage.set('Por favor, digite uma senha');
        return;
      }

      if (this.password.length < 8) {
        this.errorMessage.set('A senha deve ter no mínimo 8 caracteres');
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.errorMessage.set('As senhas não coincidem');
        return;
      }
    }

    this.isImporting.set(true);

    try {
      const cleanSeedPhrase = this.seedPhrase.trim().split(/\s+/).join(' ');

      if (this.securityMethod() === 'passkey') {
        await this.walletManager.importEmbeddedWalletWithPasskey(cleanSeedPhrase);
      } else {
        await this.walletManager.importEmbeddedWallet(cleanSeedPhrase, this.password);
      }

      this.walletImported.emit();
    } catch (error) {
      console.error('Error importing wallet:', error);
      if (this.securityMethod() === 'passkey') {
        this.errorMessage.set('Erro ao importar carteira com Passkey. Verifique se a frase de recuperação está correta e tente novamente.');
      } else {
        this.errorMessage.set('Erro ao importar carteira. Verifique se a frase de recuperação está correta.');
      }
      this.isImporting.set(false);
    }
  }

  onCancel() {
    this.cancelled.emit();
  }
}
