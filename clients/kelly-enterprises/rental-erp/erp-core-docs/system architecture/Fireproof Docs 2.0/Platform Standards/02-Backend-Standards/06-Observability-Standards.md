# Backend Observability Standards

**Category**: Backend Standards
**Purpose**: Comprehensive system monitoring, logging, tracing, and health checks
**Location**: `/backend/src/infrastructure/observability/`
**Last Updated**: 2025-11-07

---

## Overview

Fire-Proof ERP implements a production-grade observability system providing structured logging, distributed tracing, business metrics, health monitoring, and Prometheus-compatible metrics export. This system enables comprehensive monitoring, debugging, and performance analysis.

**Core Components**:
- **ObservabilityManager** (660 lines) - Central observability orchestration
- **HealthMonitor** (584 lines) - Multi-dimensional health checks
- **StructuredLogger** (505 lines) - Enhanced structured logging with correlation
- **ReliabilityBudgetMonitor** (327 lines) - SLI/SLO tracking

**Key Features**:
- 📊 Business metrics collection (counters, timers, gauges)
- 🔍 Distributed tracing with correlation IDs
- 📝 Structured logging with categories and context
- ❤️ Comprehensive health checks (system, database, external, business)
- 🚨 Intelligent alerting with configurable thresholds
- 📈 Prometheus-compatible metrics export
- 🎯 Request tracking across service boundaries

---

## ObservabilityManager

### Purpose

Central observability orchestration providing business metrics, distributed tracing, structured logging, and system health monitoring.

**File**: `/backend/src/infrastructure/observability/ObservabilityManager.js` (660 lines)

### Observability Levels

```javascript
const OBSERVABILITY_LEVELS = {
  MINIMAL: 'minimal',         // Basic logging and metrics
  STANDARD: 'standard',       // Standard observability with structured logs (DEFAULT)
  COMPREHENSIVE: 'comprehensive', // Full observability with tracing
  DEBUG: 'debug'             // Maximum observability for debugging
};
```

**Level Impact**:
- **MINIMAL**: Basic error/warn logs, minimal metrics
- **STANDARD**: Structured logs, business metrics, basic tracing
- **COMPREHENSIVE**: Full tracing, system context, performance metrics
- **DEBUG**: All logs including trace level, full system information

### Business Metrics System

#### Counter Metrics

Track cumulative counts with tags:

```javascript
const { observabilityManager } = require('../infrastructure/observability/ObservabilityManager');

// Increment counter
observabilityManager.recordMetric('gauge_operations_total', 1, 'counter', {
  operation: 'create',
  equipment_type: 'thread_gauge',
  status: 'success'
});

// Using business metrics directly
observabilityManager.businessMetrics.incrementCounter('user_actions', 1, {
  action: 'login',
  userId: req.user.id
});
```

#### Timer Metrics

Record operation durations:

```javascript
const startTime = Date.now();

// ... perform operation ...

const duration = Date.now() - startTime;

observabilityManager.recordMetric('database_query_duration', duration, 'timer', {
  table: 'gauges',
  operation: 'SELECT'
});

// Or use recordOperation for automatic timing
observabilityManager.recordOperation(
  'createGauge',
  duration,
  true, // success
  { gaugeId, equipmentType },
  traceId
);
```

**Timer Statistics**: Automatically calculates avg, min, max, p95, p99

#### Gauge Metrics

Set current value metrics:

```javascript
// System metrics
observabilityManager.businessMetrics.setGauge('active_users', userCount);
observabilityManager.businessMetrics.setGauge('queue_depth', queueSize, {
  queue: 'email'
});

// Updated automatically
observabilityManager.businessMetrics.setGauge('system_memory_usage_percent', memPercent);
```

### Distributed Tracing

#### Start and Finish Traces

```javascript
// Start trace
const traceId = observabilityManager.tracingManager.startTrace('createGaugeSet');

// Add tags
observabilityManager.tracingManager.addTag(traceId, 'gauge.set_id', setId);
observabilityManager.tracingManager.addTag(traceId, 'gauge.count', gaugeCount);
observabilityManager.tracingManager.addTag(traceId, 'user.id', userId);

// Add logs to trace
observabilityManager.tracingManager.addLog(traceId, 'Validating gauge set configuration', {
  minThreads: config.minThreads,
  maxThreads: config.maxThreads
});

try {
  // ... perform operation ...

  // Finish successfully
  observabilityManager.tracingManager.finishTrace(traceId, 'completed');
} catch (error) {
  observabilityManager.tracingManager.addTag(traceId, 'error', error.message);
  observabilityManager.tracingManager.finishTrace(traceId, 'error');
  throw error;
}
```

#### HTTP Request Tracing Middleware

```javascript
// In app.js or route setup
const { observabilityManager } = require('./infrastructure/observability/ObservabilityManager');

// Add tracing middleware BEFORE routes
app.use(observabilityManager.createTracingMiddleware());

// Now all requests automatically traced
// Access trace ID in routes via req.traceId
router.post('/gauges', async (req, res) => {
  // Use trace ID for operation tracking
  await gaugeService.createGauge(data, req.traceId);

  // Trace automatically finished with response
});
```

