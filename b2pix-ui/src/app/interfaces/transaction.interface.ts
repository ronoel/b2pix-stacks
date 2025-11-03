export interface BitcoinListing {
  id: string;
  sellerId: string;
  sellerName: string;
  pricePerBtc: number;
  availableAmount: number;
  minPurchase: number;
  maxPurchase: number;
  pixKey: string;
  createdAt: Date;
}

export interface PurchaseOrder {
  id: string;
  listingId: string;
  buyerId: string;
  amountBrl: number;
  amountBtc: number;
  pixKey: string;
  status: 'pending' | 'paid' | 'confirmed' | 'cancelled' | 'expired';
  pixTransactionId?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface SellOrder {
  id: string;
  sellerId: string;
  amountBtc: number;
  pricePerBtc: number;
  totalBrl: number;
  status: 'pending' | 'published' | 'completed' | 'cancelled';
  createdAt: Date;
}
