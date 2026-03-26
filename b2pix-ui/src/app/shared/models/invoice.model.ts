export enum InvoiceStatus {
  Active = 'active',
  Paid = 'paid',
  Cancelled = 'cancelled',
}

export interface Invoice {
  id: string;
  creator_address: string;
  value_brl: number;              // BRL in cents
  label: string | null;
  client_email: string | null;
  payment_token: string;
  status: InvoiceStatus;
  confirmed_sbtc: number | null;  // satoshis (set on confirmation)
  paid_at: string | null;         // ISO 8601
  created_at: string;
  updated_at: string;
}

export interface PaginatedInvoicesResponse {
  invoices: Invoice[];
  page: number;
  limit: number;
  has_more: boolean;
}

export interface PayResponse {
  session_token: string;
  pix_key: string;
  value_brl: number;              // BRL in cents
  expires_at: string;             // ISO 8601
}

export interface SessionStatusResponse {
  status: string;                 // 'created' | 'processing' | 'analyzing' | 'confirmed' | 'rejected' | 'expired'
  pix_key: string;
  value_brl: number;              // BRL in cents
  expires_at: string;             // ISO 8601
  is_expired: boolean;
  is_final: boolean;
}

export interface PayInPersonResponse {
  pix_key: string;
  value_brl: number;              // BRL in cents
  inbound_request_id: string;
  expires_at: string;             // ISO 8601
}

export interface CancelPaymentResponse {
  outcome: string;                // 'confirmed' | 'cancelled'
  message: string;
}

export interface PaymentStatusResponse {
  inbound_request_id: string;
  status: string;                 // 'created' | 'processing' | 'analyzing' | 'confirmed' | 'rejected' | 'expired'
  pix_key: string;
  value_brl: number;              // BRL in cents
  expires_at: string;             // ISO 8601
  is_expired: boolean;
  is_final: boolean;
}

export type InPersonPaymentStatus = 'created' | 'processing' | 'analyzing' | 'confirmed' | 'rejected' | 'expired';

export function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'created': return 'Aguardando pagamento';
    case 'processing': return 'Verificando pagamento';
    case 'analyzing': return 'Pagamento não encontrado';
    case 'confirmed': return 'Pagamento confirmado';
    case 'rejected': return 'Pagamento rejeitado';
    case 'expired': return 'Pagamento expirado';
    default: return status;
  }
}

export function getPaymentStatusClass(status: string): string {
  switch (status) {
    case 'created': return 'pending';
    case 'processing': return 'processing';
    case 'analyzing': return 'analyzing';
    case 'confirmed': return 'completed';
    case 'rejected': return 'rejected';
    case 'expired': return 'expired';
    default: return 'pending';
  }
}

export interface MessageResponse {
  message: string;
}

export interface InvoicePublicSummary {
  creator_address: string;
  value_brl: number;
  label: string | null;
  status: InvoiceStatus;
}

export interface OtpSendResponse {
  message: string;
  email: string;
  expires_at: string;             // OTP code expiration (ISO 8601)
}

export interface OtpVerifyResponse {
  session_token: string;
  email: string;
}

export type PaymentStep =
  | 'loading'
  | 'invoice-summary'
  | 'otp-verify'
  | 'ready-to-pay'
  | 'payment-active'
  | 'payment-processing'
  | 'payment-expired'
  | 'payment-confirmed'
  | 'payment-analyzing'
  | 'payment-rejected'
  | 'invoice-paid'
  | 'invoice-cancelled'
  | 'error';

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case InvoiceStatus.Active: return 'Ativa';
    case InvoiceStatus.Paid: return 'Paga';
    case InvoiceStatus.Cancelled: return 'Cancelada';
  }
}

export function getInvoiceStatusClass(status: InvoiceStatus): string {
  switch (status) {
    case InvoiceStatus.Active: return 'pending';
    case InvoiceStatus.Paid: return 'completed';
    case InvoiceStatus.Cancelled: return 'expired';
  }
}

export function getSessionStatusLabel(status: string): string {
  switch (status) {
    case 'created': return 'Aguardando pagamento';
    case 'processing': return 'Verificando';
    case 'analyzing': return 'Não encontrado';
    case 'confirmed': return 'Confirmado';
    case 'rejected': return 'Rejeitado';
    case 'expired': return 'Expirado';
    default: return status;
  }
}

/**
 * Calculate estimated satoshis with 3.5% invoice markup.
 * Formula: (BRL_cents * 100_000_000 * 1_000) / (BTC_price_cents * 1_035)
 */
export function estimateInvoiceSbtc(brlCents: number, btcPriceCents: number): number {
  if (btcPriceCents <= 0 || brlCents <= 0) return 0;
  return Math.floor((brlCents * 100_000_000_000) / (btcPriceCents * 1035));
}
