export enum PaymentRequestStatus {
  /** Payment is waiting to be processed */
  Waiting = 'waiting',
  /** Payment transaction is being processed */
  Processing = 'processing',
  /** Payment transaction broadcast successfully */
  Broadcast = 'broadcast',
  /** Payment transaction failed to broadcast */
  Failed = 'failed',
  /** Payment transaction confirmed on blockchain */
  Confirmed = 'confirmed'
}

export enum PaymentSourceType {
  Buy = 'buy_order'
}

export interface PaymentRequest {
  id: string;
  source_type: PaymentSourceType;
  source_id: string;
  receiver_address: string;
  amount: number;
  status: PaymentRequestStatus;
  blockchain_tx_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRequestsResponse {
  data: PaymentRequest[];
  page: number;
  limit: number;
  has_more: boolean;
}
