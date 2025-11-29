# Error Handling Standards

**Fire-Proof ERP Backend - Error Handling Patterns**

## Overview

Consistent error handling ensures proper HTTP status codes, user-friendly messages, and comprehensive logging for debugging and monitoring.

## Standard Error Response Format

### Structure

All error responses follow this format:

```javascript
{
  success: false,
  message: 'User-friendly error message',
  error: 'Detailed error (development only)',
  code: 'ERROR_CODE',
  requestId: 'uuid-v4',
  timestamp: '2025-01-07T10:30:00.000Z'
}
```

### Example Responses

#### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Name is required",
  "code": "VALIDATION_ERROR",
  "field": "name",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-07T10:30:00.000Z"
}
```

#### Authentication Error (401)
```json
{
  "success": false,
  "error": "Session expired. Please login again.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-07T10:30:00.000Z"
}
```

#### Authorization Error (403)
```json
{
  "success": false,
  "error": "Insufficient permissions. Access denied.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-07T10:30:00.000Z"
}
```

#### Not Found (404)
```json
{
  "success": false,
  "error": "Gauge not found",
  "code": "RESOURCE_NOT_FOUND",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-07T10:30:00.000Z"
}
```

#### Database Error (500)
```json
{
  "success": false,
  "message": "Database operation failed",
  "error": "Duplicate entry 'GB0001' for key 'gauge_id'",
  "code": "DB_DUPLICATE_ENTRY",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-07T10:30:00.000Z"
}
```

## HTTP Status Code Usage

### Standard Status Codes

| Code | Usage | Example |
|------|-------|---------|
| 200 | Success | GET /gauges/1 |
| 201 | Created | POST /gauges |
| 204 | No Content | DELETE /gauges/1 |
| 400 | Bad Request | Invalid gauge data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Gauge doesn't exist |
| 409 | Conflict | Duplicate gauge_id |
| 422 | Unprocessable | Business rule violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Database connection failed |
| 503 | Service Unavailable | Database not initialized |

### Status Code Decision Tree

```
Is the request valid?
├─ No → 400 Bad Request
└─ Yes
    Is the user authenticated?
    ├─ No → 401 Unauthorized
    └─ Yes
        Does the user have permission?
        ├─ No → 403 Forbidden
        └─ Yes
            Does the resource exist?
            ├─ No → 404 Not Found
            └─ Yes
                Is there a conflict?
                ├─ Yes → 409 Conflict
                └─ No
                    Is the operation valid?
                    ├─ No → 422 Unprocessable Entity
                    └─ Yes
                        Did the operation succeed?
                        ├─ Yes → 200 OK / 201 Created / 204 No Content
                        └─ No → 500 Internal Server Error
