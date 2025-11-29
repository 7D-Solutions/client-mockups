const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const { auditAuthentication, auditFailedLogin } = require('../../../infrastructure/middleware/auditMiddleware');
const { loginRateLimiter } = require('../../../infrastructure/middleware/rateLimiter');
const authService = require('../services/authService');
const config = require('../../../infrastructure/config/config');
const logger = require('../../../infrastructure/utils/logger');

const router = express.Router();

// Validation middleware for login
const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or username is required')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Identifier must be 3-255 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Login endpoint
router.post('/login', loginRateLimiter, validateLogin, auditAuthentication('login'), asyncErrorHandler(async (req, res) => {
    // Check validation errors - return 401 for security (don't reveal validation details)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await auditFailedLogin(req, req.body.identifier || 'invalid', 'Invalid input format');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const { identifier, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || '0.0.0.0';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Check if account is locked
    const lockStatus = await authService.checkAccountLockout(identifier);
    if (lockStatus.locked) {
        await authService.recordLoginAttempt(identifier, null, ipAddress, userAgent, false, 'Account locked');
        return res.status(423).json({
            success: false,
            error: 'Account temporarily locked due to multiple failed attempts',
            lockedUntil: lockStatus.lockedUntil
        });
    }

    // Authenticate user
    const authResult = await authService.authenticateUser(identifier, password);

    if (!authResult.success) {
        await authService.recordLoginAttempt(identifier, null, ipAddress, userAgent, false, authResult.failureReason);
        await auditFailedLogin(req, identifier, authResult.failureReason);

        return res.status(authResult.statusCode || 401).json({
            success: false,
            error: authResult.error,
            ...(authResult.lockedUntil && { lockedUntil: authResult.lockedUntil })
        });
    }

    // Record successful login - use user's email for login_attempts table
    await authService.recordLoginAttempt(authResult.user.email, authResult.user.id, ipAddress, userAgent, true, null);

    // Create token
    const token = authService.createToken(authResult.user);

    // Create session
    await authService.createSession(authResult.user.id, token, ipAddress, userAgent);

    // Set httpOnly cookie
    // CRITICAL: For nginx proxy_cookie_domain rewriting to work, we MUST set explicit domain
    // Nginx cannot rewrite host-only cookies (cookies without domain attribute)
    // Architecture: Frontend (www.fireprooferp.com) → Nginx → Backend (fire-proof-erp-sandbox-production-4173.up.railway.app)
    // Nginx sets Host header to backend URL, so we set cookie domain to backend URL
    // Then nginx rewrites cookie domain to frontend URL via proxy_cookie_domain directive
    const cookieOptions = {
      httpOnly: true,
      secure: config.server.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
      path: '/'
    };

    // Set explicit domain for nginx proxy_cookie_domain rewriting
    if (config.server.nodeEnv === 'production') {
      // In production, use the Host header (which nginx sets to backend URL)
      // This allows nginx to rewrite the cookie domain to the frontend URL
      cookieOptions.domain = req.headers['host'];
    } else {
      // Development: localhost for local testing
      cookieOptions.domain = 'localhost';
    }

    res.cookie('authToken', token, cookieOptions);

    // Debug logging
    logger.debug('[LOGIN] Cookie set:', {
      domain: cookieOptions.domain,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      host: req.headers['host'],
      forwardedHost: req.headers['x-forwarded-host'],
      userAgent: userAgent.substring(0, 50)
    });

    res.json({
      success: true,
      token: token,
      user: authResult.user
    });
}));

// Get current user (me endpoint)
router.get('/me', authenticateToken, asyncErrorHandler(async (req, res) => {
    const user = await authService.getUserById(req.user.user_id || req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Fetch user permissions (same as login flow)
    const permissions = await authService.getUserPermissions(user.id);

    res.json({
      success: true,
      data: {
        ...user,
        permissions: permissions
      }
    });
}));

// Change password endpoint (for first-time login password change)
router.post('/change-password', authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').notEmpty().withMessage('New password is required')
  ],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user.user_id || req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const user = await authService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const isValidPassword = await require('bcryptjs').compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Change password
    const passwordHash = await require('bcryptjs').hash(newPassword, 10);
    await authService.changeUserPassword(userId, passwordHash);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
}));

// Logout endpoint
router.post('/logout', authenticateToken, asyncErrorHandler(async (req, res) => {
  // Get token from cookie or header
  const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    // Invalidate the session
    await authService.invalidateSession(token);
  }

  // Clear the auth cookie - settings must match cookie creation
  const clearOptions = {
    httpOnly: true,
    secure: config.server.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/'
  };

  // Match domain setting from login endpoint
  if (config.server.nodeEnv === 'production') {
    clearOptions.domain = req.headers['host'];
  } else {
    clearOptions.domain = 'localhost';
  }

  res.clearCookie('authToken', clearOptions);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

module.exports = router;