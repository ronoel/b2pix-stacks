import { ClarityValue, PostCondition } from '@stacks/transactions';
import { StacksNetworkName } from '@stacks/network';
import { TransactionResult } from '@stacks/connect/dist/types/methods';

/**
 * Wallet type enumeration
 */
export enum WalletType {
  EMBEDDED = 'embedded',
  EXTERNAL = 'external'
}

/**
 * Wallet connection status
 */
export interface WalletConnectionStatus {
  connected: boolean;
  walletType: WalletType | null;
  address: string | null;
}

/**
 * Contract call options
 */
export interface ContractCallOptions {
  contract: string;
  functionName: string;
  functionArgs: ClarityValue[];
  network: StacksNetworkName;
  postConditions?: (string | PostCondition)[];
  postConditionMode?: 'allow' | 'deny';
  sponsored?: boolean;
}

// /**
//  * Contract call response
//  */
// export interface ContractCallResponse {
//   txid: string;
// }

/**
 * Message signing response
 */
export interface MessageSignatureResponse {
  signature: string;
  publicKey: string;
}

/**
 * Wallet connection data
 */
export interface WalletConnectionData {
  address: string;
  publicKey?: string;
  walletType: WalletType;
}

/**
 * Embedded wallet encryption method
 */
export enum EncryptionMethod {
  PASSWORD = 'password',
  WEBAUTHN = 'webauthn'
}

/**
 * Embedded wallet data stored in browser
 */
export interface EmbeddedWalletData {
  encryptedPrivateKey: string;
  publicKey: string;
  address: string;
  createdAt: number;
  salt: string;
  iv: string;
  // WebAuthn-specific fields
  encryptionMethod: EncryptionMethod;
  webauthnCredentialId?: string;
  webauthnPublicKey?: string; // Base64-encoded WebAuthn public key
}

/**
 * Base interface for wallet adapters
 */
export interface WalletAdapter {
  /**
   * Get the wallet type
   */
  getType(): WalletType;

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean;

  /**
   * Connect to the wallet
   */
  connect(): Promise<WalletConnectionData>;

  /**
   * Disconnect from the wallet
   */
  disconnect(): void;

  /**
   * Get the current wallet address
   */
  getAddress(): string | null;

  /**
   * Get the public key
   */
  getPublicKey(): string | null;

  /**
   * Call a smart contract function
   */
  callContract(options: ContractCallOptions): Promise<TransactionResult>;

  /**
   * Sign a message
   */
  signMessage(message: string): Promise<MessageSignatureResponse>;
}
