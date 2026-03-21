import { Injectable, inject, signal } from '@angular/core';
import { Subscription, interval, switchMap, from } from 'rxjs';
import { buildSbtcDepositAddress, MAINNET, TESTNET, SbtcApiClientMainnet, SbtcApiClientTestnet } from 'sbtc';
import { request, getLocalStorage } from '@stacks/connect';
import { AddressType, getAddressInfo } from 'bitcoin-address-validation';
import * as bitcoin from 'bitcoinjs-lib';
import { Cl, Pc } from '@stacks/transactions';
import { environment } from '../../../environments/environment';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { WalletType } from '../../libs/wallet/wallet.types';
import { BridgeStorageService } from './bridge-storage.service';
import {
  BridgeOperationRecord,
  DepositConfig,
  WithdrawConfig,
  DepositAddressResult,
  DecodedBtcAddress,
  EmilyWithdrawalRecord,
  ADDRESS_TYPE_VERSION,
  isFinalStatus,
  mapEmilyDepositStatus,
  mapEmilyWithdrawalStatus,
} from './bridge.types';

@Injectable({ providedIn: 'root' })
export class BridgeService {
  private walletManager = inject(WalletManagerService);
  private storageService = inject(BridgeStorageService);

  private sbtcClient: any;
  private readonly network = environment.network === 'mainnet' ? MAINNET : TESTNET;
  private readonly emilyUrl = environment.network === 'mainnet'
    ? 'https://sbtc-emily.com'
    : 'https://emily-testnet.sbtc.tech';

  // sBTC contract deployer — used for sbtc-registry, sbtc-withdrawal, sbtc-token
  private readonly SBTC_CONTRACT_ADDRESS = environment.network === 'mainnet'
    ? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4'
    : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

  private readonly SBTC_WITHDRAWAL_CONTRACT =
    `${this.SBTC_CONTRACT_ADDRESS}.sbtc-withdrawal`;

  private readonly SBTC_TOKEN_CONTRACT =
    `${this.SBTC_CONTRACT_ADDRESS}.sbtc-token`;

  // Polling subscriptions
  private depositPolls = new Map<string, Subscription>();
  private withdrawalPoll: Subscription | null = null;

  // Public state
  readonly operations = signal<BridgeOperationRecord[]>([]);

  /** Whether the current wallet can send BTC (only external wallets can) */
  get canSendBtc(): boolean {
    return this.walletManager.getWalletType() === WalletType.EXTERNAL;
  }

  get isEmbeddedWallet(): boolean {
    return this.walletManager.getWalletType() === WalletType.EMBEDDED;
  }

  constructor() {
    // Pass sbtcContract override — the sbtc library v0.3.2 has outdated testnet addresses
    this.sbtcClient = environment.network === 'mainnet'
      ? new SbtcApiClientMainnet({ sbtcContract: this.SBTC_CONTRACT_ADDRESS })
      : new SbtcApiClientTestnet({ sbtcContract: this.SBTC_CONTRACT_ADDRESS });
  }

  // ===== Initialization =====

  initialize(): void {
    this.refreshOperations();
    this.resumePollingForProcessing();
  }

  refreshOperations(): void {
    this.operations.set(this.storageService.loadOperations());
  }

  // ===== Deposit Flow =====

  async generateDepositAddress(config: DepositConfig): Promise<DepositAddressResult> {
    const stacksAddress = this.walletManager.getSTXAddressOrThrow();
    const rawKey = await this.getBitcoinPublicKey();
    const signersPublicKey = await this.sbtcClient.fetchSignersPublicKey();

    // buildSbtcDepositAddress expects a 32-byte x-only (Schnorr) public key.
    // Compressed keys are 33 bytes (66 hex chars) with 02/03 prefix — strip it.
    const reclaimPublicKey = rawKey.length === 66 ? rawKey.slice(2) : rawKey;

    const result = buildSbtcDepositAddress({
      stacksAddress,
      signersPublicKey,
      reclaimLockTime: config.reclaimLockTime,
      reclaimPublicKey,
      network: this.network,
      maxSignerFee: config.maxSignerFee,
    });

    return {
      address: result.address,
      depositScript: result.depositScript,
      reclaimScript: result.reclaimScript,
      trOut: result.trOut,
    };
  }

