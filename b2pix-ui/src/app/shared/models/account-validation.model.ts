/**
 * Account Validation Models
 * Based on ACCOUNT_VALIDATION_API.md specification
 */

// ============================================================================
// Request Payloads
// ============================================================================

export interface SendEmailCodePayload {
  email: string;
}

export interface VerifyEmailCodePayload {
  email: string;
  code: string;
}

export interface CreatePixVerifyPayload {
  user_pix_key: string;
}

export interface ConfirmPixPayload {
  pix_confirmation_code?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface SendEmailCodeResponse {
  message: string;
  email: string;
  expires_at: string;
}

export interface VerifyEmailCodeResponse {
  verified: true;
  email: string;
}

export interface PixVerifyResponse {
  destination_pix_key: string;
  confirmation_value_cents: number;
  confirmation_value_brl: string;
  expires_at: string;
  message: string;
  attempts: number;
  max_attempts: number;
  status: 'awaiting' | 'processing' | 'verified' | 'expired' | 'failed';
}

export interface EmailVerificationStatus {
  status: 'awaiting' | 'processing' | 'verified' | 'expired' | null;
  email?: string;
  expires_at?: string;
  attempts?: number;
  created_at?: string;
}

export interface PixVerificationStatus {
  status: 'awaiting' | 'processing' | 'verified' | 'expired' | 'failed' | null;
  user_pix_key?: string;
  confirmation_value_cents?: number;
  confirmation_value_brl?: string;
  destination_pix_key?: string;
  expires_at?: string;
  attempts?: number;
  max_attempts?: number;
  created_at?: string;
}

export interface AccountInfo {
  address: string;
  email_verified: boolean;
  pix_verified: boolean;
  created_at?: string;
}

export interface ValidationStatus {
  email_verified: boolean;
  email_verification_pending: boolean;
  email?: string;
  pix_verified: boolean;
  pix_verification_pending: boolean;
  pix_key?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
  error: string;
}

// ============================================================================
// Helper Types
// ============================================================================

export type EmailVerificationStep = 'enter-email' | 'enter-code' | 'success';
export type PixVerificationStep = 'enter-pix' | 'confirm-pix-key' | 'deposit-instructions' | 'processing' | 'success' | 'failed';
