const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { getRateLimit } = require('./infrastructure/config/rateLimiting');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const config = require('./infrastructure/config/config');
const logger = require('./infrastructure/utils/logger');
const { structuredLogger } = require('./infrastructure/observability/StructuredLogger');
const { observabilityManager } = require('./infrastructure/observability/ObservabilityManager');
const { healthMonitor } = require('./infrastructure/observability/HealthMonitor');
const { 
  globalErrorHandler, 
  assignRequestId, 
  circuitBreakerMiddleware 
} = require('./infrastructure/middleware/errorHandler');
const { pathValidationMiddleware } = require('./infrastructure/middleware/pathValidation');
const { performanceMiddleware, performanceMonitor } = require('./infrastructure/utils/performanceMonitor');
const { degradationMiddleware } = require('./infrastructure/utils/gracefulDegradation');
const { securityHeaders, apiSecurityHeaders, securityAuditLog } = require('./infrastructure/middleware/securityHeaders');
const { enforcePermission } = require('./infrastructure/middleware/permissionEnforcement');
const { authenticateToken } = require('./infrastructure/middleware/auth');
const { auditStateChanges, AUDIT_LEVELS } = require('./infrastructure/middleware/auditMiddleware');
const idempotency = require('./infrastructure/middleware/idempotency');
const { eventBus } = require('./infrastructure/events/EventBus');
const { notificationService, CHANNELS } = require('./infrastructure/notifications/NotificationService');
const EmailChannel = require('./infrastructure/notifications/channels/EmailChannel');
// Phase 4: Route imports - uncomment as routes are migrated
const authRoutes = require('./modules/auth/routes/auth');
const adminRoutes = require('./modules/admin/routes');
const gaugeRoutes = require('./modules/gauge/routes');
const auditRoutes = require('./modules/audit/routes');
const userRoutes = require('./modules/user/routes/user');
const favoritesRoutes = require('./modules/user/routes/favorites');
const badgeCountsRoutes = require('./modules/user/routes/badge-counts');
const userPreferencesRoutes = require('./modules/user/routes/preferences');
const healthRoutes = require('./infrastructure/health/healthRoutes');
const storageLocationsRoutes = require('./infrastructure/routes/storageLocations.routes');
const facilitiesRoutes = require('./infrastructure/routes/facilities.routes');
const buildingsRoutes = require('./infrastructure/routes/buildings.routes');
const zonesRoutes = require('./infrastructure/routes/zones.routes');
const inventoryMovementRoutes = require('./modules/inventory/routes/inventory-movement.routes');
const inventoryReportsRoutes = require('./modules/inventory/routes/inventory-reports.routes');

const CONSTANTS = require('./infrastructure/config/constants');

const app = express();

// Initialize events and notifications system
const emailChannel = new EmailChannel();
notificationService.registerChannel(CHANNELS.EMAIL, emailChannel);

// Initialize observability system
observabilityManager.setLevel('standard');
healthMonitor.startMonitoring(30000); // Monitor every 30 seconds

// Log system initialization
logger.info('Events and Notifications system initialized', {
  eventBusActive: true,
  notificationChannels: [CHANNELS.EMAIL]
});

structuredLogger.info('Observability system initialized', {
  level: 'standard',
  healthMonitoring: true,
  tracingEnabled: true,
  businessMetrics: true
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [`http://localhost:${CONSTANTS.FRONTEND.DEFAULT_PORT}`, `http://localhost:${CONSTANTS.FRONTEND.VITE_DEV_PORT}`, `http://localhost:3001`];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      const err = new Error('Not allowed by CORS');
      err.name = 'CorsError';
      callback(err);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Trust proxy for Docker/nginx setup - configure for known proxies
app.set('trust proxy', 1); // Trust first proxy (nginx in our setup)

// Enhanced security headers (must be first)
app.use(helmet());
app.use(securityHeaders);
app.use(securityAuditLog);

// Request ID for tracking and circuit breaker
app.use(assignRequestId);
app.use(circuitBreakerMiddleware);

// Path validation (must be before authentication)
app.use(pathValidationMiddleware);

// Performance monitoring and degradation middleware
app.use(performanceMiddleware);
app.use(degradationMiddleware);

// Enhanced observability middleware
app.use(structuredLogger.createMiddleware());
app.use(observabilityManager.createTracingMiddleware());

// HTTP request logging
const morganFormat = ':id :method :url :status :response-time ms - :res[content-length]';
morgan.token('id', (req) => req.requestId || req.id);

if (config.server.nodeEnv === 'production') {
  // In production, write to file
  app.use(morgan(morganFormat, {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
} else {
  // In development, use console
  app.use(morgan('dev'));
}

// Request logging for audit trail
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      requestId: req.requestId || req.id,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || 'anonymous'
    });
  });
  next();
});

// CORS - MUST BE BEFORE RATE LIMITING to handle OPTIONS preflight requests
app.use(cors(corsOptions));

