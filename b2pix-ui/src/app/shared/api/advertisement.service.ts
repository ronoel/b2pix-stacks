import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BoltContractSBTCService } from '../../libs/bolt-contract-sbtc.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { Advertisement, AdvertisementStatus, Deposit, PricingMode } from '../models/advertisement.model';
import { SignedRequest } from '../models/api.model';

export interface CreateAdvertisementRequest {
    amountInSats: bigint
    price: bigint
    minAmount: number  // Minimum purchase amount in cents
    maxAmount: number  // Maximum purchase amount in cents
    pricingMode: PricingMode  // 'fixed' or 'dynamic'
}

export interface CreateDepositResponse {
    deposit_id: string
    advertisement_id: string
    blockchain_tx_id: string | null
    amount: number | null
    status: string
    message: string
}

export interface GetAdvertisementsParams {
    status?: AdvertisementStatus[];
    active_only?: boolean;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export interface AdvertisementsPagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

export interface AdvertisementsResponse {
    data: Advertisement[];
    pagination: AdvertisementsPagination;
}

@Injectable({ providedIn: 'root' })
export class AdvertisementService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private boltContractSBTCService = inject(BoltContractSBTCService);
  private walletManager = inject(WalletManagerService);

  constructor() {
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  createAdvertisement(request: CreateAdvertisementRequest): Observable<Advertisement> {
    const recipient = environment.b2pixAddress;

    // First call the Bolt contract transfer, then chain the HTTP post
    return this.boltContractSBTCService.transferStacksToBolt(request.amountInSats, recipient, request.price.toString()).pipe(
      switchMap((transactionSerialized) => {
        return this.http.post<Advertisement>(`${this.apiUrl}/v1/advertisements`, {
          transaction: transactionSerialized,
          min_amount: request.minAmount,
          max_amount: request.maxAmount,
          pricing_mode: request.pricingMode
        });
      }),
      catchError((transferError: any) => {
        console.error('Erro na transferência:', transferError);
        return throwError(() => transferError);
      })
    );
  }

  /**
   * Get advertisements with optional filtering and pagination
   * @param params Query parameters for filtering and pagination
   * @returns Observable of advertisements response with pagination
   */
  getAdvertisements(params?: GetAdvertisementsParams): Observable<AdvertisementsResponse> {
    let httpParams = new HttpParams();

    if (params) {
      // Add status filter (can be multiple) - try standard array notation
      if (params.status && params.status.length > 0) {
        params.status.forEach(status => {
          httpParams = httpParams.append('status[]', status);
        });
      }

      // Add active_only filter
      if (params.active_only !== undefined) {
        httpParams = httpParams.set('active_only', params.active_only.toString());
      }

      // Add pagination parameters
      if (params.page !== undefined) {
        httpParams = httpParams.set('page', params.page.toString());
      }

      if (params.limit !== undefined) {
        httpParams = httpParams.set('limit', params.limit.toString());
      }

      // Add sorting parameters
      if (params.sort_by) {
        httpParams = httpParams.set('sort_by', params.sort_by);
      }

      if (params.sort_order) {
        httpParams = httpParams.set('sort_order', params.sort_order);
      }
    }

    const url = `${this.apiUrl}/v1/advertisements`;
    return this.http.get<AdvertisementsResponse>(url, { params: httpParams });
  }

  /**
   * Get advertisements with ready status only
   * @param activeOnly Whether to filter only active advertisements
   * @param page Page number for pagination
   * @param limit Number of items per page
   * @returns Observable of ready advertisements
   */
  getReadyAdvertisements(activeOnly: boolean = true, page: number = 1, limit: number = 10): Observable<AdvertisementsResponse> {
    return this.getAdvertisements({
      status: [AdvertisementStatus.READY],
      active_only: activeOnly,
      page,
      limit
    });
  }

  /**
   * Get advertisements by crypto address
   * @param address The crypto address to search for (supports Bitcoin, Ethereum, and other formats)
   * @returns Observable of array of advertisements for the given address
   */
  getAdvertisementByAddress(address: string): Observable<Advertisement[]> {
    if (!address || address.trim() === '') {
      return throwError(() => new Error('Address parameter is required'));
    }

    return this.http.get<Advertisement[]>(`${this.apiUrl}/v1/advertisements/address/${encodeURIComponent(address)}`).pipe(
      catchError((error) => {
        if (error.status === 400) {
          console.error('Invalid address format:', address);
          return throwError(() => new Error('Invalid address format'));
        } else if (error.status === 500) {
          console.error('Server error while fetching advertisements for address:', address);
          return throwError(() => new Error('Database or server error'));
        }
        console.error('Unexpected error while fetching advertisements for address:', address, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a single advertisement by ID
   * @param id The advertisement ID
   * @returns Observable of advertisement
   */
  getAdvertisementById(id: string): Observable<Advertisement> {
    return this.http.get<Advertisement>(`${this.apiUrl}/v1/advertisements/${id}`);
  }

  /**
   * Finish an advertisement with wallet signature
   * @param advertisementId The advertisement ID to finish
   * @returns Observable of updated advertisement
   */
  finishAdvertisement(advertisementId: string): Observable<Advertisement> {
    const action = 'B2PIX - Finalizar Anúncio';
    const payload = `${action}\n${environment.domain}\n${advertisementId}\n${this.getTimestamp()}`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.put<Advertisement>(`${this.apiUrl}/v1/advertisements/finish`, data);
      }),
      catchError((error: any) => {
        console.error('Error in finishAdvertisement:', error);
        if (error.message && error.message.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        throw error;
      })
    );
  }

  /**
   * Update an advertisement with wallet signature
   * @param advertisementId The advertisement ID to update
   * @param pricingMode The pricing mode ('fixed' or 'dynamic')
   * @param pricingValue The price (in cents for fixed) or percentage (for dynamic)
   * @param minAmount Minimum amount in cents
   * @param maxAmount Maximum amount in cents
   * @returns Observable of updated advertisement
   */
  updateAdvertisement(
    advertisementId: string,
    pricingMode: PricingMode,
    pricingValue: string,
    minAmount: number,
    maxAmount: number
  ): Observable<Advertisement> {
    const action = 'B2PIX - Alterar Valor';
    const payload = `${action}\n${environment.domain}\n${advertisementId}\n${pricingMode}\n${pricingValue}\n${minAmount}\n${maxAmount}\n${this.getTimestamp()}`;

    return from(this.walletManager.signMessage(payload)).pipe(
      switchMap(signedMessage => {
        const data: SignedRequest = {
          publicKey: signedMessage.publicKey,
          signature: signedMessage.signature,
          payload
        };
        return this.http.put<Advertisement>(`${this.apiUrl}/v1/advertisements`, data);
      }),
      catchError((error: any) => {
        console.error('Error in updateAdvertisement:', error);
        if (error.message && error.message.includes('User denied')) {
          throw new Error('Assinatura cancelada pelo usuário');
        }
        throw error;
      })
    );
  }

  deleteAdvertisement(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/v1/advertisements/${id}`);
  }

  /**
   * Create a deposit (add funds) to an existing advertisement
   * @param advertisementId The advertisement ID to add funds to
   * @param amountInSats Amount to deposit in satoshis
   * @returns Observable of deposit creation response
   */
  createDeposit(advertisementId: string, amountInSats: bigint): Observable<CreateDepositResponse> {
    const recipient = environment.b2pixAddress;

    // Call Bolt contract transfer without memo for deposits
    return this.boltContractSBTCService.transferStacksToBolt(amountInSats, recipient).pipe(
      switchMap((transactionSerialized) => {
        return this.http.post<CreateDepositResponse>(`${this.apiUrl}/v1/advertisements/${advertisementId}/deposits`, {
          transaction: transactionSerialized
        });
      }),
      catchError((error: any) => {
        console.error('Error creating deposit:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all deposits for a specific advertisement
   * @param advertisementId The advertisement ID
   * @returns Observable of array of deposits
   */
  getAdvertisementDeposits(advertisementId: string): Observable<Deposit[]> {
    if (!advertisementId || advertisementId.trim() === '') {
      return throwError(() => new Error('Advertisement ID is required'));
    }

    return this.http.get<Deposit[]>(`${this.apiUrl}/v1/advertisements/${encodeURIComponent(advertisementId)}/deposits`).pipe(
      catchError((error) => {
        if (error.status === 400) {
          console.error('Invalid advertisement ID format:', advertisementId);
          return throwError(() => new Error('Invalid advertisement ID format'));
        } else if (error.status === 404) {
          console.error('Advertisement not found:', advertisementId);
          return throwError(() => new Error('Advertisement not found'));
        } else if (error.status === 500) {
          console.error('Server error while fetching deposits for advertisement:', advertisementId);
          return throwError(() => new Error('Server error while fetching deposits'));
        }
        console.error('Unexpected error while fetching deposits for advertisement:', advertisementId, error);
        return throwError(() => error);
      })
    );
  }
}