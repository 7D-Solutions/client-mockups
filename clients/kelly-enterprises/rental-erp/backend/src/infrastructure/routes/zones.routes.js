/**
 * Zones API Routes
 * Endpoints for managing warehouse zones (functional areas)
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const zoneService = require('../services/ZoneService');

// Middleware to handle validation errors
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

// ============================================================================
// PUBLIC ENDPOINTS (Authenticated users only)
// ============================================================================

/**
 * GET /api/zones
 * Get all zones (active by default)
 * Query params:
 *  - includeInactive: boolean (default: false)
 *  - buildingId: number (optional filter)
 */
router.get('/',
  authenticateToken,
  [
    query('includeInactive').optional().isBoolean().withMessage('includeInactive must be boolean'),
    query('buildingId').optional().isInt({ min: 1 }).withMessage('buildingId must be a valid integer')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { includeInactive, buildingId } = req.query;

      const zones = await zoneService.getZones({
        includeInactive: includeInactive === 'true',
        buildingId: buildingId ? parseInt(buildingId) : null
      });

      return res.json({
        success: true,
        data: zones,
        count: zones.length
      });
    } catch (error) {
      console.error('Error fetching zones:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch zones',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/zones/:id
 * Get a specific zone by ID
 */
router.get('/:id',
  authenticateToken,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid zone ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const zone = await zoneService.getZoneById(parseInt(req.params.id));

      if (!zone) {
        return res.status(404).json({
          success: false,
          message: 'Zone not found'
        });
      }

      return res.json({
        success: true,
        data: zone
      });
    } catch (error) {
      console.error('Error fetching zone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch zone',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// ============================================================================
// ADMIN-ONLY ENDPOINTS
// ============================================================================

/**
 * POST /api/zones
 * Create a new zone (Admin only)
 */
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('zone_code').trim().notEmpty().withMessage('Zone code is required')
      .isLength({ max: 50 }).withMessage('Zone code must be 50 characters or less'),
    body('zone_name').trim().notEmpty().withMessage('Zone name is required')
      .isLength({ max: 100 }).withMessage('Zone name must be 100 characters or less'),
    body('building_id').isInt({ min: 1 }).withMessage('Valid building ID is required'),
    body('display_order').optional().isInt({ min: 0 }).withMessage('Display order must be a non-negative integer')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const zone = await zoneService.createZone(req.body);

      return res.status(201).json({
        success: true,
        message: 'Zone created successfully',
        data: zone
      });
    } catch (error) {
      console.error('Error creating zone:', error);

      // Handle duplicate zone code
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      // Handle building not found
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create zone',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/zones/:id
 * Update an existing zone (Admin only)
 */
router.put('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid zone ID is required'),
    body('zone_code').optional().trim().notEmpty().withMessage('Zone code cannot be empty')
      .isLength({ max: 50 }).withMessage('Zone code must be 50 characters or less'),
    body('zone_name').optional().trim().notEmpty().withMessage('Zone name cannot be empty')
      .isLength({ max: 100 }).withMessage('Zone name must be 100 characters or less'),
    body('building_id').optional().isInt({ min: 1 }).withMessage('Valid building ID is required'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    body('display_order').optional().isInt({ min: 0 }).withMessage('Display order must be a non-negative integer')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const zone = await zoneService.updateZone(parseInt(req.params.id), req.body);

      return res.json({
        success: true,
        message: 'Zone updated successfully',
        data: zone
      });
    } catch (error) {
      console.error('Error updating zone:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update zone',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * DELETE /api/zones/:id
 * Soft delete a zone (Admin only)
 * Query param:
 *  - hard: boolean (default: false) - Permanently delete if true
 */
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid zone ID is required'),
    query('hard').optional().isBoolean().withMessage('hard must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const hard = req.query.hard === 'true';

      if (hard) {
        await zoneService.hardDeleteZone(parseInt(req.params.id));
      } else {
        await zoneService.deleteZone(parseInt(req.params.id));
      }

      return res.json({
        success: true,
        message: hard ? 'Zone permanently deleted' : 'Zone deactivated'
      });
    } catch (error) {
      console.error('Error deleting zone:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Cannot delete')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to delete zone',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/zones/reorder
 * Reorder zones (Admin only)
 * Body: [{id: number, display_order: number}]
 */
router.put('/reorder',
  authenticateToken,
  requireAdmin,
  [
    body().isArray({ min: 1 }).withMessage('Request body must be a non-empty array'),
    body('*.id').isInt({ min: 1 }).withMessage('Each item must have a valid id'),
    body('*.display_order').isInt({ min: 0 }).withMessage('Each item must have a valid display_order')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await zoneService.reorderZones(req.body);

      return res.json({
        success: true,
        message: 'Zones reordered successfully'
      });
    } catch (error) {
      console.error('Error reordering zones:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to reorder zones',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
