const express = require('express');
const router = express.Router();
const { authenticateToken, requireInspector } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

// ========== BATCH MANAGEMENT (Steps 1-3) ==========

/**
 * POST /api/calibration/batches
 * Step 1: Create calibration batch
 */
router.post('/batches',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { calibrationType, vendorName, trackingNumber } = req.body;

    const calibrationService = serviceRegistry.get('CalibrationBatchManagementService');
    const batch = await calibrationService.createBatch({
      calibrationType,
      vendorName,
      trackingNumber
    }, req.user.id);

    res.status(201).json({ success: true, data: batch });
  })
);

/**
 * GET /api/calibration/batches
 * List all batches with optional filters
 */
router.get('/batches',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { status, calibrationType } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (calibrationType) filters.calibrationType = calibrationType;

    const calibrationService = serviceRegistry.get('CalibrationBatchManagementService');
    const batches = await calibrationService.findBatches(filters);

    res.json({ success: true, data: batches });
  })
);

/**
 * GET /api/calibration/batches/:batchId
 * Get batch details with gauges
 */
router.get('/batches/:batchId',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { batchId } = req.params;

    const calibrationService = serviceRegistry.get('CalibrationBatchManagementService');
    const batch = await calibrationService.getBatchDetails(batchId);

    res.json({ success: true, data: batch });
  })
);

/**
 * POST /api/calibration/batches/:batchId/gauges
 * Step 2: Add gauge to batch
 */
router.post('/batches/:batchId/gauges',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { batchId } = req.params;
    const { gaugeId } = req.body;

    if (!gaugeId) {
      return res.status(400).json({
        success: false,
        message: 'Gauge ID is required'
      });
    }

    const calibrationService = serviceRegistry.get('CalibrationBatchManagementService');
    const result = await calibrationService.addGaugeToBatch(
      parseInt(batchId),
      parseInt(gaugeId),
      req.user.id
    );

    res.json({ success: true, data: result });
  })
);

/**
 * DELETE /api/calibration/batches/:batchId/gauges/:gaugeId
 * Remove gauge from batch (before sending)
 */
router.delete('/batches/:batchId/gauges/:gaugeId',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { batchId, gaugeId } = req.params;

    const calibrationService = serviceRegistry.get('CalibrationBatchManagementService');
    const result = await calibrationService.removeGaugeFromBatch(
      parseInt(batchId),
      parseInt(gaugeId),
      req.user.id
    );

    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/calibration/batches/:batchId/send
 * Step 3: Send batch to calibration
 */
router.post('/batches/:batchId/send',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { batchId } = req.params;

    const calibrationService = serviceRegistry.get('CalibrationBatchManagementService');
    const result = await calibrationService.sendBatch(parseInt(batchId), req.user.id);

    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/calibration/batches/:batchId/cancel
 * Cancel batch (before sending)
 */
router.post('/batches/:batchId/cancel',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { batchId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }

    const calibrationService = serviceRegistry.get('CalibrationBatchManagementService');
    const result = await calibrationService.cancelBatch(
      parseInt(batchId),
      req.user.id,
      reason
    );

    res.json({ success: true, data: result });
  })
);

// ========== GAUGE CALIBRATION WORKFLOW (Steps 4, 6, 7) ==========

/**
 * POST /api/calibration/gauges/:id/receive
 * Step 4: Receive gauge from calibration
 */
router.post('/gauges/:id/receive',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { id: gaugeId } = req.params;
    const { calibrationPassed = true } = req.body;

    const workflowService = serviceRegistry.get('CalibrationWorkflowService');
    const result = await workflowService.receiveGauge(
      parseInt(gaugeId),
      req.user.id,
      calibrationPassed
    );

    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/calibration/gauges/receive-multiple
 * Bulk receive multiple gauges from calibration
 */
router.post('/gauges/receive-multiple',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { gauges } = req.body;

    if (!Array.isArray(gauges) || gauges.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Gauges array is required and must not be empty'
      });
    }

    // Validate each gauge has required fields
    for (const gauge of gauges) {
      if (!gauge.gaugeId) {
        return res.status(400).json({
          success: false,
          message: 'Each gauge must have a gaugeId'
        });
      }
    }

    const workflowService = serviceRegistry.get('CalibrationWorkflowService');
    const result = await workflowService.receiveMultipleGauges(gauges, req.user.id);

    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/calibration/gauges/:id/verify-certificates
 * Step 6: Verify certificates and move to pending_release
 */
router.post('/gauges/:id/verify-certificates',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { id: gaugeId } = req.params;

    const workflowService = serviceRegistry.get('CalibrationWorkflowService');
    const result = await workflowService.verifyCertificates(
      parseInt(gaugeId),
      req.user.id
    );

    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/calibration/gauges/:id/release
 * Step 7: Verify location and release to available
 */
router.post('/gauges/:id/release',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { id: gaugeId } = req.params;
    const { storageLocation } = req.body; // Optional

    const workflowService = serviceRegistry.get('CalibrationWorkflowService');
    const result = await workflowService.verifyLocationAndRelease(
      parseInt(gaugeId),
      req.user.id,
      storageLocation || null
    );

    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/calibration/gauges/:id/status
 * Get gauge calibration workflow status
 */
router.get('/gauges/:id/status',
  authenticateToken,
  requireInspector,
  asyncErrorHandler(async (req, res) => {
    const { id: gaugeId } = req.params;

    const workflowService = serviceRegistry.get('CalibrationWorkflowService');
    const status = await workflowService.getCalibrationStatus(parseInt(gaugeId));

    res.json({ success: true, data: status });
  })
);

// ========== INTERNAL HAND TOOL CALIBRATION ==========

/**
 * GET /api/calibration/gauges/:id/gauge-blocks
 * Get suggested gauge blocks for hand tool calibration
 */
router.get('/gauges/:id/gauge-blocks',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const { id: gaugeId } = req.params;

    try {
      const calibrationService = serviceRegistry.get('GaugeCalibrationService');
      const result = await calibrationService.getSuggestedGaugeBlocks(gaugeId);

      res.json({ success: true, data: result });
    } catch (error) {
      // Use custom status code and user-friendly message if available
      const statusCode = error.statusCode || 500;
      const message = error.userMessage || error.message || 'Failed to load gauge blocks';

      res.status(statusCode).json({
        success: false,
        message: message
      });
    }
  })
);

/**
 * POST /api/calibration/gauges/:id/internal-hand-tool
 * Record internal hand tool calibration with multi-point measurements
 */
router.post('/gauges/:id/internal-hand-tool',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    const { id: gaugeId } = req.params;

    // Check for calibration permission
    const requiredPermission = 'gauge.calibration.record_internal';
    if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to record internal calibrations'
      });
    }

    const calibrationService = serviceRegistry.get('GaugeCalibrationService');
    const result = await calibrationService.recordInternalHandToolCalibration(
      gaugeId,
      req.body,
      req.user.id
    );

    res.json({ success: true, data: result });
  })
);

module.exports = router;
