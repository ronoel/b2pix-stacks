import { Component, inject, signal, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { EncryptionMethod } from '../../libs/wallet/wallet.types';

@Component({
  selector: 'app-embedded-wallet-unlock',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="unlock-container">
      <div class="unlock-card">
        <div class="unlock-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M12 15v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M8 11V7a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>

        <h2 class="unlock-title">Desbloquear Carteira</h2>

        @if (usePasskey()) {
          <p class="unlock-description">
            Use seu passkey (biometria ou PIN) para acessar sua carteira
          </p>

          @if (errorMessage()) {
            <div class="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              {{ errorMessage() }}
            </div>
          }

          <div class="passkey-unlock-area">
            <button class="btn-passkey" (click)="unlockWithPasskey()" [disabled]="isLoading()">
              @if (isLoading()) {
                <span class="spinner"></span>
                Autenticando...
              } @else {
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                </svg>
                Autenticar com Passkey
              }
            </button>
          </div>
        } @else {
          <p class="unlock-description">
            Digite sua senha para acessar sua carteira
          </p>

          <div class="form-group">
            <label for="password" class="form-label">Senha</label>
            <div class="input-with-toggle">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                class="form-input"
                [(ngModel)]="password"
                placeholder="Digite sua senha"
                [disabled]="isLoading()"
                (keyup.enter)="unlockWallet()"
                autofocus
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
            <button class="btn btn-primary" (click)="unlockWallet()" [disabled]="isLoading()">
              @if (isLoading()) {
                <span class="spinner"></span>
                Desbloqueando...
              } @else {
                Desbloquear
              }
            </button>
          </div>
        }

        <div class="help-text">
          <a href="#" class="help-link" (click)="onForgotPassword($event)">
            Esqueceu sua senha?
          </a>
          <span class="separator">•</span>
          <a href="#" class="help-link danger" (click)="onRequestDelete($event)">
            Excluir carteira
          </a>
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      @if (showDeleteConfirmation()) {
        <div class="delete-overlay" (click)="showDeleteConfirmation.set(false)">
          <div class="delete-dialog" (click)="$event.stopPropagation()">
            <div class="delete-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <h3 class="delete-title">Excluir Carteira Permanentemente?</h3>
            <p class="delete-warning">
              Esta ação <strong>NÃO PODE SER DESFEITA</strong>. Todos os dados da sua carteira serão apagados permanentemente.
            </p>
            <div class="delete-notice">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>Certifique-se de ter guardado sua frase de recuperação antes de continuar!</span>
            </div>
            <div class="delete-actions">
              <button class="btn btn-secondary" (click)="showDeleteConfirmation.set(false)">
                Cancelar
              </button>
              <button class="btn btn-danger" (click)="confirmDelete()">
                Sim, Excluir Carteira
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .unlock-container {
      max-width: 400px;
      margin: 0 auto;
      padding: 24px;
    }

    .unlock-card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .unlock-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
    }

    .unlock-title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .unlock-description {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 24px 0;
      line-height: 1.6;
    }

    .form-group {
      margin-bottom: 20px;
      text-align: left;
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
      border-color: #10B981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
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
      justify-content: center;
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
      margin-bottom: 16px;
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
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
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

    .help-text {
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .separator {
      color: #D1D5DB;
      font-size: 13px;
    }

    .help-link {
      font-size: 13px;
      color: #3B82F6;
      text-decoration: none;
      transition: color 0.2s;
    }

    .help-link:hover {
      color: #2563EB;
      text-decoration: underline;
    }

    .help-link.danger {
      color: #EF4444;
    }

    .help-link.danger:hover {
      color: #DC2626;
    }

    .delete-overlay {
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
      z-index: 10000;
      padding: 16px;
      animation: fadeIn 0.2s ease-out;
    }

    .delete-dialog {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 32px;
      max-width: 450px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
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

    .delete-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #DC2626;
    }

    .delete-title {
      font-size: 20px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 16px 0;
      text-align: center;
    }

    .delete-warning {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 20px 0;
      line-height: 1.6;
      text-align: center;
    }

    .delete-warning strong {
      color: #DC2626;
      font-weight: 700;
    }

    .delete-notice {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #FEF3C7;
      border: 2px solid #F59E0B;
      border-radius: 8px;
      color: #92400E;
      font-size: 13px;
      margin-bottom: 24px;
    }

    .delete-notice svg {
      flex-shrink: 0;
      color: #F59E0B;
    }

    .delete-actions {
      display: flex;
      gap: 12px;
    }

    .btn-danger {
      flex: 1;
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .btn-danger:hover:not(:disabled) {
      background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
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

    .passkey-unlock-area {
      margin-bottom: 20px;
    }

    .btn-passkey {
      width: 100%;
      padding: 16px 24px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .btn-passkey:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
    }

    .btn-passkey:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 640px) {
      .unlock-card {
        padding: 24px;
      }

      .unlock-title {
        font-size: 20px;
      }

      .button-group {
        flex-direction: column-reverse;
      }
    }
  `]
})
export class EmbeddedWalletUnlockComponent {
  private walletManager = inject(WalletManagerService);

  readonly walletUnlocked = output<void>();
  readonly cancelled = output<void>();
  readonly forgotPassword = output<void>();
  readonly walletDeleted = output<void>();

  password = '';
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showDeleteConfirmation = signal(false);
  usePasskey = signal(false);

  ngOnInit() {
    // Check which encryption method is used
    const encryptionMethod = this.walletManager.getWalletEncryptionMethod();
    this.usePasskey.set(encryptionMethod === EncryptionMethod.WEBAUTHN);
  }

  async unlockWithPasskey() {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      await this.walletManager.unlockEmbeddedWalletWithPasskey();
      this.walletUnlocked.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Falha na autenticação. Tente novamente.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async unlockWallet() {
    this.errorMessage.set(null);

    if (!this.password) {
      this.errorMessage.set('Por favor, digite sua senha');
      return;
    }

    this.isLoading.set(true);

    try {
      await this.walletManager.unlockEmbeddedWallet(this.password);
      this.walletUnlocked.emit();
    } catch (error) {
      this.errorMessage.set('Senha incorreta. Tente novamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onCancel() {
    this.cancelled.emit();
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    this.forgotPassword.emit();
  }

  onRequestDelete(event: Event) {
    event.preventDefault();
    this.showDeleteConfirmation.set(true);
  }

  confirmDelete() {
    this.showDeleteConfirmation.set(false);
    this.walletDeleted.emit();
  }
}
