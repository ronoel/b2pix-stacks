import { Injectable, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, of, from } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { SignedRequest } from '../models/api.model';

export interface SendInviteResponse {
  code: string;
  status: string;
}

export interface ClaimInviteResponse {
  code: string;
  status: string;
  claimed_at?: string;
  address?: string;
}

export interface InviteInfo {
  status: string;
  bank_status: 'pending' | 'processing' | 'success' | 'failed';
}

// export function sentInvitePayload(email: string): string {
//   const isoDate = new Date().toISOString();
//   return `B2PIX - Enviar Convite\n${SIGNATURE_DOMAIN}\n${email}\n${isoDate}`;
// }

@Injectable({ providedIn: 'root' })
export class InvitesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private inviteCache = new Map<string, InviteInfo>();

  private walletService = inject(WalletManagerService);

  constructor() {
    effect(() => {
      if (!this.walletService.isLoggedInSignal()) {
        // Automatically clear cache when user logs in
        this.inviteCache.clear();
      }
    });
  }

  private createPayloadSendInvite(email: string): string {
    return `B2PIX - Enviar Convite\n${environment.domain}\n${email}\n${this.getTimestamp()}`;
  }

  sendInvite(email: string): Observable<SendInviteResponse> {

    const payload = this.createPayloadSendInvite(email);

    // Use from to convert Promise to Observable, then chain the observables
    return from(this.walletService.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<SendInviteResponse>(`${this.apiUrl}/v1/invites/send`, data);
      })
    );
  }

  private createPayloadClaimInvite(inviteCode: string, username: string): string {
    return `B2PIX - Resgatar Convite\n${environment.domain}\n${inviteCode}\n${username}\n${this.walletService.getSTXAddress()}\n${this.getTimestamp()}`;
  }

  claimInvite(inviteCode: string, username: string): Observable<InviteInfo> {

    const payload = this.createPayloadClaimInvite(inviteCode, username);

    // Use from to convert Promise to Observable, then chain the observables
    return from(this.walletService.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<InviteInfo>(`${this.apiUrl}/v1/invites/claim`, data).pipe(
          tap(() => {
            // Clear cache when claiming an invite as the status might change
            this.inviteCache.clear();
          })
        );
      })
    );
  }

  getInviteByCode(code: string): Observable<InviteInfo> {
    return this.http.get<InviteInfo>(`${this.apiUrl}/v1/invites/code/${code}`);
  }

  getWalletInvite(): Observable<InviteInfo> {
    const address = this.walletService.getSTXAddress();
    
    if (!address) {
      // Return a default response if address is not available
      return of({ status: 'not_found', bank_status: 'pending' });
    }

    // Check if cached first
    const cachedInvite = this.inviteCache.get(address);
    if (cachedInvite) {
      return of(cachedInvite);
    }

    // If not cached, make HTTP request and cache the result
    return this.http.get<InviteInfo>(`${this.apiUrl}/v1/invites/address/${address}`).pipe(
      tap(invite => {
        // Only cache if invite is not null/undefined (handles 204 No Content responses)
        if (invite) {
          this.inviteCache.set(address, invite);
        } else {
          // For 204 No Content responses, create a default response and cache it
          const defaultInvite: InviteInfo = { status: 'not_found', bank_status: 'pending' };
          this.inviteCache.set(address, defaultInvite);
        }
      }),
      map((invite: InviteInfo | null) => {
        // Return a default response if invite is null/undefined (204 No Content)
        return invite || { status: 'not_found', bank_status: 'pending' };
      })
    );
  }

  /**
   * Clear the invite cache - useful when user logs out or needs fresh data
   */
  clearInviteCache(): void {
    this.inviteCache.clear();
  }

  /**
   * Clear cached invite for specific address
   */
  clearInviteCacheForAddress(address: string): void {
    this.inviteCache.delete(address);
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }
} 