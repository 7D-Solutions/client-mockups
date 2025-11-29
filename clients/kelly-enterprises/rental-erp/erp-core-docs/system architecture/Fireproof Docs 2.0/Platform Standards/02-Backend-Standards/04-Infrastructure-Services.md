# Infrastructure Services

**Fire-Proof ERP Backend - Infrastructure Layer Documentation**

## Overview

The infrastructure layer provides cross-cutting concerns that support all modules: authentication, database connection pooling, audit logging, error handling, notifications, and event bus.

**Location**: `backend/src/infrastructure/`

## Directory Structure

```
infrastructure/
├── audit/                  # Audit logging service
│   └── auditService.js
├── config/                 # Configuration management
│   ├── config.js
│   ├── constants.js
│   └── rateLimiting.js
├── database/               # Database connection pooling
│   └── connection.js
├── errors/                 # Custom error classes
│   └── ValidationError.js
├── events/                 # Event bus system
│   ├── EventBus.js
│   └── eventEmitters.js
├── middleware/             # Infrastructure middleware
│   ├── auth.js
│   ├── checkPermission.js
│   ├── errorHandler.js
│   ├── auditMiddleware.js
│   ├── rateLimiter.js
│   └── securityHeaders.js
├── notifications/          # Notification service
│   ├── NotificationService.js
│   └── channels/
│       └── EmailChannel.js
├── repositories/           # Base repository pattern
│   └── BaseRepository.js
├── services/               # Base service pattern
│   ├── BaseService.js
│   └── ServiceRegistry.js
└── utils/                  # Utilities
    ├── logger.js
    └── errorClassifier.js
```

## Authentication & Authorization

### JWT Authentication Middleware

**Location**: `infrastructure/middleware/auth.js`

#### authenticateToken

Validates JWT tokens and extracts user context:

```javascript
const authenticateToken = async (req, res, next) => {
  // Get token from cookie or Authorization header
  let token = req.cookies?.authToken;

  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Authentication required.'
    });
  }

  try {
    const verified = jwt.verify(token, config.security.jwtSecret);

    // SECURITY: Validate user exists and is active in database
    const pool = getPool();
    const [users] = await pool.execute(
      `SELECT
        u.id, u.email, u.is_active, u.name, r.name as role,
        GROUP_CONCAT(DISTINCT CONCAT(p.module_id, '.', p.resource, '.', p.action)) as user_permissions,
        GROUP_CONCAT(DISTINCT CONCAT(rp_perm.module_id, '.', rp_perm.resource, '.', rp_perm.action)) as role_permissions
      FROM core_users u
      LEFT JOIN core_user_roles ur ON u.id = ur.user_id
      LEFT JOIN core_roles r ON ur.role_id = r.id
      LEFT JOIN core_user_permissions up ON u.id = up.user_id
      LEFT JOIN core_permissions p ON up.permission_id = p.id
      LEFT JOIN core_role_permissions rp ON r.id = rp.role_id
      LEFT JOIN core_permissions rp_perm ON rp.permission_id = rp_perm.id
      WHERE u.id = ? AND u.is_active = 1
      GROUP BY u.id`,
      [verified.user_id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token - user not found or inactive.'
      });
    }

    const user = users[0];

    // Combine user permissions and role permissions
    const userPerms = user.user_permissions ? user.user_permissions.split(',') : [];
    const rolePerms = user.role_permissions ? user.role_permissions.split(',') : [];
    const allPermissions = [...new Set([...userPerms, ...rolePerms])];

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || user.email,
      role: user.role,
      permissions: allPermissions
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please login again.'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid authentication.'
    });
  }
};
```

#### Permission Middleware

```javascript
/**
 * Admin-only access middleware
 * Requires system.admin.full permission
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const requiredPermission = 'system.admin.full';
  if (req.user.permissions?.includes(requiredPermission)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions. Access denied.'
  });
};

/**
 * Inspector or higher access
 * Requires calibration.manage.full or system.admin.full
 */
const requireInspector = (req, res, next) => {
  const requiredPermissions = ['calibration.manage.full', 'system.admin.full'];
  const hasPermission = requiredPermissions.some(perm =>
    req.user.permissions?.includes(perm)
  );

  if (hasPermission) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions. Access denied.'
  });
};
```

#### Usage in Routes

```javascript
const { authenticateToken, requireAdmin } = require('../../../infrastructure/middleware/auth');

router.post('/gauges',
  authenticateToken,
  checkPermission('gauge.create.access'),
  async (req, res, next) => {
    // req.user is available here
    const gauge = await gaugeService.createGauge(req.body, req.user.id);
    res.json({ success: true, data: gauge });
  }
);

router.delete('/gauges/:id',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    // Only admins can access this
  }
);
```

## Database Connection Pooling

### Connection Management

**Location**: `infrastructure/database/connection.js`

#### Pool Initialization

