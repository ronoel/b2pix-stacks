import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PixPaymentService } from '../../shared/api/pix-payment.service';
import { sBTCTokenService } from '../../libs/sbtc-token.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { LoadingService } from '../../services/loading.service';
import { QrScannerComponent } from './components/qr-scanner.component';
import { PaymentConfirmationComponent, PixQrData } from './components/payment-confirmation.component';
import { PaymentStatusComponent } from './components/payment-status.component';
import { PixPaymentHistoryComponent } from './components/pix-payment-history.component';

@Component({
  selector: 'app-pix-payment',
  standalone: true,
  imports: [
    CommonModule,
    QrScannerComponent,
    PaymentConfirmationComponent,
    PaymentStatusComponent,
    PixPaymentHistoryComponent
  ],
  templateUrl: './pix-payment.component.html',
  styleUrls: ['./pix-payment.component.scss']
})
export class PixPaymentComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private pixPaymentService = inject(PixPaymentService);
  private sBTCTokenService = inject(sBTCTokenService);
  private walletManager = inject(WalletManagerService);
  protected loadingService = inject(LoadingService);

  // Constants
  readonly MAX_PIX_VALUE_CENTS = 100000; // R$ 1.000,00
  readonly SATS_PER_BTC = 100000000;

  // View state
  currentView = signal<'scanner' | 'confirmation' | 'processing' | 'status'>('scanner');

  // QR data
  qrData = signal<PixQrData | null>(null);

  // Pricing
  currentBtcPrice = signal(0); // BTC price in BRL (with markup)
  amountInSats = signal(0);
  private priceSubscription?: Subscription;

  // Balance
  sBtcBalance = signal(0);
  isLoadingBalance = signal(false);

  // Network fee
  fee = computed(() => this.pixPaymentService.getFee());

  // Processing
  isProcessing = signal(false);
  errorMessage = signal('');
  showErrorModal = signal(false);

  // Order tracking
  createdOrderId = signal<string | null>(null);

  ngOnInit() {
    this.loadBalance();
    this.loadBtcPrice();
  }

  ngOnDestroy() {
    if (this.priceSubscription) {
      this.priceSubscription.unsubscribe();
    }
  }

  // Balance
  loadBalance() {
    const address = this.walletManager.getSTXAddress();
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

  // Quote
  loadBtcPrice() {
    this.priceSubscription = this.pixPaymentService.getBtcPrice().subscribe({
      next: (quote) => {
        const priceInCents = parseInt(quote.price, 10);
        this.currentBtcPrice.set(priceInCents / 100);
      },
      error: (error) => {
        console.error('Error fetching BTC price:', error);
      }
    });
  }

  // QR Code scanned
  onQrCodeScanned(payload: string) {
    const parsed = this.parsePixPayload(payload);

    if (!parsed) {
      this.errorMessage.set('QR Code invalido. Este nao parece ser um QR Code PIX valido.');
      this.showErrorModal.set(true);
      return;
    }

    if (parsed.valueInCents <= 0) {
      this.errorMessage.set('Este QR Code nao possui um valor definido. Apenas QR Codes com valor sao aceitos.');
      this.showErrorModal.set(true);
      return;
    }

    if (parsed.valueInCents > this.MAX_PIX_VALUE_CENTS) {
      const maxBrl = (this.MAX_PIX_VALUE_CENTS / 100).toFixed(2);
      this.errorMessage.set(`O valor de R$ ${this.formatCurrency(parsed.valueInCents / 100)} excede o limite de R$ ${maxBrl} por operacao.`);
      this.showErrorModal.set(true);
      return;
    }

    // Calculate sats
    if (this.currentBtcPrice() > 0) {
      const sats = this.pixPaymentService.brlToSats(
        parsed.valueInCents / 100,
        this.currentBtcPrice()
      );
      this.amountInSats.set(sats);
    }

    this.qrData.set(parsed);
    this.currentView.set('confirmation');
  }

  // Confirm payment
  onPaymentConfirmed() {
    const data = this.qrData();
    if (!data || this.amountInSats() <= 0) return;

    this.isProcessing.set(true);
    this.currentView.set('processing');
    this.loadingService.show('Criando transacao de pagamento...');

    this.pixPaymentService.createPixPayment(data.payload, this.amountInSats()).subscribe({
      next: (order) => {
        this.isProcessing.set(false);
        this.loadingService.hide();
        this.createdOrderId.set(order.id);
        this.currentView.set('status');
      },
      error: (error) => {
        console.error('Error creating PIX payment:', error);
        this.isProcessing.set(false);
        this.loadingService.hide();

        if (error.message?.includes('cancelada') || error.message?.includes('cancelled')) {
          this.currentView.set('confirmation');
          return;
        }

        this.errorMessage.set(this.getErrorMessage(error));
        this.showErrorModal.set(true);
        this.currentView.set('confirmation');
      }
    });
  }

  // Cancel confirmation
  onConfirmationCancelled() {
    this.qrData.set(null);
    this.amountInSats.set(0);
    this.currentView.set('scanner');
  }

  // Parse PIX QR Code (EMV/BR Code format)
  private parsePixPayload(payload: string): PixQrData | null {
    if (!payload || payload.length < 10) return null;

    // PIX QR codes start with "00020126" (EMV format)
    // or can be a URL-based PIX code
    const isEmvFormat = payload.startsWith('0002');
    const isPixUrl = payload.toLowerCase().includes('pix') || payload.toLowerCase().startsWith('http');

    if (!isEmvFormat && !isPixUrl) {
      return null;
    }

    let valueInCents = 0;
    let recipientName: string | null = null;

    if (isEmvFormat) {
      // Parse EMV TLV format
      // Tag 54 = Transaction Amount
      const amountMatch = payload.match(/54(\d{2})(\d+\.?\d*)/);
      if (amountMatch) {
        const length = parseInt(amountMatch[1], 10);
        const amountStr = payload.substring(
          payload.indexOf(amountMatch[0]) + 4,
          payload.indexOf(amountMatch[0]) + 4 + length
        );
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) {
          valueInCents = Math.round(amount * 100);
        }
      }

      // Tag 59 = Merchant Name
      const nameTagIndex = this.findEmvTag(payload, '59');
      if (nameTagIndex >= 0) {
        recipientName = this.extractEmvValue(payload, nameTagIndex);
      }
    }

    return {
      payload,
      valueInCents,
      recipientName
    };
  }

  private findEmvTag(data: string, tag: string): number {
    let i = 0;
    while (i < data.length - 4) {
      const currentTag = data.substring(i, i + 2);
      const length = parseInt(data.substring(i + 2, i + 4), 10);
      if (isNaN(length)) break;

      if (currentTag === tag) {
        return i;
      }
      i += 4 + length;
    }
    return -1;
  }

  private extractEmvValue(data: string, tagIndex: number): string | null {
    const length = parseInt(data.substring(tagIndex + 2, tagIndex + 4), 10);
    if (isNaN(length)) return null;
    return data.substring(tagIndex + 4, tagIndex + 4 + length);
  }

  private getErrorMessage(error: any): string {
    if (error?.error?.error) return error.error.error;
    if (error?.message) return error.message;
    return 'Ocorreu um erro ao processar o pagamento. Tente novamente.';
  }

  // Modal
  closeErrorModal() {
    this.showErrorModal.set(false);
    this.errorMessage.set('');
  }

  // Navigation
  goBack() {
    if (this.currentView() === 'confirmation') {
      this.onConfirmationCancelled();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  onViewOrder(orderId: string) {
    this.createdOrderId.set(orderId);
    this.currentView.set('status');
  }

  // Formatting
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