```

## Error Handler Middleware

### Global Error Handler

**Location**: `infrastructure/middleware/errorHandler.js`

```javascript
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
      // Database errors
      const classification = classifyDatabaseError(error, requestId);
      statusCode = classification.status;
      errorResponse = createErrorResponse(classification, req.originalUrl);

    } else if (error.name === 'ValidationError') {
      // Validation errors
      statusCode = 400;
      errorResponse.error = error.message || 'Validation failed';
      errorResponse.code = error.code || 'VALIDATION_ERROR';

      if (error.field) {
        errorResponse.field = error.field;
      }

    } else if (error.name === 'UnauthorizedError') {
      // JWT authentication errors
      statusCode = 401;
      errorResponse.error = 'Invalid or expired token';

    } else if (error.message) {
      // Generic errors
      errorResponse.error = process.env.NODE_ENV === 'development'
        ? error.message
        : 'Internal server error';
    }

    // Log to audit trail
    await auditService.logSystemError({
      error,
      request: req,
      category: getErrorCategory(error),
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

### Database Error Classification

```javascript
function classifyDatabaseError(error, requestId) {
  const sqlState = error.sqlState;
  const errno = error.errno;
  const code = error.code;

  // Duplicate entry
  if (errno === 1062 || code === 'ER_DUP_ENTRY') {
    return {
      status: 409,
      category: 'duplicate_entry',
      message: 'Resource already exists',
      error: extractDuplicateField(error.sqlMessage),
      code: 'DB_DUPLICATE_ENTRY'
    };
  }

  // Foreign key constraint
  if (errno === 1452 || code === 'ER_NO_REFERENCED_ROW_2') {
    return {
      status: 422,
      category: 'foreign_key_violation',
      message: 'Referenced resource does not exist',
      code: 'DB_FOREIGN_KEY_VIOLATION'
    };
  }

  // Deadlock
  if (errno === 1213 || code === 'ER_LOCK_DEADLOCK') {
    return {
      status: 409,
      category: 'deadlock',
      message: 'Request conflict detected',
      code: 'DB_DEADLOCK'
    };
  }

  // Connection error
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
    return {
      status: 503,
      category: 'connection_error',
      message: 'Database temporarily unavailable',
      code: 'DB_CONNECTION_ERROR'
    };
  }

  // Generic database error
  return {
    status: 500,
    category: 'database_error',
    message: 'Database operation failed',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    code: 'DB_ERROR'
  };
}
```

## Error Logging Patterns

### Service Layer Error Logging

```javascript
class GaugeCreationService extends BaseService {
  async createGauge(gaugeData, userId) {
    try {
      // Validation
      const validationService = serviceRegistry.get('GaugeValidationService');
      gaugeData = validationService.normalizeThreadData(gaugeData);

      // Business logic
      const gauge = await this.repository.createGauge(gaugeData);

      // Audit trail
      await this.auditService.logAction({ ... });

      return gauge;

    } catch (error) {
      logger.error('Failed to create gauge:', {
        error: error.message,
        gaugeData,
        userId,
        stack: error.stack,
        sqlState: error.sqlState,
        errno: error.errno
      });
      throw error; // Rethrow for error handler middleware
    }
  }
}
```

### Repository Layer Error Logging

```javascript
class GaugeRepository extends BaseRepository {
  async create(data, conn) {
    try {
      const [result] = await connection.execute(query, values);
      return { id: result.insertId, ...data };

    } catch (error) {
      logger.error(`${this.constructor.name}.create failed:`, {
        error: error.message,
        table: this.tableName,
        columns: Object.keys(data),
        sqlState: error.sqlState,
        errno: error.errno
      });
      throw error;
    }
  }
}
```

### Route Layer Error Handling

```javascript
// ✅ CORRECT - Let middleware handle errors
router.post('/gauges', authenticateToken, async (req, res, next) => {
  try {
    const gauge = await gaugeCreationService.createGauge(req.body, req.user.id);
    res.status(201).json({ success: true, data: gauge });
  } catch (error) {
    next(error); // Pass to error handler middleware
  }
});

// ❌ WRONG - Handle errors in route
router.post('/gauges', authenticateToken, async (req, res) => {
  try {
    const gauge = await gaugeCreationService.createGauge(req.body, req.user.id);
    res.status(201).json({ success: true, data: gauge });
  } catch (error) {
    res.status(500).json({ error: error.message }); // Inconsistent format
  }
});
```

## Custom Error Classes

### ValidationError

**Location**: `infrastructure/errors/ValidationError.js`

```javascript
class ValidationError extends Error {
  constructor(message, field = null, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

module.exports = ValidationError;
```

### Usage

```javascript
const ValidationError = require('../../../infrastructure/errors/ValidationError');

class GaugeValidationService {
  normalizeThreadData(gaugeData) {
    if (!gaugeData.name) {
      throw new ValidationError('Name is required', 'name');
    }

    if (gaugeData.thread_size && !this.isValidThreadSize(gaugeData.thread_size)) {
      throw new ValidationError(
        'Invalid thread size format',
        'thread_size',
        'INVALID_THREAD_SIZE'
      );
    }

    return gaugeData;
  }
}
```

### Domain Validation Error

```javascript
class DomainValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'DomainValidationError';
    this.details = details;
  }
}

// Usage in domain entities
class GaugeSet {
  constructor({ baseId, goGauge, noGoGauge, category }) {
    this.validateCompanionCompatibility(goGauge, noGoGauge);
  }

  validateCompanionCompatibility(go, noGo) {
    if (go.threadSize !== noGo.threadSize) {
      throw new DomainValidationError(
        'Thread sizes must match for companion gauges',
        { goSize: go.threadSize, noGoSize: noGo.threadSize }
      );
    }
  }
}
```

## Error Handling Patterns

### Pattern 1: Try-Catch with Specific Handling

```javascript
async createGaugeSet(goData, noGoData, userId) {
  try {
    // Validate category restrictions
    const category = await this.gaugeReferenceRepository.getCategoryById(
      goData.category_id
    );

    if (category.name === 'NPT') {
      throw new ValidationError('NPT gauges cannot have companion pairs');
    }

    // Create set...
    return result;

  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn('Gauge set validation failed:', {
        error: error.message,
        field: error.field
      });
    } else {
      logger.error('Failed to create gauge set:', {
        error: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}
```

### Pattern 2: Graceful Degradation

```javascript
async createGauge(gaugeData, userId) {
  const gauge = await this.repository.createGauge(gaugeData);

  // Record in inventory (optional - don't fail if inventory is down)
  if (gaugeData.location) {
    try {
      await this.movementService.moveItem({
        itemType: 'gauge',
        itemIdentifier: gaugeData.gauge_id,
        toLocation: gaugeData.location,
        movedBy: userId,
        movementType: 'created'
      });
    } catch (inventoryError) {
      logger.error('Failed to record gauge in inventory', {
        gaugeId: gaugeData.gauge_id,
        location: gaugeData.location,
        error: inventoryError.message
      });
      // Don't fail the whole operation if inventory update fails
    }
  }

  return gauge;
}
```

### Pattern 3: Transaction Error Handling

```javascript
async createGaugeSet(goData, noGoData, userId) {
  return this.executeInTransaction(async (connection) => {
    try {
      // All operations use the same connection
      const goGauge = await this.repository.createGauge(goData, connection);
      const noGoGauge = await this.repository.createGauge(noGoData, connection);
      await this.auditService.logAction(auditData, connection);

      return { goGauge, noGoGauge };

    } catch (error) {
      logger.error('Gauge set transaction failed:', {
        error: error.message,
        goData,
        noGoData
      });
      throw error; // Transaction will rollback
    }
  });
}
```

### Pattern 4: Error Context Enrichment

```javascript
async updateGauge(id, updates, userId) {
  try {
    const oldGauge = await this.repository.getGaugeById(id);

    if (!oldGauge) {
      const error = new Error('Gauge not found');
      error.status = 404;
      error.code = 'GAUGE_NOT_FOUND';
      throw error;
    }

    const gauge = await this.repository.updateGauge(id, updates);

    return gauge;

  } catch (error) {
    // Enrich error with context
    error.context = {
      operation: 'updateGauge',
      gaugeId: id,
      updates: Object.keys(updates),
      userId
    };

    logger.error('Failed to update gauge:', {
      error: error.message,
      context: error.context,
      stack: error.stack
    });

    throw error;
  }
}
```

## Audit Trail for Errors

### Log System Errors

```javascript
await auditService.logSystemError({
  error,
  request: req,
  category: 'database_error',
  requestId
});
```

### Log Security Events

```javascript
await auditService.logSecurityEvent({
  userId: req.user?.id,
  action: 'permission_denied',
  eventType: 'authorization_failure',
  reason: 'Insufficient permissions',
  resource: req.originalUrl,
  requiredPermissions: ['gauge.delete.access'],
  userPermissions: req.user?.permissions,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent')
});
```

## Best Practices

### 1. Use Appropriate Status Codes

```javascript
// ✅ CORRECT - Specific status codes
if (!gauge) {
  return res.status(404).json({ success: false, error: 'Gauge not found' });
}

if (gauge.set_id) {
  return res.status(422).json({
    success: false,
    error: 'Gauge is already part of a set'
  });
}

// ❌ WRONG - Generic 400 for everything
if (!gauge) {
  return res.status(400).json({ success: false, error: 'Bad request' });
}
```

### 2. Include Request IDs

```javascript
// Add request ID to all responses
app.use((req, res, next) => {
  req.requestId = uuidv4();
  next();
});

// Include in error responses
res.status(500).json({
  success: false,
  error: 'Internal server error',
  requestId: req.requestId,
  timestamp: new Date().toISOString()
});
```

### 3. Hide Sensitive Information in Production

```javascript
// ✅ CORRECT - Hide details in production
{
  success: false,
  message: 'Database operation failed',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  requestId: req.requestId
}

// ❌ WRONG - Expose stack traces in production
{
  success: false,
  error: error.message,
  stack: error.stack // Never expose in production!
}
```

### 4. Log Errors with Context

```javascript
// ✅ CORRECT - Rich context
logger.error('Failed to create gauge:', {
  error: error.message,
  gaugeData,
  userId,
  requestId: req.requestId,
  stack: error.stack,
  sqlState: error.sqlState
});

// ❌ WRONG - Minimal context
logger.error('Error:', error.message);
```

### 5. Let Middleware Handle Errors

```javascript
// ✅ CORRECT - Pass to middleware
router.post('/gauges', async (req, res, next) => {
  try {
    const result = await service.createGauge(req.body, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error); // Let error handler middleware process
  }
});

// ❌ WRONG - Handle in route
router.post('/gauges', async (req, res) => {
  try {
    const result = await service.createGauge(req.body, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message }); // Inconsistent
  }
});
```
