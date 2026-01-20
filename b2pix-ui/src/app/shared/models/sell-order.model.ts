export enum SellOrderStatus {
  Pending = 'pending',
  Broadcasted = 'broadcasted',
  AwaitingConfirmation = 'awaiting_confirmation',
  Confirmed = 'confirmed',
  Paid = 'paid',
  Failed = 'failed'
}

export interface SellOrder {
  id: string;
  address_seller: string;
  amount: number; // Amount in satoshis
  pix_key: string;
  status: SellOrderStatus;
  is_final: boolean;
  sell_value: number | null; // Value in BRL cents (calculated on confirmation)
  pix_id: string | null;
  tx_hash: string | null;
  confirmed_at: string | null;
  paid_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSellOrderRequest {
  transaction: string; // Serialized transaction for BoltProtocol
  address: string; // Source wallet address
  amount: number; // Amount in satoshis
}

export interface PaginatedSellOrdersResponse {
  items: SellOrder[];
  page: number;
  limit: number;
  has_more: boolean;
}

export function isFinalStatus(status: SellOrderStatus): boolean {
  return status === SellOrderStatus.Paid || status === SellOrderStatus.Failed;
}

export function getStatusLabel(status: SellOrderStatus): string {
  switch (status) {
    case SellOrderStatus.Pending:
      return 'Pendente';
    case SellOrderStatus.Broadcasted:
      return 'Transmitida';
    case SellOrderStatus.AwaitingConfirmation:
      return 'Aguardando Confirmação';
    case SellOrderStatus.Confirmed:
      return 'Confirmada';
    case SellOrderStatus.Paid:
      return 'Pago';
    case SellOrderStatus.Failed:
      return 'Falhou';
    default:
      return 'Desconhecido';
  }
}

export function getStatusClass(status: SellOrderStatus): string {
  switch (status) {
    case SellOrderStatus.Paid:
      return 'completed';
    case SellOrderStatus.Pending:
    case SellOrderStatus.Broadcasted:
    case SellOrderStatus.AwaitingConfirmation:
      return 'pending';
    case SellOrderStatus.Confirmed:
      return 'processing';
    case SellOrderStatus.Failed:
      return 'failed';
    default:
      return 'pending';
  }
}
