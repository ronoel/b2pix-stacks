import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { BuyOrderService } from '../../shared/api/buy-order.service';
import { Router } from '@angular/router';

import { formatSats } from '../../shared/utils/format.util';
import { BuyHistoryComponent } from './components/buy-history.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { StatusSheetComponent } from '../../components/status-sheet/status-sheet.component';
import { QuickAmountChipsComponent } from '../../components/quick-amount-chips/quick-amount-chips.component';
@Component({
  selector: 'app-buy',
  standalone: true,
  imports: [BuyHistoryComponent, PageHeaderComponent, StatusSheetComponent, QuickAmountChipsComponent],
  templateUrl: './buy.component.html',
  styleUrl: './buy.component.scss'
})
export class BuyComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  private walletManagerService = inject(WalletManagerService);
  private buyOrderService = inject(BuyOrderService);

  // Core signals
  selectedQuickAmount = signal<number>(0);
  customAmount = signal<number>(0);
  showConfirmSheet = signal<boolean>(false);
  isProcessingPurchase = signal<boolean>(false);

  // Multi-step preparation state
  currentStep = signal(1);
  step1Confirmed = signal(false);
  step2Confirmed = signal(false);
  step3Confirmed = signal(false);

  // Single checkbox state for confirmation sheet (legacy, kept for step 3 confirm flow)
  termsConfirmed = signal<boolean>(false);

  // Quote signals
  currentQuotePrice = signal<number | null>(null);
  isLoadingQuote = signal(true);
  private quoteSubscription?: Subscription;

  // Amount limits
  private readonly MIN_BUY_AMOUNT = 50;
  private readonly MAX_BUY_AMOUNT = 1000;

  exceedsMaxAmount = computed(() => this.customAmount() > this.MAX_BUY_AMOUNT);
  belowMinAmount = computed(() => this.customAmount() > 0 && this.customAmount() < this.MIN_BUY_AMOUNT);

  // Computed: estimated sats for the current BRL amount
  estimatedSats = computed(() => {
    const amountBrl = this.customAmount();
    const quote = this.currentQuotePrice();
    if (!quote || amountBrl <= 0) return 0;
    const amountInCents = amountBrl * 100;
    const btcAmount = amountInCents / quote;
    return Math.floor(btcAmount * 100_000_000);
  });

  // Computed: amount in cents for display components
  amountInCents = computed(() => Math.round(this.customAmount() * 100));

  // Computed: whether buy button can be activated
  canBuy = computed(() =>
    this.customAmount() > 0 &&
    !this.exceedsMaxAmount() &&
    !this.belowMinAmount() &&
    !!this.currentQuotePrice() &&
    !this.isProcessingPurchase()
  );

  readonly quickAmounts = [50, 250, 500, 1000];

  ngOnInit() {
    this.quoteSubscription = this.buyOrderService.getBtcPrice().subscribe({
      next: (quote) => {
        const priceInCents = parseInt(quote.price, 10);
        this.currentQuotePrice.set(priceInCents);
        this.isLoadingQuote.set(false);
      },
      error: (err) => {
        console.error('Quote polling error:', err);
        this.isLoadingQuote.set(false);
      }
    });

    this.checkForActiveOrder();
  }

  ngOnDestroy() {
    this.quoteSubscription?.unsubscribe();
  }

  private checkForActiveOrder() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      this.buyOrderService.getBuyOrdersByAddress(address, { page: 1, limit: 1 }).subscribe({
        next: (response) => {
          if (response.buy_orders.length > 0) {
            const order = response.buy_orders[0];
            if (!order.is_final) {
              this.router.navigate(['/buy', order.id]);
            }
          }
        },
        error: (error) => {
          console.error('Error checking for active order:', error);
        }
      });
    }
  }

  selectQuickAmount(amount: number) {
    this.selectedQuickAmount.set(amount);
    this.customAmount.set(amount);
  }

  onCustomAmountChange(value: number) {
    this.customAmount.set(value);
    this.selectedQuickAmount.set(0);
  }

  startBuyProcess() {
    this.currentStep.set(1);
    this.step1Confirmed.set(false);
    this.step2Confirmed.set(false);
    this.step3Confirmed.set(false);
    this.termsConfirmed.set(false);
    this.showConfirmSheet.set(true);
  }

  closeConfirmSheet() {
    this.showConfirmSheet.set(false);
    this.currentStep.set(1);
    this.step1Confirmed.set(false);
    this.step2Confirmed.set(false);
    this.step3Confirmed.set(false);
    this.termsConfirmed.set(false);
  }

  nextStep() {
    if (this.canProceedToNextStep()) {
      this.currentStep.update(s => Math.min(s + 1, 3));
    }
  }

  previousStep() {
    this.currentStep.update(s => Math.max(s - 1, 1));
  }

  canProceedToNextStep(): boolean {
    switch (this.currentStep()) {
      case 1: return this.step1Confirmed();
      case 2: return this.step2Confirmed();
      case 3: return this.step3Confirmed();
      default: return false;
    }
  }

  toggleStep(step: number, value: boolean) {
    switch (step) {
      case 1: this.step1Confirmed.set(value); break;
      case 2: this.step2Confirmed.set(value); break;
      case 3: this.step3Confirmed.set(value); break;
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatBtcFromSats(sats: number): string {
    return (sats / 100_000_000).toFixed(8);
  }

  formatSatsValue(sats: number): string {
    return formatSats(sats);
  }

  formatQuickAmount(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  confirmPurchase() {
    const amount = this.customAmount();

    if (amount <= 0) {
      alert('Por favor, selecione um valor válido.');
      return;
    }

    if (amount > this.MAX_BUY_AMOUNT) {
      alert('O valor máximo permitido por compra é de R$ 1.000,00.');
      return;
    }

    this.isProcessingPurchase.set(true);
    this.loadingService.show('Criando ordem...');

    const buyValueInCents = Math.round(amount * 100);

    this.buyOrderService.createBuyOrder(buyValueInCents).subscribe({
      next: (buyOrder) => {
        this.isProcessingPurchase.set(false);
        this.loadingService.hide();
        this.showConfirmSheet.set(false);
        this.router.navigate(['/buy', buyOrder.id]);
      },
      error: (error: any) => {
        console.error('Erro ao criar ordem de compra:', error);
        this.isProcessingPurchase.set(false);
        this.loadingService.hide();

        if (error.message && error.message.includes('cancelada')) {
          this.showConfirmSheet.set(false);
        } else if (error.message && error.message.includes('Active order already exists')) {
          alert('Você já possui uma ordem ativa. Complete ou cancele a ordem anterior antes de criar uma nova.');
          this.showConfirmSheet.set(false);
          this.checkForActiveOrder();
        } else {
          alert(error.message || 'Erro ao criar a ordem de compra. Tente novamente.');
        }
      }
    });
  }
}
