import { Advertisement, PricingMode } from '../models/advertisement.model';

/**
 * Utility functions for pricing calculations and formatting
 */
export class PricingUtils {
  /**
   * Calculate effective price per BTC for any advertisement
   * @param advertisement The advertisement to calculate price for
   * @param currentQuotePrice Current market price in cents (or null if unavailable)
   * @returns Effective price in cents, or null if cannot be calculated
   */
  static getEffectivePrice(
    advertisement: Advertisement,
    currentQuotePrice: number | null
  ): number | null {
    if (advertisement.pricing_mode === 'fixed') {
      return advertisement.price!;
    }

    if (!currentQuotePrice) {
      return null;
    }

    return Math.floor(
      currentQuotePrice * (1 + advertisement.percentage_offset! / 100)
    );
  }

  /**
   * Format pricing mode for display (for sellers viewing their own ads)
   * @param advertisement The advertisement
   * @returns Formatted pricing mode string
   */
  static formatPricingMode(advertisement: Advertisement): string {
    if (advertisement.pricing_mode === 'fixed') {
      return 'Preço Fixo';
    }

    const offset = advertisement.percentage_offset!;
    const sign = offset >= 0 ? '+' : '';
    return `Dinâmico: ${sign}${offset.toFixed(2)}%`;
  }

  /**
   * Get badge color class for pricing mode (for sellers)
   * @param advertisement The advertisement
   * @returns CSS class name for badge color
   */
  static getPriceBadgeColor(advertisement: Advertisement): string {
    if (advertisement.pricing_mode === 'fixed') {
      return 'primary';
    }

    const offset = advertisement.percentage_offset!;
    if (offset < 0) return 'success'; // Discount - good for buyer
    if (offset > 2) return 'warning';  // High premium
    return 'info';                     // Normal premium
  }

  /**
   * Format BRL cents to currency string
   * @param cents Amount in cents
   * @returns Formatted currency string (e.g., "R$ 500.000,00")
   */
  static formatBRL(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  }

  /**
   * Calculate price for transaction (to store in blockchain contract)
   * @param pricingMode The pricing mode (fixed or dynamic)
   * @param value Fixed price in BRL (for fixed mode) or percentage offset (for dynamic mode)
   * @returns Price in cents (fixed mode) or basis points (dynamic mode)
   */
  static calculateTransactionPrice(
    pricingMode: PricingMode,
    value: number
  ): number {
    if (pricingMode === 'fixed') {
      // Convert BRL to cents
      return Math.floor(value * 100);
    } else {
      // Convert percentage to basis points (multiply by 100)
      // e.g., 3.15% → 315
      return Math.floor(value * 100);
    }
  }

  /**
   * Calculate how much BTC buyer will receive for a given BRL amount
   * @param brlAmount Amount in BRL cents
   * @param pricePerBtc Price per BTC in BRL cents
   * @returns Amount in satoshis
   */
  static calculateBtcAmount(brlAmount: number, pricePerBtc: number): number {
    const btcAmount = brlAmount / pricePerBtc;
    return Math.floor(btcAmount * 100_000_000); // Convert BTC to satoshis
  }
}
