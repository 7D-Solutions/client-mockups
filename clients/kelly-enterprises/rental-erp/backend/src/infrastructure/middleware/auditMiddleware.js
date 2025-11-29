/**
 * Comprehensive Audit Middleware for HIGH-003 Compliance
 * Tracks all state-changing operations, security events, and performance issues
 */

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const auditService = require('../audit/auditService');

/**
 * State-changing HTTP methods that require auditing
 */
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Audit levels for different types of operations
 */
const AUDIT_LEVELS = {
  CRITICAL: 'critical',    // Financial, safety, or compliance impact
  HIGH: 'high',           // Operational impact
  MEDIUM: 'medium',       // Standard business operations
  LOW: 'low'              // Informational operations
};

/**
 * Comprehensive audit logging middleware for state changes
 */
const auditStateChanges = (auditLevel = AUDIT_LEVELS.MEDIUM) => {
  return async (req, res, next) => {
    // Only audit state-changing operations
    if (!STATE_CHANGING_METHODS.includes(req.method)) {
      return next();
    }

    const auditId = uuidv4();
    const startTime = Date.now();
    
    // Capture request context
    const auditContext = {
      auditId,
      timestamp: new Date().toISOString(),
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      userRoles: req.user?.roles || [],
      requestId: req.requestId || req.id,
      method: req.method,
      path: req.path,
      route: req.route?.path || req.path,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      auditLevel,
      operation: extractOperation(req.path, req.method),
      resourceType: extractResourceType(req.path),
      resourceId: req.params?.id || req.params?.gaugeId || null,
      requestBody: sanitizeRequestBody(req.body),
      queryParams: req.query
    };

    // Attach audit context to request
    req.auditContext = auditContext;

    // Intercept response to capture response data
    const originalSend = res.send;
    const originalJson = res.json;
    let responseData = null;

    res.send = function(data) {
      responseData = data;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Handle response completion
    res.on('finish', async () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const auditRecord = {
        ...auditContext,
        responseData: {
          statusCode: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 300,
          error: res.statusCode >= 400 ? extractErrorFromResponse(responseData) : null
        },
        completedAt: new Date().toISOString()
      };

      // Log comprehensive audit record
      try {
        if (auditRecord.responseData.success) {
          logger.info('STATE_CHANGE_AUDIT', auditRecord);
        } else {
          logger.warn('FAILED_STATE_CHANGE_AUDIT', auditRecord);
        }
      } catch (error) {
        logger.error('Failed to log state change audit:', error);
      }
    });

    next();
  };
};

/**
 * Extract operation type from request path and method
 */
function extractOperation(path, method) {
  const pathLower = path.toLowerCase();
  
  // Check for specific operations in path
  const operations = [
    'create', 'update', 'delete', 'checkout', 'return', 
    'transfer', 'unseal', 'approve', 'reject', 'verify',
    'calibration', 'qc', 'recover', 'unlock', 'reset'
  ];
  
  for (const operation of operations) {
    if (pathLower.includes(operation)) {
      return operation;
    }
  }
  
  // Default operations based on HTTP method
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'unknown';
  }
}

/**
 * Extract resource type from request path
 */
function extractResourceType(path) {
  const pathSegments = path.split('/').filter(s => s);
  
  // Common resource types
  const resourceTypes = [
    'gauges', 'users', 'calibration', 'qc', 'transfers', 
    'unseal-requests', 'reports', 'audit', 'admin'
  ];
  
  for (const segment of pathSegments) {
    if (resourceTypes.some(type => segment.includes(type))) {
      return segment;
    }
  }
  
  return pathSegments.find(s => s !== 'api' && s !== 'v1' && s !== 'v2') || 'unknown';
}

/**
 * Sanitize request body for audit logging
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  sensitiveFields.forEach(field => {
    Object.keys(sanitized).forEach(key => {
      if (key.toLowerCase().includes(field)) {
        sanitized[key] = '[REDACTED]';
      }
    });
  });
  
  return sanitized;
}

/**
 * Extract error message from response
 */
function extractErrorFromResponse(responseData) {
  if (typeof responseData === 'object' && responseData) {
    return responseData.error || responseData.message || 'Unknown error';
  }
  return null;
}

/**
 * Log authentication events
 */
