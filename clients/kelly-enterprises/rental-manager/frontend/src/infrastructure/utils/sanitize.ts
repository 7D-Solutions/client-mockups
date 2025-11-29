/**
 * Utility functions for sanitizing user input to prevent XSS attacks
 */

/**
 * Sanitizes a string to prevent XSS attacks while preserving legitimate content
 * Only escapes the most dangerous characters that can execute scripts
 */
export const sanitizeString = (input: string | null | undefined): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    // Only escape the most dangerous characters for XSS
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Don't touch apostrophes, slashes, or international characters
    .trim();
};

/**
 * Sanitizes an email address
 */
export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  // Basic email validation and sanitization
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleaned = sanitizeString(email);
  
  return emailRegex.test(cleaned) ? cleaned : '';
};

/**
 * Sanitizes a display name (firstName, lastName, etc.)
 * Preserves international characters, apostrophes, and hyphens
 */
export const sanitizeName = (name: string | null | undefined): string => {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  // Only remove truly dangerous characters, preserve international names
  // This allows: José, François, O'Brien, Mary-Jane, etc.
  return sanitizeString(name)
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .replace(/[^\p{L}\p{M}\s\-'.]/gu, '') // Keep Unicode letters, marks, spaces, hyphens, apostrophes, periods
    .trim();
};

/**
 * Sanitizes a phone number
 */
export const sanitizePhone = (phone: string | null | undefined): string => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  
  // Allow numbers, spaces, hyphens, parentheses, plus sign
  return sanitizeString(phone).replace(/[^0-9\s\-()+ ext.]/g, '').trim();
};

/**
 * Sanitizes a department name
 * Allows international characters and common business punctuation
 */
export const sanitizeDepartment = (department: string | null | undefined): string => {
  if (!department || typeof department !== 'string') {
    return '';
  }
  
  // Allow letters, numbers, spaces, and common punctuation including international characters
  return sanitizeString(department)
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .replace(/[^\p{L}\p{M}\p{N}\s\-&,.()]/gu, '') // Keep Unicode letters, marks, numbers, spaces, common punctuation
    .trim();
};

/**
 * Sanitizes a role name
 */
export const sanitizeRole = (role: string | null | undefined): string => {
  if (!role || typeof role !== 'string') {
    return '';
  }
  
  // Allow letters, numbers, spaces, underscores, and hyphens
  return sanitizeString(role).replace(/[^a-zA-Z0-9\s_-]/g, '').trim();
};