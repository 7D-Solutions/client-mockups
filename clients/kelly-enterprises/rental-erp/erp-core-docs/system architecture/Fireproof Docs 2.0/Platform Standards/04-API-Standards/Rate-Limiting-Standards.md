# Rate Limiting Standards

**Category**: API Standards
**Purpose**: Centralized rate limiting configuration and implementation patterns
**Location**: `/backend/src/infrastructure/config/rateLimiting.js`, `/backend/src/infrastructure/middleware/rateLimiter.js`
**Last Updated**: 2025-11-07

---

## Overview

Fire-Proof ERP implements comprehensive rate limiting to protect against abuse, ensure fair resource usage, and maintain system stability. The system uses a centralized configuration with environment-aware limits.

**Core Features**:
- 🔧 Centralized configuration (single source of truth)
- 🌍 Environment-aware limits (development vs production)
- 🎯 Profile-based rate limiting (6 predefined profiles)
- 🔒 Security-first design
- 🚨 Standardized error responses
- ✅ CORS support for rate limit responses

---

## Rate Limit Profiles

### 1. API Profile (General Usage)

**Purpose**: General API endpoints for normal operations

```javascript
{
  windowMs: 60000,       // 1 minute
  production: 2000,      // 2000 requests per minute
  development: 200000    // 200,000 requests per minute (100x multiplier)
}
```

**Usage**:
- General GET/POST/PUT/DELETE operations
- Data fetching and updates
- Standard CRUD endpoints

**When to Use**: Default rate limiter for most API endpoints

### 2. User Profile (Per-User Limits)

**Purpose**: Per-user rate limiting for authenticated requests

```javascript
{
  windowMs: 60000,       // 1 minute
  production: 500,       // 500 requests per minute per user
  development: 50000     // 50,000 requests per minute
}
```

**Usage**:
- User-specific operations
- Personal data access
- User dashboard endpoints

**When to Use**: Authenticated endpoints where you want to limit per-user rather than per-IP

### 3. Heavy Profile (Resource-Intensive Operations)

**Purpose**: Expensive operations that consume significant resources

```javascript
{
  windowMs: 300000,      // 5 minutes
  production: 50,        // 50 operations per 5 minutes
  development: 5000      // 5,000 operations per 5 minutes
}
```

**Usage**:
- Report generation
- Data exports
- Complex calculations
- Bulk operations

**When to Use**: Any endpoint that performs heavy computation or database queries

### 4. Login Profile (Authentication Attempts)

**Purpose**: Protect against brute force attacks

```javascript
{
  windowMs: 900000,      // 15 minutes
  production: 100,       // 100 attempts per 15 minutes
  development: 1000      // 1,000 attempts per 15 minutes
}
```

**Usage**:
- `/api/auth/login`
- `/api/auth/refresh-token`
- Password reset requests

**When to Use**: All authentication endpoints

**Special Implementation**: Uses in-memory store with automatic cleanup every 15 minutes

### 5. Sensitive Profile (Admin/Security Endpoints)

**Purpose**: Highly restrictive limits for sensitive operations

```javascript
{
  windowMs: 900000,      // 15 minutes
  production: 10,        // 10 requests per 15 minutes
  development: 1000      // 1,000 requests per 15 minutes
}
```

**Usage**:
- Admin configuration changes
- Security settings
- User permission modifications
- Audit log access

**When to Use**: Any endpoint that modifies security settings or accesses sensitive data

### 6. Upload Profile (File Uploads)

**Purpose**: Limit file upload frequency

```javascript
{
  windowMs: 300000,      // 5 minutes
  production: 20,        // 20 uploads per 5 minutes
  development: 2000      // 2,000 uploads per 5 minutes
}
```

**Usage**:
- File uploads
- Image uploads
- Document attachments
- Certificate uploads

**When to Use**: All file upload endpoints

---

## Implementation

### Basic Usage

#### Apply Rate Limiter to Routes

```javascript
const {
  apiRateLimiter,
  strictRateLimiter,
  loginRateLimiter,
  heavyRateLimiter,
  uploadRateLimiter
} = require('../infrastructure/middleware/rateLimiter');

// General API rate limiting
router.get('/gauges', apiRateLimiter, gaugeController.getGauges);

// Login rate limiting
router.post('/auth/login', loginRateLimiter, authController.login);

// Heavy operation rate limiting
router.post('/reports/generate', heavyRateLimiter, reportController.generate);

// Sensitive operation rate limiting
router.put('/admin/settings', strictRateLimiter, adminController.updateSettings);

// Upload rate limiting
router.post('/upload/certificate', uploadRateLimiter, uploadController.uploadCertificate);
```

#### Apply Rate Limiter Globally

