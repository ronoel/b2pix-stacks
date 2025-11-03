import { Component, inject, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { WalletService } from '../../libs/wallet.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { WalletSelectionModalComponent, WalletSelectionType } from '../wallet-selection-modal/wallet-selection-modal.component';
import { EmbeddedWalletCreateComponent } from '../embedded-wallet-create/embedded-wallet-create.component';
import { EmbeddedWalletUnlockComponent } from '../embedded-wallet-unlock/embedded-wallet-unlock.component';
import { EmbeddedWalletImportComponent } from '../embedded-wallet-import/embedded-wallet-import.component';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    WalletSelectionModalComponent,
    EmbeddedWalletCreateComponent,
    EmbeddedWalletUnlockComponent,
    EmbeddedWalletImportComponent
  ],
  encapsulation: ViewEncapsulation.None,
  template: `
    <header class="toolbar" role="banner">
      <div class="container">
        <nav class="toolbar-nav" aria-label="Main navigation">
          <div class="toolbar-left">
            <a class="toolbar-logo" routerLink="/" aria-label="B2Pix - Voltar ao início">
              <div class="logo-icon">
                <img src="images/logo-512px-t.png" alt="B2Pix Logo" width="40" height="40" class="logo-image">
              </div>
              <div class="logo-text">
                <span class="brand-name">B2Pix</span>
                <span class="brand-subtitle">P2P Bitcoin</span>
              </div>
            </a>
          </div>
          
          <div class="toolbar-right">
            @if (walletService.isLoggedInSignal()) {
              <!-- Wallet Connected State -->
              <div class="wallet-connected">
                <div class="wallet-info">
                  <div class="connection-status">
                    <div class="status-dot"></div>
                    <span class="status-text">Conectado</span>
                  </div>
                  <div class="wallet-address" title="{{ walletService.walletAddressSignal() }}">
                    {{ walletService.walletAddressSignal() ? (walletService.walletAddressSignal() | slice:0:4 ) + '...' + (walletService.walletAddressSignal() | slice:-4 ) : '' }}
                  </div>
                </div>
                <button class="btn btn-ghost disconnect-btn" (click)="disconnect()" aria-label="Desconectar Wallet">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  <span class="btn-text">Sair</span>
                </button>
              </div>
            } @else {
              <!-- Wallet Disconnected State -->
              <div class="wallet-disconnected">
                @if (hasEmbeddedWallet()) {
                  <button class="btn btn-primary connect-btn" (click)="unlockEmbeddedWallet()" aria-label="Desbloquear Carteira">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="btn-text">Desbloquear Carteira</span>
                  </button>
                  <div class="connection-hint">
                    <span>Carteira B2PIX Integrada</span>
                  </div>
                } @else {
                  <button class="btn btn-primary connect-btn" (click)="showWalletSelection()" aria-label="Conectar ou Criar Carteira">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
                      <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="btn-text">Conectar/Criar Carteira</span>
                  </button>
                  <div class="connection-hint">
                    <span>Escolha sua carteira preferida</span>
                  </div>
                }
              </div>
            }
          </div>
        </nav>
      </div>
    </header>

    <!-- Wallet Selection Modal -->
    @if (showSelectionModal()) {
      <app-wallet-selection-modal
        (walletSelected)="onWalletSelected($event)"
        (cancelled)="onCancelWalletFlow()">
      </app-wallet-selection-modal>
    }

    <!-- Embedded Wallet Modals -->
    @if (showEmbeddedCreate()) {
      <div class="modal-overlay">
        <app-embedded-wallet-create
          (walletCreated)="onEmbeddedWalletCreated()"
          (cancelled)="onCancelWalletFlow()">
        </app-embedded-wallet-create>
      </div>
    }

    @if (showEmbeddedUnlock()) {
      <div class="modal-overlay">
        <app-embedded-wallet-unlock
          (walletUnlocked)="onEmbeddedWalletUnlocked()"
          (cancelled)="onCancelWalletFlow()"
          (forgotPassword)="onForgotPassword()"
          (walletDeleted)="onWalletDeleted()">
        </app-embedded-wallet-unlock>
      </div>
    }

    @if (showEmbeddedImport()) {
      <div class="modal-overlay">
        <app-embedded-wallet-import
          (walletImported)="onEmbeddedWalletImported()"
          (cancelled)="onCancelWalletFlow()">
        </app-embedded-wallet-import>
      </div>
    }
  `,
  styles: [`

    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 var(--spacing-4);
    }

    /* Main Toolbar */
    .toolbar {
      width: 100%;
      background: var(--background-card);
      border-bottom: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      position: sticky;
      top: 0;
      z-index: 1000;
      backdrop-filter: blur(8px);
    }

    .toolbar-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-4) 0;
      min-height: 80px;
    }

    /* Logo Section */
    .toolbar-left {
      display: flex;
      align-items: center;
    }

    .toolbar-logo {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
      text-decoration: none;
      transition: all var(--transition-normal);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-2);
    }

    .toolbar-logo:hover {
      background: var(--background-elevated);
      transform: translateY(-1px);
    }

    .logo-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-image {
      border-radius: var(--border-radius-md);
    }

    .logo-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
      line-height: 1.2;
    }

    .brand-subtitle {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--text-muted);
      line-height: 1;
      margin-top: -2px;
    }

    /* Wallet Section */
    .toolbar-right {
      display: flex;
      align-items: center;
    }

    /* Wallet Connected State */
    .wallet-connected {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
    }

    .wallet-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: var(--spacing-1);
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: var(--spacing-1_5);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--success-green);
      border-radius: var(--border-radius-full);
      animation: pulse 2s infinite;
    }

    .status-text {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--text-success);
    }

    .wallet-address {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--text-secondary);
      background: var(--background-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-1_5) var(--spacing-3);
      min-width: 100px;
      text-align: center;
      transition: all var(--transition-normal);
    }

    .wallet-address:hover {
      background: var(--background-accent);
      border-color: var(--primary-trust-blue-light);
      color: var(--primary-trust-blue);
    }

    /* Wallet Disconnected State */
    .wallet-disconnected {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: var(--spacing-1);
    }

    .connect-btn {
      white-space: nowrap;
    }

    .connection-hint {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      text-align: right;
    }

    /* Button Styles - Following the design system */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-2);
      padding: var(--spacing-2_5) var(--spacing-4);
      border-radius: var(--border-radius-md);
      border: 1px solid transparent;
      font-family: var(--font-family-primary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      text-decoration: none;
      cursor: pointer;
      transition: all var(--transition-normal);
      white-space: nowrap;
    }

    .btn-primary {
      background: var(--gradient-trust-blue);
      color: var(--text-inverse);
      border-color: var(--primary-trust-blue);
      box-shadow: var(--shadow-trust);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-trust-blue-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow-lg);
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-secondary);
      border-color: transparent;
    }

    .btn-ghost:hover:not(:disabled) {
      background: var(--background-elevated);
      color: var(--text-primary);
    }

    .btn:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    /* Animations */
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .toolbar-nav {
        padding: var(--spacing-3) 0;
        min-height: 70px;
      }

      .brand-name {
        font-size: var(--font-size-lg);
      }

      .brand-subtitle {
        display: none;
      }

      .wallet-info {
        align-items: center;
      }

      .connection-status {
        display: none;
      }

      .wallet-address {
        font-size: var(--font-size-xs);
        min-width: 80px;
        padding: var(--spacing-1) var(--spacing-2);
      }

      .btn-text {
        display: none;
      }

      .btn {
        padding: var(--spacing-2);
        min-width: auto;
      }

      .connection-hint {
        display: none;
      }

      .wallet-connected {
        gap: var(--spacing-2);
      }
    }

    @media (max-width: 480px) {
      .container {
        padding: 0 var(--spacing-3);
      }

      .toolbar-logo {
        gap: var(--spacing-2);
        padding: var(--spacing-1);
      }

      .logo-image {
        width: 32px;
        height: 32px;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .toolbar {
        border-bottom-width: 2px;
      }

      .trust-badge {
        border-width: 2px;
      }

      .btn {
        border-width: 2px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .toolbar-logo,
      .wallet-address,
      .btn {
        transition: none;
      }

      .status-dot {
        animation: none;
      }
    }

    /* Modal Overlay */
    .modal-overlay {
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
      z-index: 10001;
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
  `]
})
export class ToolbarComponent {
  walletService = inject(WalletService);
  private walletManager = inject(WalletManagerService);
  private router = inject(Router);

