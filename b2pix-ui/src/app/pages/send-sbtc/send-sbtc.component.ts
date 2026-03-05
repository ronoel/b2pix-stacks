import { Component, OnInit, signal, computed, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { BoltContractSBTCService } from '../../libs/bolt-contract-sbtc.service';
import { sBTCTokenService } from '../../libs/sbtc-token.service';
import { QuoteService } from '../../shared/api/quote.service';
import { formatSats as formatSatsUtil, formatBrlCents, getExplorerUrl, formatTruncated } from '../../shared/utils/format.util';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { StatusSheetComponent } from '../../components/status-sheet/status-sheet.component';
import { TechnicalDetailsComponent } from '../../components/technical-details/technical-details.component';
import { QuickAmountChipsComponent } from '../../components/quick-amount-chips/quick-amount-chips.component';

@Component({
  selector: 'app-send-sbtc',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, StatusSheetComponent, TechnicalDetailsComponent, QuickAmountChipsComponent],
  templateUrl: './send-sbtc.component.html',
  styleUrl: './send-sbtc.component.scss'
})
export class SendSBTCComponent implements OnInit {
  private router = inject(Router);
  private walletManagerService = inject(WalletManagerService);
  private boltContractSBTCService = inject(BoltContractSBTCService);
  private sBTCTokenService = inject(sBTCTokenService);
  private quoteService = inject(QuoteService);

  // Form fields
  recipientAddress = '';
  sendMemo = '';

  // Amount signals (dual-mode)
  sendMode = signal<'brl' | 'sats'>('brl');
  amountInSats = signal<number>(0);
  amountInBrl = signal<number>(0);
  selectedQuickAmount = signal<number>(0);

  readonly QUICK_AMOUNTS_BRL = [50, 250, 500, 1000];

  // State signals
  isSending = signal<boolean>(false);
  sendError = signal<string>('');
  transactionSuccess = signal<boolean>(false);
  transactionId = signal<string>('');
  txIdCopied = signal<boolean>(false);
  showConfirmationSheet = signal<boolean>(false);

  // Balance
  sBtcBalance = signal<number>(0); // in satoshis
  isLoadingBalance = signal<boolean>(false);

  // Fee and Price
  fee = signal<number>(0); // fee in satoshis
  btcPriceInBRL = signal<number>(0); // Price in cents (e.g., 9534562 = R$95,345.62)
  isLoadingPrice = signal<boolean>(false);

  /** BRL cents from amountInBrl (for display/summary) */
  sendAmountCents = computed<number>(() => Math.round(this.amountInBrl() * 100));

  /** Amount to send in satoshis */
  sendAmountSats = computed<number>(() => this.amountInSats());

  /** Fee in BRL cents */
  feeCents = computed<number>(() => {
    if (this.btcPriceInBRL() === 0) return 0;
    const btcPriceInReais = this.btcPriceInBRL() / 100;
    const feeBtc = this.fee() / 100_000_000;
    return Math.round(feeBtc * btcPriceInReais * 100);
  });

  /** Total in BRL cents (amount + fee) */
  totalCents = computed<number>(() => this.sendAmountCents() + this.feeCents());

  /** Balance in BRL (reais, not cents) */
  balanceBrl = computed<number>(() => {
    if (this.btcPriceInBRL() === 0) return 0;
    return (this.sBtcBalance() / 100_000_000) * (this.btcPriceInBRL() / 100);
  });

  /** Total amount (send + fee) in sats */
  totalSats = computed<number>(() => this.sendAmountSats() + this.fee());

  /** Disabled quick amounts (balance too low) */
  disabledQuickAmounts = computed<number[]>(() =>
    this.QUICK_AMOUNTS_BRL.filter(a => this.balanceBrl() < a)
  );

