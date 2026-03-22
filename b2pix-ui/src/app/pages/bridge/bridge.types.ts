// Direction & steps
export type BridgeDirection = 'deposit' | 'withdrawal';
export type DepositStep = 'form' | 'address' | 'processing';
export type WithdrawStep = 'form' | 'processing';

// Config objects for each flow
export interface DepositConfig {
  amount: number;
  maxSignerFee: number;
  reclaimLockTime: number;
}

export interface WithdrawConfig {
  btcAddress: string;
  amount: number;
  maxFee: number;
}

export interface DecodedBtcAddress {
  type: string;
  hashbytes: Uint8Array;
}

// Deposit address result (from sbtc lib)
export interface DepositAddressResult {
  address: string;
  depositScript: string;
  reclaimScript: string;
  trOut: any;
}

// Supported BTC address types for peg-out (matching contract)
export const SUPPORTED_PEG_OUT_TYPES = ['p2pkh', 'p2sh', 'p2wpkh', 'p2wsh', 'p2tr'] as const;
export type SupportedPegOutType = typeof SUPPORTED_PEG_OUT_TYPES[number];
export const ADDRESS_TYPE_VERSION: Record<SupportedPegOutType, string> = {
  p2pkh: '0x00',
  p2sh: '0x01',
  p2wpkh: '0x04',
  p2wsh: '0x05',
  p2tr: '0x06',
};

// ===== localStorage persistence =====

export type BridgeOperationType = 'deposit' | 'withdrawal';
export type BridgeOperationStatus = 'pending' | 'broadcasted' | 'confirmed' | 'failed';

export interface BridgeOperationRecord {
  id: string;
  type: BridgeOperationType;
  status: BridgeOperationStatus;
  amount: number;
  createdAt: string;
  updatedAt: string;
  // Deposit-specific
  btcTxid?: string;
  btcVout?: number;
  depositAddress?: string;
  depositScript?: string;
  reclaimScript?: string;
  // Deposit fulfillment (Stacks mint tx from signers)
  stacksTxidFulfillment?: string;
  // Withdrawal-specific
  stacksTxid?: string;
  btcAddress?: string;
  btcTxidFulfillment?: string;
  requestId?: number;
  // Emily raw status
  emilyStatus?: string;
  emilyStatusMessage?: string;
}

export interface BridgeStorageData {
  operations: BridgeOperationRecord[];
}

// Emily withdrawal list response (from /withdrawal/sender/{address})
export interface EmilyWithdrawalListResponse {
  nextToken: string | null;
  withdrawals: EmilyWithdrawalListItem[];
}

export interface EmilyWithdrawalListItem {
  requestId: number;
  status: 'pending' | 'accepted' | 'confirmed';
  txid: string;       // Stacks tx hash that initiated the withdrawal
  sender: string;
  amount: number;
}

// Emily individual withdrawal response (from /withdrawal/{requestId})
export interface EmilyWithdrawalDetail {
  requestId: number;
  status: 'pending' | 'accepted' | 'confirmed';
  txid: string;
  sender: string;
  amount: number;
  fulfillment?: {
    BitcoinTxid: string;
    BitcoinTxIndex: number;
    StacksTxid: string;
    BitcoinBlockHash: string;
    BitcoinBlockHeight: number;
    BtcFee: number;
  };
}

// ===== Status helpers =====

export function isFinalStatus(s: BridgeOperationStatus): boolean {
  return s === 'confirmed' || s === 'failed';
}

export function mapEmilyDepositStatus(s: string): BridgeOperationStatus {
  const lower = s.toLowerCase();
  if (lower === 'confirmed') return 'confirmed';
  if (lower === 'failed' || lower === 'reprocessing') return 'failed';
  return 'broadcasted';
}

export function mapEmilyWithdrawalStatus(s: string): BridgeOperationStatus {
  if (s === 'confirmed') return 'confirmed';
  if (s === 'accepted') return 'broadcasted';
  return 'pending';
}

export function getStatusLabel(s: BridgeOperationStatus): string {
  const map: Record<BridgeOperationStatus, string> = {
    pending: 'Pendente',
    broadcasted: 'Processando',
    confirmed: 'Confirmada',
    failed: 'Falhou',
  };
  return map[s] ?? s;
}

export function getStatusClass(s: BridgeOperationStatus): string {
  const map: Record<BridgeOperationStatus, string> = {
    pending: 'pending',
    broadcasted: 'processing',
    confirmed: 'completed',
    failed: 'failed',
  };
  return map[s] ?? 'pending';
}

export function getTypeLabel(t: BridgeOperationType): string {
  return t === 'deposit' ? 'Depósito (BTC → sBTC)' : 'Retirada (sBTC → BTC)';
}
