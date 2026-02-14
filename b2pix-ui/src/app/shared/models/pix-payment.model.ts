export enum PixPaymentStatus {
  Broadcasted = 'broadcasted',
  AwaitingConfirmation = 'awaiting_confirmation',
  Confirmed = 'confirmed',
  SettlementCreated = 'settlement_created',
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
  payout_request_id: string | null;
  paid_at: string | null;
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
    case PixPaymentStatus.Broadcasted:
      return 'Transmitida';
    case PixPaymentStatus.AwaitingConfirmation:
      return 'Aguardando Confirmação';
    case PixPaymentStatus.Confirmed:
      return 'Confirmada';
    case PixPaymentStatus.SettlementCreated:
      return 'Liquidação Criada';
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
    case PixPaymentStatus.Broadcasted:
    case PixPaymentStatus.AwaitingConfirmation:
      return 'pending';
    case PixPaymentStatus.Confirmed:
    case PixPaymentStatus.SettlementCreated:
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
