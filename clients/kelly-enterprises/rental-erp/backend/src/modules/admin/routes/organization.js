const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const { authenticateToken, requireAdmin } = require('../../../infrastructure/middleware/auth');
const OrganizationService = require('../services/organizationService');
const OrganizationRepository = require('../repositories/OrganizationRepository');

const router = express.Router();

// Initialize service with repository
const organizationRepository = new OrganizationRepository();
const organizationService = new OrganizationService(organizationRepository);

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================================================
// Hierarchy Endpoints
// ============================================================================

/**
 * GET /api/admin/organization/hierarchy
 * Get complete organization hierarchy with counts
 */
router.get('/hierarchy',
  asyncErrorHandler(async (req, res) => {
    const hierarchy = await organizationService.getHierarchy();
    res.json({
      success: true,
      data: hierarchy
    });
  })
);

// ============================================================================
// Facility Endpoints
// ============================================================================

/**
 * GET /api/admin/organization/facilities
 * Get all facilities with optional building counts
 */
router.get('/facilities',
  asyncErrorHandler(async (req, res) => {
    const facilities = await organizationService.getFacilities();
    res.json({
      success: true,
      data: facilities
    });
  })
);

/**
 * POST /api/admin/organization/facilities
 * Create new facility
 */
router.post('/facilities',
  [
    body('facility_code').notEmpty().trim().isLength({ max: 50 }),
    body('facility_name').notEmpty().trim().isLength({ max: 100 }),
    body('is_active').optional().isBoolean(),
    body('display_order').optional().isInt({ min: 0 })
  ],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const facility = await organizationService.createFacility(req.body);
    res.status(201).json({
      success: true,
      message: 'Facility created successfully',
      data: facility
    });
  })
);

/**
 * PUT /api/admin/organization/facilities/:id
 * Update facility
 */
router.put('/facilities/:id',
  [
    param('id').isInt({ min: 1 }),
    body('facility_code').optional().trim().isLength({ max: 50 }),
    body('facility_name').optional().trim().isLength({ max: 100 }),
    body('is_active').optional().isBoolean(),
    body('display_order').optional().isInt({ min: 0 })
  ],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const facility = await organizationService.updateFacility(
      parseInt(req.params.id),
      req.body
    );
    res.json({
      success: true,
      message: 'Facility updated successfully',
      data: facility
    });
  })
);

/**
 * DELETE /api/admin/organization/facilities/:id
 * Delete facility (cascades to buildings and zones)
 */
router.delete('/facilities/:id',
  [param('id').isInt({ min: 1 })],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    await organizationService.deleteFacility(parseInt(req.params.id));
    res.json({
      success: true,
      message: 'Facility deleted successfully'
    });
  })
);

// ============================================================================
// Building Endpoints
// ============================================================================

/**
 * GET /api/admin/organization/buildings
 * Get all buildings or buildings for specific facility
 */
router.get('/buildings',
  asyncErrorHandler(async (req, res) => {
    const { facility_id } = req.query;
    const buildings = await organizationService.getBuildings(
      facility_id ? parseInt(facility_id) : null
    );
    res.json({
      success: true,
      data: buildings
    });
  })
);

/**
 * POST /api/admin/organization/buildings
 * Create new building
 */
router.post('/buildings',
  [
    body('building_code').notEmpty().trim().isLength({ max: 50 }),
    body('building_name').notEmpty().trim().isLength({ max: 100 }),
    body('facility_id').isInt({ min: 1 }),
    body('is_active').optional().isBoolean(),
    body('display_order').optional().isInt({ min: 0 })
  ],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const building = await organizationService.createBuilding(req.body);
    res.status(201).json({
      success: true,
      message: 'Building created successfully',
      data: building
    });
  })
);

/**
 * PUT /api/admin/organization/buildings/:id
 * Update building
 */
router.put('/buildings/:id',
  [
    param('id').isInt({ min: 1 }),
    body('building_code').optional().trim().isLength({ max: 50 }),
    body('building_name').optional().trim().isLength({ max: 100 }),
    body('facility_id').optional().isInt({ min: 1 }),
    body('is_active').optional().isBoolean(),
    body('display_order').optional().isInt({ min: 0 })
  ],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const building = await organizationService.updateBuilding(
      parseInt(req.params.id),
      req.body
    );
    res.json({
      success: true,
      message: 'Building updated successfully',
      data: building
    });
  })
);

/**
 * DELETE /api/admin/organization/buildings/:id
 * Delete building (cascades to zones)
 */
router.delete('/buildings/:id',
  [param('id').isInt({ min: 1 })],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    await organizationService.deleteBuilding(parseInt(req.params.id));
    res.json({
      success: true,
      message: 'Building deleted successfully'
    });
  })
);

// ============================================================================
// Zone Endpoints
// ============================================================================

/**
 * GET /api/admin/organization/zones
 * Get all zones or zones for specific building
 */
router.get('/zones',
  asyncErrorHandler(async (req, res) => {
    const { building_id } = req.query;
    const zones = await organizationService.getZones(
      building_id ? parseInt(building_id) : null
    );
    res.json({
      success: true,
      data: zones
    });
  })
);

/**
 * POST /api/admin/organization/zones
 * Create new zone
 */
router.post('/zones',
  [
    body('zone_code').notEmpty().trim().isLength({ max: 50 }),
    body('zone_name').notEmpty().trim().isLength({ max: 100 }),
    body('building_id').isInt({ min: 1 }),
    body('is_active').optional().isBoolean(),
    body('display_order').optional().isInt({ min: 0 })
  ],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const zone = await organizationService.createZone(req.body);
    res.status(201).json({
      success: true,
      message: 'Zone created successfully',
      data: zone
    });
  })
);

/**
 * PUT /api/admin/organization/zones/:id
 * Update zone
 */
router.put('/zones/:id',
  [
    param('id').isInt({ min: 1 }),
    body('zone_code').optional().trim().isLength({ max: 50 }),
    body('zone_name').optional().trim().isLength({ max: 100 }),
    body('building_id').optional().isInt({ min: 1 }),
    body('is_active').optional().isBoolean(),
    body('display_order').optional().isInt({ min: 0 })
  ],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const zone = await organizationService.updateZone(
      parseInt(req.params.id),
      req.body
    );
    res.json({
      success: true,
      message: 'Zone updated successfully',
      data: zone
    });
  })
);

/**
 * DELETE /api/admin/organization/zones/:id
 * Delete zone (sets storage_locations.zone_id to NULL)
 */
router.delete('/zones/:id',
  [param('id').isInt({ min: 1 })],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    await organizationService.deleteZone(parseInt(req.params.id));
    res.json({
      success: true,
      message: 'Zone deleted successfully'
    });
  })
);

module.exports = router;
