import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from "../../../environments/environment";
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { PixPayoutRequest } from "../models/pix-payout-request.model";
import { SignedRequest } from "../models/api.model";

@Injectable({ providedIn: 'root' })
export class ManagerPayoutService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private walletManager = inject(WalletManagerService);

  getDisputedRequests(): Observable<PixPayoutRequest[]> {
    return this.http.get<PixPayoutRequest[]>(
      `${this.apiUrl}/v1/manager/pix-payout-requests/disputed`
    );
  }

  getErrorEscalatedRequests(): Observable<PixPayoutRequest[]> {
    return this.http.get<PixPayoutRequest[]>(
      `${this.apiUrl}/v1/manager/pix-payout-requests/error-escalated`
    );
  }

  confirmDispute(id: string): Observable<PixPayoutRequest> {
    const timestamp = Date.now();
    const payload = `B2PIX - Confirm Dispute\nb2pix.org\n${id}\n${timestamp}`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<PixPayoutRequest>(
          `${this.apiUrl}/v1/manager/pix-payout-requests/${id}/confirm-dispute`,
          data
        );
      }),
      catchError((error: any) => {
        if (error.message?.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        if (error.error?.error) {
          throw new Error(error.error.error);
        }
        throw error;
      })
    );
  }

  rejectDispute(id: string): Observable<PixPayoutRequest> {
    const timestamp = Date.now();
    const payload = `B2PIX - Reject Dispute\nb2pix.org\n${id}\n${timestamp}`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<PixPayoutRequest>(
          `${this.apiUrl}/v1/manager/pix-payout-requests/${id}/reject-dispute`,
          data
        );
      }),
      catchError((error: any) => {
        if (error.message?.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        if (error.error?.error) {
          throw new Error(error.error.error);
        }
        throw error;
      })
    );
  }

  resolveEscalation(id: string): Observable<PixPayoutRequest> {
    const timestamp = Date.now();
    const payload = `B2PIX - Resolve Escalation\nb2pix.org\n${id}\n${timestamp}`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<PixPayoutRequest>(
          `${this.apiUrl}/v1/manager/pix-payout-requests/${id}/resolve-escalation`,
          data
        );
      }),
      catchError((error: any) => {
        if (error.message?.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        if (error.error?.error) {
          throw new Error(error.error.error);
        }
        throw error;
      })
    );
  }
}
