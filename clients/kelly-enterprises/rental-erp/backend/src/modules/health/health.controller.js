const { getPool } = require('../../infrastructure/database/connection');

/**
 * Liveness probe - simple check that the service is alive
 * This should be very lightweight and not check external dependencies
 * ChatGPT recommendation: Always 200 for deployment health
 */
const liveness = (req, res) => {
  res.status(200).json({ status: 'ok', service: 'fireproof-gauge-backend' });
};

/**
 * Readiness probe - checks if the service is ready to handle requests
 * This should check critical dependencies like database connections
 */
const readiness = async (req, res) => {
  try {
    // Check database connection - handle null pool gracefully
    const pool = getPool();  // Get pool at runtime
    if (!pool) {
      return res.status(503).json({ 
        ready: false, 
        error: 'database_unavailable',
        details: 'Database pool not initialized'
      });
    }
    
    await pool.execute('SELECT 1');
    
    // Check other critical dependencies here:
    // - Redis/cache connection
    // - Message queue connection
    // - Required environment variables
    // - File system access
    
    // Check required environment variables
    const requiredEnvVars = ['NODE_ENV', 'API_PORT', 'JWT_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      return res.status(503).json({ 
        ready: false, 
        error: 'missing_configuration',
        details: `Missing environment variables: ${missingEnvVars.join(', ')}`
      });
    }
    
    return res.status(200).json({ ready: true });
  } catch (error) {
    return res.status(503).json({ 
      ready: false, 
      error: 'dependency_unavailable',
      details: error.message
    });
  }
};

/**
 * Legacy health check endpoint - ChatGPT recommendation: 200 always for deployments
 * Returns 200 with degraded status instead of 503 to prevent deployment failures
 */
const health = async (req, res) => {
  const healthcheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'fireproof-gauge-backend',
    version: process.env.npm_package_version || '1.0.0',
    http: 'ok',
    checks: {}
  };

  try {
    // Check database connectivity - handle null pool gracefully
    const pool = getPool();  // Get pool at runtime
    if (!pool) {
      healthcheck.status = 'degraded';
      healthcheck.checks.database = {
        status: 'down',
        error: 'Database pool not initialized'
      };
    } else {
      const dbStart = Date.now();
      const [dbResult] = await pool.execute('SELECT 1 as healthy');
      healthcheck.checks.database = {
        status: 'ok',
        responseTime: Date.now() - dbStart,
        connection: dbResult[0].healthy === 1
      };
    }
  } catch (error) {
    healthcheck.status = 'degraded';
    healthcheck.checks.database = {
      status: 'down',
      error: 'Database connection failed: ' + error.message
    };
  }

  // ChatGPT fix: Always return 200, even when degraded
  res.status(200).json(healthcheck);
};

module.exports = {
  liveness,
  readiness,
  health
};