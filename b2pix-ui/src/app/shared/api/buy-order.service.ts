import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, from } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { environment } from "../../../environments/environment";
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { BuyOrder, PaginatedBuyOrdersResponse } from "../models/buy-order.model";
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
  createBuyOrder(buyValueInCents: number): Observable<BuyOrder> {
    const payload = `B2PIX - Criar Ordem de Compra\n---\n${buyValueInCents}\n---`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.post<BuyOrder>(`${this.apiUrl}/v1/buy-orders`, data);
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
   * Get a buy order by ID
   */
  getBuyOrderById(id: string): Observable<BuyOrder> {
    return this.http.get<BuyOrder>(`${this.apiUrl}/v1/buy-orders/${id}`);
  }

  /**
   * Mark buy order as paid
   * @param orderId Order ID
   * @param pixConfirmationCode PIX confirmation code (optional, use undefined for NONE)
   */
  markBuyOrderAsPaid(orderId: string, pixConfirmationCode?: string): Observable<BuyOrder> {
    const pixCode = pixConfirmationCode || 'NONE';
    const payload = `B2PIX - Marcar Ordem como Paga\n---\n${orderId}\n${pixCode}\n---`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.put<BuyOrder>(`${this.apiUrl}/v1/buy-orders/${orderId}/paid`, data);
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
  cancelBuyOrder(orderId: string): Observable<BuyOrder> {
    const payload = `B2PIX - Cancelar Ordem\n---\n${orderId}\n---`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.delete<BuyOrder>(`${this.apiUrl}/v1/buy-orders/cancel`, {
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
   * Get analyzing orders (Public endpoint)
   */
  getAnalyzingOrders(): Observable<BuyOrder[]> {
    return this.http.get<BuyOrder[]>(`${this.apiUrl}/v1/buy-orders/analyzing`);
  }

  /**
   * Resolve analyzing order (Manager only)
   * @param orderId Order ID
   * @param resolution 'confirmed' or 'rejected'
   */
  resolveAnalyzingOrder(orderId: string, resolution: 'confirmed' | 'rejected'): Observable<BuyOrder> {
    const payload = `B2PIX - Resolver Análise de Ordem\n---\n${orderId}\n${resolution}\n---`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.put<BuyOrder>(`${this.apiUrl}/v1/buy-orders/resolve`, data);
      }),
      catchError((error: any) => {
        console.error('Error in resolveAnalyzingOrder:', error);
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
