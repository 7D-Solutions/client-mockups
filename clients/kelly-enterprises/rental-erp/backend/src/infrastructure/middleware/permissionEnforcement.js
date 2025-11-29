/**
 * Permission Enforcement Middleware
 * Simple route-based permission checking using checkPermission
 * Replaces rbacMiddleware as per consensus
 */

const { checkPermission } = require('./checkPermission');
const logger = require('../utils/logger');

/**
 * Route to permission mapping
 * Maps API routes to required permissions (module.resource.action format)
 * Based on 8-permission system
 */
const ROUTE_PERMISSIONS = {
  // Admin routes - user management
  'GET /api/admin/users': { resource: 'user.manage', action: 'full' },
  'POST /api/admin/users': { resource: 'user.manage', action: 'full' },
  'PUT /api/admin/users/:id': { resource: 'user.manage', action: 'full' },
  'DELETE /api/admin/users/:id': { resource: 'user.manage', action: 'full' },

  // Gauge routes - view vs manage
  'GET /api/gauges': { resource: 'gauge.view', action: 'access' },
  'POST /api/gauges': { resource: 'gauge.manage', action: 'full' },
  'PATCH /api/gauges/:id': { resource: 'gauge.manage', action: 'full' },
  'DELETE /api/gauges/:id': { resource: 'gauge.manage', action: 'full' },
  'POST /api/gauges/:id/checkout': { resource: 'gauge.operate', action: 'execute' },
  'PUT /api/gauges/:id/return': { resource: 'gauge.operate', action: 'execute' },

  // QC/Calibration routes
  'GET /api/gauges/tracking/qc/pending': { resource: 'calibration.manage', action: 'full' },
  'POST /api/gauges/tracking/:gaugeId/qc-verify': { resource: 'calibration.manage', action: 'full' },

  // Inventory routes - view vs manage
  'GET /api/inventory/reports/overview': { resource: 'inventory.view', action: 'access' },
  'GET /api/inventory/reports/by-location/:locationCode': { resource: 'inventory.view', action: 'access' },
  'GET /api/inventory/reports/movements': { resource: 'inventory.view', action: 'access' },
  'GET /api/inventory/reports/statistics': { resource: 'inventory.view', action: 'access' },
  'GET /api/inventory/reports/search': { resource: 'inventory.view', action: 'access' },
  'GET /api/inventory/location/:itemType/:itemIdentifier': { resource: 'inventory.view', action: 'access' },
  'GET /api/inventory/movements/:itemType/:itemIdentifier': { resource: 'inventory.view', action: 'access' },
  'POST /api/inventory/move': { resource: 'inventory.manage', action: 'full' },
  'DELETE /api/inventory/location/:itemType/:itemIdentifier': { resource: 'inventory.manage', action: 'full' },

  // Default permission for gauge-related routes (baseline access)
  '_default_gauges': { resource: 'gauge.view', action: 'access' }
};

/**
 * Simple permission enforcement using checkPermission
 */
const enforcePermission = async (req, res, next) => {
  try {
    // Skip public routes
    const publicRoutes = [
      '/health',
      '/api/health',
      '/auth/login',
      '/metrics',
      '/api/metrics'
    ];
    
    if (publicRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }
    
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized'
      });
    }
    
    // Build route key
    const routePath = req.route?.path || req.path;
    const routeKey = `${req.method} ${routePath.startsWith('/api') ? routePath : '/api' + routePath}`;
    
    // Find required permission
    let requiredPermission = null;
    for (const [pattern, permission] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pattern.startsWith('_default_')) continue;
      
      const regex = new RegExp('^' + pattern.replace(/:\w+/g, '[^/]+') + '$');
      if (regex.test(routeKey)) {
        requiredPermission = permission;
        break;
      }
    }
    
    // Default to gauge.view for gauge-related routes
    if (!requiredPermission && req.path.includes('gauge')) {
      requiredPermission = ROUTE_PERMISSIONS._default_gauges;
    }
    
    if (!requiredPermission) {
      logger.warn(`No permission mapping for route: ${routeKey}`);
      // Allow access if no specific permission is mapped
      return next();
    }

    // Split resource into module and resource parts (format: 'module.resource')
    const [module, resource] = requiredPermission.resource.split('.');
    if (!module || !resource) {
      logger.error(`Invalid permission format: ${requiredPermission.resource}`);
      return res.status(500).json({
        success: false,
        error: 'internal_server_error'
      });
    }

    // Use checkPermission to verify access with correct parameters
    return checkPermission(module, resource, requiredPermission.action)(req, res, next);
    
  } catch (error) {
    logger.error('Permission enforcement error:', error);
    return res.status(500).json({
      success: false,
      error: 'internal_server_error'
    });
  }
};

module.exports = {
  enforcePermission,
  ROUTE_PERMISSIONS
};