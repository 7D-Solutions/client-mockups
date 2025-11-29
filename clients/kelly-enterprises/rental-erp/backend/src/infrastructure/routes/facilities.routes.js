/**
 * Facilities API Routes
 * Endpoints for managing facilities (top-level organization)
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const facilityService = require('../services/FacilityService');

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
 * GET /api/facilities
 * Get all facilities (active by default)
 * Query params:
 *  - includeInactive: boolean (default: false)
 */
router.get('/',
  authenticateToken,
  [
    query('includeInactive').optional().isBoolean().withMessage('includeInactive must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { includeInactive } = req.query;

      const facilities = await facilityService.getFacilities({
        includeInactive: includeInactive === 'true'
      });

      return res.json({
        success: true,
        data: facilities,
        count: facilities.length
      });
    } catch (error) {
      console.error('Error fetching facilities:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch facilities',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/facilities/:id
 * Get a specific facility by ID
 */
router.get('/:id',
  authenticateToken,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid facility ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const facility = await facilityService.getFacilityById(parseInt(req.params.id));

      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found'
        });
      }

      return res.json({
        success: true,
        data: facility
      });
    } catch (error) {
      console.error('Error fetching facility:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch facility',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// ============================================================================
// ADMIN-ONLY ENDPOINTS
// ============================================================================

/**
 * POST /api/facilities
 * Create a new facility (Admin only)
 */
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('facility_code').trim().notEmpty().withMessage('Facility code is required')
      .isLength({ max: 50 }).withMessage('Facility code must be 50 characters or less'),
    body('facility_name').trim().notEmpty().withMessage('Facility name is required')
      .isLength({ max: 100 }).withMessage('Facility name must be 100 characters or less'),
    body('display_order').optional().isInt({ min: 0 }).withMessage('Display order must be a non-negative integer')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const facility = await facilityService.createFacility(req.body);

      return res.status(201).json({
        success: true,
        message: 'Facility created successfully',
        data: facility
      });
    } catch (error) {
      console.error('Error creating facility:', error);

      // Handle duplicate facility code
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create facility',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/facilities/:id
 * Update an existing facility (Admin only)
 */
router.put('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid facility ID is required'),
    body('facility_code').optional().trim().notEmpty().withMessage('Facility code cannot be empty')
      .isLength({ max: 50 }).withMessage('Facility code must be 50 characters or less'),
    body('facility_name').optional().trim().notEmpty().withMessage('Facility name cannot be empty')
      .isLength({ max: 100 }).withMessage('Facility name must be 100 characters or less'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    body('display_order').optional().isInt({ min: 0 }).withMessage('Display order must be a non-negative integer')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const facility = await facilityService.updateFacility(parseInt(req.params.id), req.body);

      return res.json({
        success: true,
        message: 'Facility updated successfully',
        data: facility
      });
    } catch (error) {
      console.error('Error updating facility:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update facility',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * DELETE /api/facilities/:id
 * Soft delete a facility (Admin only)
 * Query param:
 *  - hard: boolean (default: false) - Permanently delete if true
 */
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid facility ID is required'),
    query('hard').optional().isBoolean().withMessage('hard must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const hard = req.query.hard === 'true';

      if (hard) {
        await facilityService.hardDeleteFacility(parseInt(req.params.id));
      } else {
        await facilityService.deleteFacility(parseInt(req.params.id));
      }

      return res.json({
        success: true,
        message: hard ? 'Facility permanently deleted' : 'Facility deactivated'
      });
    } catch (error) {
      console.error('Error deleting facility:', error);

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
        message: 'Failed to delete facility',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/facilities/reorder
 * Reorder facilities (Admin only)
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
      await facilityService.reorderFacilities(req.body);

      return res.json({
        success: true,
        message: 'Facilities reordered successfully'
      });
    } catch (error) {
      console.error('Error reordering facilities:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to reorder facilities',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
