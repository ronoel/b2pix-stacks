import { Component, inject, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';

import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PixPaymentService } from '../../shared/api/pix-payment.service';
import { sBTCTokenService } from '../../libs/sbtc-token.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { LoadingService } from '../../services/loading.service';
import { QrScannerComponent } from './components/qr-scanner.component';
import { PaymentConfirmationComponent, PixQrData } from './components/payment-confirmation.component';
import { OrderStatusComponent } from '../../components/order-status/order-status.component';
import { PixPaymentHistoryComponent } from './components/pix-payment-history.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { StatusSheetComponent } from '../../components/status-sheet/status-sheet.component';

@Component({
  selector: 'app-pix-payment',
  standalone: true,
  imports: [
    QrScannerComponent,
    PaymentConfirmationComponent,
    OrderStatusComponent,
    PixPaymentHistoryComponent,
    PageHeaderComponent,
    StatusSheetComponent
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

  constructor() {
    effect(() => {
      this.currentView();
      window.scrollTo({ top: 0 });
    });
  }

  // Constants
  readonly MIN_PIX_VALUE_CENTS = 5000; // R$ 50,00
  readonly MAX_PIX_VALUE_CENTS = 100000; // R$ 1.000,00
  readonly SATS_PER_BTC = 100000000;

  // View state
  currentView = signal<'scanner' | 'confirmation' | 'processing' | 'status'>('scanner');

  // P2P warning acknowledgment
  p2pWarningAccepted = signal(sessionStorage.getItem('p2p_warning_accepted') === 'true');

  // QR data
  qrData = signal<PixQrData | null>(null);

  // Pricing
  currentBtcPrice = signal(0); // BTC price in BRL (with markup)
  amountInSats = signal(0);
  private priceSubscription?: Subscription;

  // Balance
  sBtcBalance = signal(0);
  isLoadingBalance = signal(false);

  // Network fee (in sats)
  fee = computed(() => this.pixPaymentService.getFee());

  // BRL-converted values
  feeInBrl = computed(() => {
    const price = this.currentBtcPrice();
    if (price <= 0) return 0;
    return (this.fee() / this.SATS_PER_BTC) * price;
  });

  totalInBrl = computed(() => {
    const pixValue = (this.qrData()?.valueInCents ?? 0) / 100;
    return pixValue + this.feeInBrl();
  });

  balanceInBrl = computed(() => {
    const price = this.currentBtcPrice();
    if (price <= 0) return 0;
    return (this.sBtcBalance() / this.SATS_PER_BTC) * price;
  });

  balanceAfterPaymentBrl = computed(() => {
    return this.balanceInBrl() - this.totalInBrl();
  });

  showConfirmation = computed(() =>
    this.currentView() === 'confirmation' && this.qrData() !== null
  );

  // Processing
  isProcessing = signal(false);
  errorMessage = signal('');
  private errorDismissTimer?: ReturnType<typeof setTimeout>;

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
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
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

  onP2pWarningAccepted(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.p2pWarningAccepted.set(checked);
    if (checked) {
      sessionStorage.setItem('p2p_warning_accepted', 'true');
    } else {
      sessionStorage.removeItem('p2p_warning_accepted');
    }
  }

  // QR Code scanned
  onQrCodeScanned(payload: string) {
    const parsed = this.parsePixPayload(payload);

    if (!parsed) {
      this.showError('QR Code inválido. Este não parece ser um QR Code PIX válido. Verifique e tente novamente.');
      return;
    }

    if (parsed.valueInCents <= 0) {
      this.showError('QR Code sem valor definido. Apenas QR Codes PIX com valor são aceitos.');
      return;
    }

    if (parsed.valueInCents < this.MIN_PIX_VALUE_CENTS) {
      const minBrl = this.formatCurrency(this.MIN_PIX_VALUE_CENTS / 100);
      const valBrl = this.formatCurrency(parsed.valueInCents / 100);
      this.showError(`Valor abaixo do mínimo. O valor de R$ ${valBrl} é menor que o mínimo de R$ ${minBrl} por operação.`);
      return;
    }

    if (parsed.valueInCents > this.MAX_PIX_VALUE_CENTS) {
      const maxBrl = this.formatCurrency(this.MAX_PIX_VALUE_CENTS / 100);
      const valBrl = this.formatCurrency(parsed.valueInCents / 100);
      this.showError(`Valor acima do limite. O valor de R$ ${valBrl} excede o limite de R$ ${maxBrl} por operação.`);
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
    this.loadingService.show('Criando transação de pagamento...');

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

        this.currentView.set('confirmation');
        this.showError(this.getErrorMessage(error));
      }
    });
  }

  // Cancel confirmation
  onConfirmationCancelled() {
    this.qrData.set(null);
    this.amountInSats.set(0);
    this.currentView.set('scanner');
  }

  // Reset to scanner for "Fazer outro pagamento"
  resetToScanner() {
    this.qrData.set(null);
    this.amountInSats.set(0);
    this.createdOrderId.set(null);
    this.errorMessage.set('');
    this.currentView.set('scanner');
  }

  // Error handling — inline banner with auto-dismiss
  showError(message: string) {
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
    }
    this.errorMessage.set(message);
    this.errorDismissTimer = setTimeout(() => {
      this.errorMessage.set('');
    }, 8000);
  }

  dismissError() {
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
    }
    this.errorMessage.set('');
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

  // Navigation
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

  formatBrl(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
