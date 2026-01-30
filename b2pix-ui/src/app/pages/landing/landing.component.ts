import { Component, inject, effect, ViewEncapsulation, signal } from '@angular/core';

import { Router } from '@angular/router';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
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
                A forma mais simples e segura de comprar Bitcoin no Brasil.
                Sem custódia, sem intermediários, 100% automatizado.
              </p>
            </div>

            <!-- Features Section -->
            <div class="features-section">
              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="feature-content">
                  <h3 class="feature-title">P2P Direto</h3>
                  <p class="feature-description">Compre e venda diretamente de outros usuários, sem intermediários ou corretoras</p>
                </div>
              </div>

              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="feature-content">
                  <h3 class="feature-title">Sem Custódia</h3>
                  <p class="feature-description">Seus Bitcoins ficam na sua carteira, você tem controle total dos seus fundos</p>
                </div>
              </div>

              <div class="feature-card">
                <div class="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="feature-content">
                  <h3 class="feature-title">100% Automático</h3>
                  <p class="feature-description">Pagamento verificado automaticamente, Bitcoin liberado instantaneamente</p>
                </div>
              </div>
            </div>

            <!-- CTA Button -->
            <div class="cta-section">
              @if(walletManager.isLoggedInSignal()) {
                <button class="btn btn-primary btn-large" (click)="accessDashboard()">
                  Acessar Plataforma
                </button>
              } @else {
                @if (hasEmbeddedWallet()) {
                  <button class="btn btn-primary btn-large" (click)="unlockEmbeddedWallet()">
                    Desbloquear Carteira
                  </button>
                } @else {
                  <button class="btn btn-primary btn-large" (click)="showWalletSelection()">
                    Começar Agora
                  </button>
                }
              }

              <p class="cta-note">Comece em menos de 1 minuto</p>
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

    /* Features Section */
    .features-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 48px;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }

    .feature-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px 16px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 16px;
      border: 1px solid #E5E7EB;
    }

    .feature-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
      border-radius: 12px;
      color: #1E40AF;
      margin-bottom: 16px;
    }

    .feature-icon svg {
      width: 24px;
      height: 24px;
    }

    .feature-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .feature-title {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .feature-description {
      font-size: 13px;
      color: #6B7280;
      line-height: 1.5;
      margin: 0;
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

      .features-section {
        grid-template-columns: 1fr;
        gap: 16px;
        max-width: 400px;
      }

      .feature-card {
        flex-direction: row;
        text-align: left;
        padding: 20px;
        gap: 16px;
      }

      .feature-icon {
        margin-bottom: 0;
        flex-shrink: 0;
      }

      .feature-content {
        gap: 4px;
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
  walletManager = inject(WalletManagerService);
  private connectWalletClicked = false;
  public isLoggedIn = this.walletManager.isLoggedInSignal();

  // UI state signals
  showSelectionModal = signal(false);
  showEmbeddedCreate = signal(false);
  showEmbeddedUnlock = signal(false);
  showEmbeddedImport = signal(false);

  constructor() {
    effect(() => {
      // Redirect to dashboard after wallet connection
      if (this.walletManager.isLoggedInSignal() && this.connectWalletClicked) {
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
      this.walletManager.connectExternalWallet();
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
    alert('Carteira excluída com sucesso!');
  }
}
