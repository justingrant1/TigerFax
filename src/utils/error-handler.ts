/**
 * Error Handling Utilities
 * Provides centralized error handling and user-friendly error messages
 */

export interface AppError {
  code: string;
  message: string;
  originalError?: Error;
  retryable: boolean;
}

/**
 * Error codes for the application
 */
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NO_CONNECTION = 'NO_CONNECTION',
  
  // API errors
  API_ERROR = 'API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  
  // Validation errors
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  INVALID_DOCUMENT = 'INVALID_DOCUMENT',
  MISSING_RECIPIENT = 'MISSING_RECIPIENT',
  
  // Fax errors
  FAX_SEND_ERROR = 'FAX_SEND_ERROR',
  FAX_TIMEOUT = 'FAX_TIMEOUT',
  FAX_REJECTED = 'FAX_REJECTED',
  
  // System errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Parse error and convert to AppError
 */
export const parseError = (error: any): AppError => {
  // Network errors
  if (error.message?.includes('Network request failed') || error.message?.includes('fetch failed')) {
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: 'Network error. Please check your internet connection and try again.',
      originalError: error,
      retryable: true,
    };
  }

  // Timeout errors
  if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
    return {
      code: ErrorCode.TIMEOUT_ERROR,
      message: 'Request timed out. Please try again.',
      originalError: error,
      retryable: true,
    };
  }

  // API authentication errors
  if (error.status === 401 || error.status === 403) {
    return {
      code: ErrorCode.AUTHENTICATION_ERROR,
      message: 'Authentication failed. Please check your API credentials.',
      originalError: error,
      retryable: false,
    };
  }

  // Rate limiting
  if (error.status === 429) {
    return {
      code: ErrorCode.RATE_LIMIT_ERROR,
      message: 'Too many requests. Please wait a moment and try again.',
      originalError: error,
      retryable: true,
    };
  }

  // General API errors
  if (error.status >= 400 && error.status < 500) {
    return {
      code: ErrorCode.API_ERROR,
      message: error.message || 'An error occurred. Please try again.',
      originalError: error,
      retryable: false,
    };
  }

  // Server errors
  if (error.status >= 500) {
    return {
      code: ErrorCode.API_ERROR,
      message: 'Server error. Please try again later.',
      originalError: error,
      retryable: true,
    };
  }

  // Validation errors
  if (error.message?.includes('Recipient') || error.message?.includes('recipient')) {
    return {
      code: ErrorCode.MISSING_RECIPIENT,
      message: 'Please provide a valid recipient phone number.',
      originalError: error,
      retryable: false,
    };
  }

  // Default unknown error
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: error.message || 'An unexpected error occurred. Please try again.',
    originalError: error,
    retryable: true,
  };
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: any): string => {
  const appError = parseError(error);
  return appError.message;
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  const appError = parseError(error);
  return appError.retryable;
};

/**
 * Log error with context
 */
export const logError = (context: string, error: any, metadata?: any) => {
  const appError = parseError(error);
  
  console.error(`[${context}] Error:`, {
    code: appError.code,
    message: appError.message,
    retryable: appError.retryable,
    metadata,
    originalError: appError.originalError,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Create a formatted error object for display
 */
export const formatErrorForDisplay = (error: any): {
  title: string;
  message: string;
  retryable: boolean;
} => {
  const appError = parseError(error);
  
  let title = 'Error';
  
  switch (appError.code) {
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.NO_CONNECTION:
      title = 'Connection Error';
      break;
    case ErrorCode.AUTHENTICATION_ERROR:
      title = 'Authentication Error';
      break;
    case ErrorCode.RATE_LIMIT_ERROR:
      title = 'Too Many Requests';
      break;
    case ErrorCode.FAX_SEND_ERROR:
      title = 'Fax Send Error';
      break;
    case ErrorCode.PERMISSION_DENIED:
      title = 'Permission Denied';
      break;
    default:
      title = 'Error';
  }
  
  return {
    title,
    message: appError.message,
    retryable: appError.retryable,
  };
};
