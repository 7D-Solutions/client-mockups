/**
 * Utility functions for date formatting and transformation
 */

const logger = require('./logger');

/**
 * Format MySQL date/datetime to ISO 8601 format
 * @param {Date|string} date - Date from MySQL
 * @returns {string|null} ISO formatted date string or null
 */
function formatToISO(date) {
  if (!date) return null;
  
  try {
    // If it's already a Date object
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    // If it's a string, parse it
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    
    return parsed.toISOString();
  } catch (error) {
    logger.error('Error formatting date:', error);
    return null;
  }
}

/**
 * Transform object with date fields to ISO format
 * @param {Object} obj - Object with potential date fields
 * @param {Array<string>} dateFields - Array of field names to transform
 * @returns {Object} Object with transformed date fields
 */
function transformDates(obj, dateFields) {
  const transformed = { ...obj };
  
  dateFields.forEach(field => {
    if (transformed[field] !== undefined) {
      transformed[field] = formatToISO(transformed[field]);
    }
  });
  
  return transformed;
}

/**
 * Common date fields in gauge objects that need transformation
 */
const GAUGE_DATE_FIELDS = [
  'calibration_due_date',
  'last_calibration_date',
  'checkout_date',
  'expected_return_date',
  'unsealed_date',
  'first_use_date',
  'created_at',
  'updated_at',
  'assigned_date',
  'return_date',
  'calibration_date',
  'qc_date'
];

module.exports = {
  formatToISO,
  transformDates,
  GAUGE_DATE_FIELDS
};