// Rate limiting - using centralized configuration
const limiter = rateLimit({
  ...getRateLimit('api'),
  trustProxy: 1, // Trust first proxy (nginx)
  handler: (req, res) => {
    logger.warn({
      type: 'rate_limit_exceeded',
      ip: req.ip,
      url: req.url,
      requestId: req.id
    });
    // The centralized configuration already handles CORS headers and response format
    getRateLimit('api').handler(req, res);
  }
});

// Apply rate limiting to API routes (but not test routes)
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints - using centralized configuration
const authLimiter = rateLimit({
  ...getRateLimit('login'),
  skipSuccessfulRequests: true,
  trustProxy: 1 // Trust first proxy (nginx)
});
app.use('/api/auth/login', authLimiter);

// Compression for responses
app.use(compression());

// Cookie parser with secret
app.use(cookieParser(config.security.sessionSecret));

// Body parsing with size limits
app.use(express.json({ limit: CONSTANTS.API.JSON_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: CONSTANTS.API.REQUEST_BODY_LIMIT }));

// API security headers for all API routes
app.use('/api', apiSecurityHeaders);

// Mount public routes that don't need authentication
app.use('/api/health', healthRoutes);

// Apply authentication to all remaining API routes
app.use('/api', (req, res, next) => {
  // Skip auth for public routes
  if (req.path.startsWith('/health') || req.path === '/auth/login' || req.path === '/metrics' || req.path === '/audit/frontend-event') {
    return next();
  }
  authenticateToken(req, res, next);
});

// Permissions are now loaded in the authenticateToken middleware
// No need for separate attachUserPermissions middleware

// Apply permission enforcement to all API routes (skip for public routes)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/health') || req.path === '/auth/login' || req.path === '/metrics' || req.path === '/audit/frontend-event') {
    return next();
  }
  enforcePermission(req, res, next);
});

// Apply comprehensive audit logging to all API routes
app.use('/api', auditStateChanges(AUDIT_LEVELS.MEDIUM));

// Apply idempotency middleware to all API routes
app.use('/api', idempotency);

// Health check routes (no auth required)
app.use('/api/health', healthRoutes);

// Phase 4: Routes - uncomment as routes are migrated
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Gauge module routes - V2 is the canonical API
app.use('/api/gauges', gaugeRoutes);

// User routes for frontend user data
app.use('/api/users', userRoutes);

// Favorites routes for user navigation preferences
app.use('/api/users/me/favorites', favoritesRoutes);

// Badge counts routes for sidebar navigation
app.use('/api/users/me/badge-counts', badgeCountsRoutes);

// User preferences routes for cross-device settings sync
app.use('/api/user/preferences', userPreferencesRoutes);

// Audit routes for frontend events
app.use('/api/audit', auditRoutes);

// Storage locations routes for configurable storage system
app.use('/api/storage-locations', storageLocationsRoutes);

// Location hierarchy routes for warehouse organization
app.use('/api/facilities', facilitiesRoutes);
app.use('/api/buildings', buildingsRoutes);
app.use('/api/zones', zonesRoutes);

// Inventory module routes for movement tracking and location management
app.use('/api/inventory', inventoryMovementRoutes);
app.use('/api/inventory/reports', inventoryReportsRoutes);

// The frontend should use the correct routes directly:
// - /api/gauges/v2/* for gauge operations
// - /api/gauges/tracking/* for tracking operations
// - /api/gauges/transfers/* for transfers
// - /api/gauges/unseal-requests/* for unseal requests
// - /api/gauges/rejection-reasons/* for rejection reasons

// Deprecated API endpoints have been removed - V2 is the canonical API
// Old endpoints (v1, v3, idempotent) moved to review-for-delete/deprecated-gauge-routes/

// Audit system health monitoring - this is already part of healthRoutes
// The healthRoutes module includes both basic health and audit health endpoints

// Basic health check endpoint
// Always returns 200 for Railway healthcheck - app is running if it responds
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await healthMonitor.getHealthStatus();

    // Always return 200 if the app is running and can respond
    // Railway just needs to know the service is up
    res.status(200).json({
      status: healthStatus.status,
      httpCode: 200,
      timestamp: healthStatus.timestamp,
      checks: healthStatus.stats,
      uptime: process.uptime()
    });
  } catch (error) {
    // Even on error, return 200 - the app is running
    res.status(200).json({
      status: 'error',
      httpCode: 200,
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime()
    });
  }
});

// Performance metrics endpoint
app.get('/api/metrics', (req, res) => {
  const dashboard = performanceMonitor.getDashboard();
  
  // Add events and notifications metrics
  dashboard.events = eventBus.getStats();
  dashboard.notifications = notificationService.getStats();
  
  // Add comprehensive observability metrics
  dashboard.observability = observabilityManager.getDashboard();
  dashboard.logger = structuredLogger.getStats();
  dashboard.healthMonitor = healthMonitor.getMonitoringStats();
  
  res.json(dashboard);
});

