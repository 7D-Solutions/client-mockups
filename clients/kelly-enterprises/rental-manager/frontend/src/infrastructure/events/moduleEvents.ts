// Cross-module communication events and patterns
import { eventBus, EVENTS } from './index';
import type { User } from '../../modules/user/types';

// Event data types
interface EventHistoryItem {
  event: string;
  data: unknown;
  timestamp: number;
}

interface GaugeChangeData {
  [key: string]: unknown;
}

interface CheckoutDetails {
  location?: string;
  notes?: string;
  expectedReturnDate?: string;
}

interface ModalData {
  [key: string]: unknown;
}

// Module-specific event handlers and utilities
export class ModuleEventManager {
  private static instance: ModuleEventManager;
  private eventHistory: Array<EventHistoryItem> = [];

  static getInstance(): ModuleEventManager {
    if (!ModuleEventManager.instance) {
      ModuleEventManager.instance = new ModuleEventManager();
    }
    return ModuleEventManager.instance;
  }

  // Gauge module events
  emitGaugeUpdated(gaugeId: string, changes: GaugeChangeData) {
    const data = { gaugeId, changes, timestamp: Date.now() };
    this.logEvent(EVENTS.GAUGE_UPDATED, data);
    eventBus.emit(EVENTS.GAUGE_UPDATED, data);
  }

  emitGaugeCheckedOut(gaugeId: string, userId: string, details: CheckoutDetails) {
    const data = { gaugeId, userId, details, timestamp: Date.now() };
    this.logEvent(EVENTS.GAUGE_CHECKED_OUT, data);
    eventBus.emit(EVENTS.GAUGE_CHECKED_OUT, data);
  }

  emitGaugeReturned(gaugeId: string, userId: string, condition: string) {
    const data = { gaugeId, userId, condition, timestamp: Date.now() };
    this.logEvent(EVENTS.GAUGE_RETURNED, data);
    eventBus.emit(EVENTS.GAUGE_RETURNED, data);
  }

  emitGaugeTransferred(gaugeId: string, fromUserId: string, toUserId: string) {
    const data = { gaugeId, fromUserId, toUserId, timestamp: Date.now() };
    this.logEvent(EVENTS.GAUGE_TRANSFERRED, data);
    eventBus.emit(EVENTS.GAUGE_TRANSFERRED, data);
  }

  // User/Admin module events
  emitUserLoggedIn(userId: string, userInfo: Partial<User>) {
    const data = { userId, userInfo, timestamp: Date.now() };
    this.logEvent(EVENTS.USER_LOGGED_IN, data);
    eventBus.emit(EVENTS.USER_LOGGED_IN, data);
  }

  emitUserLoggedOut(userId: string) {
    const data = { userId, timestamp: Date.now() };
    this.logEvent(EVENTS.USER_LOGGED_OUT, data);
    eventBus.emit(EVENTS.USER_LOGGED_OUT, data);
  }

  emitUserPermissionsChanged(userId: string, newPermissions: string[]) {
    const data = { userId, newPermissions, timestamp: Date.now() };
    this.logEvent(EVENTS.USER_PERMISSIONS_CHANGED, data);
    eventBus.emit(EVENTS.USER_PERMISSIONS_CHANGED, data);
  }

  // System notification events
  emitNotification(type: 'info' | 'success' | 'warning' | 'error', title: string, message: string) {
    const data = { type, title, message, timestamp: Date.now() };
    this.logEvent(EVENTS.NOTIFICATION_SHOW, data);
    eventBus.emit(EVENTS.NOTIFICATION_SHOW, data);
  }

  emitModalOpen(modalType: string, data: ModalData) {
    const eventData = { modalType, data, timestamp: Date.now() };
    this.logEvent(EVENTS.MODAL_OPEN, eventData);
    eventBus.emit(EVENTS.MODAL_OPEN, eventData);
  }

  emitModalClose(modalType: string) {
    const data = { modalType, timestamp: Date.now() };
    this.logEvent(EVENTS.MODAL_CLOSE, data);
    eventBus.emit(EVENTS.MODAL_CLOSE, data);
  }

  // Event history and debugging
  private logEvent(event: string, data: unknown) {
    this.eventHistory.push({ event, data, timestamp: Date.now() });
    
    // Keep only last 100 events
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-100);
    }

    // Debug logging disabled for production
  }

  getEventHistory(): Array<EventHistoryItem> {
    return [...this.eventHistory];
  }

  clearEventHistory() {
    this.eventHistory = [];
  }

  // Subscribe to multiple events with a single handler
  subscribeToModuleEvents(events: string[], handler: (event: string, data: unknown) => void) {
    const unsubscribers = events.map(event => 
      eventBus.on(event, (data) => handler(event, data))
    );

    // Return function to unsubscribe from all events
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }
}

// Singleton instance for easy access
export const moduleEventManager = ModuleEventManager.getInstance();

// React hook for module event subscriptions
import { useEffect, useCallback } from 'react';

export const useModuleEvents = (
  events: string[], 
  handler: (event: string, data: unknown) => void
) => {
  const memoizedHandler = useCallback(handler, [handler]);

  useEffect(() => {
    const unsubscribe = moduleEventManager.subscribeToModuleEvents(events, memoizedHandler);
    return unsubscribe;
  }, [events, memoizedHandler]);
};

// Predefined event patterns for common cross-module interactions
export const MODULE_PATTERNS = {
  // Gauge to Admin communication
  GAUGE_TO_ADMIN: {
    GAUGE_ACTION_AUDIT: 'gauge:action:audit',
    GAUGE_STATUS_CHANGE: 'gauge:status:change',
    GAUGE_USER_ASSIGNMENT: 'gauge:user:assignment',
  },

  // Admin to Gauge communication
  ADMIN_TO_GAUGE: {
    USER_PERMISSION_UPDATE: 'admin:user:permission_update',
    SYSTEM_MAINTENANCE: 'admin:system:maintenance',
    BULK_OPERATION: 'admin:bulk:operation',
  },

  // System-wide events
  SYSTEM: {
    CACHE_INVALIDATE: 'system:cache:invalidate',
    ERROR_GLOBAL: 'system:error:global',
    PERFORMANCE_MONITOR: 'system:performance:monitor',
  }
} as const;