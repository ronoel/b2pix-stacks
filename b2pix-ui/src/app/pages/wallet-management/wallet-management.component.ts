import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { WalletType } from '../../libs/wallet/wallet.types';

@Component({
  selector: 'app-wallet-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wallet-management">
      <div class="container">
        <!-- Header -->
        <div class="page-header">
          <button class="btn-back" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Voltar
          </button>
          <h1 class="page-title">Gerenciar Carteira</h1>
        </div>

        @if (isEmbeddedWallet()) {
          <!-- Wallet Info Card -->
          <div class="info-card">
            <div class="info-header">
              <div class="info-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 15v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M8 11V7a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="info-content">
                <h2 class="info-title">Carteira Embarcada</h2>
                <p class="info-subtitle">Sob seu total controle</p>
              </div>
            </div>

            <div class="wallet-address-section">
              <label class="form-label">Endereço da Carteira</label>
              <div class="address-display">
                <code>{{ walletAddress() }}</code>
                <button class="btn-copy-small" (click)="copyAddress()" [disabled]="addressCopied()">
                  @if (addressCopied()) {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  } @else {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                      <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  }
                </button>
              </div>
            </div>
          </div>

          <!-- Security Warning -->
          <div class="warning-banner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div>
              <strong>Sua frase de recuperação é a chave para sua carteira</strong>
              <p>Nunca compartilhe sua frase de recuperação com ninguém. A B2Pix nunca solicitará esta informação.</p>
            </div>
          </div>

          <!-- Seed Phrase Section -->
          <div class="seed-phrase-card">
            <div class="card-header">
              <h3>Frase de Recuperação (Seed Phrase)</h3>
              <p>Use esta frase para recuperar sua carteira em caso de perda de acesso</p>
            </div>

            @if (!seedPhraseVisible()) {
              <!-- Password Form -->
              <div class="unlock-section">
                <div class="security-notice">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>Para visualizar sua frase de recuperação, digite sua senha</span>
                </div>

                <div class="form-group">
                  <label for="password" class="form-label">Senha da Carteira</label>
                  <input
                    id="password"
                    type="password"
                    class="form-input"
                    [(ngModel)]="password"
                    placeholder="Digite sua senha"
                    [disabled]="isUnlocking()"
                    (keyup.enter)="unlockAndViewSeed()"
                  />
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

                <button class="btn btn-primary" (click)="unlockAndViewSeed()" [disabled]="isUnlocking() || !password">
                  @if (isUnlocking()) {
                    <div class="loading-spinner-sm"></div>
                    Desbloqueando...
                  } @else {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M2 9v10a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="12" cy="13" r="2" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Ver Frase de Recuperação
                  }
                </button>
              </div>
            } @else {
              <!-- Seed Phrase Display -->
              <div class="seed-phrase-display">
                <div class="critical-warning">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <div>
                    <strong>ATENÇÃO: Mantenha esta informação em segurança!</strong>
                    <ul>
                      <li>Anote estas palavras em ordem e guarde em um local seguro</li>
                      <li>Nunca tire uma foto ou armazene digitalmente</li>
                      <li>Qualquer pessoa com acesso a esta frase pode controlar seus fundos</li>
                      <li>A B2Pix nunca solicitará sua frase de recuperação</li>
                    </ul>
                  </div>
                </div>

                <div class="seed-words-grid">
                  @for (word of seedWords(); track $index) {
                    <div class="seed-word-item">
                      <span class="word-number">{{ $index + 1 }}</span>
                      <span class="word-text">{{ word }}</span>
                    </div>
                  }
                </div>

                <div class="seed-actions">
                  <button class="btn btn-outline" (click)="copySeedPhrase()" [disabled]="seedCopied()">
                    @if (seedCopied()) {
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      Copiado!
                    } @else {
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      Copiar Frase de Recuperação
                    }
                  </button>
                  <button class="btn btn-secondary" (click)="hideSeedPhrase()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Ocultar
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Additional Security Tips -->
          <div class="security-tips">
            <h3>Dicas de Segurança</h3>
            <ul>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Anote sua frase de recuperação em papel e guarde em local seguro
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Nunca compartilhe sua senha ou frase de recuperação com ninguém
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Faça backup da sua frase de recuperação em múltiplos locais seguros
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Evite armazenar digitalmente ou tirar fotos da sua frase de recuperação
              </li>
            </ul>
          </div>

          <!-- Danger Zone -->
          <div class="danger-zone">
            <div class="danger-header">
              <h3>Zona de Perigo</h3>
              <p>Ações irreversíveis que afetam permanentemente sua carteira</p>
            </div>
            <div class="danger-action">
              <div class="danger-info">
                <h4>Remover Carteira</h4>
                <p>Remove permanentemente esta carteira do navegador. Certifique-se de ter feito backup da sua frase de recuperação.</p>
              </div>
              <button class="btn-danger" (click)="showDeleteConfirmation.set(true)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Remover Carteira
              </button>
            </div>
          </div>
        } @else {
          <!-- External Wallet Info -->
          <div class="external-wallet-info">
            <div class="info-icon-large">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                <circle cx="17" cy="12" r="1" fill="currentColor"/>
              </svg>
            </div>
            <h3>Carteira Externa</h3>
            <p>Você está usando uma carteira externa (Leather, Xverse, etc.). Para gerenciar sua frase de recuperação e configurações, acesse diretamente sua extensão de carteira.</p>
            <div class="wallet-address-section">
              <label class="form-label">Endereço da Carteira</label>
              <div class="address-display">
                <code>{{ walletAddress() }}</code>
                <button class="btn-copy-small" (click)="copyAddress()" [disabled]="addressCopied()">
                  @if (addressCopied()) {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  } @else {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                      <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  }
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Delete Confirmation Modal -->
        @if (showDeleteConfirmation()) {
          <div class="modal-overlay" (click)="showDeleteConfirmation.set(false)">
            <div class="modal-dialog" (click)="$event.stopPropagation()">
              <div class="modal-icon-danger">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <h3 class="modal-title">Remover Carteira Permanentemente?</h3>

              <div class="modal-warning">
                <p><strong>ATENÇÃO: Esta ação não pode ser desfeita!</strong></p>
                <p>Ao remover esta carteira:</p>
                <ul>
                  <li>Todos os dados da carteira serão removidos deste navegador</li>
                  <li>Você perderá o acesso aos seus fundos se não tiver o backup da frase de recuperação</li>
                  <li>A única forma de recuperar o acesso é através da sua frase de recuperação de 24 palavras</li>
                </ul>
              </div>

              <div class="backup-reminder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div>
                  <strong>Você fez backup da sua frase de recuperação?</strong>
                  <p>Sem ela, você não poderá acessar seus fundos novamente!</p>
                </div>
              </div>

              <div class="modal-actions">
                <button class="btn btn-secondary" (click)="showDeleteConfirmation.set(false)">
                  Cancelar
                </button>
                <button class="btn-danger-confirm" (click)="confirmDeleteWallet()">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  Sim, Remover Minha Carteira
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .wallet-management {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 32px 0;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      color: #6B7280;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 16px;
    }

    .btn-back:hover {
      background: #F9FAFB;
      border-color: #D1D5DB;
      color: #374151;
    }

    .page-title {
      font-size: 32px;
      font-weight: 700;
      color: #1F2937;
      margin: 0;
    }

    .info-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid #E5E7EB;
    }

    .info-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #E5E7EB;
    }

    .info-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .info-content {
      flex: 1;
    }

    .info-title {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 4px 0;
    }

    .info-subtitle {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
    }

    .wallet-address-section {
      margin-top: 16px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .address-display {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 12px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
    }

    .address-display code {
      flex: 1;
      font-size: 13px;
      color: #1F2937;
      word-break: break-all;
      font-family: 'Courier New', monospace;
    }

    .btn-copy-small {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      background: #F59E0B;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .btn-copy-small:hover:not(:disabled) {
      background: #D97706;
    }

    .btn-copy-small:disabled {
      background: #10B981;
      cursor: not-allowed;
    }

    .warning-banner {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: #FEF3C7;
      border: 2px solid #F59E0B;
      border-radius: 12px;
      margin-bottom: 24px;
      color: #92400E;
    }

    .warning-banner svg {
      flex-shrink: 0;
      color: #F59E0B;
      margin-top: 2px;
    }

    .warning-banner strong {
      display: block;
      font-size: 15px;
      margin-bottom: 4px;
      color: #78350F;
    }

    .warning-banner p {
      font-size: 14px;
      margin: 0;
      line-height: 1.5;
    }

    .seed-phrase-card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
      border: 2px solid #E5E7EB;
    }

    .card-header {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #E5E7EB;
    }

    .card-header h3 {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .card-header p {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
    }

    .unlock-section {
      max-width: 500px;
      margin: 0 auto;
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
      margin-bottom: 24px;
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

    .btn {
      width: 100%;
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
      gap: 10px;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
    }

    .btn-outline {
      background: white;
      color: #10B981;
      border: 2px solid #10B981;
    }

    .btn-outline:hover:not(:disabled) {
      background: #F0FDF4;
    }

    .btn-secondary {
      background: white;
      color: #6B7280;
      border: 2px solid #E5E7EB;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #F9FAFB;
      border-color: #D1D5DB;
    }

    .seed-phrase-display {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .critical-warning {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 30%);
      border: 2px solid #DC2626;
      border-radius: 12px;
      margin-bottom: 32px;
      color: #7F1D1D;
    }

    .critical-warning svg {
      flex-shrink: 0;
      color: #DC2626;
      margin-top: 2px;
    }

    .critical-warning strong {
      display: block;
      font-size: 15px;
      margin-bottom: 8px;
      color: #7F1D1D;
    }

    .critical-warning ul {
      margin: 8px 0 0 0;
      padding-left: 20px;
      font-size: 13px;
      line-height: 1.6;
    }

    .critical-warning li {
      margin-bottom: 4px;
    }

    .seed-words-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 32px;
    }

    .seed-word-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #F9FAFB;
      border: 2px solid #E5E7EB;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .seed-word-item:hover {
      background: white;
      border-color: #10B981;
    }

    .word-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #6B7280;
      flex-shrink: 0;
    }

    .word-text {
      font-size: 14px;
      font-weight: 600;
      color: #1F2937;
      font-family: 'Courier New', monospace;
    }

    .seed-actions {
      display: flex;
      gap: 12px;
    }

    .seed-actions .btn {
      flex: 1;
    }

    .security-tips {
      background: white;
      border-radius: 16px;
      padding: 24px;
      border: 1px solid #E5E7EB;
    }

    .security-tips h3 {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 16px 0;
    }

    .security-tips ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .security-tips li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #F3F4F6;
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
    }

    .security-tips li:last-child {
      border-bottom: none;
    }

    .security-tips svg {
      flex-shrink: 0;
      color: #10B981;
      margin-top: 2px;
    }

    .external-wallet-info {
      background: white;
      border-radius: 16px;
      padding: 48px 32px;
      text-align: center;
      border: 1px solid #E5E7EB;
    }

    .info-icon-large {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .external-wallet-info h3 {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 12px 0;
    }

    .external-wallet-info p {
      font-size: 15px;
      color: #6B7280;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto 32px;
    }

    .danger-zone {
      background: white;
      border-radius: 16px;
      padding: 24px;
      border: 2px solid #FCA5A5;
      margin-top: 24px;
    }

    .danger-header {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #FEE2E2;
    }

    .danger-header h3 {
      font-size: 18px;
      font-weight: 600;
      color: #DC2626;
      margin: 0 0 4px 0;
    }

    .danger-header p {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
    }

    .danger-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }

    .danger-info h4 {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 4px 0;
    }

    .danger-info p {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
      line-height: 1.5;
    }

    .btn-danger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    .btn-danger:hover {
      background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
    }

    .modal-overlay {
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

    .modal-dialog {
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 550px;
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

    .modal-icon-danger {
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

    .modal-title {
      font-size: 22px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 20px 0;
      text-align: center;
    }

    .modal-warning {
      padding: 20px;
      background: #FEF2F2;
      border: 2px solid #FCA5A5;
      border-radius: 12px;
      margin-bottom: 20px;
      color: #7F1D1D;
    }

    .modal-warning p {
      margin: 0 0 12px 0;
      font-size: 14px;
      line-height: 1.6;
    }

    .modal-warning p:last-child {
      margin-bottom: 0;
    }

    .modal-warning strong {
      color: #DC2626;
      font-weight: 700;
    }

    .modal-warning ul {
      margin: 8px 0 0 0;
      padding-left: 24px;
      font-size: 14px;
      line-height: 1.8;
    }

    .modal-warning li {
      margin-bottom: 6px;
    }

    .backup-reminder {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: #FEF3C7;
      border: 2px solid #F59E0B;
      border-radius: 12px;
      margin-bottom: 24px;
      color: #92400E;
    }

    .backup-reminder svg {
      flex-shrink: 0;
      color: #F59E0B;
    }

    .backup-reminder strong {
      display: block;
      font-size: 14px;
      margin-bottom: 4px;
      color: #78350F;
    }

    .backup-reminder p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
    }

    .modal-actions .btn {
      flex: 1;
    }

    .btn-danger-confirm {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 24px;
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .btn-danger-confirm:hover {
      background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
    }

    .loading-spinner-sm {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 768px) {
      .wallet-management {
        padding: 24px 0;
      }

      .page-title {
        font-size: 24px;
      }

      .seed-phrase-card {
        padding: 24px 16px;
      }

      .seed-words-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .seed-actions {
        flex-direction: column;
      }

      .critical-warning {
        flex-direction: column;
        gap: 12px;
      }

      .danger-action {
        flex-direction: column;
        align-items: stretch;
      }

      .btn-danger {
        width: 100%;
        justify-content: center;
      }

      .modal-dialog {
        padding: 24px;
      }

      .modal-actions {
        flex-direction: column-reverse;
      }
    }

    @media (max-width: 480px) {
      .seed-words-grid {
        grid-template-columns: 1fr;
      }

      .address-display {
        flex-direction: column;
        align-items: stretch;
      }

      .btn-copy-small {
        width: 100%;
      }

      .backup-reminder {
        flex-direction: column;
        gap: 12px;
      }
    }
  `]
})
export class WalletManagementComponent implements OnInit {
  private router = inject(Router);
  private walletManager = inject(WalletManagerService);

  walletType = signal<WalletType | null>(null);
  walletAddress = signal<string>('');
  addressCopied = signal<boolean>(false);

  password = '';
  seedPhraseVisible = signal<boolean>(false);
  seedPhrase = signal<string>('');
  seedWords = signal<string[]>([]);
  seedCopied = signal<boolean>(false);
  isUnlocking = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  showDeleteConfirmation = signal<boolean>(false);

  ngOnInit() {
    const type = this.walletManager.getWalletType();
    this.walletType.set(type);
    this.walletAddress.set(this.walletManager.getSTXAddress() || '');
  }

  isEmbeddedWallet(): boolean {
    return this.walletType() === WalletType.EMBEDDED;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  copyAddress() {
    const address = this.walletAddress();
    if (address) {
      navigator.clipboard.writeText(address).then(() => {
        this.addressCopied.set(true);
        setTimeout(() => {
          this.addressCopied.set(false);
        }, 2000);
      });
    }
  }

  async unlockAndViewSeed() {
    this.errorMessage.set(null);

    if (!this.password) {
      this.errorMessage.set('Por favor, digite sua senha');
      return;
    }

    this.isUnlocking.set(true);

    try {
      // Create a temporary adapter instance to unlock and get the mnemonic
      const { EmbeddedWalletAdapter } = await import('../../libs/wallet/embedded-wallet.adapter');
      const tempAdapter = new EmbeddedWalletAdapter();
      const unlocked = await tempAdapter.unlock(this.password);

      if (!unlocked) {
        this.errorMessage.set('Senha incorreta. Tente novamente.');
        this.isUnlocking.set(false);
        return;
      }

      const mnemonic = tempAdapter.getMnemonic();
      if (mnemonic) {
        this.seedPhrase.set(mnemonic);
        this.seedWords.set(mnemonic.split(' '));
        this.seedPhraseVisible.set(true);
        this.password = ''; // Clear password
      } else {
        this.errorMessage.set('Não foi possível recuperar a frase de recuperação');
      }
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      this.errorMessage.set('Erro ao desbloquear a carteira. Tente novamente.');
    } finally {
      this.isUnlocking.set(false);
    }
  }

  hideSeedPhrase() {
    this.seedPhraseVisible.set(false);
    this.seedPhrase.set('');
    this.seedWords.set([]);
    this.password = '';
  }

  copySeedPhrase() {
    const phrase = this.seedPhrase();
    if (phrase) {
      navigator.clipboard.writeText(phrase).then(() => {
        this.seedCopied.set(true);
        setTimeout(() => {
          this.seedCopied.set(false);
        }, 3000);
      });
    }
  }

  confirmDeleteWallet() {
    this.showDeleteConfirmation.set(false);

    // Delete the wallet using the wallet manager service
    this.walletManager.deleteEmbeddedWallet();

    // Navigate to the landing page
    this.router.navigate(['/']);
  }
}
