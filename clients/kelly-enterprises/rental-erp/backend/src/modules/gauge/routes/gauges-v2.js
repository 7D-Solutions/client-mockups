const express = require('express');
const { query, body, validationResult } = require('express-validator');
const router = express.Router();
const { authenticateToken, requireOperator } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const logger = require('../../../infrastructure/utils/logger');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const { createValidator } = require('../../../infrastructure/middleware/strictFieldValidator');
const { getPool } = require('../../../infrastructure/database/connection');
const validateGaugeFields = createValidator('gauge');

/**
 * Gauge V2 API Routes - Gauge Set Management Endpoints
 *
 * Complete gauge set lifecycle management:
 * 1. GET  /categories/:equipmentType - Get categories by equipment type
 * 2. POST /create-set - Create gauge set (GO/NO GO pair)
 * 3. POST /pair-spares - Pair existing spare gauges into a set
 * 4. POST /replace-companion - Replace a gauge in set in a set
 * 5. POST /unpair - Unpair gauge in sets (break the set)
 * 6. GET  /spares - Get available spare gauges
 * 7. POST /create - Create a single gauge with auto-generated system ID
 *
 * Reference: UNIFIED_IMPLEMENTATION_PLAN.md Phase 4
 */

// Validation middleware
const validateEquipmentType = [
  query('equipmentType').optional().isIn(['thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard'])
    .withMessage('Invalid equipment type')
];

const validateCreateSet = [
  body('goGauge.equipment_type').equals('thread_gauge').withMessage('Equipment type must be thread_gauge'),
  body('goGauge.category_id').isInt({ min: 1 }).withMessage('GO gauge category ID is required'),
  body('goGauge.thread_size').notEmpty().withMessage('GO gauge thread size is required'),
  body('goGauge.thread_form').notEmpty().withMessage('GO gauge thread form is required'), 
  body('goGauge.thread_class').notEmpty().withMessage('GO gauge thread class is required'),
  body('goGauge.gauge_type').isIn(['plug', 'ring']).withMessage('GO gauge type must be plug or ring'),
  body('goGauge.storage_location').notEmpty().withMessage('GO gauge storage location is required'),
  body('goGauge.name').notEmpty().withMessage('GO gauge name is required'),
  body('noGoGauge.equipment_type').equals('thread_gauge').withMessage('Equipment type must be thread_gauge'),
  body('noGoGauge.category_id').isInt({ min: 1 }).withMessage('NO GO gauge category ID is required'),
  body('noGoGauge.thread_size').notEmpty().withMessage('NO GO gauge thread size is required'),
  body('noGoGauge.thread_form').notEmpty().withMessage('NO GO gauge thread form is required'),
  body('noGoGauge.thread_class').notEmpty().withMessage('NO GO gauge thread class is required'),
  body('noGoGauge.gauge_type').isIn(['plug', 'ring']).withMessage('NO GO gauge type must be plug or ring'),
  body('noGoGauge.storage_location').notEmpty().withMessage('NO GO gauge storage location is required'),
  body('noGoGauge.name').notEmpty().withMessage('NO GO gauge name is required')
];

const validateSpares = [
  query('equipment_type').optional().isIn(['thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard'])
    .withMessage('Invalid equipment type'),
  query('category_id').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer')
];

// Helper function to handle validation errors
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

/**
 * GET /api/gauges/v2/categories/:equipmentType
 * Get categories filtered by equipment type
 */
