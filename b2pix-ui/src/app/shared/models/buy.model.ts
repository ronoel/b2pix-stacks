export enum BuyStatus {
    /** Buy created, waiting for payment */
    Pending = 'pending',
    /** Payment received, waiting for confirmation */
    Paid = 'paid',
    /** Payment confirmed, waiting for crypto transfer */
    PaymentConfirmed = 'payment_confirmed',
    /** Crypto transfer completed successfully */
    // Completed = 'completed',
    /** Buy cancelled by buyer or seller */
    Cancelled = 'cancelled',
    /** Buy expired without payment */
    Expired = 'expired',
    /** Dispute opened, waiting for moderator intervention */
    InDispute = 'indispute',
    /** Dispute resolved in favor of buyer (refund) */
    DisputeFavorBuyer = 'dispute_favor_buyer',
    /** Dispute resolved in favor of seller (crypto released) */
    DisputeFavorSeller = 'dispute_favor_seller',
    /** Dispute resolved in favor of buyer (refund) */
    DisputeResolvedBuyer = 'dispute_resolved_buyer',
    /** Dispute resolved in favor of seller (crypto released) */
    DisputeResolvedSeller = 'dispute_resolved_seller'
}

export interface Buy {
    id: string;
    advertisement_id: string;
    amount: string;
    price: string;
    pay_value: string;
    fee: string;
    total_fiat_amount: string;
    address_buy: string;
    pix_key: string;
    status: BuyStatus;
    expires_at: string;
    created_at: string;
    updated_at: string;
}
/**
 * Buy model representing a cryptocurrency purchase transaction.
{
    "id": "68d1f856985e81a634d554e0",
    "advertisement_id": "68d19d3653ef6699f3c14eb7",
    "amount": 16666,
    "price": 60000000,
    "fee": 0,
    "pay_value": 10000,
    "address_buy": "ST3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02W1N0YJF",
    "pix_key": "71bd0a00-6735-44cd-98c9-5a8b63956189",
    "status": "pending",
    "expires_at": "2025-09-23T01:46:02.519+00:00",
    "created_at": "2025-09-23T01:31:02.519+00:00",
    "updated_at": "2025-09-23T01:31:02.519+00:00"
}
 */

export interface ListBuysResponse {
  buys: Buy[];
  total_count: number;
  page: number;
  limit: number;
  has_more: boolean;
}