import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { SignedRequest } from '../models/api.model';

export interface BankSetupRequest extends SignedRequest {
  certificate: string; // base64 encoded .p12 file
  filename: string;    // must end with .p12
}

export interface BankSetupResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class BankAccountService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private walletManager = inject(WalletManagerService);

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Complete bank setup with credentials and certificate in a single atomic operation
   */
  setupBank(clientId: string, secretKey: string, certificateBase64: string, filename: string): Observable<BankSetupResponse> {
    const address = this.walletManager.getSTXAddress();
    const payload = `B2PIX - Configurar Banco\n${environment.domain}\n${address}\n${clientId}\n${secretKey}\n${this.getTimestamp()}`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: BankSetupRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload,
          certificate: certificateBase64,
          filename
        };
        return this.http.post<BankSetupResponse>(`${this.apiUrl}/v1/bank-credentials/banksetup`, data);
      })
    );
  }
}
