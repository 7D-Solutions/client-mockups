/**
 * Storage Locations API Routes
 * Endpoints for managing configurable storage locations
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const storageLocationService = require('../services/StorageLocationService');

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
 * GET /api/storage-locations
 * Get all storage locations (active by default)
 * Query params:
 *  - includeInactive: boolean (default: false)
 *  - locationType: string (optional filter)
 */
router.get('/',
  authenticateToken,
  [
    query('includeInactive').optional().isBoolean().withMessage('includeInactive must be boolean'),
    query('locationType').optional().isIn(['bin', 'shelf', 'rack', 'cabinet', 'drawer', 'room', 'other']).withMessage('Invalid location type')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { includeInactive, locationType } = req.query;

      const locations = await storageLocationService.getStorageLocations({
        includeInactive: includeInactive === 'true',
        locationType: locationType || null
      });

      return res.json({
        success: true,
        data: locations,
        count: locations.length
      });
    } catch (error) {
      console.error('Error fetching storage locations:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch storage locations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// ============================================================================
// ADMIN-ONLY ENDPOINTS
// ============================================================================

/**
 * POST /api/storage-locations
 * Create a new storage location (Admin only)
 */
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('location_code').trim().notEmpty().withMessage('Location code is required')
      .isLength({ max: 50 }).withMessage('Location code must be 50 characters or less'),
    body('description').optional().trim().isLength({ max: 255 }).withMessage('Description must be 255 characters or less'),
    body('location_type').optional().isIn(['bin', 'shelf', 'rack', 'cabinet', 'drawer', 'room', 'other']).withMessage('Invalid location type'),
    body('allowed_item_types')
      .optional()
      .isArray({ min: 1 }).withMessage('At least one item type must be allowed')
      .custom((value) => {
        const validTypes = ['gauges', 'tools', 'parts'];
        return value.every(type => validTypes.includes(type));
      })
      .withMessage('Invalid item type')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const location = await storageLocationService.createStorageLocation(req.body);

      return res.status(201).json({
        success: true,
        message: 'Storage location created successfully',
        data: location
      });
    } catch (error) {
      console.error('Error creating storage location:', error);

      // Handle duplicate location code
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create storage location',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/storage-locations/bulk
 * Bulk create storage locations (Admin only)
 */
router.post('/bulk',
  authenticateToken,
  requireAdmin,
  [
    body('locations').isArray({ min: 1 }).withMessage('locations must be a non-empty array'),
    body('locations.*.location_code').trim().notEmpty().withMessage('Each location must have a code'),
    body('locations.*.location_type').optional().isIn(['bin', 'shelf', 'rack', 'cabinet', 'drawer', 'room', 'other']).withMessage('Invalid location type')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const created = await storageLocationService.bulkCreateStorageLocations(req.body.locations);

      return res.status(201).json({
        success: true,
        message: `Created ${created.length} storage location(s)`,
        data: created,
        count: created.length
      });
    } catch (error) {
      console.error('Error bulk creating storage locations:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to bulk create storage locations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/storage-locations/for-item-type/:itemType
 * Get storage locations that allow a specific item type
 */
router.get('/for-item-type/:itemType',
  authenticateToken,
  [
    param('itemType').isIn(['gauges', 'tools', 'parts']).withMessage('Invalid item type')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const locations = await storageLocationService.getLocationsByItemType(req.params.itemType);

      return res.json({
        success: true,
        data: locations,
        count: locations.length
      });
    } catch (error) {
      console.error('Error fetching locations by item type:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch locations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/storage-locations/by-code/:location_code
 * Get a specific storage location by location code
 */
router.get('/by-code/:location_code',
  authenticateToken,
  [
    param('location_code').trim().notEmpty().withMessage('Location code is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const location = await storageLocationService.getStorageLocationByCode(req.params.location_code);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Storage location not found'
        });
      }

      return res.json({
        success: true,
        data: location
      });
    } catch (error) {
      console.error('Error fetching storage location by code:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch storage location',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/storage-locations/:id
 * Get a specific storage location by ID
 */
router.get('/:id',
  authenticateToken,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid location ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const location = await storageLocationService.getStorageLocationById(parseInt(req.params.id));

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Storage location not found'
        });
      }

      return res.json({
        success: true,
        data: location
      });
    } catch (error) {
      console.error('Error fetching storage location:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch storage location',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/storage-locations/:id
 * Update an existing storage location (Admin only)
 */
router.put('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid location ID is required'),
    body('location_code').optional().trim().notEmpty().withMessage('Location code cannot be empty')
      .isLength({ max: 50 }).withMessage('Location code must be 50 characters or less'),
    body('description').optional().trim().isLength({ max: 255 }).withMessage('Description must be 255 characters or less'),
    body('location_type').optional().isIn(['bin', 'shelf', 'rack', 'cabinet', 'drawer', 'room', 'other']).withMessage('Invalid location type'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    body('allowed_item_types')
      .optional()
      .isArray({ min: 1 }).withMessage('At least one item type must be allowed')
      .custom((value) => {
        const validTypes = ['gauges', 'tools', 'parts'];
        return value.every(type => validTypes.includes(type));
      })
      .withMessage('Invalid item type')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const location = await storageLocationService.updateStorageLocation(parseInt(req.params.id), req.body);

      return res.json({
        success: true,
        message: 'Storage location updated successfully',
        data: location
      });
    } catch (error) {
      console.error('Error updating storage location:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update storage location',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * DELETE /api/storage-locations/:id
 * Soft delete a storage location (Admin only)
 * Query param:
 *  - hard: boolean (default: false) - Permanently delete if true
 */
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid location ID is required'),
    query('hard').optional().isBoolean().withMessage('hard must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const hard = req.query.hard === 'true';

      if (hard) {
        await storageLocationService.hardDeleteStorageLocation(parseInt(req.params.id));
      } else {
        await storageLocationService.deleteStorageLocation(parseInt(req.params.id));
      }

      return res.json({
        success: true,
        message: hard ? 'Storage location permanently deleted' : 'Storage location deactivated'
      });
    } catch (error) {
      console.error('Error deleting storage location:', error);

      if (error.message.includes('in use')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to delete storage location',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
