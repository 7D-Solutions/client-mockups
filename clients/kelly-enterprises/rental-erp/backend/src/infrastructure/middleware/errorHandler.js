/**
 * Enhanced Error Handling Middleware
 * Provides consistent error classification and response formatting
 */

const { v4: uuidv4 } = require('uuid');
const { classifyDatabaseError, createErrorResponse } = require('../utils/errorClassifier');
const logger = require('../utils/logger');
const auditService = require('../audit/auditService');

/**
 * Database Error Handler Middleware
 * Specifically handles database-related errors with proper classification
 */
async function databaseErrorHandler(error, req, res, next) {
  // Only handle database-related errors
  if (!isDatabaseError(error)) {
    return next(error);
  }

  const requestId = req.requestId || uuidv4();
  
  try {
    // Classify the database error
    const classification = classifyDatabaseError(error, requestId);
    
    // Create standardized response
    const errorResponse = createErrorResponse(classification, req.originalUrl);
    
    // Add error metrics for monitoring
    recordErrorMetrics(classification, req);
    
    // Log to audit trail (with error handling to prevent recursion)
    try {
      await auditService.logSystemError({
        error,
        request: req,
        category: classification.category,
        requestId
      });
    } catch (auditError) {
      logger.error('Audit logging failed', { auditError: auditError.message, requestId });
    }
    
    // Send classified error response
    res.status(classification.status).json(errorResponse);
    
  } catch (handlingError) {
    logger.error('Error handler failed', {
      requestId,
      originalError: error.message,
      handlingError: handlingError.message,
      url: req.originalUrl,
      method: req.method
    });
    
    // Fallback to generic error
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Enhanced Global Error Handler
 * Handles all types of errors with improved classification
 */
async function globalErrorHandler(error, req, res, next) {
  const requestId = req.requestId || uuidv4();
  req.requestId = requestId; // Ensure requestId is available
  
  // Set default error response
  let statusCode = 500;
  let errorResponse = {
    success: false,
    error: 'Internal server error',
    requestId,
    timestamp: new Date().toISOString()
  };

  try {
    // Handle different error types
    if (isDatabaseError(error)) {
      // Database errors - use classification system
      const classification = classifyDatabaseError(error, requestId);
      statusCode = classification.status;
      errorResponse = createErrorResponse(classification, req.originalUrl);
      
    } else if (error.name === 'ValidationError') {
      // Validation errors with educational support
      statusCode = 400;  // Changed to 400 for consistency with plan
      errorResponse.error = error.message || 'Validation failed';
      errorResponse.code = error.code || 'VALIDATION_ERROR';
      
      // Include educational fields for gauge validation errors
      if (error.field) {
        errorResponse.field = error.field;
      }
      if (error.validValues) {
        errorResponse.validValues = error.validValues;
      }
      if (error.correctUsage) {
        errorResponse.correctUsage = error.correctUsage;
      }
      if (error.details && process.env.NODE_ENV !== 'production') {
        errorResponse.details = error.details;
      }
      
      // Add documentation URL if error code is provided
      if (error.code) {
        errorResponse.documentationUrl = `/api/docs/errors/${error.code}`;
      }
      
    } else if (error.name === 'JsonWebTokenError') {
      // JWT errors
      statusCode = 401;
      errorResponse.error = 'Invalid authentication token';
      errorResponse.code = 'INVALID_TOKEN';
      
    } else if (error.name === 'TokenExpiredError') {
      // Expired JWT
      statusCode = 401;
      errorResponse.error = 'Authentication token expired';
      errorResponse.code = 'EXPIRED_TOKEN';
      
    } else if (error.name === 'CorsError') {
      // CORS errors
      statusCode = 403;
      errorResponse.error = 'CORS policy violation';
      errorResponse.code = 'CORS_ERROR';
      
    } else if (error.status || error.statusCode) {
      // Errors with explicit status codes
      statusCode = error.status || error.statusCode;
      errorResponse.error = error.message || 'Request failed';
      errorResponse.code = error.code || 'REQUEST_ERROR';
      
    } else if (error.code === 'LIMIT_FILE_SIZE') {
      // File upload size limit
      statusCode = 413;
      errorResponse.error = 'File too large';
      errorResponse.code = 'FILE_TOO_LARGE';
      
    } else if (error.code === 'EBADCSRFTOKEN') {
      // CSRF token errors
      statusCode = 403;
      errorResponse.error = 'Invalid CSRF token';
      errorResponse.code = 'INVALID_CSRF';
    }

    // Log the error with full context
    logError(error, req, statusCode, requestId);
    
    // Record metrics
    recordErrorMetrics({ 
      status: statusCode, 
      category: getErrorCategory(error),
      code: errorResponse.code 
    }, req);
    
    // Log to audit trail (with error handling to prevent recursion)
    try {
      await auditService.logSystemError({
        error,
        request: req,
        category: getErrorCategory(error),
        requestId
      });
    } catch (auditError) {
      logger.error('Audit logging failed in global handler', { auditError: auditError.message, requestId });
    }

  } catch (handlingError) {
    // Fallback if error handling itself fails
    logger.error('Global error handler failed', {
      requestId,
      originalError: error.message,
      handlingError: handlingError.message,
      url: req.originalUrl,
      method: req.method
    });
    
    statusCode = 500;
    errorResponse = {
      success: false,
      error: 'Internal server error',
      requestId,
      timestamp: new Date().toISOString()
    };
  }

  // Ensure we don't send response twice
  if (!res.headersSent) {
    res.status(statusCode).json(errorResponse);
  }
}

/**
 * Request ID Assignment Middleware
 * Ensures every request has a unique ID for tracking
 */
function assignRequestId(req, res, next) {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

/**
 * Error Boundary Wrapper for Route Handlers
 * Catches async errors and passes them to error handlers
 */
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Circuit Breaker Middleware
 * Implements circuit breaker pattern for database operations
 */
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000, monitoringPeriod = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.monitoringPeriod = monitoringPeriod;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = null;
  }

  async execute(operation, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        if (fallback) {
          return fallback();
        }
        throw new Error('Circuit breaker is open');
      } else {
        this.state = 'HALF_OPEN';
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.nextAttempt = null;
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Global circuit breaker instance for database operations
const databaseCircuitBreaker = new CircuitBreaker(5, 30000, 60000);

/**
 * Circuit Breaker Middleware for Database Operations
 */
function circuitBreakerMiddleware(req, res, next) {
  req.circuitBreaker = databaseCircuitBreaker;
  next();
}

// Helper Functions

/**
 * Determines if an error is database-related
 */
function isDatabaseError(error) {
  // Check for common database error indicators
  if (error.code && (
    error.code.startsWith('ER_') || 
    error.code === 'ECONNREFUSED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ECONNRESET'
  )) {
    return true;
  }

  // Check error message for database-related terms
  const message = error.message || '';
  return message.includes('mysql') || 
         message.includes('database') || 
         message.includes('connection') ||
         message.includes('Pool') ||
         message.includes('ECONNREFUSED') ||
         message.includes('timeout');
}

/**
 * Gets error category for metrics
 */
function getErrorCategory(error) {
  if (isDatabaseError(error)) return 'DATABASE';
  if (error.name === 'ValidationError') return 'VALIDATION';
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return 'AUTH';
  if (error.name === 'CorsError') return 'CORS';
  return 'APPLICATION';
}

/**
 * Comprehensive error logging
 */
function logError(error, req, statusCode, requestId) {
  const logData = {
    requestId,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      status: statusCode,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user ? req.user.user_id : null
    },
    timestamp: new Date().toISOString()
  };

  // Add sensitive database error details only in development
  if (process.env.NODE_ENV !== 'production' && isDatabaseError(error)) {
    logData.database = {
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    };
  }

  if (statusCode >= 500) {
    logger.error('Server error occurred', logData);
  } else {
    logger.warn('Client error occurred', logData);
  }
}

/**
 * Records error metrics for monitoring
 */
function recordErrorMetrics(classification, req) {
  // This would integrate with your metrics system (Prometheus, etc.)
  // For now, we'll log metrics data
  logger.info('Error metrics', {
    metric: 'error_count',
    status: classification.status,
    category: classification.category,
    code: classification.code,
    method: req.method,
    endpoint: req.route ? req.route.path : req.originalUrl,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  databaseErrorHandler,
  globalErrorHandler,
  assignRequestId,
  asyncErrorHandler,
  circuitBreakerMiddleware,
  CircuitBreaker,
  databaseCircuitBreaker
};