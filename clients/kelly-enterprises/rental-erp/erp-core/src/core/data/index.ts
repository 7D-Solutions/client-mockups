/**
 * Data module exports
 * 
 * This module provides data access utilities including:
 * - API client with authentication and retry logic
 * - EventBus for cross-module communication
 * - CacheManager for advanced caching with TTL and LRU eviction
 * - Event constants and types
 * - Configuration options for customizing components
 */

// API Client
export { 
  apiClient as default, 
  apiClient, 
  createApiClient 
} from './apiClient.js';

export type { ApiClientConfig } from './apiClient.js';

// EventBus
export { 
  EventBus, 
  eventBus, 
  subscribe, 
  publish, 
  once, 
  removeAllListeners 
} from './EventBus.js';

export type { 
  EventHandler, 
  Unsubscribe, 
  EventBusOptions 
} from './EventBus.js';

// CacheManager
export { 
  CacheManager, 
  cacheManager, 
  get as cacheGet,
  set as cacheSet,
  has as cacheHas,
  del as cacheDel,
  clear as cacheClear,
  invalidate as cacheInvalidate,
  getStats as getCacheStats,
  cleanup as cacheCleanup
} from './CacheManager.js';

export type { 
  CacheStats, 
  CacheStrategy, 
  CacheManagerOptions 
} from './CacheManager.js';

// Event constants and types
export * from './events.js';