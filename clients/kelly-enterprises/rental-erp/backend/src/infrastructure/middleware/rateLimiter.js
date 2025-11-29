/**
 * Rate limiting middleware for security
 * Uses centralized configuration from /config/rateLimiting.js
 */

const rateLimit = require('express-rate-limit');
const { getRateLimit, getSimpleLimiterConfig } = require('../config/rateLimiting');

// In-memory store for development (fallback)
const loginAttempts = new Map();

/**
 * Clean up old attempts every 15 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of loginAttempts.entries()) {
    if (now - data.resetTime > 15 * 60 * 1000) {
      loginAttempts.delete(key);
    }
  }
}, 15 * 60 * 1000);

/**
 * Simple in-memory rate limiter for login attempts
 */
const createLoginRateLimiter = () => {
  const config = getSimpleLimiterConfig('login');
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = config.windowMs;
    const maxAttempts = config.maxRequests;

    if (!loginAttempts.has(ip)) {
      loginAttempts.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    const attempts = loginAttempts.get(ip);
    
    // Reset if window expired
    if (now > attempts.resetTime) {
      loginAttempts.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    // Check if limit exceeded
    if (attempts.count >= maxAttempts) {
      const remainingTime = Math.ceil((attempts.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        error: 'Too many login attempts. Please try again later.',
        retryAfter: remainingTime
      });
    }

    // Increment counter
    attempts.count++;
    return next();
  };
};

/**
 * General API rate limiter - uses centralized configuration
 */
const apiRateLimiter = rateLimit(getRateLimit('api'));

/**
 * Strict rate limiter for sensitive endpoints - uses centralized configuration
 */
const strictRateLimiter = rateLimit(getRateLimit('sensitive'));

/**
 * Additional rate limiters for specific use cases
 */
const heavyRateLimiter = rateLimit(getRateLimit('heavy'));
const uploadRateLimiter = rateLimit(getRateLimit('upload'));

module.exports = {
  loginRateLimiter: createLoginRateLimiter(),
  apiRateLimiter,
  strictRateLimiter,
  heavyRateLimiter,
  uploadRateLimiter,
  // Export configuration utilities
  getRateLimit,
  getSimpleLimiterConfig
};