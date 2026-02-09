import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { catchError, Observable, switchMap, throwError } from 'rxjs';
import { environment } from "../../../environments/environment";
import { PaymentRequest, PaymentRequestsResponse, PaymentRequestStatus, PaymentSourceType } from "../models/payment-request.model";
import { BoltContractSBTCService } from "../../libs/bolt-contract-sbtc.service";
import { WalletManagerService } from "../../libs/wallet/wallet-manager.service";

@Injectable({ providedIn: 'root' })
export class PaymentRequestService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private walletManager = inject(WalletManagerService);
  private boltContractSBTCService = inject(BoltContractSBTCService);

  /**
   * Get payment requests with optional filtering and sorting
   */
  getPaymentRequests(options: {
    page?: number;
    limit?: number;
    status?: PaymentRequestStatus[];
    sort_order?: 'asc' | 'desc';
  } = {}): Observable<PaymentRequestsResponse> {
    let params = new HttpParams();

    if (options.page !== undefined) {
      params = params.set('page', options.page.toString());
    }

    if (options.limit !== undefined) {
      params = params.set('limit', options.limit.toString());
    }

    if (options.status && options.status.length > 0) {
      params = params.set('status', options.status.join(','));
    }

    if (options.sort_order) {
      params = params.set('sort_order', options.sort_order);
    }

    return this.http.get<PaymentRequestsResponse>(`${this.apiUrl}/v1/payment-requests`, { params });
  }

  /** Pay a payment request by ID
   * This method first calls the Bolt contract to transfer SBTC to the recipient address,
   * then it updates the payment request status via the API.
   */
  pay(id: string, recipientAddress: string, amountInSats: bigint): Observable<PaymentRequestsResponse> {
    // First call the Bolt contract transfer, then chain the HTTP put
    return this.boltContractSBTCService.transferBoltToStacks(Number(amountInSats), recipientAddress).pipe(
      switchMap((transactionSerialized) => {
        return this.http.post<PaymentRequestsResponse>(`${this.apiUrl}/v1/payment-requests/${id}/process`, {
          transaction: transactionSerialized
        });
      }),
      catchError((transferError: any) => {
        console.error('Error in transfer:', transferError);
        return throwError(() => transferError);
      })
    );
  }

  /**
   * Get payment requests by source type and ID
   */
  getPaymentRequestsBySource(sourceType: PaymentSourceType, sourceId: string): Observable<PaymentRequestsResponse> {
    const params = new HttpParams()
      .set('source_type', sourceType)
      .set('source_id', sourceId);

    return this.http.get<PaymentRequestsResponse>(`${this.apiUrl}/v1/payment-requests/by-source`, { params });
  }
}
