const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { getPool } = require('../database/connection');

/**
 * JWT Authentication Middleware for Gauge Tracking System
 * Validates JWT tokens and extracts user context
 * Compatible with the main Fireproof authentication system
 */
const authenticateToken = async (req, res, next) => {
  // Debug logging for mobile testing
  console.log('[AUTH] Checking auth for:', {
    path: req.path,
    hasCookies: !!req.cookies,
    cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
    hasAuthToken: !!req.cookies?.authToken,
    cookieHeader: req.headers.cookie,  // RAW cookie header from request
    allHeaders: Object.keys(req.headers),
    userAgent: req.get('User-Agent')?.substring(0, 50)
  });

  // First try to get token from cookie
  let token = req.cookies?.authToken;

  // Fall back to Authorization header for API clients
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  }

  if (!token) {
    console.log('[AUTH] No token found - 401');
    return res.status(401).json({
      success: false,
      error: 'Access denied. Authentication required.'
    });
  }

  try {
    const verified = jwt.verify(token, config.security.jwtSecret);

    // SECURITY FIX: Validate user exists and is active in database
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }

    const [users] = await pool.execute(
      `SELECT
        u.id,
        u.email,
        u.is_active,
        u.name,
        r.name as role,
        GROUP_CONCAT(DISTINCT CONCAT(p.module_id, '.', p.resource, '.', p.action)) as user_permissions,
        GROUP_CONCAT(DISTINCT CONCAT(rp_perm.module_id, '.', rp_perm.resource, '.', rp_perm.action)) as role_permissions
      FROM core_users u
      LEFT JOIN core_user_roles ur ON u.id = ur.user_id
      LEFT JOIN core_roles r ON ur.role_id = r.id
      LEFT JOIN core_user_permissions up ON u.id = up.user_id
      LEFT JOIN core_permissions p ON up.permission_id = p.id
      LEFT JOIN core_role_permissions rp ON r.id = rp.role_id
      LEFT JOIN core_permissions rp_perm ON rp.permission_id = rp_perm.id
      WHERE u.id = ? AND u.is_active = 1
      GROUP BY u.id, u.email, u.is_active, u.name, r.name`,
      [verified.user_id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token - user not found or inactive.'
      });
    }

    const user = users[0];

    // Combine user permissions and role permissions
    const userPerms = user.user_permissions ? user.user_permissions.split(',') : [];
    const rolePerms = user.role_permissions ? user.role_permissions.split(',') : [];
    const allPermissions = [...new Set([...userPerms, ...rolePerms])];

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || user.email,
      role: user.role,
      permissions: allPermissions
    };

    console.log('[AUTH] User authenticated:', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      permissionCount: allPermissions.length,
      path: req.path
    });

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Session expired. Please login again.' 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      error: 'Invalid authentication.' 
    });
  }
};

/**
 * Permission-based access control middleware
 * Use checkPermission from checkPermission.js for specific permissions
 * These are convenience wrappers for common permission patterns
 */

/**
 * Admin-only access middleware
 * Requires system.admin.full permission
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const requiredPermission = 'system.admin.full';
  if (req.user.permissions?.includes(requiredPermission)) {
    return next();
  }

  console.log('[PERMISSION CHECK]', {
    userId: req.user.id,
    required: requiredPermission,
    userPermissions: req.user.permissions,
    path: req.path
  });

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions. Access denied.'
  });
};

/**
 * Inspector or higher access middleware
 * Requires calibration.manage.full or system.admin.full permission
 */
const requireInspector = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const requiredPermissions = ['calibration.manage.full', 'system.admin.full'];
  const hasPermission = requiredPermissions.some(perm => req.user.permissions?.includes(perm));

  if (hasPermission) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions. Access denied.'
  });
};

/**
 * Operator or higher access middleware
 * Requires gauge.view.access permission (baseline access)
 */
const requireOperator = (req, res, next) => {
  if (!req.user) {
    console.log('[requireOperator] No user in request');
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  console.log('[requireOperator] Checking permissions:', {
    userId: req.user.id,
    permissions: req.user.permissions
  });

  const requiredPermission = 'gauge.view.access';
  if (req.user.permissions?.includes(requiredPermission)) {
    console.log('[requireOperator] Permission check passed');
    return next();
  }

  console.log('[requireOperator] Access denied - insufficient permissions');
  return res.status(403).json({
    success: false,
    error: 'Insufficient permissions. Access denied.'
  });
};

/**
 * Super Admin only access middleware
 * Requires system.admin.full permission
 */
const requireSuperAdmin = requireAdmin;

module.exports = {
  authenticateToken,
  requireAdmin,
  requireInspector,
  requireOperator,
  requireSuperAdmin
};