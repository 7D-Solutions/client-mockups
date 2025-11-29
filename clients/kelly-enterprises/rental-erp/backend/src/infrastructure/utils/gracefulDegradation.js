const NodeCache = require('node-cache');
const logger = require('./logger');
const { circuitBreakers, factory } = require('./circuitBreaker');

// Create cache instances for different data types
const cacheInstances = {
  gauges: new NodeCache({ stdTTL: 300, checkperiod: 60 }), // 5 min TTL
  users: new NodeCache({ stdTTL: 600, checkperiod: 120 }), // 10 min TTL
  calibrations: new NodeCache({ stdTTL: 900, checkperiod: 180 }), // 15 min TTL
  general: new NodeCache({ stdTTL: 300, checkperiod: 60 }) // 5 min TTL
};

// System state management
const systemState = {
  mode: 'NORMAL', // NORMAL, READ_ONLY, DEGRADED, MAINTENANCE
  lastModeChange: Date.now(),
  degradationReasons: new Set(),
  healthStatus: {
    database: true,
    cache: true,
    queue: true
  }
};

// Request queue for handling peak loads
class RequestQueue {
  constructor(maxSize = 1000) {
    this.queue = [];
    this.maxSize = maxSize;
    this.processing = false;
    this.processInterval = null;
  }

  add(request) {
    if (this.queue.length >= this.maxSize) {
      throw new Error('Request queue is full - system overloaded');
    }
    
    this.queue.push({
      ...request,
      timestamp: Date.now(),
      attempts: 0
    });
    
    if (!this.processing) {
      this.startProcessing();
    }
    
    return this.queue.length;
  }

  startProcessing() {
    this.processing = true;
    this.processInterval = setInterval(() => this.process(), 100); // Process every 100ms
  }

  stopProcessing() {
    this.processing = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  async process() {
    if (this.queue.length === 0) {
      this.stopProcessing();
      return;
    }

    const batch = this.queue.splice(0, 10); // Process up to 10 requests at a time
    
    for (const request of batch) {
      try {
        await request.handler();
      } catch (error) {
        request.attempts++;
        if (request.attempts < 3) {
          this.queue.push(request); // Re-queue for retry
        } else {
          logger.error('Request failed after 3 attempts', {
            error: error.message,
            request: request.type
          });
        }
      }
    }
  }

  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      maxSize: this.maxSize,
      utilizationPercent: (this.queue.length / this.maxSize) * 100
    };
  }
}

// Rate limiter implementation
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
  }

  check(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Clean old entries
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
    
    // Check current request
    const timestamps = this.requests.get(identifier) || [];
    const recentRequests = timestamps.filter(ts => ts > windowStart);
    
    if (recentRequests.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + this.windowMs,
        retryAfter: Math.ceil((windowStart + this.windowMs - now) / 1000)
      };
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return {
      allowed: true,
      remaining: this.maxRequests - recentRequests.length,
      resetTime: now + this.windowMs,
      retryAfter: null
    };
  }

  reset(identifier) {
    this.requests.delete(identifier);
  }
}

const { getSimpleLimiterConfig, addCorsHeaders } = require('../config/rateLimiting');

// Create instances using centralized configuration
const requestQueue = new RequestQueue();
const apiConfig = getSimpleLimiterConfig('api');
const userConfig = getSimpleLimiterConfig('user');
const heavyConfig = getSimpleLimiterConfig('heavy');

const rateLimiters = {
  api: new RateLimiter(apiConfig.windowMs, apiConfig.maxRequests),
  user: new RateLimiter(userConfig.windowMs, userConfig.maxRequests),
  heavy: new RateLimiter(heavyConfig.windowMs, heavyConfig.maxRequests)
};