**Automatic Trace Tags**:
- `http.method`, `http.url`, `http.status_code`
- `http.user_agent`, `http.response_time`
- `user.id` (if authenticated)

### Structured Logging

#### Basic Logging

```javascript
// Different log levels
observabilityManager.log('info', 'Gauge created successfully', {
  gaugeId: gauge.id,
  equipmentType: gauge.equipment_type
});

observabilityManager.log('warn', 'High memory usage detected', {
  memoryPercent: 87,
  threshold: 85
});

observabilityManager.log('error', 'Database connection failed', {
  error: err.message,
  retries: 3
}, traceId);
```

#### Log with Trace Context

```javascript
// Logs automatically include trace context if traceId provided
observabilityManager.log('info', 'Validating gauge configuration', {
  gaugeId: 'TG-001',
  validation: 'serial_number'
}, req.traceId);

// Output includes: traceId, spanId, parentSpanId
```

### Health Monitoring

#### Monitor System Health

```javascript
// Manual health check
await observabilityManager.monitorHealth();

// Health check includes:
// - Memory usage (alert if > 85%)
// - CPU usage (alert if > 80%)
// - System uptime
// - Automatic alert emission on threshold breach
```

#### Configure Alert Thresholds

```javascript
// Default thresholds
observabilityManager.alertThresholds = {
  errorRate: 5,        // 5%
  responseTime: 2000,  // 2 seconds
  memoryUsage: 85,     // 85%
  cpuUsage: 80         // 80%
};

// Customize thresholds
observabilityManager.alertThresholds.memoryUsage = 90;
observabilityManager.alertThresholds.responseTime = 3000;
```

### Observability Dashboard

#### Get Comprehensive Dashboard

```javascript
const dashboard = observabilityManager.getDashboard();

// Returns:
{
  timestamp: '2025-11-07T10:30:00.000Z',
  level: 'standard',

  // Performance metrics
  performance: {
    current: { responseTime, errorRate, throughput },
    trending: { ... },
    alerts: []
  },

  // Business metrics
  businessMetrics: {
    counters: { 'operations_total{operation:create,status:success}': { value: 1523 } },
    timers: { 'operation_duration_ms{operation:createGauge}': { avg: 145, p95: 230 } },
    gauges: { 'active_users': { value: 42 } }
  },

  // Tracing information
  tracing: {
    activeTraces: 5,
    recentTraces: 20,
    traces: [{ traceId, operationName, duration, status, tags }]
  },

  // System health
  systemHealth: {
    memory: { heapUsed, heapTotal, rss, external },
    cpu: { loadavg: [1.2, 1.5, 1.8], usage: 45 },
    uptime: 86400,
    platform: { nodeVersion, platform, hostname }
  },

  alertThresholds: { errorRate: 5, responseTime: 2000, ... }
}
```

### Prometheus Metrics Export

#### Export Metrics

```javascript
// Get Prometheus-formatted metrics
const prometheusMetrics = observabilityManager.exportPrometheusMetrics();

/* Returns:
# HELP operations_total Business counter metric
# TYPE operations_total counter
operations_total{operation="create",status="success"} 1523

# HELP operation_duration_ms_seconds Business timer metric
# TYPE operation_duration_ms_seconds summary
operation_duration_ms_seconds_sum{operation="createGauge"} 221.385
operation_duration_ms_seconds_count{operation="createGauge"} 1523
operation_duration_ms_seconds{quantile="0.95",operation="createGauge"} 0.230
operation_duration_ms_seconds{quantile="0.99",operation="createGauge"} 0.350
*/
```

#### Expose Metrics Endpoint

```javascript
// In routes/metrics.js
const { observabilityManager } = require('../infrastructure/observability/ObservabilityManager');

router.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(observabilityManager.exportPrometheusMetrics());
});
```

### Event-Based Metrics Collection

**Automatic Event Tracking**:

ObservabilityManager automatically subscribes to EventBus events:

```javascript
// Automatically tracked events:
// - gauge.* events → gauge_operations_total counter
// - user.logged_in → user_logins_total counter
// - security.* events → security_events_total counter
// - All events → events_total counter (by type and priority)
```

**Custom Event Metrics**:

```javascript
const { eventBus, EVENT_TYPES } = require('../infrastructure/events/EventBus');

// Emit event (automatically counted by ObservabilityManager)
eventBus.emitEvent(EVENT_TYPES.GAUGE_CREATED, {
  gaugeId: gauge.id,
  equipmentType: gauge.equipment_type,
  userId: req.user.id
});

// Metrics incremented automatically:
// - events_total{type=gauge.created,priority=medium}
// - gauge_operations_total{operation=created,gaugeId=TG-001}
```

### Data Cleanup

**Automatic Cleanup**:

```javascript
// Runs every hour automatically
// Keeps 24 hours of metric data
// Configured at startup, no manual intervention needed
```

**Manual Cleanup**:

```javascript
// Custom retention period
observabilityManager.businessMetrics.cleanup(48); // Keep 48 hours
```

---

## HealthMonitor

### Purpose

Comprehensive health check system with multiple check types, monitoring intervals, retries, and intelligent alerting.