```javascript
// In app.js
const { apiRateLimiter } = require('./infrastructure/middleware/rateLimiter');

// Apply to all /api routes
app.use('/api', apiRateLimiter);

// Then apply stricter limits to specific routes
app.use('/api/admin', strictRateLimiter);
```

### Custom Rate Limiter

#### Create Custom Profile

**Step 1**: Add profile to configuration

```javascript
// In /infrastructure/config/rateLimiting.js

profiles: {
  // ... existing profiles ...

  // Custom profile for specific use case
  dataExport: {
    windowMs: 600000,    // 10 minutes
    production: 5,       // 5 exports per 10 minutes
    development: null    // Will use multiplier
  }
},

responses: {
  // ... existing responses ...

  dataExport: {
    message: 'Too many export requests. Please wait before requesting another export.',
    includeRetryAfter: true
  }
}
```

**Step 2**: Create rate limiter instance

```javascript
// In /infrastructure/middleware/rateLimiter.js
const { getRateLimit } = require('../config/rateLimiting');
const rateLimit = require('express-rate-limit');

const dataExportRateLimiter = rateLimit(getRateLimit('dataExport'));

module.exports = {
  // ... existing exports ...
  dataExportRateLimiter
};
```

**Step 3**: Use in routes

```javascript
const { dataExportRateLimiter } = require('../infrastructure/middleware/rateLimiter');

router.post('/export/data', dataExportRateLimiter, exportController.exportData);
```

---

## Response Format

### Rate Limit Exceeded Response

When rate limit is exceeded, the API returns:

```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": 60
}
```

**HTTP Status**: `429 Too Many Requests`

**Headers**:
```
RateLimit-Limit: 2000
RateLimit-Remaining: 0
RateLimit-Reset: 1699564800
Retry-After: 60
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
```

### Profile-Specific Messages

Each profile has a customized error message:

| Profile | Error Message |
|---------|--------------|
| api | Too many requests from this IP, please try again later. |
| user | User rate limit exceeded. Please slow down your requests. |
| login | Too many login attempts. Please try again later. |
| sensitive | Too many requests to sensitive endpoint. Please try again later. |
| upload | Too many file uploads. Please wait before uploading again. |

---

## Environment Configuration

### Development vs Production

**Development Environment** (`NODE_ENV=development`):
- 100x multiplier on request limits
- Effectively unlimited for testing
- Same time windows as production

**Production Environment** (`NODE_ENV=production`):
- Strict production limits enforced
- Security-first configuration
- Real-world protection

### Environment-Specific Multiplier

```javascript
developmentMultiplier: {
  requests: 100,  // 100x more requests in development
  time: 1        // Same time windows
}
```

**Example**:
- Production API limit: 2,000 requests/minute
- Development API limit: 200,000 requests/minute

### Viewing Current Configuration

```javascript
const { DevUtils } = require('./infrastructure/config/rateLimiting');

// Get configuration summary
const config = DevUtils.getConfigSummary();
console.log(config);

// Log configuration
DevUtils.logConfig();

/* Output:
{
  "environment": "development",
  "profiles": {
    "api": {
      "windowMs": 60000,
      "production": 2000,
      "development": 200000,
      "current": 200000
    },
    ...
  }
}
*/
```

---

## Advanced Patterns

### Conditional Rate Limiting

```javascript
// Apply different limits based on user role
router.get('/data', (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    // Admins get higher limits
    return next();
  }

  // Regular users get standard limits
  apiRateLimiter(req, res, next);
});
```

### Skip Rate Limiting for Specific IPs

```javascript
const { getRateLimit } = require('../infrastructure/config/rateLimiting');
const rateLimit = require('express-rate-limit');

const apiRateLimiter = rateLimit({
  ...getRateLimit('api'),
  skip: (req) => {
    // Skip rate limiting for whitelisted IPs
    const whitelistedIPs = ['127.0.0.1', '::1'];
    return whitelistedIPs.includes(req.ip);
  }
});
```

### Custom Key Generator (Per-User Instead of Per-IP)

```javascript
const apiRateLimiter = rateLimit({
  ...getRateLimit('api'),
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return req.user?.id || req.ip;
  }
});
```

### Rate Limit with Custom Store

For production deployments with multiple servers, use Redis:

```javascript
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

const apiRateLimiter = rateLimit({
  ...getRateLimit('api'),
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:'
  })
});
```

---

## CORS Integration

Rate limit responses include CORS headers for frontend compatibility:

```javascript
cors: {
  enabled: true,
  allowedOrigins: [
    'http://localhost:3001',  // Development frontend
    'http://localhost:3000',  // Alternative dev port
  ],
  credentials: true
}
```

**Custom Origins** (via environment variable):

```bash
ALLOWED_ORIGINS=http://localhost:3001,https://app.example.com,https://admin.example.com
```

---

## Testing Rate Limits

