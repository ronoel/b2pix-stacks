import { computed, Signal, WritableSignal, signal, Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { WalletManagerService } from './wallet/wallet-manager.service';

const myAppName = 'BoltProto'; // shown in wallet pop-up
const myAppIcon = 'https://storage.googleapis.com/bitfund/boltproto-icon.png'; // shown in wallet pop-up

/**
 * Service responsible for managing the user's wallet and authentication status.
 * This service now acts as a facade over WalletManagerService for backward compatibility.
 *
 * @deprecated Consider using WalletManagerService directly for new code.
 */
@Injectable({
  providedIn: 'root'
})
export class WalletService {

  private walletManager = inject(WalletManagerService);

  readonly isLoggedInSignal = this.walletManager.isLoggedInSignal;
  readonly userAddressSignal = this.walletManager.userAddressSignal;
  readonly network = environment.network;
  private router = inject(Router);

  readonly walletAddressSignal: Signal<string | null> = computed(() => {
    return this.userAddressSignal();
  });

  constructor() {
    // Wallet manager handles initialization
  }

  /**
   * Initiates the sign-in process for the user using external wallet.
   * If the user is already signed in, it logs a message and returns.
   * If the user is not signed in, it shows a connect pop-up and updates the `isLoggedInSignal` when finished.
   */
  public async signIn() {
    if (this.isLoggedInSignal()) {
      return;
    }

    try {
      await this.walletManager.connectExternalWallet();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  }

  /**
   * Signs out the user if they are signed in.
   * If the user is not signed in, it logs a message and returns.
   */
  public signOut() {
    if (!this.isLoggedInSignal()) {
      return;
    }

    this.walletManager.signOut();
  }

  /**
   * Checks if the user is currently signed in.
   * @returns `true` if the user is signed in, `false` otherwise.
   */
  public isLoggedIn() {
    return this.walletManager.isLoggedIn();
  }

  /**
   * Retrieves the wallet connection data.
   * @returns The local storage data or null if not connected.
   */
  public getWalletData() {
    return this.walletManager.getWalletData();
  }

  /**
   * Retrieves the identity address of the currently signed-in user.
   * In v8, this returns the STX address as identity address is deprecated.
   * @returns The STX address.
   */
  public getIdentityAddress() {
    return this.walletManager.getIdentityAddress();
  }

  /**
   * Retrieves the STX address of the currently signed-in user.
   * @returns The STX address.
   */
  public getSTXAddress() {
    return this.walletManager.getSTXAddress();
  }

  /**
   * Retrieves the STX address or throws an error if not available.
   * @returns The STX address.
   * @throws Error if user is not connected or address is not available.
   */
  public getSTXAddressOrThrow(): string {
    return this.walletManager.getSTXAddressOrThrow();
  }

  public getNetwork() {
    return this.walletManager.getNetwork();
  }

  public getApiUrl() {
    return this.walletManager.getApiUrl();
  }

  /**
   * Retrieves the balance of STX tokens in the user's wallet.
   * @returns An Observable that emits the balance of STX tokens.
   */
  public getSTXBalance(): Observable<number> {
    return this.walletManager.getSTXBalance();
  }

  /**
   * Signs a message using the user's wallet.
   * @param message The message to sign.
   * @returns A Promise that resolves to the signature data containing signature and publicKey.
   */
  public async signMessage(message: string): Promise<{ signature: string, publicKey: string }> {
    return this.walletManager.signMessage(message);
  }

}
