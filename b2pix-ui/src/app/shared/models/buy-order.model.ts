/**
 * Buy Order Status enum — simplified after PIX Inbound refactor.
 * Statuses 'expired', 'processing', 'analyzing' moved to PixInboundRequest.
 */
export enum BuyOrderStatus {
  /** Order created, waiting for payment */
  Created = 'created',
  /** Payment confirmed, BTC amount calculated */
  Confirmed = 'confirmed',
  /** Order rejected by manager */
  Rejected = 'rejected',
  /** User canceled the order */
  Canceled = 'canceled',
}

/**
 * PIX Inbound details returned when creating or resubmitting a buy order.
 */
export interface PixInboundInfo {
  pix_inbound_id: string;
  pix_key: string;
  lp_address: string;
  expires_at: string;          // ISO 8601
}

/**
 * Simplified Buy Order response (PIX details moved to PixInboundRequest).
 */
export interface BuyOrderResponse {
  id: string;
  buy_value: number;           // BRL in cents
  address_buy: string;         // Stacks wallet address
  amount: number | null;       // satoshis (set on confirmation)
  status: string;              // 'created' | 'canceled' | 'confirmed' | 'rejected'
  is_final: boolean;
  created_at: string;          // ISO 8601
  updated_at: string;          // ISO 8601
}

/**
 * Response from POST /api/v1/buy-orders (create).
 * Uses serde(flatten) — BuyOrderResponse fields at top level + pix nested.
 */
export interface CreateBuyOrderResponse extends BuyOrderResponse {
  pix: PixInboundInfo | null;
}

/**
 * Response from PUT /api/v1/buy-orders/:id/resubmit
 */
export interface ResubmitResponse {
  buy_order_id: string;
  pix: PixInboundInfo;
}

/**
 * Legacy BuyOrder type — kept for backward compatibility during migration.
 * Components should migrate to BuyOrderResponse.
 * PIX fields are optional — they come from PixInboundRequest now.
 */
export interface BuyOrder {
  id: string;
  buy_value: number;
  address_buy: string;
  amount: number | null;
  status: BuyOrderStatus;
  is_final: boolean;
  created_at: string;
  updated_at: string;
  // Optional PIX fields for backward compat (may be absent in new API responses)
  pix_key?: string;
  expires_at?: string;
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

export function isBuyOrderFinalStatus(status: BuyOrderStatus | string): boolean {
  return status === BuyOrderStatus.Confirmed
    || status === BuyOrderStatus.Rejected
    || status === BuyOrderStatus.Canceled;
}

export function getBuyOrderStatusLabel(status: BuyOrderStatus | string): string {
  switch (status) {
    case BuyOrderStatus.Created:
      return 'Pendente';
    case BuyOrderStatus.Confirmed:
      return 'Confirmado';
    case BuyOrderStatus.Rejected:
      return 'Rejeitado';
    case BuyOrderStatus.Canceled:
      return 'Cancelado';
    default:
      return 'Desconhecido';
  }
}

export function getBuyOrderStatusClass(status: BuyOrderStatus | string): string {
  switch (status) {
    case BuyOrderStatus.Confirmed:
      return 'completed';
    case BuyOrderStatus.Created:
      return 'pending';
    case BuyOrderStatus.Rejected:
    case BuyOrderStatus.Canceled:
      return 'warning';
    default:
      return 'pending';
  }
}
