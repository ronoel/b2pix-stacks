import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class B2pixService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Validate a broadcast transaction (no auth required).
   */
  validateBroadcast(transaction: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/v1/b2pix/validatebroadcast`, { transaction }).pipe(
      catchError((error: any) => {
        console.error('Error validating broadcast:', error);
        throw error;
      })
    );
  }
}
