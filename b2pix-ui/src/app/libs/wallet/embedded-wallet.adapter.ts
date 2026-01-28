import {
  WalletAdapter,
  WalletType,
  WalletConnectionData,
  ContractCallOptions,
  MessageSignatureResponse,
  EmbeddedWalletData,
  EncryptionMethod
} from './wallet.types';
import { WebAuthnService } from './webauthn.service';
import { generateWallet, getStxAddress, randomSeedPhrase } from '@stacks/wallet-sdk';
import {
  makeContractCall,
  broadcastTransaction,
  PostConditionMode,
  SignedContractCallOptions,
  signMessageHashRsv,
  privateKeyToPublic,
  compressPublicKey} from '@stacks/transactions';
import {
  hashMessage
} from '@stacks/encryption';
import { bytesToHex } from '@stacks/common'; // or Buffer if you prefer
import { STACKS_MAINNET, STACKS_TESTNET, StacksNetwork } from '@stacks/network';
import { environment } from '../../../environments/environment';
import { TransactionResult } from '@stacks/connect/dist/types/methods';

/**
 * Adapter for embedded wallets generated and stored locally
 * Uses @stacks/wallet-sdk for key generation and @stacks/transactions for signing
 */
export class EmbeddedWalletAdapter implements WalletAdapter {

  private static readonly STORAGE_KEY = 'b2pix_embedded_wallet';
  private static readonly MNEMONIC_STORAGE_KEY = 'b2pix_embedded_wallet_mnemonic';

  private connected = false;
  private address: string | null = null;
  private publicKey: string | null = null;
  private privateKey: string | null = null;
  private mnemonic: string | null = null;

  constructor() {
    this.checkExistingWallet();
  }

