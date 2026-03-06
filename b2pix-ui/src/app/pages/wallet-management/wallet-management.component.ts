import { Component, OnInit, signal, computed, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { WalletType, EncryptionMethod } from '../../libs/wallet/wallet.types';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { AccountInfo } from '../../shared/models/account-validation.model';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { StatusSheetComponent } from '../../components/status-sheet/status-sheet.component';

@Component({
  selector: 'app-wallet-management',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, StatusSheetComponent],
  templateUrl: './wallet-management.component.html',
  styleUrl: './wallet-management.component.scss'
})
export class WalletManagementComponent implements OnInit {
  private router = inject(Router);
  private walletManager = inject(WalletManagerService);
  private accountValidationService = inject(AccountValidationService);

  walletType = signal<WalletType | null>(null);
  walletAddress = signal<string>('');
  addressCopied = signal<boolean>(false);
  encryptionMethod = signal<EncryptionMethod | null>(null);
  isPasskeyWallet = computed(() => this.encryptionMethod() === EncryptionMethod.WEBAUTHN);

  // Seed phrase state
  password = '';
  seedPhraseUnlocked = signal<boolean>(false);
  seedWordsRevealed = signal<boolean>(false);
  seedPhrase = signal<string>('');
  seedWords = signal<string[]>([]);
  seedCopied = signal<boolean>(false);
  isUnlocking = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Bottom sheet visibility
  showSeedSheet = signal<boolean>(false);
  showDeleteSheet = signal<boolean>(false);

  // Advanced settings section
  showAdvancedSettings = signal<boolean>(false);

  // Delete confirmation
  deleteConfirmText = signal<string>('');
  isDeleteConfirmed = computed(() => this.deleteConfirmText() === 'EXCLUIR');

  // External wallet technical details
  showExternalTechDetails = signal<boolean>(false);

  // Account verification status
  accountInfo = signal<AccountInfo | null>(null);
  isLoadingAccountInfo = signal<boolean>(false);

  ngOnInit() {
    const type = this.walletManager.getWalletType();
    this.walletType.set(type);
    this.walletAddress.set(this.walletManager.getSTXAddress() || '');
    this.encryptionMethod.set(this.walletManager.getWalletEncryptionMethod());
    this.loadAccountInfo();
  }

  loadAccountInfo() {
    this.isLoadingAccountInfo.set(true);
    this.accountValidationService.getAccount().subscribe({
      next: (accountInfo) => {
        this.accountInfo.set(accountInfo);
        this.isLoadingAccountInfo.set(false);
      },
      error: (error) => {
        console.error('Error loading account info:', error);
        this.isLoadingAccountInfo.set(false);
      }
    });
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

  openSeedSheet() {
    this.errorMessage.set(null);
    this.password = '';
    this.seedPhraseUnlocked.set(false);
    this.seedWordsRevealed.set(false);
    this.seedPhrase.set('');
    this.seedWords.set([]);
    this.showSeedSheet.set(true);
  }

  closeSeedSheet() {
    this.showSeedSheet.set(false);
    this.seedPhraseUnlocked.set(false);
    this.seedWordsRevealed.set(false);
    this.seedPhrase.set('');
    this.seedWords.set([]);
    this.password = '';
    this.errorMessage.set(null);
    this.seedCopied.set(false);
  }

  async unlockAndViewSeed() {
    this.errorMessage.set(null);

    if (!this.isPasskeyWallet() && !this.password) {
      this.errorMessage.set('Por favor, digite sua senha');
      return;
    }

    this.isUnlocking.set(true);

    try {
      const { EmbeddedWalletAdapter } = await import('../../libs/wallet/embedded-wallet.adapter');
      const tempAdapter = new EmbeddedWalletAdapter();

      let unlocked: boolean;
      if (this.isPasskeyWallet()) {
        unlocked = await tempAdapter.unlockWithPasskey();
      } else {
        unlocked = await tempAdapter.unlock(this.password);
      }

      if (!unlocked) {
        this.errorMessage.set(
          this.isPasskeyWallet()
            ? 'Falha na autenticação com passkey. Tente novamente.'
            : 'Senha incorreta. Tente novamente.'
        );
        this.isUnlocking.set(false);
        return;
      }

      const mnemonic = tempAdapter.getMnemonic();
      if (mnemonic) {
        this.seedPhrase.set(mnemonic);
        this.seedWords.set(mnemonic.split(' '));
        this.seedPhraseUnlocked.set(true);
        this.seedWordsRevealed.set(false);
        this.password = '';
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

  toggleSeedReveal() {
    this.seedWordsRevealed.update(v => !v);
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

  openDeleteSheet() {
    this.deleteConfirmText.set('');
    this.showDeleteSheet.set(true);
  }

  closeDeleteSheet() {
    this.showDeleteSheet.set(false);
    this.deleteConfirmText.set('');
  }

  confirmDeleteWallet() {
    if (!this.isDeleteConfirmed()) return;

    this.showDeleteSheet.set(false);
    this.walletManager.deleteEmbeddedWallet();
    this.router.navigate(['/']);
  }

  navigateToEmailVerification() {
    this.router.navigate(['/email-validation']);
  }

  navigateToPixVerification() {
    this.router.navigate(['/pix-validation']);
  }

  truncateAddress(address: string): string {
    if (!address || address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  }
}
