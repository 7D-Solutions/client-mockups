/**
 * Enhanced Structured Logger with Correlation IDs and Context
 * HIGH-005 Implementation - Comprehensive Logging
 */

const winston = require('winston');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

/**
 * Log levels with numeric priority
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5
};

/**
 * Log categories for better organization
 */
const LOG_CATEGORIES = {
  SYSTEM: 'system',
  BUSINESS: 'business',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  AUDIT: 'audit',
  DEBUG: 'debug'
};

/**
 * Enhanced structured logger class
 */
class StructuredLogger {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'gauge-tracking-api';
    this.version = options.version || '1.0.0';
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.correlationContext = new Map(); // Store correlation contexts
    
    this.logger = winston.createLogger({
      levels: LOG_LEVELS,
      level: options.level || process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(this.formatLogEntry.bind(this))
      ),
      defaultMeta: {
        service: this.serviceName,
        version: this.version,
        environment: this.environment
      },
      transports: this.createTransports(options)
    });

    // Create colored console transport for development
    if (this.environment !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
          winston.format.colorize(),
          winston.format.printf(this.formatConsoleEntry.bind(this))
        )
      }));
    }
  }

  /**
   * Create file transports
   */
  createTransports(options) {
    const logsDir = options.logsDir || path.join(__dirname, '..', '..', '..', 'logs');
    
    return [
      // All logs
      new winston.transports.File({
        filename: path.join(logsDir, 'application.log'),
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10,
        tailable: true
      }),
      
      // Error logs only
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      }),
      
      // Audit logs (business operations)
      new winston.transports.File({
        filename: path.join(logsDir, 'audit.log'),
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 20,
        tailable: true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.printf((info) => {
            // Only include audit and business logs in audit.log
            if (info.category === LOG_CATEGORIES.AUDIT || info.category === LOG_CATEGORIES.BUSINESS) {
              return JSON.stringify(info);
            }
            return false;
          })
        )
      }),
      
      // Security logs
      new winston.transports.File({
        filename: path.join(logsDir, 'security.log'),
        maxsize: 20 * 1024 * 1024, // 20MB
        maxFiles: 10,
        tailable: true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.printf((info) => {
            // Only include security logs
            if (info.category === LOG_CATEGORIES.SECURITY) {
              return JSON.stringify(info);
            }
            return false;
          })
        )
      }),
      
      // Performance logs
      new winston.transports.File({
        filename: path.join(logsDir, 'performance.log'),
        maxsize: 20 * 1024 * 1024, // 20MB
        maxFiles: 5,
        tailable: true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.printf((info) => {
            // Only include performance logs
            if (info.category === LOG_CATEGORIES.PERFORMANCE) {
              return JSON.stringify(info);
            }
            return false;
          })
        )
      })
    ];
  }

  /**
   * Format log entry for JSON output
   */
  formatLogEntry(info) {
    const entry = {
      '@timestamp': info.timestamp,
      level: info.level,
      message: info.message,
      service: info.service,
      version: info.version,
      environment: info.environment,
      category: info.category || LOG_CATEGORIES.SYSTEM,
      correlationId: info.correlationId,
      traceId: info.traceId,
      spanId: info.spanId,
      userId: info.userId,
      requestId: info.requestId,
      operation: info.operation,
      component: info.component,
      context: info.context || {},
      metadata: info.metadata || {},
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        nodeVersion: process.version,
        pid: process.pid
      }
    };

    // Add stack trace for errors
    if (info.stack) {
      entry.stack = info.stack;
    }

    // Add HTTP context if available
    if (info.http) {
      entry.http = info.http;
    }

    // Add performance metrics if available
    if (info.performance) {
      entry.performance = info.performance;
    }

    // Remove undefined values
    Object.keys(entry).forEach(key => {
      if (entry[key] === undefined || entry[key] === null) {
        delete entry[key];
      }
    });

    return JSON.stringify(entry);
  }

  /**
   * Format console output for development
   */
  formatConsoleEntry(info) {
    const timestamp = info.timestamp;
    const level = info.level;
    const message = info.message;
    const correlationId = info.correlationId ? `[${info.correlationId.slice(0, 8)}]` : '';
    const operation = info.operation ? `[${info.operation}]` : '';
    
    let output = `[${timestamp}] ${level}: ${correlationId}${operation} ${message}`;
    
    // Add context information
    if (info.context && Object.keys(info.context).length > 0) {
      output += ` | Context: ${JSON.stringify(info.context)}`;
    }
    
    // Add metadata
    if (info.metadata && Object.keys(info.metadata).length > 0) {
      output += ` | Meta: ${JSON.stringify(info.metadata)}`;
    }
    
    return output;
  }

  /**
   * Create correlation ID for request tracking
   */
  createCorrelationId() {
    return uuidv4();
  }

  /**
   * Set correlation context
   */
  setCorrelationContext(correlationId, context = {}) {
    this.correlationContext.set(correlationId, {
      ...context,
      createdAt: new Date(),
      lastUsed: new Date()
    });
  }

  /**
   * Get correlation context
   */
  getCorrelationContext(correlationId) {
    const context = this.correlationContext.get(correlationId);
    if (context) {
      context.lastUsed = new Date();
      return context;
    }
    return null;
  }

  /**
   * Clear correlation context
   */
  clearCorrelationContext(correlationId) {
    this.correlationContext.delete(correlationId);
  }

  /**
   * Create child logger with bound context
   */
  child(context = {}) {
    return {
      error: (message, meta = {}) => this.error(message, { ...context, ...meta }),
      warn: (message, meta = {}) => this.warn(message, { ...context, ...meta }),
      info: (message, meta = {}) => this.info(message, { ...context, ...meta }),
      http: (message, meta = {}) => this.http(message, { ...context, ...meta }),
      debug: (message, meta = {}) => this.debug(message, { ...context, ...meta }),
      trace: (message, meta = {}) => this.trace(message, { ...context, ...meta })
    };
  }

  /**
   * Enhanced logging methods with categories
   */
  error(message, meta = {}) {
    this.log('error', message, { category: LOG_CATEGORIES.SYSTEM, ...meta });
  }

  warn(message, meta = {}) {
    this.log('warn', message, { category: LOG_CATEGORIES.SYSTEM, ...meta });
  }

  info(message, meta = {}) {
    this.log('info', message, { category: LOG_CATEGORIES.SYSTEM, ...meta });
  }

  http(message, meta = {}) {
    this.log('http', message, { category: LOG_CATEGORIES.SYSTEM, ...meta });
  }

  debug(message, meta = {}) {
    this.log('debug', message, { category: LOG_CATEGORIES.DEBUG, ...meta });
  }

  trace(message, meta = {}) {
    this.log('trace', message, { category: LOG_CATEGORIES.DEBUG, ...meta });
  }

  /**
   * Specialized logging methods by category
   */
  business(message, meta = {}) {
    this.log('info', message, { category: LOG_CATEGORIES.BUSINESS, ...meta });
  }

  security(message, meta = {}) {
    this.log('warn', message, { category: LOG_CATEGORIES.SECURITY, ...meta });
  }

  audit(message, meta = {}) {
    this.log('info', message, { category: LOG_CATEGORIES.AUDIT, ...meta });
  }

  performance(message, meta = {}) {
    this.log('info', message, { category: LOG_CATEGORIES.PERFORMANCE, ...meta });
  }

  /**
   * Core logging method
   */
  log(level, message, meta = {}) {
    const logEntry = {
      message,
      ...meta
    };

    // Add correlation context if available
    if (meta.correlationId) {
      const context = this.getCorrelationContext(meta.correlationId);
      if (context) {
        logEntry.context = { ...logEntry.context, ...context };
      }
    }

    // Add timestamp for audit logs
    if (meta.category === LOG_CATEGORIES.AUDIT) {
      logEntry.auditTimestamp = new Date().toISOString();
    }

    this.logger.log(level, logEntry);
  }

  /**
   * Log HTTP request
   */
  logRequest(req, res, duration) {
    const correlationId = req.correlationId || req.id;
    
    this.http('HTTP Request', {
      correlationId,
      traceId: req.traceId,
      requestId: req.id,
      http: {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        userAgent: req.headers['user-agent'],
        contentLength: res.get('content-length'),
        referrer: req.headers.referer
      },
      performance: {
        duration,
        responseTime: duration
      },
      userId: req.user?.id,
      ipAddress: req.ip,
      operation: `${req.method} ${req.path}`
    });
  }

  /**
   * Log business operation
   */
  logOperation(operationName, details, meta = {}) {
    this.business(`Business operation: ${operationName}`, {
      operation: operationName,
      details,
      ...meta
    });
  }

  /**
   * Log security event
   */
  logSecurity(eventType, details, meta = {}) {
    this.security(`Security event: ${eventType}`, {
      securityEvent: eventType,
      details,
      severity: meta.severity || 'medium',
      ...meta
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation, metrics, meta = {}) {
    this.performance(`Performance: ${operation}`, {
      operation,
      metrics,
      ...meta
    });
  }

  /**
   * Create middleware for Express.js
   */
  createMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const correlationId = req.headers['x-correlation-id'] || this.createCorrelationId();
      
      // Add correlation ID to request
      req.correlationId = correlationId;
      
      // Set correlation context
      this.setCorrelationContext(correlationId, {
        requestId: req.id,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        userId: req.user?.id
      });
      
      // Add correlation ID to response headers
      res.setHeader('X-Correlation-ID', correlationId);
      
      // Override res.end to log response
      const originalEnd = res.end;
      res.end = (...args) => {
        const duration = Date.now() - startTime;
        this.logRequest(req, res, duration);
        
        // Clean up correlation context for completed requests
        setTimeout(() => {
          this.clearCorrelationContext(correlationId);
        }, 60000); // Keep for 1 minute after completion
        
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  /**
   * Get logger statistics
   */
  getStats() {
    return {
      correlationContexts: this.correlationContext.size,
      logLevel: this.logger.level,
      service: this.serviceName,
      version: this.version,
      environment: this.environment,
      transports: this.logger.transports.length
    };
  }

  /**
   * Clean up old correlation contexts
   */
  cleanup() {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    
    for (const [correlationId, context] of this.correlationContext.entries()) {
      if (context.lastUsed < cutoff) {
        this.correlationContext.delete(correlationId);
      }
    }
  }
}

// Create default instance
const structuredLogger = new StructuredLogger({
  serviceName: 'gauge-tracking-api',
  version: '1.0.0'
});

// Start cleanup interval
setInterval(() => {
  structuredLogger.cleanup();
}, 5 * 60 * 1000); // Every 5 minutes

module.exports = {
  StructuredLogger,
  structuredLogger,
  LOG_LEVELS,
  LOG_CATEGORIES
};