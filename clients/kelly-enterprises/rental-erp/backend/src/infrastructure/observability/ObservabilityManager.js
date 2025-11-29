/**
 * Comprehensive Observability Manager
 * Provides structured logging, metrics, tracing, and monitoring
 * HIGH-005 Implementation
 */

const logger = require('../utils/logger');
const { eventBus, EVENT_TYPES } = require('../events/EventBus');
const { notificationService, CHANNELS, TEMPLATE_TYPES } = require('../notifications/NotificationService');
const { performanceMonitor } = require('../utils/performanceMonitor');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

/**
 * Observability levels
 */
const OBSERVABILITY_LEVELS = {
  MINIMAL: 'minimal',       // Basic logging and metrics
  STANDARD: 'standard',     // Standard observability with structured logs
  COMPREHENSIVE: 'comprehensive', // Full observability with tracing
  DEBUG: 'debug'           // Maximum observability for debugging
};

/**
 * Custom business metrics collector
 */
class BusinessMetrics {
  constructor() {
    this.metrics = new Map();
    this.counters = new Map();
    this.timers = new Map();
    this.gauges = new Map();
  }

  /**
   * Increment counter metric
   */
  incrementCounter(name, value = 1, tags = {}) {
    const key = this.getMetricKey(name, tags);
    const current = this.counters.get(key) || { value: 0, tags, lastUpdate: new Date() };
    current.value += value;
    current.lastUpdate = new Date();
    this.counters.set(key, current);
  }

  /**
   * Record timer metric (duration in ms)
   */
  recordTimer(name, duration, tags = {}) {
    const key = this.getMetricKey(name, tags);
    const timers = this.timers.get(key) || { values: [], tags, lastUpdate: new Date() };
    timers.values.push({ value: duration, timestamp: new Date() });
    
    // Keep only last 100 values per timer
    if (timers.values.length > 100) {
      timers.values = timers.values.slice(-100);
    }
    
    timers.lastUpdate = new Date();
    this.timers.set(key, timers);
  }

  /**
   * Set gauge metric (current value)
   */
  setGauge(name, value, tags = {}) {
    const key = this.getMetricKey(name, tags);
    this.gauges.set(key, { value, tags, lastUpdate: new Date() });
  }

  /**
   * Generate metric key with tags
   */
  getMetricKey(name, tags = {}) {
    const tagString = Object.keys(tags)
      .sort()
      .map(key => `${key}:${tags[key]}`)
      .join(',');
    return tagString ? `${name}{${tagString}}` : name;
  }

  /**
   * Get all metrics summary
   */
  getMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      timers: this.getTimerSummary(),
      gauges: Object.fromEntries(this.gauges),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get timer statistics (avg, min, max, p95, p99)
   */
  getTimerSummary() {
    const summary = {};
    
    for (const [key, timer] of this.timers.entries()) {
      const values = timer.values.map(v => v.value).sort((a, b) => a - b);
      if (values.length === 0) continue;
      
      summary[key] = {
        count: values.length,
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        min: values[0],
        max: values[values.length - 1],
        p95: values[Math.ceil(0.95 * values.length) - 1] || values[values.length - 1],
        p99: values[Math.ceil(0.99 * values.length) - 1] || values[values.length - 1],
        tags: timer.tags,
        lastUpdate: timer.lastUpdate
      };
    }
    
    return summary;
  }

  /**
   * Clear old metrics (older than retention period)
   */
  cleanup(retentionHours = 24) {
    const cutoff = new Date(Date.now() - (retentionHours * 60 * 60 * 1000));
    
    // Clean counters
    for (const [key, counter] of this.counters.entries()) {
      if (counter.lastUpdate < cutoff) {
        this.counters.delete(key);
      }
    }
    
    // Clean timers
    for (const [key, timer] of this.timers.entries()) {
      timer.values = timer.values.filter(v => v.timestamp > cutoff);
      if (timer.values.length === 0) {
        this.timers.delete(key);
      }
    }
    
    // Clean gauges
    for (const [key, gauge] of this.gauges.entries()) {
      if (gauge.lastUpdate < cutoff) {
        this.gauges.delete(key);
      }
    }
  }
}

/**
 * Distributed tracing implementation
 */
class TracingManager {
  constructor() {
    this.activeTraces = new Map();
    this.completedTraces = [];
    this.maxTraces = 1000;
  }