**File**: `/backend/src/infrastructure/observability/HealthMonitor.js` (584 lines)

### Health Check Status Levels

```javascript
const HEALTH_STATUS = {
  HEALTHY: 'healthy',      // All checks passed
  DEGRADED: 'degraded',    // Non-critical checks failing
  UNHEALTHY: 'unhealthy',  // Some checks failing
  CRITICAL: 'critical'     // Critical checks failing
};
```

### Health Check Types

```javascript
const CHECK_TYPES = {
  SYSTEM: 'system',        // OS, memory, CPU, disk
  DATABASE: 'database',    // Database connectivity
  EXTERNAL: 'external',    // External service dependencies
  BUSINESS: 'business'     // Business logic health
};
```

### Default Health Checks

**7 Built-in Checks**:

1. **system_memory** (CRITICAL)
   - Heap usage percentage
   - Alert if > 85%
   - Timeout: 3 seconds

2. **system_cpu** (CRITICAL)
   - CPU load average
   - Alert if > 80%
   - Timeout: 3 seconds

3. **system_disk** (Non-critical)
   - Disk accessibility
   - Working directory access
   - Timeout: 5 seconds

4. **database_connection** (CRITICAL)
   - Database pool connectivity
   - Response time measurement
   - Timeout: 10 seconds, 2 retries

5. **event_bus** (Non-critical)
   - EventBus operational status
   - Event counts and types
   - Timeout: 3 seconds

6. **performance_monitor** (Non-critical)
   - Performance metrics availability
   - Response time, error rate, throughput
   - Timeout: 3 seconds

7. **filesystem_permissions** (Non-critical)
   - Log directory read/write access
   - Temporary file creation test
   - Timeout: 5 seconds

### Custom Health Checks

#### Add Custom Check

```javascript
const { healthMonitor } = require('../infrastructure/observability/HealthMonitor');

// Add business logic health check
healthMonitor.addCheck('gauge_inventory_sync', async () => {
  const syncStatus = await checkInventorySync();

  if (!syncStatus.synchronized) {
    throw new Error(`Inventory out of sync by ${syncStatus.lag} seconds`);
  }

  return {
    synchronized: true,
    lastSync: syncStatus.lastSync,
    lag: syncStatus.lag,
    status: syncStatus.lag > 60 ? 'warning' : 'ok'
  };
}, {
  type: CHECK_TYPES.BUSINESS,
  critical: false,
  timeout: 5000,
  retries: 2,
  interval: 60000 // Check every minute
});
```

#### Remove or Disable Checks

```javascript
// Remove check
healthMonitor.removeCheck('filesystem_permissions');

// Disable check temporarily
healthMonitor.setCheckEnabled('system_disk', false);

// Re-enable
healthMonitor.setCheckEnabled('system_disk', true);
```

### Health Check Execution

#### Run All Checks

```javascript
const results = await healthMonitor.runAllChecks();

// Returns array of check results:
[
  {
    name: 'system_memory',
    type: 'system',
    status: 'healthy',
    duration: 2,
    timestamp: '2025-11-07T10:30:00.000Z',
    details: {
      heapUsed: 45000000,
      heapTotal: 100000000,
      usagePercent: 45,
      status: 'ok'
    },
    critical: true,
    attempt: 1
  },
  // ... more check results
]
```

#### Run Specific Check

```javascript
const result = await healthMonitor.runCheck('database_connection');

// Returns single check result
{
  name: 'database_connection',
  type: 'database',
  status: 'healthy',
  duration: 145,
  details: {
    connected: true,
    responseTime: 145,
    status: 'connected'
  }
}
```

### Overall Health Status

#### Get Health Status

```javascript
const health = await healthMonitor.getHealthStatus();

/* Returns:
{
  status: 'healthy',  // Overall status
  timestamp: '2025-11-07T10:30:00.000Z',
  duration: 325,      // Total check duration
  version: '1.0.0',
  service: 'gauge-tracking-api',
  environment: 'production',

  stats: {
    total: 7,
    healthy: 7,
    degraded: 0,
    unhealthy: 0,
    critical: 0
  },

  checks: [
    // Array of all check results
  ],

  system: {
    uptime: 86400,
    memory: { heapUsed, heapTotal, rss, external },
    cpu: [1.2, 1.5, 1.8],
    platform: 'linux',
    nodeVersion: 'v18.17.0'
  }
}
*/
```

#### Health Status Determination Logic

```javascript
// Status priority:
// 1. If ANY critical check fails → CRITICAL
// 2. If ANY check fails → UNHEALTHY
// 3. If ANY check degraded → DEGRADED
// 4. Otherwise → HEALTHY
```

### Detailed Health Report

```javascript
const report = await healthMonitor.getDetailedReport();

/* Includes:
- Full health status
- Check statistics (success rate, average duration, total checks)
- Monitoring configuration
- Alert thresholds
*/

{
  ...healthStatus,

  checkStatistics: [
    {
      name: 'database_connection',
      type: 'database',
      enabled: true,
      critical: true,
      lastStatus: 'healthy',
      lastCheck: '2025-11-07T10:30:00.000Z',
      successRate: 100,           // Last 10 checks
      averageDuration: 145,       // ms
      totalChecks: 1523
    }
  ],

  monitoring: {
    enabled: true,
    interval: 30000  // 30 seconds
  },

  alertThresholds: {
    memoryUsage: 85,
    cpuUsage: 80,
    diskUsage: 90,
    responseTime: 5000
  }
}
```

