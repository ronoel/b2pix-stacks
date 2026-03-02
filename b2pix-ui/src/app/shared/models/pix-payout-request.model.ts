export enum PayoutRequestStatus {
  Pending = 'pending',
  LpAssigned = 'lp_assigned',
  Paid = 'paid',
  Disputed = 'disputed',
  Confirmed = 'confirmed',
  Error = 'error',
  ErrorEscalated = 'error_escalated',
  DisputeRejected = 'dispute_rejected',
  Failed = 'failed'
}

export type PayoutSourceType = 'sell_order' | 'pix_order';

export interface PixPayoutRequest {
  id: string;
  source_type: PayoutSourceType;
  source_id: string;
  pix_key: string | null;
  qr_code_payload: string | null;
  pix_value: number;                // BRL in cents
  status: PayoutRequestStatus;
  is_final: boolean;
  payer_address: string;
  lp_address: string | null;
  lp_accepted_at: string | null;
  lp_paid_at: string | null;
  lp_cancel_count: number;
  pix_end_to_end_id: string | null;
  error_message: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  attempt_number: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedPayoutRequestResponse {
  items: PixPayoutRequest[];
  page: number;
  limit: number;
  has_more: boolean;
}

export interface LpStats {
  total_paid_count: number;
  total_paid_value_cents: number;
  active_order_count: number;
  cancelled_count: number;
  error_count: number;
  dispute_lost_count: number;
  balance_cents: number;
}

export function isPayoutRequestFinalStatus(status: PayoutRequestStatus): boolean {
  return status === PayoutRequestStatus.Confirmed
    || status === PayoutRequestStatus.Failed
    || status === PayoutRequestStatus.Error
    || status === PayoutRequestStatus.ErrorEscalated
    || status === PayoutRequestStatus.DisputeRejected;
}

export function getPayoutRequestStatusLabel(status: PayoutRequestStatus): string {
  switch (status) {
    case PayoutRequestStatus.Pending:
      return 'Pendente';
    case PayoutRequestStatus.LpAssigned:
      return 'LP Processando';
    case PayoutRequestStatus.Paid:
      return 'Pago';
    case PayoutRequestStatus.Disputed:
      return 'Disputado';
    case PayoutRequestStatus.Confirmed:
      return 'Confirmado';
    case PayoutRequestStatus.Error:
      return 'Erro';
    case PayoutRequestStatus.ErrorEscalated:
      return 'Erro Escalado';
    case PayoutRequestStatus.DisputeRejected:
      return 'Disputa Rejeitada';
    case PayoutRequestStatus.Failed:
      return 'Falhou';
    default:
      return 'Desconhecido';
  }
}

export function getPayoutRequestStatusClass(status: PayoutRequestStatus): string {
  switch (status) {
    case PayoutRequestStatus.Confirmed:
      return 'completed';
    case PayoutRequestStatus.Paid:
      return 'processing';
    case PayoutRequestStatus.Disputed:
      return 'warning';
    case PayoutRequestStatus.Pending:
      return 'pending';
    case PayoutRequestStatus.LpAssigned:
      return 'processing';
    case PayoutRequestStatus.Failed:
    case PayoutRequestStatus.Error:
    case PayoutRequestStatus.DisputeRejected:
      return 'failed';
    case PayoutRequestStatus.ErrorEscalated:
      return 'escalated';
    default:
      return 'pending';
  }
}

export function getSourceTypeLabel(sourceType: PayoutSourceType): string {
  return sourceType === 'pix_order' ? 'PIX' : 'Venda';
}