function auditAuthentication(action) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to capture response
    res.json = function(data) {
      // Log authentication event
      const auditData = {
        userId: req.user?.user_id || null,
        action: action,
        tableName: 'users',
        details: {
          username: req.body?.username || req.user?.name,
          success: data.success || false,
          message: data.message
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };
      
      auditService.logAction(auditData).catch(err => {
        logger.error('Failed to audit authentication event:', err);
      });
      
      // Call original method
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Log permission denied events
 */
function auditPermissionDenied(requiredPermission) {
  return async (req, res, next) => {
    const hasPermission = checkUserPermission(req.user, requiredPermission);
    
    if (!hasPermission) {
      // Log security event
      await auditService.logSecurityEvent({
        userId: req.user?.user_id,
        action: 'permission_denied',
        eventType: 'authorization_failure',
        username: req.user?.name,
        reason: `Missing required permission: ${requiredPermission}`,
        resource: req.originalUrl,
        requiredPermissions: [requiredPermission],
        userPermissions: req.user?.permissions || [],
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED'
      });
    }
    
    next();
  };
}

/**
 * Log failed login attempts
 */
async function auditFailedLogin(req, username, reason) {
  await auditService.logSecurityEvent({
    userId: null,
    action: 'failed_login',
    eventType: 'authentication_failure',
    username: username,
    reason: reason,
    resource: '/api/auth/login',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
}

/**
 * Log circuit breaker events
 */
function auditCircuitBreaker() {
  return (req, res, next) => {
    if (req.circuitBreaker) {
      const originalExecute = req.circuitBreaker.execute;
      
      req.circuitBreaker.execute = async function(operation, fallback) {
        const startState = this.getStatus();
        
        try {
          const result = await originalExecute.call(this, operation, fallback);
          
          // Log if circuit breaker recovered
          if (startState.state === 'OPEN' && this.getStatus().state === 'CLOSED') {
            await auditService.logPerformanceEvent({
              userId: req.user?.user_id,
              action: 'circuit_breaker_recovered',
              eventType: 'circuit_breaker',
              circuitBreakerState: this.getStatus(),
              resource: req.originalUrl,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          }
          
          return result;
        } catch (error) {
          // Log if circuit breaker opened
          if (startState.state !== 'OPEN' && this.getStatus().state === 'OPEN') {
            await auditService.logPerformanceEvent({
              userId: req.user?.user_id,
              action: 'circuit_breaker_open',
              eventType: 'circuit_breaker',
              circuitBreakerState: this.getStatus(),
              resource: req.originalUrl,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          }
          
          throw error;
        }
      };
    }
    
    next();
  };
}

/**
 * Log retry events
 */
function auditRetryOperations() {
  return (req, res, next) => {
    // Store retry count in request
    req.retryCount = 0;
    
    // Override retry handler
    const originalRetry = req.retry;
    if (originalRetry) {
      req.retry = async function(operation, options) {
        req.retryCount++;
        
        try {
          const result = await originalRetry.call(this, operation, options);
          
          // Log if retries were needed
          if (req.retryCount > 0) {
            await auditService.logPerformanceEvent({
              userId: req.user?.user_id,
              action: 'retry_succeeded',
              eventType: 'retry',
              retryCount: req.retryCount,
              resource: req.originalUrl,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          }
          
          return result;
        } catch (error) {
          // Log retry exhaustion
          await auditService.logPerformanceEvent({
            userId: req.user?.user_id,
            action: 'retry_exhausted',
            eventType: 'retry',
            retryCount: req.retryCount,
            resource: req.originalUrl,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
          
          throw error;
        }
      };
    }
    
    next();
  };
}

/**
 * Log configuration changes
 */
function auditConfigurationChange() {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to capture response
    res.json = function(data) {
      if (data.success && req.body.configChange) {
        // Log configuration change
        auditService.logConfigurationChange({
          userId: req.user?.user_id,
          settingName: req.body.configChange.setting,
          oldValue: req.body.configChange.oldValue,
          newValue: req.body.configChange.newValue,
          reason: req.body.configChange.reason,
          affectedComponents: req.body.configChange.components || [],
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }).catch(err => {
          logger.error('Failed to audit configuration change:', err);
        });
      }
      
      // Call original method
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Log all data modifications
 */
function auditDataModification(action, tableName) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to capture response
    res.json = function(data) {
      if (data.success) {
        // Log data modification
        const auditData = {
          userId: req.user?.user_id,
          action: action,
          tableName: tableName,
          recordId: data.id || data.recordId || req.params.id,
          details: {
            method: req.method,
            endpoint: req.originalUrl,
            requestBody: req.body,
            changes: data.changes || {}
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        };
        
        auditService.logAction(auditData).catch(err => {
          logger.error('Failed to audit data modification:', err);
        });
      }
      
      // Call original method
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Helper function to check user permissions
 */
function checkUserPermission(user, requiredPermission) {
  if (!user) return false;
  
  // Admin has all permissions
  if (user.role === 'admin') return true;
  
  // Check specific permission
  return user.permissions && user.permissions.includes(requiredPermission);
}

module.exports = {
  // New comprehensive state change auditing
  auditStateChanges,
  AUDIT_LEVELS,
  STATE_CHANGING_METHODS,
  
  // Existing audit functions (kept for backward compatibility)
  auditAuthentication,
  auditPermissionDenied,
  auditFailedLogin,
  auditCircuitBreaker,
  auditRetryOperations,
  auditConfigurationChange,
  auditDataModification
};