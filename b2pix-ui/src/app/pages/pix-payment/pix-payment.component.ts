import { Component, inject, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';

import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PixPaymentService } from '../../shared/api/pix-payment.service';
import { PixPayoutRequestService } from '../../shared/api/pix-payout-request.service';
import { PixPayoutRequest } from '../../shared/models/pix-payout-request.model';
import { sBTCTokenService } from '../../libs/sbtc-token.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { LoadingService } from '../../services/loading.service';
import { QrScannerComponent } from './components/qr-scanner.component';
import { PaymentConfirmationComponent, PixQrData } from './components/payment-confirmation.component';
import { OrderStatusComponent } from '../../components/order-status/order-status.component';
import { PixPaymentHistoryComponent } from './components/pix-payment-history.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { StatusSheetComponent } from '../../components/status-sheet/status-sheet.component';
import { ActivePayoutCardComponent } from '../../components/active-payout-card/active-payout-card.component';

@Component({
  selector: 'app-pix-payment',
  standalone: true,
  imports: [
    QrScannerComponent,
    PaymentConfirmationComponent,
    OrderStatusComponent,
    PixPaymentHistoryComponent,
    PageHeaderComponent,
    StatusSheetComponent,
    ActivePayoutCardComponent
  ],
  templateUrl: './pix-payment.component.html',
  styleUrls: ['./pix-payment.component.scss']
})
export class PixPaymentComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private pixPaymentService = inject(PixPaymentService);
  private payoutRequestService = inject(PixPayoutRequestService);
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
  readonly MAX_PIX_VALUE_CENTS = 100000; // R$ 1.000,00
  readonly SATS_PER_BTC = 100000000;

  // View state
  currentView = signal<'scanner' | 'confirmation' | 'processing' | 'status'>('scanner');

  // Active payout check
  activePayout = signal<PixPayoutRequest | null>(null);

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
  private lastParseError = '';
  private errorDismissTimer?: ReturnType<typeof setTimeout>;

  // Order tracking
  createdOrderId = signal<string | null>(null);

  ngOnInit() {
    this.loadBalance();
    this.loadBtcPrice();
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

  // Active payout check
  checkActivePayouts() {
    const address = this.walletManager.getSTXAddress();
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
      this.showError(this.lastParseError || 'QR Code inválido. Este não parece ser um QR Code PIX válido. Verifique e tente novamente.');
      return;
    }

    if (parsed.valueInCents <= 0) {
      this.showError('QR Code sem valor definido. Apenas QR Codes PIX com valor são aceitos.');
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

        if (error.status === 409) {
          this.checkActivePayouts();
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

  // Parse PIX QR Code (EMV/BR Code format) with full validation
  private parsePixPayload(payload: string): PixQrData | null {
    this.lastParseError = '';

    if (!payload || payload.length < 10) {
      this.lastParseError = 'Código PIX inválido ou muito curto.';
      return null;
    }

    const trimmed = payload.trim();

    if (!trimmed.startsWith('0002')) {
      this.lastParseError = 'Este não parece ser um código PIX válido.';
      return null;
    }

    // Validate CRC16 checksum
    if (!this.validateCrc16(trimmed)) {
      this.lastParseError = 'Código PIX corrompido. Verifique se copiou o código completo.';
      return null;
    }

    // Parse top-level TLV tags
    const tags = this.parseEmvTags(trimmed);

    // Validate format indicator (tag 00 = "01")
    if (tags.get('00') !== '01') {
      this.lastParseError = 'Formato de QR Code PIX não reconhecido.';
      return null;
    }

    // Validate currency (tag 53 = "986" = BRL)
    if (tags.get('53') !== '986') {
      this.lastParseError = 'Apenas QR Codes PIX em Reais (BRL) são aceitos.';
      return null;
    }

    // Parse tag 26 (Merchant Account Info)
    const merchantInfo = tags.get('26');
    if (!merchantInfo) {
      this.lastParseError = 'QR Code sem informações do recebedor.';
      return null;
    }

    const merchantTags = this.parseEmvTags(merchantInfo);

    // Validate GUI = "br.gov.bcb.pix"
    if (merchantTags.get('00')?.toLowerCase() !== 'br.gov.bcb.pix') {
      this.lastParseError = 'QR Code não é do sistema PIX brasileiro.';
      return null;
    }

    // Extract and validate PIX key (sub-tag 01)
    // Dynamic QR codes may use sub-tag 25 (URL) instead — skip key validation in that case
    const pixKey = merchantTags.get('01');
    if (pixKey && !this.validatePixKey(pixKey)) {
      this.lastParseError = 'Chave PIX inválida no QR Code. A chave não possui um formato válido (CPF, CNPJ, telefone com +55, e-mail ou chave aleatória).';
      return null;
    }

    // Extract amount (tag 54)
    let valueInCents = 0;
    const amountStr = tags.get('54');
    if (amountStr) {
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        valueInCents = Math.round(amount * 100);
      }
    }

    // Extract merchant name (tag 59)
    const recipientName = tags.get('59') || null;

    return {
      payload: trimmed,
      valueInCents,
      recipientName
    };
  }

  private parseEmvTags(data: string): Map<string, string> {
    const tags = new Map<string, string>();
    let i = 0;
    while (i < data.length - 3) {
      const tag = data.substring(i, i + 2);
      const length = parseInt(data.substring(i + 2, i + 4), 10);
      if (isNaN(length) || i + 4 + length > data.length) break;
      tags.set(tag, data.substring(i + 4, i + 4 + length));
      i += 4 + length;
    }
    return tags;
  }

  private validateCrc16(payload: string): boolean {
    if (payload.length < 8) return false;

    // CRC is always the last field: data (including "6304") + 4 hex chars
    const dataToCheck = payload.substring(0, payload.length - 4);
    if (!dataToCheck.endsWith('6304')) return false;

    const expectedCrc = payload.substring(payload.length - 4).toUpperCase();
    const computedCrc = this.crc16Ccitt(dataToCheck);

    return computedCrc === expectedCrc;
  }

  private crc16Ccitt(data: string): string {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    const bytes = new TextEncoder().encode(data);

    for (const byte of bytes) {
      crc ^= (byte << 8);
      for (let i = 0; i < 8; i++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  private validatePixKey(key: string): boolean {
    // Phone: starts with +
    if (key.startsWith('+')) {
      return /^\+55\d{10,11}$/.test(key);
    }

    // Email: contains @
    if (key.includes('@')) {
      const parts = key.split('@');
      return parts.length === 2 && parts[0].length > 0 && parts[1].includes('.');
    }

    // EVP/UUID: 36 chars with hyphens
    if (key.length === 36 && key.includes('-')) {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    }

    // CPF: 11 digits
    if (/^\d{11}$/.test(key)) {
      return this.validateCpf(key);
    }

    // CNPJ: 14 digits
    if (/^\d{14}$/.test(key)) {
      return this.validateCnpj(key);
    }

    return false;
  }

  private validateCpf(cpf: string): boolean {
    if (/^(\d)\1+$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder >= 10) remainder = 0;
    if (remainder !== parseInt(cpf[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder >= 10) remainder = 0;
    if (remainder !== parseInt(cpf[10])) return false;

    return true;
  }

  private validateCnpj(cnpj: string): boolean {
    if (/^(\d)\1+$/.test(cnpj)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj[i]) * weights1[i];
    }
    let remainder = sum % 11;
    if ((remainder < 2 ? 0 : 11 - remainder) !== parseInt(cnpj[12])) return false;

    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj[i]) * weights2[i];
    }
    remainder = sum % 11;
    if ((remainder < 2 ? 0 : 11 - remainder) !== parseInt(cnpj[13])) return false;

    return true;
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
