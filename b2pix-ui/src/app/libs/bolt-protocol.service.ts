import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { bytesToHex } from "@stacks/common";
import { environment } from '../../environments/environment';

interface WalletBalance {
  address: string;
  balance: bigint;
}

@Injectable({
  providedIn: 'root'
})
export class BoltProtocolService {
  private http = inject(HttpClient);
  private apiUrl = environment.boltProtocol.apiUrl;
  private feeRateCache = new Map<string, Observable<number>>();

  private getClientHeaders(): HttpHeaders {
    return new HttpHeaders().set('x-client-source', 'b2pix-website');
  }

  sendTransaction(serializedTx: string): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/transaction/${environment.supportedAsset.sBTC.contractToken}`,
      { serializedTx },
      { headers: this.getClientHeaders() }
    );
  }
  getWalletBalance(address: string, token: string): Observable<WalletBalance> {
    return this.http.get<any>(`${this.apiUrl}/wallet/${address}/${token}/balance`).pipe(
      map(response => ({
        address: response.address,
        balance: BigInt(response.balance)
      }))
    );
  }

  getWalletTransactions(address: string, token: string): Observable<WalletBalance> {
    return this.http.get<any>(`${this.apiUrl}/wallet/${address}/${token}/transactions`);
    // .pipe(
    //   map(response => ({
    //     address: response.address,
    //     balance: BigInt(response.balance)
    //   }))
    // );
  }

  sponsorTransaction(transaction: any): Observable<string> {
    const serializedTx = bytesToHex(transaction.serializeBytes());
    console.warn('NOT IMPLEMENTED: sponsorTransaction', serializedTx);
    return this.http.post<{ txid: string }>(
      `${this.apiUrl}/advertisements`,
      { address_sell: 'address', token: 'sBTC', currency: 'BRL', price: 50, amount: 100, transaction: serializedTx},
      { headers: this.getClientHeaders() }
      // `${this.apiUrl}/sponsor/${environment.supportedAsset.sBTC.contractToken}/transaction`,
      // { serializedTx, fee: 50, sponsor: "b2pix" },
      // { headers: this.getClientHeaders() }
    ).pipe(
      map(response => response.txid)
    );
  }

  getFeeFundBalance(address: string, token: string): Observable<bigint> {
    return this.http.get<any>(`${this.apiUrl}/sponsor/${token}/balance/${address}`).pipe(
      map(response => (BigInt(response.balance)))
    );
  }

  getFeeRate(token: string): Observable<number> {
    if (!this.feeRateCache.has(token)) {
      const feeRate$ = this.http.get<any>(`${this.apiUrl}/transaction/${token}/fee-rate`).pipe(
        map(response => response.feeRate),
        shareReplay({ bufferSize: 1, refCount: true, windowTime: 300000 })
      );
      this.feeRateCache.set(token, feeRate$);
    }
    return this.feeRateCache.get(token)!;
  }
}