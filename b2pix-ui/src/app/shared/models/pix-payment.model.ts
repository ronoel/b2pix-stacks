export enum PixPaymentStatus {
  Created = 'created',
  Broadcasted = 'broadcasted',
  AwaitingConfirmation = 'awaiting_confirmation',
  Confirmed = 'confirmed',
  LpAssigned = 'lp_assigned',
  Paid = 'paid',
  Failed = 'failed',
  Error = 'error',
  Expired = 'expired',
  Refunded = 'refunded'
}

export interface PixPaymentOrder {
  id: string;
  address_payer: string;
  qr_code_payload: string;
  pix_value: number;                // BRL in cents
  amount: number;                   // Satoshis
  status: PixPaymentStatus;
  is_final: boolean;
  tx_hash: string | null;
  pix_end_to_end_id: string | null;
  error_message: string | null;
  lp_address: string | null;
  lp_accepted_at: string | null;
  lp_paid_at: string | null;
  lp_cancel_count: number;
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

export function isPixPaymentFinalStatus(status: PixPaymentStatus): boolean {
  return status === PixPaymentStatus.Paid
    || status === PixPaymentStatus.Failed
    || status === PixPaymentStatus.Expired
    || status === PixPaymentStatus.Refunded;
}

export function getPixPaymentStatusLabel(status: PixPaymentStatus): string {
  switch (status) {
    case PixPaymentStatus.Created:
      return 'Criada';
    case PixPaymentStatus.Broadcasted:
      return 'Transmitida';
    case PixPaymentStatus.AwaitingConfirmation:
      return 'Aguardando Confirmação';
    case PixPaymentStatus.Confirmed:
      return 'Confirmada';
    case PixPaymentStatus.LpAssigned:
      return 'LP Processando';
    case PixPaymentStatus.Paid:
      return 'PIX Pago';
    case PixPaymentStatus.Failed:
      return 'Falhou';
    case PixPaymentStatus.Error:
      return 'Erro';
    case PixPaymentStatus.Expired:
      return 'Expirada';
    case PixPaymentStatus.Refunded:
      return 'Reembolsado';
    default:
      return 'Desconhecido';
  }
}

export function getPixPaymentStatusClass(status: PixPaymentStatus): string {
  switch (status) {
    case PixPaymentStatus.Paid:
      return 'completed';
    case PixPaymentStatus.Created:
    case PixPaymentStatus.Broadcasted:
    case PixPaymentStatus.AwaitingConfirmation:
      return 'pending';
    case PixPaymentStatus.Confirmed:
    case PixPaymentStatus.LpAssigned:
      return 'processing';
    case PixPaymentStatus.Failed:
      return 'failed';
    case PixPaymentStatus.Error:
      return 'failed';
    case PixPaymentStatus.Expired:
    case PixPaymentStatus.Refunded:
      return 'warning';
    default:
      return 'pending';
  }
}

// ============================================================================
// LP Queue Types
// ============================================================================

export interface PixPaymentQueueItem {
  id: string;
  pix_value: number;
  amount: number;
  status: PixPaymentStatus;
  lp_cancel_count: number;
  expires_at: string;
  created_at: string;
}

export interface PaginatedQueueResponse {
  items: PixPaymentQueueItem[];
  page: number;
  limit: number;
  has_more: boolean;
}

// ============================================================================
// LP Stats Types
// ============================================================================

export interface LpStats {
  total_paid_count: number;
  total_paid_value_cents: number;
  active_order_count: number;
  cancelled_count: number;
  balance_cents: number;
}

// ============================================================================
// LP History Types
// ============================================================================

export interface LpHistoryItem {
  id: string;
  pix_value: number;
  amount: number;
  status: PixPaymentStatus;
  is_final: boolean;
  pix_end_to_end_id: string | null;
  lp_accepted_at: string | null;
  lp_paid_at: string | null;
  created_at: string;
}

export interface PaginatedLpHistoryResponse {
  items: LpHistoryItem[];
  page: number;
  limit: number;
  has_more: boolean;
}
