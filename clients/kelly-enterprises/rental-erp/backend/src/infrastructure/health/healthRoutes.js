const express = require('express');
const healthRoutes = require('./health');
const auditHealthRoutes = require('./audit-health');

const router = express.Router();

// Mount all health routes (/, /detailed, /metrics) - no auth required
router.use('/', healthRoutes);

// Audit health monitoring - requires auth and permissions
router.use('/audit', auditHealthRoutes);

module.exports = router;