### Manual Testing

```bash
# Test API rate limit
for i in {1..2001}; do
  curl http://localhost:8000/api/gauges
done

# Should return 429 after 2000 requests (in production)
```

### Automated Testing

```javascript
const request = require('supertest');
const app = require('../app');

describe('Rate Limiting', () => {
  it('should enforce rate limits on /api/auth/login', async () => {
    // Attempt 101 logins (production limit is 100)
    for (let i = 0; i < 101; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'test' });

      if (i < 100) {
        // First 100 should succeed or return 401
        expect([200, 401]).toContain(res.status);
      } else {
        // 101st should be rate limited
        expect(res.status).toBe(429);
        expect(res.body.error).toContain('Too many login attempts');
      }
    }
  });
});
```

---

## Best Practices

### 1. Always Use Centralized Configuration

```javascript
// ❌ BAD - Hardcoded limits
const limiter = rateLimit({
  windowMs: 60000,
  max: 100
});

// ✅ GOOD - Centralized configuration
const { getRateLimit } = require('../config/rateLimiting');
const limiter = rateLimit(getRateLimit('api'));
```

### 2. Choose Appropriate Profile

```javascript
// ❌ BAD - Using API limiter for sensitive endpoints
router.put('/admin/settings', apiRateLimiter, updateSettings);

// ✅ GOOD - Using strict limiter for sensitive endpoints
router.put('/admin/settings', strictRateLimiter, updateSettings);
```

### 3. Apply Rate Limiting Early

```javascript
// ✅ GOOD - Rate limit before expensive operations
router.post('/reports/generate',
  apiRateLimiter,          // Rate limit first
  authenticateToken,        // Then authenticate
  validateRequest,          // Then validate
  generateReport           // Finally process
);
```

### 4. Use Appropriate Time Windows

```javascript
// ❌ BAD - Too short window for expensive operations
heavy: {
  windowMs: 60000,  // 1 minute is too short for heavy ops
  max: 100
}

// ✅ GOOD - Longer window for heavy operations
heavy: {
  windowMs: 300000,  // 5 minutes is appropriate
  max: 50
}
```

### 5. Provide Clear Error Messages

```javascript
// ✅ GOOD - Clear, actionable message
{
  message: 'Too many login attempts. Please try again later.',
  includeRetryAfter: true
}
```

---

## Monitoring & Debugging

### Log Rate Limit Events

```javascript
const apiRateLimiter = rateLimit({
  ...getRateLimit('api'),
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      endpoint: req.path,
      userId: req.user?.id
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests'
    });
  }
});
```

### Track Rate Limit Metrics

```javascript
const { observabilityManager } = require('../observability/ObservabilityManager');

const apiRateLimiter = rateLimit({
  ...getRateLimit('api'),
  handler: (req, res) => {
    // Increment rate limit counter
    observabilityManager.businessMetrics.incrementCounter('rate_limit_hits', 1, {
      endpoint: req.path,
      profile: 'api'
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests'
    });
  }
});
```

---

## Troubleshooting

### Issue: Rate Limit Too Strict in Development

**Problem**: Development rate limits interfering with testing

**Solution**: Ensure `NODE_ENV=development` is set

```bash
# Check environment
echo $NODE_ENV

# Should output: development
```

### Issue: Rate Limit Not Applied

**Problem**: Requests not being rate limited

**Solutions**:
1. Verify middleware order (rate limiter should be early)
2. Check if IP detection is working (`req.ip`)
3. Ensure express-rate-limit package is installed

```javascript
// Debug IP detection
console.log('Client IP:', req.ip);
console.log('X-Forwarded-For:', req.headers['x-forwarded-for']);
```

### Issue: CORS Errors on 429 Responses

**Problem**: Frontend can't read 429 responses due to CORS

**Solution**: Ensure CORS headers are added to rate limit responses (already handled by centralized configuration)

---

## Migration Guide

### From Hardcoded Limits

**Before**:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60000,
  max: 100
});

router.use(limiter);
```

**After**:
```javascript
const { apiRateLimiter } = require('../infrastructure/middleware/rateLimiter');

router.use(apiRateLimiter);
```

---

## Reference

### Files

- `/backend/src/infrastructure/config/rateLimiting.js` (230 lines) - Central configuration
- `/backend/src/infrastructure/middleware/rateLimiter.js` (96 lines) - Middleware implementation

### Dependencies

- `express-rate-limit` - Rate limiting middleware
- `rate-limit-redis` - Redis store (optional, for multi-server deployments)

### Related Documentation

- [API Standards](./README.md)
- [Error Handling Standards](../02-Backend-Standards/05-Error-Handling.md)
- [Infrastructure Services](../02-Backend-Standards/04-Infrastructure-Services.md)

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
**Status**: Production Standard
