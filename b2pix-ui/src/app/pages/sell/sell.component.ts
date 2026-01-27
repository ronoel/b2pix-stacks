import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { SellOrderService } from '../../shared/api/sell-order.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { sBTCTokenService } from '../../libs/sbtc-token.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { AccountInfo } from '../../shared/models/account-validation.model';
import {
  SellOrder,
  SellOrderStatus,
  getStatusLabel as getSellOrderStatusLabel,
  getStatusClass as getSellOrderStatusClass
} from '../../shared/models/sell-order.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sell.component.html',
  styleUrls: ['./sell.component.scss']
})
export class SellComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  protected loadingService = inject(LoadingService);
  private sellOrderService = inject(SellOrderService);
  private accountValidationService = inject(AccountValidationService);
  private sBTCTokenService = inject(sBTCTokenService);
  private walletManagerService = inject(WalletManagerService);

  // Constants
  readonly SATS_PER_BTC = 100000000;
  readonly MIN_SELL_BRL = 50;  // R$ 50,00 displayed minimum
  readonly MAX_SELL_BRL = 200; // R$ 200,00 displayed limit
  readonly MIN_SELL_BRL_VALIDATION = 45;  // R$ 45,00 actual validation minimum (allows price fluctuation)
  readonly MAX_SELL_BRL_VALIDATION = 210; // R$ 210,00 actual validation limit (allows price fluctuation)
  readonly QUICK_AMOUNTS_BRL = [50, 100, 150, 200];

  // Account validation
  accountInfo = signal<AccountInfo | null>(null);

  // Balance and pricing
  sBtcBalance = signal<number>(0);
  isLoadingBalance = signal(false);
  currentBtcPrice = signal(0); // Price in BRL
  isLoadingQuote = signal(true);
  private priceSubscription?: Subscription;

  // Amount input
  amountInSats = signal<number>(0);
  amountInBrl = signal<number>(0);
  inputMode = signal<'sats' | 'brl'>('brl'); // Default to BRL mode
  selectedQuickAmount = signal<number>(0);

  // Sell orders
  sellOrders = signal<SellOrder[]>([]);
  activeSellOrder = signal<SellOrder | null>(null);
  isLoadingHistory = signal(false);
  isLoadingMore = signal(false);
  hasMoreOrders = signal(false);
  currentPage = signal(1);

  // Modal states
  showConfirmationModal = signal(false);
  showSuccessModal = signal(false);
  showErrorModal = signal(false);
  errorMessage = signal('');
  createdOrderId = signal<string | null>(null);

  // Processing state
  isProcessing = signal(false);

  // Network fee
  fee = computed(() => this.sellOrderService.getFee());

  // Expose Number for template
  Number = Number;

  ngOnInit() {
    this.loadAccountValidation();
    this.loadBalance();
    this.startPricePolling();
    this.loadSellOrders();
    this.checkForActiveSellOrder();
  }

  ngOnDestroy() {
    if (this.priceSubscription) {
      this.priceSubscription.unsubscribe();
    }
  }

  // Account validation methods
  loadAccountValidation() {
    this.accountValidationService.getAccount().subscribe({
      next: (account) => {
        this.accountInfo.set(account);
      },
      error: (error) => {
        console.error('Error loading account:', error);
      }
    });
  }

  isAccountValidated(): boolean {
    const account = this.accountInfo();
    if (!account) return false;
    return account.pix_verified;
  }

  getValidationRequiredMessage(): string {
    const account = this.accountInfo();
    if (!account) {
      return 'Para vender Bitcoin, você precisa validar seu email e conta bancária.';
    }

    if (!account.email_verified) {
      return 'Para vender Bitcoin, você precisa validar seu email primeiro.';
    }

    if (!account.pix_verified) {
      return 'Para vender Bitcoin, você precisa validar sua conta bancária (chave PIX).';
    }

    return 'Sua conta está totalmente validada.';
  }

  goToValidation(): void {
    const account = this.accountInfo();

    if (!account || !account.email_verified) {
      this.router.navigate(['/email-validation'], {
        queryParams: { returnUrl: '/sell' }
      });
    } else if (!account.pix_verified) {
      this.router.navigate(['/pix-validation'], {
        queryParams: { returnUrl: '/sell' }
      });
    }
  }

  // Balance methods
  loadBalance() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      this.isLoadingBalance.set(true);
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

  hasBalance(): boolean {
    return this.sBtcBalance() > 0;
  }

  // Quote methods
  startPricePolling() {
    this.isLoadingQuote.set(true);
    this.priceSubscription = this.sellOrderService.getBtcPrice().subscribe({
      next: (quote) => {
        // Convert price from cents to reais
        const priceInCents = parseInt(quote.price, 10);
        this.currentBtcPrice.set(priceInCents / 100);
        this.isLoadingQuote.set(false);
      },
      error: (error) => {
        console.error('Error fetching BTC price:', error);
        this.isLoadingQuote.set(false);
      }
    });
  }

  // Amount methods
  setInputMode(mode: 'sats' | 'brl') {
    if (this.inputMode() === mode) return;
    // Values are already synced, just switch the display mode
    // No need to clear - both amountInSats and amountInBrl are always kept in sync
    this.inputMode.set(mode);
  }

  isBrlMode(): boolean {
    return this.inputMode() === 'brl';
  }

  getDisplayAmount(): number {
    if (this.isBrlMode()) {
      return this.amountInBrl();
    }
    return Number(this.amountInSats());
  }

  getMinAmountInSats(): number {
    // Calculate minimum sats based on MIN_SELL_BRL_VALIDATION
    if (this.currentBtcPrice() > 0) {
      const minBtc = this.MIN_SELL_BRL_VALIDATION / this.currentBtcPrice();
      return Math.ceil(minBtc * this.SATS_PER_BTC);
    }
    return 100000; // Fallback to 100k sats
  }

  getStepAmount(): number {
    return this.isBrlMode() ? 0.01 : 1;
  }

  // Quick amount selection
  selectQuickAmount(brlAmount: number) {
    this.selectedQuickAmount.set(brlAmount);
    this.amountInBrl.set(brlAmount);
    // Calculate equivalent sats using service
    if (this.currentBtcPrice() > 0) {
      const sats = this.sellOrderService.brlToSats(brlAmount, this.currentBtcPrice());
      this.amountInSats.set(sats);
    }
  }

  // Insufficient balance checks
  hasInsufficientBalance(): boolean {
    if (this.isLoadingBalance() || this.isLoadingQuote() || !this.hasBalance()) return false;
    const balanceBrl = this.getBalanceEstimatedBrl();
    return balanceBrl < this.MIN_SELL_BRL_VALIDATION;
  }

  isQuickAmountDisabled(amount: number): boolean {
    if (!this.hasBalance() || this.isLoadingBalance() || this.isLoadingQuote()) return true;
    // Disable if balance in BRL is less than the button amount
    const balanceBrl = this.getBalanceEstimatedBrl();
    return balanceBrl < amount;
  }

  onAmountChange(event: any) {
    const value = parseFloat(event.target.value) || 0;

    // Clear quick amount selection when manually typing
    this.selectedQuickAmount.set(0);

    if (this.isBrlMode()) {
      this.amountInBrl.set(value);
      // Calculate sats from BRL using service
      if (this.currentBtcPrice() > 0 && value > 0) {
        this.amountInSats.set(this.sellOrderService.brlToSats(value, this.currentBtcPrice()));
      } else {
        this.amountInSats.set(0);
      }
    } else {
      this.amountInSats.set(Math.floor(value));
      // Calculate BRL from sats using service
      if (this.currentBtcPrice() > 0 && value > 0) {
        this.amountInBrl.set(this.sellOrderService.satsToBrl(Math.floor(value), this.currentBtcPrice()));
      } else {
        this.amountInBrl.set(0);
      }
    }
  }

  setMaxAmount() {
    const balance = this.sBtcBalance();
    const price = this.currentBtcPrice();

    if (balance <= 0 || price <= 0) {
      this.amountInSats.set(0);
      this.amountInBrl.set(0);
      return;
    }

    // Get max sats respecting both balance and BRL limit
    const maxSats = this.sellOrderService.getMaxSellableSats(
      balance,
      this.fee(),
      this.MAX_SELL_BRL_VALIDATION,
      price
    );

    this.amountInSats.set(maxSats);
    this.amountInBrl.set(this.sellOrderService.satsToBrl(maxSats, price));
    this.selectedQuickAmount.set(0); // Clear quick selection
  }

  getEstimatedBrlAmount(): number {
    const sats = Number(this.amountInSats());
    const btcAmount = sats / this.SATS_PER_BTC;
    return btcAmount * this.currentBtcPrice();
  }

  getBalanceEstimatedBrl(): number {
    const balanceSats = Number(this.sBtcBalance());
    const btcAmount = balanceSats / this.SATS_PER_BTC;
    return btcAmount * this.currentBtcPrice();
  }

  exceedsLimit(): boolean {
    return this.getEstimatedBrlAmount() > this.MAX_SELL_BRL_VALIDATION;
  }

  belowMinimum(): boolean {
    const brlAmount = this.getEstimatedBrlAmount();
    return brlAmount > 0 && brlAmount < this.MIN_SELL_BRL_VALIDATION;
  }

  canSell(): boolean {
    const amount = this.amountInSats();
    const brlAmount = this.getEstimatedBrlAmount();
    return (
      amount > 0 &&
      amount <= this.sBtcBalance() &&
      brlAmount >= this.MIN_SELL_BRL_VALIDATION &&
      brlAmount <= this.MAX_SELL_BRL_VALIDATION &&
      this.currentBtcPrice() > 0 &&
      !this.activeSellOrder()
    );
  }

  // Sell order methods
  checkForActiveSellOrder() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      this.sellOrderService.getActiveSellOrder(address).subscribe({
        next: (order) => {
          this.activeSellOrder.set(order);
        },
        error: (error) => {
          console.error('Error checking for active sell order:', error);
        }
      });
    }
  }

  loadSellOrders() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      this.isLoadingHistory.set(true);
      this.sellOrderService.getSellOrdersByAddress(address, {
        page: 1,
        limit: 5
      }).subscribe({
        next: (response) => {
          this.sellOrders.set(response.items);
          this.hasMoreOrders.set(response.has_more);
          this.currentPage.set(1);
          this.isLoadingHistory.set(false);
        },
        error: (error) => {
          console.error('Error loading sell orders:', error);
          this.isLoadingHistory.set(false);
        }
      });
    }
  }

  loadMoreOrders() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      const nextPage = this.currentPage() + 1;
      this.isLoadingMore.set(true);
      this.sellOrderService.getSellOrdersByAddress(address, {
        page: nextPage,
        limit: 5
      }).subscribe({
        next: (response) => {
          this.sellOrders.set([...this.sellOrders(), ...response.items]);
          this.hasMoreOrders.set(response.has_more);
          this.currentPage.set(nextPage);
          this.isLoadingMore.set(false);
        },
        error: (error) => {
          console.error('Error loading more sell orders:', error);
          this.isLoadingMore.set(false);
        }
      });
    }
  }

  // Sell process
  startSellProcess() {
    if (!this.canSell()) return;
    this.showConfirmationModal.set(true);
  }

  closeConfirmationModal() {
    this.showConfirmationModal.set(false);
  }

  confirmSell() {
    if (!this.canSell()) return;

    this.isProcessing.set(true);
    this.loadingService.show('Criando ordem de venda...');

    this.sellOrderService.createSellOrder(this.amountInSats()).subscribe({
      next: (order) => {
        this.isProcessing.set(false);
        this.loadingService.hide();
        this.showConfirmationModal.set(false);
        this.createdOrderId.set(order.id);
        this.showSuccessModal.set(true);

        // Refresh data
        this.loadBalance();
        this.loadSellOrders();
        this.checkForActiveSellOrder();
      },
      error: (error) => {
        console.error('Error creating sell order:', error);
        this.isProcessing.set(false);
        this.loadingService.hide();
        this.showConfirmationModal.set(false);

        // Handle specific errors
        if (error.message && error.message.includes('cancelada')) {
          // User cancelled - don't show error
          return;
        }

        this.errorMessage.set(this.getErrorMessage(error));
        this.showErrorModal.set(true);
      }
    });
  }

  private getErrorMessage(error: any): string {
    if (error?.error?.error) {
      return error.error.error;
    }
    if (error?.message) {
      return error.message;
    }
    return 'Ocorreu um erro ao criar a ordem de venda. Tente novamente.';
  }

  // Modal methods
  closeSuccessModal() {
    this.showSuccessModal.set(false);
    this.createdOrderId.set(null);
    this.amountInSats.set(0);
    this.amountInBrl.set(0);
    this.selectedQuickAmount.set(0);
  }

  viewCreatedOrder() {
    const orderId = this.createdOrderId();
    this.closeSuccessModal();
    if (orderId) {
      this.router.navigate(['/sell', orderId]);
    }
  }

  closeErrorModal() {
    this.showErrorModal.set(false);
    this.errorMessage.set('');
  }

  // Navigation
  goBack() {
    this.router.navigate(['/dashboard']);
  }

  goToActiveSellOrder() {
    const order = this.activeSellOrder();
    if (order) {
      this.router.navigate(['/sell', order.id]);
    }
  }

  viewOrderDetails(order: SellOrder) {
    this.router.navigate(['/sell', order.id]);
  }

  // Formatting methods
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatSats(amount: number): string {
    return new Intl.NumberFormat('pt-BR').format(amount);
  }

  formatSatsToBtc(sats: number): string {
    return (sats / this.SATS_PER_BTC).toFixed(8);
  }

  formatBrlCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  }

  formatDateTime(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }

  formatTxHash(txHash: string): string {
    if (!txHash || txHash.length <= 16) return txHash;
    return `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}`;
  }

  getExplorerUrl(txHash: string): string {
    const tx = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    const chain = environment.network === 'mainnet' ? 'mainnet' : 'testnet';
    return `https://explorer.hiro.so/txid/${tx}?chain=${chain}`;
  }

  getStatusLabel(status: SellOrderStatus): string {
    return getSellOrderStatusLabel(status);
  }

  getStatusClass(status: SellOrderStatus): string {
    return getSellOrderStatusClass(status);
  }
}
