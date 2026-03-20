import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';

import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { SellOrderService } from '../../shared/api/sell-order.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { PixPayoutRequestService } from '../../shared/api/pix-payout-request.service';
import { PixPayoutRequest } from '../../shared/models/pix-payout-request.model';
import { sBTCTokenService } from '../../libs/sbtc-token.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import {
  SellOrder,
  OrderStatus,
  getStatusLabel as getSellOrderStatusLabel,
  getStatusClass as getSellOrderStatusClass
} from '../../shared/models/sell-order.model';
import {
  formatBrlCents,
  formatSats,
  formatDateTime,
  formatTruncated,
  getExplorerUrl
} from '../../shared/utils/format.util';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { StatusSheetComponent } from '../../components/status-sheet/status-sheet.component';
import { QuickAmountChipsComponent } from '../../components/quick-amount-chips/quick-amount-chips.component';
import { ActivePayoutCardComponent } from '../../components/active-payout-card/active-payout-card.component';

@Component({
  selector: 'app-sell',
  standalone: true,
  imports: [PageHeaderComponent, StatusSheetComponent, QuickAmountChipsComponent, ActivePayoutCardComponent],
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
  private payoutRequestService = inject(PixPayoutRequestService);

  // Constants
  readonly SATS_PER_BTC = 100000000;
  readonly MIN_SELL_BRL = 50;
  readonly MAX_SELL_BRL = 1000;
  readonly MIN_SELL_BRL_VALIDATION = 45;
  readonly MAX_SELL_BRL_VALIDATION = 1010;
  readonly QUICK_AMOUNTS_BRL = [50, 250, 500, 1000];

  // Balance and pricing
  sBtcBalance = signal<number>(0);
  isLoadingBalance = signal(false);
  currentBtcPrice = signal(0);
  isLoadingQuote = signal(true);
  private priceSubscription?: Subscription;

  // BRL / Sats toggle
  sellMode = signal<'brl' | 'sats'>('brl');

  // Amount input
  amountInSats = signal<number>(0);
  amountInBrl = signal<number>(0);
  selectedQuickAmount = signal<number>(0); // 0 = none, -1 = "Tudo"

  // Sell orders
  sellOrders = signal<SellOrder[]>([]);
  activeSellOrder = signal<SellOrder | null>(null);
  isLoadingHistory = signal(false);
  isLoadingMore = signal(false);
  hasMoreOrders = signal(false);
  currentPage = signal(1);

  // Active payout check
  activePayout = signal<PixPayoutRequest | null>(null);
  hasActivePayout = computed(() => !!this.activePayout());

  // Sheet + inline error (replaces modal signals)
  showConfirmationSheet = signal(false);
  inlineError = signal<string | null>(null);
  private errorDismissTimer?: ReturnType<typeof setTimeout>;

  // Confirmation checkbox
  pixKeyConfirmed = signal(false);
  userPixKey = signal<string | null>(null);

  // Processing state
  isProcessing = signal(false);

  // Network fee (in sats)
  fee = computed(() => this.sellOrderService.getFee());

  // Computed: balance in BRL
  balanceBrl = computed(() => {
    const sats = this.sBtcBalance();
    const price = this.currentBtcPrice();
    if (!sats || !price) return 0;
    return (sats / this.SATS_PER_BTC) * price;
  });

  // Computed: disabled quick amounts (balance too low)
  disabledQuickAmounts = computed(() =>
    this.QUICK_AMOUNTS_BRL.filter(a => this.isQuickAmountDisabled(a))
  );

  // Computed: dynamic max sell in BRL (balance-capped at MAX_SELL_BRL)
  maxSellBrl = computed(() => {
    return Math.min(this.balanceBrl(), this.MAX_SELL_BRL);
  });

  ngOnInit() {
    this.loadBalance();
    this.startPricePolling();
    this.loadSellOrders();
    this.checkForActiveSellOrder();
    this.checkActivePayouts();
  }

  ngOnDestroy() {
    if (this.priceSubscription) {
      this.priceSubscription.unsubscribe();
    }
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
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

  // Insufficient balance checks
  hasInsufficientBalance(): boolean {
    if (this.isLoadingBalance() || this.isLoadingQuote() || !this.hasBalance()) return false;
    return this.balanceBrl() < this.MIN_SELL_BRL_VALIDATION;
  }

  isQuickAmountDisabled(amount: number): boolean {
    if (!this.hasBalance() || this.isLoadingBalance() || this.isLoadingQuote()) return true;
    return this.balanceBrl() < amount;
  }

  // Quick amount selection
  selectQuickAmount(brlAmount: number) {
    this.selectedQuickAmount.set(brlAmount);
    this.amountInBrl.set(brlAmount);
    this.clearInlineError();
    if (this.currentBtcPrice() > 0) {
      const sats = this.sellOrderService.brlToSats(brlAmount, this.currentBtcPrice());
      this.amountInSats.set(sats);
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

    const maxSats = this.sellOrderService.getMaxSellableSats(
      balance,
      this.fee(),
      this.MAX_SELL_BRL_VALIDATION,
      price
    );

    this.amountInSats.set(maxSats);
    this.amountInBrl.set(this.sellOrderService.satsToBrl(maxSats, price));
    this.selectedQuickAmount.set(-1); // -1 = "Tudo" chip active
    this.clearInlineError();
  }

  onSatsAmountChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value) || 0;
    this.selectedQuickAmount.set(0);
    this.amountInSats.set(value);
    this.clearInlineError();

    if (this.currentBtcPrice() > 0 && value > 0) {
      this.amountInBrl.set(this.sellOrderService.satsToBrl(value, this.currentBtcPrice()));
    } else {
      this.amountInBrl.set(0);
    }
  }

  onAmountChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.selectedQuickAmount.set(0);
    this.amountInBrl.set(value);
    this.clearInlineError();

    if (this.currentBtcPrice() > 0 && value > 0) {
      this.amountInSats.set(this.sellOrderService.brlToSats(value, this.currentBtcPrice()));
    } else {
      this.amountInSats.set(0);
    }
  }

  getEstimatedBrlAmount(): number {
    const sats = Number(this.amountInSats());
    const btcAmount = sats / this.SATS_PER_BTC;
    return btcAmount * this.currentBtcPrice();
  }

  exceedsLimit(): boolean {
    return this.amountInBrl() > this.MAX_SELL_BRL || this.getEstimatedBrlAmount() > this.MAX_SELL_BRL_VALIDATION;
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
      this.amountInBrl() <= this.MAX_SELL_BRL &&
      this.currentBtcPrice() > 0 &&
      !this.activeSellOrder() &&
      !this.hasActivePayout()
    );
  }

  // Active payout check
  checkActivePayouts() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      this.payoutRequestService.getActivePayoutRequests(address).subscribe({
        next: (payouts) => {
          this.activePayout.set(payouts.length > 0 ? payouts[0] : null);
        },
        error: (error) => {
          console.error('Error checking active payouts:', error);
        }
      });
    }
  }

  onPayoutResolved() {
    this.checkActivePayouts();
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

  // Sell process — opens bottom sheet
  startSellProcess() {
    if (!this.canSell()) return;
    this.pixKeyConfirmed.set(false);
    this.loadUserPixKey();
    this.showConfirmationSheet.set(true);
  }

  loadUserPixKey() {
    this.accountValidationService.getValidationStatus().subscribe({
      next: (status) => {
        this.userPixKey.set(status.pix_key || null);
      },
      error: (error) => {
        console.error('Error loading PIX key:', error);
        this.userPixKey.set(null);
      }
    });
  }

  onPixKeyConfirmChange(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    this.pixKeyConfirmed.set(checkbox.checked);
  }

  formatPixKey(pixKey: string): string {
    const digits = pixKey.replace(/\D/g, '');
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (digits.length === 14) {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return pixKey;
  }

  closeConfirmationSheet() {
    this.showConfirmationSheet.set(false);
    this.pixKeyConfirmed.set(false);
  }

  confirmSell() {
    if (!this.canSell() || !this.pixKeyConfirmed()) return;

    this.isProcessing.set(true);
    this.loadingService.show('Criando ordem de venda...');

    this.sellOrderService.createSellOrder(this.amountInSats()).subscribe({
      next: (order) => {
        this.isProcessing.set(false);
        this.loadingService.hide();
        this.showConfirmationSheet.set(false);

        // Navigate directly to sell details — no intermediate modal
        this.router.navigate(['/sell', order.id]);
      },
      error: (error) => {
        console.error('Error creating sell order:', error);
        this.isProcessing.set(false);
        this.loadingService.hide();
        this.showConfirmationSheet.set(false);

        if (error.message && error.message.includes('cancelada')) {
          return;
        }

        if (error.status === 409) {
          this.checkActivePayouts();
        }

        this.showInlineError(this.getErrorMessage(error));
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

  // Inline error — auto-dismisses after 8 seconds
  private showInlineError(message: string) {
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
    }
    this.inlineError.set(message);
    this.errorDismissTimer = setTimeout(() => {
      this.inlineError.set(null);
    }, 8000);
  }

  clearInlineError() {
    if (this.inlineError()) {
      if (this.errorDismissTimer) {
        clearTimeout(this.errorDismissTimer);
      }
      this.inlineError.set(null);
    }
  }

  // Navigation
  goToActiveSellOrder() {
    const order = this.activeSellOrder();
    if (order) {
      this.router.navigate(['/sell', order.id]);
    }
  }

  viewOrderDetails(order: SellOrder) {
    this.router.navigate(['/sell', order.id]);
  }

  // Formatting
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatSatsDisplay = formatSats;
  formatBrlCents = formatBrlCents;
  formatDateTime = formatDateTime;
  formatTruncated = formatTruncated;
  getExplorerUrl = getExplorerUrl;

  getStatusLabel(status: OrderStatus): string {
    return getSellOrderStatusLabel(status);
  }

  getStatusClass(status: OrderStatus): string {
    return getSellOrderStatusClass(status);
  }

}