  // UI state signals
  showSelectionModal = signal(false);
  showEmbeddedCreate = signal(false);
  showEmbeddedUnlock = signal(false);
  showEmbeddedImport = signal(false);

  hasEmbeddedWallet(): boolean {
    return this.walletManager.hasEmbeddedWallet();
  }

  showWalletSelection() {
    this.showSelectionModal.set(true);
  }

  unlockEmbeddedWallet() {
    this.showEmbeddedUnlock.set(true);
  }

  disconnect() {
    this.walletService.signOut();
  }

  onWalletSelected(type: WalletSelectionType) {
    this.showSelectionModal.set(false);

    if (type === 'external') {
      // Connect external wallet (Leather, Xverse, etc.)
      this.walletService.signIn();
    } else if (type === 'create') {
      // Show create screen
      this.showEmbeddedCreate.set(true);
    } else if (type === 'import') {
      // Show import screen
      this.showEmbeddedImport.set(true);
    }
  }

  onEmbeddedWalletCreated() {
    this.showEmbeddedCreate.set(false);
    // Wallet is already connected after creation, redirect to dashboard
    this.router.navigate(['/dashboard']);
  }

  onEmbeddedWalletUnlocked() {
    this.showEmbeddedUnlock.set(false);
    // Wallet is now unlocked, redirect to dashboard
    this.router.navigate(['/dashboard']);
  }

  onEmbeddedWalletImported() {
    this.showEmbeddedImport.set(false);
    // Wallet is already connected after import, redirect to dashboard
    this.router.navigate(['/dashboard']);
  }

  onCancelWalletFlow() {
    this.showSelectionModal.set(false);
    this.showEmbeddedCreate.set(false);
    this.showEmbeddedUnlock.set(false);
    this.showEmbeddedImport.set(false);
  }

  onForgotPassword() {
    this.showEmbeddedUnlock.set(false);
    alert('Se você esqueceu sua senha, você precisará importar sua carteira usando a frase de recuperação (seed phrase) de 24 palavras. Por favor, entre em contato com o suporte para mais informações.');
  }

  onWalletDeleted() {
    // Delete the embedded wallet from storage
    this.walletManager.deleteEmbeddedWallet();

    // Close the unlock modal
    this.showEmbeddedUnlock.set(false);

    // Show success message
    alert('Carteira excluída com sucesso! Você pode criar uma nova carteira agora.');

    // Automatically show the create wallet screen
    this.showEmbeddedCreate.set(true);
  }
} 