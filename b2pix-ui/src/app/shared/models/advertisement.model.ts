export enum AdvertisementStatus {
    /** Advertisement created, not yet validated or funded */
    DRAFT = 'draft',
    /** Advertisement waiting the transaction confirmation */
    PENDING = 'pending',
    /** Advertisement validated and with funds available */
    READY = 'ready',
    /** Advertisement is being closed, no new purchases allowed */
    FINISHING = 'finishing',
    /** Failed to validate bank account or PIX key for receiving */
    BANK_FAILED = 'bank_failed',
    /** Failed to receive the expected deposit/funding */
    DEPOSIT_FAILED = 'deposit_failed',
    /** Advertisement closed (manually or by fund exhaustion) */
    CLOSED = 'closed',
    /** Advertisement paused by user action or moderation */
    DISABLED = 'disabled'
}

export enum DepositStatus {
    /** Deposit created, transaction not yet broadcasted */
    DRAFT = 'draft',
    /** Transaction broadcasted, awaiting blockchain confirmation */
    PENDING = 'pending',
    /** Transaction confirmed on-chain, funds added to advertisement */
    CONFIRMED = 'confirmed',
    /** Transaction failed or was rejected */
    FAILED = 'failed'
}

export interface Deposit {
    id: string;
    advertisement_id: string;
    seller_address: string;
    transaction_id: string;
    amount: number;  // Amount in sats
    status: DepositStatus;
    created_at: string;
    updated_at: string;
    confirmed_at: string | null;
}

export type PricingMode = 'fixed' | 'dynamic';

export interface Advertisement {
    id: string;
    seller_address: string;
    token: string;
    currency: string;
    pricing_mode: PricingMode;
    price?: number;  // Price in cents per Bitcoin (only present if pricing_mode === 'fixed')
    percentage_offset?: number;  // Percentage offset (only present if pricing_mode === 'dynamic', e.g., 3.15 or -2.5)
    total_deposited: number;  // Total amount deposited in sats
    available_amount: number;  // Available amount in sats
    min_amount: number;  // Minimum purchase amount in cents (BRL)
    max_amount: number;  // Maximum purchase amount in cents (BRL)
    status: AdvertisementStatus;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateAdvertisementRequest {
    transaction: string;
    min_amount: number;
    max_amount: number;
    pricing_mode: PricingMode;
}