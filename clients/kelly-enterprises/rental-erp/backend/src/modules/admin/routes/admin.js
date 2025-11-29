const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const AdminService = require('../services/adminService');
const AdminRepository = require('../repositories/AdminRepository');
const logger = require('../../../infrastructure/utils/logger');
const { parsePaginationParams, buildPaginationResponse, validatePaginationMiddleware } = require('../../../infrastructure/utils/pagination');

const router = express.Router();

// Initialize service with repository
const adminRepository = new AdminRepository();
const adminService = new AdminService(adminRepository);

// Validation middleware for user creation
const validateUserCreate = [
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      // If empty after trim, it's valid (email is optional)
      if (!value) return true;
      // Otherwise validate as email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    })
    .normalizeEmail(),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be less than 20 characters'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  body('roles.*')
    .optional()
    .isString()
    .withMessage('Each role must be a string')
];

// Validation middleware for user update
const validateUserUpdate = [
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      // If empty after trim, it's valid (email is optional)
      if (!value) return true;
      // Otherwise validate as email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    })
    .normalizeEmail(),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be less than 20 characters'),
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  body('roles.*')
    .optional()
    .isString()
    .withMessage('Each role must be a string'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, validatePaginationMiddleware, asyncErrorHandler(async (req, res) => {
  // Use centralized pagination parsing with module-specific defaults
  const { page, limit, offset, search } = parsePaginationParams(req.query, 'USER_MANAGEMENT');

  // Extract sort parameters
  const sortBy = req.query.sortBy || 'name';
  const sortOrder = req.query.sortOrder || 'asc';

  // Get users from service (which will use the search and sort parameters)
  const result = await adminService.getAllUsers(page, limit, search, sortBy, sortOrder);
  
  // Build standardized response
  const response = buildPaginationResponse(
    result.users,
    result.total,
    page,
    limit
  );
  
  res.json({
    success: true,
    ...response
  });
}));

// Get single user (admin only)
router.get('/users/:id', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  
  const user = await adminService.getUserById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
  
  res.json({
    success: true,
    data: user
  });
}));

// Create new user (admin only)
router.post('/users', authenticateToken, requireAdmin, validateUserCreate, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { email, firstName, lastName, username, department, phone, password, roles = [], permissions = [] } = req.body;

  try {
    const user = await adminService.createUser({
      email,
      firstName,
      lastName,
      username,
      department,
      phone,
      password,
      roleNames: roles
    });

    // If permissions array is provided, grant them to the user
    if (permissions && permissions.length > 0) {
      await adminService.grantPermissionsBulk(user.id, permissions);
      logger.info('Permissions granted to new user', {
        adminId: req.user.id,
        newUserId: user.id,
        permissionCount: permissions.length
      });
    }

    logger.info('User created', {
      adminId: req.user.id,
      newUserId: user.id,
      email: user.email,
      hasPermissions: permissions.length > 0
    });

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.message.includes('Email already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }
    throw error;
  }
}));

// Update user (admin only)
router.put('/users/:id', authenticateToken, requireAdmin, validateUserUpdate, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const userId = parseInt(req.params.id);
  const { email, firstName, lastName, username, department, phone, roles, isActive } = req.body;

  // Prevent users from modifying their own roles (privilege escalation vulnerability)
  if (userId === req.user.id && roles !== undefined) {
    return res.status(403).json({
      success: false,
      error: 'Cannot modify your own roles. Please contact another administrator.'
    });
  }

  try {
    // Get target user's current roles to check permissions
    const targetUser = await adminService.getUserById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Permission check: user.manage.full permission is required (already enforced by route middleware)
    // No additional hierarchy check needed with permission-based auth

    const user = await adminService.updateUser(userId, {
      email,
      firstName,
      lastName,
      username,
      department,
      phone,
      roleNames: roles,
      isActive
    });
    
    logger.info('User updated', { 
      adminId: req.user.id,
      updatedUserId: userId,
      changes: req.body 
    });
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.message.includes('User not found')) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    if (error.message.includes('Email already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }
    throw error;
  }
}));

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  // Prevent self-deletion
  if (userId === req.user.id) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete your own account'
    });
  }

  try {
    // Get target user's current roles to check permissions
    const targetUser = await adminService.getUserById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Permission check: user.manage.full permission is required (already enforced by route middleware)
    // No additional hierarchy check needed with permission-based auth

    await adminService.deleteUser(userId);
    
    logger.info('User deleted', { 
      adminId: req.user.id,
      deletedUserId: userId 
    });
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    if (error.message.includes('User not found')) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    throw error;
  }
}));

