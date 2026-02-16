import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { WalletType } from '../../libs/wallet/wallet.types';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { AccountInfo } from '../../shared/models/account-validation.model';

@Component({
  selector: 'app-wallet-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  password = '';
  seedPhraseVisible = signal<boolean>(false);
  seedPhrase = signal<string>('');
  seedWords = signal<string[]>([]);
  seedCopied = signal<boolean>(false);
  isUnlocking = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  showDeleteConfirmation = signal<boolean>(false);

  // Account verification status
  accountInfo = signal<AccountInfo | null>(null);
  isLoadingAccountInfo = signal<boolean>(false);

  ngOnInit() {
    const type = this.walletManager.getWalletType();
    this.walletType.set(type);
    this.walletAddress.set(this.walletManager.getSTXAddress() || '');
    this.loadAccountInfo();
  }

  loadAccountInfo() {
    this.isLoadingAccountInfo.set(true);
    console.log('Loading account info...');
    this.accountValidationService.getAccount().subscribe({
      next: (accountInfo) => {
        console.log('Account info loaded:', accountInfo);
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

  navigateToEmailVerification() {
    // TODO: Implementar navegação para página de verificação de email
    console.log('Navigate to email verification');
  }

  navigateToPixVerification() {
    // TODO: Implementar navegação para página de verificação de PIX
    console.log('Navigate to PIX verification');
  }
}
