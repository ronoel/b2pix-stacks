import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { environment } from '../../../environments/environment';
import { sBTCTokenService } from '../../libs/sbtc-token.service';
import { QuoteService } from '../../shared/api/quote.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { BuyOrderService } from '../../shared/api/buy-order.service';
import { SellOrderService } from '../../shared/api/sell-order.service';
import { AccountInfo } from '../../shared/models/account-validation.model';
import { BuyOrder, BuyOrderStatus } from '../../shared/models/buy-order.model';
import { SellOrder } from '../../shared/models/sell-order.model';
import { formatBrlCents, formatSats, formatSatsToBtc, formatTruncated } from '../../shared/utils/format.util';
import { StatusSheetComponent } from '../../components/status-sheet/status-sheet.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [StatusSheetComponent],
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
  private buyOrderService = inject(BuyOrderService);
  private sellOrderService = inject(SellOrderService);

  showDepositSheet = signal(false);
  walletAddress = signal('');
  addressCopied = signal(false);

  sBtcBalance = signal(0);
  isLoadingBalance = signal(false);
  btcPriceInCents = signal(0);

  validationStatus = signal<AccountInfo | null>(null);

  // Active order interrupt
  activeOrder = signal<{ type: 'buy' | 'sell'; id: string; title: string; description: string; cta: string } | null>(null);

  balanceInCents = computed(() => {
    const sats = this.sBtcBalance();
    const priceCents = this.btcPriceInCents();
    if (sats === 0 || priceCents === 0) return 0;
    const btc = sats / 100_000_000;
    const priceReais = priceCents / 100;
    return Math.round(btc * priceReais * 100);
  });

  truncatedAddress = computed(() => formatTruncated(this.walletAddress(), 10, 10));

  currentUser = this.userService.currentUser;

  ngOnInit() {
    this.walletAddress.set(this.walletManagerService.getSTXAddress() || '');
    this.loadBalance();
    this.loadBtcPrice();
    this.loadValidationStatus();
    this.loadActiveOrder();
  }

  ngOnDestroy() {}

  loadBalance() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      if (this.sBtcBalance() === 0) {
        this.isLoadingBalance.set(true);
      }
      this.sBTCTokenService.getBalance().subscribe({
        next: (balance) => {
          this.sBtcBalance.set(balance);
          this.isLoadingBalance.set(false);
        },
        error: () => this.isLoadingBalance.set(false)
      });
    }
  }

  loadBtcPrice() {
    this.quoteService.getBtcPrice().subscribe({
      next: (response) => this.btcPriceInCents.set(parseInt(response.price)),
      error: () => {}
    });
  }

  loadValidationStatus() {
    this.accountValidationService.getAccount().subscribe({
      next: (account) => this.validationStatus.set(account),
      error: () => {}
    });
  }

  isFullyValidated(): boolean {
    const s = this.validationStatus();
    return (s?.email_verified && s?.pix_verified) || false;
  }

  getValidationMessage(): string {
    const s = this.validationStatus();
    if (!s) return '';
    if (!s.email_verified) return 'Valide seu email para começar a usar a plataforma';
    if (!s.pix_verified) return 'Valide sua conta bancária com um depósito de confirmação';
    return '';
  }

  isManager(): boolean {
    return this.walletManagerService.getSTXAddress() === environment.b2pixAddress;
  }

  isLp(): boolean {
    return this.validationStatus()?.is_lp === true;
  }

  // Navigation
  navigate(path: string) {
    this.router.navigate([path]);
  }

  goToValidation(): void {
    const s = this.validationStatus();
    this.router.navigate([!s?.email_verified ? '/email-validation' : '/pix-validation']);
  }

  disconnect() {
    this.walletManagerService.signOut();
  }

  // Deposit sheet
  openDepositSheet() {
    this.showDepositSheet.set(true);
    this.addressCopied.set(false);
  }

  closeDepositSheet() {
    this.showDepositSheet.set(false);
    this.addressCopied.set(false);
  }

  copyAddress() {
    const address = this.walletAddress();
    if (address) {
      navigator.clipboard.writeText(address).then(() => {
        this.addressCopied.set(true);
        setTimeout(() => this.addressCopied.set(false), 2000);
      });
    }
  }

  // Active Order
  loadActiveOrder() {
    const address = this.walletManagerService.getSTXAddress();
    if (!address) return;

    this.buyOrderService.getBuyOrdersByAddress(address, { page: 1, limit: 10 }).subscribe({
      next: (response) => {
        const activeBuy = response.buy_orders.find(o => !o.is_final);
        if (activeBuy) {
          this.activeOrder.set(this.mapBuyOrderToInterrupt(activeBuy));
          return;
        }
        this.sellOrderService.getActiveSellOrder(address).subscribe({
          next: (activeSell) => {
            if (activeSell) {
              this.activeOrder.set(this.mapSellOrderToInterrupt(activeSell));
            }
          },
          error: () => {}
        });
      },
      error: () => {
        this.sellOrderService.getActiveSellOrder(address).subscribe({
          next: (activeSell) => {
            if (activeSell) {
              this.activeOrder.set(this.mapSellOrderToInterrupt(activeSell));
            }
          },
          error: () => {}
        });
      }
    });
  }

  private mapBuyOrderToInterrupt(order: BuyOrder): { type: 'buy'; id: string; title: string; description: string; cta: string } {
    const valor = formatBrlCents(order.buy_value);
    if (order.status === BuyOrderStatus.Created) {
      return { type: 'buy', id: order.id, title: 'Compra em andamento', description: `${valor} · Aguardando pagamento PIX`, cta: 'Continuar pagamento' };
    }
    return { type: 'buy', id: order.id, title: 'Compra em andamento', description: `${valor} · Pagamento enviado`, cta: 'Acompanhar compra' };
  }

  private mapSellOrderToInterrupt(order: SellOrder): { type: 'sell'; id: string; title: string; description: string; cta: string } {
    const valor = order.pix_value ? formatBrlCents(order.pix_value) : formatBrlCents(0);
    if (order.status === 'confirmed' || order.status === 'settlement_created') {
      return { type: 'sell', id: order.id, title: 'Venda em andamento', description: `${valor} · PIX sendo processado`, cta: 'Acompanhar venda' };
    }
    return { type: 'sell', id: order.id, title: 'Venda em andamento', description: `${valor} · Aguardando confirmação`, cta: 'Acompanhar venda' };
  }

  goToActiveOrder() {
    const order = this.activeOrder();
    if (!order) return;
    this.router.navigate([`/${order.type}/${order.id}`]);
  }

  // Formatting
  formatSats = formatSats;
  formatSatsToBtc = formatSatsToBtc;

  formatBrlCentsValue(cents: number): string {
    return formatBrlCents(cents);
  }
}
