const express = require('express');
const { param, validationResult } = require('express-validator');
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const logger = require('../../../infrastructure/utils/logger');

const router = express.Router();

// Validation middleware
const validateGaugeId = [
  param('gaugeId').notEmpty().withMessage('Gauge ID is required')
];

// GET /api/gauges/tracking/dashboard/summary - Get dashboard summary
router.get('/dashboard/summary', authenticateToken, asyncErrorHandler(async (req, res) => {
    const reportsService = serviceRegistry.get('ReportsService');
    const result = await reportsService.getDashboardSummary();
    res.json(result);
}));

// GET /api/gauges/tracking/overdue/calibration - Get overdue calibrations
router.get('/overdue/calibration', authenticateToken, asyncErrorHandler(async (req, res) => {
    const reportsService = serviceRegistry.get('ReportsService');
    const result = await reportsService.getOverdueCalibrations();
    res.json(result);
}));

// NOTE: The /:gaugeId/history route has been moved to index.js to ensure proper route ordering
// It must be defined before the operations catch-all route /:gaugeId

// GET /api/gauges/tracking - Get all gauges with tracking status
router.get('/', authenticateToken, asyncErrorHandler(async (req, res) => {
  const { page = 1, limit = 50, status, ownership_type, equipment_type } = req.query;
  
  // Log request for debugging
  logger.info('GET /api/gauges/tracking called', {
    page, limit, status, ownership_type, equipment_type,
    query: req.query,
    hasEquipmentType: !!equipment_type
  });
  
  const filters = { page, limit };
  if (status) filters.status = status;
  if (ownership_type) filters.ownership_type = ownership_type;
  if (equipment_type) filters.equipment_type = equipment_type;
  
  // Service already handles pagination
  const reportsService = serviceRegistry.get('ReportsService');
  const result = await reportsService.getGaugesList(filters);
  
  logger.info('Result summary', {
    totalRecords: result.data?.length || 0,
    pagination: result.pagination,
    filters_applied: filters
  });
  
  res.json(result);
}));

module.exports = router;