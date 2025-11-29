/**
 * Database Error Classification System
 * Maps MySQL errors to appropriate HTTP status codes with security-safe messages
 */

const logger = require('./logger');

// MySQL Error Code to HTTP Status Code mapping
const ERROR_CLASSIFICATION = {
  // Connection and Network Errors
  'ECONNREFUSED': {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
    category: 'CONNECTION',
    retryable: true,
    retryDelay: 5000
  },
  'ETIMEDOUT': {
    status: 504,
    code: 'GATEWAY_TIMEOUT',
    message: 'Database timeout',
    category: 'TIMEOUT',
    retryable: true,
    retryDelay: 2000
  },
  'ENOTFOUND': {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Database service unavailable',
    category: 'CONNECTION',
    retryable: true,
    retryDelay: 5000
  },
  'ECONNRESET': {
    status: 503,
    code: 'CONNECTION_RESET',
    message: 'Connection was reset',
    category: 'CONNECTION',
    retryable: true,
    retryDelay: 3000
  },

  // Authentication and Authorization Errors
  'ER_ACCESS_DENIED_ERROR': {
    status: 401,
    code: 'UNAUTHORIZED',
    message: 'Access denied',
    category: 'AUTH',
    retryable: false
  },
  'ER_DBACCESS_DENIED_ERROR': {
    status: 403,
    code: 'FORBIDDEN',
    message: 'Database access forbidden',
    category: 'AUTH',
    retryable: false
  },
  'ER_SECURE_TRANSPORT_REQUIRED': {
    status: 403,
    code: 'SECURE_TRANSPORT_REQUIRED',
    message: 'Secure connection required',
    category: 'AUTH',
    retryable: false
  },

  // Data Integrity and Constraint Errors
  'ER_DUP_ENTRY': {
    status: 409,
    code: 'CONFLICT',
    message: 'Resource already exists',
    category: 'CONSTRAINT',
    retryable: false
  },
  'ER_NO_REFERENCED_ROW_2': {
    status: 400,
    code: 'BAD_REQUEST',
    message: 'Invalid reference',
    category: 'CONSTRAINT',
    retryable: false
  },
  'ER_ROW_IS_REFERENCED_2': {
    status: 409,
    code: 'CONFLICT',
    message: 'Resource is referenced and cannot be deleted',
    category: 'CONSTRAINT',
    retryable: false
  },
  'ER_DATA_TOO_LONG': {
    status: 400,
    code: 'BAD_REQUEST',
    message: 'Data exceeds maximum length',
    category: 'VALIDATION',
    retryable: false
  },
  'ER_BAD_NULL_ERROR': {
    status: 400,
    code: 'BAD_REQUEST',
    message: 'Required field cannot be null',
    category: 'VALIDATION',
    retryable: false
  },

  // Transaction and Lock Errors
  'ER_LOCK_WAIT_TIMEOUT': {
    status: 504,
    code: 'GATEWAY_TIMEOUT',
    message: 'Request timeout due to lock contention',
    category: 'LOCK',
    retryable: true,
    retryDelay: 1000
  },
  'ER_LOCK_DEADLOCK': {
    status: 409,
    code: 'CONFLICT',
    message: 'Request could not be completed due to conflict',
    category: 'LOCK',
    retryable: true,
    retryDelay: 500
  },

  // Connection Pool Errors
  'POOL_ACQUIRETIMEOUT': {
    status: 503,
    code: 'SERVICE_OVERLOADED',
    message: 'Service temporarily overloaded',
    category: 'POOL',
    retryable: true,
    retryDelay: 2000
  },
  'POOL_CLOSED': {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service unavailable',
    category: 'POOL',
    retryable: false
  },

  // SQL Syntax and Schema Errors
  'ER_PARSE_ERROR': {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    category: 'SQL',
    retryable: false
  },
  'ER_NO_SUCH_TABLE': {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    category: 'SCHEMA',
    retryable: false
  },
  'ER_BAD_FIELD_ERROR': {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    category: 'SCHEMA',
    retryable: false
  }
};

// Default classification for unknown errors
const DEFAULT_ERROR_CLASSIFICATION = {
  status: 500,
  code: 'INTERNAL_ERROR',
  message: 'Internal server error',
  category: 'UNKNOWN',
  retryable: false
};

/**
 * Classifies a database error and returns appropriate HTTP status and message
 * @param {Error} error - The database error to classify
 * @param {string} requestId - Request ID for tracking
 * @returns {Object} Classification result with status, message, and metadata
 */
