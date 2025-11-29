const express = require('express');
const router = express.Router();
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const movementController = require('../controllers/movementController');

/**
 * POST /api/inventory/move
 * Move an item to a new location
 *
 * Body:
 * - itemType: 'gauge' | 'tool' | 'part' | 'equipment' | 'material'
 * - itemIdentifier: string (GAUGE-001, TOOL-015, P/N-12345, etc.)
 * - toLocation: string (location code)
 * - reason: string (optional)
 * - notes: string (optional)
 * - quantity: number (required for parts, defaults to 1)
 * - orderNumber: string (optional, for parts sold)
 * - jobNumber: string (optional, for parts consumed)
 * Note: Authentication handled by global middleware in app.js
 */
router.post('/move',
  asyncErrorHandler(movementController.moveItem)
);

/**
 * GET /api/inventory/location/:itemType/:itemIdentifier
 * Get current location for an item
 * Note: Authentication handled by global middleware in app.js
 */
router.get('/location/:itemType/:itemIdentifier',
  asyncErrorHandler(movementController.getCurrentLocation)
);

/**
 * DELETE /api/inventory/location/:itemType/:itemIdentifier
 * Remove item from inventory (when item is deleted)
 *
 * Body:
 * - reason: string (optional)
 * Note: Authentication handled by global middleware in app.js
 */
router.delete('/location/:itemType/:itemIdentifier',
  asyncErrorHandler(movementController.removeItem)
);

/**
 * GET /api/inventory/movements/:itemType/:itemIdentifier
 * Get movement history for an item
 *
 * Query params:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * Note: Authentication handled by global middleware in app.js
 */
router.get('/movements/:itemType/:itemIdentifier',
  asyncErrorHandler(movementController.getMovementHistory)
);

module.exports = router;
