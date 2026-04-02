import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { SignedRequest } from '../models/api.model';
import { PixInboundRequestResponse, PaginatedInboundRequestResponse, BankPixQueryResponse } from '../models/pix-inbound.model';

@Injectable({ providedIn: 'root' })
export class PixInboundService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private walletManager = inject(WalletManagerService);

  /**
   * Get all PixInboundRequests in Analyzing status (Manager only)
   */
  getAnalyzingRequests(): Observable<PixInboundRequestResponse[]> {
    return this.http.get<PixInboundRequestResponse[]>(`${this.apiUrl}/v1/pix-inbound/analyzing`);
  }

  /**
   * Query bank PIX transactions received for a given inbound request
   */
  getBankPix(inboundRequestId: string): Observable<BankPixQueryResponse> {
    return this.http.get<BankPixQueryResponse>(`${this.apiUrl}/v1/pix-inbound/${inboundRequestId}/bank-pix`);
  }

  /**
   * Get confirmed PIX inbound requests for the connected LP address.
   */
  getConfirmedForLp(params?: { page?: number; limit?: number }): Observable<PaginatedInboundRequestResponse> {
    const address = this.walletManager.getSTXAddress();
    if (!address) {
      throw new Error('Wallet not connected');
    }

    let httpParams = new HttpParams();
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<PaginatedInboundRequestResponse>(`${this.apiUrl}/v1/pix-inbound/confirmed/${address}`, {
      params: httpParams
    }).pipe(
      catchError((error: any) => {
        console.error('Error fetching confirmed inbound requests:', error);
        throw error;
      })
    );
  }

  /**
   * Resolve an Analyzing request as confirmed or rejected (Manager only)
   */
  resolveAnalyzingRequest(
    inboundRequestId: string,
    resolution: 'confirmed' | 'rejected',
    pixEndToEndId?: string
  ): Observable<PixInboundRequestResponse> {
    const timestamp = new Date().toISOString();
    const lines = [
      'B2PIX - Resolver Análise PIX Inbound',
      'b2pix.org',
      inboundRequestId,
      resolution,
    ];
    if (pixEndToEndId) {
      lines.push(pixEndToEndId);
    }
    lines.push(timestamp);
    const payload = lines.join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.put<PixInboundRequestResponse>(`${this.apiUrl}/v1/pix-inbound/resolve`, data);
      }),
      catchError((error: any) => {
        console.error('Error in resolveAnalyzingRequest:', error);
        if (error.message?.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        if (error.status === 409 && error.error?.error === 'duplicate_pix_order') {
          throw new Error('Este ID PIX já está vinculado a outra ordem');
        }
        if (error.error?.error) {
          throw new Error(error.error.error);
        }
        throw error;
      })
    );
  }
}
