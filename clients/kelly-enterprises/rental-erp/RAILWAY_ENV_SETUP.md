# Railway Environment Variables Setup

## 🚨 Critical: Set These Environment Variables in Railway Dashboard

Your backend is failing to start (502 errors) likely due to missing environment variables. Set these in Railway dashboard:

### Backend Service - Required Variables

**Copy these to Railway Dashboard → Backend Service → Variables:**

```
NODE_ENV=production
PORT=8000
API_VERSION=v1
API_PREFIX=/api
ENABLE_HEALTH_CHECKS=true
JWT_SECRET=your_secure_jwt_secret_here_32_characters_minimum
SESSION_SECRET=your_secure_session_secret_here_32_characters_minimum
LOG_LEVEL=info
LOG_FORMAT=json
BCRYPT_ROUNDS=10
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_AUDIT_LOGGING=true
STRICT_FIELD_VALIDATION=true
```

### Generate Secure Secrets

Use these commands to generate secure secrets:

```bash
# Generate JWT Secret (32+ characters)
openssl rand -hex 32

# Generate Session Secret (32+ characters)  
openssl rand -hex 32
```

### Database Variables (Optional - for later)

When you add Railway MySQL service, these will be auto-provided:
```
MYSQL_HOST=auto-provided-by-railway
MYSQL_PORT=auto-provided-by-railway  
MYSQL_USER=auto-provided-by-railway
MYSQL_PASSWORD=auto-provided-by-railway
MYSQL_DATABASE=auto-provided-by-railway
```

### CORS Configuration (Update after frontend deployment)

```
ALLOWED_ORIGINS=https://your-frontend-domain.up.railway.app,http://localhost:3001
```

## ⚡ Quick Fix Steps

1. **Go to Railway Dashboard**
2. **Select your backend service**
3. **Go to Variables tab**
4. **Add the required variables above**
5. **Generate and set secure JWT_SECRET and SESSION_SECRET**
6. **Redeploy the service**

## 🔍 Troubleshooting

After setting variables, check:
- Railway logs for startup errors
- Health endpoint: `https://fire-proof-erp-sandbox-production.up.railway.app/api/health/live`
- Detailed health: `https://fire-proof-erp-sandbox-production.up.railway.app/api/health/detailed`

Your backend is configured to start without a database, so it should work with just these environment variables.