  getType(): WalletType {
    return WalletType.EMBEDDED;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Generate a new embedded wallet or restore from storage
   */
  async connect(): Promise<WalletConnectionData> {
    // Check if wallet already exists
    const existingWallet = this.loadWalletFromStorage();

    if (existingWallet) {
      this.connected = true;
      this.address = existingWallet.address;
      this.publicKey = existingWallet.publicKey;
      this.privateKey = existingWallet.privateKey;
      this.mnemonic = existingWallet.mnemonic;

      return {
        address: this.address,
        publicKey: this.publicKey,
        walletType: WalletType.EMBEDDED
      };
    }

    throw new Error('No embedded wallet found. Please generate a new wallet first.');
  }

  /**
   * Generate a new wallet with mnemonic (password-based encryption)
   */
  async generateNewWallet(password: string): Promise<{ mnemonic: string; address: string }> {
    try {
      // Generate a random 24-word mnemonic (256 bits of entropy)
      const mnemonic = randomSeedPhrase(256);

      // Generate wallet from the mnemonic
      const wallet = await generateWallet({
        secretKey: mnemonic,
        password: password
      });

      // Get the first account
      const account = wallet.accounts[0];
      this.address = getStxAddress({ account, network: this.getNetworkName() });
      this.privateKey = account.stxPrivateKey;
      this.mnemonic = mnemonic; // Store the original mnemonic, not wallet.rootKey

      // Derive public key from private key
      this.publicKey = compressPublicKey(privateKeyToPublic(this.privateKey));

      // Store encrypted wallet data with password
      await this.saveWalletToStorage(password, EncryptionMethod.PASSWORD);

      this.connected = true;

      if (!this.address) {
        throw new Error('Failed to generate address');
      }

      return {
        mnemonic: this.mnemonic,
        address: this.address
      };
    } catch (error) {
      throw new Error('Failed to generate wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Generate a new wallet with mnemonic (WebAuthn-based encryption)
   */
  async generateNewWalletWithPasskey(username: string = 'user'): Promise<{ mnemonic: string; address: string }> {
    try {
      // Generate a random 24-word mnemonic (256 bits of entropy)
      const mnemonic = randomSeedPhrase(256);

      // Generate wallet from the mnemonic
      const wallet = await generateWallet({
        secretKey: mnemonic,
        password: '' // No password needed for WebAuthn
      });

      // Get the first account
      const account = wallet.accounts[0];
      this.address = getStxAddress({ account, network: this.getNetworkName() });
      this.privateKey = account.stxPrivateKey;
      this.mnemonic = mnemonic;

      // Derive public key from private key
      this.publicKey = compressPublicKey(privateKeyToPublic(this.privateKey));

      // Create WebAuthn credential and store encrypted wallet data
      await this.saveWalletWithWebAuthn(username);

      this.connected = true;

      if (!this.address) {
        throw new Error('Failed to generate address');
      }

      return {
        mnemonic: this.mnemonic,
        address: this.address
      };
    } catch (error) {
      throw new Error('Failed to generate wallet with passkey: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Import wallet from mnemonic
   */
  async importFromMnemonic(mnemonic: string, password: string): Promise<WalletConnectionData> {
    try {
      const wallet = await generateWallet({
        secretKey: mnemonic,
        password: password
      });

      const account = wallet.accounts[0];
      this.address = getStxAddress({ account, network: this.getNetworkName() });
      this.privateKey = account.stxPrivateKey;
      this.mnemonic = mnemonic;
      this.publicKey = compressPublicKey(privateKeyToPublic(this.privateKey));
      

      await this.saveWalletToStorage(password, EncryptionMethod.PASSWORD);

      this.connected = true;

      if (!this.address) {
        throw new Error('Failed to import address');
      }

      return {
        address: this.address,
        publicKey: this.publicKey || undefined,
        walletType: WalletType.EMBEDDED
      };
    } catch (error) {
      throw new Error('Failed to import wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Import wallet from mnemonic with WebAuthn passkey
   */
  async importFromMnemonicWithPasskey(mnemonic: string, username: string = 'user'): Promise<WalletConnectionData> {
    try {
      const wallet = await generateWallet({
        secretKey: mnemonic,
        password: '' // No password needed for WebAuthn
      });

      const account = wallet.accounts[0];
      this.address = getStxAddress({ account, network: this.getNetworkName() });
      this.privateKey = account.stxPrivateKey;
      this.mnemonic = mnemonic;
      this.publicKey = compressPublicKey(privateKeyToPublic(this.privateKey));

      // Create WebAuthn credential and store encrypted wallet data
      await this.saveWalletWithWebAuthn(username);

      this.connected = true;

      if (!this.address) {
        throw new Error('Failed to import address');
      }

      return {
        address: this.address,
        publicKey: this.publicKey || undefined,
        walletType: WalletType.EMBEDDED
      };
    } catch (error) {
      throw new Error('Failed to import wallet with passkey: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  disconnect(): void {
    this.connected = false;
    this.address = null;
    this.publicKey = null;
    this.privateKey = null;
    this.mnemonic = null;
  }

  /**
   * Delete the embedded wallet permanently
   */
  deleteWallet(): void {
    this.disconnect();
    localStorage.removeItem(EmbeddedWalletAdapter.STORAGE_KEY);
    localStorage.removeItem(EmbeddedWalletAdapter.MNEMONIC_STORAGE_KEY);
  }

  getAddress(): string | null {
    return this.address;
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  /**
   * Get the mnemonic seed phrase (only if unlocked)
   */
  getMnemonic(): string | null {
    return this.mnemonic;
  }

  async callContract(options: ContractCallOptions): Promise<TransactionResult> {
    if (!this.connected || !this.privateKey || !this.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const network = this.getStacksNetwork();

      // Parse contract address and name
      const [contractAddress, contractName] = options.contract.split('.');

      // Convert post conditions to proper type
      // const postConditions: PostCondition[] = [];
      // if (options.postConditions) {
      //   // Filter out string post conditions and only keep PostCondition objects
      //   for (const pc of options.postConditions) {
      //     if (typeof pc !== 'string') {
      //       postConditions.push(pc);
      //     }
      //   }
      // }

      const txOptions: SignedContractCallOptions = {
        contractAddress,
        contractName,
        functionName: options.functionName,
        functionArgs: options.functionArgs,
        senderKey: this.privateKey,
        network,
        postConditions: options.postConditions,
        postConditionMode: options.postConditionMode === 'allow' ? PostConditionMode.Allow : PostConditionMode.Deny,
        // fee: environment.supportedAsset.sBTC.fee, // Default fee, can be made configurable
        sponsored: options.sponsored || false
      };

      const transaction = await makeContractCall(txOptions);
      // const transactionSerialized = serializeTransaction(transaction);
      const transactionSerialized = transaction.serialize();

      // If sponsored, return the transaction without broadcasting
      if (options.sponsored) {
        return {
          transaction: transactionSerialized,
        };
      }

      // Otherwise, broadcast the transaction
      const broadcastResponse = await broadcastTransaction({ transaction, network });

      if ('error' in broadcastResponse) {
        throw new Error(broadcastResponse.error);
      }

      return broadcastResponse;
    } catch (error) {
      throw new Error('Contract call failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async signMessage(message: string): Promise<MessageSignatureResponse> {
    if (!this.connected || !this.privateKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const messageHashBytes = hashMessage(message);
      const messageHash = bytesToHex(messageHashBytes);

      // Sign the message hash with the private key
      const signature = signMessageHashRsv({
        messageHash: messageHash,
        privateKey: this.privateKey
      });      
      
      return {
        signature: signature,
        publicKey: this.publicKey || ''
      };
    } catch (error) {
      throw new Error('Message signing failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Check if there's an existing wallet in storage
   */
  private checkExistingWallet(): void {
    const walletData = localStorage.getItem(EmbeddedWalletAdapter.STORAGE_KEY);
    if (walletData) {
      // Wallet exists but is locked (encrypted)
      this.connected = false;
    }
  }

  /**
   * Save encrypted wallet to browser storage (password-based)
   */
  private async saveWalletToStorage(password: string, encryptionMethod: EncryptionMethod): Promise<void> {
    if (!this.privateKey || !this.address || !this.mnemonic) {
      throw new Error('No wallet data to save');
    }

    // Trim password to avoid whitespace issues
    password = password.trim();

    // Use Web Crypto API for encryption
    const encoder = new TextEncoder();
    const data = JSON.stringify({
      privateKey: this.privateKey,
      address: this.address,
      publicKey: this.publicKey,
      mnemonic: this.mnemonic
    });

    // Derive key from password
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoder.encode(data)
    );

    const walletData: EmbeddedWalletData = {
      encryptedPrivateKey: this.arrayBufferToBase64(encrypted),
      publicKey: this.publicKey || '',
      address: this.address,
      createdAt: Date.now(),
      salt: this.arrayBufferToBase64(salt.buffer),
      iv: this.arrayBufferToBase64(iv.buffer),
      encryptionMethod
    };

    console.log('[EmbeddedWallet] Saving wallet data:', {
      address: this.address,
      hasEncryptedData: !!walletData.encryptedPrivateKey,
      saltLength: walletData.salt.length,
      ivLength: walletData.iv.length,
      encryptionMethod
    });

    localStorage.setItem(EmbeddedWalletAdapter.STORAGE_KEY, JSON.stringify(walletData));
  }

  /**
   * Save encrypted wallet to browser storage (WebAuthn-based)
   */
  private async saveWalletWithWebAuthn(username: string): Promise<void> {
    if (!this.privateKey || !this.address || !this.mnemonic) {
      throw new Error('No wallet data to save');
    }

    // Create WebAuthn credential
    const credential = await WebAuthnService.createCredential(username);

    // Use Web Crypto API for encryption
    const encoder = new TextEncoder();
    const data = JSON.stringify({
      privateKey: this.privateKey,
      address: this.address,
      publicKey: this.publicKey,
      mnemonic: this.mnemonic
    });

    // Generate salt for HKDF
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive encryption key from WebAuthn public key using HKDF
    const key = await WebAuthnService.deriveEncryptionKey(credential.publicKey, salt);

    // Encrypt the wallet data
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoder.encode(data)
    );

    const walletData: EmbeddedWalletData = {
      encryptedPrivateKey: this.arrayBufferToBase64(encrypted),
      publicKey: this.publicKey || '',
      address: this.address,
      createdAt: Date.now(),
      salt: this.arrayBufferToBase64(salt.buffer),
      iv: this.arrayBufferToBase64(iv.buffer),
      encryptionMethod: EncryptionMethod.WEBAUTHN,
      webauthnCredentialId: credential.credentialId,
      webauthnPublicKey: this.arrayBufferToBase64(credential.publicKey)
    };

    console.log('[EmbeddedWallet] Saving wallet data with WebAuthn:', {
      address: this.address,
      hasEncryptedData: !!walletData.encryptedPrivateKey,
      saltLength: walletData.salt.length,
      ivLength: walletData.iv.length,
      hasCredentialId: !!walletData.webauthnCredentialId
    });

    localStorage.setItem(EmbeddedWalletAdapter.STORAGE_KEY, JSON.stringify(walletData));
  }

  /**
   * Load and decrypt wallet from storage
   */
  private loadWalletFromStorage(): { privateKey: string; address: string; publicKey: string; mnemonic: string } | null {
    const walletDataStr = localStorage.getItem(EmbeddedWalletAdapter.STORAGE_KEY);
    if (!walletDataStr) {
      return null;
    }

    try {
      const walletData: EmbeddedWalletData = JSON.parse(walletDataStr);
      // For now, return null as we need password to decrypt
      // This will be handled by unlock() method
      return null;
    } catch (error) {
      console.error('Failed to load wallet from storage:', error);
      return null;
    }
  }

  /**
   * Unlock the wallet with password
   */
  async unlock(password: string): Promise<boolean> {
    const walletDataStr = localStorage.getItem(EmbeddedWalletAdapter.STORAGE_KEY);
    if (!walletDataStr) {
      return false;
    }

    try {
      const walletData: EmbeddedWalletData = JSON.parse(walletDataStr);

      // Check encryption method
      if (walletData.encryptionMethod === EncryptionMethod.WEBAUTHN) {
        throw new Error('This wallet uses passkey authentication. Please use unlockWithPasskey() instead.');
      }

      console.log('[EmbeddedWallet] Attempting to unlock wallet:', {
        address: walletData.address,
        hasEncryptedData: !!walletData.encryptedPrivateKey,
        saltLength: walletData.salt.length,
        ivLength: walletData.iv.length
      });

      // Trim password to avoid whitespace issues
      password = password.trim();

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Derive key from password
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const salt = this.base64ToArrayBuffer(walletData.salt);
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const iv = this.base64ToArrayBuffer(walletData.iv);
      const encrypted = this.base64ToArrayBuffer(walletData.encryptedPrivateKey);

      console.log('[EmbeddedWallet] Decryption parameters ready, attempting decrypt...');

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );

      console.log('[EmbeddedWallet] Decryption successful!');

      const decryptedData = JSON.parse(decoder.decode(decrypted));

      this.privateKey = decryptedData.privateKey;
      this.address = decryptedData.address;
      this.publicKey = decryptedData.publicKey;
      this.mnemonic = decryptedData.mnemonic;
      this.connected = true;

      return true;
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
      // Check if it's a decryption error (wrong password)
      if (error instanceof DOMException && error.name === 'OperationError') {
        console.error('Decryption failed - likely incorrect password');
      }
      return false;
    }
  }

  /**
   * Unlock the wallet with WebAuthn passkey
   */
  async unlockWithPasskey(): Promise<boolean> {
    const walletDataStr = localStorage.getItem(EmbeddedWalletAdapter.STORAGE_KEY);
    if (!walletDataStr) {
      return false;
    }

    try {
      const walletData: EmbeddedWalletData = JSON.parse(walletDataStr);

      // Check encryption method
      if (walletData.encryptionMethod !== EncryptionMethod.WEBAUTHN) {
        throw new Error('This wallet uses password authentication. Please use unlock() instead.');
      }

      if (!walletData.webauthnCredentialId || !walletData.webauthnPublicKey) {
        throw new Error('WebAuthn credentials not found');
      }

      console.log('[EmbeddedWallet] Attempting to unlock wallet with passkey:', {
        address: walletData.address,
        hasEncryptedData: !!walletData.encryptedPrivateKey,
        hasCredentialId: !!walletData.webauthnCredentialId
      });

      const decoder = new TextDecoder();

      // Get the salt
      const salt = new Uint8Array(this.base64ToArrayBuffer(walletData.salt));

      // Derive encryption key using WebAuthn (this will trigger authentication)
      const key = await WebAuthnService.deriveEncryptionKeyForUnlock(
        walletData.webauthnCredentialId,
        walletData.webauthnPublicKey,
        salt
      );

      const iv = this.base64ToArrayBuffer(walletData.iv);
      const encrypted = this.base64ToArrayBuffer(walletData.encryptedPrivateKey);

      console.log('[EmbeddedWallet] Decryption parameters ready, attempting decrypt...');

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );

      console.log('[EmbeddedWallet] Decryption successful!');

      const decryptedData = JSON.parse(decoder.decode(decrypted));

      this.privateKey = decryptedData.privateKey;
      this.address = decryptedData.address;
      this.publicKey = decryptedData.publicKey;
      this.mnemonic = decryptedData.mnemonic;
      this.connected = true;

      return true;
    } catch (error) {
      console.error('Failed to unlock wallet with passkey:', error);
      return false;
    }
  }

  /**
   * Get the encryption method used for the stored wallet
   */
  static getEncryptionMethod(): EncryptionMethod | null {
    const walletDataStr = localStorage.getItem(EmbeddedWalletAdapter.STORAGE_KEY);
    if (!walletDataStr) {
      return null;
    }

    try {
      const walletData: EmbeddedWalletData = JSON.parse(walletDataStr);
      return walletData.encryptionMethod || EncryptionMethod.PASSWORD; // Default to password for legacy wallets
    } catch {
      return null;
    }
  }

  /**
   * Check if wallet exists in storage
   */
  static hasWallet(): boolean {
    return localStorage.getItem(EmbeddedWalletAdapter.STORAGE_KEY) !== null;
  }

  /**
   * Get the Stacks network instance based on environment configuration
   */
  private getStacksNetwork(): StacksNetwork {
    return environment.network === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
  }

  /**
   * Get network name string for wallet generation
   */
  private getNetworkName(): 'mainnet' | 'testnet' {
    return environment.network === 'mainnet' ? 'mainnet' : 'testnet';
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
