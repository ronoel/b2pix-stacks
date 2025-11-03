import { Injectable, signal } from '@angular/core';
import { Observable, of, delay, map, timer } from 'rxjs';
import { BitcoinListing, PurchaseOrder, SellOrder } from '../interfaces/transaction.interface';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private isLoading = signal(false);
  private currentBtcPrice = signal(280000); // BRL por BTC

  // Mock data
  private mockListings: BitcoinListing[] = [
    {
      id: '1',
      sellerId: '2',
      sellerName: 'CryptoTrader',
      pricePerBtc: 280000,
      availableAmount: 0.5,
      minPurchase: 100,
      maxPurchase: 50000,
      pixKey: 'crypto@trader.com',
      createdAt: new Date()
    },
    {
      id: '2',
      sellerId: '3',
      sellerName: 'BitcoinBrasil',
      pricePerBtc: 279500,
      availableAmount: 1.2,
      minPurchase: 500,
      maxPurchase: 100000,
      pixKey: '11999887766',
      createdAt: new Date()
    }
  ];

  private purchaseOrders: PurchaseOrder[] = [];
  private sellOrders: SellOrder[] = [];

  getIsLoading() {
    return this.isLoading.asReadonly();
  }

  getCurrentBtcPrice() {
    return this.currentBtcPrice.asReadonly();
  }

  getBitcoinListings(): Observable<BitcoinListing[]> {
    this.isLoading.set(true);
    
    return of(this.mockListings).pipe(
      delay(1000),
      map(listings => {
        this.isLoading.set(false);
        return listings.sort((a, b) => a.pricePerBtc - b.pricePerBtc);
      })
    );
  }

  createPurchaseOrder(listingId: string, amountBrl: number, buyerId: string): Observable<PurchaseOrder> {
    this.isLoading.set(true);
    
    return of(null).pipe(
      delay(1500),
      map(() => {
        this.isLoading.set(false);
        const listing = this.mockListings.find(l => l.id === listingId);
        if (!listing) throw new Error('Anúncio não encontrado');

        const amountBtc = amountBrl / listing.pricePerBtc;
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutos para pagamento

        const order: PurchaseOrder = {
          id: Date.now().toString(),
          listingId,
          buyerId,
          amountBrl,
          amountBtc,
          pixKey: listing.pixKey,
          status: 'pending',
          expiresAt,
          createdAt: new Date()
        };

        this.purchaseOrders.push(order);
        return order;
      })
    );
  }

  confirmPixPayment(orderId: string, pixTransactionId: string): Observable<boolean> {
    this.isLoading.set(true);
    
    return of(true).pipe(
      delay(2000),
      map(() => {
        this.isLoading.set(false);
        const order = this.purchaseOrders.find(o => o.id === orderId);
        if (order) {
          order.pixTransactionId = pixTransactionId;
          order.status = 'paid';
          
          // Simular confirmação automática após alguns segundos
          timer(3000).subscribe(() => {
            order.status = 'confirmed';
          });
        }
        return true;
      })
    );
  }

  createSellOrder(sellerId: string, amountBtc: number, pricePerBtc: number): Observable<boolean> {
    this.isLoading.set(true);
    
    return of(true).pipe(
      delay(2000),
      map(() => {
        this.isLoading.set(false);
        const order: SellOrder = {
          id: Date.now().toString(),
          sellerId,
          amountBtc,
          pricePerBtc,
          totalBrl: amountBtc * pricePerBtc,
          status: 'pending',
          createdAt: new Date()
        };

        this.sellOrders.push(order);
        
        // Simular publicação do anúncio
        timer(3000).subscribe(() => {
          order.status = 'published';
          
          // Adicionar à lista de anúncios
          const listing: BitcoinListing = {
            id: Date.now().toString(),
            sellerId,
            sellerName: 'Você',
            pricePerBtc,
            availableAmount: amountBtc,
            minPurchase: 100,
            maxPurchase: order.totalBrl,
            pixKey: 'seu@pix.com',
            createdAt: new Date()
          };
          this.mockListings.push(listing);
        });

        return true;
      })
    );
  }

  getUserOrders(userId: string): Observable<(PurchaseOrder | SellOrder)[]> {
    const userPurchases = this.purchaseOrders.filter(o => o.buyerId === userId);
    const userSells = this.sellOrders.filter(o => o.sellerId === userId);
    
    return of([...userPurchases, ...userSells]).pipe(delay(500));
  }

  cancelOrder(orderId: string): Observable<boolean> {
    this.isLoading.set(true);
    
    return of(true).pipe(
      delay(1000),
      map(() => {
        this.isLoading.set(false);
        const purchaseOrder = this.purchaseOrders.find(o => o.id === orderId);
        const sellOrder = this.sellOrders.find(o => o.id === orderId);
        
        if (purchaseOrder) {
          purchaseOrder.status = 'cancelled';
        }
        if (sellOrder) {
          sellOrder.status = 'cancelled';
        }
        
        return true;
      })
    );
  }
}
