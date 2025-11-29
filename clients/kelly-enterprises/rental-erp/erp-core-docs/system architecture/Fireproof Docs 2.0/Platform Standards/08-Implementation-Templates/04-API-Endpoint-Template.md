# API Endpoint Template

Ready-to-use template for creating Express.js API routes with authentication, validation, and error handling.

## Template

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../../../infrastructure/middleware/auth');
const logger = require('../../../infrastructure/utils/logger');

// TODO: Import your repository and service
const [Module]Repository = require('../repositories/[Module]Repository');
const [Module]Service = require('../services/[Module]Service');

// Initialize service
const [module]Repository = new [Module]Repository();
const [module]Service = new [Module]Service([module]Repository);

/**
 * @route   GET /api/[module]
 * @desc    Get all [module items] with pagination and filters
 * @access  Private
 * TODO: Add query parameter validation
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      category
      // TODO: Add more query parameters
    } = req.query;

    // TODO: Validate query parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(422).json({
        success: false,
        message: 'Invalid pagination parameters',
        errors: [
          { field: 'page', message: 'Page must be >= 1' },
          { field: 'limit', message: 'Limit must be between 1 and 100' }
        ]
      });
    }

    // TODO: Call service method
    const filters = { search, status, category };
    const items = await [module]Service.getAll({
      page: pageNum,
      limit: limitNum,
      ...filters
    });

    const total = await [module]Service.countAll(filters);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      _links: {
        self: `/api/[module]?page=${pageNum}&limit=${limitNum}`,
        first: `/api/[module]?page=1&limit=${limitNum}`,
        last: `/api/[module]?page=${Math.ceil(total / limitNum)}&limit=${limitNum}`,
        next: pageNum < Math.ceil(total / limitNum) ? `/api/[module]?page=${pageNum + 1}&limit=${limitNum}` : null,
        prev: pageNum > 1 ? `/api/[module]?page=${pageNum - 1}&limit=${limitNum}` : null
      }
    });
  } catch (error) {
    logger.error('[Module] list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch [module items]',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/[module]/:id
 * @desc    Get [module item] by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Validate ID format if needed
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
    }

    const item = await [module]Service.get[ModuleName]ById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: '[Module item] not found'
      });
    }

    res.json({
      success: true,
      data: item,
      _links: {
        self: `/api/[module]/${id}`,
        collection: `/api/[module]`
      }
    });
  } catch (error) {
    logger.error('[Module] get error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch [module item]',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/[module]
 * @desc    Create new [module item]
 * @access  Private - Requires operator role
 * TODO: Add comprehensive request validation
 */
router.post('/', authenticateToken, requireRole('operator'), async (req, res) => {
  try {
    const userId = req.user.user_id;
    const data = req.body;

    // TODO: Validate required fields
    const requiredFields = ['field1', 'field2']; // Replace with actual fields
    const missing = requiredFields.filter(field => !data[field]);

    if (missing.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'Missing required fields',
        errors: missing.map(field => ({
          field,
          message: `${field} is required`
        }))
      });
    }

    // TODO: Add field-specific validation
    // Example:
    // if (data.email && !isValidEmail(data.email)) {
    //   return res.status(422).json({
    //     success: false,
    //     message: 'Invalid email format'
    //   });
    // }

    const item = await [module]Service.create[ModuleName](data, userId);

    res.status(201).json({
      success: true,
      message: '[Module item] created successfully',
      data: item,
      _links: {
        self: `/api/[module]/${item.id}`,
        collection: `/api/[module]`
      }
    });
  } catch (error) {
    logger.error('[Module] create error:', error);

    // Handle specific business logic errors
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('required')) {
      return res.status(422).json({
        success: false,
        message: error.message
      });
    }

    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   PATCH /api/[module]/:id
 * @desc    Update [module item]
 * @access  Private - Requires operator role
 * TODO: Add update field validation
 */
