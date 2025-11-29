// EventBus for cross-module communication
import { logger } from '../utils/logger';

type EventHandler<T = unknown> = (data: T) => void;

export class EventBus {
  private events = new Map<string, Set<EventHandler>>();

  emit<T = unknown>(event: string, data?: T): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error(`[EventBus] Error in handler for event ${event}:`, error);
        }
      });
    }
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    this.events.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  // Clear all handlers for an event
  clear(event: string): void {
    this.events.delete(event);
  }

  // Get all registered events (for debugging)
  getEvents(): string[] {
    return Array.from(this.events.keys());
  }
}

// Singleton instance for global use
export const eventBus = new EventBus();

// Hook for React components
import { useEffect, useRef } from 'react';

export const useEventBus = <T = unknown>(event: string, handler: EventHandler<T>) => {
  const handlerRef = useRef(handler);
  
  // Update ref on each render to get latest handler
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    // Wrapper that calls the current handler from ref
    const stableHandler = (data: T) => {
      handlerRef.current(data);
    };

    const unsubscribe = eventBus.on(event, stableHandler);
    return unsubscribe;
  }, [event]); // Only re-subscribe if event name changes
};

// Common event types for type safety
export const EVENTS = {
  // Gauge events
  GAUGE_UPDATED: 'gauge:updated',
  GAUGE_CHECKED_OUT: 'gauge:checked_out',
  GAUGE_RETURNED: 'gauge:returned',
  GAUGE_TRANSFERRED: 'gauge:transferred',
  
  // User events
  USER_LOGGED_IN: 'user:logged_in',
  USER_LOGGED_OUT: 'user:logged_out',
  USER_PERMISSIONS_CHANGED: 'user:permissions_changed',
  SHOW_PASSWORD_MODAL: 'modal:show_password',
  
  // System events
  NOTIFICATION_SHOW: 'notification:show',
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',
} as const;

// Export module event management
export * from './moduleEvents';