router.get('/categories/:equipmentType', 
  authenticateToken,
  validateEquipmentType,
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    try {
      const { equipmentType } = req.params;
      const gaugeService = serviceRegistry.get('GaugeService');
      
      // Get categories by equipment type (this method needs to be added to the service)
      const categories = await gaugeService.getCategoriesByEquipmentType(equipmentType);
      
      logger.info('Retrieved categories by equipment type', {
        equipmentType,
        count: categories.length,
        userId: req.user.id
      });
      
      res.json({ 
        success: true, 
        data: categories,
        equipment_type: equipmentType,
        count: categories.length
      });
    } catch (error) {
      logger.error('Error retrieving categories by equipment type', {
        equipmentType: req.params.equipmentType,
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve categories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * GET /api/gauges/v2/next-set-id
 * Get the next available set ID for preview
 */
router.get('/next-set-id',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    try {
      const { category_id, gauge_type } = req.query;

      const gaugeIdService = serviceRegistry.get('GaugeIdService');

      // Generate next available set ID
      const nextSetId = await gaugeIdService.generateSystemId(
        category_id || 31, // Default to thread gauge category if not specified
        gauge_type || 'plug',
        null
      );

      logger.info('Generated next set ID preview', {
        nextSetId,
        categoryId: category_id,
        gaugeType: gauge_type,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: {
          next_set_id: nextSetId
        }
      });
    } catch (error) {
      logger.error('Error generating next set ID', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to generate next set ID',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * GET /api/gauges/v2/validate-set-id/:setId
 * Validate if a set ID is available for use
 */
router.get('/validate-set-id/:setId',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    try {
      const { setId } = req.params;

      const gaugeService = serviceRegistry.get('GaugeService');

      // Check if set ID already exists using the service's repository
      const existingGauges = await gaugeService.repository.findBySetId(setId);

      const isAvailable = !existingGauges || existingGauges.length === 0;

      logger.info('Validated set ID availability', {
        setId,
        isAvailable,
        existingCount: existingGauges?.length || 0,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: {
          set_id: setId,
          is_available: isAvailable,
          existing_count: existingGauges?.length || 0
        }
      });
    } catch (error) {
      logger.error('Error validating set ID', {
        setId: req.params.setId,
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        message: 'Failed to validate set ID',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * POST /api/gauges/v2/create-set
 * Create a gauge set (GO/NO GO gauge set)
 */
router.post('/create-set', 
  authenticateToken,
  requireOperator,
  validateGaugeFields,
  validateCreateSet,
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    logger.info('🚀 POST /api/gauges/v2/create-set - Request received');
    logger.debug('📦 Request body:', JSON.stringify(req.body, null, 2));
    logger.debug('👤 User ID:', req.user?.id);

    try {
      const { goGauge, noGoGauge } = req.body;
      const gaugeService = serviceRegistry.get('GaugeService');

      // Map storage_location to location for inventory system
      // Preserve custom_set_id if provided
      const mapLocationField = (gaugeData) => {
        if (gaugeData.storage_location) {
          const { storage_location, ...rest } = gaugeData;
          return {
            ...rest,
            location: storage_location
          };
        }
        return gaugeData;
      };

      const mappedGoGauge = mapLocationField(goGauge);
      const mappedNoGoGauge = mapLocationField(noGoGauge);

      // Log to verify custom_set_id is present
      if (mappedGoGauge.custom_set_id) {
        logger.debug('📝 Custom set ID provided:', mappedGoGauge.custom_set_id);
      }

      // Create the gauge set using the new method
      const result = await gaugeService.createGaugeSet(mappedGoGauge, mappedNoGoGauge, req.user.id);

      logger.info('Created gauge set successfully', {
        goId: result.go?.id,
        noGoId: result.noGo?.id,
        setId: result.setId,
        userId: req.user.id
      });

      logger.info('✅ Gauge set created, sending response:', {
        success: true,
        message: 'Gauge set created successfully',
        dataKeys: Object.keys(result)
      });

      res.status(201).json({
        success: true,
        message: 'Gauge set created successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error creating gauge set', {
        error: error.message,
        goGauge: { 
          category_id: req.body.goGauge?.category_id,
          thread_size: req.body.goGauge?.thread_size 
        },
        userId: req.user?.id
      });
      
      // Handle specific business rule violations
      if (error.message.includes('NPT gauges cannot have gauge sets') ||
          error.message.includes('must have matching specifications')) {
        return res.status(400).json({ 
          success: false, 
          message: error.message
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create gauge set',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * POST /api/gauges/v2/pair-spares
 * Pair two existing spare gauges into a gauge set
 */
router.post('/pair-spares',
  authenticateToken,
  requireOperator,
  [
    body('goGaugeId').isInt({ min: 1 }).withMessage('GO gauge ID is required'),
    body('noGoGaugeId').isInt({ min: 1 }).withMessage('NO GO gauge ID is required'),
    body('storageLocation').notEmpty().withMessage('Storage location is required'),
    body('setId').optional().isString().withMessage('Set ID must be a string'),
    body('reason').optional().isString().withMessage('Reason must be a string')
  ],
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    try {
      const { goGaugeId, noGoGaugeId, storageLocation, setId, reason } = req.body;
      const gaugeSetService = serviceRegistry.get('GaugeSetService');

      const result = await gaugeSetService.pairSpareGauges(
        goGaugeId,
        noGoGaugeId,
        storageLocation,
        req.user.id,
        reason,
        setId  // Pass custom set_id as last parameter
      );

      logger.info('Paired spare gauges successfully', {
        goGaugeId,
        noGoGaugeId,
        baseId: result.baseId,
        userId: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'Spare gauges paired successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error pairing spare gauges', {
        error: error.message,
        goGaugeId: req.body.goGaugeId,
        noGoGaugeId: req.body.noGoGaugeId,
        userId: req.user?.id
      });

      // Handle domain validation errors
      if (error.name === 'DomainValidationError' ||
          error.message.includes('must have matching') ||
          error.message.includes('must be spare') ||
          error.message.includes('NPT gauges cannot')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to pair spare gauges',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * POST /api/gauges/v2/replace-companion
 * Replace a gauge in set in an existing set
 */
router.post('/replace-companion',
  authenticateToken,
  requireOperator,
  [
    body('existingGaugeId').isInt({ min: 1 }).withMessage('Existing gauge ID is required'),
    body('newCompanionId').isInt({ min: 1 }).withMessage('New gauge in set ID is required'),
    body('reason').notEmpty().withMessage('Reason is required for companion replacement')
  ],
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    try {
      const { existingGaugeId, newCompanionId, reason } = req.body;
      const gaugeSetService = serviceRegistry.get('GaugeSetService');

      const result = await gaugeSetService.replaceCompanion(
        existingGaugeId,
        newCompanionId,
        req.user.id,
        reason
      );

      logger.info('Replaced gauge in set successfully', {
        existingGaugeId,
        newCompanionId,
        baseId: result.baseId,
        userId: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'Gauge in set replaced successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error replacing gauge in set', {
        error: error.message,
        existingGaugeId: req.body.existingGaugeId,
        newCompanionId: req.body.newCompanionId,
        userId: req.user?.id
      });

      // Handle validation errors
      if (error.name === 'DomainValidationError' ||
          error.message.includes('must have matching') ||
          error.message.includes('must be spare') ||
          error.message.includes('not found')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to replace gauge in set',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * POST /api/gauges/v2/unpair
 * Unpair gauge in sets (break the set)
 */
router.post('/unpair',
  authenticateToken,
  requireOperator,
  [
    body('gaugeId').isInt({ min: 1 }).withMessage('Gauge ID is required'),
    body('reason').optional().isString().withMessage('Reason must be a string if provided')
  ],
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    try {
      const { gaugeId, reason } = req.body;
      const gaugeSetService = serviceRegistry.get('GaugeSetService');

      const result = await gaugeSetService.unpairGauges(
        gaugeId,
        req.user.id,
        reason
      );

      logger.info('Unpaired gauges successfully', {
        gaugeId,
        userId: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'Gauges unpaired successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error unpairing gauges', {
        error: error.message,
        gaugeId: req.body.gaugeId,
        userId: req.user?.id
      });

      // Handle validation errors
      if (error.message.includes('not found') ||
          error.message.includes('does not have a companion')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to unpair gauges',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * POST /api/gauges/v2/retire-set
 * Retire a gauge set (soft delete both gauges, preserves set_id for history)
 */
router.post('/retire-set',
  authenticateToken,
  requireOperator,
  [
    body('gaugeId').isInt({ min: 1 }).withMessage('Gauge ID is required'),
    body('reason').notEmpty().withMessage('Reason is required for retiring a gauge set')
  ],
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    try {
      const { gaugeId, reason } = req.body;
      const gaugeSetService = serviceRegistry.get('GaugeSetService');

      const result = await gaugeSetService.retireSet(
        gaugeId,
        req.user.id,
        reason
      );

      logger.info('Retired gauge set successfully', {
        gaugeId,
        setId: result.setId,
        userId: req.user.id
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      logger.error('Error retiring gauge set', {
        error: error.message,
        gaugeId: req.body.gaugeId,
        userId: req.user?.id
      });

      // Handle validation errors
      if (error.message.includes('not found') ||
          error.message.includes('not part of a set') ||
          error.message.includes('Reason is required')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retire gauge set',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * GET /api/gauges/v2/spares
 * Get available spare gauges with optional filtering
 */
router.get('/spares',
  authenticateToken,
  validateSpares,
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    try {
      const { equipment_type, category_id, thread_size, thread_class, is_go_gauge } = req.query;
      const gaugeService = serviceRegistry.get('GaugeService');

      // Convert is_go_gauge query param to boolean
      const isGoGaugeBoolean = is_go_gauge === 'true' ? true : is_go_gauge === 'false' ? false : undefined;

      // Get spare gauges with filtering
      const spares = await gaugeService.getSpares({
        equipment_type,
        category_id,
        thread_size,
        thread_class,
        is_go_gauge: isGoGaugeBoolean,
        userRole: req.user.role
      });

      logger.info('Retrieved spare gauges', {
        equipment_type,
        category_id,
        thread_size,
        thread_class,
        is_go_gauge: isGoGaugeBoolean,
        count: spares.length,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: spares,  // Frontend expects 'data' field
        filters: {
          equipment_type,
          thread_size,
          thread_class,
          is_go_gauge: isGoGaugeBoolean,
          category_id
        },
        count: spares.length
      });
    } catch (error) {
      logger.error('Error retrieving spare gauges', {
        equipment_type: req.query.equipment_type,
        category_id: req.query.category_id,
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve spare gauges',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * POST /api/gauges/v2/create
 * Create a single gauge with auto-generated system ID
 */
router.post('/create', 
  authenticateToken,
  requireOperator,
  validateGaugeFields,
  [
    body('equipment_type').isIn(['thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard'])
      .withMessage('Equipment type is required'),
    body('category_id').isInt({ min: 1 }).withMessage('Category ID is required'),
    body('storage_location').notEmpty().withMessage('Storage location is required'),
    body('serial_number').notEmpty().withMessage('Serial number is required'),
    // Optional fields
    body('name').optional().notEmpty(),
    body('manufacturer').optional().notEmpty(),
    body('model_number').optional().notEmpty(),
    body('notes').optional(),
    // Equipment-specific fields
    body('thread_type').optional().notEmpty(),
    body('thread_form').optional().notEmpty(), // Backend expects thread_form, not thread_type
    body('thread_size').optional().notEmpty(),
    body('thread_class').optional().notEmpty(),
    body('gauge_type').optional().isIn(['plug', 'ring']).withMessage('Gauge type must be plug or ring'),
    body('is_sealed').optional().isBoolean(),
    body('ownership_type').optional().isIn(['company_owned', 'customer_owned']),
    body('measurement_range_min').optional().isNumeric(),
    body('measurement_range_max').optional().isNumeric(),
    body('measurement_unit').optional().notEmpty(),
    body('resolution_value').optional().isNumeric(),
    body('accuracy_value').optional().notEmpty(),
    body('calibration_frequency_days').optional().isInt({ min: 1 }),
    // Calibration standard specific fields
    body('certification_number').optional().notEmpty(),
    body('actual_value').optional().isNumeric(), // Maps to actual_certified_value in DB
    body('temperature_requirements').optional().notEmpty(),
    body('standard_type').optional().notEmpty(),
    body('nominal_value').optional().isNumeric(),
    body('traceability_info').optional().notEmpty() // For traceability organization/certificate
  ],
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    logger.info('🚀 POST /api/gauges/v2/create - Request received');
    logger.debug('📦 Request body:', JSON.stringify(req.body, null, 2));
    logger.debug('👤 User ID:', req.user?.id);

    try {
      const gaugeService = serviceRegistry.get('GaugeService');

      // Create gauge with auto-generated system ID
      const newGauge = await gaugeService.createGaugeV2(req.body, req.user.id);
      
      logger.info('Created gauge successfully', {
        gaugeId: newGauge.gauge_id,
        setId: newGauge.set_id,
        equipmentType: newGauge.equipment_type,
        userId: req.user.id
      });
      
      res.json({
        success: true,
        data: newGauge,
        message: 'Gauge created successfully'
      });
    } catch (error) {
      logger.error('Error creating gauge', {
        error: error.message,
        equipmentType: req.body.equipment_type,
        categoryId: req.body.category_id,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to create gauge',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * SERIAL NUMBER SYSTEM: Get spare thread gauges
 * GET /api/gauges-v2/spare-thread-gauges
 */
router.get(
  '/spare-thread-gauges',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    try {
      const gaugeQueryService = serviceRegistry.get('GaugeQueryService');

      const filters = {
        thread_size: req.query.thread_size,
        thread_class: req.query.thread_class,
        gauge_type: req.query.gauge_type,
        is_go_gauge: req.query.is_go_gauge !== undefined ? req.query.is_go_gauge === 'true' : undefined
      };

      const spares = await gaugeQueryService.findSpareThreadGauges(filters);

      res.json({
        success: true,
        data: spares,
        count: spares.length
      });
    } catch (error) {
      logger.error('Error fetching spare thread gauges', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch spare thread gauges',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * SERIAL NUMBER SYSTEM: Pair spare thread gauges by serial number
 * POST /api/gauges-v2/pair-spares-by-serial
 */
router.post(
  '/pair-spares-by-serial',
  authenticateToken,
  requireOperator,
  [
    body('go_serial_number').notEmpty().withMessage('GO gauge serial number is required'),
    body('nogo_serial_number').notEmpty().withMessage('NO GO gauge serial number is required')
  ],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const gaugeSetService = serviceRegistry.get('GaugeSetService');

      const { go_serial_number, nogo_serial_number, storage_location } = req.body;

      const result = await gaugeSetService.pairSpares(
        go_serial_number,
        nogo_serial_number,
        { storage_location },
        req.user.id
      );

      logger.info('Paired spare thread gauges', {
        setId: result.setId,
        goSerialNumber: go_serial_number,
        noGoSerialNumber: nogo_serial_number,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: result,
        message: `Set ${result.setId} created successfully`
      });
    } catch (error) {
      logger.error('Error pairing spare thread gauges', {
        error: error.message,
        goSerial: req.body.go_serial_number,
        noGoSerial: req.body.nogo_serial_number
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to pair spare thread gauges',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * SERIAL NUMBER SYSTEM: Unpair a gauge set
 * POST /api/gauges-v2/unpair-set/:setId
 */
router.post(
  '/unpair-set/:setId',
  authenticateToken,
  requireOperator,
  asyncErrorHandler(async (req, res) => {
    try {
      const gaugeSetService = serviceRegistry.get('GaugeSetService');

      const { setId } = req.params;

      const result = await gaugeSetService.unpairSetBySetId(setId, req.user.id);

      logger.info('Unpaired gauge set', {
        setId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: result,
        message: `Set ${setId} unpaired successfully`
      });
    } catch (error) {
      logger.error('Error unpairing gauge set', {
        error: error.message,
        setId: req.params.setId
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to unpair gauge set',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * SERIAL NUMBER SYSTEM: Replace gauge in set
 * POST /api/gauges-v2/replace-in-set/:setId
 */
router.post(
  '/replace-in-set/:setId',
  authenticateToken,
  requireOperator,
  [
    body('old_serial_number').notEmpty().withMessage('Old gauge serial number is required'),
    body('new_serial_number').notEmpty().withMessage('New gauge serial number is required')
  ],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const gaugeSetService = serviceRegistry.get('GaugeSetService');

      const { setId } = req.params;
      const { old_serial_number, new_serial_number } = req.body;

      const result = await gaugeSetService.replaceGaugeInSet(
        setId,
        old_serial_number,
        new_serial_number,
        req.user.id
      );

      logger.info('Replaced gauge in set', {
        setId,
        oldSerial: old_serial_number,
        newSerial: new_serial_number,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: result,
        message: `Gauge replaced successfully in set ${setId}`
      });
    } catch (error) {
      logger.error('Error replacing gauge in set', {
        error: error.message,
        setId: req.params.setId,
        oldSerial: req.body.old_serial_number,
        newSerial: req.body.new_serial_number
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to replace gauge in set',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * GET /sets/:setId - Get set details with gauge information
 * Returns the set information including both GO and NO GO gauge details
 */
router.get('/sets/:setId', authenticateToken, asyncErrorHandler(async (req, res) => {
  const { setId } = req.params;
  const gaugeService = serviceRegistry.get('GaugeService');

  try {
    logger.info('Fetching set details', { setId });

    // Query to get both gauges in the set (they share the same set_id)
    const queryStr = `
      SELECT gauge_id
      FROM gauges
      WHERE set_id = ?
        AND is_deleted = 0
      ORDER BY gauge_id
    `;

    const pool = getPool();
    const [rows] = await pool.execute(queryStr, [setId]);

    if (rows.length !== 2) {
      return res.status(404).json({
        success: false,
        message: rows.length === 0 ? 'Gauge set not found' : `Invalid set: expected 2 gauges, found ${rows.length}`
      });
    }

    // Fetch full gauge details for both gauges using their gauge_id (serial numbers)
    const goGauge = await gaugeService.getGaugeByGaugeId(rows[0].gauge_id);
    const nogoGauge = await gaugeService.getGaugeByGaugeId(rows[1].gauge_id);

    res.json({
      success: true,
      data: {
        set_id: setId,
        status: 'active',
        created_at: goGauge.created_at,
        goGauge,
        nogoGauge
      }
    });

  } catch (error) {
    logger.error('Error fetching set details', {
      error: error.message,
      setId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch set details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

/**
 * PUT /sets/:setId - Update set properties (storage location and notes)
 * Updates both gauges in the set simultaneously
 *
 * Request body:
 * {
 *   "storage_location": "BIN-A-12" (optional),
 *   "notes": "Set notes text" (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "setId": "SP0001",
 *     "message": "Gauge set updated successfully"
 *   }
 * }
 */
router.put('/sets/:setId',
  authenticateToken,
  [
    body('storage_location').optional().isString().trim().withMessage('Storage location must be a string'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    const { setId } = req.params;
    const { storage_location, notes } = req.body;
    const userId = req.user.id;

    try {
      logger.info('Updating gauge set', { setId, userId, updates: { storage_location, notes: notes !== undefined } });

      const gaugeSetService = serviceRegistry.get('GaugeSetService');

      const result = await gaugeSetService.updateSet(
        setId,
        { storage_location, notes },
        userId
      );

      logger.info('Gauge set updated successfully', { setId });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error updating gauge set', {
        error: error.message,
        setId,
        userId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update gauge set',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * GET /manufacturers - Get list of distinct manufacturers
 * Returns all unique manufacturer names from gauges table
 *
 * Response:
 * {
 *   "success": true,
 *   "data": ["Mitutoyo", "Starrett", "Brown & Sharpe", ...]
 * }
 */
router.get('/manufacturers',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    try {
      logger.info('Fetching manufacturer list');

      const gaugeQueryService = serviceRegistry.get('GaugeQueryService');
      const manufacturers = await gaugeQueryService.getDistinctManufacturers();

      logger.info('Manufacturer list fetched successfully', { count: manufacturers.length });

      res.json({
        success: true,
        data: manufacturers
      });

    } catch (error) {
      logger.error('Error fetching manufacturer list', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch manufacturer list',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * POST /api/gauges/v2/suggest-id
 * Suggest next available gauge ID for a category
 *
 * Request body:
 * {
 *   "category_id": 1,
 *   "gauge_type": "plug" (optional, for thread gauges),
 *   "is_go_gauge": true (optional, for thread gauges)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "suggestedId": "CA0001",
 *     "prefix": "CA"
 *   }
 * }
 */
router.post('/suggest-id',
  authenticateToken,
  [
    body('category_id').isInt({ min: 1 }).withMessage('Category ID is required'),
    body('gauge_type').optional().isString().withMessage('Gauge type must be a string'),
    body('is_go_gauge').optional().isBoolean().withMessage('is_go_gauge must be a boolean')
  ],
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    try {
      const { category_id, gauge_type, is_go_gauge } = req.body;
      const gaugeIdService = serviceRegistry.get('GaugeIdService');

      const result = await gaugeIdService.suggestGaugeId(
        category_id,
        gauge_type || null,
        is_go_gauge !== undefined ? is_go_gauge : null
      );

      logger.info('Gauge ID suggested', {
        categoryId: category_id,
        gaugeType: gauge_type,
        isGoGauge: is_go_gauge,
        suggestedId: result.suggestedId,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error suggesting gauge ID', {
        error: error.message,
        categoryId: req.body.category_id,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to suggest gauge ID',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * POST /api/gauges/v2/validate-id
 * Validate a custom gauge ID
 *
 * Request body:
 * {
 *   "gauge_id": "CA-CUSTOM-001",
 *   "category_id": 1,
 *   "gauge_type": "plug" (optional, for thread gauges),
 *   "is_go_gauge": true (optional, for thread gauges)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "valid": true,
 *     "available": true,
 *     "message": "Gauge ID is available"
 *   }
 * }
 */
router.post('/validate-id',
  authenticateToken,
  [
    body('gauge_id').notEmpty().withMessage('Gauge ID is required'),
    body('category_id').isInt({ min: 1 }).withMessage('Category ID is required'),
    body('gauge_type').optional({ nullable: true }).isString().withMessage('Gauge type must be a string'),
    body('is_go_gauge').optional({ nullable: true }).isBoolean().withMessage('is_go_gauge must be a boolean')
  ],
  handleValidationErrors,
  asyncErrorHandler(async (req, res) => {
    try {
      const { gauge_id, category_id, gauge_type, is_go_gauge } = req.body;
      const gaugeIdService = serviceRegistry.get('GaugeIdService');

      const validation = await gaugeIdService.validateCustomGaugeId(
        gauge_id,
        category_id,
        gauge_type || null,
        is_go_gauge !== undefined ? is_go_gauge : null
      );

      logger.info('Gauge ID validated', {
        gaugeId: gauge_id,
        categoryId: category_id,
        valid: validation.valid,
        available: validation.available,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      logger.error('Error validating gauge ID', {
        error: error.message,
        gaugeId: req.body.gauge_id,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to validate gauge ID',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

module.exports = router;