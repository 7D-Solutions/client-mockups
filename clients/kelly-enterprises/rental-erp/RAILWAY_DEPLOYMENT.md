# Railway Deployment Guide - Fire-Proof ERP Sandbox

This guide covers deploying your Fire-Proof ERP system to Railway with backend, frontend, and database services.

## 🚀 Quick Deployment Steps

### 1. Backend Deployment

1. **Create Railway Project**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and create project
   railway login
   railway init
   ```

2. **Deploy Backend Service**:
   - Connect your GitHub repository
   - Railway will auto-detect the backend service using `railway.toml`
   - Set environment variables (see Backend Environment Variables section)

3. **Health Check**: Your backend is configured with health endpoint `/api/health/liveness`

### 2. Frontend Deployment

1. **Create Frontend Service** in the same Railway project
2. **Configure Build Settings**: Already configured in `frontend/railway.toml`
3. **Set Environment Variables**: Add `VITE_API_URL` pointing to your backend URL

### 3. Database Setup

1. **Add MySQL Database** to your Railway project
2. **Railway automatically provides**: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
3. **Your backend is configured** to use these Railway-provided environment variables

## 🔧 Configuration Details

### Backend Environment Variables

Copy these to your Railway backend service:

**Required Variables**:
```bash
NODE_ENV=production
PORT=8000
JWT_SECRET=your_secure_jwt_secret_32_chars_min
SESSION_SECRET=your_secure_session_secret_32_chars
API_VERSION=v1
API_PREFIX=/api
ENABLE_HEALTH_CHECKS=true
ENABLE_AUDIT_LOGGING=true
LOG_LEVEL=info
LOG_FORMAT=json
```

**Generate Secure Secrets:**
```bash
# Generate JWT Secret (32+ characters)
openssl rand -hex 32

# Generate Session Secret (32+ characters)
openssl rand -hex 32
```

**Security Variables**:
```bash
BCRYPT_ROUNDS=10
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
STRICT_FIELD_VALIDATION=true
```

**CORS Configuration** (update after frontend deployment):
```bash
ALLOWED_ORIGINS=https://your-frontend-domain.up.railway.app
```

### Frontend Environment Variables

**Required Variables**:
```bash
NODE_ENV=production
VITE_API_URL=https://your-backend-domain.up.railway.app
```

### Database Variables (Auto-provided by Railway)

Railway automatically provides these when you add a MySQL database:
- `MYSQL_HOST`
- `MYSQL_PORT` 
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

Your backend is configured to use these automatically.

## 📊 Health Monitoring

### Backend Health Endpoints

- **Liveness**: `/api/health/liveness` (Railway health check)
- **Live**: `/api/health/live` (Railway-specific, always returns 200)
- **Readiness**: `/api/health/readiness` (checks dependencies)
- **Detailed**: `/api/health/detailed` (comprehensive system info)
- **Metrics**: `/api/health/metrics` (Prometheus format)

### Frontend Health

- Frontend serves static files and is considered healthy if it responds to `/`

## 🗄️ Database Migration

If you have existing data to migrate:

1. **Export Local Data**:
   ```bash
   mysqldump -h localhost -P 3307 -u root -p fai_db_sandbox > backup.sql
   ```

2. **Import to Railway Database**:
   ```bash
   # Get Railway database connection details from dashboard
   mysql -h [RAILWAY_HOST] -P [RAILWAY_PORT] -u [RAILWAY_USER] -p[RAILWAY_PASSWORD] [RAILWAY_DB] < backup.sql
   ```

## 🚨 Important Notes

### Backend Deployment

- **Health Check**: Configured for `/api/health/liveness`
- **Port**: Railway overrides PORT automatically, your app uses `process.env.PORT`
- **Database**: Handles missing database gracefully during initial deployment
- **Security**: JWT and session secrets must be set before first deployment

### Frontend Deployment

- **Build Command**: `npm run build`
- **Start Command**: `npm run preview -- --host 0.0.0.0 --port $PORT`
- **Static Files**: Vite builds optimized production bundle
- **API Connection**: Configure `VITE_API_URL` to point to backend service

### Database Considerations

- **External to Containers**: Your local setup uses external MySQL, Railway provides managed MySQL
- **Connection Pooling**: Backend is configured for connection pooling
- **Health Checks**: Database health is monitored via health endpoints

## 🔄 Deployment Sequence

**Recommended Order**:

1. **Backend First** - Deploy and verify health endpoints work
2. **Database** - Add MySQL service, verify backend can connect
3. **Frontend** - Deploy with correct `VITE_API_URL` pointing to backend
4. **Update CORS** - Update backend's `ALLOWED_ORIGINS` with frontend URL
5. **Test Integration** - Verify frontend can communicate with backend

## 🛠️ Troubleshooting

### Backend Issues

**Health Check Fails**:
- Check `/api/health/liveness` endpoint directly
- Verify environment variables are set
- Check Railway logs for startup errors

**Database Connection Fails**:
- Verify MySQL service is running
- Check database environment variables
- Use `/api/health/detailed` to see connection status

### Frontend Issues

**Build Fails**:
- Check TypeScript errors
- Verify all dependencies are in package.json
- Check build logs in Railway dashboard

**API Connection Fails**:
- Verify `VITE_API_URL` is correct
- Check CORS configuration in backend
- Verify backend is accessible

### General Issues

**Services Can't Communicate**:
- Check internal Railway networking
- Verify service URLs are correct
- Check firewall/security group settings

## 📝 Railway CLI Commands

```bash
# Check deployment status
railway status

# View logs
railway logs --service backend
railway logs --service frontend

# Open service in browser
railway open --service frontend

# Connect to database
railway connect mysql
```

## ✅ Verification Checklist

- [ ] Backend deploys successfully
- [ ] Health endpoint `/api/health/liveness` returns 200
- [ ] Database connection works (check `/api/health/detailed`)
- [ ] Frontend builds and deploys
- [ ] Frontend can reach backend API
- [ ] Authentication flow works end-to-end
- [ ] CORS is properly configured
- [ ] All environment variables are set

Your Fire-Proof ERP system is now ready for Railway deployment! 🚀