### Continuous Health Monitoring

#### Start Monitoring

```javascript
// Start continuous monitoring (default: every 30 seconds)
healthMonitor.startMonitoring();

// Custom interval
healthMonitor.startMonitoring(60000); // Every 60 seconds

// Monitoring runs in background, emits events on critical status
```

**Automatic Actions**:
- Logs periodic health status to StructuredLogger
- Emits `system.health_critical` event on critical failures
- Provides ongoing health metrics for dashboard

#### Stop Monitoring

```javascript
healthMonitor.stopMonitoring();
```

### Health Check Patterns

#### Check with Retries

```javascript
healthMonitor.addCheck('external_api', async () => {
  const response = await fetch('https://external-api.com/health');

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  return {
    available: true,
    responseTime: response.headers.get('x-response-time'),
    status: 'ok'
  };
}, {
  type: CHECK_TYPES.EXTERNAL,
  critical: false,
  timeout: 10000,
  retries: 3  // Retry 3 times before marking as failed
});
```

#### Check with Timeout

```javascript
healthMonitor.addCheck('slow_operation', async () => {
  // Operation that might take a long time
  const result = await performSlowOperation();
  return { status: 'ok', result };
}, {
  timeout: 15000  // Fail if takes longer than 15 seconds
});
```

### Health Endpoint

```javascript
// In routes/health.js
const { healthMonitor } = require('../infrastructure/observability/HealthMonitor');

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const health = await healthMonitor.getHealthStatus();

    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 :
                       health.status === 'unhealthy' ? 503 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'critical',
      error: error.message
    });
  }
});

// Detailed health report
router.get('/health/detailed', async (req, res) => {
  const report = await healthMonitor.getDetailedReport();
  res.json(report);
});

// Individual check
router.get('/health/:checkName', async (req, res) => {
  try {
    const result = await healthMonitor.runCheck(req.params.checkName);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});
```

### Health Check History

Each check maintains history of last 100 executions:

```javascript
const stats = healthMonitor.checks.get('database_connection').getStats();

/* Returns:
{
  name: 'database_connection',
  type: 'database',
  enabled: true,
  critical: true,
  lastStatus: 'healthy',
  lastCheck: '2025-11-07T10:30:00.000Z',
  successRate: 98.5,          // Based on last 10 checks
  averageDuration: 145,        // Average of last 10 checks
  totalChecks: 1523           // Total lifetime checks
}
*/
```

---

## StructuredLogger

### Purpose

Enhanced structured logging with correlation IDs, log categories, multiple transports, and context preservation across requests.

**File**: `/backend/src/infrastructure/observability/StructuredLogger.js` (505 lines)

### Log Levels

```javascript
const LOG_LEVELS = {
  error: 0,    // Error conditions
  warn: 1,     // Warning conditions
  info: 2,     // Informational messages (DEFAULT)
  http: 3,     // HTTP request logging
  debug: 4,    // Debug-level messages
  trace: 5     // Trace-level messages
};
```

### Log Categories

```javascript
const LOG_CATEGORIES = {
  SYSTEM: 'system',           // System-level logs
  BUSINESS: 'business',       // Business operations
  SECURITY: 'security',       // Security events
  PERFORMANCE: 'performance', // Performance metrics
  AUDIT: 'audit',            // Audit trail
  DEBUG: 'debug'             // Debug information
};
```

**Category Routing**:
- **SYSTEM**: `application.log`, `error.log` (if error level)
- **BUSINESS**: `audit.log`, `application.log`
- **SECURITY**: `security.log`, `application.log`
- **PERFORMANCE**: `performance.log`, `application.log`
- **AUDIT**: `audit.log`

### Log Transports

**6 File Transports**:

1. **application.log**
   - All log levels
   - Max size: 50MB
   - Keep: 10 files
   - Rotation: Automatic

2. **error.log**
   - Error level only
   - Max size: 10MB
   - Keep: 5 files

3. **audit.log**
   - Business and audit categories
   - Max size: 100MB
   - Keep: 20 files
   - AS9102 compliant

4. **security.log**
   - Security category only
   - Max size: 20MB
   - Keep: 10 files

5. **performance.log**
   - Performance category only
   - Max size: 20MB
   - Keep: 5 files

6. **console** (development only)
   - Colorized output
   - Human-readable format

### Basic Logging

#### Standard Log Levels