// Reset user password (admin only) - accepts custom password or generates one
router.post('/users/:id/reset-password', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { password } = req.body;

  try {
    // Use provided password or generate a secure temporary password
    let temporaryPassword;
    if (password && password.trim()) {
      temporaryPassword = password.trim();
    } else {
      const crypto = require('crypto');
      temporaryPassword = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) + '!';
    }

    await adminService.resetUserPassword(userId, temporaryPassword);

    logger.info('User password reset', {
      adminId: req.user.id,
      userId: userId,
      customPassword: !!password
    });

    res.json({
      success: true,
      temporaryPassword: temporaryPassword,
      message: 'Password reset successfully'
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    throw error;
  }
}));

// Unlock user account (admin only)
router.post('/users/:id/unlock', [
  param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  body('reason').optional().isString().isLength({ min: 1, max: 500 }).withMessage('Reason must be a string between 1 and 500 characters'),
  body('notify').optional().isBoolean().withMessage('Notify parameter must be a boolean'),
], authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'validation_failed',
      details: errors.array()
    });
  }
  
  const userId = parseInt(req.params.id);
  
  try {
    await adminService.unlockUser(userId);
    
    logger.info('User account unlocked', { 
      adminId: req.user.id,
      userId: userId 
    });
    
    res.json({
      success: true,
      message: 'User account unlocked successfully'
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    throw error;
  }
}));

// Get all roles (admin only)
router.get('/roles', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  const roles = await adminService.getAllRoles();
  
  res.json({
    success: true,
    data: roles
  });
}));

// Get admin statistics and metrics
router.get('/stats', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  try {
    const stats = await adminService.getSystemStats();
    const gaugeStats = await adminService.getGaugeStats();
    
    // Format recent activity to match expected structure
    const formattedActivity = stats.recentActivity.map(item => ({
      date: item.date,
      actions: item.new_users
    }));
    
    res.json({
      success: true,
      data: {
        users: {
          total_users: stats.users.total_users,
          active_users: stats.users.active_users,
          inactive_users: stats.users.total_users - stats.users.active_users,
          new_users_30d: stats.recentActivity.reduce((sum, item) => sum + item.new_users, 0)
        },
        gauges: {
          total_gauges: gaugeStats.basic.total_gauges,
          available_gauges: gaugeStats.basic.available,
          checked_out_gauges: gaugeStats.basic.checked_out,
          calibration_due_gauges: 0, // TODO: Add this to repository
          out_of_service_gauges: 0 // TODO: Add this to repository
        },
        activity: formattedActivity,
        logins: {
          total_attempts: stats.loginStats.total_attempts,
          successful_logins: stats.loginStats.successful_logins,
          failed_attempts: stats.loginStats.failed_logins,
          attempts_24h: 0 // TODO: Add this to repository
        },
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

// GET /api/admin/system-settings - Get system settings
router.get('/system-settings', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  try {
    const settings = await adminService.getSystemSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Error fetching system settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch system settings' 
    });
  }
}));

// PUT /api/admin/system-settings/:key - Update system setting
router.put('/system-settings/:key', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Key and value are required'
      });
    }
    
    const setting = await adminService.updateSystemSetting(key, value);
    
    logger.info('System setting updated', { 
      adminId: req.user.id,
      key,
      value 
    });
    
    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    logger.error('Error updating system setting:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update system setting' 
    });
  }
}));

module.exports = router;