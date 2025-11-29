const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const { passwordValidationMiddleware } = require('../../../infrastructure/utils/passwordValidator');
const { authenticateToken, requireAdmin } = require('../../../infrastructure/middleware/auth');
const AdminService = require('../services/adminService');
const AdminRepository = require('../repositories/AdminRepository');
const logger = require('../../../infrastructure/utils/logger');

const router = express.Router();

// Initialize service with repository
const adminRepository = new AdminRepository();
const adminService = new AdminService(adminRepository);

// Registration with password validation
router.post('/register',
  [
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('fullName').notEmpty(),
    body('role').isIn(['admin', 'manager', 'operator', 'inspector', 'quality_manager'])
  ],
  passwordValidationMiddleware('password'),
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password, fullName, role } = req.body;
    
    try {
      // Split fullName into firstName and lastName
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const user = await adminService.createUser({
        email,
        password,
        firstName,
        lastName,
        username: null, // Let service generate it
        department: null,
        phone: null,
        roleNames: [role]
      });
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        userId: user.id
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  })
);

// Password reset endpoint
router.post('/reset-password/:userId',
  authenticateToken,
  requireAdmin,
  [
    body('newPassword').notEmpty()
  ],
  passwordValidationMiddleware('newPassword'),
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const userId = parseInt(req.params.userId);
    const { newPassword } = req.body;
    
    try {
      await adminService.resetUserPassword(userId, newPassword);
      
      res.json({
        success: true,
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
  })
);

// Change own password endpoint
router.post('/change-password',
  authenticateToken,
  [
    body('oldPassword').notEmpty(),
    body('newPassword').notEmpty()
  ],
  passwordValidationMiddleware('newPassword'),
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const userId = req.user.user_id || req.user.id;
    const { oldPassword, newPassword } = req.body;
    
    // Verify old password
    const userDetails = await adminRepository.getUserPasswordHash(userId);
    
    if (!userDetails || !userDetails.password_hash) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const isValid = await bcrypt.compare(oldPassword, userDetails.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid old password'
      });
    }
    
    // Update password
    await adminService.resetUserPassword(userId, newPassword);
    
    logger.info('User changed their password', { userId });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// Unlock user account
router.post('/unlock/:userId',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    try {
      await adminService.unlockUser(userId);
      
      res.json({
        success: true,
        message: 'User account unlocked successfully'
      });
    } catch (error) {
      logger.error('Failed to unlock user account', { userId, error });
      throw error;
    }
  })
);

module.exports = router;