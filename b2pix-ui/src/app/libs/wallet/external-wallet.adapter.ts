import { connect, disconnect, isConnected, getLocalStorage, request } from '@stacks/connect';
import {
  WalletAdapter,
  WalletType,
  WalletConnectionData,
  ContractCallOptions,
  MessageSignatureResponse
} from './wallet.types';
import {
  serializeCVBytes,
} from '@stacks/transactions';
import { bytesToHex } from '@stacks/common';
import { TransactionResult } from '@stacks/connect/dist/types/methods';

/**
 * Adapter for external wallets (Leather, Xverse, etc.)
 * Uses @stacks/connect to communicate with browser extension wallets
 */
export class ExternalWalletAdapter implements WalletAdapter {

  private connected = false;
  private address: string | null = null;
  private publicKey: string | null = null;

  constructor() {
    this.checkConnection();
  }

  getType(): WalletType {
    return WalletType.EXTERNAL;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<WalletConnectionData> {
    try {
      const response = await connect();
      this.connected = true;

      // Get the STX address from the response
      const stxAddress = response?.addresses?.find(addr => addr.address.startsWith('S'))?.address || null;

      if (!stxAddress) {
        throw new Error('No STX address found in wallet response');
      }

      this.address = stxAddress;

      // Public key will be available when needed for signing
      this.publicKey = null;

      return {
        address: this.address,
        walletType: WalletType.EXTERNAL
      };
    } catch (error) {
      this.connected = false;
      this.address = null;
      this.publicKey = null;
      throw new Error('Failed to connect to external wallet');
    }
  }

  disconnect(): void {
    disconnect();
    this.connected = false;
    this.address = null;
    this.publicKey = null;
  }

  getAddress(): string | null {
    return this.address;
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  async callContract(options: ContractCallOptions): Promise<TransactionResult> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const hexEncodedArgs = options.functionArgs.map(arg => `0x${bytesToHex(serializeCVBytes(arg))}`);

    try {
      const response = await request('stx_callContract', {
        contract: options.contract as `${string}.${string}`,
        functionName: options.functionName,
        functionArgs: hexEncodedArgs,
        network: options.network,
        postConditions: options.postConditions,
        postConditionMode: options.postConditionMode || 'deny',
        sponsored: options.sponsored
      });
      
      return response as TransactionResult;
    } catch (error) {
      throw new Error('Contract call failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async signMessage(message: string): Promise<MessageSignatureResponse> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const response = await request('stx_signMessage', {
        message
      });

      return {
        signature: response.signature,
        publicKey: response.publicKey
      };
    } catch (error) {
      throw new Error('Message signing failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Check if wallet is already connected from previous session
   */
  private checkConnection(): void {
    const connected = isConnected();
    this.connected = connected;

    if (connected) {
      const data = getLocalStorage();
      this.address = data?.addresses?.stx?.[0]?.address || null;
      this.publicKey = null;
    }
  }
}
