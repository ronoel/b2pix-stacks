import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';

export interface VapidKeyResponse {
  vapid_public_key: string;
}

export interface PushSubscriptionResponse {
  id: string;
  wallet_address: string;
  endpoint: string;
  created_at: string;
  last_verified_at: string;
}

export interface PushUnsubscribeResponse {
  status: string;
}

@Injectable({ providedIn: 'root' })
export class PushNotificationApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private walletManager = inject(WalletManagerService);

  /**
   * Get the VAPID public key for push subscriptions (no auth required).
   */
  getVapidKey(): Observable<VapidKeyResponse> {
    return this.http.get<VapidKeyResponse>(`${this.apiUrl}/v1/push-notifications/vapid-key`).pipe(
      catchError((error: any) => {
        console.error('Error fetching VAPID key:', error);
        throw error;
      })
    );
  }

  /**
   * Subscribe to push notifications (signed request).
   */
  subscribe(endpoint: string, p256dh: string, auth: string): Observable<PushSubscriptionResponse> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Inscrever Notificacoes Push',
      'b2pix.org',
      endpoint,
      p256dh,
      auth,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<PushSubscriptionResponse>(`${this.apiUrl}/v1/push-notifications/subscribe`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error subscribing to push notifications:', error);
        throw error;
      })
    );
  }

  /**
   * Unsubscribe from push notifications (signed request).
   */
  unsubscribe(endpoint: string): Observable<PushUnsubscribeResponse> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Cancelar Notificacoes Push',
      'b2pix.org',
      endpoint,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.delete<PushUnsubscribeResponse>(`${this.apiUrl}/v1/push-notifications/unsubscribe`, {
          body: {
            payload,
            signature: signedMessage.signature,
            publicKey: signedMessage.publicKey
          }
        });
      }),
      catchError((error: any) => {
        console.error('Error unsubscribing from push notifications:', error);
        throw error;
      })
    );
  }
}
