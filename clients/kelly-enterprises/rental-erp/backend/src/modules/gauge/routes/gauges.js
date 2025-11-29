const express = require('express');
const { validationResult } = require('express-validator');
const router = express.Router();
const { createValidator } = require('../../../infrastructure/middleware/strictFieldValidator');
const validateGaugeFields = createValidator('gauge');
const { authenticateToken, requireOperator, requireAdmin } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const etagMiddleware = require('../../../infrastructure/middleware/etag');
const logger = require('../../../infrastructure/utils/logger');
const { addManufacturerData, addManufacturerDataSingle } = require('../utils/manufacturerExtractor');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const { pool } = require('../../../infrastructure/database/connection');
const { parsePaginationParams, buildPaginationResponse, validatePaginationMiddleware } = require('../../../infrastructure/utils/pagination');
const { addHATEOAS, generatePaginationLinks } = require('./helpers/HATEOASHelper');
const { handleGaugeError, sendSuccess, filterAllowedFields } = require('./helpers/gaugeResponseHelper');
const {
  validateGaugeId,
  createGaugeValidation,
  updateGaugeValidation,
  calibrationSendValidation,
  calibrationReceiveValidation,
  resetGaugeValidation,
  bulkUpdateValidation,
  ALLOWED_UPDATE_FIELDS,
  ALLOWED_BULK_UPDATE_FIELDS
} = require('./helpers/gaugeValidationRules');
const gaugeDashboardService = require('../services/GaugeDashboardService');

// GET /api/gauges - List all gauges with filtering
router.get('/', authenticateToken, etagMiddleware(), validatePaginationMiddleware, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { page, limit, offset, search } = parsePaginationParams(req.query, 'GAUGE_INVENTORY');
  const { status, calibration_status, ownership_type, department, user_id, equipment_type } = req.query;

  const gaugeService = serviceRegistry.get('GaugeService');

  // Always group thread gauge sets - they should never display as individual gauges
  const groupBySets = equipment_type === 'thread_gauge';

  const filters = { status, ownership_type, department, user_id, search, equipment_type, offset, limit, groupBySets };

  try {
    const result = await gaugeService.searchGauges(filters);
    let gauges = Array.isArray(result) ? result : (result?.gauges || []);
    let total = Array.isArray(result) ? result.length : (result?.total || gauges.length);

    // Add calibration status
    const gaugesWithStatus = gauges.map(gauge => ({
      ...gauge,
      calibration_status: gaugeService.calculateCalibrationStatus ?
        gaugeService.calculateCalibrationStatus(gauge) : 'unknown'
    }));

    const gaugesWithManufacturer = addManufacturerData(gaugesWithStatus);
    const gaugesWithLinks = addHATEOAS(gaugesWithManufacturer, req);
    const response = buildPaginationResponse(gaugesWithLinks, total, page, limit);

    res.json({
      ...response,
      _links: generatePaginationLinks(req, page, limit, response.pagination.totalPages)
    });
  } catch (error) {
    handleGaugeError(res, error, 'fetch', { filters });
  }
}));

// GET /api/gauges/search - Search gauges
router.get('/search', authenticateToken, asyncErrorHandler(async (req, res) => {
  const { q, limit = 20, equipment_type } = req.query;

  if (!q || q.length < 2) {
    return res.status(422).json({ error: 'Search query must be at least 2 characters' });
  }

  const gaugeService = serviceRegistry.get('GaugeService');

  // Always group thread gauge sets in search results
  const groupBySets = equipment_type === 'thread_gauge';

  try {
    const results = await gaugeService.searchGauges({
      search: q,
      limit: parseInt(limit),
      equipment_type,
      groupBySets,
      fields: ['id', 'gauge_id', 'name', 'equipment_type', 'status']
    });

    const gauges = Array.isArray(results) ? results : (results.gauges || []);
    const gaugesWithManufacturer = addManufacturerData(gauges);
    const gaugesWithLinks = addHATEOAS(gaugesWithManufacturer, req);

    res.json({ data: gaugesWithLinks });
  } catch (error) {
    handleGaugeError(res, error, 'search', { query: q });
  }
}));

// GET /api/gauges/debug-checkouts - Debug checked out gauges
router.get('/debug-checkouts', authenticateToken, asyncErrorHandler(async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [gauges] = await connection.execute(`
      SELECT g.id, g.gauge_id, g.status,
             gac.checked_out_to, gac.checkout_date,
             u.id as user_id, u.name as user_name
      FROM gauges g
      LEFT JOIN gauge_active_checkouts gac ON g.id = gac.gauge_id
      LEFT JOIN core_users u ON gac.checked_out_to = u.id
      WHERE g.status = 'checked_out' AND g.is_deleted = 0
    `);

    res.json({
      success: true,
      currentUserId: req.user.id,
      currentUserIdType: typeof req.user.id,
      checkedOutGauges: gauges
    });
  } finally {
    connection.release();
  }
}));

