/**
 * Buy Order Status enum matching the new API specification
 */
export enum BuyOrderStatus {
  /** Order created, waiting for payment */
  Created = 'created',
  /** User marked as paid, payment being verified */
  Processing = 'processing',
  /** Payment verification failed, manual review needed */
  Analyzing = 'analyzing',
  /** Payment confirmed, BTC amount calculated */
  Confirmed = 'confirmed',
  /** Order rejected by manager */
  Rejected = 'rejected',
  /** User canceled the order */
  Canceled = 'canceled',
  /** Order expired (15 minutes timeout) */
  Expired = 'expired'
}

/**
 * Buy Order interface matching the new API response
 */
export interface BuyOrder {
  id: string;
  buy_value: number;                    // BRL in cents (u64)
  address_buy: string;                  // Stacks wallet address
  pix_key: string;                      // PIX key to receive payment
  pix_end_to_end_id: string | null;     // PIX transaction ID (when confirmed)
  amount: number | null;                // BTC in satoshis (u64) - only set when confirmed
  status: BuyOrderStatus;               // Current order status
  is_final: boolean;                    // True if order is in final state
  expires_at: string;                   // ISO 8601 datetime
  created_at: string;                   // ISO 8601 datetime
  updated_at: string;                   // ISO 8601 datetime
}

/**
 * Paginated buy orders response
 */
export interface PaginatedBuyOrdersResponse {
  buy_orders: BuyOrder[];
  page: number;
  limit: number;
  has_more: boolean;
}

export function isBuyOrderFinalStatus(status: BuyOrderStatus): boolean {
  return status === BuyOrderStatus.Confirmed
    || status === BuyOrderStatus.Rejected
    || status === BuyOrderStatus.Canceled;
}

export function getBuyOrderStatusLabel(status: BuyOrderStatus): string {
  switch (status) {
    case BuyOrderStatus.Created:
      return 'Pendente';
    case BuyOrderStatus.Processing:
      return 'Verificando Pagamento';
    case BuyOrderStatus.Analyzing:
      return 'Em Análise';
    case BuyOrderStatus.Confirmed:
      return 'Confirmado';
    case BuyOrderStatus.Rejected:
      return 'Rejeitado';
    case BuyOrderStatus.Canceled:
      return 'Cancelado';
    case BuyOrderStatus.Expired:
      return 'Expirado';
    default:
      return 'Desconhecido';
  }
}

export function getBuyOrderStatusClass(status: BuyOrderStatus): string {
  switch (status) {
    case BuyOrderStatus.Confirmed:
      return 'completed';
    case BuyOrderStatus.Processing:
    case BuyOrderStatus.Analyzing:
      return 'processing';
    case BuyOrderStatus.Created:
      return 'pending';
    case BuyOrderStatus.Rejected:
    case BuyOrderStatus.Canceled:
    case BuyOrderStatus.Expired:
      return 'warning';
    default:
      return 'pending';
  }
}
