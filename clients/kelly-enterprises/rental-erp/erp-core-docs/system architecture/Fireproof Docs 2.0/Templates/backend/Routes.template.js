/**
 * {{ENTITY_NAME}} Routes - REST API Endpoints Template
 *
 * USAGE:
 * Replace placeholders with actual values:
 * - {{ENTITY_NAME}} → PascalCase entity name (e.g., "Gauge", "Customer", "Order")
 * - {{ENTITY_LOWER}} → Lowercase entity name (e.g., "gauge", "customer", "order")
 * - {{ENTITY_LOWER_PLURAL}} → Lowercase plural (e.g., "gauges", "customers", "orders")
 * - {{API_PREFIX}} → API prefix (e.g., "/api/gauges", "/api/customers", "/api/orders")
 *
 * PATTERN: Route Layer (REST API)
 * - Express router with middleware stacking (auth → validate → handle → logic)
 * - Express-validator for field validation
 * - Async error handling wrapper for clean error propagation
 * - Service registry injection for loose coupling
 * - Database connection pooling via getPool()
 * - Consistent response format: { success: true/false, data/message, error }
 *
 * MIDDLEWARE STACK:
 * 1. authenticateToken: JWT authentication (required for all routes)
 * 2. Validation middleware: express-validator rules
 * 3. handleValidationErrors: Check validation results
 * 4. asyncErrorHandler: Catch async errors and pass to error middleware
 *
 * ENDPOINTS:
 * - GET    {{API_PREFIX}}          - List entities with filters
 * - POST   {{API_PREFIX}}          - Create single entity
 * - GET    {{API_PREFIX}}/:id      - Get entity details
 * - PUT    {{API_PREFIX}}/:id      - Update entity
 * - DELETE {{API_PREFIX}}/:id      - Delete entity (soft)
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();
const { authenticateToken, requireOperator } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const logger = require('../../../infrastructure/utils/logger');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const { getPool } = require('../../../infrastructure/database/connection');

// ========== VALIDATION MIDDLEWARE ==========

/**
 * Validation rules for entity creation
 * Add/modify rules based on your entity's required fields
 */
const validateCreate = [
  body('name').notEmpty().withMessage('Name is required'),
  body('status').optional().isIn(['active', 'inactive', 'pending'])
    .withMessage('Invalid status'),
  // ========== CUSTOMIZATION POINT: Add Entity-Specific Validation ==========
  // body('category_id').isInt({ min: 1 }).withMessage('Category ID is required'),
  // body('{{ENTITY_BUSINESS_ID}}').notEmpty().withMessage('{{ENTITY_BUSINESS_ID}} is required')
];

/**
 * Validation rules for entity update
 * Usually less strict than creation (all fields optional)
 */
const validateUpdate = [
  body('name').optional().notEmpty(),
  body('status').optional().isIn(['active', 'inactive', 'pending'])
];

/**
 * Validation rules for query parameters (list/search)
 */