  async sendBtcDeposit(params: {
    depositAddress: string;
    amount: number;
    depositData: any;
  }): Promise<{ btcTxid: string }> {
    const result = await request('sendTransfer', {
      recipients: [{ address: params.depositAddress, amount: params.amount }],
    });

    const btcTxid = result.txid;

    // Notify signers
    try {
      const transaction = await this.sbtcClient.fetchTxHex(btcTxid);
      await this.sbtcClient.notifySbtc({ transaction, ...params.depositData });
    } catch (err) {
      console.error('Error notifying signers:', err);
    }

    // Save to localStorage
    const record: BridgeOperationRecord = {
      id: btcTxid,
      type: 'deposit',
      status: 'broadcasted',
      amount: params.amount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      btcTxid: btcTxid,
      btcVout: 0,
      depositAddress: params.depositAddress,
      depositScript: params.depositData.depositScript,
      reclaimScript: params.depositData.reclaimScript,
    };
    this.storageService.saveOperation(record);
    this.refreshOperations();

    // Start polling
    this.startDepositPolling(btcTxid);

    return { btcTxid };
  }

  async checkDepositStatus(btcTxid: string): Promise<void> {
    try {
      const op = this.operations().find(o => o.btcTxid === btcTxid);

      // If btcVout is explicitly set, use it. Otherwise scan vouts 0-3
      // (manual deposits may land on vout > 0).
      const voutsToTry = op?.btcVout != null ? [op.btcVout] : [0, 1, 2, 3];

      let deposit: any = null;
      let discoveredVout = 0;

      for (const vout of voutsToTry) {
        try {
          const result = await this.sbtcClient.fetchDeposit({ txid: btcTxid, vout });
          if (result?.status) {
            deposit = result;
            discoveredVout = vout;
            break;
          }
        } catch {
          // 404 — try next vout
        }
      }

      if (!deposit) return;

      const status = mapEmilyDepositStatus(deposit.status);
      const updates: Partial<BridgeOperationRecord> = {
        status,
        emilyStatus: deposit.status,
        emilyStatusMessage: deposit.statusMessage,
      };

      // Persist the discovered vout so future polls go directly
      if (op?.btcVout == null) {
        updates.btcVout = discoveredVout;
      }

      // Backfill amount from Emily if missing
      if (deposit.amount && (!op?.amount || op.amount === 0)) {
        updates.amount = deposit.amount;
      }

      this.storageService.updateOperation(btcTxid, updates);
      this.refreshOperations();

      if (isFinalStatus(status)) {
        this.stopDepositPolling(btcTxid);
      }
    } catch (err) {
      console.error(`Error checking deposit ${btcTxid}:`, err);
    }
  }

  /**
   * Notify Emily about a deposit that was sent manually (outside the app).
   * Regenerates the address to recover the scripts, verifies match, finds the correct vout.
   */
  async notifyManualDeposit(params: {
    btcTxid: string;
    expectedAddress: string;
    config: DepositConfig;
  }): Promise<void> {
    // Regenerate to recover depositScript & reclaimScript
    const result = await this.generateDepositAddress(params.config);

    if (result.address !== params.expectedAddress) {
      throw new Error(
        `Endereço regenerado (${result.address}) não confere com o esperado (${params.expectedAddress}). ` +
        `A chave dos signers pode ter rotacionado desde a geração.`
      );
    }

    // Fetch the raw transaction hex
    const txHex = await this.sbtcClient.fetchTxHex(params.btcTxid);

    // Parse the transaction to find the correct output index
    const { hexToBytes } = await import('@stacks/common');
    const btcLib = await import('@scure/btc-signer');
    const tx = btcLib.Transaction.fromRaw(hexToBytes(txHex));

    // Find vout by matching the address on each output
    let vout = -1;
    for (let i = 0; i < tx.outputsLength; i++) {
      const addr = tx.getOutputAddress(i, this.network);
      if (addr === params.expectedAddress) {
        vout = i;
        break;
      }
    }

    // Fallback: match via p2tr output script bytes
    if (vout === -1) {
      const trScript = result.trOut.script;
      for (let i = 0; i < tx.outputsLength; i++) {
        const out = tx.getOutput(i);
        if (out.script && bytesEqual(out.script, trScript)) {
          vout = i;
          break;
        }
      }
    }

    if (vout === -1) {
      throw new Error('Não foi possível encontrar o endereço de depósito nos outputs da transação');
    }

    // Notify Emily
    const emilyResponse = await this.sbtcClient.notifySbtc({
      depositScript: result.depositScript,
      reclaimScript: result.reclaimScript,
      vout,
      transaction: txHex,
    });

    // Save operation record with vout & amount from Emily response
    const record: BridgeOperationRecord = {
      id: params.btcTxid,
      type: 'deposit',
      status: mapEmilyDepositStatus(emilyResponse?.status ?? 'pending'),
      amount: emilyResponse?.amount ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      btcTxid: params.btcTxid,
      btcVout: vout,
      depositAddress: params.expectedAddress,
      depositScript: result.depositScript,
      reclaimScript: result.reclaimScript,
      emilyStatus: emilyResponse?.status,
      emilyStatusMessage: emilyResponse?.statusMessage,
    };
    this.storageService.saveOperation(record);
    this.refreshOperations();

    // Only poll if not already final
    if (!isFinalStatus(record.status)) {
      this.startDepositPolling(params.btcTxid);
    }
  }

