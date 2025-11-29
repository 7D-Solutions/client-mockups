/**
 * Centralized Event Bus for Canonical Events and Notifications
 * Implements HIGH-004 requirements for event-driven architecture
 */

const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Canonical event types for the system
 */
const EVENT_TYPES = {
  // Gauge events
  GAUGE_CREATED: 'gauge.created',
  GAUGE_UPDATED: 'gauge.updated', 
  GAUGE_DELETED: 'gauge.deleted',
  GAUGE_CHECKED_OUT: 'gauge.checked_out',
  GAUGE_RETURNED: 'gauge.returned',
  GAUGE_TRANSFERRED: 'gauge.transferred',
  GAUGE_CALIBRATION_DUE: 'gauge.calibration_due',
  GAUGE_CALIBRATION_COMPLETED: 'gauge.calibration_completed',
  GAUGE_UNSEAL_REQUESTED: 'gauge.unseal_requested',
  GAUGE_UNSEALED: 'gauge.unsealed',
  GAUGE_SEALED: 'gauge.sealed',
  
  // QC events
  QC_VERIFICATION_STARTED: 'qc.verification_started',
  QC_VERIFICATION_COMPLETED: 'qc.verification_completed',
  QC_VERIFICATION_FAILED: 'qc.verification_failed',
  QC_APPROVAL_REQUIRED: 'qc.approval_required',
  QC_APPROVED: 'qc.approved',
  QC_REJECTED: 'qc.rejected',
  
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',
  USER_PASSWORD_RESET: 'user.password_reset',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_PERMISSIONS_UPDATED: 'user.permissions_updated',
  
  // System events
  SYSTEM_BACKUP_COMPLETED: 'system.backup_completed',
  SYSTEM_MAINTENANCE_STARTED: 'system.maintenance_started',
  SYSTEM_MAINTENANCE_COMPLETED: 'system.maintenance_completed',
  SYSTEM_ERROR_OCCURRED: 'system.error_occurred',
  SYSTEM_PERFORMANCE_DEGRADED: 'system.performance_degraded',
  SYSTEM_RECOVERY_INITIATED: 'system.recovery_initiated',
  
  // Security events
  SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
  SECURITY_LOGIN_FAILED: 'security.login_failed',
  SECURITY_PERMISSION_DENIED: 'security.permission_denied',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  SECURITY_DATA_BREACH_DETECTED: 'security.data_breach_detected'
};

/**
 * Event priority levels
 */
const EVENT_PRIORITIES = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Centralized event bus with notification integration
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    
    // Increase max listeners for high-traffic scenarios
    this.setMaxListeners(100);
    
    // Event metadata storage
    this.eventHistory = [];
    this.eventStats = new Map();
    
    // Performance monitoring
    this.metrics = {
      eventsEmitted: 0,
      eventsProcessed: 0,
      averageProcessingTime: 0,
      errors: 0
    };
    
    // Setup error handling
    this.on('error', this.handleEventError.bind(this));
    
    logger.info('EventBus initialized with canonical events support');
  }
  
  /**
   * Emit a canonical event with structured metadata
   */
  emitEvent(eventType, payload, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate event type
      if (!Object.values(EVENT_TYPES).includes(eventType)) {
        logger.warn(`Unknown event type: ${eventType}`);
      }
      
      // Create structured event payload
      const eventData = {
        id: uuidv4(),
        type: eventType,
        timestamp: new Date().toISOString(),
        priority: options.priority || EVENT_PRIORITIES.MEDIUM,
        source: options.source || 'system',
        userId: options.userId || null,
        correlationId: options.correlationId || null,
        payload,
        metadata: {
          version: '1.0',
          environment: process.env.NODE_ENV || 'development',
          service: 'gauge-tracking-api'
        }
      };
      
      // Store in event history (keep last 1000 events)
      this.eventHistory.push(eventData);
      if (this.eventHistory.length > 1000) {
        this.eventHistory.shift();
      }
      
      // Update statistics
      this.updateEventStats(eventType);
      this.metrics.eventsEmitted++;
      
      // Log the event
      const logLevel = this.getLogLevel(eventData.priority);
      logger[logLevel]('CANONICAL_EVENT', {
        eventId: eventData.id,
        eventType,
        priority: eventData.priority,
        userId: eventData.userId,
        duration: Date.now() - startTime
      });
      
      // Emit the event
      this.emit(eventType, eventData);
      this.emit('*', eventData); // Wildcard listener support
      
      return eventData.id;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to emit event:', {
        eventType,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  
  /**
   * Subscribe to specific event types with enhanced error handling
   */
  subscribe(eventType, handler, options = {}) {
    const wrappedHandler = async (eventData) => {
      const startTime = Date.now();
      
      try {
        await handler(eventData);
        
        const processingTime = Date.now() - startTime;
        this.updateProcessingMetrics(processingTime);
        
      } catch (error) {
        logger.error('Event handler failed:', {
          eventType,
          eventId: eventData.id,
          error: error.message,
          handler: handler.name || 'anonymous'
        });
        
        if (!options.continueOnError) {
          throw error;
        }
      }
    };
    
    this.on(eventType, wrappedHandler);
    
    logger.debug('Event subscription added:', {
      eventType,
      handler: handler.name || 'anonymous'
    });
    
    return () => this.off(eventType, wrappedHandler);
  }
  
  /**
   * Subscribe to all events (wildcard listener)
   */
  subscribeToAll(handler, options = {}) {
    return this.subscribe('*', handler, options);
  }
  
  /**
   * Get event statistics
   */
  getStats() {
    return {
      ...this.metrics,
      eventTypes: Array.from(this.eventStats.entries()).map(([type, count]) => ({
        type,
        count
      })),
      recentEvents: this.eventHistory.slice(-10)
    };
  }
  
  /**
   * Get events by type from history
   */
  getEventHistory(eventType, limit = 100) {
    return this.eventHistory
      .filter(event => !eventType || event.type === eventType)
      .slice(-limit)
      .reverse();
  }
  
  /**
   * Clear event history (for testing or memory management)
   */
  clearHistory() {
    this.eventHistory = [];
    this.eventStats.clear();
    this.metrics = {
      eventsEmitted: 0,
      eventsProcessed: 0,
      averageProcessingTime: 0,
      errors: 0
    };
    
    logger.info('Event history cleared');
  }
  
  /**
   * Handle event bus errors
   */
  handleEventError(error) {
    this.metrics.errors++;
    logger.error('EventBus error:', {
      error: error.message,
      stack: error.stack
    });
  }
  
  /**
   * Update event statistics
   */
  updateEventStats(eventType) {
    const current = this.eventStats.get(eventType) || 0;
    this.eventStats.set(eventType, current + 1);
  }
  
  /**
   * Update processing time metrics
   */
  updateProcessingMetrics(processingTime) {
    this.metrics.eventsProcessed++;
    
    const totalTime = (this.metrics.averageProcessingTime * (this.metrics.eventsProcessed - 1)) + processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.eventsProcessed;
  }
  
  /**
   * Get appropriate log level for event priority
   */
  getLogLevel(priority) {
    switch (priority) {
      case EVENT_PRIORITIES.CRITICAL: return 'error';
      case EVENT_PRIORITIES.HIGH: return 'warn';
      case EVENT_PRIORITIES.MEDIUM: return 'info';
      case EVENT_PRIORITIES.LOW: return 'debug';
      default: return 'info';
    }
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Export both the instance and the class for testing
module.exports = {
  eventBus,
  EventBus,
  EVENT_TYPES,
  EVENT_PRIORITIES
};