// GET /api/dashboard - General dashboard endpoint
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get basic system metrics
    const dashboard = performanceMonitor.getDashboard();
    
    // Add basic dashboard data
    const dashboardData = {
      system: {
        performance: dashboard.current,
        health: healthMonitor.getMonitoringStats()
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

// Detailed health report endpoint
app.get('/api/health/detailed', async (req, res) => {
  try {
    const detailedReport = await healthMonitor.getDetailedReport();
    res.json(detailedReport);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate detailed health report',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Individual health check endpoint
app.get('/api/health/check/:checkName', async (req, res) => {
  try {
    const result = await healthMonitor.runCheck(req.params.checkName);
    const statusCode = result.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(404).json({
      error: 'Health check not found or failed',
      message: error.message,
      checkName: req.params.checkName,
      timestamp: new Date().toISOString()
    });
  }
});

// Business metrics endpoint
app.get('/api/metrics/business', (req, res) => {
  const businessMetrics = observabilityManager.businessMetrics.getMetrics();
  res.json({
    timestamp: new Date().toISOString(),
    metrics: businessMetrics
  });
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  // Convert our metrics to Prometheus format
  const dashboard = performanceMonitor.getDashboard();
  const promMetrics = [];
  
  // Response time metrics
  promMetrics.push(`# HELP http_request_duration_ms HTTP request duration in milliseconds`);
  promMetrics.push(`# TYPE http_request_duration_ms gauge`);
  const responseTime = dashboard.current?.responseTime || {};
  promMetrics.push(`http_request_duration_ms{quantile="0.5"} ${responseTime.avg || 0}`);
  promMetrics.push(`http_request_duration_ms{quantile="0.95"} ${responseTime.p95 || 0}`);
  promMetrics.push(`http_request_duration_ms{quantile="0.99"} ${responseTime.p99 || 0}`);
  
  // Error rate
  promMetrics.push(`# HELP http_error_rate HTTP error rate percentage`);
  promMetrics.push(`# TYPE http_error_rate gauge`);
  promMetrics.push(`http_error_rate ${dashboard.current?.errorRate || 0}`);
  
  // Request counters
  promMetrics.push(`# HELP http_requests_total Total HTTP requests`);
  promMetrics.push(`# TYPE http_requests_total counter`);
  const requests = dashboard.current?.requests || {};
  promMetrics.push(`http_requests_total ${requests.total || 0}`);
  promMetrics.push(`http_requests_successful_total ${requests.successful || 0}`);
  promMetrics.push(`http_requests_failed_total ${requests.failed || 0}`);
  
  // Database connection pool
  const poolStats = (dashboard.connectionPool && dashboard.connectionPool.length > 0) 
    ? dashboard.connectionPool[dashboard.connectionPool.length - 1] 
    : {};
  promMetrics.push(`# HELP db_connections_active Active database connections`);
  promMetrics.push(`# TYPE db_connections_active gauge`);
  promMetrics.push(`db_connections_active ${poolStats.activeConnections || 0}`);
  promMetrics.push(`db_connections_idle ${poolStats.idleConnections || 0}`);
  
  // Circuit breaker states
  if (dashboard.circuitBreakers?.breakers) {
    Object.entries(dashboard.circuitBreakers.breakers).forEach(([name, breaker]) => {
      promMetrics.push(`# HELP circuit_breaker_state Circuit breaker state (0=closed, 1=open, 2=half-open)`);
      promMetrics.push(`# TYPE circuit_breaker_state gauge`);
      const state = breaker.state === 'CLOSED' ? 0 : breaker.state === 'OPEN' ? 1 : 2;
      promMetrics.push(`circuit_breaker_state{name="${name}"} ${state}`);
    });
  }
  
  // Add comprehensive business metrics
  try {
    const businessMetricsData = observabilityManager.exportPrometheusMetrics();
    if (businessMetricsData) {
      promMetrics.push('');
      promMetrics.push('# Business and application metrics');
      promMetrics.push(businessMetricsData);
    }
  } catch (error) {
    promMetrics.push(`# Error exporting business metrics: ${error.message}`);
  }
  
  // Add health metrics
  try {
    const healthStats = healthMonitor.getMonitoringStats();
    promMetrics.push('');
    promMetrics.push('# HELP health_checks_total Total health checks configured');
    promMetrics.push('# TYPE health_checks_total gauge');
    promMetrics.push(`health_checks_total ${healthStats.totalChecks}`);
    promMetrics.push(`health_checks_enabled ${healthStats.enabledChecks}`);
    promMetrics.push(`health_checks_critical ${healthStats.criticalChecks}`);
  } catch (error) {
    promMetrics.push(`# Error exporting health metrics: ${error.message}`);
  }
  
  res.set('Content-Type', 'text/plain');
  res.send(promMetrics.join('\n'));
});

// Enhanced error handling middleware with database error classification
app.use(globalErrorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

module.exports = app;