  // ===== Withdrawal Flow =====

  validateWithdrawalAddress(address: string): DecodedBtcAddress {
    const typeMapping: Record<string, string> = {
      [AddressType.p2pkh]: ADDRESS_TYPE_VERSION.p2pkh,
      [AddressType.p2sh]: ADDRESS_TYPE_VERSION.p2sh,
      [AddressType.p2wpkh]: ADDRESS_TYPE_VERSION.p2wpkh,
      [AddressType.p2wsh]: ADDRESS_TYPE_VERSION.p2wsh,
      [AddressType.p2tr]: ADDRESS_TYPE_VERSION.p2tr,
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
      throw new Error(
        `Tipo de endereço não suportado: ${addressInfo.type}. Tipos aceitos: p2pkh, p2sh, p2wpkh, p2wsh, p2tr`
      );
    }

    return { type, hashbytes };
  }

  async initiateWithdrawal(params: WithdrawConfig & { decoded: DecodedBtcAddress }): Promise<{ stacksTxid: string }> {
    const stacksAddress = this.walletManager.getSTXAddressOrThrow();

    const recipient = {
      version: Cl.bufferFromHex(params.decoded.type),
      hashbytes: Cl.buffer(params.decoded.hashbytes),
    };

    const postCond = Pc.principal(stacksAddress)
      .willSendEq(params.amount + params.maxFee)
      .ft(this.SBTC_TOKEN_CONTRACT as `${string}.${string}`, 'sbtc-token');

    const functionArgs = [
      Cl.uint(params.amount),
      Cl.tuple(recipient),
      Cl.uint(params.maxFee),
    ];

    let stacksTxid: string;

    if (this.walletManager.getWalletType() === WalletType.EMBEDDED) {
      // Embedded wallet: sign with sponsored=true, then send to Bolt sponsor endpoint
      const result = await this.walletManager.callContract({
        contract: this.SBTC_WITHDRAWAL_CONTRACT,
        functionName: 'initiate-withdrawal-request',
        functionArgs,
        network: environment.network as any,
        postConditions: [postCond],
        postConditionMode: 'deny',
        sponsored: true,
      });

      // result.transaction is the serialized tx (hex string)
      const serializedTx = result.transaction;
      if (!serializedTx) {
        throw new Error('Falha ao serializar a transação');
      }
      const sponsorResponse = await this.sponsorWithdrawalTransaction(serializedTx);
      stacksTxid = sponsorResponse.txid;
    } else {
      // External wallet: use @stacks/connect request
      const result = await request('stx_callContract', {
        contract: this.SBTC_WITHDRAWAL_CONTRACT as `${string}.${string}`,
        functionName: 'initiate-withdrawal-request',
        functionArgs,
        postConditions: [postCond],
        postConditionMode: 'deny',
        network: environment.network,
      });
      stacksTxid = result.txid || '';
    }

    // Save to localStorage
    const record: BridgeOperationRecord = {
      id: stacksTxid,
      type: 'withdrawal',
      status: 'pending',
      amount: params.amount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stacksTxid,
      btcAddress: params.btcAddress,
    };
    this.storageService.saveOperation(record);
    this.refreshOperations();

    // Start polling
    this.startWithdrawalPolling();

    return { stacksTxid };
  }

  // ===== Bolt Sponsor for sBTC Withdrawal =====

  private async sponsorWithdrawalTransaction(serializedTx: string): Promise<{ txid: string; fee: number }> {
    const response = await fetch(`${environment.boltProtocol.apiUrl}/sponsor/sbtc-token/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serializedTx,
        fee: '10',
        sponsor: this.SBTC_CONTRACT_ADDRESS,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao patrocinar transação: ${error}`);
    }

