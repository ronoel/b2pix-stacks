import { Component, OnInit, OnDestroy, signal, inject, ViewEncapsulation } from '@angular/core';

import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { WalletType } from '../../libs/wallet/wallet.types';
import { environment } from '../../../environments/environment';
import { sBTCTokenService } from '../../libs/sbtc-token.service';
import { QuoteService } from '../../shared/api/quote.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { AccountInfo } from '../../shared/models/account-validation.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private userService = inject(UserService);
  private walletManagerService = inject(WalletManagerService);
  private sBTCTokenService = inject(sBTCTokenService);
  private quoteService = inject(QuoteService);
  private accountValidationService = inject(AccountValidationService);

  // Receive modal states
  showReceiveModal = signal<boolean>(false);
  walletAddress = signal<string>('');
  addressCopied = signal<boolean>(false);

  // sBTC balance
  sBtcBalance = signal<number>(0);
  isLoadingBalance = signal<boolean>(false);
  btcPriceInCents = signal<number>(0);

  // Account validation status
  validationStatus = signal<AccountInfo | null>(null);

  ngOnInit() {
    this.walletAddress.set(this.walletManagerService.getSTXAddress() || '');
    this.loadBalance();
    this.loadBtcPrice();
    this.loadValidationStatus();
  }

  ngOnDestroy() {
    // Component cleanup
  }

  loadBalance() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      // Only show loading spinner if there's no balance loaded yet
      const hasExistingBalance = this.sBtcBalance() !== 0;
      if (!hasExistingBalance) {
        this.isLoadingBalance.set(true);
      }

      this.sBTCTokenService.getBalance().subscribe({
        next: (balance) => {
          this.sBtcBalance.set(balance);
          this.isLoadingBalance.set(false);
        },
        error: (error) => {
          console.error('Error fetching sBTC balance:', error);
          this.isLoadingBalance.set(false);
        }
      });
    }
  }

  loadBtcPrice() {
    this.quoteService.getBtcPrice().subscribe({
      next: (response) => {
        this.btcPriceInCents.set(parseInt(response.price));
      },
      error: (error) => {
        console.error('Error fetching BTC price:', error);
      }
    });
  }

  formatBalanceInBRL(): string {
    const balanceInSats = Number(this.sBtcBalance());
    const priceInCents = this.btcPriceInCents();

    if (balanceInSats === 0 || priceInCents === 0) {
      return 'R$ 0,00';
    }

    // Convert satoshis to BTC (1 BTC = 100,000,000 sats)
    const balanceInBTC = balanceInSats / 100000000;

    // Price is in cents, so convert to reais (divide by 100)
    const priceInReais = priceInCents / 100;

    // Calculate total value in BRL
    const valueInBRL = balanceInBTC * priceInReais;

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valueInBRL);
  }

  currentUser = this.userService.currentUser;
  currentBtcPrice = this.userService.currentBtcPrice;

  logout() {
    this.userService.logout();
    this.router.navigate(['/']);
  }

  goToBuy() {
    this.router.navigate(['/buy']);
  }

  goToSell() {
    this.router.navigate(['/sell']);
  }

  goToPixPayment() {
    this.router.navigate(['/pix-payment']);
  }

  goToDisputeManagement() {
    this.router.navigate(['/order-analysis']);
  }

  goToPaymentRequests() {
    this.router.navigate(['/payment-requests']);
  }

  goToPixModeration() {
    this.router.navigate(['/pix-moderation']);
  }

  goToSendBitcoin() {
    this.router.navigate(['/send/sBTC']);
  }

  goToWalletManagement() {
    this.router.navigate(['/wallet']);
  }

  goToBtcToSbtc() {
    this.router.navigate(['/btc-to-sbtc']);
  }

  goToSbtcToBtc() {
    this.router.navigate(['/sbtc-to-btc']);
  }

  isManager(): boolean {
    const currentAddress = this.walletManagerService.getSTXAddress();
    return currentAddress === environment.b2pixAddress;
  }

  isLp(): boolean {
    return this.validationStatus()?.is_lp === true;
  }

  goToLpDashboard() {
    this.router.navigate(['/lp-dashboard']);
  }

  goToLpRegister() {
    this.router.navigate(['/lp-register']);
  }

  isEmbeddedWallet(): boolean {
    return this.walletManagerService.getWalletType() === WalletType.EMBEDDED;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatBRLCurrency(valueInCents: string | number): string {
    const value = typeof valueInCents === 'string' ? parseInt(valueInCents) : valueInCents;
    const valueInReais = value / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valueInReais);
  }

  formatSatoshisToBTC(satoshis: string | number): string {
    const sats = typeof satoshis === 'string' ? parseInt(satoshis) : satoshis;
    const btc = sats / 100000000; // Convert satoshis to BTC
    return btc.toFixed(8);
  }

  formatSats(amount: string): string {
    return new Intl.NumberFormat('pt-BR').format(Number(amount));
  }

  // Receive Bitcoin modal methods
  openReceiveBitcoinModal() {
    this.showReceiveModal.set(true);
    this.addressCopied.set(false);
  }

  closeReceiveBitcoinModal() {
    this.showReceiveModal.set(false);
    this.addressCopied.set(false);
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

  // Account validation methods
  loadValidationStatus() {
    this.accountValidationService.getAccount().subscribe({
      next: (account) => {
        this.validationStatus.set(account);
      },
      error: (error) => {
        console.error('Error loading validation status:', error);
      }
    });
  }

  isFullyValidated(): boolean {
    const status = this.validationStatus();
    return status?.email_verified && status?.pix_verified || false;
  }

  getValidationMessage(): string {
    const status = this.validationStatus();
    if (!status) return '';

    if (!status.email_verified) {
      return 'Valide seu email para começar a usar a plataforma';
    }

    if (!status.pix_verified) {
      return 'Valide sua conta bancária com um depósito de confirmação';
    }

    return '';
  }

  goToValidation(): void {
    const status = this.validationStatus();
    if (!status?.email_verified) {
      this.router.navigate(['/email-validation']);
    } else {
      this.router.navigate(['/pix-validation']);
    }
  }

}
