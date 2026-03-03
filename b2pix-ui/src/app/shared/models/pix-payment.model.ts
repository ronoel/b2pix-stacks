// Shared OrderStatus for both PixOrder and SellOrder
export type OrderStatus =
  | 'pending'
  | 'broadcasted'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'settlement_created'
  | 'expired'
  | 'error'
  | 'failed'
  | 'refunded';

export const FINAL_ORDER_STATUSES: OrderStatus[] = [
  'settlement_created', 'expired', 'failed', 'refunded'
];

export interface CommonOrder {
  id: string;
  address_customer: string;
  pix_target: string;
  pix_value: number | null;        // BRL in cents; null for sell orders before confirmation
  amount: number;                   // Satoshis
  status: OrderStatus;
  is_final: boolean;
  tx_hash: string | null;
  confirmed_at: string | null;
  error_message: string | null;
  payout_request_id: string | null;
  expires_at?: string;              // Only present on PixPaymentOrder
  created_at: string;
  updated_at: string;
}

export interface PixPaymentOrder extends CommonOrder {
  pix_value: number;                // Always set for pix payments
  expires_at: string;               // Always set for pix payments
}

export interface CreatePixPaymentRequest {
  qr_code_payload: string;
  transaction: string;
  address: string;
  amount: number;
}

export interface PaginatedPixPaymentsResponse {
  items: PixPaymentOrder[];
  page: number;
  limit: number;
  has_more: boolean;
}

export function isOrderFinalStatus(status: OrderStatus): boolean {
  return FINAL_ORDER_STATUSES.includes(status);
}

export function getOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'broadcasted':
      return 'Transmitida';
    case 'awaiting_confirmation':
      return 'Aguardando Confirmação';
    case 'confirmed':
      return 'Confirmada';
    case 'settlement_created':
      return 'Em Liquidação';
    case 'pending':
      return 'Pendente';
    case 'failed':
      return 'Falhou';
    case 'error':
      return 'Erro';
    case 'expired':
      return 'Expirada';
    case 'refunded':
      return 'Reembolsado';
    default:
      return 'Desconhecido';
  }
}

export function getOrderStatusClass(status: OrderStatus): string {
  switch (status) {
    case 'settlement_created':
      return 'completed';
    case 'broadcasted':
    case 'awaiting_confirmation':
    case 'pending':
      return 'pending';
    case 'confirmed':
      return 'processing';
    case 'failed':
    case 'error':
      return 'failed';
    case 'expired':
    case 'refunded':
      return 'warning';
    default:
      return 'pending';
  }
}
