import { HttpClient } from "@angular/common/http";
import { Injectable, inject, effect } from "@angular/core";
import { Observable, from, of } from 'rxjs';
import { switchMap, catchError, tap, map } from 'rxjs/operators';
import { environment } from "../../../environments/environment";
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { SignedRequest } from "../models/api.model";
import {
  SendEmailCodeResponse,
  VerifyEmailCodeResponse,
  PixVerifyResponse,
  EmailVerificationStatus,
  PixVerificationStatus,
  AccountInfo,
  ValidationStatus,
  AccountPixVerify,
  PixResolution
} from "../models/account-validation.model";

@Injectable({ providedIn: 'root' })
export class AccountValidationService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private walletManager = inject(WalletManagerService);

  // Cache only for getAccount()
  private accountCache = new Map<string, AccountInfo>();

  constructor() {
    // Limpar cache ao deslogar
    effect(() => {
      if (!this.walletManager.isLoggedIn()) {
        this.clearAccountCache();
      }
    });
  }

  // ==================== EMAIL VERIFICATION ====================

  /**
   * Envia código de verificação para o email
   */
  sendEmailCode(email: string): Observable<SendEmailCodeResponse> {
    const timestamp = new Date().toISOString();
    const payloadString = [
      'B2PIX - Enviar Código de Verificação de Email',
      'b2pix.org',
      email,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payloadString)).pipe(
      switchMap(signedMessage => {
        const data = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload: payloadString
        };
        return this.http.post<SendEmailCodeResponse>(
          `${this.apiUrl}/v1/account/email/send-code`,
          data
        );
      }),
      tap(() => {
        this.clearAccountCache();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Verifica o código de email
   */
  verifyEmailCode(code: string): Observable<VerifyEmailCodeResponse> {
    const timestamp = new Date().toISOString();
    const payloadString = [
      'B2PIX - Verificar Código de Email',
      'b2pix.org',
      code,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payloadString)).pipe(
      switchMap(signedMessage => {
        const data = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload: payloadString
        };
        return this.http.post<VerifyEmailCodeResponse>(
          `${this.apiUrl}/v1/account/email/verify-code`,
          data
        );
      }),
      tap(() => {
        this.clearAccountCache();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtém o status da verificação de email
   */
  getEmailVerification(): Observable<EmailVerificationStatus> {
    const address = this.walletManager.getSTXAddress();
    if (!address) {
      return of({ status: null });
    }

    return this.http.get<EmailVerificationStatus>(
      `${this.apiUrl}/v1/account/email/verify/${address}`
    ).pipe(
      tap(() => {
        this.clearAccountCache();
      }),
      catchError(() => of({ status: null }))
    );
  }

  // ==================== PIX VERIFICATION ====================

  /**
   * Cria uma nova verificação PIX
   */
  createPixVerification(userPixKey: string): Observable<PixVerifyResponse> {
    const timestamp = new Date().toISOString();
    const payloadString = [
      'B2PIX - Criar Verificação de PIX',
      'b2pix.org',
      userPixKey,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payloadString)).pipe(
      switchMap(signedMessage => {
        const data = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload: payloadString
        };
        return this.http.post<PixVerifyResponse>(
          `${this.apiUrl}/v1/account/pix/create-verify`,
          data
        );
      }),
      tap(() => {
        this.clearAccountCache();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Confirma o pagamento PIX
   */
  confirmPixPayment(pixConfirmationCode?: string): Observable<PixVerifyResponse> {
    const timestamp = new Date().toISOString();
    const payloadString = [
      'B2PIX - Confirmar Pagamento PIX',
      'b2pix.org',
      pixConfirmationCode || 'NONE',
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payloadString)).pipe(
      switchMap(signedMessage => {
        const data = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload: payloadString
        };
        return this.http.post<PixVerifyResponse>(
          `${this.apiUrl}/v1/account/pix/confirm`,
          data
        );
      }),
      tap(() => {
        this.clearAccountCache();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtém o status da verificação PIX
   */
  getPixVerification(): Observable<PixVerificationStatus> {
    const address = this.walletManager.getSTXAddress();
    if (!address) {
      return of({ status: null });
    }

    return this.http.get<PixVerificationStatus>(
      `${this.apiUrl}/v1/account/pix/verify/${address}`
    ).pipe(
      tap(() => {
        this.clearAccountCache();
      }),
      catchError(() => of({ status: null }))
    );
  }

  // ==================== ACCOUNT STATUS ====================

  /**
   * Obtém informações da conta
   */
  getAccount(): Observable<AccountInfo> {
    const address = this.walletManager.getSTXAddress();
    if (!address) {
      return of({
        address: '',
        email_verified: false,
        pix_verified: false
      });
    }

    // Verificar cache
    const cached = this.accountCache.get(address);
    if (cached) {
      return of(cached);
    }

    return this.http.get<AccountInfo>(
      `${this.apiUrl}/v1/account/${address}`
    ).pipe(
      tap(account => {
        if (account) {
          this.accountCache.set(address, account);
        }
      }),
      catchError(() => of({
        address,
        email_verified: false,
        pix_verified: false
      }))
    );
  }

  /**
   * Obtém status consolidado de validação
   */
  getValidationStatus(): Observable<ValidationStatus> {
    const address = this.walletManager.getSTXAddress();
    if (!address) {
      return of({
        email_verified: false,
        email_verification_pending: false,
        pix_verified: false,
        pix_verification_pending: false
      });
    }

    return this.http.get<ValidationStatus>(
      `${this.apiUrl}/v1/account/validation-status/${address}`
    ).pipe(
      tap(() => {
        this.clearAccountCache();
      }),
      catchError(() => of({
        email_verified: false,
        email_verification_pending: false,
        pix_verified: false,
        pix_verification_pending: false
      }))
    );
  }

  // ==================== CACHE MANAGEMENT ====================

  clearAccountCache(): void {
    this.accountCache.clear();
  }

  // ==================== PIX MODERATION (Manager only) ====================

  /**
   * Obtém todas as verificações PIX com status "processing"
   * Apenas para manager
   */
  getProcessingPixVerifications(): Observable<AccountPixVerify[]> {
    return this.http.get<AccountPixVerify[]>(
      `${this.apiUrl}/v1/account/pix/processing`
    ).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Resolve uma verificação PIX (aprova ou rejeita)
   * Apenas para manager
   */
  resolvePixVerification(address: string, resolution: PixResolution): Observable<AccountPixVerify> {
    const timestamp = new Date().toISOString();
    const payloadString = [
      'B2PIX - Resolver Verificação de PIX',
      'b2pix.org',
      address,
      resolution,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payloadString)).pipe(
      switchMap(signedMessage => {
        const data = {
          payload: payloadString,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        };
        return this.http.post<AccountPixVerify>(
          `${this.apiUrl}/v1/account/pix/resolve`,
          data
        );
      }),
      tap(() => {
        this.clearAccountCache();
      }),
      catchError(this.handleError)
    );
  }

  // ==================== ERROR HANDLING ====================

  private handleError(error: any): Observable<never> {
    console.error('AccountValidationService error:', error);

    // Usuário cancelou assinatura
    if (error.message?.includes('User denied')) {
      throw new Error('Assinatura cancelada pelo usuário');
    }

    // Erro da API com mensagem
    if (error.error?.error) {
      throw new Error(error.error.error);
    }

    // Rate limit
    if (error.status === 429) {
      const message = error.error?.error || 'Muitas tentativas. Aguarde antes de tentar novamente.';
      throw new Error(message);
    }

    // Não encontrado
    if (error.status === 404) {
      const message = error.error?.error || 'Não encontrado';
      throw new Error(message);
    }

    // Expirado
    if (error.status === 410) {
      const message = error.error?.error || 'Verificação expirada';
      throw new Error(message);
    }

    // Máximo de tentativas
    if (error.status === 403) {
      const message = error.error?.error || 'Máximo de tentativas excedido';
      throw new Error(message);
    }

    throw error;
  }
}