    return response.json();
  }

  async checkWithdrawalStatuses(): Promise<void> {
    try {
      const stxAddress = this.walletManager.getSTXAddress();
      if (!stxAddress) return;

      const response = await fetch(`${this.emilyUrl}/withdrawal/sender/${stxAddress}`);
      if (!response.ok) return;

      const data: EmilyWithdrawalRecord[] = await response.json();
      const localOps = this.operations().filter(o => o.type === 'withdrawal' && !isFinalStatus(o.status));

      for (const op of localOps) {
        const match = data.find(w => w.requestId === op.stacksTxid);
        if (match) {
          const status = mapEmilyWithdrawalStatus(match.status);
          this.storageService.updateOperation(op.id, {
            status,
            emilyStatus: match.status,
            btcTxidFulfillment: match.txid,
          });
        }
      }

      this.refreshOperations();

      // Stop if all final
      const stillProcessing = this.operations().filter(o => o.type === 'withdrawal' && !isFinalStatus(o.status));
      if (stillProcessing.length === 0) {
        this.stopWithdrawalPolling();
      }
    } catch (err) {
      console.error('Error checking withdrawal statuses:', err);
    }
  }

  // ===== Polling =====

  private startDepositPolling(btcTxid: string): void {
    if (this.depositPolls.has(btcTxid)) return;

    // Immediate check
    this.checkDepositStatus(btcTxid);

    const sub = interval(30_000).pipe(
      switchMap(() => from(this.checkDepositStatus(btcTxid)))
    ).subscribe();

    this.depositPolls.set(btcTxid, sub);
  }

  private stopDepositPolling(btcTxid: string): void {
    const sub = this.depositPolls.get(btcTxid);
    if (sub) {
      sub.unsubscribe();
      this.depositPolls.delete(btcTxid);
    }
  }

  private startWithdrawalPolling(): void {
    if (this.withdrawalPoll) return;

    // Immediate check
    this.checkWithdrawalStatuses();

    this.withdrawalPoll = interval(30_000).pipe(
      switchMap(() => from(this.checkWithdrawalStatuses()))
    ).subscribe();
  }

  private stopWithdrawalPolling(): void {
    if (this.withdrawalPoll) {
      this.withdrawalPoll.unsubscribe();
      this.withdrawalPoll = null;
    }
  }

  private resumePollingForProcessing(): void {
    const processing = this.storageService.getProcessingOperations();

    const deposits = processing.filter(o => o.type === 'deposit');
    for (const d of deposits) {
      if (d.btcTxid) {
        this.startDepositPolling(d.btcTxid);
      }
    }

    const withdrawals = processing.filter(o => o.type === 'withdrawal');
    if (withdrawals.length > 0) {
      this.startWithdrawalPolling();
    }
  }

  stopAllPolling(): void {
    for (const [txid, sub] of this.depositPolls) {
      sub.unsubscribe();
    }
    this.depositPolls.clear();
    this.stopWithdrawalPolling();
  }

  // ===== BTC Public Key =====

  private async getBitcoinPublicKey(): Promise<string> {
    // Embedded wallet: use the Stacks public key (same secp256k1 curve)
    if (this.walletManager.getWalletType() === WalletType.EMBEDDED) {
      const walletData = this.walletManager.getWalletData();
      // getWalletData() only works for external — for embedded, get publicKey from adapter
      // The embedded adapter stores publicKey via compressPublicKey(privateKeyToPublic(privateKey))
      // We can access it through signMessage which returns publicKey
      const sig = await this.walletManager.signMessage('bridge-key-derivation');
      if (sig.publicKey) return sig.publicKey;
      throw new Error('Não foi possível obter a chave pública da carteira embutida');
    }

    // External wallet: try cached addresses from @stacks/connect localStorage
    const data = getLocalStorage();
    const btcEntry = data?.addresses?.btc?.[0] as any;
    const btcPubKey = btcEntry?.publicKey;
    if (btcPubKey) return btcPubKey;

    // Fall back to wallet prompt
    const response = await request('getAddresses');
    const addr = response?.addresses?.find(
      (a: any) => a.type === 'p2wpkh' || a.type === 'p2tr' || a.symbol === 'BTC'
    );
    if (addr?.publicKey) return addr.publicKey;
    if (addr?.address) return addr.address;

    throw new Error('Não foi possível obter o endereço Bitcoin da carteira');
  }
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
