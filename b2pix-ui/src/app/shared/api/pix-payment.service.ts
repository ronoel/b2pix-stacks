import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BoltContractSBTCService } from '../../libs/bolt-contract-sbtc.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { QuoteService, QuoteResponse } from './quote.service';
import {
  PixPaymentOrder,
  PaginatedPixPaymentsResponse,
  PaginatedQueueResponse,
  LpStats,
  PaginatedLpHistoryResponse
} from '../models/pix-payment.model';

export interface GetPixPaymentsParams {
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class PixPaymentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private boltContractSBTCService = inject(BoltContractSBTCService);
  private walletManager = inject(WalletManagerService);
  private quoteService = inject(QuoteService);

  private readonly SATS_PER_BTC = 100000000;

  /**
   * Create a PIX payment order.
   * Creates the sBTC transaction and sends it with the QR code payload in a single request.
   * @param qrCodePayload Raw content from the PIX QR Code
   * @param amountInSats Amount in satoshis to send
   * @returns Observable of created PixPaymentOrder
   */
  createPixPayment(qrCodePayload: string, amountInSats: number): Observable<PixPaymentOrder> {
    const recipient = environment.b2pixAddress;
    const address = this.walletManager.getSTXAddress();

    if (!address) {
      throw new Error('Wallet not connected');
    }

    return this.boltContractSBTCService.transferStacksToBolt(amountInSats, recipient).pipe(
      switchMap((transactionSerialized) => {
        return this.http.post<PixPaymentOrder>(`${this.apiUrl}/v1/pix-payments`, {
          qr_code_payload: qrCodePayload,
          transaction: transactionSerialized,
          address: address,
          amount: amountInSats
        });
      }),
      catchError((error: any) => {
        console.error('Error creating PIX payment:', error);
        throw error;
      })
    );
  }

  /**
   * Get a single PIX payment order by ID
   */
  getPixPaymentById(id: string): Observable<PixPaymentOrder> {
    return this.http.get<PixPaymentOrder>(`${this.apiUrl}/v1/pix-payments/${id}`).pipe(
      catchError((error) => {
        console.error('Error fetching PIX payment:', error);
        throw error;
      })
    );
  }

  /**
   * Get PIX payments for a specific address with pagination
   */
  getPixPaymentsByAddress(address: string, params?: GetPixPaymentsParams): Observable<PaginatedPixPaymentsResponse> {
    let httpParams = new HttpParams().set('address', address);

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<PaginatedPixPaymentsResponse>(`${this.apiUrl}/v1/pix-payments`, {
      params: httpParams
    }).pipe(
      catchError((error) => {
        console.error('Error fetching PIX payments:', error);
        throw error;
      })
    );
  }

  /**
   * Get network fee for transactions
   */
  getFee(): number {
    return this.boltContractSBTCService.getFee();
  }

  /**
   * Get BTC price with -3.5% discount (for paying - user pays more sats)
   * @returns Observable with discounted BTC price in cents
   */
  getBtcPrice(): Observable<QuoteResponse> {
    return this.quoteService.getBtcPrice().pipe(
      map(response => {
        const priceInCents = parseInt(response.price, 10);
        const discountedPrice = Math.floor(priceInCents * 0.965); // Subtract 3.5% markup
        return { price: discountedPrice.toString() };
      })
    );
  }

  /**
   * Get satoshis amount for a given BRL price in cents (with -3.5% discount applied)
   * @param priceInCents Amount in BRL cents
   * @returns Observable with satoshis amount
   */
  getSatoshisForPrice(priceInCents: number): Observable<number> {
    return this.getBtcPrice().pipe(
      map(quote => {
        const btcPriceInCents = parseInt(quote.price, 10);
        // btcPrice is the total price of 1 BTC in cents (already discounted by 3.5%)
        // 1 BTC = 100,000,000 satoshis
        // satoshis = (priceInCents * 100000000) / btcPriceInCents
        const satoshis = Math.floor((priceInCents * 100000000) / btcPriceInCents);
        return satoshis;
      })
    );
  }

