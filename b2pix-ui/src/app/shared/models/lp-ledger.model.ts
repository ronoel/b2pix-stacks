export type LedgerEntryType = 'reward' | 'conversion' | 'withdrawal';

export interface LpLedgerEntry {
  id: string;
  address: string;
  entry_type: LedgerEntryType;
  satoshis: number;
  brl_cents: number;
  btc_price_cents: number;
  reference_id: string;
  created_at: string;
}

export interface PaginatedLedgerResponse {
  items: LpLedgerEntry[];
  page: number;
  limit: number;
  has_more: boolean;
}

export function getLedgerEntryTypeLabel(entryType: LedgerEntryType): string {
  switch (entryType) {
    case 'reward':
      return 'Recompensa';
    case 'conversion':
      return 'Conversao';
    case 'withdrawal':
      return 'Saque';
    default:
      return 'Desconhecido';
  }
}

export function getLedgerEntryTypeClass(entryType: LedgerEntryType): string {
  switch (entryType) {
    case 'reward':
      return 'reward';
    case 'conversion':
      return 'conversion';
    case 'withdrawal':
      return 'withdrawal';
    default:
      return 'reward';
  }
}