  ngOnInit() {
    this.loadBalance();
    this.loadFee();
    this.loadBtcPrice();
  }

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
          console.error('Error fetching balance:', error);
          this.isLoadingBalance.set(false);
        }
      });
    }
  }

  loadFee() {
    const feeAmount = this.boltContractSBTCService.getFee();
    this.fee.set(feeAmount);
  }

  loadBtcPrice() {
    this.isLoadingPrice.set(true);
    this.quoteService.getBtcPrice().subscribe({
      next: (response) => {
        this.btcPriceInBRL.set(Number(response.price));
        this.isLoadingPrice.set(false);
      },
      error: (error) => {
        console.error('Error fetching BTC price:', error);
        this.isLoadingPrice.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  goHome() {
    this.router.navigate(['/dashboard']);
  }

  sendAnother() {
    this.resetForm();
    this.transactionSuccess.set(false);
    this.transactionId.set('');
    this.showConfirmationSheet.set(false);
  }

  onAmountChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.selectedQuickAmount.set(0);
    this.amountInBrl.set(value);
    if (this.btcPriceInBRL() > 0 && value > 0) {
      const btcPrice = this.btcPriceInBRL() / 100;
      this.amountInSats.set(Math.round((value / btcPrice) * 100_000_000));
    } else {
      this.amountInSats.set(0);
    }
  }

  onSatsAmountChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value) || 0;
    this.selectedQuickAmount.set(0);
    this.amountInSats.set(value);
    if (this.btcPriceInBRL() > 0 && value > 0) {
      const btcPrice = this.btcPriceInBRL() / 100;
      this.amountInBrl.set(Math.round(((value / 100_000_000) * btcPrice) * 100) / 100);
    } else {
      this.amountInBrl.set(0);
    }
  }

  selectQuickAmount(brlAmount: number) {
    this.selectedQuickAmount.set(brlAmount);
    this.amountInBrl.set(brlAmount);
    if (this.btcPriceInBRL() > 0) {
      const btcPrice = this.btcPriceInBRL() / 100;
      this.amountInSats.set(Math.round((brlAmount / btcPrice) * 100_000_000));
    }
  }

  /** Set amount to maximum sendable (balance - fee) */
  setMaxAmount() {
    const balanceSats = this.sBtcBalance();
    const feeSats = this.fee();
    const maxSats = Math.max(0, balanceSats - feeSats);
    this.amountInSats.set(maxSats);
    if (this.btcPriceInBRL() > 0 && maxSats > 0) {
      const btcPrice = this.btcPriceInBRL() / 100;
      this.amountInBrl.set(Math.round(((maxSats / 100_000_000) * btcPrice) * 100) / 100);
    } else {
      this.amountInBrl.set(0);
    }
    this.selectedQuickAmount.set(-1);
  }

  resetForm() {
    this.recipientAddress = '';
    this.sendMemo = '';
    this.amountInSats.set(0);
    this.amountInBrl.set(0);
    this.selectedQuickAmount.set(0);
    this.sendMode.set('brl');
    this.sendError.set('');
    this.isSending.set(false);
  }

  /** Opens the confirmation bottom sheet after basic validation */
  reviewSend() {
    if (!this.recipientAddress) {
      this.sendError.set('Por favor, informe o endereço do destinatário.');
      return;
    }

    if (this.amountInSats() <= 0) {
      this.sendError.set('Por favor, informe um valor válido.');
      return;
    }

    this.sendError.set('');
    this.showConfirmationSheet.set(true);
  }

  cancelConfirmation() {
    this.showConfirmationSheet.set(false);
    this.sendError.set('');
  }

  confirmSend() {
    const amountSats = this.sendAmountSats();
    if (!this.recipientAddress || amountSats <= 0) {
      return;
    }

    this.isSending.set(true);
    this.sendError.set('');

    this.boltContractSBTCService.transferStacksToStacks(
      amountSats,
      this.recipientAddress,
      this.sendMemo
    ).subscribe({
      next: (response) => {
        this.isSending.set(false);
        this.showConfirmationSheet.set(false);
        this.transactionSuccess.set(true);

        if (response.txid) {
          this.transactionId.set(response.txid);
        }
      },
      error: (error) => {
        this.isSending.set(false);
        console.error('Error sending Bitcoin:', error);

        let errorMessage = 'Erro ao enviar Bitcoin. Por favor, tente novamente.';
        if (error?.error) {
          errorMessage = error.error;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.sendError.set(errorMessage);
      }
    });
  }

  getBlockchainExplorerUrl = getExplorerUrl;

  copyTransactionId() {
    const txId = this.transactionId();
    if (txId) {
      navigator.clipboard.writeText(txId).then(() => {
        this.txIdCopied.set(true);
        setTimeout(() => {
          this.txIdCopied.set(false);
        }, 2000);
      });
    }
  }

  formatSats(sats: number): string {
    return formatSatsUtil(sats);
  }

  formatBRL(cents: number): string {
    return formatBrlCents(cents);
  }

  formatTxId(txId: string): string {
    return formatTruncated(txId, 8, 6);
  }

  truncateAddress(address: string): string {
    if (!address || address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  }
}
