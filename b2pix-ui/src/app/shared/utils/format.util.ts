import { environment } from '../../../environments/environment';

/**
 * Format BRL cents as currency string (e.g., 15050 → "R$ 150,50")
 */
export function formatBrlCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cents / 100);
}

/**
 * Format satoshis with pt-BR thousand separator (e.g., 100000 → "100.000")
 */
export function formatSats(sats: number): string {
  return new Intl.NumberFormat('pt-BR').format(sats);
}

/**
 * Format satoshis as BTC with 8 decimal places (e.g., 100000 → "0.00100000")
 */
export function formatSatsToBtc(sats: number): string {
  return (sats / 100_000_000).toFixed(8);
}

/**
 * Format ISO date string to pt-BR datetime (e.g., "03/03/2026, 14:30")
 */
export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
}

/**
 * Truncate a string showing prefix and suffix with ellipsis
 * Default: 8 chars prefix + 8 chars suffix (e.g., "0x1234ab...cdef5678")
 */
export function formatTruncated(value: string, prefixLen = 8, suffixLen = 8): string {
  if (!value || value.length <= prefixLen + suffixLen) return value;
  return `${value.substring(0, prefixLen)}...${value.substring(value.length - suffixLen)}`;
}

/**
 * Get Hiro explorer URL for a transaction hash
 */
export function getExplorerUrl(txHash: string): string {
  const tx = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
  const chain = environment.network === 'mainnet' ? 'mainnet' : 'testnet';
  return `https://explorer.hiro.so/txid/${tx}?chain=${chain}`;
}
