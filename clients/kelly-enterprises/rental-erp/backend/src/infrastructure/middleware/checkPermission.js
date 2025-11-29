/**
 * Permission-based authorization middleware
 * Checks if user has specific permissions rather than role-based checks
 */

const logger = require('../utils/logger');

/**
 * Middleware factory to check if user has a specific permission
 * @param {string} module - The module name (e.g., 'gauge', 'calibration', 'admin')
 * @param {string} resource - The resource name (e.g., 'gauges', 'calibration', 'audit')
 * @param {string} action - The action name (e.g., 'read', 'write', 'delete')
 * @returns {Function} Express middleware function
 */
const checkPermission = (module, resource, action) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const requiredPermission = `${module}.${resource}.${action}`;

    // Check if user has the permission (already loaded in auth middleware)
    if (req.user.permissions?.includes(requiredPermission)) {
      return next();
    }

    // User doesn't have permission
    logger.warn('Permission denied', {
      userId: req.user.id,
      required: requiredPermission,
      userPermissions: req.user.permissions
    });

    return res.status(403).json({
      success: false,
      error: `Permission denied: ${requiredPermission} required`
    });
  };
};

/**
 * Middleware to check if user has ANY of the specified permissions
 * @param {Array} permissions - Array of {module, resource, action} objects
 * @returns {Function} Express middleware function
 */
const checkAnyPermission = (permissions) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Build required permission strings
    const requiredPermissions = permissions.map(p => `${p.module}.${p.resource}.${p.action}`);

    // Check if user has any of the required permissions
    const hasAnyPermission = requiredPermissions.some(perm =>
      req.user.permissions?.includes(perm)
    );

    if (hasAnyPermission) {
      return next();
    }

    // User doesn't have any of the required permissions
    const permissionList = requiredPermissions.join(' or ');

    logger.warn('Permission denied', {
      userId: req.user.id,
      required: permissionList,
      userPermissions: req.user.permissions
    });

    return res.status(403).json({
      success: false,
      error: `Permission denied: ${permissionList} required`
    });
  };
};

module.exports = {
  checkPermission,
  checkAnyPermission
};