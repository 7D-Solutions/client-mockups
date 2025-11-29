/**
 * Data Sanitization Utility
 * Removes sensitive information from API responses
 */

/**
 * Remove sensitive fields from gauge data
 * @param {Object|Array} data - Gauge data to sanitize
 * @returns {Object|Array} Sanitized data
 */
function sanitizeGaugeData(data) {
  if (!data) return data;

  const sensitiveFields = [
    'id',                    // Internal database ID
    'created_at',            // Internal timestamps
    'updated_at',            // Internal timestamps
    'serial_number',         // May contain sensitive identifiers
    'checked_out_to',        // May contain sensitive user info
    'unsealed_date',         // Detailed operational info
    'first_use_date',        // Detailed operational info
    'checkout_date'          // Detailed operational info
  ];

  if (Array.isArray(data)) {
    return data.map(item => sanitizeSingleGauge(item, sensitiveFields));
  } else {
    return sanitizeSingleGauge(data, sensitiveFields);
  }
}

function sanitizeSingleGauge(gauge, sensitiveFields) {
  if (!gauge || typeof gauge !== 'object') return gauge;

  const sanitized = { ...gauge };
  
  // Remove sensitive fields
  sensitiveFields.forEach(field => {
    delete sanitized[field];
  });

  // Sanitize location information (keep general area, remove specific details)
  if (sanitized.location) {
    sanitized.location = sanitized.location.replace(/\b\d+\b/g, 'XXX'); // Remove numbers
  }

  return sanitized;
}

/**
 * Remove sensitive fields from user data
 * @param {Object|Array} data - User data to sanitize
 * @returns {Object|Array} Sanitized data
 */
function sanitizeUserData(data) {
  if (!data) return data;

  const sensitiveFields = [
    'password',
    'password_hash',
    'session_token',
    'created_at',
    'updated_at',
    'last_login',
    'login_attempts'
  ];

  if (Array.isArray(data)) {
    return data.map(item => sanitizeSingleUser(item, sensitiveFields));
  } else {
    return sanitizeSingleUser(data, sensitiveFields);
  }
}

function sanitizeSingleUser(user, sensitiveFields) {
  if (!user || typeof user !== 'object') return user;

  const sanitized = { ...user };
  
  // Remove sensitive fields
  sensitiveFields.forEach(field => {
    delete sanitized[field];
  });

  return sanitized;
}

/**
 * Generic data sanitizer for any object
 * @param {Object|Array} data - Data to sanitize
 * @param {Array} sensitiveFields - Fields to remove
 * @returns {Object|Array} Sanitized data
 */
function sanitizeGenericData(data, sensitiveFields = []) {
  if (!data) return data;

  const defaultSensitiveFields = [
    'password',
    'password_hash',
    'secret',
    'token',
    'key',
    'credentials'
  ];

  const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];

  if (Array.isArray(data)) {
    return data.map(item => sanitizeSingleObject(item, allSensitiveFields));
  } else {
    return sanitizeSingleObject(data, allSensitiveFields);
  }
}

function sanitizeSingleObject(obj, sensitiveFields) {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = { ...obj };
  
  // Remove sensitive fields
  sensitiveFields.forEach(field => {
    delete sanitized[field];
  });

  return sanitized;
}

module.exports = {
  sanitizeGaugeData,
  sanitizeUserData,
  sanitizeGenericData
};