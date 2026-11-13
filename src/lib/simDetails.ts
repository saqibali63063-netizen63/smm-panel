import type { Category } from '../types/index.ts';

export const SIM_DETAILS_CATEGORY_NAME = 'sim details';

export function getSimDetailsCategoryId(categories: Category[]): number | null {
  const found = categories.find(
    (c) => (c.name || '').trim().toLowerCase() === SIM_DETAILS_CATEGORY_NAME
  );
  return found ? found.id : null;
}

export function isSimDetailsCategory(
  category?: { id?: number; name?: string } | null,
  simDetailsCategoryId?: number | null
): boolean {
  if (!category) return false;
  if (simDetailsCategoryId !== null && simDetailsCategoryId !== undefined) {
    return category.id === simDetailsCategoryId;
  }
  return (category.name || '').trim().toLowerCase() === SIM_DETAILS_CATEGORY_NAME;
}

export function isSimDetailsCategoryName(categoryName?: string | null): boolean {
  return (categoryName || '').trim().toLowerCase() === SIM_DETAILS_CATEGORY_NAME;
}

export interface SimDetailsValidationResult {
  valid: boolean;
  normalized: string;
  type?: 'mobile' | 'cnic';
  error?: string;
}

export function validateSimDetailsInput(rawInput: string): SimDetailsValidationResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      normalized: '',
      error: 'Please enter a valid Pakistani Mobile Number or CNIC.'
    };
  }

  // Reject URLs or alphabetic characters immediately
  if (/[a-zA-Z:/@.]/.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      error:
        'Invalid format. Enter an 11-digit Pakistani Mobile Number (e.g. 03001234567) or 13-digit CNIC (e.g. 3520212345671 or 35202-1234567-1).'
    };
  }

  // 1. Pakistani CNIC with hyphens: 35202-1234567-1
  if (/^\d{5}-\d{7}-\d$/.test(trimmed)) {
    const digits = trimmed.replace(/-/g, '');
    if (/^0+$/.test(digits)) {
      return {
        valid: false,
        normalized: trimmed,
        error: 'Please enter a valid 13-digit Pakistani CNIC number.'
      };
    }
    return { valid: true, normalized: trimmed, type: 'cnic' };
  }

  // 2. Pakistani 13-digit CNIC without hyphens: 3520212345671
  if (/^\d{13}$/.test(trimmed)) {
    if (/^0+$/.test(trimmed)) {
      return {
        valid: false,
        normalized: trimmed,
        error: 'Please enter a valid 13-digit Pakistani CNIC number.'
      };
    }
    return { valid: true, normalized: trimmed, type: 'cnic' };
  }

  // 3. Pakistani Mobile Number:
  //    - 11-digit local format: 03001234567, 0300-1234567, 0300 1234567
  //    - +92 / 92 format: +923001234567, 923001234567
  if (/^03\d{2}[-\s]?\d{7}$/.test(trimmed) || /^(\+92|92)3\d{9}$/.test(trimmed)) {
    return { valid: true, normalized: trimmed, type: 'mobile' };
  }

  return {
    valid: false,
    normalized: trimmed,
    error:
      'Invalid Mobile Number or CNIC. Enter an 11-digit mobile number (e.g. 03001234567) or 13-digit CNIC (e.g. 3520212345671 or 35202-1234567-1).'
  };
}

export interface DeliveryContactValidationResult {
  valid: boolean;
  normalized: string;
  type?: 'email' | 'whatsapp';
  error?: string;
}

export function validateDeliveryContact(rawInput: string): DeliveryContactValidationResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      normalized: '',
      error: 'Delivery Email or WhatsApp Number is required.'
    };
  }

  // If input contains '@' or letters, treat and validate as an Email address
  if (trimmed.includes('@') || /[a-zA-Z]/.test(trimmed)) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return {
        valid: false,
        normalized: trimmed,
        error: 'Please enter a valid Email address (e.g. name@example.com) or a Pakistani WhatsApp number (e.g. 03001234567).'
      };
    }
    return { valid: true, normalized: trimmed, type: 'email' };
  }

  // Otherwise validate as a Pakistani mobile/WhatsApp number
  const compact = trimmed.replace(/[\s-]/g, '');
  if (/^(03\d{9}|(\+92|92)3\d{9})$/.test(compact)) {
    return { valid: true, normalized: trimmed, type: 'whatsapp' };
  }

  return {
    valid: false,
    normalized: trimmed,
    error: 'Please enter a valid Pakistani WhatsApp number (e.g. 03001234567 or +923001234567) or a valid Email address.'
  };
}
