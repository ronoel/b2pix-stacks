import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import {
  PixPayoutRequest,
  PaginatedPayoutRequestResponse,
  LpStats,
  PayoutSourceType
} from '../models/pix-payout-request.model';
import { PaginatedLedgerResponse } from '../models/lp-ledger.model';
import { buildDisputePayload, buildConfirmReceiptPayload } from '../models/pix-order-payloads';

export interface GetPayoutRequestsParams {
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class PixPayoutRequestService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private walletManager = inject(WalletManagerService);

  /**
   * Get active (non-final) payout requests for a payer address.
   */
  getActivePayoutRequests(payerAddress: string): Observable<PixPayoutRequest[]> {
    const httpParams = new HttpParams().set('payer_address', payerAddress);

    return this.http.get<PixPayoutRequest[]>(`${this.apiUrl}/v1/pix-payout-requests/active`, {
      params: httpParams
    }).pipe(
      catchError((error: any) => {
        console.error('Error fetching active payout requests:', error);
        throw error;
      })
    );
  }

  /**
   * Get the queue of pending payout requests available for LPs.
   */
  getQueue(params?: GetPayoutRequestsParams): Observable<PaginatedPayoutRequestResponse> {
    let httpParams = new HttpParams();
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<PaginatedPayoutRequestResponse>(`${this.apiUrl}/v1/pix-payout-requests/queue`, {
      params: httpParams
    }).pipe(
      catchError((error: any) => {
        console.error('Error fetching payout request queue:', error);
        throw error;
      })
    );
  }

  /**
   * Get payout requests by source (order type + order ID).
   */
  getBySource(sourceType: PayoutSourceType, sourceId: string): Observable<PixPayoutRequest[]> {
    const httpParams = new HttpParams()
      .set('source_type', sourceType)
      .set('source_id', sourceId);

    return this.http.get<PixPayoutRequest[]>(`${this.apiUrl}/v1/pix-payout-requests/by-source`, {
      params: httpParams
    }).pipe(
      catchError((error: any) => {
        console.error('Error fetching payout requests by source:', error);
        throw error;
      })
    );
  }

  /**
   * Get a single payout request by ID
   */
  getById(id: string): Observable<PixPayoutRequest> {
    return this.http.get<PixPayoutRequest>(`${this.apiUrl}/v1/pix-payout-requests/${id}`).pipe(
      catchError((error: any) => {
        console.error('Error fetching payout request:', error);
        throw error;
      })
    );
  }

  /**
   * Accept a payout request from the queue.
   */
  acceptRequest(id: string): Observable<PixPayoutRequest> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Aceitar Payout Request',
      'b2pix.org',
      id,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<PixPayoutRequest>(`${this.apiUrl}/v1/pix-payout-requests/${id}/accept`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error accepting payout request:', error);
        throw error;
      })
    );
  }

  /**
   * Confirm PIX payment for an accepted payout request.
   * Bank verification is done automatically by the backend.
   */
  payRequest(id: string): Observable<PixPayoutRequest> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Confirmar Payout PIX',
      'b2pix.org',
      id,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<PixPayoutRequest>(`${this.apiUrl}/v1/pix-payout-requests/${id}/pay`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error confirming payout payment:', error);
        throw error;
      })
    );
  }

  /**
   * Cancel an accepted payout request. Returns it to the queue for another LP.
   */
  cancelRequest(id: string): Observable<PixPayoutRequest> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Cancelar Payout Request',
      'b2pix.org',
      id,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<PixPayoutRequest>(`${this.apiUrl}/v1/pix-payout-requests/${id}/cancel`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error cancelling payout request:', error);
        throw error;
      })
    );
  }

  /**
   * Confirm PIX receipt for a payout request (payer confirms they received the PIX).
   */
  confirmReceipt(id: string): Observable<PixPayoutRequest> {
    const payload = buildConfirmReceiptPayload(id);

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<PixPayoutRequest>(`${this.apiUrl}/v1/pix-payout-requests/${id}/confirm-receipt`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error confirming receipt:', error);
        throw error;
      })
    );
  }

  /**
   * Dispute a payout request (customer reports non-receipt of PIX).
   */
  disputeRequest(id: string): Observable<PixPayoutRequest> {
    const payload = buildDisputePayload(id);

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<PixPayoutRequest>(`${this.apiUrl}/v1/pix-payout-requests/${id}/dispute`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error disputing payout request:', error);
        throw error;
      })
    );
  }

  /**
   * Report a problem with an accepted payout request.
   */
  reportRequest(id: string, reason: string): Observable<PixPayoutRequest> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Reportar Problema Payout',
      'b2pix.org',
      id,
      reason,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<PixPayoutRequest>(`${this.apiUrl}/v1/pix-payout-requests/${id}/report`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error reporting payout request:', error);
        throw error;
      })
    );
  }

  /**
   * Get LP performance stats.
   */
  getLpStats(): Observable<LpStats> {
    const address = this.walletManager.getSTXAddress();
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const httpParams = new HttpParams().set('address', address);

    return this.http.get<LpStats>(`${this.apiUrl}/v1/lp/stats`, {
      params: httpParams
    }).pipe(
      catchError((error: any) => {
        console.error('Error fetching LP stats:', error);
        throw error;
      })
    );
  }

  /**
   * Convert BRL balance to BTC.
   */
  convertBalance(amountCents: number): Observable<void> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Converter Saldo para BTC',
      'b2pix.org',
      amountCents.toString(),
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<void>(`${this.apiUrl}/v1/lp/convert`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error converting balance:', error);
        throw error;
      })
    );
  }

  /**
   * Withdraw accumulated BTC.
   */
  withdrawBtc(amountSatoshis: number): Observable<void> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Sacar BTC',
      'b2pix.org',
      amountSatoshis.toString(),
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<void>(`${this.apiUrl}/v1/lp/withdraw`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error withdrawing BTC:', error);
        throw error;
      })
    );
  }

  /**
   * Get LP BTC ledger (rewards, conversions, withdrawals).
   */
  getLedger(params?: GetPayoutRequestsParams): Observable<PaginatedLedgerResponse> {
    const address = this.walletManager.getSTXAddress();
    if (!address) {
      throw new Error('Wallet not connected');
    }

    let httpParams = new HttpParams().set('address', address);
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<PaginatedLedgerResponse>(`${this.apiUrl}/v1/lp/ledger`, {
      params: httpParams
    }).pipe(
      catchError((error: any) => {
        console.error('Error fetching LP ledger:', error);
        throw error;
      })
    );
  }

  /**
   * Get LP order history (now returns payout request items).
   */
  getLpHistory(params?: GetPayoutRequestsParams): Observable<PaginatedPayoutRequestResponse> {
    const address = this.walletManager.getSTXAddress();
    if (!address) {
      throw new Error('Wallet not connected');
    }

    let httpParams = new HttpParams().set('address', address);
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<PaginatedPayoutRequestResponse>(`${this.apiUrl}/v1/lp/history`, {
      params: httpParams
    }).pipe(
      catchError((error: any) => {
        console.error('Error fetching LP history:', error);
        throw error;
      })
    );
  }
}
