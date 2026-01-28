import { Injectable, signal, WritableSignal, computed, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  WalletAdapter,
  WalletType,
  WalletConnectionData,
  ContractCallOptions,
  MessageSignatureResponse,
  EncryptionMethod
} from './wallet.types';
import { ExternalWalletAdapter } from './external-wallet.adapter';
import { EmbeddedWalletAdapter } from './embedded-wallet.adapter';
import { WebAuthnService } from './webauthn.service';
import { TransactionResult } from '@stacks/connect/dist/types/methods';

/**
 * Wallet Manager Service
 * Coordinates between embedded and external wallet adapters
 * Provides a unified interface for wallet operations
 */
@Injectable({
  providedIn: 'root'
})
export class WalletManagerService {

  private currentAdapter: WalletAdapter | null = null;

  readonly isLoggedInSignal = signal(false);
  readonly userAddressSignal: WritableSignal<string | null> = signal<string | null>(null);
  readonly walletTypeSignal: WritableSignal<WalletType | null> = signal<WalletType | null>(null);
  readonly network = environment.network;

  readonly walletAddressSignal: Signal<string | null> = computed(() => {
    return this.userAddressSignal();
  });

  constructor(private router: Router) {
    this.initializeWallet();
  }

  /**
   * Initialize wallet on service creation
   * Check for existing connections
   */
  private initializeWallet(): void {
    // Check for external wallet connection first
    const externalAdapter = new ExternalWalletAdapter();
    if (externalAdapter.isConnected()) {
      this.currentAdapter = externalAdapter;
      this.isLoggedInSignal.set(true);
      this.userAddressSignal.set(externalAdapter.getAddress());
      this.walletTypeSignal.set(WalletType.EXTERNAL);
      return;
    }

    // Check for embedded wallet
    if (EmbeddedWalletAdapter.hasWallet()) {
      // Wallet exists but needs to be unlocked
      // Don't automatically set as connected
      this.walletTypeSignal.set(WalletType.EMBEDDED);
    }
  }