const validateQuery = [
  query('status').optional().isIn(['active', 'inactive', 'pending']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString()
];

/**
 * Helper function to handle validation errors
 * Checks validation result and returns 400 if errors exist
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// ========== ROUTE HANDLERS ==========

/**
 * GET {{API_PREFIX}}
 * List entities with optional filtering and pagination
 */
router.get('/',
  authenticateToken,
  validateQuery,
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    try {
      const { status, search, page = 1, limit = 50 } = req.query;
      const {{ENTITY_LOWER}}Service = serviceRegistry.get('{{ENTITY_NAME}}Service');

      // ========== CUSTOMIZATION POINT: Build Filters ==========
      const filters = {
        status,
        search,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      // Get entities with filters
      const result = await {{ENTITY_LOWER}}Service.getAll(filters);

      logger.info('Retrieved {{ENTITY_LOWER_PLURAL}}', {
        filters,
        count: result.data?.length || 0,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: result.data || result,
        pagination: result.pagination || {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.data?.length || 0
        }
      });
    } catch (error) {
      logger.error('Error retrieving {{ENTITY_LOWER_PLURAL}}', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve {{ENTITY_LOWER_PLURAL}}',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * POST {{API_PREFIX}}
 * Create a new entity
 */
router.post('/',
  authenticateToken,
  requireOperator, // ========== CUSTOMIZATION POINT: Adjust role requirement
  validateCreate,
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    try {
      const {{ENTITY_LOWER}}Service = serviceRegistry.get('{{ENTITY_NAME}}Service');

      // Create entity
      const created = await {{ENTITY_LOWER}}Service.create{{ENTITY_NAME}}(req.body, req.user.id);

      logger.info('Created {{ENTITY_LOWER}} successfully', {
        {{ENTITY_LOWER}}Id: created.id,
        {{ENTITY_BUSINESS_ID}}: created.{{ENTITY_BUSINESS_ID}},
        userId: req.user.id
      });

      res.status(201).json({
        success: true,
        message: '{{ENTITY_NAME}} created successfully',
        data: created
      });
    } catch (error) {
      logger.error('Error creating {{ENTITY_LOWER}}', {
        error: error.message,
        body: req.body,
        userId: req.user?.id
      });

      // Handle specific business rule violations
      if (error.message.includes('already exists') ||
          error.message.includes('duplicate')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create {{ENTITY_LOWER}}',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * GET {{API_PREFIX}}/:id
 * Get entity details by ID
 */
router.get('/:id',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const {{ENTITY_LOWER}}Service = serviceRegistry.get('{{ENTITY_NAME}}Service');

      // Get entity by ID
      const entity = await {{ENTITY_LOWER}}Service.get{{ENTITY_NAME}}ById(id);

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: '{{ENTITY_NAME}} not found'
        });
      }

      logger.info('Retrieved {{ENTITY_LOWER}} details', {
        {{ENTITY_LOWER}}Id: id,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: entity
      });
    } catch (error) {
      logger.error('Error retrieving {{ENTITY_LOWER}} details', {
        id: req.params.id,
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve {{ENTITY_LOWER}}',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * PUT {{API_PREFIX}}/:id
 * Update an existing entity
 */
router.put('/:id',
  authenticateToken,
  requireOperator, // ========== CUSTOMIZATION POINT: Adjust role requirement
  validateUpdate,
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const {{ENTITY_LOWER}}Service = serviceRegistry.get('{{ENTITY_NAME}}Service');

      // Update entity
      const updated = await {{ENTITY_LOWER}}Service.update{{ENTITY_NAME}}(id, req.body, req.user.id);

      logger.info('Updated {{ENTITY_LOWER}} successfully', {
        {{ENTITY_LOWER}}Id: id,
        updates: Object.keys(req.body),
        userId: req.user.id
      });

      res.json({
        success: true,
        message: '{{ENTITY_NAME}} updated successfully',
        data: updated
      });
    } catch (error) {
      logger.error('Error updating {{ENTITY_LOWER}}', {
        id: req.params.id,
        error: error.message,
        userId: req.user?.id
      });

      // Handle not found errors
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update {{ENTITY_LOWER}}',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * DELETE {{API_PREFIX}}/:id
 * Delete an entity (soft delete)
 */
router.delete('/:id',
  authenticateToken,
  requireOperator, // ========== CUSTOMIZATION POINT: Adjust role requirement
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const {{ENTITY_LOWER}}Service = serviceRegistry.get('{{ENTITY_NAME}}Service');

      // Delete entity (soft delete)
      const result = await {{ENTITY_LOWER}}Service.delete{{ENTITY_NAME}}(id, req.user.id);

      logger.info('Deleted {{ENTITY_LOWER}} successfully', {
        {{ENTITY_LOWER}}Id: id,
        userId: req.user.id
      });

      res.json({
        success: true,
        message: '{{ENTITY_NAME}} deleted successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error deleting {{ENTITY_LOWER}}', {
        id: req.params.id,
        error: error.message,
        userId: req.user?.id
      });

      // Handle not found errors
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete {{ENTITY_LOWER}}',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

// ========== CUSTOMIZATION POINT: Add Entity-Specific Routes ==========
/**
 * Example: GET {{API_PREFIX}}/search
 * Advanced search with complex filters
 *
 * router.get('/search',
 *   authenticateToken,
 *   validateSearchQuery,
 *   handleValidationErrors,
 *   asyncErrorHandler(async (req, res) => {
 *     const {{ENTITY_LOWER}}Service = serviceRegistry.get('{{ENTITY_NAME}}Service');
 *     const results = await {{ENTITY_LOWER}}Service.search(req.query);
 *     res.json({ success: true, data: results });
 *   })
 * );
 */

/**
 * Example: POST {{API_PREFIX}}/:id/action
 * Perform a specific workflow action
 *
 * router.post('/:id/action',
 *   authenticateToken,
 *   requireOperator,
 *   [
 *     body('action_type').isIn(['approve', 'reject', 'complete']).withMessage('Invalid action type'),
 *     body('notes').optional().isString()
 *   ],
 *   handleValidationErrors,
 *   asyncErrorHandler(async (req, res) => {
 *     const {{ENTITY_LOWER}}Service = serviceRegistry.get('{{ENTITY_NAME}}Service');
 *     const result = await {{ENTITY_LOWER}}Service.performAction(
 *       req.params.id,
 *       req.body,
 *       req.user.id
 *     );
 *     res.json({ success: true, message: 'Action completed', data: result });
 *   })
 * );
 */

module.exports = router;

/* ========== IMPLEMENTATION CHECKLIST ==========

1. Replace all {{PLACEHOLDERS}} with actual values
2. Customize validation rules (validateCreate, validateUpdate, validateQuery)
3. Adjust authentication/authorization middleware (requireOperator, requireAdmin, etc.)
4. Add entity-specific routes (search, workflows, actions, etc.)
5. Update filter logic in GET / route to match your entity's searchable fields
6. Test all endpoints with Postman or similar tool
7. Register routes in backend/src/routes/index.js:
   app.use('{{API_PREFIX}}', require('./modules/{{ENTITY_LOWER}}/routes/{{ENTITY_LOWER_PLURAL}}'));

*/
