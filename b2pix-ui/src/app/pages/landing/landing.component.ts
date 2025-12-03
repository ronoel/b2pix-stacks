import { Component, inject, effect, ViewEncapsulation, signal } from '@angular/core';

import { Router } from '@angular/router';
import { WalletService } from '../../libs/wallet.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { LandingFeaturesComponent } from './components/features.component';
import { HowItWorksComponent } from './components/how-it-works.component';
import { TrustSectionComponent } from './components/trust-section.component';
import { SocialSectionComponent } from './components/social-section.component';
import { WalletSelectionModalComponent, WalletSelectionType } from '../../components/wallet-selection-modal/wallet-selection-modal.component';
import { EmbeddedWalletCreateComponent } from '../../components/embedded-wallet-create/embedded-wallet-create.component';
import { EmbeddedWalletUnlockComponent } from '../../components/embedded-wallet-unlock/embedded-wallet-unlock.component';
import { EmbeddedWalletImportComponent } from '../../components/embedded-wallet-import/embedded-wallet-import.component';

@Component({
  selector: 'app-landing',
  imports: [
    LandingFeaturesComponent,
    HowItWorksComponent,
    TrustSectionComponent,
    SocialSectionComponent,
    WalletSelectionModalComponent,
    EmbeddedWalletCreateComponent,
    EmbeddedWalletUnlockComponent,
    EmbeddedWalletImportComponent
],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="landing-page">
      <div class="hero-section">
        <div class="container">
          <div class="hero-content">
            <!-- Logo -->
            <div class="logo-section">
              <div class="logo">
                <div class="logo-icon">
                  <img src="images/logo-512px-t.png" alt="B2Pix Logo" width="48" height="48" class="logo-image">
                </div>
                <h1 class="logo-text">B2Pix</h1>
              </div>
              <p class="logo-subtitle">P2P Bitcoin com PIX</p>
            </div>

            <!-- Hero Text -->
            <div class="hero-text">
              <h2 class="hero-title">
                Compre e venda <span class="text-gradient">Bitcoin</span> com PIX
              </h2>
              <p class="hero-description">
                Plataforma P2P sem custódia, focada em privacidade e automação.
                Acesso exclusivo por convite.
              </p>
            </div>

            <!-- Features Component -->
            <app-landing-features />

            <!-- Waiting List Section -->
            <div class="waiting-list-section">
              <div class="waiting-list-card">
                <h3 class="waiting-list-title">Ainda não tem um convite?</h3>
                <p class="waiting-list-description">Entre na lista de espera e aguarde o próximo lote.</p>
                <a href="https://forms.gle/sfiQjCAY6BkTqkWg6" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-large">
                  Entrar na Lista de Espera
                </a>
              </div>
            </div>

            <!-- CTA Button -->
            <div class="cta-section">
              @if(walletService.isLoggedInSignal()) {
                <button class="btn btn-primary btn-large" (click)="accessDashboard()">
                  Entrar
                </button>
              } @else {
                @if (hasEmbeddedWallet()) {
                  <button class="btn btn-primary btn-large" (click)="unlockEmbeddedWallet()">
                    Desbloquear Carteira
                  </button>
                } @else {
                  <button class="btn btn-primary btn-large" (click)="showWalletSelection()">
                    Conectar/Criar Carteira
                  </button>
                }
              }

              <p class="cta-note">Acesso exclusivo por convite</p>
            </div>

            <!-- Social Media Component -->
            <app-social-section />
          </div>
        </div>
      </div>

      <!-- How It Works Component -->
      <app-how-it-works />

      <!-- Trust Section Component -->
      <app-trust-section />

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

      <!-- Background Elements -->
      <div class="bg-elements">
        <div class="bg-circle bg-circle-1"></div>
        <div class="bg-circle bg-circle-2"></div>
        <div class="bg-circle bg-circle-3"></div>
      </div>
    </div>
  `,
  styles: [`
    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px;
    }

    /* Common Button Styles */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #1E40AF;
      color: white;
      border-color: #1E40AF;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1D4ED8;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px 0 rgb(30 64 175 / 0.4);
    }

    .btn-secondary {
      background: #6B7280;
      color: white;
      border-color: #6B7280;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #4B5563;
      transform: translateY(-1px);
    }

    .btn-large {
      padding: 16px 32px;
      font-size: 16px;
      min-width: 200px;
    }

    .landing-page {
      min-height: 100vh;
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%);
    }

    .hero-section {
      min-height: 100vh;
      display: flex;
      align-items: center;
      position: relative;
      z-index: 2;
    }

    .hero-content {
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
      padding: 48px 0;
    }

    /* Logo Section */
    .logo-section {
      margin-bottom: 48px;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .logo-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-image {
      border-radius: 12px;
    }

    .logo-text {
      font-size: 36px;
      font-weight: 700;
      color: #1b3959;
      margin: 0;
    }

    .logo-subtitle {
      font-size: 18px;
      color: #6B7280;
      font-weight: 400;
      margin: 0;
    }

    .text-gradient {
      background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Hero Text */
    .hero-text {
      margin-bottom: 48px;
    }

    .hero-title {
      font-size: 36px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 24px;
      line-height: 1.2;
    }

    .hero-description {
      font-size: 18px;
      color: #6B7280;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
    }

    /* CTA Section */
    .cta-section {
      margin-bottom: 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .cta-note {
      margin-top: 16px;
      color: #9CA3AF;
      font-size: 14px;
    }

    /* Waiting List Section */
    .waiting-list-section {
      margin-bottom: 48px;
      display: flex;
      justify-content: center;
    }

    .waiting-list-card {
      background: linear-gradient(135deg, #EFF6FF 0%, #FEF3C7 100%);
      border: 2px solid #FBBF24;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      max-width: 500px;
      box-shadow: 0 8px 16px -4px rgb(251 191 36 / 0.3);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .waiting-list-card::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      animation: shimmer 3s infinite;
    }

    @keyframes shimmer {
      0% {
        transform: translateX(-100%) translateY(-100%) rotate(45deg);
      }
      100% {
        transform: translateX(100%) translateY(100%) rotate(45deg);
      }
    }

    .waiting-list-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px -6px rgb(251 191 36 / 0.4);
      border-color: #F59E0B;
    }

    .waiting-list-title {
      font-size: 20px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 12px 0;
      position: relative;
      z-index: 1;
    }

    .waiting-list-description {
      font-size: 16px;
      color: #4B5563;
      margin: 0 0 24px 0;
      line-height: 1.6;
      position: relative;
      z-index: 1;
    }

    .waiting-list-card .btn-secondary {
      background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
      color: white;
      border: none;
      font-weight: 700;
      box-shadow: 0 4px 12px 0 rgb(245 158 11 / 0.4);
      position: relative;
      z-index: 1;
    }

    .waiting-list-card .btn-secondary:hover:not(:disabled) {
      background: linear-gradient(135deg, #D97706 0%, #EA580C 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px 0 rgb(245 158 11 / 0.5);
    }

    /* Background Elements */
    .bg-elements {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: none;
    }

    .bg-circle {
      position: absolute;
      border-radius: 50%;
      background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
      opacity: 0.1;
      filter: blur(40px);
    }

    .bg-circle-1 {
      width: 300px;
      height: 300px;
      top: 10%;
      left: 10%;
      animation: float 6s ease-in-out infinite;
    }

    .bg-circle-2 {
      width: 200px;
      height: 200px;
      top: 60%;
      right: 15%;
      background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
      animation: float 8s ease-in-out infinite reverse;
    }

    .bg-circle-3 {
      width: 150px;
      height: 150px;
      bottom: 20%;
      left: 20%;
      background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
      animation: float 7s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-20px);
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .container {
        padding: 0 12px;
      }

      .hero-content {
        padding: 32px 0;
      }

      .logo-text {
        font-size: 30px;
      }

      .hero-title {
        font-size: 30px;
      }

      .hero-description {
        font-size: 16px;
      }

      .bg-circle-1 {
        width: 200px;
        height: 200px;
      }

      .bg-circle-2 {
        width: 150px;
        height: 150px;
      }

      .bg-circle-3 {
        width: 100px;
        height: 100px;
      }
    }

    @media (max-width: 480px) {
      .logo {
        flex-direction: column;
        gap: 12px;
      }

      .landing-page .logo-image {
        width: 82px !important;
        height: 82px !important;
      }

      .btn-large {
        width: 100%;
        max-width: 300px;
      }

      .cta-section {
        flex-direction: column;
        gap: 12px;
      }

      .waiting-list-card {
        padding: 24px;
      }

      .waiting-list-title {
        font-size: 18px;
      }

      .waiting-list-description {
        font-size: 14px;
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
      z-index: 9999;
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
export class LandingComponent {
  private router = inject(Router);
  walletService = inject(WalletService);
  private walletManager = inject(WalletManagerService);
  private connectWalletClicked = false;
  public isLoggedIn = this.walletService.isLoggedInSignal();

  // UI state signals
  showSelectionModal = signal(false);
  showEmbeddedCreate = signal(false);
  showEmbeddedUnlock = signal(false);
  showEmbeddedImport = signal(false);

  constructor() {
    effect(() => {
      // Only redirect if user just connected wallet and has a claimed invite
      if (this.walletService.isLoggedInSignal() && this.connectWalletClicked) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  accessDashboard() {
    this.router.navigate(['/dashboard']);
  }

  hasEmbeddedWallet(): boolean {
    return this.walletManager.hasEmbeddedWallet();
  }

  showWalletSelection() {
    this.showSelectionModal.set(true);
  }

  unlockEmbeddedWallet() {
    this.showEmbeddedUnlock.set(true);
  }

  onWalletSelected(type: WalletSelectionType) {
    this.showSelectionModal.set(false);

    if (type === 'external') {
      // Connect external wallet (Leather, Xverse, etc.)
      this.connectWalletClicked = true;
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
    this.connectWalletClicked = true;
    // Wallet is already connected after creation, redirect to dashboard
    this.router.navigate(['/dashboard']);
  }

  onEmbeddedWalletUnlocked() {
    this.showEmbeddedUnlock.set(false);
    this.connectWalletClicked = true;
    // Wallet is now unlocked, redirect to dashboard
    this.router.navigate(['/dashboard']);
  }

  onEmbeddedWalletImported() {
    this.showEmbeddedImport.set(false);
    this.connectWalletClicked = true;
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