  /**
   * Start a new trace
   */
  startTrace(name, parentSpanId = null) {
    const traceId = uuidv4();
    const spanId = uuidv4();
    
    const trace = {
      traceId,
      spanId,
      parentSpanId,
      operationName: name,
      startTime: new Date(),
      tags: {},
      logs: [],
      status: 'active'
    };
    
    this.activeTraces.set(traceId, trace);
    return traceId;
  }

  /**
   * Add tag to trace
   */
  addTag(traceId, key, value) {
    const trace = this.activeTraces.get(traceId);
    if (trace) {
      trace.tags[key] = value;
    }
  }

  /**
   * Add log to trace
   */
  addLog(traceId, message, fields = {}) {
    const trace = this.activeTraces.get(traceId);
    if (trace) {
      trace.logs.push({
        timestamp: new Date(),
        message,
        fields
      });
    }
  }

  /**
   * Finish trace
   */
  finishTrace(traceId, status = 'completed') {
    const trace = this.activeTraces.get(traceId);
    if (trace) {
      trace.endTime = new Date();
      trace.duration = trace.endTime - trace.startTime;
      trace.status = status;
      
      this.activeTraces.delete(traceId);
      this.completedTraces.push(trace);
      
      // Keep only last N traces
      if (this.completedTraces.length > this.maxTraces) {
        this.completedTraces = this.completedTraces.slice(-this.maxTraces);
      }
      
      return trace;
    }
    return null;
  }

  /**
   * Get active traces
   */
  getActiveTraces() {
    return Array.from(this.activeTraces.values());
  }

  /**
   * Get completed traces
   */
  getCompletedTraces(limit = 100) {
    return this.completedTraces.slice(-limit);
  }
}

/**
 * Main Observability Manager
 */
class ObservabilityManager {
  constructor() {
    this.level = OBSERVABILITY_LEVELS.STANDARD;
    this.businessMetrics = new BusinessMetrics();
    this.tracingManager = new TracingManager();
    this.alertThresholds = {
      errorRate: 5, // 5%
      responseTime: 2000, // 2 seconds
      memoryUsage: 85, // 85%
      cpuUsage: 80 // 80%
    };
    
    // Initialize event subscriptions
    this.initializeEventSubscriptions();
    
    // Start background cleanup
    this.startCleanupInterval();
  }

  /**
   * Set observability level
   */
  setLevel(level) {
    if (Object.values(OBSERVABILITY_LEVELS).includes(level)) {
      this.level = level;
      logger.info('Observability level changed', { level });
    } else {
      logger.warn('Invalid observability level', { level, available: Object.values(OBSERVABILITY_LEVELS) });
    }
  }

  /**
   * Initialize event subscriptions for metrics
   */
  initializeEventSubscriptions() {
    // Count all events by type
    eventBus.on('*', (eventData) => {
      this.businessMetrics.incrementCounter('events_total', 1, {
        type: eventData.type,
        priority: eventData.priority
      });
    });

    // Track gauge operations
    Object.values(EVENT_TYPES).forEach(eventType => {
      if (eventType.startsWith('gauge.')) {
        eventBus.on(eventType, (eventData) => {
          this.businessMetrics.incrementCounter('gauge_operations_total', 1, {
            operation: eventType.replace('gauge.', ''),
            gaugeId: eventData.payload.gaugeId
          });
        });
      }
    });

    // Track user authentication
    eventBus.on(EVENT_TYPES.USER_LOGGED_IN, (eventData) => {
      this.businessMetrics.incrementCounter('user_logins_total', 1, {
        userId: eventData.payload.userId
      });
    });

    // Track security events
    Object.values(EVENT_TYPES).forEach(eventType => {
      if (eventType.startsWith('security.')) {
        eventBus.on(eventType, (eventData) => {
          this.businessMetrics.incrementCounter('security_events_total', 1, {
            type: eventType.replace('security.', ''),
            severity: 'high'
          });
        });
      }
    });
  }

  /**
   * Enhanced structured logging
   */
  log(level, message, context = {}, traceId = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'gauge-tracking-api',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      ...context
    };

    // Add trace context if available
    if (traceId) {
      const trace = this.tracingManager.activeTraces.get(traceId);
      if (trace) {
        logEntry.traceId = traceId;
        logEntry.spanId = trace.spanId;
        logEntry.parentSpanId = trace.parentSpanId;
      }
    }

    // Add system context for comprehensive logging
    if (this.level === OBSERVABILITY_LEVELS.COMPREHENSIVE || this.level === OBSERVABILITY_LEVELS.DEBUG) {
      logEntry.system = {
        nodeVersion: process.version,
        platform: process.platform,
        hostname: os.hostname(),
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };
    }

