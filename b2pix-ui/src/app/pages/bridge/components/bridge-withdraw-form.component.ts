import { Component, output, signal, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuickAmountChipsComponent } from '../../../components/quick-amount-chips/quick-amount-chips.component';
import { StatusSheetComponent } from '../../../components/status-sheet/status-sheet.component';
import { CameraQrReaderComponent } from '../../../components/camera-qr-reader/camera-qr-reader.component';
import { WithdrawConfig, DecodedBtcAddress } from '../bridge.types';
import { BridgeService } from '../bridge.service';
import { sBTCTokenService } from '../../../libs/sbtc-token.service';
import { QuoteService } from '../../../shared/api/quote.service';
import { formatSats as formatSatsUtil, formatBrlCents } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-bridge-withdraw-form',
  standalone: true,
  imports: [FormsModule, QuickAmountChipsComponent, StatusSheetComponent, CameraQrReaderComponent],
  templateUrl: './bridge-withdraw-form.component.html',
  styleUrl: './bridge-withdraw-form.component.scss',
})
export class BridgeWithdrawFormComponent implements OnInit {
  private bridgeService = inject(BridgeService);
  private sbtcToken = inject(sBTCTokenService);
  private quoteService = inject(QuoteService);

  initiateWithdraw = output<WithdrawConfig & { decoded: DecodedBtcAddress }>();

  // Form fields
  btcAddress = '';
  maxFee = 3_000;

  // QR scanner
  showQrScanner = signal(false);

  // Advanced settings
  showAdvanced = signal(false);

  // Address validation
  addressValid = signal<boolean | null>(null);
  addressError = signal('');
  private decodedAddress: DecodedBtcAddress | null = null;

  // Amount (dual-mode like send-sbtc)
  sendMode = signal<'brl' | 'sats'>('sats');
  amountInSats = signal(0);
  amountInBrl = signal(0);
  selectedQuickAmount = signal(0);

  readonly QUICK_AMOUNTS_BRL = [50, 250, 500, 1000];

  // Balance & Price
  sbtcBalance = signal(0);
  isLoadingBalance = signal(false);
  btcPriceInBRL = signal(0); // cents
  isLoadingPrice = signal(false);

  // Confirmation sheet
  showConfirmation = signal(false);
  sendError = signal('');
  isSending = signal(false);

  // Computed
  readonly sendAmountCents = computed(() => Math.round(this.amountInBrl() * 100));

  readonly feeCents = computed(() => {
    if (this.btcPriceInBRL() === 0) return 0;
    const btcPriceReais = this.btcPriceInBRL() / 100;
    const feeBtc = this.maxFee / 1e8;
    return Math.round(feeBtc * btcPriceReais * 100);
  });

  readonly totalSats = computed(() => this.amountInSats() + this.maxFee);

  readonly totalCents = computed(() => this.sendAmountCents() + this.feeCents());

  readonly balanceBrl = computed(() => {
    if (this.btcPriceInBRL() === 0) return 0;
    return (this.sbtcBalance() / 1e8) * (this.btcPriceInBRL() / 100);
  });

  readonly disabledQuickAmounts = computed(() =>
    this.QUICK_AMOUNTS_BRL.filter(a => this.balanceBrl() < a)
  );

  readonly canSubmit = computed(() =>
    this.addressValid() === true &&
    this.amountInSats() > 0 &&
    this.totalSats() <= this.sbtcBalance()
  );

  ngOnInit(): void {
    this.loadBalance();
    this.loadBtcPrice();
  }

  // ===== Data loading =====

  loadBalance(): void {
    this.isLoadingBalance.set(true);
    this.sbtcToken.getBalance().subscribe({
      next: (bal) => { this.sbtcBalance.set(bal); this.isLoadingBalance.set(false); },
      error: () => this.isLoadingBalance.set(false),
    });
  }

  loadBtcPrice(): void {
    this.isLoadingPrice.set(true);
    this.quoteService.getBtcPrice().subscribe({
      next: (res) => { this.btcPriceInBRL.set(Number(res.price)); this.isLoadingPrice.set(false); },
      error: () => this.isLoadingPrice.set(false),
    });
  }