```javascript
const mysql = require('mysql2/promise');
const config = require('../config/config');

let pool;

async function initializePool() {
  if (!config.database.host || !config.database.password) {
    console.warn('⚠️ Database configuration incomplete - skipping pool initialization');
    return null;
  }

  try {
    // Resolve hostname (supports IPv4 and IPv6 for Railway)
    const resolvedHost = await resolveHost(config.database.host);

    pool = mysql.createPool({
      host: resolvedHost,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 15000, // 15 seconds for Railway
      ssl: config.database.ssl === true ? { rejectUnauthorized: false } : false
    });

    // Prove connectivity
    await pool.query('SELECT 1');

    console.log('✅ MySQL pool initialized successfully');
    return pool;
  } catch (error) {
    console.error('❌ Failed to initialize MySQL pool:', error);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

async function initializeDatabase() {
  if (initializationPromise) {
    return initializationPromise;
  }

  const config = require('../config/config');
  if (!config.database.host || !config.database.password) {
    console.log('🔄 Database configuration missing - skipping initialization');
    return null;
  }

  initializationPromise = startDatabaseInitialization();
  await initializationPromise;
  return pool;
}

module.exports = {
  get pool() {
    if (!pool) {
      console.warn('⚠️ Database pool not ready');
      return null;
    }
    return pool;
  },
  initializePool,
  initializeDatabase,
  getPool,
  isReady: () => !!pool
};
```

#### Pool Health Monitoring

```javascript
function getPoolStats() {
  try {
    const poolImpl = pool.pool;
    if (poolImpl && poolImpl._allConnections && poolImpl._freeConnections) {
      return {
        connectionLimit: poolImpl.config.connectionLimit,
        totalConnections: poolImpl._allConnections.length,
        activeConnections: poolImpl._allConnections.length - poolImpl._freeConnections.length,
        idleConnections: poolImpl._freeConnections.length,
        queuedRequests: poolImpl._connectionQueue ? poolImpl._connectionQueue.length : 0,
        status: 'detailed_monitoring'
      };
    }
  } catch (error) {
    return {
      connectionLimit: 50,
      status: 'monitoring_error',
      error: error.message
    };
  }
}
```

## Audit Logging Service

### AS9102 Compliant Audit Trail

**Location**: `infrastructure/audit/auditService.js`

#### AuditService Implementation

```javascript
const crypto = require('crypto');
const connection = require('../database/connection');
const logger = require('../utils/logger');

class AuditService {
  constructor() {
    this.lastHash = null;
    this.initialized = false;
  }

  /**
   * Initialize the hash chain with the last audit entry
   */
  async initializeHashChain() {
    if (this.initialized) return;

    if (!connection.isReady() || !connection.pool) {
      logger.warn('Database not ready - skipping audit hash chain initialization');
      this.initialized = true;
      return;
    }

    try {
      const [lastEntry] = await connection.pool.execute(
        'SELECT hash_chain FROM core_audit_log ORDER BY id DESC LIMIT 1'
      );

      if (lastEntry.length > 0 && lastEntry[0].hash_chain) {
        this.lastHash = lastEntry[0].hash_chain;
      }
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize audit hash chain', { error: error.message });
      this.initialized = true;
    }
  }

  /**
   * Log a user action with AS9102 compliance
   */
  async logAction(auditData, dbConnection = null) {
    if (!connection.isReady() || !connection.pool) {
      logger.warn('Database not ready - skipping audit log', { action: auditData.action });
      return null;
    }

    const conn = dbConnection || connection.pool;

    try {
      // Generate hash chain
      const hashData = this.generateHash(auditData) || { currentHash: null, previousHash: null };

      // Digital signature for critical operations
      const signature = this.isOperationCritical(auditData.action)
        ? this.generateDigitalSignature(auditData)
        : null;

      const query = `
        INSERT INTO core_audit_log (
          user_id, module_id, action, entity_type, entity_id,
          old_values, new_values,
          ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        auditData.userId || null,
        auditData.module || 'system',
        auditData.action || 'unknown',
        auditData.tableName || auditData.entity_type || null,
        auditData.recordId || auditData.entity_id || null,
        auditData.oldValues ? JSON.stringify(auditData.oldValues) : null,
        auditData.newValues ? JSON.stringify(auditData.newValues) : null,
        auditData.ipAddress || null,
        auditData.userAgent || null
      ];

      const [result] = await conn.execute(query, values);

      // Update last hash for chain
      this.lastHash = hashData.currentHash;

      return result.insertId;
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: error.message,
        action: auditData.action,
        userId: auditData.userId
      });
      throw error;
    }
  }

  /**
   * Generate hash for audit entry (tamper-proof)
   */
  generateHash(auditData) {
    const dataToHash = {
      userId: auditData.userId,
      action: auditData.action,
      tableName: auditData.tableName,
      recordId: auditData.recordId,
      details: auditData.details,
      timestamp: new Date().toISOString(),
      previousHash: this.lastHash
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(dataToHash))
      .digest('hex');

    return {
      currentHash: hash,
      previousHash: this.lastHash
    };
  }

  /**
   * Check if operation is critical (requires digital signature)
   */
  isOperationCritical(action) {
    const criticalOperations = [
      'delete',
      'configuration_change',
      'create_user',
      'modify_permissions',
      'calibration_update',
      'as9102_approval'
    ];

    return criticalOperations.includes(action);
  }
}

