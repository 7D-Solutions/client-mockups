/**
 * Thread Size Normalizer Utility
 *
 * Converts various thread size input formats to the standardized decimal format
 * used in the database (.500-13, 1.250-7, etc.)
 */

/**
 * Fraction to decimal conversion map
 */
const FRACTION_TO_DECIMAL = {
  // Common fractions under 1 inch (no leading zero to match database format)
  '1/16': '.062',
  '1/8': '.125',
  '3/16': '.187',
  '1/4': '.250',
  '5/16': '.312',
  '3/8': '.375',
  '7/16': '.437',
  '1/2': '.500',
  '9/16': '.562',
  '5/8': '.625',
  '11/16': '.687',
  '3/4': '.750',
  '13/16': '.812',
  '7/8': '.875',
  '15/16': '.937',

  // Whole inches (1" and above)
  '1': '1.000',
  '1-1/16': '1.062',
  '1-1/8': '1.125',
  '1-3/16': '1.187',
  '1-1/4': '1.250',
  '1-5/16': '1.312',
  '1-3/8': '1.375',
  '1-7/16': '1.437',
  '1-1/2': '1.500',
  '1-9/16': '1.562',
  '1-5/8': '1.625',
  '1-11/16': '1.687',
  '1-3/4': '1.750',
  '1-13/16': '1.812',
  '1-7/8': '1.875',
  '1-15/16': '1.937',
  '2': '2.000'
};

/**
 * Normalize thread size input to database decimal format
 *
 * @param {string} input - User input (e.g., "1/2", ".5", "0.5", ".500", "1-1/4")
 * @returns {string|null} - Normalized decimal format (e.g., ".500", "1.250") or null if invalid
 *
 * @example
 * normalizeThreadSize('1/2')      // Returns '.500'
 * normalizeThreadSize('.5')       // Returns '.500'
 * normalizeThreadSize('0.5')      // Returns '.500'
 * normalizeThreadSize('.500')     // Returns '.500'
 * normalizeThreadSize('1-1/4')    // Returns '1.250'
 * normalizeThreadSize('1.25')     // Returns '1.250'
 */
function normalizeThreadSize(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  // Check if it's a fraction format
  if (FRACTION_TO_DECIMAL[trimmed]) {
    return FRACTION_TO_DECIMAL[trimmed];
  }

  // Handle decimal formats
  // Remove leading zero if present: "0.5" → ".5"
  let normalized = trimmed.replace(/^0\./, '.');

  // If it starts with a dot and has 1-2 decimal places, pad to 3
  if (/^\./.test(normalized)) {
    const parts = normalized.split('.');
    if (parts[1]) {
      // Pad to 3 decimal places
      normalized = '.' + parts[1].padEnd(3, '0');
    }
  }
  // If it's a whole number or number >= 1 with decimals
  else if (/^[0-9]/.test(normalized)) {
    const num = parseFloat(normalized);
    if (!isNaN(num)) {
      normalized = num.toFixed(3);
    }
  }

  // Validate the result matches expected format
  if (/^[0-9]*\.[0-9]{3}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

/**
 * Check if a search term could be a thread size
 *
 * @param {string} searchTerm - User search input
 * @returns {boolean} - True if it looks like a thread size
 */
function isThreadSizeSearch(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return false;
  }

  const trimmed = searchTerm.trim();

  // Fraction format
  if (/^\d+\/\d+$/.test(trimmed) || /^\d+-\d+\/\d+$/.test(trimmed)) {
    return true;
  }

  // Decimal format
  if (/^[0-9]*\.[0-9]+$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Build SQL WHERE clause for thread size search with multiple format support
 *
 * @param {string} searchTerm - User search input
 * @returns {Object} - { clause: string, params: array, hasMatch: boolean }
 *
 * @example
 * buildThreadSizeSearchClause('1/2')
 * // Returns: { clause: 'ts.thread_size LIKE ?', params: ['.500%'], hasMatch: true }
 */
function buildThreadSizeSearchClause(searchTerm) {
  const normalized = normalizeThreadSize(searchTerm);

  if (!normalized) {
    return { clause: '', params: [], hasMatch: false };
  }

  // Search for thread sizes that start with this normalized value
  // This allows matching ".500-13", ".500-20", etc. when searching for "1/2"
  return {
    clause: 'ts.thread_size LIKE ?',
    params: [`${normalized}%`],
    hasMatch: true
  };
}

module.exports = {
  normalizeThreadSize,
  isThreadSizeSearch,
  buildThreadSizeSearchClause,
  FRACTION_TO_DECIMAL
};
