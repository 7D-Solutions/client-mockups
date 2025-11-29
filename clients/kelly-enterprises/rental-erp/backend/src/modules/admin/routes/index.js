const express = require('express');
const adminRoutes = require('./admin');
const adminMaintenanceRoutes = require('./admin-maintenance');
const adminStatsRoutes = require('./admin-stats');
const systemRecoveryRoutes = require('./system-recovery');
const userManagementRoutes = require('./user-management');
const auditLogsRoutes = require('./audit-logs');
const permissionsRoutes = require('./permissions');
const organizationRoutes = require('./organization');

const router = express.Router();

// Mount admin routes
router.use('/', adminRoutes);
router.use('/maintenance', adminMaintenanceRoutes);
router.use('/statistics', adminStatsRoutes);
router.use('/system-recovery', systemRecoveryRoutes);
router.use('/user-management', userManagementRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/organization', organizationRoutes);

module.exports = router;