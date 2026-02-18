import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { SignedRequest } from '../models/api.model';
import { MessageResponse, PaginatedMessagesResponse } from '../models/message.model';
import { buildSendMessagePayload } from '../models/pix-order-payloads';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private walletManager = inject(WalletManagerService);

  sendMessage(sourceType: string, sourceId: string, content: string): Observable<MessageResponse> {
    const payload = buildSendMessagePayload(sourceType, sourceId, content);

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<MessageResponse>(`${this.apiUrl}/v1/messages`, data);
      }),
      catchError((error: any) => {
        if (error?.message?.includes('User denied') || error?.message?.includes('canceled')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        throw error;
      })
    );
  }

  listMessages(sourceType: string, sourceId: string, page?: number, limit?: number): Observable<PaginatedMessagesResponse> {
    let params = new HttpParams()
      .set('source_type', sourceType)
      .set('source_id', sourceId);

    if (page !== undefined) {
      params = params.set('page', page.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<PaginatedMessagesResponse>(`${this.apiUrl}/v1/messages`, { params }).pipe(
      catchError((error) => {
        console.error('Error fetching messages:', error);
        throw error;
      })
    );
  }
}
