// Shared OrderStatus for both PixOrder and SellOrder
export type OrderStatus =
  | 'pending'
  | 'broadcasted'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'settlement_created'
  | 'completed'
  | 'expired'
  | 'error'
  | 'failed'
  | 'refunded';

export const FINAL_ORDER_STATUSES: OrderStatus[] = [
  'completed', 'expired', 'failed', 'refunded'
];

export interface PixPaymentOrder {
  id: string;
  address_customer: string;
  pix_target: string;
  pix_value: number;                // BRL in cents
  amount: number;                   // Satoshis
  status: OrderStatus;
  is_final: boolean;
  tx_hash: string | null;
  confirmed_at: string | null;
  error_message: string | null;
  payout_request_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
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
      return 'Pagando';
    case 'completed':
      return 'Pago';
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
    case 'completed':
      return 'completed';
    case 'broadcasted':
    case 'awaiting_confirmation':
    case 'pending':
      return 'pending';
    case 'confirmed':
    case 'settlement_created':
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