// GET /api/gauges/dashboard - Dashboard statistics
router.get('/dashboard', authenticateToken, asyncErrorHandler(async (req, res) => {
  const gaugeService = serviceRegistry.get('GaugeService');

  try {
    const stats = await gaugeService.getDashboardSummary();
    res.json({ data: stats });
  } catch (error) {
    handleGaugeError(res, error, 'fetch dashboard', {});
  }
}));

// GET /api/gauges/my-dashboard/counts - Get counts for current user's dashboard
router.get('/my-dashboard/counts', authenticateToken, asyncErrorHandler(async (req, res) => {
  try {
    const counts = await gaugeDashboardService.getUserDashboardCounts(req.user.id);
    sendSuccess(res, null, counts);
  } catch (error) {
    handleGaugeError(res, error, 'fetch dashboard counts', { userId: req.user.id });
  }
}));

// GET /api/gauges/my-dashboard - Get current user's gauges
router.get('/my-dashboard', authenticateToken, asyncErrorHandler(async (req, res) => {
  try {
    const result = await gaugeDashboardService.getUserDashboardGauges(req.user.id);
    res.json({ success: true, data: result.gauges, total: result.total });
  } catch (error) {
    handleGaugeError(res, error, 'fetch user dashboard', { userId: req.user.id });
  }
}));

// GET /api/gauges/category-counts - Get counts by equipment type and ownership
router.get('/category-counts', authenticateToken, asyncErrorHandler(async (req, res) => {
  try {
    const categoryCounts = await gaugeDashboardService.getCategoryCounts();
    res.json({ data: categoryCounts });
  } catch (error) {
    handleGaugeError(res, error, 'fetch category counts', {});
  }
}));

// GET /api/gauges/users - Get active users for transfers
router.get('/users', authenticateToken, asyncErrorHandler(async (req, res) => {
  try {
    const activeUsers = await gaugeDashboardService.getActiveUsersForTransfer();
    res.json({ data: activeUsers });
  } catch (error) {
    handleGaugeError(res, error, 'fetch active users', {});
  }
}));

// GET /api/gauges/:id - Get specific gauge details
router.get('/:id', authenticateToken, validateGaugeId, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const gaugeService = serviceRegistry.get('GaugeService');

  try {
    const gauge = await gaugeService.getGaugeByGaugeId(id);

    if (!gauge) {
      return res.status(404).json({ error: 'Gauge not found' });
    }

    logger.info('Gauge checkout info:', {
      gauge_id: gauge.gauge_id,
      set_id: gauge.set_id,
      status: gauge.status,
      checked_out_to: gauge.checked_out_to,
      has_checkout_data: !!(gauge.checked_out_to || gauge.checkout_date)
    });

    const gaugeWithManufacturer = addManufacturerDataSingle(gauge);
    const gaugeWithLinks = addHATEOAS(gaugeWithManufacturer, req);

    res.json({ data: gaugeWithLinks });
  } catch (error) {
    handleGaugeError(res, error, 'fetch details', { gaugeId: id });
  }
}));

// POST /api/gauges - Create new gauge
router.post('/',
  authenticateToken,
  requireOperator,
  validateGaugeFields,
  createGaugeValidation,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const gaugeData = { ...req.body, created_by: req.user.id, ip_address: req.ip };
    const gaugeService = serviceRegistry.get('GaugeService');

    try {
      const createdGauge = await gaugeService.createGauge(gaugeData);
      sendSuccess(res, 'Gauge created successfully', createdGauge, 201);
    } catch (error) {
      handleGaugeError(res, error, 'create', { gaugeData });
    }
  })
);

// PATCH /api/gauges/:id - Update gauge details
router.patch('/:id',
  (req, res, next) => {
    if (req.params.id && req.params.id.includes('/certificates/')) {
      return next('route');
    }
    next();
  },
  authenticateToken,
  requireOperator,
  validateGaugeId,
  validateGaugeFields,
  updateGaugeValidation,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const gaugeService = serviceRegistry.get('GaugeService');

    try {
      const existingGauge = await gaugeService.getGaugeByGaugeId(id);
      if (!existingGauge) {
        return res.status(404).json({ error: 'Gauge not found' });
      }

      const filteredData = filterAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

      if (Object.keys(filteredData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      await gaugeService.updateGauge(existingGauge.id, filteredData, req.user.id);
      const updatedGauge = await gaugeService.getGaugeByGaugeId(id);

      logger.info('Gauge updated', {
        gaugeId: id,
        hasManufacturer: !!updatedGauge.manufacturer,
        hasModelNumber: !!updatedGauge.model_number
      });

      const gaugeWithLinks = addHATEOAS(updatedGauge, req);
      sendSuccess(res, 'Gauge updated successfully', gaugeWithLinks);
    } catch (error) {
      handleGaugeError(res, error, 'update', { gaugeId: id });
    }
  })
);

