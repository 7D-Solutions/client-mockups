/**
 * Seal Status Converter Utility
 * Converts between boolean is_sealed database column and enum seal_status code expectations
 * 
 * Database: is_sealed TINYINT(1) - 0 or 1
 * Code expects: seal_status ENUM('sealed', 'unsealed', 'n/a')
 */

/**
 * Convert enum seal status to boolean
 * @param {string} sealStatus - 'sealed', 'unsealed', or 'n/a'
 * @returns {number} 1 for sealed, 0 for unsealed/n/a
 */
const isSealedFromStatus = (sealStatus) => {
  return sealStatus === 'sealed' ? 1 : 0;
};

/**
 * Convert boolean to seal status enum
 * @param {number|boolean} isSealed - 0/1 or false/true
 * @returns {string} 'sealed' or 'unsealed'
 */
const statusFromIsSealed = (isSealed) => {
  // Handle various truthy/falsy values
  return isSealed ? 'sealed' : 'unsealed';
};

/**
 * Check if gauge is sealed from boolean
 * @param {number|boolean} isSealed - 0/1 or false/true
 * @returns {boolean} true if sealed
 */
const checkIsSealed = (isSealed) => {
  return !!isSealed;
};

module.exports = {
  isSealedFromStatus,
  statusFromIsSealed,
  checkIsSealed
};