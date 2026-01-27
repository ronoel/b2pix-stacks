import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { BuyOrderService } from '../../shared/api/buy-order.service';
import { InvitesService } from '../../shared/api/invites.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { AccountInfo } from '../../shared/models/account-validation.model';
import { CommonModule } from '@angular/common';
import { BuyHistoryComponent } from './components/buy-history.component';

@Component({
  selector: 'app-buy',
  standalone: true,
  imports: [CommonModule, BuyHistoryComponent],
  templateUrl: './buy.component.html',
  styleUrl: './buy.component.scss'
})

export class BuyComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  private walletManagerService = inject(WalletManagerService);
  private buyOrderService = inject(BuyOrderService);
  private invitesService = inject(InvitesService);
  // private quoteService = inject(QuoteService);
  private accountValidationService = inject(AccountValidationService);

  // Core signals
  selectedQuickAmount = signal<number>(0);
  customAmount = signal<number>(0);
  showConfirmationModal = signal<boolean>(false);
  isProcessingPurchase = signal<boolean>(false);

  // Account info
  accountInfo = signal<AccountInfo | null>(null);

  // Step-by-step modal state
  currentModalStep = signal<number>(1);
  step1Confirmed = signal<boolean>(false);
  step2Confirmed = signal<boolean>(false);
  step3Confirmed = signal<boolean>(false);

  // Quote signals
  currentQuotePrice = signal<number | null>(null);
  isLoadingQuote = signal(true);
  private quoteSubscription?: Subscription;

  ngOnInit() {
    // Start quote polling
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

    // Check for active order
    this.checkForActiveOrder();

    // Load validation status
    this.loadValidationStatus();
  }

  ngOnDestroy() {
    if (this.quoteSubscription) {
      this.quoteSubscription.unsubscribe();
    }
  }

  /**
   * Check if user has an active buy order and redirect to it
   */
  private checkForActiveOrder() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      this.buyOrderService.getBuyOrdersByAddress(address, { page: 1, limit: 1 }).subscribe({
        next: (response) => {
          if (response.buy_orders.length > 0) {
            const order = response.buy_orders[0];
            // Check if order is active (not final)
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

  /**
   * Load account validation status
   */
  loadValidationStatus() {
    this.accountValidationService.getAccount().subscribe({
      next: (account) => {
        this.accountInfo.set(account);
      },
      error: (error) => {
        console.error('Error loading account:', error);
      }
    });
  }

  /**
   * Check if user account is fully validated (pix_verified indicates full validation)
   */
  isAccountValidated(): boolean {
    const account = this.accountInfo();
    if (!account) return false;
    return account.pix_verified;
  }

  /**
   * Get validation required message based on current status
   */
  getValidationRequiredMessage(): string {
    const account = this.accountInfo();
    if (!account) {
      return 'Para comprar Bitcoin, você precisa validar seu email e conta bancária.';
    }

    if (!account.email_verified) {
      return 'Para comprar Bitcoin, você precisa validar seu email primeiro.';
    }

    if (!account.pix_verified) {
      return 'Para comprar Bitcoin, você precisa validar sua conta bancária (chave PIX).';
    }

    return 'Sua conta está totalmente validada.';
  }

  /**
   * Navigate to appropriate validation page
   */
  goToValidation(): void {
    const account = this.accountInfo();

    if (!account || !account.email_verified) {
      this.router.navigate(['/email-validation'], {
        queryParams: { returnUrl: '/buy' }
      });
    } else if (!account.pix_verified) {
      this.router.navigate(['/pix-validation'], {
        queryParams: { returnUrl: '/buy' }
      });
    }
  }

  selectQuickAmount(amount: number) {
    this.selectedQuickAmount.set(amount);
    this.customAmount.set(amount);
  }

  onCustomAmountChange(amount: number) {
    this.customAmount.set(amount);
    this.selectedQuickAmount.set(0); // Clear quick amount selection
  }

  getCurrentAmount(): number {
    return this.customAmount();
  }

  /**
   * Calculate estimated Bitcoin amount in satoshis (single source of truth)
   */
  getEstimatedBitcoinAmountInSats(): number {
    const amountBrl = this.getCurrentAmount();
    const quote = this.currentQuotePrice();

    if (!quote || amountBrl <= 0) return 0;

    // Convert BRL to cents
    const amountInCents = amountBrl * 100;
    const pricePerBtcInCents = quote;

    // Calculate BTC amount
    const btcAmount = amountInCents / pricePerBtcInCents;
    
    // Convert to satoshis (1 BTC = 100,000,000 sats)
    return Math.floor(btcAmount * 100000000);
  }

  /**
   * Format satoshis as BTC with 8 decimal places
   */
  formatBitcoinAmount(sats: number): string {
    const btc = sats / 100000000;
    return btc.toFixed(8);
  }

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

  startBuyProcess() {
    // Check invite status before showing modal
    this.loadingService.show('Verificando convite...');

    this.invitesService.getWalletInvite().subscribe({
      next: (invite) => {
        this.loadingService.hide();

        if (!invite) {
          this.router.navigate(['/invite-validation'], {
            queryParams: { returnUrl: '/buy' }
          });
          return;
        }

        if (invite.status === 'blocked') {
          this.router.navigate(['/blocked']);
          return;
        }

        if (invite.status !== 'claimed') {
          this.router.navigate(['/invite-validation'], {
            queryParams: { returnUrl: '/buy' }
          });
          return;
        }

        // Invite is valid, show confirmation modal
        this.showConfirmationModal.set(true);
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Error checking invite status:', error);
        this.router.navigate(['/invite-validation'], {
          queryParams: { returnUrl: '/buy' }
        });
      }
    });
  }

  closeConfirmationModal() {
    this.showConfirmationModal.set(false);
    this.resetModalState();
  }

  resetModalState() {
    this.currentModalStep.set(1);
    this.step1Confirmed.set(false);
    this.step2Confirmed.set(false);
    this.step3Confirmed.set(false);
  }

  canProceedToNextStep(): boolean {
    const step = this.currentModalStep();
    if (step === 1) return this.step1Confirmed();
    if (step === 2) return this.step2Confirmed();
    if (step === 3) return this.step3Confirmed();
    return false;
  }

  allStepsCompleted(): boolean {
    return this.step1Confirmed() && this.step2Confirmed() && this.step3Confirmed();
  }

  nextStep() {
    if (this.canProceedToNextStep() && this.currentModalStep() < 4) {
      this.currentModalStep.set(this.currentModalStep() + 1);
    }
  }

  previousStep() {
    if (this.currentModalStep() > 1) {
      this.currentModalStep.set(this.currentModalStep() - 1);
    }
  }

  toggleStep1(checked: boolean) {
    this.step1Confirmed.set(checked);
  }

  toggleStep2(checked: boolean) {
    this.step2Confirmed.set(checked);
  }

  toggleStep3(checked: boolean) {
    this.step3Confirmed.set(checked);
  }

  confirmPurchase() {
    const amount = this.getCurrentAmount();

    if (amount <= 0) {
      alert('Por favor, selecione um valor válido.');
      return;
    }

    this.isProcessingPurchase.set(true);
    this.loadingService.show('Criando ordem de compra...');

    // Convert BRL to cents
    const buyValueInCents = Math.round(amount * 100);

    this.buyOrderService.createBuyOrder(buyValueInCents).subscribe({
      next: (buyOrder) => {
        this.isProcessingPurchase.set(false);
        this.loadingService.hide();
        this.showConfirmationModal.set(false);

        // Navigate to buy-details page
        this.router.navigate(['/buy', buyOrder.id]);
      },
      error: (error: any) => {
        console.error('Erro ao criar ordem de compra:', error);
        this.isProcessingPurchase.set(false);
        this.loadingService.hide();

        // Handle specific error cases
        if (error.message && error.message.includes('cancelada')) {
          // User cancelled signature - don't show error
          this.showConfirmationModal.set(false);
        } else if (error.message && error.message.includes('Active order already exists')) {
          alert('Você já possui uma ordem ativa. Complete ou cancele a ordem anterior antes de criar uma nova.');
          this.showConfirmationModal.set(false);
          this.checkForActiveOrder(); // Redirect to active order
        } else {
          alert(error.message || 'Erro ao criar a ordem de compra. Tente novamente.');
        }
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