// Graceful degradation strategies
const degradationStrategies = {
  // Enable read-only mode
  enableReadOnlyMode(reason) {
    systemState.mode = 'READ_ONLY';
    systemState.degradationReasons.add(reason);
    systemState.lastModeChange = Date.now();
    
    logger.warn('System entering READ-ONLY mode', {
      reason,
      previousMode: systemState.mode
    });
    
    return {
      mode: systemState.mode,
      message: 'System is in read-only mode. Write operations are temporarily disabled.',
      reason
    };
  },

  // Enable degraded mode with specific features disabled
  enableDegradedMode(features = []) {
    systemState.mode = 'DEGRADED';
    systemState.lastModeChange = Date.now();
    
    features.forEach(feature => {
      systemState.degradationReasons.add(`${feature}_disabled`);
    });
    
    logger.warn('System entering DEGRADED mode', {
      disabledFeatures: features,
      reasons: Array.from(systemState.degradationReasons)
    });
    
    return {
      mode: systemState.mode,
      disabledFeatures: features,
      message: 'System is operating in degraded mode with limited functionality.'
    };
  },

  // Restore normal operation
  restoreNormalMode() {
    const previousMode = systemState.mode;
    systemState.mode = 'NORMAL';
    systemState.degradationReasons.clear();
    systemState.lastModeChange = Date.now();
    
    logger.info('System restored to NORMAL mode', {
      previousMode,
      duration: Date.now() - systemState.lastModeChange
    });
    
    return {
      mode: systemState.mode,
      message: 'System has been restored to normal operation.'
    };
  }
};

// Cache wrapper with fallback
async function cacheWrapper(key, fetchFunction, cacheType = 'general', ttl = null) {
  const cache = cacheInstances[cacheType] || cacheInstances.general;
  
  // Try to get from cache first
  const cached = cache.get(key);
  if (cached !== undefined) {
    logger.debug('Cache hit', { key, cacheType });
    return cached;
  }
  
  // Cache miss - fetch data
  try {
    const data = await fetchFunction();
    
    // Store in cache
    if (ttl) {
      cache.set(key, data, ttl);
    } else {
      cache.set(key, data);
    }
    
    logger.debug('Cache miss - data fetched and cached', { key, cacheType });
    return data;
  } catch (error) {
    // Check if we have stale data
    const stale = cache.get(key, true); // Get even if expired
    if (stale !== undefined) {
      logger.warn('Using stale cache data due to fetch error', {
        key,
        error: error.message
      });
      return stale;
    }
    
    throw error;
  }
}

// Health check middleware
async function healthCheck() {
  const checks = {
    database: false,
    cache: false,
    queue: false,
    circuitBreakers: {}
  };
  
  // Check database
  try {
    // This would be replaced with actual database ping
    checks.database = circuitBreakers.dbRead.state !== 'OPEN' && 
                      circuitBreakers.dbWrite.state !== 'OPEN';
  } catch (error) {
    checks.database = false;
  }
  
  // Check cache
  try {
    cacheInstances.general.set('health', 'ok', 1);
    checks.cache = cacheInstances.general.get('health') === 'ok';
  } catch (error) {
    checks.cache = false;
  }
  
  // Check queue
  const queueStatus = requestQueue.getStatus();
  checks.queue = queueStatus.utilizationPercent < 80;
  
  // Check circuit breakers
  const allBreakers = factory.getAll();
  for (const breaker of allBreakers) {
    const status = breaker.getStatus();
    checks.circuitBreakers[status.name] = {
      state: status.state,
      healthy: status.state !== 'OPEN'
    };
  }
  
  // Update system health status
  systemState.healthStatus = {
    database: checks.database,
    cache: checks.cache,
    queue: checks.queue
  };
  
  // Determine overall health
  const isHealthy = checks.database && checks.cache && checks.queue;
  
  // Auto-degrade if unhealthy
  if (!isHealthy) {
    if (!checks.database) {
      degradationStrategies.enableReadOnlyMode('database_unavailable');
    } else if (!checks.queue) {
      degradationStrategies.enableDegradedMode(['rate_limiting_active']);
    }
  } else if (systemState.mode !== 'NORMAL' && Date.now() - systemState.lastModeChange > 60000) {
    // Auto-recover after 1 minute if healthy
    degradationStrategies.restoreNormalMode();
  }
  
  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
    systemMode: systemState.mode,
    uptime: process.uptime()
  };
}

