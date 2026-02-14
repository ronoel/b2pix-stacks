import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BoltContractSBTCService } from '../../libs/bolt-contract-sbtc.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { QuoteService, QuoteResponse } from './quote.service';
import { switchMap } from 'rxjs';
import {
  PixPaymentOrder,
  PaginatedPixPaymentsResponse
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
        return this.http.post<PixPaymentOrder>(`${this.apiUrl}/v1/pix-orders`, {
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
    return this.http.get<PixPaymentOrder>(`${this.apiUrl}/v1/pix-orders/${id}`).pipe(
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

    return this.http.get<PaginatedPixPaymentsResponse>(`${this.apiUrl}/v1/pix-orders`, {
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
}
