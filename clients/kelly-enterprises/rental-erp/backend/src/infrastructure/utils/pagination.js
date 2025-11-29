/**
 * Centralized Pagination Utilities for Backend
 * 
 * Provides consistent pagination handling across all modules.
 * These constants match the frontend constants for consistency.
 */

// Pagination constants (must match frontend/src/infrastructure/constants/pagination.ts)
const PAGINATION_CONSTANTS = {
  // Page size configuration
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000, // Increased to support dashboard queries that need all gauges
  MIN_PAGE_SIZE: 10,
  
  // Module-specific defaults (can override DEFAULT_PAGE_SIZE)
  MODULE_DEFAULTS: {
    USER_MANAGEMENT: 50,
    GAUGE_INVENTORY: 50,  // Updated from 100 to 50 per user request
    AUDIT_LOGS: 50,
    REPORTS: 25,
  },
  
  // Page configuration
  DEFAULT_PAGE: 1,
  
  // Search configuration
  MIN_SEARCH_LENGTH: 2, // Minimum characters before search is triggered
  SEARCH_DEBOUNCE_MS: 300, // Debounce time for search input
};

/**
 * Parse and validate pagination parameters from request
 * @param {Object} query - Express request query object
 * @param {string} moduleName - Module name to get specific defaults
 * @returns {Object} Validated pagination parameters
 */
function parsePaginationParams(query, moduleName = null) {
  // Get module-specific default or fall back to global default
  const defaultLimit = moduleName && PAGINATION_CONSTANTS.MODULE_DEFAULTS[moduleName]
    ? PAGINATION_CONSTANTS.MODULE_DEFAULTS[moduleName]
    : PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE;

  // Parse page and limit
  const page = parseInt(query.page) || PAGINATION_CONSTANTS.DEFAULT_PAGE;
  const limit = parseInt(query.limit) || defaultLimit;
  
  // Validate page
  const validPage = Math.max(1, page);
  
  // Validate limit
  const validLimit = Math.min(
    PAGINATION_CONSTANTS.MAX_PAGE_SIZE,
    Math.max(PAGINATION_CONSTANTS.MIN_PAGE_SIZE, limit)
  );
  
  // Calculate offset
  const offset = (validPage - 1) * validLimit;
  
  // Parse search parameter
  const search = query.search ? String(query.search).trim() : '';
  
  return {
    page: validPage,
    limit: validLimit,
    offset,
    search: search.length >= PAGINATION_CONSTANTS.MIN_SEARCH_LENGTH ? search : ''
  };
}

/**
 * Build standardized pagination response
 * @param {Array} data - Array of data items
 * @param {number} total - Total count of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Standardized pagination response
 */
function buildPaginationResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data: data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

/**
 * Add pagination to SQL query
 * @param {string} baseQuery - Base SQL query
 * @param {number} limit - Items per page
 * @param {number} offset - Offset for pagination
 * @returns {string} Query with pagination
 */
function addPaginationToQuery(baseQuery, limit, offset) {
  return `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
}

/**
 * Build count query from base query
 * Extracts SELECT and converts to COUNT(*)
 * @param {string} baseQuery - Base SQL query
 * @returns {string} Count query
 */
function buildCountQuery(baseQuery) {
  // Remove ORDER BY clause if present (not needed for count)
  const queryWithoutOrder = baseQuery.replace(/ORDER BY .+$/i, '');
  
  // Replace SELECT ... FROM with SELECT COUNT(*) FROM
  // This regex handles multi-line SELECT statements
  return queryWithoutOrder.replace(
    /SELECT[\s\S]+?FROM/i,
    'SELECT COUNT(*) as total FROM'
  );
}

/**
 * Validation middleware for pagination parameters
 * Can be used as Express middleware
 */
function validatePaginationMiddleware(req, res, next) {
  const { page, limit } = req.query;
  
  // Validate page if provided
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid page number. Must be a positive integer.'
      });
    }
  }
  
  // Validate limit if provided
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || 
        limitNum < PAGINATION_CONSTANTS.MIN_PAGE_SIZE || 
        limitNum > PAGINATION_CONSTANTS.MAX_PAGE_SIZE) {
      return res.status(400).json({
        success: false,
        error: `Invalid limit. Must be between ${PAGINATION_CONSTANTS.MIN_PAGE_SIZE} and ${PAGINATION_CONSTANTS.MAX_PAGE_SIZE}.`
      });
    }
  }
  
  next();
}

module.exports = {
  parsePaginationParams,
  buildPaginationResponse,
  addPaginationToQuery,
  buildCountQuery,
  validatePaginationMiddleware,
  PAGINATION_CONSTANTS
};