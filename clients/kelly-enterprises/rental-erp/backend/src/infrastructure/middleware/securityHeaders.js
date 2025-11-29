/**
 * Security Headers Middleware
 * Implements essential security headers for aerospace-grade security compliance
 */

const helmet = require('helmet');
const logger = require('../utils/logger');
const CONSTANTS = require('../config/constants');

/**
 * Configure Content Security Policy
 */
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for development
    scriptSrc: ["'self'"], // Removed unsafe-eval for security compliance
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: []
  },
  reportOnly: process.env.NODE_ENV === 'development' // Only report in development
};

/**
 * Configure HSTS (HTTP Strict Transport Security)
 */
const hstsConfig = {
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true
};

/**
 * Comprehensive security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Content Security Policy
  if (process.env.SECURITY_CSP_ENABLED !== 'false') {
    helmet.contentSecurityPolicy(cspConfig)(req, res, () => {});
  }

  // HTTP Strict Transport Security
  if (process.env.SECURITY_HSTS_ENABLED !== 'false') {
    helmet.hsts(hstsConfig)(req, res, () => {});
  }

  // X-Frame-Options: Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // X-Content-Type-Options: Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection: Enable XSS filtering
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy: Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Feature Policy: Control browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Cache Control for sensitive pages
  if (req.path.includes('/admin') || req.path.includes('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  next();
};

/**
 * Additional security middleware for API endpoints
 */
const apiSecurityHeaders = (req, res, next) => {
  // JSON hijacking prevention
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent caching of API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  
  // Additional API security headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  
  next();
};

/**
 * CORS configuration for production security
 */
const corsConfig = {
  origin: function (origin, callback) {
    // Allow requests from same origin and configured origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [`http://localhost:${CONSTANTS.FRONTEND.DEFAULT_PORT}`, `https://localhost:${CONSTANTS.FRONTEND.DEFAULT_PORT}`];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-API-Version'],
  maxAge: 86400 // 24 hours
};

/**
 * Security audit logging middleware
 */
const securityAuditLog = (req, res, next) => {
  const startTime = Date.now();
  
  // Log security-relevant request information
  const securityInfo = {
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    method: req.method,
    path: req.path,
    referer: req.get('Referer'),
    securityHeaders: {
      hasAuthorization: !!req.get('Authorization'),
      contentType: req.get('Content-Type'),
      origin: req.get('Origin')
    }
  };

  // Track response completion
  res.on('finish', () => {
    securityInfo.statusCode = res.statusCode;
    securityInfo.responseTime = Date.now() - startTime;
    
    // Log suspicious activity
    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
      logger.warn('🚨 Security Event:', securityInfo);
    }
  });

  next();
};

module.exports = {
  securityHeaders,
  apiSecurityHeaders,
  corsConfig,
  securityAuditLog,
  cspConfig,
  hstsConfig
};