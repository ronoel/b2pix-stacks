import { Component, inject, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { PwaInstallService } from '../../services/pwa-install.service';
import { HowItWorksComponent } from './components/how-it-works.component';
import { TrustSectionComponent } from './components/trust-section.component';
import { SocialSectionComponent } from './components/social-section.component';
import { InstallSectionComponent } from './components/install-section.component';
import { UseCasesComponent } from './components/use-cases.component';
import { PrivacySectionComponent } from './components/privacy-section.component';
import { FaqSectionComponent } from './components/faq-section.component';
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
    InstallSectionComponent,
    UseCasesComponent,
    PrivacySectionComponent,
    FaqSectionComponent,
    WalletSelectionModalComponent,
    EmbeddedWalletCreateComponent,
    EmbeddedWalletUnlockComponent,
    EmbeddedWalletImportComponent
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  private router = inject(Router);
  walletManager = inject(WalletManagerService);
  pwaService = inject(PwaInstallService);
  private connectWalletClicked = false;

  // UI state signals
  showSelectionModal = signal(false);
  showEmbeddedCreate = signal(false);
  showEmbeddedUnlock = signal(false);
  showEmbeddedImport = signal(false);

  constructor() {
    effect(() => {
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
      this.connectWalletClicked = true;
      this.walletManager.connectExternalWallet();
    } else if (type === 'create') {
      this.showEmbeddedCreate.set(true);
    } else if (type === 'import') {
      this.showEmbeddedImport.set(true);
    }
  }

  onEmbeddedWalletCreated() {
    this.showEmbeddedCreate.set(false);
    this.connectWalletClicked = true;
    setTimeout(() => this.router.navigate(['/dashboard']), 200);
  }

  onEmbeddedWalletUnlocked() {
    this.showEmbeddedUnlock.set(false);
    this.connectWalletClicked = true;
    setTimeout(() => this.router.navigate(['/dashboard']), 200);
  }

  onEmbeddedWalletImported() {
    this.showEmbeddedImport.set(false);
    this.connectWalletClicked = true;
    setTimeout(() => this.router.navigate(['/dashboard']), 200);
  }

  onCancelWalletFlow() {
    this.showSelectionModal.set(false);
    this.showEmbeddedCreate.set(false);
    this.showEmbeddedUnlock.set(false);
    this.showEmbeddedImport.set(false);
  }

  onForgotPassword() {
    this.showEmbeddedUnlock.set(false);
    this.showEmbeddedImport.set(true);
  }

  onWalletDeleted() {
    this.walletManager.deleteEmbeddedWallet();
    this.showEmbeddedUnlock.set(false);
  }
}
