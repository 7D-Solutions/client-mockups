const express = require('express');
const router = express.Router();
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const reportingController = require('../controllers/reportingController');

/**
 * GET /api/inventory/reports/overview
 * Get inventory dashboard overview
 * Returns all locations with their items
 * Note: Authentication handled by global middleware in app.js
 */
router.get('/overview',
  asyncErrorHandler(reportingController.getOverview)
);

/**
 * GET /api/inventory/reports/by-location/:locationCode
 * Get all items in a specific location
 * Returns location details with items grouped by type
 * Note: Authentication handled by global middleware in app.js
 */
router.get('/by-location/:locationCode',
  asyncErrorHandler(reportingController.getLocationDetails)
);

/**
 * GET /api/inventory/reports/movements
 * Get movement history with optional filters
 *
 * Query params:
 * - itemType: string (gauge, tool, part)
 * - movementType: string (transfer, created, deleted, other)
 * - fromDate: date
 * - toDate: date
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * Note: Authentication handled by global middleware in app.js
 */
router.get('/movements',
  asyncErrorHandler(reportingController.getMovements)
);

/**
 * GET /api/inventory/reports/statistics
 * Get inventory statistics summary
 * Returns counts by item type, total locations, recent movements
 * Note: Authentication handled by global middleware in app.js
 */
router.get('/statistics',
  asyncErrorHandler(reportingController.getStatistics)
);

/**
 * GET /api/inventory/reports/search
 * Search inventory items
 *
 * Query params:
 * - type: string ('all', 'id', 'name', 'location') - default: 'all'
 * - term: string (required) - search term
 * Note: Authentication handled by global middleware in app.js
 */
router.get('/search',
  asyncErrorHandler(reportingController.searchInventory)
);

module.exports = router;