  // ===== Address validation =====

  validateAddress(): void {
    if (!this.btcAddress.trim()) {
      this.addressValid.set(null);
      this.addressError.set('');
      this.decodedAddress = null;
      return;
    }
    try {
      this.decodedAddress = this.bridgeService.validateWithdrawalAddress(this.btcAddress.trim());
      this.addressValid.set(true);
      this.addressError.set('');
    } catch (err) {
      this.addressValid.set(false);
      this.addressError.set((err as Error).message);
      this.decodedAddress = null;
    }
  }

  // ===== QR Scanner =====

  openQrScanner(): void {
    this.showQrScanner.set(true);
  }

  closeQrScanner(): void {
    this.showQrScanner.set(false);
  }

  onQrScanned(value: string): void {
    this.showQrScanner.set(false);
    // Handle bitcoin: URI scheme
    let address = value;
    if (address.toLowerCase().startsWith('bitcoin:')) {
      address = address.substring(8).split('?')[0];
    }
    this.btcAddress = address;
    this.validateAddress();
  }

  // ===== Amount handling =====

  onAmountChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.selectedQuickAmount.set(0);
    this.amountInBrl.set(value);
    if (this.btcPriceInBRL() > 0 && value > 0) {
      const btcPrice = this.btcPriceInBRL() / 100;
      this.amountInSats.set(Math.round((value / btcPrice) * 1e8));
    } else {
      this.amountInSats.set(0);
    }
  }

  onSatsAmountChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value) || 0;
    this.selectedQuickAmount.set(0);
    this.amountInSats.set(value);
    if (this.btcPriceInBRL() > 0 && value > 0) {
      const btcPrice = this.btcPriceInBRL() / 100;
      this.amountInBrl.set(Math.round(((value / 1e8) * btcPrice) * 100) / 100);
    } else {
      this.amountInBrl.set(0);
    }
  }

  selectQuickAmount(brlAmount: number): void {
    this.selectedQuickAmount.set(brlAmount);
    this.amountInBrl.set(brlAmount);
    if (this.btcPriceInBRL() > 0) {
      const btcPrice = this.btcPriceInBRL() / 100;
      this.amountInSats.set(Math.round((brlAmount / btcPrice) * 1e8));
    }
  }

  setMaxAmount(): void {
    const maxSats = Math.max(0, this.sbtcBalance() - this.maxFee);
    this.amountInSats.set(maxSats);
    if (this.btcPriceInBRL() > 0 && maxSats > 0) {
      const btcPrice = this.btcPriceInBRL() / 100;
      this.amountInBrl.set(Math.round(((maxSats / 1e8) * btcPrice) * 100) / 100);
    } else {
      this.amountInBrl.set(0);
    }
    this.selectedQuickAmount.set(-1);
  }

  // ===== Review & Submit =====

  reviewSend(): void {
    if (!this.btcAddress.trim()) {
      this.sendError.set('Informe o endereço Bitcoin de destino.');
      return;
    }
    if (this.addressValid() !== true) {
      this.sendError.set('Endereço Bitcoin inválido.');
      return;
    }
    if (this.amountInSats() <= 0) {
      this.sendError.set('Informe um valor válido.');
      return;
    }
    if (this.totalSats() > this.sbtcBalance()) {
      this.sendError.set('Saldo insuficiente (valor + taxa excede o saldo).');
      return;
    }
    this.sendError.set('');
    this.showConfirmation.set(true);
  }

  cancelConfirmation(): void {
    this.showConfirmation.set(false);
    this.sendError.set('');
  }

  confirmSend(): void {
    if (!this.decodedAddress) return;

    this.initiateWithdraw.emit({
      btcAddress: this.btcAddress.trim(),
      amount: this.amountInSats(),
      maxFee: this.maxFee,
      decoded: this.decodedAddress,
    });

    this.showConfirmation.set(false);
  }

  // ===== Formatting =====

  formatSats(sats: number): string {
    return formatSatsUtil(sats);
  }

  formatBRL(cents: number): string {
    return formatBrlCents(cents);
  }

  truncateAddress(address: string): string {
    if (!address || address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  }
}
