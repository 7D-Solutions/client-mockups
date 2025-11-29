const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const logger = require('../../../infrastructure/utils/logger');
const AdminMaintenanceService = require('../services/AdminMaintenanceService');
const AdminRepository = require('../repositories/AdminRepository');

const router = express.Router();

// Initialize service with repository
const adminRepository = new AdminRepository();
const adminMaintenanceService = new AdminMaintenanceService(adminRepository);

// All routes require admin authentication
router.use(authenticateToken, requireAdmin);

/**
 * GET /api/admin/maintenance/gauge-status-report
 * Get comprehensive gauge status report
 */
router.get('/gauge-status-report', asyncErrorHandler(async (req, res) => {
  try {
    const data = await adminMaintenanceService.getGaugeStatusReport();
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('Error generating gauge status report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
}));

/**
 * POST /api/admin/maintenance/update-statuses
 * Manually trigger status update for all gauges
 */
router.post('/update-statuses', [
  // Optional validation for batch operation parameters
  body('force').optional().isBoolean().withMessage('Force parameter must be a boolean'),
  body('dryRun').optional().isBoolean().withMessage('DryRun parameter must be a boolean'),
  body('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
], asyncErrorHandler(async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'validation_failed',
      details: errors.array()
    });
  }
  try {
    logger.info('Manual status update triggered by admin:', req.user.email);
    
    const result = await adminMaintenanceService.updateGaugeStatuses();
    
    res.json({
      success: true,
      message: 'Status update completed',
      data: result
    });
  } catch (error) {
    logger.error('Error updating statuses:', error);
    res.status(500).json({ success: false, error: 'Failed to update statuses' });
  }
}));

/**
 * GET /api/admin/maintenance/status-inconsistencies
 * Check for any data inconsistencies
 */
router.get('/status-inconsistencies', asyncErrorHandler(async (req, res) => {
  try {
    const data = await adminMaintenanceService.checkStatusInconsistencies();
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('Error checking inconsistencies:', error);
    res.status(500).json({ success: false, error: 'Failed to check inconsistencies' });
  }
}));

/**
 * POST /api/admin/maintenance/seed-test-data
 * Create test data for development (only in non-production)
 */
router.post('/seed-test-data', [
  // Validation for test data parameters
  body('count').optional().isInt({ min: 1, max: 100 }).withMessage('Count must be between 1 and 100'),
  body('type').optional().isIn(['gauges', 'users', 'all']).withMessage('Type must be gauges, users, or all'),
  body('reset').optional().isBoolean().withMessage('Reset parameter must be a boolean'),
], asyncErrorHandler(async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'validation_failed',
      details: errors.array()
    });
  }
  try {
    const data = await adminMaintenanceService.seedTestData();
    
    res.json({
      success: true,
      message: 'Test data seeded successfully',
      data: data
    });
  } catch (error) {
    if (error.message === 'Test data seeding not allowed in production') {
      return res.status(403).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    logger.error('Error seeding test data:', error);
    res.status(500).json({ success: false, error: 'Failed to seed test data' });
  }
}));

/**
 * GET /api/admin/maintenance/system-users
 * List all system users (sanitized)
 */
router.get('/system-users', asyncErrorHandler(async (req, res) => {
  try {
    const data = await adminMaintenanceService.getSystemUsers();
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('Error fetching system users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
}));

module.exports = router;