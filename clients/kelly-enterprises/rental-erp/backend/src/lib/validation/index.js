/**
 * Centralized validation functions for the application
 * Provides a single source of truth for request validation
 */

/**
 * Check if value is a non-empty string
 * @param {unknown} value - Value to check
 * @returns {boolean} True if non-empty string
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a valid ISO date string
 * @param {unknown} value - Value to check
 * @returns {boolean} True if valid ISO date
 */
function isISODate(value) {
  return typeof value === 'string' && !isNaN(Date.parse(value));
}

/**
 * Check if value is a valid email
 * @param {unknown} value - Value to check
 * @returns {boolean} True if valid email format
 */
function isEmail(value) {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if value is a positive integer
 * @param {unknown} value - Value to check
 * @returns {boolean} True if positive integer
 */
function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Check if value is within enum values
 * @param {unknown} value - Value to check
 * @param {string[]} validValues - Array of valid values
 * @returns {boolean} True if value is in valid values
 */
function isEnum(value, validValues) {
  return validValues.includes(value);
}

/**
 * Sanitize string input - trim and prevent XSS
 * @param {string} value - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .replace(/[<>]/g, '') // Basic XSS prevention
    .substring(0, 1000); // Limit length
}

/**
 * Validate pagination parameters
 * @param {object} params - Query parameters
 * @returns {object} Validated and sanitized pagination params
 */
function validatePagination(params) {
  const limit = Math.min(
    Math.max(parseInt(params.limit) || 50, 1),
    100
  );
  
  const offset = Math.max(parseInt(params.offset) || 0, 0);
  
  return { limit, offset };
}

/**
 * Validate sort parameters to prevent SQL injection
 * @param {string} sort - Sort field
 * @param {string[]} allowedFields - Allowed sort fields
 * @returns {string|null} Safe sort field or null
 */
function validateSort(sort, allowedFields) {
  if (!sort || typeof sort !== 'string') return null;
  
  const cleanSort = sort.replace(/[^a-zA-Z0-9_.-]/g, '');
  return allowedFields.includes(cleanSort) ? cleanSort : null;
}

/**
 * Common validation patterns for gauge operations
 */
const gaugeValidation = {
  /**
   * Validate gauge creation input
   * @param {object} data - Gauge data
   * @returns {object} Validation result
   */
  validateCreate(data) {
    const errors = [];
    
    if (!isNonEmptyString(data.name)) {
      errors.push('Name is required and must be non-empty');
    }
    
    if (!isNonEmptyString(data.equipment_type)) {
      errors.push('Equipment type is required');
    } else if (!isEnum(data.equipment_type, ['thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard'])) {
      errors.push('Invalid equipment type');
    }
    
    if (!isNonEmptyString(data.serial_number)) {
      errors.push('Serial number is required');
    }
    
    if (data.calibration_frequency_days !== undefined && !isPositiveInteger(data.calibration_frequency_days)) {
      errors.push('Calibration frequency must be a positive integer');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },
  
  /**
   * Validate gauge checkout input
   * @param {object} data - Checkout data
   * @returns {object} Validation result
   */
  validateCheckout(data) {
    const errors = [];
    
    if (!data.expected_return_date || !isISODate(data.expected_return_date)) {
      errors.push('Valid expected return date is required');
    } else {
      const returnDate = new Date(data.expected_return_date);
      if (returnDate < new Date()) {
        errors.push('Expected return date must be in the future');
      }
    }
    
    if (data.location && !isNonEmptyString(data.location)) {
      errors.push('Location must be non-empty if provided');
    }
    
    if (data.department && !isNonEmptyString(data.department)) {
      errors.push('Department must be non-empty if provided');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

/**
 * Common validation patterns for auth operations
 */
const authValidation = {
  /**
   * Validate login input
   * @param {object} data - Login data
   * @returns {object} Validation result
   */
  validateLogin(data) {
    const errors = [];
    
    if (!data.email || !isEmail(data.email)) {
      errors.push('Valid email is required');
    }
    
    if (!isNonEmptyString(data.password)) {
      errors.push('Password is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

/**
 * Idempotency key validation
 * @param {string} key - Idempotency key
 * @returns {boolean} True if valid
 */
function isValidIdempotencyKey(key) {
  if (!isNonEmptyString(key)) return false;
  // UUID v4 format or similar
  const keyRegex = /^[a-zA-Z0-9-_]{16,128}$/;
  return keyRegex.test(key);
}

/**
 * Require fields to be present and non-empty
 * @param {object} obj - Object to check
 * @param {string[]} fields - Required field names
 * @throws {Error} If any required field is missing
 */
function requireFields(obj, fields) {
  const missing = fields.filter(f => 
    obj[f] === undefined || 
    obj[f] === null || 
    obj[f] === ''
  );
  
  if (missing.length > 0) {
    const error = new Error('validation_failed');
    error.code = 'validation_failed';
    error.missing = missing;
    throw error;
  }
}

module.exports = {
  // Basic validators
  isNonEmptyString,
  isISODate,
  isEmail,
  isPositiveInteger,
  isEnum,
  
  // Sanitizers
  sanitizeString,
  validatePagination,
  validateSort,
  
  // Domain validators
  gaugeValidation,
  authValidation,
  
  // Special validators
  isValidIdempotencyKey,
  requireFields
};