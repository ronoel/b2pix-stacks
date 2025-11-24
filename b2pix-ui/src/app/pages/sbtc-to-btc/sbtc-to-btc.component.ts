import { Component, OnInit, signal, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { AddressType, getAddressInfo } from 'bitcoin-address-validation';
import * as bitcoin from 'bitcoinjs-lib';
import { request } from '@stacks/connect';
import { Cl, Pc } from '@stacks/transactions';
import { environment } from '../../../environments/environment';

interface WithdrawalResponse {
  requestId: string;
  status: 'pending' | 'accepted' | 'confirmed';
  txid?: string;
  amount: number;
}

@Component({
  selector: 'app-sbtc-to-btc',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          <h1 class="page-title">Peg sBTC para BTC</h1>
          <p class="page-subtitle">Retire seu sBTC de volta para Bitcoin</p>
        </div>

        <!-- Main Content -->
        <div class="content-card">
          @if (currentStep() === 'form') {
            <!-- Step 1: Input Form -->
            <div class="form-section">
              <h2 class="section-title">Detalhes da Retirada</h2>

              <div class="info-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>Você receberá Bitcoin no endereço especificado. O processo leva aproximadamente 6 confirmações na rede Bitcoin.</p>
              </div>

              <div class="form-group">
                <label class="form-label">Endereço Stacks (Remetente)</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="stacksAddress"
                  placeholder="SP..."
                  readonly
                />
                <span class="form-hint">Este é o endereço de onde o sBTC será retirado</span>
              </div>

              <div class="form-group">
                <label class="form-label">Endereço Bitcoin (Receptor)</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="btcAddress"
                  placeholder="bc1..."
                  (input)="validateBtcAddress()"
                />
                <span class="form-hint">Endereço Bitcoin onde você receberá os fundos</span>
                @if (btcAddressValid() === false) {
                  <span class="form-error">Endereço Bitcoin inválido</span>
                }
              </div>

              <div class="form-group">
                <label class="form-label">Quantidade (satoshis)</label>
                <input
                  type="number"
                  class="form-input"
                  [(ngModel)]="amount"
                  placeholder="100000"
                  min="10000"
                />
                <span class="form-hint">Mínimo: 10,000 sats (0.0001 BTC)</span>
              </div>

              <div class="form-group">
                <label class="form-label">Taxa Máxima (satoshis)</label>
                <input
                  type="number"
                  class="form-input"
                  [(ngModel)]="maxFee"
                  placeholder="3000"
                />
                <span class="form-hint">Padrão: 3,000 sats. Taxa máxima que você está disposto a pagar.</span>
              </div>

              <div class="warning-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>O valor total (quantidade + taxa máxima) será bloqueado no seu saldo sBTC. Taxas não utilizadas serão devolvidas.</p>
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
                (click)="initiateWithdrawal()"
                [disabled]="isLoading() || !btcAddressValid()"
              >
                @if (isLoading()) {
                  <div class="loading-spinner-sm"></div>
                  Iniciando Retirada...
                } @else {
                  Iniciar Retirada
                }
              </button>
            </div>
          }

          @if (currentStep() === 'processing') {
            <!-- Step 2: Processing -->
            <div class="processing-section">
              <h2 class="section-title">Retirada em Processamento</h2>

              <div class="success-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>Solicitação de retirada enviada com sucesso!</p>
              </div>

              <div class="deposit-info">
                <div class="info-item">
                  <label class="info-label">ID da Transação Stacks</label>
                  <div class="address-display">
                    <code>{{ stacksTxId() }}</code>
                    <button class="btn-copy" (click)="copyStacksTxId()" [disabled]="stacksTxIdCopied()">
                      @if (stacksTxIdCopied()) {
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
                  <label class="info-label">Endereço Bitcoin</label>
                  <p class="info-value">{{ btcAddress }}</p>
                </div>

                <div class="info-item">
                  <label class="info-label">Quantidade</label>
                  <p class="info-value">{{ amount }} satoshis</p>
                </div>

                @if (withdrawalStatus()) {
                  <div class="info-item">
                    <label class="info-label">Status</label>
                    <div class="status-badge" [class]="getStatusClass(withdrawalStatus())">
                      {{ getStatusLabel(withdrawalStatus()) }}
                    </div>
                  </div>
                }

                @if (btcTxId()) {
                  <div class="info-item">
                    <label class="info-label">ID da Transação Bitcoin</label>
                    <div class="address-display">
                      <code>{{ btcTxId() }}</code>
                      <button class="btn-copy" (click)="copyBtcTxId()" [disabled]="btcTxIdCopied()">
                        @if (btcTxIdCopied()) {
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
                }
              </div>

              <div class="info-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>A transação Stacks será confirmada em segundos. A confirmação na rede Bitcoin leva aproximadamente 6 blocos (~60 minutos).</p>
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
                  (click)="checkWithdrawalStatus()"
                  [disabled]="isLoading()"
                >
                  @if (isLoading()) {
                    <div class="loading-spinner-sm"></div>
                    Verificando...
                  } @else {
                    Verificar Status
                  }
                </button>
                <button
                  class="btn btn-secondary"
                  (click)="reset()"
                >
                  Nova Retirada
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

    .form-error {
      display: block;
      font-size: 12px;
      color: #DC2626;
      margin-top: 6px;
      font-weight: 500;
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

    .warning-banner {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #FEF3C7;
      border: 1px solid #FCD34D;
      border-radius: 8px;
      color: #92400E;
      margin-bottom: 24px;
    }

    .warning-banner svg {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .warning-banner p {
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

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
    }

    .status-badge.pending {
      background: #FEF3C7;
      color: #92400E;
    }

    .status-badge.accepted {
      background: #DBEAFE;
      color: #1E40AF;
    }

    .status-badge.confirmed {
      background: #D1FAE5;
      color: #065F46;
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
export class SbtcToBtcComponent implements OnInit {
  private router = inject(Router);
  private walletManagerService = inject(WalletManagerService);

  stacksAddress = signal<string>('');
  btcAddress = '';
  amount = 100000;
  maxFee = 3000;

  currentStep = signal<'form' | 'processing'>('form');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  btcAddressValid = signal<boolean | null>(null);

  stacksTxId = signal<string>('');
  stacksTxIdCopied = signal<boolean>(false);

  btcTxId = signal<string>('');
  btcTxIdCopied = signal<boolean>(false);

  withdrawalStatus = signal<'pending' | 'accepted' | 'confirmed' | ''>('');

  private decodedBtcAddress: { type: string; hashbytes: Uint8Array } | null = null;

  // Contract details - these should match your environment
  private readonly SBTC_WITHDRAWAL_CONTRACT = environment.network === 'mainnet'
    ? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-withdrawal'
    : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-withdrawal';

  private readonly SBTC_TOKEN_CONTRACT = environment.network === 'mainnet'
    ? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token'
    : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token';

  ngOnInit() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      this.stacksAddress.set(address);
    }
  }

  validateBtcAddress() {
    try {
      if (!this.btcAddress || this.btcAddress.trim() === '') {
        this.btcAddressValid.set(null);
        return;
      }

      this.decodedBtcAddress = this.deconstructBtcAddress(this.btcAddress);
      this.btcAddressValid.set(true);
      this.errorMessage.set('');
    } catch (error) {
      console.error('Invalid Bitcoin address:', error);
      this.btcAddressValid.set(false);
      this.decodedBtcAddress = null;
    }
  }

  private deconstructBtcAddress(address: string): { type: string; hashbytes: Uint8Array } {
    const typeMapping: { [key: string]: string } = {
      [AddressType.p2pkh]: '0x00',
      [AddressType.p2sh]: '0x01',
      [AddressType.p2wpkh]: '0x04',
      [AddressType.p2wsh]: '0x05',
      [AddressType.p2tr]: '0x06',
    };

    const addressInfo = getAddressInfo(address);
    const { bech32 } = addressInfo;
    let hashbytes: Uint8Array;

    if (bech32) {
      hashbytes = bitcoin.address.fromBech32(address).data;
    } else {
      hashbytes = bitcoin.address.fromBase58Check(address).hash;
    }

    const type = typeMapping[addressInfo.type];
    if (!type) {
      throw new Error(`Unsupported address type: ${addressInfo.type}`);
    }

    return { type, hashbytes };
  }

  async initiateWithdrawal() {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');

      if (!this.stacksAddress()) {
        this.errorMessage.set('Endereço Stacks não encontrado');
        this.isLoading.set(false);
        return;
      }

      if (!this.decodedBtcAddress) {
        this.errorMessage.set('Endereço Bitcoin inválido');
        this.isLoading.set(false);
        return;
      }

      if (this.amount < 10000) {
        this.errorMessage.set('Quantidade mínima é 10,000 satoshis');
        this.isLoading.set(false);
        return;
      }

      // Construct recipient tuple
      const recipient = {
        version: Cl.bufferFromHex(this.decodedBtcAddress.type),
        hashbytes: Cl.buffer(this.decodedBtcAddress.hashbytes)
      };

      // Create post condition to ensure the correct amount is transferred
      const postCond = Pc.principal(this.stacksAddress())
        .willSendEq(this.amount + this.maxFee)
        .ft(this.SBTC_TOKEN_CONTRACT, 'sbtc-token');

      // Call the contract
      const result = await request('stx_callContract', {
        contract: this.SBTC_WITHDRAWAL_CONTRACT,
        functionName: 'initiate-withdrawal-request',
        functionArgs: [
          Cl.uint(this.amount),
          Cl.tuple(recipient),
          Cl.uint(this.maxFee)
        ],
        postConditions: [postCond],
        postConditionMode: 'deny',
        network: environment.network,
      });

      this.stacksTxId.set(result.txid || '');
      this.withdrawalStatus.set('pending');
      this.currentStep.set('processing');
      this.isLoading.set(false);

      // Start polling for status
      this.startStatusPolling();
    } catch (error) {
      console.error('Error initiating withdrawal:', error);
      this.errorMessage.set('Erro ao iniciar retirada: ' + (error as Error).message);
      this.isLoading.set(false);
    }
  }

  private statusPollingInterval: any = null;

  private startStatusPolling() {
    // Poll every 30 seconds
    this.statusPollingInterval = setInterval(() => {
      this.checkWithdrawalStatus();
    }, 30000);
  }

  async checkWithdrawalStatus() {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');

      // Call Emily API to check withdrawal status
      const emiliyUrl = environment.network === 'mainnet'
        ? 'https://sbtc-emily.com'
        : 'https://emily-testnet.sbtc.tech';

      const response = await fetch(
        `${emiliyUrl}/withdrawal/sender/${this.stacksAddress()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch withdrawal status');
      }

      const data: WithdrawalResponse[] = await response.json();

      // Find the withdrawal matching our transaction
      const withdrawal = data.find(w => w.requestId === this.stacksTxId());

      if (withdrawal) {
        this.withdrawalStatus.set(withdrawal.status);

        if (withdrawal.txid) {
          this.btcTxId.set(withdrawal.txid);
        }

        // Stop polling if confirmed
        if (withdrawal.status === 'confirmed' && this.statusPollingInterval) {
          clearInterval(this.statusPollingInterval);
          this.statusPollingInterval = null;
        }
      }

      this.isLoading.set(false);
    } catch (error) {
      console.error('Error checking withdrawal status:', error);
      this.errorMessage.set('Erro ao verificar status: ' + (error as Error).message);
      this.isLoading.set(false);
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'accepted':
        return 'accepted';
      case 'confirmed':
        return 'confirmed';
      default:
        return 'pending';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'accepted':
        return 'Aceito';
      case 'confirmed':
        return 'Confirmado';
      default:
        return status;
    }
  }

  copyStacksTxId() {
    const txId = this.stacksTxId();
    if (txId) {
      navigator.clipboard.writeText(txId).then(() => {
        this.stacksTxIdCopied.set(true);
        setTimeout(() => {
          this.stacksTxIdCopied.set(false);
        }, 2000);
      });
    }
  }

  copyBtcTxId() {
    const txId = this.btcTxId();
    if (txId) {
      navigator.clipboard.writeText(txId).then(() => {
        this.btcTxIdCopied.set(true);
        setTimeout(() => {
          this.btcTxIdCopied.set(false);
        }, 2000);
      });
    }
  }

  reset() {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
    }

    this.currentStep.set('form');
    this.errorMessage.set('');
    this.stacksTxId.set('');
    this.btcTxId.set('');
    this.withdrawalStatus.set('');
    this.btcAddress = '';
    this.btcAddressValid.set(null);
    this.decodedBtcAddress = null;
  }

  goBack() {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
    }
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy() {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
    }
  }
}
