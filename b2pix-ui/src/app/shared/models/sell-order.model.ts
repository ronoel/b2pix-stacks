import {
  OrderStatus,
  isOrderFinalStatus,
  getOrderStatusLabel,
  getOrderStatusClass
} from './pix-payment.model';

export type { OrderStatus };

export interface SellOrder {
  id: string;
  address_customer: string;
  amount: number; // Amount in satoshis
  pix_target: string;
  status: OrderStatus;
  is_final: boolean;
  pix_value: number | null; // Value in BRL cents (calculated on confirmation)
  tx_hash: string | null;
  confirmed_at: string | null;
  error_message: string | null;
  payout_request_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSellOrderRequest {
  transaction: string; // Serialized transaction for BoltProtocol
  address: string; // Source wallet address
  amount: number; // Amount in satoshis (u64 compatible)
}

export interface PaginatedSellOrdersResponse {
  items: SellOrder[];
  page: number;
  limit: number;
  has_more: boolean;
}

export function isFinalStatus(status: OrderStatus): boolean {
  return isOrderFinalStatus(status);
}

export function getStatusLabel(status: OrderStatus): string {
  return getOrderStatusLabel(status);
}

export function getStatusClass(status: OrderStatus): string {
  return getOrderStatusClass(status);
}
