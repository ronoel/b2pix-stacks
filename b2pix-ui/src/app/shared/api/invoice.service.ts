import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { SignedRequest } from '../models/api.model';
import {
  Invoice,
  PaginatedInvoicesResponse,
  PayResponse,
  SessionStatusResponse,
  PayInPersonResponse,
  PaymentStatusResponse,
  CancelPaymentResponse,
  MessageResponse,
  InvoicePublicSummary,
  OtpSendResponse,
} from '../models/invoice.model';

@Injectable({ providedIn: 'root' })
export class InvoiceApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private walletManager = inject(WalletManagerService);

  // =========================================================================
  // Merchant Endpoints (SignedRequest)
  // =========================================================================

  createInvoice(valueBrl: number, label?: string): Observable<Invoice> {
    const timestamp = new Date().toISOString();
    const lines = ['B2PIX - Criar Invoice', 'b2pix.org', valueBrl.toString(), label ?? ''];
    lines.push(timestamp);
    const payload = lines.join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<Invoice>(`${this.apiUrl}/v1/invoices`, data);
      }),
      catchError(this.handleError)
    );
  }

  cancelInvoice(invoiceId: string): Observable<Invoice> {
    const timestamp = new Date().toISOString();
    const payload = ['B2PIX - Cancelar Invoice', 'b2pix.org', invoiceId, timestamp].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.delete<Invoice>(`${this.apiUrl}/v1/invoices`, { body: data });
      }),
      catchError(this.handleError)
    );
  }

  getInvoicesByAddress(
    address: string,
    options: { page?: number; limit?: number } = {}
  ): Observable<PaginatedInvoicesResponse> {
    let params = new HttpParams();
    if (options.page !== undefined) params = params.set('page', options.page.toString());
    if (options.limit !== undefined) params = params.set('limit', options.limit.toString());

    return this.http.get<PaginatedInvoicesResponse>(
      `${this.apiUrl}/v1/invoices/address/${address}`,
      { params }
    );
  }

  getInvoiceById(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/v1/invoices/${id}`);
  }

  getPaymentStatus(invoiceId: string): Observable<PaymentStatusResponse> {
    return this.http.get<PaymentStatusResponse>(`${this.apiUrl}/v1/invoices/${invoiceId}/payment-status`);
  }

  payInPerson(invoiceId: string): Observable<PayInPersonResponse> {
    const timestamp = new Date().toISOString();
    const payload = ['B2PIX - Pagamento Presencial', 'b2pix.org', invoiceId, timestamp].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<PayInPersonResponse>(`${this.apiUrl}/v1/invoices/${invoiceId}/pay-in-person`, data);
      }),
      catchError(this.handleError)
    );
  }

  checkPaymentInPerson(invoiceId: string): Observable<PaymentStatusResponse> {
    const timestamp = new Date().toISOString();
    const payload = ['B2PIX - Verificar Pagamento', 'b2pix.org', invoiceId, timestamp].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<PaymentStatusResponse>(`${this.apiUrl}/v1/invoices/${invoiceId}/check-payment`, data);
      }),
      catchError(this.handleError)
    );
  }

  cancelPayment(invoiceId: string): Observable<CancelPaymentResponse> {
    const timestamp = new Date().toISOString();
    const payload = ['B2PIX - Cancelar Pagamento', 'b2pix.org', invoiceId, timestamp].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<CancelPaymentResponse>(`${this.apiUrl}/v1/invoices/${invoiceId}/cancel-payment`, data);
      }),
      catchError(this.handleError)
    );
  }

  setClientEmail(invoiceId: string, email: string): Observable<MessageResponse> {
    const timestamp = new Date().toISOString();
    const payload = ['B2PIX - Email do Cliente', 'b2pix.org', invoiceId, email, timestamp].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<MessageResponse>(`${this.apiUrl}/v1/invoices/${invoiceId}/client-email`, data);
      }),
      catchError(this.handleError)
    );
  }

  // =========================================================================
  // Client Payment Endpoints (Public / Bearer Token)
  // =========================================================================

  getInvoiceByToken(token: string): Observable<InvoicePublicSummary> {
    return this.http.get<InvoicePublicSummary>(`${this.apiUrl}/v1/invoices/pay/${token}`);
  }

  sendOtpCode(token: string, email: string): Observable<OtpSendResponse> {
    return this.http.post<OtpSendResponse>(
      `${this.apiUrl}/v1/invoices/pay/${token}/otp/send`,
      { email }
    );
  }

  initiatePayment(token: string, email: string, otpCode: string): Observable<PayResponse> {
    return this.http.post<PayResponse>(
      `${this.apiUrl}/v1/invoices/pay/${token}/pay`,
      { email, otp_code: otpCode }
    );
  }

  getSessionStatus(token: string, sessionToken: string): Observable<SessionStatusResponse> {
    return this.http.get<SessionStatusResponse>(
      `${this.apiUrl}/v1/invoices/pay/${token}/session`,
      { headers: { Authorization: `Bearer ${sessionToken}` } }
    );
  }

  markSessionPaid(token: string, sessionToken: string): Observable<SessionStatusResponse> {
    return this.http.post<SessionStatusResponse>(
      `${this.apiUrl}/v1/invoices/pay/${token}/session/paid`,
      {},
      { headers: { Authorization: `Bearer ${sessionToken}` } }
    );
  }

  resubmitSession(token: string, sessionToken: string): Observable<SessionStatusResponse> {
    return this.http.post<SessionStatusResponse>(
      `${this.apiUrl}/v1/invoices/pay/${token}/session/resubmit`,
      {},
      { headers: { Authorization: `Bearer ${sessionToken}` } }
    );
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  getPaymentLink(paymentToken: string): string {
    return `${window.location.origin}/pay/${paymentToken}`;
  }

  private handleError(error: any): never {
    console.error('InvoiceApiService error:', error);

    if (error.message?.includes('User denied')) {
      throw new Error('Assinatura cancelada pelo usuário');
    }
    if (error.error?.error) {
      const err: any = new Error(error.error.error);
      err.status = error.status;
      throw err;
    }
    throw error;
  }
}
