/**
 * Centralized Pagination Constants
 * 
 * These constants ensure consistent pagination behavior across the frontend.
 * Backend has a matching copy at: backend/src/infrastructure/utils/pagination.js
 */

export const PAGINATION_CONSTANTS = {
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
} as const;

// Type-safe page size options for dropdowns
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;