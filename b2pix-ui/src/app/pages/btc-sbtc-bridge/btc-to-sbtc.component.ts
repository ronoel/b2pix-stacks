import { Component, OnInit, signal, inject, ViewEncapsulation } from '@angular/core';

import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { buildSbtcDepositAddress, MAINNET, TESTNET, SbtcApiClientMainnet, SbtcApiClientTestnet } from 'sbtc';
import { request } from '@stacks/connect';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-btc-to-sbtc',
  standalone: true,
  imports: [FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="btc-pegging-container">
      <div class="container">
        <!-- Header -->
        <div class="page-header">
          <button class="btn-back" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Voltar
          </button>
          <h1 class="page-title">Peg BTC para sBTC</h1>
          <p class="page-subtitle">Converta seu Bitcoin em sBTC na rede Stacks</p>
        </div>

        <!-- Main Content -->
        <div class="content-card">
          @if (currentStep() === 'form') {
            <!-- Step 1: Input Form -->
            <div class="form-section">
              <h2 class="section-title">Detalhes do Depósito</h2>

              <div class="info-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>Você receberá sBTC no seu endereço Stacks. O processo leva aproximadamente 20 minutos.</p>
              </div>

              <div class="form-group">
                <label class="form-label">Endereço Stacks (Receptor)</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="stacksAddress"
                  placeholder="SP..."
                  readonly
                />
                <span class="form-hint">Este é o endereço onde você receberá o sBTC</span>
              </div>

              <div class="form-group">
                <label class="form-label">Quantidade (satoshis)</label>
                <input
                  type="number"
                  class="form-input"
                  [(ngModel)]="amount"
                  placeholder="100000"
                  min="100000"
                />
                <span class="form-hint">Mínimo: 100,000 sats (0.001 BTC)</span>
              </div>

              <div class="form-group">
                <label class="form-label">Taxa Máxima do Assinante (satoshis)</label>
                <input
                  type="number"
                  class="form-input"
                  [(ngModel)]="maxSignerFee"
                  placeholder="4000"
                />
                <span class="form-hint">Padrão: 4,000 sats. Esta taxa será deduzida do valor cunhado.</span>
              </div>

              <div class="form-group">
                <label class="form-label">Tempo de Bloqueio para Reivindicação (blocos)</label>
                <input
                  type="number"
                  class="form-input"
                  [(ngModel)]="reclaimLockTime"
                  placeholder="700"
                />
                <span class="form-hint">Padrão: 700 blocos. Após este período, você pode recuperar seus fundos se necessário.</span>
              </div>

              @if (errorMessage()) {
                <div class="error-banner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <p>{{ errorMessage() }}</p>
                </div>
              }

              <button
                class="btn btn-primary btn-full"
                (click)="generateDepositAddress()"
                [disabled]="isLoading()"
              >
                @if (isLoading()) {
                  <div class="loading-spinner-sm"></div>
                  Gerando Endereço...
                } @else {
                  Gerar Endereço de Depósito
                }
              </button>
            </div>
          }

          @if (currentStep() === 'deposit') {
            <!-- Step 2: Deposit Address Generated -->
            <div class="deposit-section">
              <h2 class="section-title">Endereço de Depósito Gerado</h2>

              <div class="success-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>Endereço de depósito criado com sucesso!</p>
              </div>

              <div class="deposit-info">
                <div class="info-item">
                  <label class="info-label">Endereço de Depósito</label>
                  <div class="address-display">
                    <code>{{ depositAddress() }}</code>
                    <button class="btn-copy" (click)="copyAddress()" [disabled]="addressCopied()">
                      @if (addressCopied()) {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Copiado!
                      } @else {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                          <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        Copiar
                      }
                    </button>
                  </div>
                </div>

                <div class="info-item">
                  <label class="info-label">Quantidade</label>
                  <p class="info-value">{{ amount }} satoshis</p>
                </div>
              </div>

              <div class="info-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>Envie Bitcoin para este endereço usando sua carteira Bitcoin. O processo será concluído automaticamente.</p>
              </div>

              @if (errorMessage()) {
                <div class="error-banner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <p>{{ errorMessage() }}</p>
                </div>
              }

              <div class="button-group">
                <button
                  class="btn btn-primary"
                  (click)="sendBitcoinTransaction()"
                  [disabled]="isLoading()"
                >
                  @if (isLoading()) {
                    <div class="loading-spinner-sm"></div>
                    Enviando...
                  } @else {
                    Enviar Bitcoin
                  }
                </button>
                <button
                  class="btn btn-secondary"
                  (click)="reset()"
                >
                  Reiniciar
                </button>
              </div>
            </div>
          }

          @if (currentStep() === 'processing') {
            <!-- Step 3: Transaction Sent -->
            <div class="processing-section">
              <h2 class="section-title">Transação em Processamento</h2>

              <div class="success-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>Transação Bitcoin enviada com sucesso!</p>
              </div>

              <div class="deposit-info">
                <div class="info-item">
                  <label class="info-label">ID da Transação</label>
                  <div class="address-display">
                    <code>{{ transactionId() }}</code>
                    <button class="btn-copy" (click)="copyTxId()" [disabled]="txIdCopied()">
                      @if (txIdCopied()) {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Copiado!
                      } @else {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                          <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        Copiar
                      }
                    </button>
                  </div>
                </div>

                @if (depositStatus()) {
                  <div class="info-item">
                    <label class="info-label">Status</label>
                    <p class="info-value">{{ depositStatus() }}</p>
                  </div>
                }
              </div>

              <div class="info-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>Você receberá seu sBTC em aproximadamente 20 minutos ou após 1-2 confirmações na rede Bitcoin.</p>
              </div>

              <div class="button-group">
                <button
                  class="btn btn-primary"
                  (click)="checkBalance()"
                  [disabled]="isLoading()"
                >
                  @if (isLoading()) {
                    <div class="loading-spinner-sm"></div>
                    Verificando...
                  } @else {
                    Verificar Saldo
                  }
                </button>
                <button
                  class="btn btn-secondary"
                  (click)="goBack()"
                >
                  Voltar ao Dashboard
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .btc-pegging-container {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 24px 0;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      color: #6B7280;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 16px;
    }

    .btn-back:hover {
      background: #F9FAFB;
      border-color: #D1D5DB;
      color: #374151;
    }

    .page-title {
      font-size: 32px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .page-subtitle {
      font-size: 16px;
      color: #6B7280;
      margin: 0;
    }

    .content-card {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .section-title {
      font-size: 24px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 24px 0;
    }

    .form-section,
    .deposit-section,
    .processing-section {
      max-width: 600px;
      margin: 0 auto;
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

    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      color: #1F2937;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #F59E0B;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    }

    .form-input:disabled,
    .form-input:read-only {
      background: #F9FAFB;
      color: #6B7280;
      cursor: not-allowed;
    }

    .form-hint {
      display: block;
      font-size: 12px;
      color: #6B7280;
      margin-top: 6px;
    }

    .info-banner {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #DBEAFE;
      border: 1px solid #93C5FD;
      border-radius: 8px;
      color: #1E40AF;
      margin-bottom: 24px;
    }

    .info-banner svg {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .info-banner p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .success-banner {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #D1FAE5;
      border: 1px solid #6EE7B7;
      border-radius: 8px;
      color: #065F46;
      margin-bottom: 24px;
    }

    .success-banner svg {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .success-banner p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
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

    .deposit-info {
      margin-bottom: 24px;
    }

    .info-item {
      margin-bottom: 20px;
    }

    .info-item:last-child {
      margin-bottom: 0;
    }

    .info-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .info-value {
      font-size: 16px;
      color: #1F2937;
      margin: 0;
    }

    .address-display {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
    }

    .address-display code {
      flex: 1;
      font-size: 13px;
      color: #1F2937;
      word-break: break-all;
      font-family: 'Courier New', monospace;
    }

    .btn-copy {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #F59E0B;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-copy:hover:not(:disabled) {
      background: #D97706;
    }

    .btn-copy:disabled {
      background: #16A34A;
      cursor: not-allowed;
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
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #D97706 0%, #B45309 100%);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #FFFFFF;
      color: #6B7280;
      border: 1px solid #D1D5DB;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #F9FAFB;
      border-color: #9CA3AF;
      color: #374151;
    }

    .btn-full {
      width: 100%;
    }

    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .loading-spinner-sm {
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top: 2px solid white;
      width: 16px;
      height: 16px;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .btc-pegging-container {
        padding: 16px 0;
      }

      .content-card {
        padding: 24px 16px;
      }

      .page-title {
        font-size: 24px;
      }

      .section-title {
        font-size: 20px;
      }

      .button-group {
        flex-direction: column;
      }

      .button-group .btn {
        width: 100%;
      }
    }
  `]
})
export class BtcToSbtcComponent implements OnInit {
  private router = inject(Router);
  private walletManagerService = inject(WalletManagerService);

  stacksAddress = signal<string>('');
  amount = 100000;
  maxSignerFee = 4000;
  reclaimLockTime = 700;

  currentStep = signal<'form' | 'deposit' | 'processing'>('form');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  depositAddress = signal<string>('');
  depositData: any = null;
  addressCopied = signal<boolean>(false);

  transactionId = signal<string>('');
  txIdCopied = signal<boolean>(false);
  depositStatus = signal<string>('');

  private sbtcClient: any;

  ngOnInit() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      this.stacksAddress.set(address);
    }

    // Initialize the appropriate sBTC client based on environment
    if (environment.network === 'mainnet') {
      this.sbtcClient = new SbtcApiClientMainnet();
    } else {
      this.sbtcClient = new SbtcApiClientTestnet();
    }
  }

  async generateDepositAddress() {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');

      if (!this.stacksAddress()) {
        this.errorMessage.set('Endereço Stacks não encontrado');
        this.isLoading.set(false);
        return;
      }

      if (this.amount < 100000) {
        this.errorMessage.set('Quantidade mínima é 100,000 satoshis');
        this.isLoading.set(false);
        return;
      }

      // Get Bitcoin public key - this might need adjustment based on wallet implementation
      const btcAddress = await this.getBitcoinAddress();
      if (!btcAddress) {
        this.errorMessage.set('Não foi possível obter o endereço Bitcoin da carteira');
        this.isLoading.set(false);
        return;
      }

      // Get signer's public key
      const signersPublicKey = await this.sbtcClient.fetchSignersPublicKey();

      // Build deposit address
      const network = environment.network === 'mainnet' ? MAINNET : TESTNET;
      this.depositData = buildSbtcDepositAddress({
        stacksAddress: this.stacksAddress(),
        signersPublicKey: signersPublicKey,
        reclaimLockTime: this.reclaimLockTime,
        reclaimPublicKey: btcAddress,
        network: network,
        maxSignerFee: this.maxSignerFee
      });

      this.depositAddress.set(this.depositData.address);
      this.currentStep.set('deposit');
      this.isLoading.set(false);
    } catch (error) {
      console.error('Error generating deposit address:', error);
      this.errorMessage.set('Erro ao gerar endereço de depósito: ' + (error as Error).message);
      this.isLoading.set(false);
    }
  }

  async sendBitcoinTransaction() {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');

      // Send Bitcoin transaction using Stacks Connect
      const result = await request('sendTransfer', {
        recipients: [
          {
            address: this.depositAddress(),
            amount: this.amount,
          },
        ],
      });

      this.transactionId.set(result.txid);

      // Notify sBTC signers
      await this.notifySigners(result.txid);

      this.currentStep.set('processing');
      this.isLoading.set(false);
    } catch (error) {
      console.error('Error sending Bitcoin transaction:', error);
      this.errorMessage.set('Erro ao enviar transação Bitcoin: ' + (error as Error).message);
      this.isLoading.set(false);
    }
  }

  async notifySigners(txid: string) {
    try {
      const transaction = await this.sbtcClient.fetchTxHex(txid);
      const response = await this.sbtcClient.notifySbtc({
        transaction,
        ...this.depositData
      });

      this.depositStatus.set('Notificação enviada aos assinantes');
      console.log('sBTC notification response:', response);
    } catch (error) {
      console.error('Error notifying signers:', error);
      this.depositStatus.set('Erro ao notificar assinantes');
    }
  }

  async checkBalance() {
    try {
      this.isLoading.set(true);
      const balance = await this.sbtcClient.fetchSbtcBalance(this.stacksAddress());
      console.log('sBTC Balance:', balance);
      alert(`Saldo sBTC atual: ${balance} micro-sBTC`);
      this.isLoading.set(false);
    } catch (error) {
      console.error('Error checking balance:', error);
      this.errorMessage.set('Erro ao verificar saldo');
      this.isLoading.set(false);
    }
  }

  private async getBitcoinAddress(): Promise<string> {
    // This is a placeholder - you'll need to implement the actual method to get BTC address
    // This might require additional wallet integration
    try {
      // For now, returning a placeholder
      // In production, you should get this from the wallet
      return 'btc_public_key_placeholder';
    } catch (error) {
      console.error('Error getting Bitcoin address:', error);
      throw error;
    }
  }

  copyAddress() {
    const address = this.depositAddress();
    if (address) {
      navigator.clipboard.writeText(address).then(() => {
        this.addressCopied.set(true);
        setTimeout(() => {
          this.addressCopied.set(false);
        }, 2000);
      });
    }
  }

  copyTxId() {
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

  reset() {
    this.currentStep.set('form');
    this.errorMessage.set('');
    this.depositAddress.set('');
    this.transactionId.set('');
    this.depositStatus.set('');
    this.depositData = null;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
