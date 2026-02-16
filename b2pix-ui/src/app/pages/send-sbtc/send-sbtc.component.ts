import { Component, OnInit, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { BoltContractSBTCService } from '../../libs/bolt-contract-sbtc.service';
import { environment } from '../../../environments/environment';
import { sBTCTokenService } from '../../libs/sbtc-token.service';
import { QuoteService } from '../../shared/api/quote.service';

@Component({
  selector: 'app-send-sbtc',
  standalone: true,
  imports: [FormsModule],
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
  sendAmount: number | null = null;
  sendMemo = '';

  // State signals
  isSending = signal<boolean>(false);
  sendError = signal<string>('');
  transactionSuccess = signal<boolean>(false);
  transactionId = signal<string>('');
  txIdCopied = signal<boolean>(false);
  showConfirmation = signal<boolean>(false);

  // Balance
  sBtcBalance = signal<number>(0);
  isLoadingBalance = signal<boolean>(false);

  // Fee and Price
  fee = signal<number>(0);
  btcPriceInBRL = signal<number>(0); // Price in cents (e.g., 9534562 = R$95,345.62)
  isLoadingPrice = signal<boolean>(false);

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
          console.error('Error fetching sBTC balance:', error);
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

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  sendAnother() {
    this.resetForm();
    this.transactionSuccess.set(false);
    this.transactionId.set('');
    this.showConfirmation.set(false);
  }

  setMaxAmount() {
    const balance = this.sBtcBalance();
    const fee = this.fee();
    if (balance > fee) {
      // Subtract fee from balance to get the maximum sendable amount
      this.sendAmount = balance - fee;
    } else {
      this.sendAmount = 0;
    }
  }

  resetForm() {
    this.recipientAddress = '';
    this.sendAmount = null;
    this.sendMemo = '';
    this.sendError.set('');
    this.isSending.set(false);
  }

  sendBitcoin() {
    if (!this.recipientAddress || !this.sendAmount) {
      this.sendError.set('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (this.sendAmount <= 0) {
      this.sendError.set('A quantidade deve ser maior que zero.');
      return;
    }

    this.sendError.set('');
    this.showConfirmation.set(true);
  }

  cancelConfirmation() {
    this.showConfirmation.set(false);
    this.sendError.set('');
  }

  confirmSend() {
    if (!this.recipientAddress || !this.sendAmount) {
      return;
    }

    this.isSending.set(true);
    this.sendError.set('');

    this.boltContractSBTCService.transferStacksToStacks(
      this.sendAmount,
      this.recipientAddress,
      this.sendMemo
    ).subscribe({
      next: (response) => {
        this.isSending.set(false);
        this.showConfirmation.set(false);
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

  formatBtcPriceBRL(): string {
    const priceInReais = this.btcPriceInBRL() / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(priceInReais);
  }

  formatTransactionId(txId: string): string {
    if (!txId || txId.length <= 16) return txId;
    return `${txId.substring(0, 12)}...${txId.substring(txId.length - 8)}`;
  }

  getBlockchainExplorerUrl(txId: string): string {
    if (!txId) return '';
    // Add 0x prefix if not present and generate Hiro explorer link
    const transactionId = txId.startsWith('0x') ? txId : `0x${txId}`;
    const chain = environment.network === 'mainnet' ? 'mainnet' : 'testnet';
    return `https://explorer.hiro.so/txid/${transactionId}?chain=${chain}`;
  }

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

  formatSats(amount: string): string {
    return new Intl.NumberFormat('pt-BR').format(Number(amount));
  }

  /**
   * Convert satoshis to BRL
   * @param sats Amount in satoshis
   * @returns BRL value formatted as string (e.g., "R$ 1.234,56")
   */
  convertSatsToBRL(sats: number): string {
    if (this.btcPriceInBRL() === 0 || this.isLoadingPrice()) {
      return 'Carregando...';
    }

    // 1 BTC = 100,000,000 sats
    // btcPriceInBRL is in cents (e.g., 9534562 = R$95,345.62)
    const btcPriceInReais = this.btcPriceInBRL() / 100;
    const btcAmount = sats / 100000000;
    const brlValue = btcAmount * btcPriceInReais;

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(brlValue);
  }

  /**
   * Get the total amount including fee
   */
  getTotalAmount(): number {
    return (this.sendAmount || 0) + this.fee();
  }

  /**
   * Get the total amount in BRL including fee
   */
  getTotalAmountInBRL(): string {
    return this.convertSatsToBRL(this.getTotalAmount());
  }
}