    logger[level](logEntry);

    // Record metrics
    this.businessMetrics.incrementCounter('logs_total', 1, {
      level,
      service: 'gauge-tracking-api'
    });
  }

  /**
   * Record business operation with timing
   */
  recordOperation(operationName, duration, success = true, context = {}, traceId = null) {
    // Record timing
    this.businessMetrics.recordTimer(`operation_duration_ms`, duration, {
      operation: operationName,
      status: success ? 'success' : 'error'
    });

    // Record counter
    this.businessMetrics.incrementCounter('operations_total', 1, {
      operation: operationName,
      status: success ? 'success' : 'error'
    });

    // Log operation
    this.log('info', `Operation ${operationName} completed`, {
      operation: operationName,
      duration,
      success,
      ...context
    }, traceId);

    // Update trace if provided
    if (traceId) {
      this.tracingManager.addTag(traceId, 'operation.name', operationName);
      this.tracingManager.addTag(traceId, 'operation.duration', duration);
      this.tracingManager.addTag(traceId, 'operation.success', success);
    }
  }

  /**
   * Record custom business metric
   */
  recordMetric(metricName, value, type = 'counter', tags = {}) {
    switch (type) {
      case 'counter':
        this.businessMetrics.incrementCounter(metricName, value, tags);
        break;
      case 'gauge':
        this.businessMetrics.setGauge(metricName, value, tags);
        break;
      case 'timer':
        this.businessMetrics.recordTimer(metricName, value, tags);
        break;
      default:
        logger.warn('Invalid metric type', { metricName, type });
    }
  }

  /**
   * Create middleware for request tracing
   */
  createTracingMiddleware() {
    return (req, res, next) => {
      const traceId = this.tracingManager.startTrace(`${req.method} ${req.path}`);
      
      // Add trace ID to request
      req.traceId = traceId;
      req.startTime = Date.now();
      
      // Add tags
      this.tracingManager.addTag(traceId, 'http.method', req.method);
      this.tracingManager.addTag(traceId, 'http.url', req.url);
      this.tracingManager.addTag(traceId, 'http.user_agent', req.headers['user-agent'] || '');
      this.tracingManager.addTag(traceId, 'user.id', req.user?.id || 'anonymous');
      
      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = (...args) => {
        const duration = Date.now() - req.startTime;
        
        // Add response tags
        this.tracingManager.addTag(traceId, 'http.status_code', res.statusCode);
        this.tracingManager.addTag(traceId, 'http.response_time', duration);
        
        // Finish trace
        const status = res.statusCode >= 400 ? 'error' : 'completed';
        this.tracingManager.finishTrace(traceId, status);
        
        // Record operation
        this.recordOperation(
          `HTTP ${req.method}`,
          duration,
          res.statusCode < 400,
          {
            path: req.path,
            statusCode: res.statusCode,
            userAgent: req.headers['user-agent']
          },
          traceId
        );
        
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  /**
   * Monitor system health and trigger alerts
   */
  async monitorHealth() {
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const cpuPercent = os.loadavg()[0] / os.cpus().length * 100;
    
    // Record system metrics
    this.businessMetrics.setGauge('system_memory_usage_percent', memPercent);
    this.businessMetrics.setGauge('system_cpu_usage_percent', cpuPercent);
    this.businessMetrics.setGauge('system_uptime_seconds', process.uptime());
    
    // Check thresholds and trigger alerts
    const alerts = [];
    
    if (memPercent > this.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'high_memory_usage',
        severity: 'warning',
        message: `Memory usage ${memPercent.toFixed(2)}% exceeds threshold ${this.alertThresholds.memoryUsage}%`,
        value: memPercent,
        threshold: this.alertThresholds.memoryUsage
      });
    }
    
    if (cpuPercent > this.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'high_cpu_usage',
        severity: 'warning',
        message: `CPU usage ${cpuPercent.toFixed(2)}% exceeds threshold ${this.alertThresholds.cpuUsage}%`,
        value: cpuPercent,
        threshold: this.alertThresholds.cpuUsage
      });
    }
    
    // Send alerts
    for (const alert of alerts) {
      this.log('warn', 'System health alert', alert);
      
      // Increment alert counter
      this.businessMetrics.incrementCounter('alerts_total', 1, {
        type: alert.type,
        severity: alert.severity
      });
      
      // Emit event for notification system
      eventBus.emitEvent(EVENT_TYPES.SYSTEM_ERROR_OCCURRED, {
        type: alert.type,
        message: alert.message,
        component: 'observability_manager',
        severity: alert.severity
      });
    }
  }

  /**
   * Get comprehensive observability dashboard
   */
  getDashboard() {
    const performanceDashboard = performanceMonitor.getDashboard();
    const businessMetrics = this.businessMetrics.getMetrics();
    const activeTraces = this.tracingManager.getActiveTraces();
    const recentTraces = this.tracingManager.getCompletedTraces(20);
    
    return {
      timestamp: new Date().toISOString(),
      level: this.level,
      performance: performanceDashboard,
      businessMetrics,
      tracing: {
        activeTraces: activeTraces.length,
        recentTraces: recentTraces.length,
        traces: recentTraces.map(t => ({
          traceId: t.traceId,
          operationName: t.operationName,
          duration: t.duration,
          status: t.status,
          tags: t.tags
        }))
      },
      systemHealth: {
        memory: process.memoryUsage(),
        cpu: {
          loadavg: os.loadavg(),
          usage: os.loadavg()[0] / os.cpus().length * 100
        },
        uptime: process.uptime(),
        platform: {
          nodeVersion: process.version,
          platform: process.platform,
          hostname: os.hostname()
        }
      },
      alertThresholds: this.alertThresholds
    };
  }

  /**
   * Start cleanup interval for old data
   */
  startCleanupInterval() {
    setInterval(() => {
      this.businessMetrics.cleanup(24); // Keep 24 hours of metrics
      this.log('debug', 'Observability data cleanup completed');
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics() {
    const metrics = this.businessMetrics.getMetrics();
    const lines = [];
    
    // Export counters
    for (const [key, counter] of Object.entries(metrics.counters)) {
      const metricName = key.split('{')[0];
      const tags = this.parseTagsFromKey(key);
      const tagString = this.formatPrometheusLabels(tags);
      
      lines.push(`# HELP ${metricName} Business counter metric`);
      lines.push(`# TYPE ${metricName} counter`);
      lines.push(`${metricName}${tagString} ${counter.value}`);
    }
    
    // Export gauges
    for (const [key, gauge] of Object.entries(metrics.gauges)) {
      const metricName = key.split('{')[0];
      const tags = this.parseTagsFromKey(key);
      const tagString = this.formatPrometheusLabels(tags);
      
      lines.push(`# HELP ${metricName} Business gauge metric`);
      lines.push(`# TYPE ${metricName} gauge`);
      lines.push(`${metricName}${tagString} ${gauge.value}`);
    }
    
    // Export timer summaries
    for (const [key, timer] of Object.entries(metrics.timers)) {
      const metricName = key.split('{')[0] + '_seconds';
      const tags = this.parseTagsFromKey(key);
      const tagString = this.formatPrometheusLabels(tags);
      
      lines.push(`# HELP ${metricName} Business timer metric`);
      lines.push(`# TYPE ${metricName} summary`);
      lines.push(`${metricName}_sum${tagString} ${timer.avg * timer.count / 1000}`);
      lines.push(`${metricName}_count${tagString} ${timer.count}`);
      lines.push(`${metricName}{quantile="0.95"${tags ? ',' + Object.entries(tags).map(([k,v]) => `${k}="${v}"`).join(',') : ''}} ${timer.p95 / 1000}`);
      lines.push(`${metricName}{quantile="0.99"${tags ? ',' + Object.entries(tags).map(([k,v]) => `${k}="${v}"`).join(',') : ''}} ${timer.p99 / 1000}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Parse tags from metric key
   */
  parseTagsFromKey(key) {
    const match = key.match(/\{([^}]+)\}/);
    if (!match) return {};
    
    const tags = {};
    match[1].split(',').forEach(tag => {
      const [key, value] = tag.split(':');
      if (key && value) {
        tags[key] = value;
      }
    });
    return tags;
  }

  /**
   * Format tags for Prometheus labels
   */
  formatPrometheusLabels(tags) {
    if (!tags || Object.keys(tags).length === 0) return '';
    
    const labels = Object.entries(tags)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `{${labels}}`;
  }
}

// Create singleton instance
const observabilityManager = new ObservabilityManager();

module.exports = {
  observabilityManager,
  ObservabilityManager,
  BusinessMetrics,
  TracingManager,
  OBSERVABILITY_LEVELS
};