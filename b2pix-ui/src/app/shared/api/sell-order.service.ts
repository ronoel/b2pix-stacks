import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BoltContractSBTCService } from '../../libs/bolt-contract-sbtc.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { QuoteService, QuoteResponse } from './quote.service';
import { switchMap } from 'rxjs';
import {
  SellOrder,
  PaginatedSellOrdersResponse
} from '../models/sell-order.model';

export interface GetSellOrdersParams {
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class SellOrderService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private boltContractSBTCService = inject(BoltContractSBTCService);
  private walletManager = inject(WalletManagerService);
  private quoteService = inject(QuoteService);

  /**
   * Create a new sell order
   * This creates a Bitcoin transaction via BoltProtocol and sends it to the API
   * @param amountInSats Amount in satoshis to sell
   * @returns Observable of created SellOrder
   */
  createSellOrder(amountInSats: number): Observable<SellOrder> {
    const recipient = environment.b2pixAddress;
    const address = this.walletManager.getSTXAddress();

    if (!address) {
      throw new Error('Wallet not connected');
    }

    // Create the transaction via BoltProtocol
    return this.boltContractSBTCService.transferStacksToBolt(amountInSats, recipient).pipe(
      switchMap((transactionSerialized) => {
        // Send to API
        return this.http.post<SellOrder>(`${this.apiUrl}/v1/sell-orders`, {
          transaction: transactionSerialized,
          address: address,
          amount: amountInSats
        });
      }),
      catchError((error: any) => {
        console.error('Error creating sell order:', error);
        throw error;
      })
    );
  }

  /**
   * Get sell orders for a specific address with pagination
   * @param address The wallet address
   * @param params Query parameters for pagination
   * @returns Observable of paginated sell orders
   */
  getSellOrdersByAddress(address: string, params?: GetSellOrdersParams): Observable<PaginatedSellOrdersResponse> {
    let httpParams = new HttpParams().set('address', address);

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<PaginatedSellOrdersResponse>(`${this.apiUrl}/v1/sell-orders`, {
      params: httpParams
    }).pipe(
      catchError((error) => {
        console.error('Error fetching sell orders:', error);
        throw error;
      })
    );
  }

  /**
   * Get a single sell order by ID
   * @param id The sell order ID
   * @returns Observable of SellOrder
   */
  getSellOrderById(id: string): Observable<SellOrder> {
    return this.http.get<SellOrder>(`${this.apiUrl}/v1/sell-orders/${id}`).pipe(
      catchError((error) => {
        console.error('Error fetching sell order:', error);
        throw error;
      })
    );
  }

  /**
   * Check if user has an active (non-final) sell order
   * @param address The wallet address
   * @returns Observable of active SellOrder or null
   */
  getActiveSellOrder(address: string): Observable<SellOrder | null> {
    return this.getSellOrdersByAddress(address, { page: 1, limit: 10 }).pipe(
      map((response) => {
        const activeOrder = response.items.find(order => !order.is_final);
        return activeOrder || null;
      })
    );
  }

  /**
   * Get the network fee for sell orders
   * @returns Fee amount in satoshis
   */
  getFee(): number {
    return this.boltContractSBTCService.getFee();
  }

  // ============================================
  // Conversion Utilities
  // ============================================

  private readonly SATS_PER_BTC = 100000000;

  /**
   * Convert BRL to Satoshis using current BTC price
   * @param brlAmount Amount in BRL (reais)
   * @param btcPriceInBrl Current BTC price in BRL
   * @returns Equivalent amount in satoshis
   */
  brlToSats(brlAmount: number, btcPriceInBrl: number): number {
    if (btcPriceInBrl <= 0 || brlAmount <= 0) return 0;
    const btcAmount = brlAmount / btcPriceInBrl;
    return Math.floor(btcAmount * this.SATS_PER_BTC);
  }

  /**
   * Convert Satoshis to BRL using current BTC price
   * @param sats Amount in satoshis
   * @param btcPriceInBrl Current BTC price in BRL
   * @returns Equivalent amount in BRL
   */
  satsToBrl(sats: number, btcPriceInBrl: number): number {
    if (btcPriceInBrl <= 0 || sats <= 0) return 0;
    const btcAmount = sats / this.SATS_PER_BTC;
    return btcAmount * btcPriceInBrl;
  }

  /**
   * Get maximum sellable sats respecting both balance and BRL limit
   * @param balance User's balance in satoshis
   * @param fee Network fee in satoshis
   * @param maxBrlLimit Maximum BRL limit for selling
   * @param btcPriceInBrl Current BTC price in BRL
   * @returns Maximum sellable satoshis
   */
  getMaxSellableSats(balance: number, fee: number, maxBrlLimit: number, btcPriceInBrl: number): number {
    const maxSatsFromBrl = this.brlToSats(maxBrlLimit, btcPriceInBrl);
    const maxSatsFromBalance = balance - fee;

    if (maxSatsFromBalance <= 0) return 0;

    return maxSatsFromBalance > maxSatsFromBrl ? maxSatsFromBrl : maxSatsFromBalance;
  }

  /**
   * Get BTC price with -2.3% discount (for selling)
   * @returns Observable with discounted BTC price in cents
   */
  getBtcPrice(): Observable<QuoteResponse> {
    return this.quoteService.getBtcPrice().pipe(
      map(response => {
        const priceInCents = parseInt(response.price, 10);
        const discountedPrice = Math.floor(priceInCents * 0.977); // Subtract 2.3% markup
        return { price: discountedPrice.toString() };
      })
    );
  }

  /**
   * Get satoshis amount for a given BRL price in cents (with -2.3% discount applied)
   * @param priceInCents Amount in BRL cents
   * @returns Observable with satoshis amount
   */
  getSatoshisForPrice(priceInCents: number): Observable<number> {
    return this.getBtcPrice().pipe(
      map(quote => {
        const btcPriceInCents = parseInt(quote.price, 10);
        // btcPrice is the total price of 1 BTC in cents (already discounted by 2.3%)
        // 1 BTC = 100,000,000 satoshis
        // satoshis = (priceInCents * 100000000) / btcPriceInCents
        const satoshis = Math.floor((priceInCents * 100000000) / btcPriceInCents);
        return satoshis;
      })
    );
  }
}