```javascript
const { structuredLogger } = require('../infrastructure/observability/StructuredLogger');

// Error logging
structuredLogger.error('Database connection failed', {
  error: err.message,
  stack: err.stack,
  connectionString: 'mysql://...',
  retries: 3
});

// Warning logging
structuredLogger.warn('High memory usage detected', {
  memoryPercent: 87,
  threshold: 85,
  action: 'monitoring'
});

// Info logging
structuredLogger.info('Gauge created successfully', {
  gaugeId: 'TG-001',
  equipmentType: 'thread_gauge',
  userId: req.user.id
});

// HTTP request logging
structuredLogger.http('POST /api/gauges', {
  statusCode: 201,
  duration: 145,
  userId: req.user.id
});

// Debug logging
structuredLogger.debug('Query execution details', {
  query: 'SELECT * FROM gauges WHERE id = ?',
  params: ['TG-001'],
  duration: 12
});

// Trace logging
structuredLogger.trace('Function entry', {
  function: 'createGauge',
  args: { serialNumber, equipmentType }
});
```

#### Category-Specific Logging

```javascript
// Business operation logging
structuredLogger.business('Gauge set created', {
  setId: 'SET-001',
  gaugeCount: 5,
  userId: req.user.id,
  location: 'warehouse-a'
});

// Security event logging
structuredLogger.security('Failed login attempt', {
  username: 'admin',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  reason: 'invalid_password'
});

// Audit logging
structuredLogger.audit('Configuration changed', {
  setting: 'max_calibration_days',
  oldValue: 365,
  newValue: 730,
  userId: req.user.id,
  timestamp: new Date()
});

// Performance logging
structuredLogger.performance('Slow query detected', {
  query: 'complex_join_query',
  duration: 2500,
  threshold: 1000,
  rows: 15000
});
```

### Correlation IDs

#### Automatic Correlation Middleware

```javascript
// In app.js or server setup
const { structuredLogger } = require('./infrastructure/observability/StructuredLogger');

// Add correlation middleware BEFORE routes
app.use(structuredLogger.createMiddleware());

// Now all logs for a request share the same correlation ID
// Correlation ID added to response header: X-Correlation-ID
```

#### Manual Correlation Context

```javascript
// Create correlation ID
const correlationId = structuredLogger.createCorrelationId();

// Set context
structuredLogger.setCorrelationContext(correlationId, {
  userId: req.user.id,
  operation: 'createGaugeSet',
  setId: 'SET-001'
});

// Log with correlation
structuredLogger.info('Starting gauge set creation', {
  correlationId,
  gaugeCount: 5
});

// All logs with this correlationId will include the context

// Clear when done
structuredLogger.clearCorrelationContext(correlationId);
```

### Child Loggers

Create child loggers with bound context:

```javascript
// Create child logger for service
const serviceLogger = structuredLogger.child({
  component: 'GaugeCreationService',
  operation: 'createThreadGaugeSet'
});

// All logs from child include bound context
serviceLogger.info('Validating gauge configuration', {
  gaugeId: 'TG-001'
});

// Output includes: component='GaugeCreationService', operation='createThreadGaugeSet'
```

### HTTP Request Logging

#### Automatic Request Logging

```javascript
// Using middleware (recommended)
app.use(structuredLogger.createMiddleware());

// Automatically logs:
// - Request method, URL, user agent
// - Response status code, duration
// - User ID (if authenticated)
// - Correlation ID (generated or from header)
```

#### Manual Request Logging

```javascript
structuredLogger.logRequest(req, res, duration);

/* Logs:
{
  level: 'http',
  message: 'HTTP Request',
  correlationId: 'uuid',
  http: {
    method: 'POST',
    url: '/api/gauges',
    statusCode: 201,
    userAgent: 'Mozilla/5.0...',
    contentLength: '1523',
    referrer: 'https://...'
  },
  performance: {
    duration: 145,
    responseTime: 145
  },
  userId: 42,
  ipAddress: '192.168.1.100',
  operation: 'POST /api/gauges'
}
*/
```

### Operation Logging

```javascript
// Log business operation
structuredLogger.logOperation('createGaugeSet', {
  setId: 'SET-001',
  gaugeCount: 5,
  duration: 523
}, {
  correlationId: req.correlationId,
  userId: req.user.id
});

/* Logs:
{
  level: 'info',
  category: 'business',
  message: 'Business operation: createGaugeSet',
  operation: 'createGaugeSet',
  details: {
    setId: 'SET-001',
    gaugeCount: 5,
    duration: 523
  },
  correlationId: 'uuid',
  userId: 42
}
*/
```

### Security Event Logging

```javascript
// Log security event
structuredLogger.logSecurity('unauthorized_access', {
  resource: '/api/admin/users',
  requiredRole: 'admin',
  userRole: 'user'
}, {
  userId: req.user.id,
  ipAddress: req.ip,
  severity: 'high'
});

/* Logs to security.log:
{
  level: 'warn',
  category: 'security',
  message: 'Security event: unauthorized_access',
  securityEvent: 'unauthorized_access',
  details: {
    resource: '/api/admin/users',
    requiredRole: 'admin',
    userRole: 'user'
  },
  severity: 'high',
  userId: 42,
  ipAddress: '192.168.1.100'
}
*/
```

### Performance Logging

