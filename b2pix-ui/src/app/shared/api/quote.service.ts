import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, of } from 'rxjs';
import { switchMap, tap, catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface QuoteResponse {
  price: string; // Price in cents (e.g., 9534562 = R$95,345.62)
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private apiUrl = environment.apiUrl;
  private lastKnownPrice$ = new BehaviorSubject<number | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Get the current price of Bitcoin in BRL (single fetch)
   * @returns Observable with the BTC price (price in cents, e.g., 9534562 = R$95,345.62)
   */
  getBtcPrice(): Observable<QuoteResponse> {
    return this.http.get<QuoteResponse>(`${this.apiUrl}/v1/quote/btc`).pipe(
      tap(response => {
        const priceInCents = parseInt(response.price, 10);
        this.lastKnownPrice$.next(priceInCents);
      }),
      catchError(err => {
        console.error('Failed to fetch BTC price:', err);
        // Return last known price if available
        const lastPrice = this.lastKnownPrice$.value;
        if (lastPrice) {
          return of({ price: lastPrice.toString() });
        }
        throw err;
      })
    );
  }

  /**
   * Get BTC price stream with automatic polling (for buy page)
   * Polls every 30 seconds silently
   * @returns Observable that emits price updates every 30 seconds
   */
  getBtcPriceStream(): Observable<QuoteResponse> {
    return timer(0, 30000).pipe( // 0ms initial delay, then every 30 seconds
      switchMap(() => this.getBtcPrice()),
      shareReplay({ bufferSize: 1, refCount: true }) // Share subscription with automatic cleanup when refCount = 0
    );
  }

  /**
   * Get last known price (synchronous)
   * @returns Last known price in cents or null if not yet fetched
   */
  getLastKnownPrice(): number | null {
    return this.lastKnownPrice$.value;
  }
}
