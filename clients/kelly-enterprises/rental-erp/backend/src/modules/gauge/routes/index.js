/**
 * Gauge Module Route Aggregator
 * Consolidates all gauge-related routes for easy mounting
 */

const express = require('express');
const router = express.Router();

// Import all gauge routes
const gaugeTrackingReportsRoutes = require('./gauge-tracking-reports.routes');
const gaugeTrackingOperationsRoutes = require('./gauge-tracking-operations.routes');
const gaugeTrackingTransfersRoutes = require('./gauge-tracking-transfers.routes');
const gaugeTrackingUnsealsRoutes = require('./gauge-tracking-unseals.routes');
const gaugeQcRoutes = require('./gauge-qc');
const gaugesRoutes = require('./gauges'); // Primary gauge API routes
const gaugesV2Routes = require('./gauges-v2'); // V2 standardization endpoints
const gaugeCertificatesRoutes = require('./gauge-certificates'); // Certificate upload routes
const calibrationRoutes = require('./calibration.routes'); // Calibration workflow routes
const rejectionReasonsRoutes = require('./rejection-reasons');

// Create a single tracking router and define routes in the correct order
const trackingRouter = express.Router();

// Import required modules for the history route
const { param, validationResult } = require('express-validator');
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const logger = require('../../../infrastructure/utils/logger');

// Define the history route FIRST (most specific)
trackingRouter.get('/:gaugeId/history', 
  authenticateToken, 
  param('gaugeId').notEmpty().withMessage('Gauge ID is required'),
  asyncErrorHandler(async (req, res) => {
    logger.info('History endpoint hit directly in index.js', { gaugeId: req.params.gaugeId });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { gaugeId } = req.params;
    const reportsService = serviceRegistry.get('ReportsService');
    const result = await reportsService.getGaugeHistory(gaugeId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  })
);

// Then mount other routes
trackingRouter.use('/', gaugeTrackingReportsRoutes); // Other reports routes
trackingRouter.use('/', gaugeTrackingTransfersRoutes); // Transfers routes
trackingRouter.use('/', gaugeTrackingUnsealsRoutes); // Unseals routes
trackingRouter.use('/', gaugeTrackingOperationsRoutes); // Operations routes (LAST - has catch-all /:gaugeId)

// Mount the combined tracking router
router.use('/tracking', trackingRouter);
router.use('/tracking/qc', gaugeQcRoutes); // QC routes split from tracking
router.use('/rejection-reasons', rejectionReasonsRoutes);

// Mount V2 routes before main routes to avoid conflicts
router.use('/v2', gaugesV2Routes);

// Mount calibration routes (specific paths must come before catch-all routes)
router.use('/calibration', calibrationRoutes);

// Mount certificate routes (specific paths must come before catch-all routes)
router.use('/', gaugeCertificatesRoutes);

// Mount gauge routes directly at root
router.use('/', gaugesRoutes);

module.exports = router;