const express = require('express');
const { authenticateToken, requireAdmin } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const AdminService = require('../services/adminService');
const AdminRepository = require('../repositories/AdminRepository');
const logger = require('../../../infrastructure/utils/logger');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

const router = express.Router();

// Initialize service with repository
const adminRepository = new AdminRepository();
const adminService = new AdminService(adminRepository);

/**
 * GET /api/admin/stats
 * Get comprehensive admin statistics and metrics
 * Requires: admin authentication
 */
router.get('/', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  try {
    // Get system stats from admin service
    const systemStats = await adminService.getSystemStats();
    
    // Get gauge statistics using calibration service from registry
    let gaugeStats = {};
    try {
      if (serviceRegistry.has('GaugeCalibrationService')) {
        const gaugeCalibrationService = serviceRegistry.get('GaugeCalibrationService');
        gaugeStats = await gaugeCalibrationService.getCalibrationStatistics();
      } else {
        logger.warn('GaugeCalibrationService not found in registry');
      }
    } catch (error) {
      logger.error('Error getting gauge calibration stats:', error);
    }

    // Get recent activity from audit logs
    const recentActivity = await adminRepository.getRecentActivity(7 * 24); // Last 7 days

    res.json({
      success: true,
      data: {
        users: systemStats.users,
        gauges: gaugeStats,
        activity: recentActivity,
        logins: systemStats.loginStats,
        generated_at: new Date()
      }
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
}));

/**
 * GET /api/admin/stats/detailed
 * Get detailed breakdown of statistics
 * Requires: admin authentication
 */
router.get('/detailed', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  try {
    // Get detailed stats from admin service
    const detailedStats = await adminService.getDetailedUserStats();
    const gaugeStats = await adminService.getGaugeStats();

    res.json({
      success: true,
      data: {
        usersByRole: detailedStats.userByRole,
        gaugeBreakdown: gaugeStats.breakdown,
        loginTrends: detailedStats.loginTrends,
        generated_at: new Date()
      }
    });
  } catch (error) {
    logger.error('Error fetching detailed stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch detailed statistics' 
    });
  }
}));

/**
 * GET /api/admin/stats/system-health
 * Get system health metrics
 * Requires: admin authentication
 */
router.get('/system-health', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  try {
    // Database health check
    const dbHealth = await new Promise((resolve) => {
      adminRepository.getConnectionWithTimeout(1000)
        .then(conn => {
          conn.release();
          resolve({ connected: true, latency: 'low' });
        })
        .catch(() => resolve({ connected: false, latency: 'timeout' }));
    });

    // Memory usage
    const memUsage = process.memoryUsage();
    
    // Uptime
    const uptime = process.uptime();

    res.json({
      success: true,
      data: {
        database: dbHealth,
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
        },
        uptime: {
          seconds: uptime,
          formatted: formatUptime(uptime)
        },
        nodeVersion: process.version,
        platform: process.platform,
        generated_at: new Date()
      }
    });
  } catch (error) {
    logger.error('Error fetching system health:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch system health' 
    });
  }
}));

/**
 * Helper function to format uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  
  return parts.join(', ') || 'Less than a minute';
}

module.exports = router;