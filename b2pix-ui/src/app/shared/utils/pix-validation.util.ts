export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'evp';

/**
 * Strip formatting characters from a potential CPF/CNPJ/phone input.
 * Accepts dots, dashes, slashes, parens, spaces — returns only the meaningful chars.
 */
function stripFormatting(input: string): string {
  return input.replace(/[.\-\/() ]/g, '');
}

/**
 * Validate a PIX key format (CPF, CNPJ, phone, email, or EVP/UUID).
 * Accepts both raw and formatted inputs (e.g., "015.121.606-10" for CPF).
 */
export function validatePixKey(key: string): boolean {
  if (!key || key.trim().length === 0) return false;
  return detectPixKeyType(key) !== null;
}

/**
 * Normalize a PIX key to the canonical format the API expects.
 * Strips formatting from CPF, CNPJ, and phone inputs.
 * For email/EVP, returns trimmed lowercase.
 */
export function normalizePixKey(key: string): string {
  const trimmed = key.trim();
  const type = detectPixKeyType(trimmed);

  switch (type) {
    case 'email':
      return trimmed.toLowerCase();

    case 'evp':
      return trimmed.toLowerCase();

    case 'phone': {
      // Strip all formatting, ensure +55 prefix with only digits after
      const digits = stripFormatting(trimmed).replace(/^\+/, '');
      if (digits.startsWith('55') && digits.length >= 12) {
        return `+${digits}`;
      }
      // Bare 10-11 digits (e.g., "48999120752") → prepend +55
      return `+55${digits}`;
    }

    case 'cpf':
    case 'cnpj':
      // Return only digits
      return stripFormatting(trimmed);

    default:
      return trimmed;
  }
}

/**
 * Auto-detect PIX key type from the raw input string.
 * Supports formatted inputs: "015.121.606-10" (CPF), "12.345.678/0001-99" (CNPJ),
 * "(11) 99999-9999" or "+55 11 99999-9999" (phone).
 * Returns null if the key doesn't match any known format.
 */
export function detectPixKeyType(key: string): PixKeyType | null {
  const trimmed = key.trim();
  if (trimmed.length === 0) return null;

  // Phone: starts with + (e.g., "+5511999999999", "+55 11 99999-9999")
  if (trimmed.startsWith('+')) {
    const digits = stripFormatting(trimmed);
    if (/^55\d{10,11}$/.test(digits)) return 'phone';
    return null;
  }

  // Email: contains @
  if (trimmed.includes('@')) {
    const parts = trimmed.split('@');
    if (parts.length === 2 && parts[0].length > 0 && parts[1].includes('.')) return 'email';
    return null;
  }

  // EVP/UUID: 36 chars with hyphens (no formatting ambiguity)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return 'evp';
  }

  // Strip formatting for CPF/CNPJ/phone detection
  const digits = stripFormatting(trimmed);

  // Only proceed if the original input was digits + formatting chars (no letters except UUID/email)
  if (!/^[\d.\-\/() +]+$/.test(trimmed)) return null;

  // CNPJ: 14 digits (raw: "12345678000199", formatted: "12.345.678/0001-99")
  if (digits.length === 14) {
    if (validateCnpj(digits)) return 'cnpj';
    return null;
  }

  // 11 digits: CPF or phone (e.g., "48999120752" is a phone, "01512160610" is a CPF)
  // Try CPF first (check digits discriminate); if invalid CPF, treat as phone
  if (digits.length === 11) {
    if (validateCpf(digits)) return 'cpf';
    return 'phone';
  }

  // 10 digits: phone without 9th digit (e.g., "4899912075" → will be normalized to "48999120750"... no)
  // Actually 10-digit is old landline or mobile without the 9 — still a valid phone key
  if (digits.length === 10) {
    return 'phone';
  }

  return null;
}

/**
 * Get human-readable label for a PIX key type (pt-BR).
 */
export function getPixKeyTypeLabel(type: PixKeyType): string {
  switch (type) {
    case 'cpf': return 'CPF';
    case 'cnpj': return 'CNPJ';
    case 'phone': return 'Telefone';
    case 'email': return 'E-mail';
    case 'evp': return 'Chave aleatória';
  }
}

/**
 * Format a normalized PIX key for human-friendly display (no masking).
 * CPF → "015.121.606-10", CNPJ → "12.345.678/0001-99", phone → "+55 11 99999-9999"
 */
export function formatPixKeyForDisplay(key: string, type: PixKeyType): string {
  const normalized = normalizePixKey(key);
  switch (type) {
    case 'cpf': {
      const d = normalized.replace(/\D/g, '');
      return `${d.substring(0, 3)}.${d.substring(3, 6)}.${d.substring(6, 9)}-${d.substring(9)}`;
    }
    case 'cnpj': {
      const d = normalized.replace(/\D/g, '');
      return `${d.substring(0, 2)}.${d.substring(2, 5)}.${d.substring(5, 8)}/${d.substring(8, 12)}-${d.substring(12)}`;
    }
    case 'phone': {
      const d = normalized.replace(/\D/g, '');
      // +55 XX XXXXX-XXXX or +55 XX XXXX-XXXX
      const ddd = d.substring(2, 4);
      const rest = d.substring(4);
      if (rest.length === 9) {
        return `+55 ${ddd} ${rest.substring(0, 5)}-${rest.substring(5)}`;
      }
      return `+55 ${ddd} ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    case 'email':
      return normalized;
    case 'evp':
      return normalized;
  }
}

export function validateCpf(cpf: string): boolean {
  if (/^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder >= 10) remainder = 0;
  if (remainder !== parseInt(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder >= 10) remainder = 0;
  if (remainder !== parseInt(cpf[10])) return false;

  return true;
}

export function validateCnpj(cnpj: string): boolean {
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i]) * weights1[i];
  }
  let remainder = sum % 11;
  if ((remainder < 2 ? 0 : 11 - remainder) !== parseInt(cnpj[12])) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i]) * weights2[i];
  }
  remainder = sum % 11;
  if ((remainder < 2 ? 0 : 11 - remainder) !== parseInt(cnpj[13])) return false;

  return true;
}
