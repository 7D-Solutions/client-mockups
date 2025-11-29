/**
 * Centralized Rate Limiting Configuration
 * Single source of truth for all rate limiting across the application
 */

/**
 * Environment-aware rate limiting configuration
 * All rate limits can be controlled from this single file
 */
const RATE_LIMIT_CONFIG = {
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Base configuration multipliers for development
  developmentMultiplier: {
    requests: 100,  // 100x more requests in development
    time: 1        // Same time windows
  },
  
  // Core rate limiting profiles
  profiles: {
    // API endpoints (general usage)
    api: {
      windowMs: 60000,  // 1 minute
      production: 2000,  // 2000 requests per minute in production (increased for mobile testing)
      development: null  // Will be calculated: production * developmentMultiplier.requests
    },
    
    // Per-user limits
    user: {
      windowMs: 60000,  // 1 minute
      production: 500,   // 500 requests per minute per user in production (increased for mobile testing)
      development: null  // Will be calculated: production * developmentMultiplier.requests
    },
    
    // Heavy operations (reports, exports, etc.)
    heavy: {
      windowMs: 300000, // 5 minutes
      production: 50,    // 50 heavy operations per 5 minutes in production
      development: null  // Will be calculated: production * developmentMultiplier.requests
    },
    
    // Authentication attempts
    login: {
      windowMs: 900000, // 15 minutes
      production: 100,   // 100 login attempts per 15 minutes in production (increased for testing)
      development: 1000  // 1000 attempts in development (effectively unlimited)
    },
    
    // Sensitive endpoints (admin, security)
    sensitive: {
      windowMs: 900000, // 15 minutes
      production: 10,    // 10 requests per 15 minutes in production
      development: null  // Will be calculated: production * developmentMultiplier.requests
    },
    
    // File uploads
    upload: {
      windowMs: 300000, // 5 minutes
      production: 20,    // 20 uploads per 5 minutes in production
      development: null  // Will be calculated: production * developmentMultiplier.requests
    }
  },
  
  // Error response configurations
  responses: {
    api: {
      message: 'Too many requests from this IP, please try again later.',
      includeRetryAfter: true
    },
    user: {
      message: 'User rate limit exceeded. Please slow down your requests.',
      includeRetryAfter: true
    },
    login: {
      message: 'Too many login attempts. Please try again later.',
      includeRetryAfter: true
    },
    sensitive: {
      message: 'Too many requests to sensitive endpoint. Please try again later.',
      includeRetryAfter: true
    },
    upload: {
      message: 'Too many file uploads. Please wait before uploading again.',
      includeRetryAfter: true
    }
  },
  
  // CORS configuration for rate limit responses
  cors: {
    enabled: true,
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [
          'http://localhost:3001',  // Development frontend
          'http://localhost:3000',  // Alternative dev port
        ],
    credentials: true
  }
};

/**
 * Calculate final rate limits based on environment
 */
function calculateLimits() {
  const config = { ...RATE_LIMIT_CONFIG };
  
  // Calculate development limits
  Object.keys(config.profiles).forEach(profileName => {
    const profile = config.profiles[profileName];
    if (profile.development === null) {
      profile.development = profile.production * config.developmentMultiplier.requests;
    }
  });
  
  return config;
}

/**
 * Get rate limit for specific profile
 */
function getRateLimit(profileName) {
  const config = calculateLimits();
  const profile = config.profiles[profileName];
  
  if (!profile) {
    throw new Error(`Unknown rate limit profile: ${profileName}`);
  }
  
  const limit = config.isDevelopment ? profile.development : profile.production;
  
  return {
    windowMs: profile.windowMs,
    max: limit,
    message: config.responses[profileName] || config.responses.api,
    standardHeaders: true,
    legacyHeaders: false,
    // Add CORS headers to all responses (updated syntax)
    handler: (req, res) => {
      if (config.cors.enabled) {
        addCorsHeaders(req, res);
      }
      
      const response = config.responses[profileName] || config.responses.api;
      res.status(429).json({
        success: false,
        error: response.message,
        retryAfter: response.includeRetryAfter ? Math.ceil(profile.windowMs / 1000) : undefined
      });
    }
  };
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  if (RATE_LIMIT_CONFIG.cors.allowedOrigins.includes(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': RATE_LIMIT_CONFIG.cors.credentials,
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
      'Vary': 'Origin'
    });
  }
}

/**
 * Get simple rate limiter configuration for custom implementations
 */
function getSimpleLimiterConfig(profileName) {
  const config = calculateLimits();
  const profile = config.profiles[profileName];
  
  if (!profile) {
    throw new Error(`Unknown rate limit profile: ${profileName}`);
  }
  
  return {
    windowMs: profile.windowMs,
    maxRequests: config.isDevelopment ? profile.development : profile.production,
    isDevelopment: config.isDevelopment
  };
}

/**
 * Development utilities
 */
const DevUtils = {
  /**
   * Get current configuration summary
   */
  getConfigSummary() {
    const config = calculateLimits();
    const summary = {};
    
    Object.keys(config.profiles).forEach(profileName => {
      const profile = config.profiles[profileName];
      summary[profileName] = {
        windowMs: profile.windowMs,
        production: profile.production,
        development: profile.development,
        current: config.isDevelopment ? profile.development : profile.production
      };
    });
    
    return {
      environment: config.isDevelopment ? 'development' : 'production',
      profiles: summary
    };
  },
  
  /**
   * Log current rate limiting configuration
   */
  logConfig() {
    console.log('🔧 Rate Limiting Configuration:', JSON.stringify(this.getConfigSummary(), null, 2));
  }
};

module.exports = {
  RATE_LIMIT_CONFIG,
  getRateLimit,
  getSimpleLimiterConfig,
  addCorsHeaders,
  DevUtils
};