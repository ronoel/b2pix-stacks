import { Component, input, output, ViewEncapsulation, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { sBTCTokenService } from '../../../libs/sbtc-token.service';
import { WalletManagerService } from '../../../libs/wallet/wallet-manager.service';
import { QuoteService } from '../../../shared/api/quote.service';
import { BoltContractSBTCService } from '../../../libs/bolt-contract-sbtc.service';

@Component({
  selector: 'app-add-fund-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content add-fund-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Adicionar Fundos</h2>
          <button class="modal-close" (click)="onClose()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <form (ngSubmit)="onSubmit()" #addFundForm="ngForm">
            <div class="form-group">
              <div class="label-with-toggle">
                <label for="amount" class="form-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Quantidade de {{ showInSats ? 'Satoshis' : 'Bitcoin' }}
                  <span class="required">*</span>
                </label>
                <button
                  type="button"
                  class="unit-toggle-btn"
                  (click)="toggleUnit()"
                  title="Alternar entre BTC e Satoshis">
                  {{ showInSats ? 'sats' : 'BTC' }}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M7 13L12 18L17 13M7 6L12 11L17 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
              <div class="input-with-button">
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  [value]="getDisplayAmount()"
                  [min]="getMinAmount()"
                  [step]="getStepAmount()"
                  class="form-control"
                  [placeholder]="showInSats ? '100000' : '0.00100000'"
                  (input)="onAmountChange($event)"
                  required
                />
                <button
                  type="button"
                  class="btn btn-outline btn-sm max-btn"
                  [disabled]="!hasBalance() || isLoadingBalance()"
                  (click)="setMaxAmount()">
                  Máximo
                </button>
              </div>
              <p class="form-help">
                @if (isLoadingBalance()) {
                  Carregando saldo...
                } @else {
                  Saldo disponível: {{ showInSats ? (getDisplayBalance() | number:'1.0-0') + ' sats' : getDisplayBalance() + ' BTC' }} •
                  Mínimo: {{ showInSats ? (getMinAmount() | number:'1.0-0') + ' sats' : getMinAmount() + ' BTC' }}
                }
              </p>
              @if (amountSats > 0) {
                <div class="brl-equivalent">
                  @if (isLoadingPrice()) {
                    <span class="loading-text">Carregando preço...</span>
                  } @else if (currentBtcPrice() > 0) {
                    <strong>Valor aproximado:</strong> {{ formatBRLEquivalent() }}
                    <span class="equivalent-note">(Baseado no preço atual de mercado)</span>
                  }
                </div>
              }
            </div>

            @if (validationError()) {
              <div class="alert alert-error">
                {{ validationError() }}
              </div>
            }

            <div class="form-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="8" r="1" fill="currentColor"/>
              </svg>
              <div>
                <strong>Importante:</strong> Esta ação requer assinatura da carteira e criará uma transação na blockchain.
              </div>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline" (click)="onClose()" [disabled]="isSubmitting()">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary"
            (click)="onSubmit()"
            [disabled]="!isFormValid() || isSubmitting()"
          >
            @if (isSubmitting()) {
              <div class="btn-spinner"></div>
              Processando...
            } @else {
              Adicionar Fundos
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }
    .modal-content {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    .add-fund-modal {
      max-width: 500px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #E5E7EB;
      flex-shrink: 0;
    }
    .modal-header h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1F2937;
      margin: 0;
    }
    .modal-close {
      background: transparent;
      border: none;
      cursor: pointer;
      color: #6B7280;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
    }
    .modal-close:hover {
      color: #1F2937;
    }
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #E5E7EB;
      flex-shrink: 0;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .form-label .required {
      color: #EF4444;
      margin-left: 2px;
    }
    .form-control {
      width: 100%;
      padding: 12px;
      font-size: 14px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      background: white;
      color: #1F2937;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .form-control:focus {
      outline: none;
      border-color: #1E40AF;
      box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
    }
    .form-control:disabled {
      background: #F3F4F6;
      cursor: not-allowed;
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-suffix {
      position: absolute;
      right: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #6B7280;
      pointer-events: none;
    }
    .form-help {
      margin: 6px 0 0 0;
      font-size: 12px;
      color: #6B7280;
    }
    .label-with-toggle {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .unit-toggle-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      color: #6B7280;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .unit-toggle-btn:hover {
      background: #1E40AF;
      color: white;
      border-color: #1E40AF;
    }
    .input-with-button {
      display: flex;
      gap: 12px;
      align-items: stretch;
    }
    .input-with-button .form-control {
      flex: 1;
    }
    .max-btn {
      white-space: nowrap;
      padding: 12px 16px;
      font-size: 14px;
    }
    .max-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .brl-equivalent {
      margin-top: 12px;
      padding: 12px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      font-size: 13px;
      color: #166534;
    }
    .brl-equivalent strong {
      display: block;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .equivalent-note {
      display: block;
      margin-top: 4px;
      font-size: 11px;
      color: #6B7280;
      font-style: italic;
    }
    .loading-text {
      color: #6B7280;
      font-style: italic;
    }
    .form-info {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 8px;
      font-size: 13px;
      color: #1E40AF;
      margin-top: 20px;
    }
    .form-info svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
    .form-info strong {
      font-weight: 600;
    }
    .alert {
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .alert-error {
      background: #FEE2E2;
      border: 1px solid #FCA5A5;
      color: #991B1B;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary {
      background: #1E40AF;
      color: white;
      border-color: #1E40AF;
    }
    .btn-primary:hover:not(:disabled) {
      background: #1D4ED8;
    }
    .btn-outline {
      background: transparent;
      color: #374151;
      border-color: #D1D5DB;
    }
    .btn-outline:hover:not(:disabled) {
      background: #F9FAFB;
    }
    .btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @media (max-width: 768px) {
      .modal-content {
        max-width: 100%;
        max-height: 95vh;
      }
    }
  `]
})
export class AddFundModalComponent implements OnInit {
  private sBTCTokenService = inject(sBTCTokenService);
  private walletManagerService = inject(WalletManagerService);
  private quoteService = inject(QuoteService);
  private boltContractSBTCService = inject(BoltContractSBTCService);

  isSubmitting = input<boolean>(false);

  close = output<void>();
  addFund = output<number>(); // Emit amount in satoshis

  // State
  amountSats = 0;
  showInSats = true;
  readonly SATS_PER_BTC = 100000000;

  // Signals
  validationError = signal<string | null>(null);
  sBtcBalance = signal<bigint>(BigInt(0));
  isLoadingBalance = signal<boolean>(false);
  currentBtcPrice = signal<number>(0);
  isLoadingPrice = signal<boolean>(false);
  fee = signal<number>(0);

  ngOnInit() {
    this.loadFee();
    this.loadBalance();
    this.loadBtcPrice();
  }

  loadFee() {
    const feeAmount = this.boltContractSBTCService.getFee();
    this.fee.set(feeAmount);
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

  loadBtcPrice() {
    this.isLoadingPrice.set(true);
    this.quoteService.getBtcPrice().subscribe({
      next: (response) => {
        // Convert price from cents to reais
        const priceInReais = parseInt(response.price) / 100;
        this.currentBtcPrice.set(priceInReais);
        this.isLoadingPrice.set(false);
      },
      error: (error) => {
        console.error('Error fetching BTC price:', error);
        this.currentBtcPrice.set(0);
        this.isLoadingPrice.set(false);
      }
    });
  }

  toggleUnit() {
    this.showInSats = !this.showInSats;
  }

  getDisplayAmount(): number {
    return this.showInSats ? this.amountSats : this.amountSats / this.SATS_PER_BTC;
  }

  setDisplayAmount(value: number) {
    if (this.showInSats) {
      this.amountSats = Math.floor(value);
    } else {
      this.amountSats = Math.floor(value * this.SATS_PER_BTC);
    }
  }

  getDisplayBalance(): number {
    const balanceInBtc = Number(this.sBtcBalance()) / this.SATS_PER_BTC;
    return this.showInSats ? Number(this.sBtcBalance()) : balanceInBtc;
  }

  getMinAmount(): number {
    return this.showInSats ? 0.00001 * this.SATS_PER_BTC : 0.00001;
  }

  getStepAmount(): number {
    return this.showInSats ? 1 : 0.00000001;
  }

  onAmountChange(event: any) {
    const value = parseFloat(event.target.value) || 0;
    this.setDisplayAmount(value);
    this.validateForm();
  }

  setMaxAmount() {
    const balanceInSats = Number(this.sBtcBalance());
    const feeInSats = this.fee();

    // Subtract fee from balance to get maximum sellable amount
    if (balanceInSats > feeInSats) {
      this.amountSats = balanceInSats - feeInSats;
    } else {
      this.amountSats = 0;
    }

    this.validateForm();
  }

  hasBalance(): boolean {
    return this.sBtcBalance() > 0n;
  }

  formatBRLEquivalent(): string {
    const btcAmount = this.amountSats / this.SATS_PER_BTC;
    const brlValue = btcAmount * this.currentBtcPrice();
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(brlValue);
  }

  validateForm(): boolean {
    this.validationError.set(null);

    if (this.amountSats <= 0) {
      this.validationError.set('A quantidade deve ser maior que zero');
      return false;
    }

    if (this.amountSats < this.getMinAmount()) {
      this.validationError.set(`A quantidade mínima é ${this.getMinAmount()} ${this.showInSats ? 'sats' : 'BTC'}`);
      return false;
    }

    if (this.amountSats > Number(this.sBtcBalance())) {
      this.validationError.set('Saldo insuficiente');
      return false;
    }

    return true;
  }

  isFormValid(): boolean {
    return this.amountSats > 0 && this.amountSats <= Number(this.sBtcBalance());
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (!this.validateForm() || this.isSubmitting()) {
      return;
    }

    this.addFund.emit(this.amountSats);
  }
}