// Middleware for enforcing degradation modes
function degradationMiddleware(req, res, next) {
  // Skip rate limiting for test endpoints
  if (req.path.startsWith('/test/')) {
    res.set('X-System-Mode', systemState.mode);
    return next();
  }
  
  // Check system mode
  if (systemState.mode === 'MAINTENANCE') {
    return res.status(503).json({
      error: 'System maintenance in progress',
      retryAfter: 300
    });
  }
  
  // Check rate limits
  const clientId = req.ip || req.connection.remoteAddress;
  const apiLimit = rateLimiters.api.check('global');
  const userLimit = rateLimiters.user.check(clientId);
  
  if (!apiLimit.allowed) {
    // Add CORS headers before sending 429 response
    addCorsHeaders(req, res);
    return res.status(429).json({
      success: false,
      error: 'API rate limit exceeded',
      retryAfter: apiLimit.retryAfter
    });
  }
  
  if (!userLimit.allowed) {
    // Add CORS headers before sending 429 response
    addCorsHeaders(req, res);
    return res.status(429).json({
      success: false,
      error: 'User rate limit exceeded',
      retryAfter: userLimit.retryAfter,
      remaining: userLimit.remaining
    });
  }
  
  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': rateLimiters.user.maxRequests,
    'X-RateLimit-Remaining': userLimit.remaining,
    'X-RateLimit-Reset': new Date(userLimit.resetTime).toISOString()
  });
  
  // Check read-only mode for write operations
  if (systemState.mode === 'READ_ONLY') {
    const writeMethodsBlocked = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (writeMethodsBlocked.includes(req.method)) {
      return res.status(503).json({
        error: 'System is in read-only mode',
        message: 'Write operations are temporarily disabled',
        retryAfter: 60
      });
    }
  }
  
  // Add system mode to response headers
  res.set('X-System-Mode', systemState.mode);
  
  next();
}

// Cache invalidation utilities
function invalidateCache(cacheType, pattern = null) {
  const cache = cacheInstances[cacheType] || cacheInstances.general;
  
  if (pattern) {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    matchingKeys.forEach(key => cache.del(key));
    logger.info('Cache invalidated by pattern', {
      cacheType,
      pattern,
      keysInvalidated: matchingKeys.length
    });
  } else {
    cache.flushAll();
    logger.info('Cache flushed', { cacheType });
  }
}

// Performance monitoring integration
function getPerformanceMetrics() {
  const queueStatus = requestQueue.getStatus();
  const cacheStats = {};
  
  for (const [name, cache] of Object.entries(cacheInstances)) {
    cacheStats[name] = {
      keys: cache.keys().length,
      hits: cache.stats.hits,
      misses: cache.stats.misses,
      hitRate: cache.stats.hits / (cache.stats.hits + cache.stats.misses) || 0
    };
  }
  
  return {
    systemMode: systemState.mode,
    degradationReasons: Array.from(systemState.degradationReasons),
    queue: queueStatus,
    caches: cacheStats,
    rateLimits: {
      api: {
        requestsInWindow: rateLimiters.api.requests.size,
        maxRequests: rateLimiters.api.maxRequests
      },
      activeUsers: rateLimiters.user.requests.size
    },
    health: systemState.healthStatus
  };
}

module.exports = {
  systemState,
  degradationStrategies,
  cacheWrapper,
  invalidateCache,
  requestQueue,
  rateLimiters,
  healthCheck,
  degradationMiddleware,
  getPerformanceMetrics,
  cacheInstances
};