/**
 * EventBus - Cross-module communication system
 * 
 * Provides a typed, namespaced event system for decoupled communication
 * between modules in the ERP system.
 * 
 * @example
 * // Subscribe to an event
 * const unsubscribe = eventBus.subscribe('auth.logout', (data) => {
 *   console.log('User logged out:', data.userId);
 * });
 * 
 * // Publish an event
 * eventBus.publish('auth.logout', { userId: '123', timestamp: Date.now() });
 * 
 * // Unsubscribe
 * unsubscribe();
 */

// Event handler type
export type EventHandler<T = any> = (data: T) => void;

// Unsubscribe function type
export type Unsubscribe = () => void;

// Event subscription
interface Subscription<T = any> {
  id: string;
  handler: EventHandler<T>;
  once?: boolean;
}

// Event bus options
export interface EventBusOptions {
  enableLogging?: boolean;
  maxListeners?: number;
  strict?: boolean; // If true, only allow publishing to pre-registered events
}

/**
 * EventBus implementation
 */
export class EventBus {
  private events: Map<string, Subscription[]> = new Map();
  private eventTypes: Set<string> = new Set();
  private options: EventBusOptions;
  private listenerCounts: Map<string, number> = new Map();
  private nextId = 1;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      enableLogging: false,
      maxListeners: 100,
      strict: false,
      ...options
    };
  }

  /**
   * Register an event type (for strict mode)
   */
  registerEvent(eventName: string): void {
    this.eventTypes.add(eventName);
  }

  /**
   * Register multiple event types
   */
  registerEvents(eventNames: string[]): void {
    eventNames.forEach(name => this.eventTypes.add(name));
  }

  /**
   * Subscribe to an event
   */
  subscribe<T = any>(eventName: string, handler: EventHandler<T>): Unsubscribe {
    // Validate event name
    if (this.options.strict && !this.eventTypes.has(eventName)) {
      throw new Error(`Event "${eventName}" is not registered. Register it first with registerEvent().`);
    }

    // Check listener limit
    const currentCount = this.listenerCounts.get(eventName) || 0;
    if (currentCount >= (this.options.maxListeners || 100)) {
      console.warn(`Maximum listeners (${this.options.maxListeners}) exceeded for event "${eventName}"`);
    }

    // Create subscription
    const subscription: Subscription<T> = {
      id: `sub_${this.nextId++}`,
      handler
    };

    // Add to subscriptions
    const subscriptions = this.events.get(eventName) || [];
    subscriptions.push(subscription);
    this.events.set(eventName, subscriptions);
    this.listenerCounts.set(eventName, currentCount + 1);

    if (this.options.enableLogging) {
      console.log(`[EventBus] Subscribed to "${eventName}" (${subscriptions.length} listeners)`);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(eventName, subscription.id);
    };
  }

  /**
   * Subscribe to an event that will only fire once
   */
  once<T = any>(eventName: string, handler: EventHandler<T>): Unsubscribe {
    const wrappedHandler: EventHandler<T> = (data) => {
      handler(data);
      this.unsubscribe(eventName, subscription.id);
    };

    const subscription: Subscription<T> = {
      id: `sub_${this.nextId++}`,
      handler: wrappedHandler,
      once: true
    };

    const subscriptions = this.events.get(eventName) || [];
    subscriptions.push(subscription);
    this.events.set(eventName, subscriptions);

    const currentCount = this.listenerCounts.get(eventName) || 0;
    this.listenerCounts.set(eventName, currentCount + 1);

    return () => {
      this.unsubscribe(eventName, subscription.id);
    };
  }

  /**
   * Publish an event
   */
  publish<T = any>(eventName: string, data?: T): void {
    // Validate event name
    if (this.options.strict && !this.eventTypes.has(eventName)) {
      throw new Error(`Event "${eventName}" is not registered. Register it first with registerEvent().`);
    }

    const subscriptions = this.events.get(eventName);
    if (!subscriptions || subscriptions.length === 0) {
      if (this.options.enableLogging) {
        console.log(`[EventBus] No listeners for event "${eventName}"`);
      }
      return;
    }

    if (this.options.enableLogging) {
      console.log(`[EventBus] Publishing "${eventName}" to ${subscriptions.length} listeners`, data);
    }

    // Clone array to avoid issues if handlers modify subscriptions
    const handlers = [...subscriptions];
    
    // Call each handler
    handlers.forEach(subscription => {
      try {
        subscription.handler(data);
      } catch (error) {
        console.error(`[EventBus] Error in handler for "${eventName}":`, error);
      }
    });
  }

  /**
   * Alias for publish
   */
  emit<T = any>(eventName: string, data?: T): void {
    this.publish(eventName, data);
  }

  /**
   * Unsubscribe from an event
   */
  private unsubscribe(eventName: string, subscriptionId: string): void {
    const subscriptions = this.events.get(eventName);
    if (!subscriptions) return;

    const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
    if (index !== -1) {
      subscriptions.splice(index, 1);
      
      const currentCount = this.listenerCounts.get(eventName) || 0;
      this.listenerCounts.set(eventName, Math.max(0, currentCount - 1));

      if (subscriptions.length === 0) {
        this.events.delete(eventName);
        this.listenerCounts.delete(eventName);
      }

      if (this.options.enableLogging) {
        console.log(`[EventBus] Unsubscribed from "${eventName}" (${subscriptions.length} listeners remaining)`);
      }
    }
  }

  /**
   * Remove all listeners for a specific event
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.events.delete(eventName);
      this.listenerCounts.delete(eventName);
      if (this.options.enableLogging) {
        console.log(`[EventBus] Removed all listeners for "${eventName}"`);
      }
    } else {
      this.events.clear();
      this.listenerCounts.clear();
      if (this.options.enableLogging) {
        console.log('[EventBus] Removed all listeners');
      }
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(eventName: string): number {
    return this.listenerCounts.get(eventName) || 0;
  }

  /**
   * Get all registered event names
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Check if an event has listeners
   */
  hasListeners(eventName: string): boolean {
    return this.listenerCount(eventName) > 0;
  }

  /**
   * Enable or disable logging
   */
  setLogging(enabled: boolean): void {
    this.options.enableLogging = enabled;
  }
}

// Create default instance
export const eventBus = new EventBus();

// Convenience functions using default instance
export const subscribe = eventBus.subscribe.bind(eventBus);
export const publish = eventBus.publish.bind(eventBus);
export const once = eventBus.once.bind(eventBus);
export const removeAllListeners = eventBus.removeAllListeners.bind(eventBus);