router.patch('/:id', authenticateToken, requireRole('operator'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const updates = req.body;

    // TODO: Validate update fields
    // Filter out empty/undefined values
    const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});

    if (Object.keys(cleanUpdates).length === 0) {
      return res.status(422).json({
        success: false,
        message: 'No valid update fields provided'
      });
    }

    // TODO: Validate specific fields
    // Example:
    // if (cleanUpdates.email && !isValidEmail(cleanUpdates.email)) {
    //   return res.status(422).json({
    //     success: false,
    //     message: 'Invalid email format'
    //   });
    // }

    const item = await [module]Service.update[ModuleName](id, cleanUpdates, userId);

    res.json({
      success: true,
      message: '[Module item] updated successfully',
      data: item,
      _links: {
        self: `/api/[module]/${id}`,
        collection: `/api/[module]`
      }
    });
  } catch (error) {
    logger.error('[Module] update error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   DELETE /api/[module]/:id
 * @desc    Delete [module item] (soft delete)
 * @access  Private - Requires admin role
 */
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    await [module]Service.delete[ModuleName](id, userId);

    res.json({
      success: true,
      message: '[Module item] deleted successfully'
    });
  } catch (error) {
    logger.error('[Module] delete error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete [module item]',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/[module]/:id/[action]
 * @desc    Perform custom action on [module item]
 * @access  Private - Requires operator role
 * TODO: Replace with actual custom endpoint
 */
router.post('/:id/[action]', authenticateToken, requireRole('operator'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const data = req.body;

    // TODO: Implement custom action logic
    const result = await [module]Service.performCustomAction(id, data, userId);

    res.json({
      success: true,
      message: 'Action completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('[Module] custom action error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
```

## Working Example

Based on `gaugesV2.js`:

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../../../infrastructure/middleware/auth');
const logger = require('../../../infrastructure/utils/logger');
const GaugeRepository = require('../repositories/GaugeRepository');
const GaugeService = require('../services/GaugeService');

const gaugeRepository = new GaugeRepository();
const gaugeService = new GaugeService(gaugeRepository);

/**
 * @route   GET /api/gauges
 * @desc    Get all gauges with pagination
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(422).json({
        success: false,
        errors: [
          { field: 'page', message: 'Page must be >= 1' },
          { field: 'limit', message: 'Limit must be 1-100' }
        ]
      });
    }

    const gauges = await gaugeService.getAll({
      page: pageNum,
      limit: limitNum,
      search,
      status
    });

    res.json({
      success: true,
      data: gauges,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: gauges.length
      }
    });
  } catch (error) {
    logger.error('Gauge list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gauges'
    });
  }
});

/**
 * @route   PATCH /api/gauges/:id
 * @desc    Update gauge
 * @access  Private - Operator
 */
router.patch('/:id', authenticateToken, requireRole('operator'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const updates = req.body;

    const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});

    const gauge = await gaugeService.updateGauge(id, cleanUpdates, userId);

    res.json({
      success: true,
      message: 'Gauge updated successfully',
      data: gauge
    });
  } catch (error) {
    logger.error('Gauge update error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
```

## Common Patterns

### Pattern 1: Validation with Error Array
```javascript
router.post('/', authenticateToken, async (req, res) => {
  const errors = [];

  if (!req.body.name) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (!req.body.email || !isValidEmail(req.body.email)) {
    errors.push({ field: 'email', message: 'Valid email is required' });
  }

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Process request...
});
```

### Pattern 2: HATEOAS Links
```javascript
res.json({
  success: true,
  data: item,
  _links: {
    self: `/api/items/${item.id}`,
    collection: `/api/items`,
    related: `/api/items/${item.id}/related`
  }
});
```

### Pattern 3: Conditional Authorization
```javascript
router.patch('/:id', authenticateToken, async (req, res) => {
  const item = await service.getById(req.params.id);

  // Only owner or admin can update
  const isOwner = item.created_by === req.user.user_id;
  const isAdmin = req.user.roles.includes('admin');

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this item'
    });
  }

  // Process update...
});
```

## TODO Checklist

- [ ] Replace `[module]`, `[Module]`, `[ModuleName]` with actual names
- [ ] Add comprehensive request validation
- [ ] Add proper error handling for all cases
- [ ] Add JSDoc for all routes
- [ ] Implement pagination correctly
- [ ] Add HATEOAS links
- [ ] Test all endpoints with Postman
- [ ] Write integration tests
- [ ] Register routes in app.js

## HTTP Status Codes Reference

- `200 OK` - Successful GET, PATCH
- `201 Created` - Successful POST (creation)
- `400 Bad Request` - Client error (general)
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Resource already exists
- `422 Unprocessable Entity` - Validation failed
- `500 Internal Server Error` - Server error

## Response Format Standards

### Success Response
```json
{
  "success": true,
  "message": "Optional success message",
  "data": {},
  "_links": {
    "self": "/api/resource/123"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    { "field": "fieldName", "message": "Validation message" }
  ],
  "error": "Stack trace (dev only)"
}
```

## Best Practices

- ✅ Always use `authenticateToken` middleware
- ✅ Use `requireRole` for role-based access
- ✅ Validate all input before processing
- ✅ Return consistent response formats
- ✅ Include HATEOAS links for navigation
- ✅ Log all errors with context
- ✅ Hide error details in production
- ✅ Use proper HTTP status codes
- ✅ Handle edge cases (empty strings, null, undefined)
- ✅ Provide helpful error messages
