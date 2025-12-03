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
  template: `
    <div class="send-sbtc-page">
      <div class="container">
        <div class="page-header">
          <button class="back-button" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Voltar
          </button>
          <h1>Enviar Bitcoin</h1>
          <p class="page-subtitle">Transferir sBTC para outra carteira na Stacks Blockchain</p>
        </div>

        <div class="send-card">
          @if (transactionSuccess()) {
            <div class="success-state">
              <div class="success-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h2>Transação Enviada com Sucesso!</h2>
              <p>Sua transação foi transmitida para a blockchain.</p>

              @if (transactionId()) {
                <div class="transaction-info">
                  <label>ID da Transação</label>
                  <div class="transaction-id-display">
                    <code>{{ formatTransactionId(transactionId()) }}</code>
                    <button class="btn-copy-sm" (click)="copyTransactionId()" [disabled]="txIdCopied()">
                      @if (txIdCopied()) {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      } @else {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                          <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
                        </svg>
                      }
                    </button>
                  </div>

                  <a
                    [href]="getBlockchainExplorerUrl(transactionId())"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-primary explorer-btn"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M15 3H21V9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Ver no Blockchain Explorer
                  </a>
                </div>
              }

              <div class="success-actions">
                <button class="btn btn-outline" (click)="sendAnother()">Enviar Outra Transação</button>
                <button class="btn btn-primary" (click)="goToDashboard()">Voltar ao Dashboard</button>
              </div>
            </div>
          } @else {
            <form (ngSubmit)="sendBitcoin()">
              @if (sendError()) {
                <div class="error-banner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <p>{{ sendError() }}</p>
                </div>
              }

              <div class="form-group">
                <label class="form-label" for="recipientAddress">
                  Endereço do Destinatário
                  <span class="required">*</span>
                </label>
                <input
                  type="text"
                  id="recipientAddress"
                  class="form-input"
                  [(ngModel)]="recipientAddress"
                  name="recipientAddress"
                  placeholder="SP2..."
                  required
                  [disabled]="isSending()"
                />
                <small class="form-hint">Endereço Stacks do destinatário</small>
              </div>

              <div class="form-group">
                <label class="form-label" for="sendAmount">
                  Quantidade
                  <span class="required">*</span>
                </label>
                <div class="input-with-button">
                  <input
                    type="number"
                    id="sendAmount"
                    class="form-input"
                    [(ngModel)]="sendAmount"
                    name="sendAmount"
                    placeholder="100000"
                    min="1"
                    required
                    [disabled]="isSending()"
                  />
                  <button
                    type="button"
                    class="btn-max"
                    (click)="setMaxAmount()"
                    [disabled]="isSending() || isLoadingBalance()"
                  >
                    Máximo
                  </button>
                </div>
                <div class="balance-info">
                  @if (isLoadingBalance()) {
                    <small class="form-hint">Carregando saldo...</small>
                  } @else {
                    <small class="form-hint">Saldo disponível: {{ formatSats(sBtcBalance().toString()) }} sats</small>
                  }
                  <small class="form-hint">1 BTC = 100,000,000 sats</small>
                </div>

                @if (sendAmount && sendAmount > 0) {
                  <div class="transaction-summary">
                    <div class="summary-row">
                      <span class="summary-label">Quantidade a enviar:</span>
                      <span class="summary-value">
                        {{ formatSats(sendAmount.toString()) }} sats
                        <span class="brl-value">≈ {{ convertSatsToBRL(sendAmount) }}</span>
                      </span>
                    </div>
                    <div class="summary-row">
                      <span class="summary-label">Taxa de rede:</span>
                      <span class="summary-value">
                        {{ formatSats(fee().toString()) }} sats
                        <span class="brl-value">≈ {{ convertSatsToBRL(fee()) }}</span>
                      </span>
                    </div>
                  </div>
                }
              </div>

              <div class="form-group">
                <label class="form-label" for="sendMemo">
                  Memo (opcional)
                </label>
                <input
                  type="text"
                  id="sendMemo"
                  class="form-input"
                  [(ngModel)]="sendMemo"
                  name="sendMemo"
                  placeholder="Nota opcional..."
                  maxlength="34"
                  [disabled]="isSending()"
                />
                <small class="form-hint">Máximo 34 caracteres</small>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-outline" (click)="goBack()" [disabled]="isSending()">
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  [disabled]="isSending() || !recipientAddress || !sendAmount || sendAmount <= 0"
                >
                  @if (isSending()) {
                    <div class="loading-spinner-sm"></div>
                    Enviando...
                  } @else {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M5 12L12 5L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Enviar Bitcoin
                  }
                </button>
              </div>
            </form>
          }
        </div>

        <div class="info-section">
          <div class="info-card">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div>
              <h3>Sobre o sBTC</h3>
              <p>sBTC é Bitcoin ancorado na Stacks blockchain. Você pode enviar sBTC para qualquer endereço Stacks válido.</p>
            </div>
          </div>

          <div class="info-card">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2V22" stroke="currentColor" stroke-width="2"/>
              <path d="M17 5H9.5C7.01472 5 5 7.01472 5 9.5C5 11.9853 7.01472 14 9.5 14H14.5C16.9853 14 19 16.0147 19 18.5C19 20.9853 16.9853 23 14.5 23H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div>
              <h3>Taxas de Rede</h3>
              <p>Uma taxa de rede será cobrada para processar sua transação na blockchain.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .send-sbtc-page {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 32px 0;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 20px;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .back-button {
      display: flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      color: #6B7280;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      padding: 8px;
      margin-bottom: 16px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .back-button:hover {
      background: #F3F4F6;
      color: #1F2937;
    }

    .page-header h1 {
      font-size: 36px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .page-subtitle {
      font-size: 16px;
      color: #6B7280;
      margin: 0;
    }

    .send-card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .required {
      color: #DC2626;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      color: #1F2937;
      transition: all 0.2s ease;
      box-sizing: border-box;
      font-family: inherit;
    }

    .form-input:focus {
      outline: none;
      border-color: #F59E0B;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    }

    .form-input:disabled {
      background: #F9FAFB;
      cursor: not-allowed;
    }

    .form-hint {
      display: block;
      font-size: 12px;
      color: #6B7280;
      margin-top: 6px;
    }

    .input-with-button {
      display: flex;
      gap: 8px;
    }

    .input-with-button .form-input {
      flex: 1;
    }

    .btn-max {
      padding: 12px 16px;
      background: #F59E0B;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-max:hover:not(:disabled) {
      background: #D97706;
    }

    .btn-max:disabled {
      background: #D1D5DB;
      cursor: not-allowed;
    }

    .balance-info {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 6px;
    }

    .transaction-summary {
      margin-top: 16px;
      padding: 16px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8px 0;
      font-size: 14px;
    }

    .summary-row:not(:last-child) {
      border-bottom: 1px solid #E5E7EB;
    }

    .summary-row.total {
      margin-top: 4px;
      padding-top: 12px;
      font-weight: 600;
      color: #1F2937;
    }

    .summary-label {
      color: #6B7280;
      font-weight: 500;
    }

    .summary-row.total .summary-label {
      color: #1F2937;
    }

    .summary-value {
      text-align: right;
      color: #1F2937;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .brl-value {
      font-size: 12px;
      color: #6B7280;
      font-weight: 400;
    }

    .summary-row.total .brl-value {
      color: #059669;
      font-weight: 600;
      font-size: 13px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #E5E7EB;
    }

    .error-banner {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #FEE2E2;
      border: 1px solid #FCA5A5;
      border-radius: 8px;
      color: #991B1B;
      margin-bottom: 24px;
    }

    .error-banner svg {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .error-banner p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .success-state {
      text-align: center;
      padding: 24px;
    }

    .success-icon {
      display: inline-flex;
      padding: 16px;
      background: #D1FAE5;
      border-radius: 50%;
      color: #059669;
      margin-bottom: 24px;
    }

    .success-state h2 {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .success-state > p {
      font-size: 16px;
      color: #6B7280;
      margin: 0 0 32px 0;
    }

    .transaction-info {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      text-align: left;
    }

    .transaction-info label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .transaction-id-display {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px;
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .transaction-id-display code {
      flex: 1;
      font-size: 13px;
      color: #1F2937;
      word-break: break-all;
      font-family: 'Courier New', monospace;
    }

    .btn-copy-sm {
      display: flex;
      align-items: center;
      padding: 6px;
      background: #F3F4F6;
      color: #6B7280;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-copy-sm:hover:not(:disabled) {
      background: #E5E7EB;
      color: #1F2937;
    }

    .btn-copy-sm:disabled {
      color: #059669;
    }

    .explorer-btn {
      width: 100%;
      justify-content: center;
    }

    .success-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .info-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-card {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: white;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
    }

    .info-card svg {
      flex-shrink: 0;
      color: #F59E0B;
      margin-top: 2px;
    }

    .info-card h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .info-card p {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .send-sbtc-page {
        padding: 24px 0;
      }

      .page-header h1 {
        font-size: 28px;
      }

      .send-card {
        padding: 24px;
      }

      .form-actions {
        flex-direction: column;
      }

      .form-actions button {
        width: 100%;
      }

      .success-actions {
        flex-direction: column;
      }

      .success-actions button {
        width: 100%;
      }

      .balance-info {
        flex-direction: column;
        gap: 4px;
      }

      .summary-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .summary-value {
        align-items: flex-start;
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .page-header h1 {
        font-size: 24px;
      }

      .send-card {
        padding: 20px;
      }
    }
  `]
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

  // Balance
  sBtcBalance = signal<bigint>(BigInt(0));
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
  }

  setMaxAmount() {
    const balance = this.sBtcBalance();
    const fee = BigInt(this.fee());
    if (balance > fee) {
      // Subtract fee from balance to get the maximum sendable amount
      this.sendAmount = Number(balance - fee);
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

    this.isSending.set(true);
    this.sendError.set('');

    console.log('Enviando', this.sendAmount, 'sats para', this.recipientAddress);

    this.boltContractSBTCService.transferStacksToStacks(
      this.sendAmount,
      this.recipientAddress,
      this.sendMemo
    ).subscribe({
      next: (response) => {
        this.isSending.set(false);
        this.transactionSuccess.set(true);

        // Extract transaction ID from response
        if (response.txid) {
          this.transactionId.set(response.txid);
        }
      },
      error: (error) => {
        this.isSending.set(false);
        console.error('Error sending Bitcoin:', error);

        // Extract error message
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
