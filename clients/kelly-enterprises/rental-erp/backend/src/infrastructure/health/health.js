const express = require('express');
const router = express.Router();
const { getPool } = require('../database/connection');
const os = require('os');
const { liveness, readiness, health } = require('../../modules/health/health.controller');
const logger = require('../utils/logger');

// Try to load redis if available
let redis;
try {
  redis = require('../utils/redisClient');
} catch (error) {
  logger.warn('Redis client not available, health check will run without Redis monitoring');
}

/**
 * Kubernetes liveness probe - simple check that the service is alive
 * This should be very lightweight and not check external dependencies
 * ChatGPT recommendation: Use this endpoint for Railway health checks
 */
router.get('/liveness', liveness);

/**
 * ChatGPT recommendation: Railway-specific /live endpoint
 * Always returns 200 if HTTP server is running - no DB dependency
 */
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'fireproof-gauge-backend' });
});

/**
 * Kubernetes readiness probe - checks if the service is ready to handle requests
 * This should check critical dependencies like database connections
 */
router.get('/readiness', readiness);

/**
 * Health check endpoint for monitoring - backward compatibility
 * Returns system health status and basic metrics
 */
router.get('/', health);

/**
 * Detailed health check endpoint with comprehensive system info
 */
router.get('/detailed', async (req, res) => {
  const detailedHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'fireproof-gauge-backend',
    version: process.env.npm_package_version || '1.0.0',
    checks: {},
    system: {},
    environment: {},
    database: {}
  };

  try {
    // Enhanced database checks - handle null pool gracefully
    const pool = getPool();  // Get pool at runtime, not module load time
    if (!pool) {
      detailedHealth.status = 'unhealthy';
      detailedHealth.checks.database = {
        status: 'unhealthy',
        error: 'Database pool not initialized'
      };
      detailedHealth.database.pool = {
        status: 'not_initialized'
      };
    } else {
      const dbStart = Date.now();
      const [dbResult] = await pool.execute('SELECT 1 as healthy');
      
      // Use dynamic database name from environment
      const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway';
      const [tableCheck] = await pool.execute(`SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = ?`, [dbName]);
      
      detailedHealth.checks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart,
        connection: dbResult[0].healthy === 1,
        tables: tableCheck[0].table_count,
        database: dbName
      };

      // Pool statistics
      if (pool.pool) {
        detailedHealth.database.pool = {
          total: pool.pool._allConnections ? pool.pool._allConnections.length : 0,
          active: pool.pool._acquiringConnections ? pool.pool._acquiringConnections.length : 0,
          idle: pool.pool._freeConnections ? pool.pool._freeConnections.length : 0
        };
      }
    }
  } catch (error) {
    detailedHealth.status = 'unhealthy';
    detailedHealth.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
  }

  try {
    // Enhanced system metrics
    detailedHealth.system = {
      memory: {
        free: os.freemem(),
        total: os.totalmem(),
        usage: process.memoryUsage(),
        percentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      cpu: {
        cores: os.cpus().length,
        load: os.loadavg(),
        model: os.cpus()[0]?.model
      },
      platform: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname()
      }
    };

    // Enhanced environment info
    detailedHealth.environment = {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      port: process.env.API_PORT,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      pid: process.pid
    };

    const statusCode = detailedHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    detailedHealth.status = 'unhealthy';
    detailedHealth.checks.system = {
      status: 'unhealthy',
      error: error.message
    };
    res.status(503).json(detailedHealth);
  }
});

/**
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (req, res) => {
  try {
    // Basic Prometheus metrics format
    const metrics = [];
    
    // Uptime metric
    metrics.push(`# HELP process_uptime_seconds Process uptime in seconds`);
    metrics.push(`# TYPE process_uptime_seconds gauge`);
    metrics.push(`process_uptime_seconds ${process.uptime()}`);
    
    // Memory metrics
    const memUsage = process.memoryUsage();
    metrics.push(`# HELP process_memory_heap_used_bytes Process heap memory used`);
    metrics.push(`# TYPE process_memory_heap_used_bytes gauge`);
    metrics.push(`process_memory_heap_used_bytes ${memUsage.heapUsed}`);
    
    // Database connection pool metrics - handle null pool gracefully
    const pool = getPool();  // Get pool at runtime
    if (pool && pool.pool && pool.pool._allConnections) {
      metrics.push(`# HELP db_connections_total Total database connections`);
      metrics.push(`# TYPE db_connections_total gauge`);
      metrics.push(`db_connections_total ${pool.pool._allConnections.length}`);
      
      metrics.push(`# HELP db_connections_active Active database connections`);
      metrics.push(`# TYPE db_connections_active gauge`);
      metrics.push(`db_connections_active ${pool.pool._allConnections.length - (pool.pool._freeConnections ? pool.pool._freeConnections.length : 0)}`);
    } else {
      metrics.push(`# HELP db_connections_total Total database connections`);
      metrics.push(`# TYPE db_connections_total gauge`);
      metrics.push(`db_connections_total 0`);
    }
    
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics.join('\n'));
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

/**
 * POST /api/health - Health check endpoint for frontend applications
 * Simple endpoint that returns health status
 */
router.post('/', (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'fireproof-gauge-backend'
    });
  } catch (error) {
    logger.error('Health check POST error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'Health check failed'
    });
  }
});

module.exports = router;