function classifyDatabaseError(error, requestId = null) {
  try {
    // Extract error code from various error formats
    const errorCode = extractErrorCode(error);
    
    // Get classification or use default
    const classification = ERROR_CLASSIFICATION[errorCode] || DEFAULT_ERROR_CLASSIFICATION;
    
    // Create response object
    const result = {
      status: classification.status,
      code: classification.code,
      message: classification.message,
      category: classification.category,
      retryable: classification.retryable || false,
      retryDelay: classification.retryDelay || null,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };

    // Log the classification for monitoring
    logErrorClassification(error, errorCode, classification, requestId);

    return result;
  } catch (classificationError) {
    // Fallback if classification itself fails
    logger.error('Error classification failed', {
      requestId,
      originalError: error.message,
      classificationError: classificationError.message
    });

    return {
      ...DEFAULT_ERROR_CLASSIFICATION,
      requestId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Extracts error code from various error object formats
 * @param {Error} error - The error object
 * @returns {string} The error code
 */
function extractErrorCode(error) {
  // MySQL2 error format
  if (error.code) {
    return error.code;
  }

  // Node.js system error format
  if (error.errno) {
    return error.errno;
  }

  // Connection pool error format
  if (error.message && error.message.includes('Pool is closed')) {
    return 'POOL_CLOSED';
  }

  if (error.message && error.message.includes('Acquire Timeout')) {
    return 'POOL_ACQUIRETIMEOUT';
  }

  // Check error message for known patterns
  const message = error.message || '';
  
  if (message.includes('ECONNREFUSED')) return 'ECONNREFUSED';
  if (message.includes('ETIMEDOUT')) return 'ETIMEDOUT';
  if (message.includes('ENOTFOUND')) return 'ENOTFOUND';
  if (message.includes('ECONNRESET')) return 'ECONNRESET';

  // Return unknown if no code can be extracted
  return 'UNKNOWN';
}

/**
 * Logs error classification for monitoring and debugging
 * @param {Error} originalError - The original error
 * @param {string} errorCode - Extracted error code
 * @param {Object} classification - Applied classification
 * @param {string} requestId - Request ID
 */
function logErrorClassification(originalError, errorCode, classification, requestId) {
  logger.error('Database error classified', {
    requestId,
    errorCode,
    classification: {
      status: classification.status,
      code: classification.code,
      category: classification.category,
      retryable: classification.retryable
    },
    originalError: {
      message: originalError.message,
      stack: originalError.stack,
      errno: originalError.errno,
      code: originalError.code,
      sqlState: originalError.sqlState,
      sqlMessage: originalError.sqlMessage
    }
  });
}

/**
 * Creates a standardized error response object
 * @param {Object} classification - Error classification result
 * @param {string} context - Additional context for the error
 * @returns {Object} Standardized error response
 */
function createErrorResponse(classification, context = null) {
  const response = {
    success: false,
    error: classification.message,
    code: classification.code,
    requestId: classification.requestId,
    timestamp: classification.timestamp
  };

  // Add context if provided and not in production
  if (context && process.env.NODE_ENV !== 'production') {
    response.context = context;
  }

  // Add retry information for retryable errors
  if (classification.retryable) {
    response.retryable = true;
    if (classification.retryDelay) {
      response.retryAfter = Math.ceil(classification.retryDelay / 1000); // Convert to seconds
    }
  }

  return response;
}

/**
 * Checks if an error is retryable based on its classification
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is retryable
 */
function isRetryableError(error) {
  const errorCode = extractErrorCode(error);
  const classification = ERROR_CLASSIFICATION[errorCode];
  return classification ? classification.retryable : false;
}

/**
 * Gets retry delay for a retryable error
 * @param {Error} error - The error to check
 * @returns {number|null} Retry delay in milliseconds, or null if not retryable
 */
function getRetryDelay(error) {
  const errorCode = extractErrorCode(error);
  const classification = ERROR_CLASSIFICATION[errorCode];
  return classification && classification.retryable ? classification.retryDelay || 1000 : null;
}

/**
 * Gets error statistics for monitoring
 * @returns {Object} Error classification statistics
 */
function getErrorStatistics() {
  const stats = {
    categories: {},
    retryableErrors: 0,
    totalMappings: 0
  };

  Object.values(ERROR_CLASSIFICATION).forEach(classification => {
    // Count by category
    stats.categories[classification.category] = (stats.categories[classification.category] || 0) + 1;
    
    // Count retryable errors
    if (classification.retryable) {
      stats.retryableErrors++;
    }
    
    stats.totalMappings++;
  });

  return stats;
}

module.exports = {
  classifyDatabaseError,
  createErrorResponse,
  isRetryableError,
  getRetryDelay,
  getErrorStatistics,
  ERROR_CLASSIFICATION
};