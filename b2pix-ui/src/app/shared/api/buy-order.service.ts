import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, from } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { environment } from "../../../environments/environment";
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { BuyOrderResponse, CreateBuyOrderResponse, ResubmitResponse, PaginatedBuyOrdersResponse } from "../models/buy-order.model";
import { SignedRequest } from "../models/api.model";
import { QuoteService, QuoteResponse } from './quote.service';

@Injectable({ providedIn: 'root' })
export class BuyOrderService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private walletManager = inject(WalletManagerService);
  private quoteService = inject(QuoteService);

  /**
   * Create a new buy order
   * @param buyValueInCents Amount in BRL cents
   */
  createBuyOrder(buyValueInCents: number): Observable<CreateBuyOrderResponse> {
    const timestamp = new Date().toISOString();
    const payload = `B2PIX - Criar Ordem de Compra\nb2pix.org\n${buyValueInCents}\n${timestamp}`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<CreateBuyOrderResponse>(`${this.apiUrl}/v1/buy-orders`, data);
      }),
      catchError((error: any) => {
        console.error('Error in createBuyOrder:', error);

        // User cancelled signature
        if (error.message && error.message.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }

        // Handle API errors
        if (error.error?.error) {
          throw new Error(error.error.error);
        }

        throw error;
      })
    );
  }

  /**
   * Get a buy order by ID.
   * Non-final orders include pix status, can_resubmit, and remaining_attempts.
   */
  getBuyOrderById(id: string): Observable<BuyOrderResponse> {
    return this.http.get<BuyOrderResponse>(`${this.apiUrl}/v1/buy-orders/${id}`);
  }

  /**
   * Mark buy order as paid
   * @param orderId Order ID
   */
  markBuyOrderAsPaid(orderId: string): Observable<{ status: string }> {
    const timestamp = new Date().toISOString();
    const payload = `B2PIX - Marcar Ordem como Paga\nb2pix.org\n${orderId}\n${timestamp}`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.put<{ status: string }>(`${this.apiUrl}/v1/buy-orders/${orderId}/paid`, data);
      }),
      catchError((error: any) => {
        console.error('Error in markBuyOrderAsPaid:', error);
        if (error.message && error.message.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        if (error.error?.error) {
          throw new Error(error.error.error);
        }
        throw error;
      })
    );
  }

  /**
   * Cancel a buy order
   */
  cancelBuyOrder(orderId: string): Observable<BuyOrderResponse> {
    const timestamp = new Date().toISOString();
    const payload = `B2PIX - Cancelar Ordem\nb2pix.org\n${orderId}\n${timestamp}`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.delete<BuyOrderResponse>(`${this.apiUrl}/v1/buy-orders/cancel`, {
          body: data
        });
      }),
      catchError((error: any) => {
        console.error('Error in cancelBuyOrder:', error);
        if (error.message && error.message.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        if (error.error?.error) {
          throw new Error(error.error.error);
        }
        throw error;
      })
    );
  }

  /**
   * Get buy orders by address with pagination
   */
  getBuyOrdersByAddress(
    address: string,
    options: { page?: number, limit?: number } = {}
  ): Observable<PaginatedBuyOrdersResponse> {
    let params = new HttpParams();
    if (options.page !== undefined) params = params.set('page', options.page.toString());
    if (options.limit !== undefined) params = params.set('limit', options.limit.toString());

    return this.http.get<PaginatedBuyOrdersResponse>(
      `${this.apiUrl}/v1/buy-orders/address/${address}`,
      { params }
    );
  }

  /**
   * Resubmit payment — re-verifies the existing PIX inbound against the bank.
   * Returns verification outcome (confirmed, not_found, or query_failed).
   */
  resubmitPayment(orderId: string): Observable<ResubmitResponse> {
    const timestamp = new Date().toISOString();
    const payload = `B2PIX - Reenviar Pagamento\nb2pix.org\n${orderId}\n${timestamp}`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.put<ResubmitResponse>(`${this.apiUrl}/v1/buy-orders/${orderId}/resubmit`, data);
      }),
      catchError((error: any) => {
        console.error('Error in resubmitPayment:', error);
        if (error.message && error.message.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        if (error.error?.error) {
          throw new Error(error.error.error);
        }
        throw error;
      })
    );
  }

  /**
   * Get BTC price and add 2.3% markup
   */
  getBtcPrice(): Observable<QuoteResponse> {
    return this.quoteService.getBtcPrice().pipe(
      map(response => {
        const priceInCents = parseInt(response.price, 10);
        const markedUpPrice = Math.ceil(priceInCents * 1.023); // Add 2.3% markup
        return { price: markedUpPrice.toString() };
      })
    );
  }

  /**
   * Get satoshis amount for a given BRL price in cents
   * @param priceInCents Amount in BRL cents
   * @returns Observable with satoshis amount
   */
  getSatoshisForPrice(priceInCents: number): Observable<number> {
    return this.getBtcPrice().pipe(
      map(quote => {
        const btcPriceInCents = parseInt(quote.price, 10);
        // btcPrice is the total price of 1 BTC in cents
        // 1 BTC = 100,000,000 satoshis
        // satoshis = (priceInCents * 100000000) / btcPriceInCents
        const satoshis = Math.floor((priceInCents * 100000000) / btcPriceInCents);
        return satoshis;
      })
    );
  }
}
