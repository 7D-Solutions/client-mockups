# API Standards

Comprehensive API design and implementation standards for the Fire-Proof ERP Platform.

## Table of Contents

- [API Architecture](#api-architecture)
- [Endpoint Patterns](#endpoint-patterns)
- [Authentication & Authorization](#authentication--authorization)
- [Request/Response Format](#requestresponse-format)
- [Error Handling](#error-handling)
- [Validation](#validation)
- [API Versioning](#api-versioning)
- [Status Codes](#status-codes)
- [Best Practices](#best-practices)

---

## API Architecture

### RESTful Design Principles

The Fire-Proof ERP Platform follows REST architectural principles:

- **Resource-Based URLs**: URLs represent resources, not actions
- **HTTP Methods**: Standard HTTP methods (GET, POST, PUT/PATCH, DELETE)
- **Stateless**: Each request contains all necessary information
- **Standard Status Codes**: Meaningful HTTP status codes
- **JSON Format**: All requests/responses use JSON

### Service Structure

```
/backend/src/modules/{module}/routes/
├── {resource}.routes.js      # Main resource routes
├── {resource}-v2.js          # Versioned routes
└── {resource}-{feature}.js   # Feature-specific routes
```

---

## Endpoint Patterns

### URL Structure

**Pattern**: `/api/{module}/{resource}[/{id}][/{sub-resource}]`

```
/api/gauges/v2                    # Main resource collection
/api/gauges/v2/123                # Specific resource
/api/gauges/v2/categories         # Sub-resource collection
/api/gauges/v2/123/certificates   # Nested resource
/api/admin/users                  # Module-scoped resources
/api/auth/login                   # Authentication endpoints
```

### HTTP Method Conventions

| Method   | Action | Endpoint Pattern | Response |
|----------|--------|------------------|----------|
| `GET`    | List/Retrieve | `/api/{resource}` | 200 + array |
| `GET`    | Retrieve | `/api/{resource}/{id}` | 200 + object |
| `POST`   | Create | `/api/{resource}` | 201 + created object |
| `PUT`    | Replace | `/api/{resource}/{id}` | 200 + updated object |
| `PATCH`  | Update | `/api/{resource}/{id}` | 200 + updated object |
| `DELETE` | Delete | `/api/{resource}/{id}` | 200 or 204 |

### Real-World Examples

```javascript
// GET /api/gauges/v2 - List all gauges
router.get('/gauges/v2', authenticateToken, async (req, res) => {
    const gauges = await gaugeService.getAllGauges();
    res.json({ success: true, data: gauges });
});

// GET /api/gauges/v2/:id - Get specific gauge
router.get('/gauges/v2/:id', authenticateToken, async (req, res) => {
    const gauge = await gaugeService.getGaugeById(req.params.id);
    res.json({ success: true, data: gauge });
});

// POST /api/gauges/v2/create - Create gauge
router.post('/gauges/v2/create', authenticateToken, requireOperator, async (req, res) => {
    const newGauge = await gaugeService.createGaugeV2(req.body, req.user.id);
    res.status(201).json({ success: true, data: newGauge });
});

// POST /api/gauges/v2/create-set - Create gauge set (domain action)
router.post('/gauges/v2/create-set', authenticateToken, requireOperator, async (req, res) => {
    const result = await gaugeService.createGaugeSet(req.body.goGauge, req.body.noGoGauge, req.user.id);
    res.status(201).json({ success: true, data: result });
});
```

### Query Parameters

Use query parameters for filtering, sorting, and pagination:

```javascript
// GET /api/gauges/v2/spares?equipment_type=thread_gauge&category_id=31&is_go_gauge=true
router.get('/spares', authenticateToken, async (req, res) => {
    const { equipment_type, category_id, thread_size, thread_class, is_go_gauge } = req.query;

    const spares = await gaugeService.getSpares({
        equipment_type,
        category_id,
        thread_size,
        thread_class,
        is_go_gauge: is_go_gauge === 'true' ? true : is_go_gauge === 'false' ? false : undefined,
        userRole: req.user.role
    });

    res.json({ success: true, data: spares, count: spares.length });
});
```

**Query Parameter Guidelines**:
- Use snake_case for consistency with database fields
- Boolean values: `true`/`false` strings
- Arrays: Comma-separated or repeated parameters
- Dates: ISO 8601 format (YYYY-MM-DD)

---

## Authentication & Authorization

### JWT Authentication

All API endpoints (except public routes) require JWT authentication.

**Token Location**:
1. Cookie (`authToken`) - preferred for web clients
2. Authorization header - for API clients and mobile apps

```javascript
const authenticateToken = async (req, res, next) => {
    // Try cookie first
    let token = req.cookies?.authToken;

    // Fall back to Authorization header
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

    const verified = jwt.verify(token, config.security.jwtSecret);
    req.user = await getUserWithPermissions(verified.user_id);
    next();
};
```

### Authorization Header Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### User Context

Authenticated requests include user context in `req.user`:

```javascript
req.user = {
    id: 1,
    email: 'user@example.com',
    name: 'John Doe',
    role: 'operator',
    permissions: ['gauge.create', 'gauge.update', 'gauge.read']
};
```

### Role-Based Access Control (RBAC)

The platform implements RBAC with middleware:

```javascript
// Require operator role or higher
const requireOperator = (req, res, next) => {
    if (!req.user || !['operator', 'admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Forbidden. Operator access required.'
        });
    }
    next();
};

// Require specific permission
const requirePermission = (permission) => (req, res, next) => {
    if (!req.user?.permissions.includes(permission)) {
        return res.status(403).json({
            success: false,
            error: `Forbidden. Permission required: ${permission}`
        });
    }
    next();
};

// Usage
router.post('/create', authenticateToken, requireOperator, async (req, res) => {
    // Only operators, admins, and super_admins can access
});
```

### Authentication Endpoints

```javascript
// POST /api/auth/login
{
    "email": "user@example.com",
    "password": "password123"
}

// Response
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 1,
        "email": "user@example.com",
        "name": "John Doe",
        "role": "operator"
    }
}

// POST /api/auth/logout
// Response: 200 with cookie cleared
```

---

## Request/Response Format

### Standard Request Body

All POST/PUT/PATCH requests use JSON:

```json
{
    "name": "Thread Gauge",
    "category_id": 31,
    "equipment_type": "thread_gauge",
    "storage_location": "A1-B2"
}
```

### Standard Success Response

```json
{
    "success": true,
    "data": {
        "id": 123,
        "gauge_id": "TG0001",
        "name": "Thread Gauge",
        "category_id": 31,
        "created_at": "2025-11-07T10:30:00.000Z"
    },
    "message": "Gauge created successfully"  // Optional
}
```

### List Response with Metadata

```json
{
    "success": true,
    "data": [
        { "id": 1, "name": "Gauge 1" },
        { "id": 2, "name": "Gauge 2" }
    ],
    "count": 2,
    "filters": {
        "equipment_type": "thread_gauge",
        "category_id": 31
    }
}
```

### Response Field Guidelines

- `success`: Boolean indicating request success
- `data`: The actual response payload (object or array)
- `message`: Optional user-friendly message
- `error`: Error message (only on failures)
- `errors`: Validation errors array (422 responses)
- `count`: Total count for list responses
- Metadata fields: `filters`, `pagination`, etc.

---

## Error Handling

### Error Response Format

```json
{
    "success": false,
    "message": "User-friendly error message",
    "error": "Detailed error (development only)",
    "code": "ERROR_CODE",  // Optional error code
    "errors": [            // For validation errors
        {
            "field": "email",
            "message": "Email is required"
        }
    ]
}
```

### Error Handling Pattern

```javascript
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const newGauge = await gaugeService.createGaugeV2(req.body, req.user.id);

        logger.info('Created gauge successfully', {
            gaugeId: newGauge.gauge_id,
            userId: req.user.id
        });

        res.status(201).json({
            success: true,
            data: newGauge,
            message: 'Gauge created successfully'
        });
    } catch (error) {
        logger.error('Error creating gauge', {
            error: error.message,
            equipmentType: req.body.equipment_type,
            userId: req.user?.id
        });

        // Handle specific business rule violations
        if (error.name === 'DomainValidationError' ||
            error.message.includes('NPT gauges cannot')) {
            return res.status(400).json({
                success: false,
                message: error.message,
                code: error.code
            });
        }

        // Generic server error
        res.status(500).json({
            success: false,
            message: 'Failed to create gauge',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
```

### Error Types and Status Codes

| Error Type | Status | Use Case |
|------------|--------|----------|
| Validation Error | 400 | Invalid request data |
| Validation Error (detailed) | 422 | Field-level validation |
| Authentication Error | 401 | Missing/invalid token |
| Authorization Error | 403 | Insufficient permissions |
| Not Found | 404 | Resource doesn't exist |
| Server Error | 500 | Unexpected errors |
| Database Error | 503 | Database unavailable |

---

## Validation

### Input Validation with express-validator

```javascript
const { body, query, validationResult } = require('express-validator');

// Validation rules
const validateCreateGauge = [
    body('equipment_type')
        .isIn(['thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard'])
        .withMessage('Invalid equipment type'),
    body('category_id')
        .isInt({ min: 1 })
        .withMessage('Category ID is required'),
    body('name')
        .notEmpty()
        .withMessage('Name is required'),
    body('storage_location')
        .notEmpty()
        .withMessage('Storage location is required'),
    body('thread_size')
        .optional()
        .notEmpty()
        .withMessage('Thread size cannot be empty'),
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Usage
router.post('/create',
    authenticateToken,
    requireOperator,
    validateCreateGauge,
    handleValidationErrors,
    async (req, res) => {
        // Request is validated at this point
    }
);
```

### Query Parameter Validation

```javascript
const validateSpares = [
    query('equipment_type')
        .optional()
        .isIn(['thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard'])
        .withMessage('Invalid equipment type'),
    query('category_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Category ID must be a positive integer'),
    query('is_go_gauge')
        .optional()
        .isBoolean()
        .withMessage('is_go_gauge must be a boolean')
];

router.get('/spares',
    authenticateToken,
    validateSpares,
    handleValidationErrors,
    async (req, res) => {
        // Query params are validated
    }
);
```

### Custom Field Validation

The platform uses a strict field validator to prevent unknown fields:

```javascript
const { createValidator } = require('../../../infrastructure/middleware/strictFieldValidator');
const validateGaugeFields = createValidator('gauge');

router.post('/create',
    authenticateToken,
    requireOperator,
    validateGaugeFields,  // Rejects unknown fields
    validateCreateGauge,  // Validates known fields
    handleValidationErrors,
    async (req, res) => {
        // Only known fields are present
    }
);
```

---

## API Versioning

### Versioning Strategy

The platform uses URL-based versioning for major API changes:

- **V1 (Legacy)**: `/api/gauges` - Original endpoints
- **V2 (Current)**: `/api/gauges/v2` - Gauge set management, serial number system

### Version Migration Pattern

```javascript
// v1/gauges.js - Legacy endpoint (deprecated)
router.post('/create', authenticateToken, async (req, res) => {
    // Old implementation using gauge_id as primary identifier
});

// v2/gauges-v2.js - New endpoint
router.post('/create', authenticateToken, async (req, res) => {
    // New implementation with auto-generated gauge IDs
    const newGauge = await gaugeService.createGaugeV2(req.body, req.user.id);
});
```

### Version Deprecation

When deprecating API versions:
1. Announce deprecation with sunset date
2. Add deprecation warning header
3. Maintain backwards compatibility during transition
4. Redirect to new version after sunset

```javascript
// Add deprecation header
router.use('/api/gauges', (req, res, next) => {
    res.set('X-API-Deprecation', 'This API version is deprecated. Use /api/gauges/v2');
    res.set('Sunset', 'Sat, 31 Dec 2025 23:59:59 GMT');
    next();
});
```

---

## Status Codes

### Common Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE (no response body) |
| 400 | Bad Request | Business rule validation error |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Field validation errors |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Database/service unavailable |

### Status Code Examples

```javascript
// 200 OK - Successful retrieval
res.status(200).json({ success: true, data: gauge });

// 201 Created - Resource created
res.status(201).json({
    success: true,
    data: newGauge,
    message: 'Gauge created successfully'
});

// 204 No Content - Successful deletion
res.status(204).send();

// 400 Bad Request - Business rule violation
res.status(400).json({
    success: false,
    message: 'NPT gauges cannot have gauge sets'
});

// 401 Unauthorized - Missing authentication
res.status(401).json({
    success: false,
    error: 'Access denied. Authentication required.'
});

// 403 Forbidden - Insufficient permissions
res.status(403).json({
    success: false,
    error: 'Forbidden. Operator access required.'
});

// 404 Not Found - Resource doesn't exist
res.status(404).json({
    success: false,
    message: 'Gauge not found'
});

// 422 Unprocessable Entity - Validation errors
res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors: [
        { field: 'email', message: 'Email is required' },
        { field: 'name', message: 'Name must be at least 3 characters' }
    ]
});

// 500 Internal Server Error
res.status(500).json({
    success: false,
    message: 'Failed to create gauge',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
});

// 503 Service Unavailable - Database down
res.status(503).json({
    success: false,
    error: 'Database not available'
});
```

---

## Best Practices

### DO's ✅

**URL Design**:
- Use nouns for resources, not verbs
- Use kebab-case for multi-word URLs
- Use plural nouns for collections
- Use nested routes for relationships

**Request/Response**:
- Always return JSON with `Content-Type: application/json`
- Include `success` field in all responses
- Use consistent field naming (snake_case)
- Include meaningful error messages

**Security**:
- Validate all inputs
- Use HTTPS in production
- Implement rate limiting
- Sanitize error messages in production

**Error Handling**:
- Log all errors with context
- Use appropriate HTTP status codes
- Include request ID for debugging
- Hide internal errors in production

**Documentation**:
- Document all endpoints
- Include example requests/responses
- Document required permissions
- Keep documentation up to date

### DON'Ts ❌

**URL Design**:
- Don't use verbs in URLs (`/api/createGauge` ❌)
- Don't mix naming conventions (`/api/gauges/createNew` ❌)
- Don't expose internal IDs unnecessarily
- Don't version without a strategy

**Request/Response**:
- Don't return HTML from API endpoints
- Don't mix response formats
- Don't include sensitive data in responses
- Don't use 200 for all responses

**Security**:
- Don't skip authentication on sensitive endpoints
- Don't log sensitive data
- Don't expose stack traces in production
- Don't trust client-side validation alone

**Error Handling**:
- Don't return generic "Error occurred" messages
- Don't expose database errors to clients
- Don't skip error logging
- Don't use wrong status codes

### Real-World Example

Complete endpoint implementation following all standards:

```javascript
/**
 * POST /api/gauges/v2/create-set
 * Create a gauge set (GO/NO GO gauge pair)
 *
 * @requires authentication
 * @requires operator role
 * @body {Object} goGauge - GO gauge data
 * @body {Object} noGoGauge - NO GO gauge data
 * @returns {201} Created gauge set
 * @returns {400} Business rule violation
 * @returns {422} Validation errors
 * @returns {500} Server error
 */
router.post('/create-set',
    authenticateToken,           // JWT authentication
    requireOperator,              // RBAC check
    validateGaugeFields,          // Prevent unknown fields
    validateCreateSet,            // Field validation
    handleValidationErrors,       // Return 422 on validation errors
    asyncErrorHandler(async (req, res) => {
        console.log('🚀 POST /api/gauges/v2/create-set - Request received');
        console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
        console.log('👤 User ID:', req.user?.id);

        try {
            const { goGauge, noGoGauge } = req.body;
            const gaugeService = serviceRegistry.get('GaugeService');

            // Business logic
            const result = await gaugeService.createGaugeSet(
                goGauge,
                noGoGauge,
                req.user.id
            );

            // Audit logging
            logger.info('Created gauge set successfully', {
                goId: result.go?.id,
                noGoId: result.noGo?.id,
                setId: result.setId,
                userId: req.user.id
            });

            // Success response
            res.status(201).json({
                success: true,
                message: 'Gauge set created successfully',
                data: result
            });

        } catch (error) {
            // Error logging
            logger.error('Error creating gauge set', {
                error: error.message,
                goGauge: {
                    category_id: req.body.goGauge?.category_id,
                    thread_size: req.body.goGauge?.thread_size
                },
                userId: req.user?.id
            });

            // Business rule violations (400)
            if (error.message.includes('NPT gauges cannot have gauge sets') ||
                error.message.includes('must have matching specifications')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            // Generic server error (500)
            res.status(500).json({
                success: false,
                message: 'Failed to create gauge set',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    })
);
```

---

## Related Documentation

- [Backend Standards](../02-Backend-Standards/README.md) - Backend service patterns
- [Database Standards](../03-Database-Standards/README.md) - Database schema and migrations
- [Code Quality Standards](../05-Code-Quality-Standards/README.md) - Code quality and testing
- [Authentication Guide](../../Core-Systems/Authentication/README.md) - Authentication implementation details