// POST /api/gauges/calibrations/send - Send gauges to calibration
router.post('/calibrations/send',
  authenticateToken,
  requireOperator,
  calibrationSendValidation,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { gauge_ids } = req.body;
    const gaugeService = serviceRegistry.get('GaugeService');

    try {
      let affectedRows = 0;

      for (const gaugeId of gauge_ids) {
        try {
          await gaugeService.updateGaugeStatus(gaugeId, 'calibration_due', req.user.id, 'Sent to calibration');
          affectedRows++;
        } catch (error) {
          logger.warn(`Failed to send gauge ${gaugeId} to calibration:`, error.message);
        }
      }

      sendSuccess(res, `${affectedRows} gauges sent to calibration`, { affected_rows: affectedRows });
    } catch (error) {
      handleGaugeError(res, error, 'send to calibration', { gauge_ids });
    }
  })
);

// POST /api/gauges/calibrations/receive - Receive gauges from calibration
router.post('/calibrations/receive',
  authenticateToken,
  requireOperator,
  calibrationReceiveValidation,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { gauge_id, passed, document_path, notes, performed_at } = req.body;
    const gaugeCalibrationService = serviceRegistry.get('GaugeCalibrationService');

    try {
      const calibrationData = {
        calibration_date: performed_at,
        calibration_result: passed ? 'pass' : 'fail',
        passed,
        document_path,
        notes,
        calibrated_by: req.user.id
      };

      const result = await gaugeCalibrationService.recordCalibration(gauge_id, calibrationData);
      sendSuccess(res, 'Calibration result recorded successfully', result);
    } catch (error) {
      handleGaugeError(res, error, 'record calibration', { gauge_id });
    }
  })
);

// POST /api/gauges/calibrations/bulk-send - Bulk send gauges to calibration
router.post('/calibrations/bulk-send',
  authenticateToken,
  requireOperator,
  calibrationSendValidation,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { gauge_ids } = req.body;
    const gaugeService = serviceRegistry.get('GaugeService');

    try {
      let affectedRows = 0;

      for (const gaugeId of gauge_ids) {
        try {
          await gaugeService.updateGaugeStatus(gaugeId, 'calibration_due', req.user.id, 'Bulk sent to calibration');
          affectedRows++;
        } catch (error) {
          logger.warn(`Failed to bulk send gauge ${gaugeId} to calibration:`, error.message);
        }
      }

      sendSuccess(res, `${affectedRows} gauges sent to calibration`, { affected_rows: affectedRows });
    } catch (error) {
      handleGaugeError(res, error, 'bulk send to calibration', { gauge_ids });
    }
  })
);

// POST /api/gauges/recovery/:id/reset - Reset gauge (admin only)
router.post('/recovery/:id/reset',
  authenticateToken,
  requireAdmin,
  validateGaugeId,
  resetGaugeValidation,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const gaugeService = serviceRegistry.get('GaugeService');
    const checkoutService = serviceRegistry.get('GaugeCheckoutService');

    try {
      const gauge = await gaugeService.getGaugeByGaugeId(id);
      if (!gauge) {
        return res.status(404).json({ error: 'Gauge not found' });
      }

      await gaugeService.updateGaugeStatus(id, 'available', req.user.id, `Admin reset: ${reason}`);

      try {
        await checkoutService.returnGauge(id, {
          condition_at_return: 'unknown',
          return_notes: `Admin reset: ${reason}`,
          force: true
        }, req.user.id);
      } catch (error) {
        logger.debug(`No active checkout to clear for gauge ${id}`);
      }

      sendSuccess(res, 'Gauge reset successfully', { gauge_id: id, status: 'available' });
    } catch (error) {
      handleGaugeError(res, error, 'reset', { gaugeId: id, reason });
    }
  })
);

// POST /api/gauges/bulk-update - Bulk update gauges
router.post('/bulk-update',
  authenticateToken,
  requireOperator,
  bulkUpdateValidation,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { gauge_ids, updates } = req.body;
    const gaugeService = serviceRegistry.get('GaugeService');

    const filteredUpdates = filterAllowedFields(updates, ALLOWED_BULK_UPDATE_FIELDS);

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(422).json({ error: 'No valid fields to update' });
    }

    try {
      let affectedRows = 0;

      for (const gaugeId of gauge_ids) {
        try {
          const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);
          if (!gauge) {
            logger.warn(`Gauge ${gaugeId} not found for bulk update`);
            continue;
          }

          await gaugeService.updateGauge(gauge.id, filteredUpdates, req.user.id);
          affectedRows++;
        } catch (error) {
          logger.warn(`Failed to update gauge ${gaugeId}:`, error.message);
        }
      }

      sendSuccess(res, `${affectedRows} gauges updated successfully`, {
        affected_rows: affectedRows,
        updated_fields: Object.keys(filteredUpdates)
      });
    } catch (error) {
      handleGaugeError(res, error, 'bulk update', { gauge_ids, updates });
    }
  })
);

module.exports = router;