const auditService = new AuditService();
module.exports = auditService;
```

#### Usage in Services

```javascript
const auditService = require('../../../infrastructure/audit/auditService');

class GaugeCreationService extends BaseService {
  async createGauge(gaugeData, userId) {
    const gauge = await this.repository.createGauge(gaugeData);

    await auditService.logAction({
      module: 'gauge',
      action: 'gauge_created',
      tableName: 'gauges',
      recordId: gauge.id,
      userId: userId,
      ipAddress: '127.0.0.1',
      newValues: {
        gauge_id: gauge.gauge_id,
        name: gauge.name,
        equipment_type: gauge.equipment_type
      }
    });

    return gauge;
  }

  async updateGauge(id, updates, userId) {
    const oldGauge = await this.repository.getGaugeById(id);
    const gauge = await this.repository.updateGauge(id, updates);

    await auditService.logAction({
      module: 'gauge',
      action: 'gauge_updated',
      tableName: 'gauges',
      recordId: id,
      userId,
      oldValues: { name: oldGauge.name },
      newValues: { name: updates.name }
    });

    return gauge;
  }
}
```

## Error Handling

### Error Handler Middleware

**Location**: `infrastructure/middleware/errorHandler.js`

#### Global Error Handler

```javascript
const { classifyDatabaseError, createErrorResponse } = require('../utils/errorClassifier');

async function globalErrorHandler(error, req, res, next) {
  const requestId = req.requestId || uuidv4();

  let statusCode = 500;
  let errorResponse = {
    success: false,
    error: 'Internal server error',
    requestId,
    timestamp: new Date().toISOString()
  };

  try {
    if (isDatabaseError(error)) {
      const classification = classifyDatabaseError(error, requestId);
      statusCode = classification.status;
      errorResponse = createErrorResponse(classification, req.originalUrl);
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorResponse.error = error.message || 'Validation failed';
      errorResponse.code = error.code || 'VALIDATION_ERROR';
    } else if (error.message) {
      errorResponse.error = process.env.NODE_ENV === 'development' ? error.message : 'Internal server error';
    }

    // Log to audit trail
    await auditService.logSystemError({
      error,
      request: req,
      category: 'system_error',
      requestId
    });

    res.status(statusCode).json(errorResponse);
  } catch (handlingError) {
    logger.error('Error handler failed', {
      requestId,
      originalError: error.message,
      handlingError: handlingError.message
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Standard Error Response Format

```javascript
{
  success: false,
  message: 'User-friendly message',
  error: 'Detailed error (development only)',
  code: 'ERROR_CODE',
  requestId: 'uuid',
  timestamp: '2025-01-07T10:30:00Z'
}
```

## Event Bus System

### EventBus Implementation

**Location**: `infrastructure/events/EventBus.js`

```javascript
const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Increase for multiple modules
  }

  emit(eventName, data) {
    logger.debug('Event emitted', { eventName, data });
    return super.emit(eventName, data);
  }

  on(eventName, listener) {
    logger.debug('Event listener registered', { eventName });
    return super.on(eventName, listener);
  }
}

const eventBus = new EventBus();
module.exports = eventBus;
```

### Usage

```javascript
const eventBus = require('../../../infrastructure/events/EventBus');

// Emit events
class GaugeSetService {
  async createGaugeSet(goData, noGoData, userId) {
    const result = await this.executeInTransaction(async (connection) => {
      // Create set...
      return { goGauge, noGoGauge, setId };
    });

    // Emit event for other modules
    eventBus.emit('gauge:set_created', {
      type: 'gauge_set_created',
      data: { setId: result.setId },
      timestamp: new Date()
    });

    return result;
  }
}

// Listen for events
eventBus.on('gauge:set_created', async (event) => {
  logger.info('Gauge set created', event.data);
  await notificationService.notifySetCreated(event.data);
});
```

## Best Practices

### 1. Always Use Infrastructure Services

```javascript
// ✅ CORRECT - Use infrastructure auth
const { authenticateToken } = require('../../../infrastructure/middleware/auth');

// ❌ WRONG - Custom auth in module
const customAuth = (req, res, next) => { /* custom logic */ };
```

### 2. Centralize Error Handling

```javascript
// ✅ CORRECT - Let middleware handle errors
async (req, res, next) => {
  try {
    const result = await service.doSomething();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error); // Pass to error handler middleware
  }
};

// ❌ WRONG - Handle errors in route
async (req, res) => {
  try {
    const result = await service.doSomething();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message }); // Inconsistent format
  }
};
```

### 3. Use Audit Service for All Data Changes

```javascript
// Always log data modifications
await auditService.logAction({
  module: 'gauge',
  action: 'gauge_updated',
  tableName: 'gauges',
  recordId: id,
  userId,
  oldValues: { /* before */ },
  newValues: { /* after */ }
});
```