```javascript
// Log performance metrics
structuredLogger.logPerformance('database_query', {
  duration: 245,
  rows: 1523,
  query: 'complex_join'
}, {
  correlationId: req.correlationId,
  threshold: 200,
  exceeded: true
});

/* Logs to performance.log:
{
  level: 'info',
  category: 'performance',
  message: 'Performance: database_query',
  operation: 'database_query',
  metrics: {
    duration: 245,
    rows: 1523,
    query: 'complex_join'
  },
  correlationId: 'uuid',
  threshold: 200,
  exceeded: true
}
*/
```

### Log Entry Structure

#### Standard Log Format

```json
{
  "@timestamp": "2025-11-07T10:30:00.123Z",
  "level": "info",
  "message": "Gauge created successfully",
  "service": "gauge-tracking-api",
  "version": "1.0.0",
  "environment": "production",
  "category": "business",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "trace-uuid",
  "spanId": "span-uuid",
  "userId": 42,
  "requestId": "req-uuid",
  "operation": "createGauge",
  "component": "GaugeCreationService",
  "context": {
    "gaugeId": "TG-001",
    "equipmentType": "thread_gauge"
  },
  "metadata": {
    "duration": 145,
    "cached": false
  },
  "system": {
    "hostname": "api-server-01",
    "platform": "linux",
    "nodeVersion": "v18.17.0",
    "pid": 12345
  }
}
```

### Best Practices

#### 1. Always Use Correlation IDs

```javascript
// ❌ BAD - No correlation
structuredLogger.info('User action completed');

// ✅ GOOD - With correlation
structuredLogger.info('User action completed', {
  correlationId: req.correlationId,
  userId: req.user.id
});
```

#### 2. Use Appropriate Categories

```javascript
// ❌ BAD - Generic system log
structuredLogger.info('Payment processed');

// ✅ GOOD - Business category
structuredLogger.business('Payment processed', {
  orderId: 'ORD-123',
  amount: 99.99,
  paymentMethod: 'credit_card'
});
```

#### 3. Include Context

```javascript
// ❌ BAD - No context
structuredLogger.error('Operation failed');

// ✅ GOOD - Rich context
structuredLogger.error('Gauge creation failed', {
  error: err.message,
  stack: err.stack,
  gaugeId: 'TG-001',
  equipmentType: 'thread_gauge',
  userId: req.user.id,
  correlationId: req.correlationId
});
```

#### 4. Use Child Loggers for Components

```javascript
// ❌ BAD - Repeat component name
class GaugeCreationService {
  async create(data) {
    structuredLogger.info('Creating gauge', { component: 'GaugeCreationService' });
  }
}

// ✅ GOOD - Bound child logger
class GaugeCreationService {
  constructor() {
    this.logger = structuredLogger.child({ component: 'GaugeCreationService' });
  }

  async create(data) {
    this.logger.info('Creating gauge', { gaugeId: data.id });
  }
}
```

---

## Integration Patterns

### Full Observability Stack

```javascript
// In service class
const { observabilityManager } = require('../infrastructure/observability/ObservabilityManager');
const { healthMonitor } = require('../infrastructure/observability/HealthMonitor');
const { structuredLogger } = require('../infrastructure/observability/StructuredLogger');

class GaugeCreationService {
  constructor() {
    this.logger = structuredLogger.child({ component: 'GaugeCreationService' });
  }

  async createThreadGaugeSet(data, traceId) {
    const startTime = Date.now();

    // Start distributed trace
    const localTraceId = traceId || observabilityManager.tracingManager.startTrace('createThreadGaugeSet');

    try {
      // Add trace tags
      observabilityManager.tracingManager.addTag(localTraceId, 'set.id', data.setId);
      observabilityManager.tracingManager.addTag(localTraceId, 'gauge.count', data.gaugeCount);

      // Log operation start
      this.logger.info('Starting thread gauge set creation', {
        setId: data.setId,
        gaugeCount: data.gaugeCount,
        traceId: localTraceId
      });

      // Business logic...
      const result = await this.createSet(data);

      const duration = Date.now() - startTime;

      // Record metrics
      observabilityManager.recordOperation('createThreadGaugeSet', duration, true, {
        setId: result.setId,
        gaugeCount: result.gauges.length
      }, localTraceId);

      // Increment business counter
      observabilityManager.businessMetrics.incrementCounter('gauge_sets_created', 1, {
        equipment_type: 'thread_gauge'
      });

      // Finish trace
      observabilityManager.tracingManager.finishTrace(localTraceId, 'completed');

      // Log success
      this.logger.business('Thread gauge set created successfully', {
        setId: result.setId,
        gaugeCount: result.gauges.length,
        duration,
        traceId: localTraceId
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failed operation
      observabilityManager.recordOperation('createThreadGaugeSet', duration, false, {
        error: error.message
      }, localTraceId);

      // Add error to trace
      observabilityManager.tracingManager.addTag(localTraceId, 'error', error.message);
      observabilityManager.tracingManager.finishTrace(localTraceId, 'error');

      // Log error
      this.logger.error('Thread gauge set creation failed', {
        error: error.message,
        stack: error.stack,
        setId: data.setId,
        duration,
        traceId: localTraceId
      });

      throw error;
    }
  }
}
```

### Health Check for Business Logic

