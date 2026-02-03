/**
 * Phone Number Validation Utilities
 * Handles phone number formatting, validation, and E.164 conversion
 */

/**
 * Clean phone number by removing all non-digit characters except +
 */
export const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/[^\d+]/g, '');
};

/**
 * Format phone number for display (e.g., +1-555-123-4567)
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = cleanPhoneNumber(phone);

  // If it starts with +1 (North America)
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    return `+1-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }

  // If it starts with 1 (North America without +)
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return `+1-${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // For other formats, just return cleaned
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

/**
 * Convert phone number to E.164 format (required by Sinch API)
 * E.164 format: +[country code][number] (max 15 digits)
 *
 * This function assumes US numbers if no country code is provided
 */
export const toE164 = (phone: string): string => {
  const cleaned = cleanPhoneNumber(phone);

  // Remove leading + for processing
  const digitsOnly = cleaned.replace(/^\+/, '');

  // If it's a 10-digit number (US without country code), add +1
  if (/^\d{10}$/.test(digitsOnly)) {
    return `+1${digitsOnly}`;
  }

  // If it's 11 digits starting with 1 (US with country code but no +)
  if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
    return `+${digitsOnly}`;
  }

  // If already has + and is valid length, return as-is
  if (cleaned.startsWith('+') && digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return cleaned;
  }

  // For other cases, ensure it starts with +
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

/**
 * Validate if phone number is in valid E.164 format
 * Must start with + followed by 10-15 digits
 */
export const isValidE164 = (phone: string): boolean => {
  // E.164: + followed by 10-15 digits, first digit cannot be 0
  const e164Pattern = /^\+[1-9]\d{9,14}$/;
  return e164Pattern.test(phone);
};

/**
 * Check if a phone number has a valid country code structure
 * This is a basic check for common country codes
 */
const hasValidCountryCode = (phone: string): boolean => {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned.startsWith('+')) return false;

  const digitsOnly = cleaned.slice(1);

  // US/Canada: +1 followed by 10 digits
  if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
    return true;
  }

  // UK: +44 followed by 10 digits
  if (digitsOnly.startsWith('44') && digitsOnly.length === 12) {
    return true;
  }

  // Australia: +61 followed by 9 digits
  if (digitsOnly.startsWith('61') && digitsOnly.length === 11) {
    return true;
  }

  // Germany: +49 followed by 10-11 digits
  if (digitsOnly.startsWith('49') && (digitsOnly.length === 12 || digitsOnly.length === 13)) {
    return true;
  }

  // France: +33 followed by 9 digits
  if (digitsOnly.startsWith('33') && digitsOnly.length === 11) {
    return true;
  }

  // India: +91 followed by 10 digits
  if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
    return true;
  }

  // Generic validation: if length is between 10-15 digits total, allow it
  // This covers most international numbers
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return true;
  }

  return false;
};

/**
 * Validate phone number and return error message if invalid
 */
export const validatePhoneNumber = (phone: string): { valid: boolean; error?: string; e164?: string } => {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: 'Phone number is required' };
  }

  const cleaned = cleanPhoneNumber(phone);

  // Get just the digits for length check
  const digitsOnly = cleaned.replace(/^\+/, '');

  if (digitsOnly.length < 10) {
    return { valid: false, error: 'Phone number is too short. Please include the full number with area code.' };
  }

  if (digitsOnly.length > 15) {
    return { valid: false, error: 'Phone number is too long' };
  }

  const e164 = toE164(phone);

  if (!isValidE164(e164)) {
    return { valid: false, error: 'Invalid phone number format. Use format: +1-555-123-4567' };
  }

  // Additional validation for country code structure
  if (!hasValidCountryCode(e164)) {
    return { valid: false, error: 'Please enter a complete phone number with country code (e.g., +1 for US)' };
  }

  return { valid: true, e164 };
};

/**
 * Auto-format phone number as user types
 */
export const autoFormatPhoneInput = (input: string, previousValue: string): string => {
  const cleaned = cleanPhoneNumber(input);
  
  // Handle deletion
  if (input.length < previousValue.length) {
    return input;
  }
  
  // Auto-add + at start
  if (cleaned.length > 0 && !cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  
  // Format US numbers as they type
  if (cleaned.startsWith('+1')) {
    const digits = cleaned.slice(2);
    if (digits.length <= 3) {
      return `+1-${digits}`;
    } else if (digits.length <= 6) {
      return `+1-${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else if (digits.length <= 10) {
      return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  }
  
  return cleaned;
};
