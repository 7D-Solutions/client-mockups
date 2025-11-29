/**
 * Common event types and constants for the ERP system
 * 
 * Events follow a namespaced pattern: module.action.detail
 * This allows for easy filtering and organization of events.
 */

// Event payload types
export interface AuthEventData {
  userId?: string;
  email?: string;
  timestamp: number;
  reason?: string;
}

export interface DataEventData {
  endpoint?: string;
  method?: string;
  status?: number;
  error?: any;
  duration?: number;
  timestamp: number;
}

export interface CacheEventData {
  key?: string;
  pattern?: string;
  size?: number;
  ttl?: number;
  count?: number;
  cleaned?: number;
  reason?: string;
  timestamp: number;
}

export interface NavigationEventData {
  from?: string;
  to: string;
  params?: Record<string, any>;
  timestamp: number;
}

export interface UserEventData {
  userId: string;
  action: string;
  details?: any;
  timestamp: number;
}

export interface SystemEventData {
  type: string;
  message: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  timestamp: number;
}

// Auth Events
export const AUTH_EVENTS = {
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  TOKEN_EXPIRED: 'auth.token.expired',
  TOKEN_REFRESHED: 'auth.token.refreshed',
  PERMISSION_DENIED: 'auth.permission.denied',
  SESSION_TIMEOUT: 'auth.session.timeout',
} as const;

// Data/API Events
export const DATA_EVENTS = {
  REQUEST_START: 'data.request.start',
  REQUEST_SUCCESS: 'data.request.success',
  REQUEST_FAILURE: 'data.request.failure',
  REQUEST_RETRY: 'data.request.retry',
  CACHE_HIT: 'data.cache.hit',
  CACHE_MISS: 'data.cache.miss',
  CACHE_INVALIDATE: 'data.cache.invalidate',
} as const;

// Cache Management Events
export const CACHE_EVENTS = {
  HIT: 'cache.hit',
  MISS: 'cache.miss',
  SET: 'cache.set',
  DELETE: 'cache.delete',
  EVICT: 'cache.evict',
  CLEAR: 'cache.clear',
  INVALIDATE: 'cache.invalidate',
  CLEANUP: 'cache.cleanup',
  STATS_UPDATE: 'cache.stats.update',
} as const;

// Navigation Events
export const NAVIGATION_EVENTS = {
  ROUTE_CHANGE: 'navigation.route.change',
  ROUTE_ERROR: 'navigation.route.error',
  TAB_CHANGE: 'navigation.tab.change',
  BREADCRUMB_CLICK: 'navigation.breadcrumb.click',
} as const;

// User Action Events
export const USER_EVENTS = {
  ACTION_START: 'user.action.start',
  ACTION_SUCCESS: 'user.action.success',
  ACTION_FAILURE: 'user.action.failure',
  PREFERENCE_CHANGE: 'user.preference.change',
} as const;

// System Events
export const SYSTEM_EVENTS = {
  ERROR: 'system.error',
  WARNING: 'system.warning',
  INFO: 'system.info',
  HEALTH_CHECK: 'system.health.check',
  MAINTENANCE_MODE: 'system.maintenance.mode',
} as const;

// Module-specific Events (examples for gauge module)
export const GAUGE_EVENTS = {
  CHECKOUT: 'gauge.checkout',
  RETURN: 'gauge.return',
  TRANSFER_INITIATED: 'gauge.transfer.initiated',
  TRANSFER_COMPLETED: 'gauge.transfer.completed',
  STATUS_CHANGE: 'gauge.status.change',
  QC_REQUIRED: 'gauge.qc.required',
  QC_COMPLETED: 'gauge.qc.completed',
} as const;

// Notification Events
export const NOTIFICATION_EVENTS = {
  SHOW: 'notification.show',
  DISMISS: 'notification.dismiss',
  ACTION_CLICK: 'notification.action.click',
} as const;

// Combine all events for easy registration
export const ALL_EVENTS = {
  ...AUTH_EVENTS,
  ...DATA_EVENTS,
  ...CACHE_EVENTS,
  ...NAVIGATION_EVENTS,
  ...USER_EVENTS,
  ...SYSTEM_EVENTS,
  ...GAUGE_EVENTS,
  ...NOTIFICATION_EVENTS,
} as const;

// Type for all event names
export type EventName = typeof ALL_EVENTS[keyof typeof ALL_EVENTS];

// Helper to create typed event data
export function createEventData<T extends Record<string, any>>(
  data: T & { timestamp?: number }
): T & { timestamp: number } {
  return {
    ...data,
    timestamp: data.timestamp || Date.now(),
  };
}

// Helper to check if an event is of a certain namespace
export function isEventType(eventName: string, namespace: string): boolean {
  return eventName.startsWith(namespace + '.');
}

// Event filters for subscribing to multiple events
export function createEventFilter(pattern: string | RegExp): (eventName: string) => boolean {
  if (typeof pattern === 'string') {
    // Support wildcards: auth.* matches all auth events
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return (eventName: string) => regex.test(eventName);
  }
  return (eventName: string) => pattern.test(eventName);
}

// Usage example comment:
/**
 * @example
 * import { eventBus, AUTH_EVENTS, createEventData } from '@fireproof/erp-core/data';
 * 
 * // Subscribe to specific event
 * eventBus.subscribe(AUTH_EVENTS.LOGIN_SUCCESS, (data) => {
 *   console.log('User logged in:', data.userId);
 * });
 * 
 * // Subscribe to all auth events
 * const authEvents = Object.values(AUTH_EVENTS);
 * authEvents.forEach(event => {
 *   eventBus.subscribe(event, (data) => {
 *     console.log(`Auth event ${event}:`, data);
 *   });
 * });
 * 
 * // Publish an event
 * eventBus.publish(AUTH_EVENTS.LOGIN_SUCCESS, createEventData({
 *   userId: '123',
 *   email: 'user@example.com'
 * }));
 */