```javascript
// Add custom health check
healthMonitor.addCheck('gauge_creation_service', async () => {
  const gaugeService = new GaugeCreationService();

  // Validate service dependencies
  const hasRepository = gaugeService.gaugeRepository !== null;
  const hasValidator = gaugeService.validator !== null;

  if (!hasRepository || !hasValidator) {
    throw new Error('Required dependencies not initialized');
  }

  // Check service can access database
  const canQuery = await gaugeService.gaugeRepository.testConnection();

  if (!canQuery) {
    throw new Error('Cannot access database');
  }

  return {
    initialized: true,
    dependencies: { repository: true, validator: true },
    database: { accessible: true },
    status: 'ok'
  };
}, {
  type: CHECK_TYPES.BUSINESS,
  critical: false,
  timeout: 10000
});
```

### Express.js Integration

```javascript
// In app.js
const express = require('express');
const { observabilityManager } = require('./infrastructure/observability/ObservabilityManager');
const { healthMonitor } = require('./infrastructure/observability/HealthMonitor');
const { structuredLogger } = require('./infrastructure/observability/StructuredLogger');

const app = express();

// 1. Add structured logging middleware
app.use(structuredLogger.createMiddleware());

// 2. Add distributed tracing middleware
app.use(observabilityManager.createTracingMiddleware());

// 3. Your routes...
app.use('/api', apiRoutes);

// 4. Health endpoint
app.get('/health', async (req, res) => {
  const health = await healthMonitor.getHealthStatus();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// 5. Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(observabilityManager.exportPrometheusMetrics());
});

// 6. Observability dashboard
app.get('/dashboard', (req, res) => {
  const dashboard = observabilityManager.getDashboard();
  res.json(dashboard);
});

// 7. Start health monitoring
healthMonitor.startMonitoring(30000); // Every 30 seconds

// 8. Log server startup
structuredLogger.info('Server starting', {
  port: process.env.PORT,
  environment: process.env.NODE_ENV,
  nodeVersion: process.version
});
```

---

## Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=info                    # error, warn, info, http, debug, trace
NODE_ENV=production              # development, production

# Observability
OBSERVABILITY_LEVEL=standard     # minimal, standard, comprehensive, debug
HEALTH_CHECK_INTERVAL=30000      # Health check interval (ms)

# Alert Thresholds
ALERT_MEMORY_THRESHOLD=85        # Memory usage percent
ALERT_CPU_THRESHOLD=80           # CPU usage percent
ALERT_RESPONSE_TIME=2000         # Response time (ms)
ALERT_ERROR_RATE=5               # Error rate percent
```

### Observability Manager Configuration

```javascript
const { observabilityManager } = require('./infrastructure/observability/ObservabilityManager');

// Set observability level
observabilityManager.setLevel(OBSERVABILITY_LEVELS.COMPREHENSIVE);

// Configure alert thresholds
observabilityManager.alertThresholds = {
  errorRate: 10,        // 10%
  responseTime: 3000,   // 3 seconds
  memoryUsage: 90,      // 90%
  cpuUsage: 85          // 85%
};
```

### Health Monitor Configuration

```javascript
const { healthMonitor } = require('./infrastructure/observability/HealthMonitor');

// Configure alert thresholds
healthMonitor.alertThresholds = {
  memoryUsage: 90,      // 90%
  cpuUsage: 85,         // 85%
  diskUsage: 95,        // 95%
  responseTime: 10000   // 10 seconds
};

// Start monitoring with custom interval
healthMonitor.startMonitoring(60000); // Every 60 seconds
```

### Structured Logger Configuration

```javascript
const { StructuredLogger } = require('./infrastructure/observability/StructuredLogger');

// Create custom logger instance
const customLogger = new StructuredLogger({
  serviceName: 'my-service',
  version: '2.0.0',
  environment: process.env.NODE_ENV,
  level: 'debug',
  logsDir: '/var/log/my-service'
});
```

---

## Monitoring & Alerting

### Alert Triggers

**Automatic Alerts** (via ObservabilityManager):
- Memory usage > threshold (default 85%)
- CPU usage > threshold (default 80%)
- Response time > threshold (default 2000ms)
- Error rate > threshold (default 5%)

**Automatic Alerts** (via HealthMonitor):
- Critical health check failures
- Database connection loss
- System resource exhaustion

### Alert Destinations

Alerts are emitted as EventBus events:

```javascript
// Subscribe to alerts
eventBus.on(EVENT_TYPES.SYSTEM_ERROR_OCCURRED, (eventData) => {
  // Send to notification system
  notificationService.send({
    channel: CHANNELS.EMAIL,
    template: TEMPLATE_TYPES.ALERT,
    data: {
      type: eventData.type,
      message: eventData.message,
      severity: eventData.severity
    }
  });
});

// Health critical event
eventBus.on('system.health_critical', (eventData) => {
  // Escalate critical health issues
  console.error('CRITICAL HEALTH ISSUE:', eventData);
});
```

### Prometheus Integration

**Metrics Endpoint**:
```
GET /metrics
Content-Type: text/plain; version=0.0.4
```

**Prometheus Configuration** (`prometheus.yml`):
```yaml
scrape_configs:
  - job_name: 'gauge-tracking-api'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