  /**
   * Connect using external wallet (Leather, Xverse, etc.)
   */
  async connectExternalWallet(): Promise<void> {
    try {
      const adapter = new ExternalWalletAdapter();
      const connectionData = await adapter.connect();

      this.currentAdapter = adapter;
      this.isLoggedInSignal.set(true);
      this.userAddressSignal.set(connectionData.address);
      this.walletTypeSignal.set(WalletType.EXTERNAL);
    } catch (error) {
      throw new Error('Failed to connect external wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Generate a new embedded wallet (password-based)
   */
  async generateEmbeddedWallet(password: string): Promise<{ mnemonic: string; address: string }> {
    try {
      const adapter = new EmbeddedWalletAdapter();
      const result = await adapter.generateNewWallet(password);

      this.currentAdapter = adapter;
      this.isLoggedInSignal.set(true);
      this.userAddressSignal.set(result.address);
      this.walletTypeSignal.set(WalletType.EMBEDDED);

      return result;
    } catch (error) {
      throw new Error('Failed to generate embedded wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Generate a new embedded wallet with WebAuthn passkey
   */
  async generateEmbeddedWalletWithPasskey(username: string = 'user'): Promise<{ mnemonic: string; address: string }> {
    try {
      const adapter = new EmbeddedWalletAdapter();
      const result = await adapter.generateNewWalletWithPasskey(username);

      this.currentAdapter = adapter;
      this.isLoggedInSignal.set(true);
      this.userAddressSignal.set(result.address);
      this.walletTypeSignal.set(WalletType.EMBEDDED);

      return result;
    } catch (error) {
      throw new Error('Failed to generate embedded wallet with passkey: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Import embedded wallet from mnemonic
   */
  async importEmbeddedWallet(mnemonic: string, password: string): Promise<void> {
    try {
      const adapter = new EmbeddedWalletAdapter();
      const connectionData = await adapter.importFromMnemonic(mnemonic, password);

      this.currentAdapter = adapter;
      this.isLoggedInSignal.set(true);
      this.userAddressSignal.set(connectionData.address);
      this.walletTypeSignal.set(WalletType.EMBEDDED);
    } catch (error) {
      throw new Error('Failed to import embedded wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Import embedded wallet from mnemonic with WebAuthn passkey
   */
  async importEmbeddedWalletWithPasskey(mnemonic: string, username: string = 'user'): Promise<void> {
    try {
      const adapter = new EmbeddedWalletAdapter();
      const connectionData = await adapter.importFromMnemonicWithPasskey(mnemonic, username);

      this.currentAdapter = adapter;
      this.isLoggedInSignal.set(true);
      this.userAddressSignal.set(connectionData.address);
      this.walletTypeSignal.set(WalletType.EMBEDDED);
    } catch (error) {
      throw new Error('Failed to import embedded wallet with passkey: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Unlock existing embedded wallet with password
   */
  async unlockEmbeddedWallet(password: string): Promise<void> {
    try {
      const adapter = new EmbeddedWalletAdapter();
      const unlocked = await adapter.unlock(password);

      if (!unlocked) {
        throw new Error('Invalid password');
      }

      // No need to call connect() - unlock() already sets up the wallet state
      this.currentAdapter = adapter;
      this.isLoggedInSignal.set(true);
      this.userAddressSignal.set(adapter.getAddress());
      this.walletTypeSignal.set(WalletType.EMBEDDED);
    } catch (error) {
      throw new Error('Failed to unlock wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Unlock existing embedded wallet with WebAuthn passkey
   */
  async unlockEmbeddedWalletWithPasskey(): Promise<void> {
    try {
      const adapter = new EmbeddedWalletAdapter();
      const unlocked = await adapter.unlockWithPasskey();

      if (!unlocked) {
        throw new Error('Failed to authenticate with passkey');
      }

      this.currentAdapter = adapter;
      this.isLoggedInSignal.set(true);
      this.userAddressSignal.set(adapter.getAddress());
      this.walletTypeSignal.set(WalletType.EMBEDDED);
    } catch (error) {
      throw new Error('Failed to unlock wallet with passkey: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Disconnect current wallet
   */
  signOut(): void {
    if (!this.currentAdapter) {
      return;
    }

    this.currentAdapter.disconnect();
    this.currentAdapter = null;
    this.isLoggedInSignal.set(false);
    this.userAddressSignal.set(null);
    this.walletTypeSignal.set(null);
    this.router.navigate(['/']);
  }

  /**
   * Delete embedded wallet permanently
   */
  deleteEmbeddedWallet(): void {
    // If wallet is currently unlocked, use the adapter's delete method
    if (this.currentAdapter instanceof EmbeddedWalletAdapter) {
      this.currentAdapter.deleteWallet();
      this.signOut();
    } else {
      // If wallet is locked, delete directly from localStorage
      localStorage.removeItem('b2pix_embedded_wallet');
      localStorage.removeItem('b2pix_embedded_wallet_mnemonic');
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.isLoggedInSignal();
  }

  /**
   * Get current wallet type
   */
  getWalletType(): WalletType | null {
    return this.walletTypeSignal();
  }

  /**
   * Get wallet address
   */
  getSTXAddress(): string | null {
    return this.userAddressSignal();
  }

  /**
   * Get wallet address or throw error
   */
  getSTXAddressOrThrow(): string {
    const address = this.userAddressSignal();
    if (!address) {
      throw new Error('STX address not available. User may not be connected.');
    }
    return address;
  }

  /**
   * Get identity address (deprecated, returns STX address)
   */
  getIdentityAddress(): string | null {
    return this.userAddressSignal();
  }

  /**
   * Get network
   */
  getNetwork() {
    return this.network;
  }

  /**
   * Get API URL
   */
  getApiUrl() {
    return environment.blockchainAPIUrl;
  }

  /**
   * Get STX balance
   */
  getSTXBalance(): Observable<number> {
    const address = this.getSTXAddress();
    return new Observable<number>((observer) => {
      fetch(`${this.getApiUrl()}/v2/accounts/${address}`)
        .then(response => response.json())
        .then((data) => {
          observer.next(data.balance);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Call a smart contract function
   */
  async callContract(options: ContractCallOptions): Promise<TransactionResult> {
    if (!this.currentAdapter) {
      throw new Error('No wallet connected');
    }

    return this.currentAdapter.callContract(options);
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<MessageSignatureResponse> {
    if (!this.currentAdapter) {
      throw new Error('No wallet connected');
    }

    return this.currentAdapter.signMessage(message);
  }

  /**
   * Get mnemonic from embedded wallet (if applicable)
   */
  getEmbeddedWalletMnemonic(): string | null {
    if (this.currentAdapter instanceof EmbeddedWalletAdapter) {
      return this.currentAdapter.getMnemonic();
    }
    return null;
  }

  /**
   * Check if embedded wallet exists
   */
  hasEmbeddedWallet(): boolean {
    return EmbeddedWalletAdapter.hasWallet();
  }

  /**
   * Check if user has external wallet available
   */
  hasExternalWalletAvailable(): boolean {
    // Check if Leather or other wallet extension is available
    return typeof window !== 'undefined' &&
           (window as any).StacksProvider !== undefined;
  }

  /**
   * Check if WebAuthn is supported by the browser
   */
  isWebAuthnSupported(): boolean {
    return WebAuthnService.isWebAuthnSupported();
  }

  /**
   * Check if platform authenticator is available (Touch ID, Face ID, Windows Hello)
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    return WebAuthnService.isPlatformAuthenticatorAvailable();
  }

  /**
   * Get the encryption method used for the stored wallet
   */
  getWalletEncryptionMethod(): EncryptionMethod | null {
    return EmbeddedWalletAdapter.getEncryptionMethod();
  }

  /**
   * Legacy compatibility - get wallet data
   */
  getWalletData() {
    if (this.currentAdapter instanceof ExternalWalletAdapter) {
      // Return data in format compatible with old code
      return {
        addresses: {
          stx: [{
            address: this.currentAdapter.getAddress()
          }]
        }
      };
    }
    return null;
  }
}