  /**
   * Convert BRL to Satoshis using provided BTC price
   */
  brlToSats(brlAmount: number, btcPriceInBrl: number): number {
    if (btcPriceInBrl <= 0 || brlAmount <= 0) return 0;
    const btcAmount = brlAmount / btcPriceInBrl;
    return Math.floor(btcAmount * this.SATS_PER_BTC);
  }

  /**
   * Convert Satoshis to BRL using provided BTC price
   */
  satsToBrl(sats: number, btcPriceInBrl: number): number {
    if (btcPriceInBrl <= 0 || sats <= 0) return 0;
    const btcAmount = sats / this.SATS_PER_BTC;
    return btcAmount * btcPriceInBrl;
  }

  // ============================================
  // LP (Liquidity Provider) Methods
  // ============================================

  /**
   * Get the queue of confirmed PIX payments available for LPs.
   * Returns items without qr_code_payload (only values).
   */
  getQueue(params?: GetPixPaymentsParams): Observable<PaginatedQueueResponse> {
    let httpParams = new HttpParams();
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<PaginatedQueueResponse>(`${this.apiUrl}/v1/pix-payments/queue`, {
      params: httpParams
    }).pipe(
      catchError((error: any) => {
        console.error('Error fetching LP queue:', error);
        throw error;
      })
    );
  }

  /**
   * Accept a PIX payment order from the queue.
   * Returns the full order including qr_code_payload.
   */
  acceptOrder(orderId: string): Observable<PixPaymentOrder> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Aceitar Ordem PIX',
      'b2pix.org',
      orderId,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<PixPaymentOrder>(`${this.apiUrl}/v1/pix-payments/${orderId}/accept`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error accepting order:', error);
        throw error;
      })
    );
  }

  /**
   * Confirm PIX payment for an accepted order.
   * LP provides the PIX end-to-end ID.
   */
  payOrder(orderId: string, pixEndToEndId: string): Observable<PixPaymentOrder> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Confirmar Pagamento PIX',
      'b2pix.org',
      orderId,
      pixEndToEndId,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<PixPaymentOrder>(`${this.apiUrl}/v1/pix-payments/${orderId}/pay`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error confirming payment:', error);
        throw error;
      })
    );
  }

  /**
   * Cancel an accepted order. Returns it to the queue for another LP.
   */
  cancelOrder(orderId: string): Observable<PixPaymentOrder> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Cancelar Ordem PIX',
      'b2pix.org',
      orderId,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<PixPaymentOrder>(`${this.apiUrl}/v1/pix-payments/${orderId}/cancel`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error cancelling order:', error);
        throw error;
      })
    );
  }

  /**
   * Report a problem with an accepted order.
   */
  reportOrder(orderId: string, reason: string): Observable<PixPaymentOrder> {
    const timestamp = new Date().toISOString();
    const payload = [
      'B2PIX - Reportar Problema PIX',
      'b2pix.org',
      orderId,
      reason,
      timestamp
    ].join('\n');

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap((signedMessage) => {
        return this.http.post<PixPaymentOrder>(`${this.apiUrl}/v1/pix-payments/${orderId}/report`, {
          payload,
          signature: signedMessage.signature,
          publicKey: signedMessage.publicKey
        });
      }),
      catchError((error: any) => {
        console.error('Error reporting order:', error);
        throw error;
      })
    );
  }

  /**
   * Get LP performance stats.
   */
  getLpStats(): Observable<LpStats> {
    const address = this.walletManager.getSTXAddress();
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const httpParams = new HttpParams().set('address', address);

    return this.http.get<LpStats>(`${this.apiUrl}/v1/lp/stats`, {
      params: httpParams
    }).pipe(
      catchError((error: any) => {
        console.error('Error fetching LP stats:', error);
        throw error;
      })
    );
  }

  /**
   * Get LP order history.
   */
  getLpHistory(params?: GetPixPaymentsParams): Observable<PaginatedLpHistoryResponse> {
    const address = this.walletManager.getSTXAddress();
    if (!address) {
      throw new Error('Wallet not connected');
    }

    let httpParams = new HttpParams().set('address', address);
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<PaginatedLpHistoryResponse>(`${this.apiUrl}/v1/lp/history`, {
      params: httpParams
    }).pipe(
      catchError((error: any) => {
        console.error('Error fetching LP history:', error);
        throw error;
      })
    );
  }
}
