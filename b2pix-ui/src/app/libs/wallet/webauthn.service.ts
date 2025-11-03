/**
 * WebAuthn Service for Passkey-based wallet encryption
 * Handles credential creation, authentication, and key derivation using HKDF
 */

export interface WebAuthnCredentialInfo {
  credentialId: string;
  publicKey: ArrayBuffer;
}

export interface WebAuthnStoredData {
  credentialId: string;
  // User handle for identifying the credential
  userHandle: string;
}

export class WebAuthnService {
  private static readonly RP_NAME = 'B2Pix Wallet';
  private static readonly RP_ID = window.location.hostname;

  /**
   * Check if WebAuthn is supported by the browser
   */
  static isWebAuthnSupported(): boolean {
    return !!(
      window.PublicKeyCredential &&
      navigator.credentials &&
      navigator.credentials.create
    );
  }

  /**
   * Check if platform authenticator (like Touch ID, Face ID, Windows Hello) is available
   */
  static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) {
      return false;
    }

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Create a new WebAuthn credential (passkey)
   */
  static async createCredential(
    username: string = 'user'
  ): Promise<WebAuthnCredentialInfo> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    // Generate a random user handle
    const userHandle = crypto.getRandomValues(new Uint8Array(32));

    // Generate a random challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: this.RP_NAME,
        id: this.RP_ID,
      },
      user: {
        id: userHandle,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        // Prefer ES256 (ECDSA with SHA-256)
        { alg: -7, type: 'public-key' },
        // Fallback to RS256 (RSA with SHA-256)
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        // Prefer platform authenticators (Touch ID, Face ID, Windows Hello)
        authenticatorAttachment: 'platform',
        // Require user verification (biometric or PIN)
        userVerification: 'required',
        // Require a resident key (passkey) that can be discovered
        residentKey: 'required',
        requireResidentKey: true,
      },
      timeout: 60000,
      attestation: 'none',
    };

    try {
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;

      // Store credential ID and user handle for later authentication
      const credentialInfo: WebAuthnStoredData = {
        credentialId: this.arrayBufferToBase64(credential.rawId),
        userHandle: this.arrayBufferToBase64(userHandle.buffer),
      };

      // Extract the public key from the attestation response
      const publicKey = response.getPublicKey();
      if (!publicKey) {
        throw new Error('Failed to extract public key from credential');
      }

      return {
        credentialId: credentialInfo.credentialId,
        publicKey,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('User cancelled passkey creation');
        }
        throw new Error(`Failed to create passkey: ${error.message}`);
      }
      throw new Error('Failed to create passkey');
    }
  }

  /**
   * Authenticate using an existing WebAuthn credential
   */
  static async authenticate(credentialId?: string): Promise<ArrayBuffer> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    // Generate a random challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      rpId: this.RP_ID,
    };

    // If we have a specific credential ID, request only that one
    if (credentialId) {
      publicKeyCredentialRequestOptions.allowCredentials = [{
        id: this.base64ToArrayBuffer(credentialId),
        type: 'public-key',
        transports: ['internal'],
      }];
    }

    try {
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to authenticate');
      }

      // Return the credential ID which we'll use to derive the encryption key
      return credential.rawId;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('User cancelled authentication');
        }
        throw new Error(`Authentication failed: ${error.message}`);
      }
      throw new Error('Authentication failed');
    }
  }

  /**
   * Derive an encryption key from the WebAuthn public key using HKDF
   * This ensures the same key is always derived from the same public key
   */
  static async deriveEncryptionKey(
    publicKey: ArrayBuffer,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    // First, import the raw public key data as key material
    // We'll use HKDF to derive a key from this material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      publicKey,
      'HKDF',
      false,
      ['deriveKey']
    );

    // Use HKDF to derive an AES-GCM key from the public key
    const info = new TextEncoder().encode('B2Pix Wallet Encryption Key');

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: salt.buffer as ArrayBuffer,
        info: info.buffer as ArrayBuffer,
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return derivedKey;
  }

  /**
   * Re-derive the encryption key for unlocking
   * This requires authenticating with the passkey first
   */
  static async deriveEncryptionKeyForUnlock(
    credentialId: string,
    publicKeyBase64: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    // First, authenticate to prove the user has access to the passkey
    await this.authenticate(credentialId);

    // After successful authentication, derive the encryption key from the stored public key
    const publicKey = this.base64ToArrayBuffer(publicKeyBase64);
    return this.deriveEncryptionKey(publicKey, salt);
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
