import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from "../../../environments/environment";
import { WalletService } from '../../libs/wallet.service';
import { BoltContractSBTCService } from '../../libs/bolt-contract-sbtc.service';
import { Buy, ListBuysResponse } from "../models/buy.model";
import { SignedRequest } from "../models/api.model";


@Injectable({ providedIn: 'root' })
export class BuyService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private walletService = inject(WalletService);
  private boltContractSBTCService = inject(BoltContractSBTCService);

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Start a buy order with wallet signature
   */
  startBuy(payValue: number, advertisementId: string): Observable<Buy> {
    const addressBuy = this.walletService.getSTXAddress();
    const payload = `B2PIX - Comprar\n${environment.domain}\n${payValue}\n${addressBuy}\n${advertisementId}\n${this.getTimestamp()}`;

    return from(this.walletService.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<Buy>(`${this.apiUrl}/v1/buys`, data);
      })
    );
  }

  /**
   * Get a buy order by ID
   */
  getBuyById(id: string): Observable<Buy> {
    return this.http.get<Buy>(`${this.apiUrl}/v1/buys/${id}`);
  }

  /**
   * Get buy orders by advertisement ID
   */
  getBuysByAdvertisementId(advertisementId: string): Observable<Buy[]> {
    return this.http.get<Buy[]>(`${this.apiUrl}/v1/buys/advertisement/${advertisementId}`);
  }

  /**
   * Mark a buy order as paid with wallet signature
   */
  markBuyAsPaid(buyId: string, pixId?: string): Observable<Buy> {
    const pixIdValue = pixId || "NONE";
    const payload = `B2PIX - Marcar como Pago\n${environment.domain}\n${pixIdValue}\n${buyId}\n${this.getTimestamp()}`;
    
    return from(this.walletService.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        
        return this.http.put<Buy>(`${this.apiUrl}/v1/buys/${buyId}/paid`, data);
      }),
      catchError((error: any) => {
        console.error('Error in markBuyAsPaid:', error);
        if (error.message && error.message.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        throw error;
      })
    );
  }

  /**
   * Resolve a dispute for a buy order with wallet signature
   */
  resolveDispute(buyId: string, resolution: 'buyer' | 'seller'): Observable<Buy> {
    const timestamp = this.getTimestamp();
    const payload = `B2PIX - Resolver Disputa\n${environment.domain}\n${buyId}\n${resolution}\n${timestamp}`;

    return from(this.walletService.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.put<Buy>(`${this.apiUrl}/v1/buys/resolve-dispute`, data);
      }),
      catchError((error: any) => {
        console.error('Error in resolveDispute:', error);
        if (error.message && error.message.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        throw error;
      })
    );
  }

  /**
   * Get disputed buy orders
   */
  getDisputedBuys(): Observable<Buy[]> {
    return this.http.get<Buy[]>(`${this.apiUrl}/v1/buys/disputed`);
  }

  /**
   * Get all buys by address with pagination and sorting
   */
  getBuysByAddress(address: string, options: { page?: number, limit?: number, sort_by?: string, sort_order?: string } = {}): Observable<ListBuysResponse> {
    let params = new HttpParams();
    if (options.page !== undefined) params = params.set('page', options.page.toString());
    if (options.limit !== undefined) params = params.set('limit', options.limit.toString());
    if (options.sort_by !== undefined) params = params.set('sort_by', options.sort_by);
    if (options.sort_order !== undefined) params = params.set('sort_order', options.sort_order);
    return this.http.get<ListBuysResponse>(`${this.apiUrl}/v1/buys/address/${address}`, { params });
  }

  /**
   * Resolve dispute in favor of buyer by transferring sats back to them
   * @param buyId The buy order ID to resolve
   * @param recipientAddress The address to transfer the sats to (buyer's address)
   * @param amountInSats The amount in sats to transfer back to the buyer
   * @returns Observable of updated buy order
   */
  resolveBuyerDispute(buyId: string, recipientAddress: string, amountInSats: bigint): Observable<Buy> {
    // First call the Bolt contract transfer, then chain the HTTP put
    return this.boltContractSBTCService.transferBoltToStacks(Number(amountInSats), recipientAddress).pipe(
      switchMap((transactionSerialized) => {
        return this.http.put<Buy>(`${this.apiUrl}/v1/buys/${buyId}/dispute/resolve-buyer`, {
          transaction: transactionSerialized
        });
      }),
      catchError((transferError: any) => {
        console.error('Error in transfer to buyer:', transferError);
        return throwError(() => transferError);
      })
    );
  }

  /**
   * Cancel a buy order with wallet signature
   */
  cancel(buyId: string): Observable<Buy> {
    const payload = `B2PIX - Cancelar Compra\n${environment.domain}\n${buyId}\n${this.getTimestamp()}`;

    return from(this.walletService.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.put<Buy>(`${this.apiUrl}/v1/buys/cancel`, data);
      }),
      catchError((error: any) => {
        console.error('Error in cancelBuy:', error);
        if (error.message && error.message.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        throw error;
      })
    );
  }

}