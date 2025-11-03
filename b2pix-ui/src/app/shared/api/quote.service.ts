import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface QuoteResponse {
  price: string; // Price in cents (e.g., 9534562 = R$95,345.62)
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get the current price of Bitcoin in BRL
   * @returns Observable with the BTC price (price in cents, e.g., 9534562 = R$95,345.62)
   */
  getBtcPrice(): Observable<QuoteResponse> {
    return this.http.get<QuoteResponse>(`${this.apiUrl}/v1/quote/btc`);
  }
}