**Grafana Dashboard**:
- Import metrics from Prometheus
- Visualize business metrics, system health, trace data
- Set up alerts based on thresholds

---

## Best Practices

### 1. Use All Three Components Together

```javascript
// ✅ GOOD - Full observability
const traceId = observabilityManager.tracingManager.startTrace('operation');
structuredLogger.info('Starting operation', { traceId });
observabilityManager.recordOperation('operation', duration, success, {}, traceId);
```

### 2. Always Include Trace Context

```javascript
// ✅ GOOD - Pass trace ID through service calls
async createGauge(data, traceId) {
  await this.repository.create(data, traceId);
}
```

### 3. Use Correlation IDs for Request Tracking

```javascript
// ✅ GOOD - Correlation across all logs for request
app.use(structuredLogger.createMiddleware());
```

### 4. Add Custom Health Checks for Business Logic

```javascript
// ✅ GOOD - Monitor business-critical functionality
healthMonitor.addCheck('inventory_sync', checkInventorySync, { critical: true });
```

### 5. Use Child Loggers for Components

```javascript
// ✅ GOOD - Automatic component context
this.logger = structuredLogger.child({ component: 'GaugeService' });
```

### 6. Record Business Metrics

```javascript
// ✅ GOOD - Track business KPIs
observabilityManager.businessMetrics.incrementCounter('orders_completed', 1, {
  paymentType: 'credit_card'
});
```

### 7. Monitor Performance

```javascript
// ✅ GOOD - Track operation performance
const start = Date.now();
await operation();
const duration = Date.now() - start;
observabilityManager.recordMetric('operation_time', duration, 'timer');
```

### 8. Use Appropriate Log Levels

```javascript
// ✅ GOOD - Correct severity
structuredLogger.error('Critical failure', { error });     // Requires immediate action
structuredLogger.warn('Degraded performance', { metrics }); // Should be investigated
structuredLogger.info('Operation completed', { result });   // Normal operations
structuredLogger.debug('Detailed state', { state });        // Development debugging
```

---

## Troubleshooting

### High Log Volume

**Problem**: Too many logs, expensive storage

**Solutions**:
```javascript
// Reduce log level in production
structuredLogger.logger.level = 'warn';

// Disable non-critical health checks
healthMonitor.setCheckEnabled('filesystem_permissions', false);

// Reduce observability level
observabilityManager.setLevel(OBSERVABILITY_LEVELS.MINIMAL);
```

### Missing Correlation

**Problem**: Logs not correlated across services

**Solutions**:
```javascript
// Ensure middleware is first
app.use(structuredLogger.createMiddleware());
app.use(observabilityManager.createTracingMiddleware());

// Pass correlation ID to all service calls
await service.method(data, req.correlationId);
```

### Health Checks Timing Out

**Problem**: Health checks fail due to timeout

**Solutions**:
```javascript
// Increase timeout for slow checks
healthMonitor.addCheck('slow_check', checkFn, {
  timeout: 30000 // 30 seconds
});

// Add retries
healthMonitor.addCheck('flaky_check', checkFn, {
  retries: 3
});
```

### Memory Usage from Metrics

**Problem**: Metrics consuming too much memory

**Solutions**:
```javascript
// Reduce cleanup retention
observabilityManager.businessMetrics.cleanup(12); // Keep 12 hours instead of 24

// Reduce trace history
observabilityManager.tracingManager.maxTraces = 500; // Default 1000
```

---

## Migration from Legacy Logging

### Before (Legacy Logger)

```javascript
const logger = require('../utils/logger');

logger.info('Gauge created', { gaugeId: 'TG-001' });
```

### After (Structured Logger)

```javascript
const { structuredLogger } = require('../infrastructure/observability/StructuredLogger');

structuredLogger.business('Gauge created', {
  gaugeId: 'TG-001',
  correlationId: req.correlationId,
  userId: req.user.id
});
```

### Migration Checklist

- [ ] Replace all `logger` imports with `structuredLogger`
- [ ] Add correlation middleware to Express app
- [ ] Add tracing middleware for distributed tracing
- [ ] Update service methods to accept `traceId` parameter
- [ ] Add custom health checks for business logic
- [ ] Configure alert thresholds
- [ ] Set up Prometheus scraping
- [ ] Create Grafana dashboards
- [ ] Update error handling to include trace context
- [ ] Add business metrics for KPIs

---

## Reference

### Files

- `ObservabilityManager.js` (660 lines) - Central observability orchestration
- `HealthMonitor.js` (584 lines) - Health check system
- `StructuredLogger.js` (505 lines) - Enhanced structured logging
- `ReliabilityBudgetMonitor.js` (327 lines) - SLI/SLO tracking

### Related Documentation

- [Error Handling Standards](./05-Error-Handling.md)
- [Infrastructure Services](./04-Infrastructure-Services.md)
- [Architecture Patterns](../07-Architecture-Patterns/README.md)

### External Resources

- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
- [OpenTelemetry Tracing](https://opentelemetry.io/docs/concepts/observability-primer/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Health Check Patterns](https://microservices.io/patterns/observability/health-check-api.html)

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
**Status**: Production Standard
