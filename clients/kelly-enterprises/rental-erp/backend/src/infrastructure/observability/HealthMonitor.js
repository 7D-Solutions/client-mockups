/**
 * Comprehensive Health Monitor
 * HIGH-005 Implementation - Advanced Health Checks
 */

const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { structuredLogger } = require('./StructuredLogger');
const { performanceMonitor } = require('../utils/performanceMonitor');
const { eventBus } = require('../events/EventBus');

/**
 * Health check status levels
 */
const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  CRITICAL: 'critical'
};

/**
 * Health check types
 */
const CHECK_TYPES = {
  SYSTEM: 'system',
  DATABASE: 'database',
  EXTERNAL: 'external',
  BUSINESS: 'business'
};

/**
 * Individual health check class
 */
class HealthCheck {
  constructor(name, checkFunction, options = {}) {
    this.name = name;
    this.checkFunction = checkFunction;
    this.type = options.type || CHECK_TYPES.SYSTEM;
    this.timeout = options.timeout || 5000; // 5 seconds default
    this.critical = options.critical || false;
    this.interval = options.interval || 30000; // 30 seconds default
    this.retries = options.retries || 1;
    this.lastResult = null;
    this.history = [];
    this.enabled = true;
  }

  async execute() {
    const startTime = Date.now();
    let attempt = 0;
    let lastError = null;

    while (attempt < this.retries) {
      try {
        const result = await Promise.race([
          this.checkFunction(),
          this.timeoutPromise()
        ]);

        const duration = Date.now() - startTime;
        const healthResult = {
          name: this.name,
          type: this.type,
          status: HEALTH_STATUS.HEALTHY,
          duration,
          timestamp: new Date().toISOString(),
          details: result || {},
          critical: this.critical,
          attempt: attempt + 1
        };

        this.lastResult = healthResult;
        this.addToHistory(healthResult);
        return healthResult;

      } catch (error) {
        lastError = error;
        attempt++;
        
        if (attempt < this.retries) {
          await this.sleep(1000); // Wait 1 second between retries
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime;
    const healthResult = {
      name: this.name,
      type: this.type,
      status: this.critical ? HEALTH_STATUS.CRITICAL : HEALTH_STATUS.UNHEALTHY,
      duration,
      timestamp: new Date().toISOString(),
      error: lastError.message,
      critical: this.critical,
      attempt
    };

    this.lastResult = healthResult;
    this.addToHistory(healthResult);
    return healthResult;
  }

  timeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check '${this.name}' timed out after ${this.timeout}ms`));
      }, this.timeout);
    });
  }

  addToHistory(result) {
    this.history.push(result);
    // Keep only last 100 results
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    const recentHistory = this.history.slice(-10);
    const healthyCount = recentHistory.filter(r => r.status === HEALTH_STATUS.HEALTHY).length;
    const avgDuration = recentHistory.length > 0 
      ? recentHistory.reduce((sum, r) => sum + r.duration, 0) / recentHistory.length 
      : 0;

    return {
      name: this.name,
      type: this.type,
      enabled: this.enabled,
      critical: this.critical,
      lastStatus: this.lastResult?.status || 'unknown',
      lastCheck: this.lastResult?.timestamp || null,
      successRate: recentHistory.length > 0 ? (healthyCount / recentHistory.length) * 100 : 0,
      averageDuration: Math.round(avgDuration),
      totalChecks: this.history.length
    };
  }
}

/**
 * Main Health Monitor class
 */
class HealthMonitor {
  constructor() {
    this.checks = new Map();
    this.monitoring = false;
    this.monitoringInterval = null;
    this.systemMetrics = {};
    this.alertThresholds = {
      memoryUsage: 85, // 85%
      cpuUsage: 80,    // 80%
      diskUsage: 90,   // 90%
      responseTime: 5000 // 5 seconds
    };

    this.initializeDefaultChecks();
  }

  /**
   * Initialize default system health checks
   */
  initializeDefaultChecks() {
    // System memory check
    this.addCheck('system_memory', async () => {
      const memUsage = process.memoryUsage();
      const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      return {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        usagePercent: Math.round(memPercent * 100) / 100,
        rss: memUsage.rss,
        external: memUsage.external,
        status: memPercent > this.alertThresholds.memoryUsage ? 'warning' : 'ok'
      };
    }, {
      type: CHECK_TYPES.SYSTEM,
      critical: true,
      timeout: 3000
    });

    // System CPU check
    this.addCheck('system_cpu', async () => {
      const cpuUsage = os.loadavg();
      const cpuPercent = (cpuUsage[0] / os.cpus().length) * 100;
      
      return {
        loadAverage: cpuUsage,
        cpuCount: os.cpus().length,
        usagePercent: Math.round(cpuPercent * 100) / 100,
        uptime: os.uptime(),
        status: cpuPercent > this.alertThresholds.cpuUsage ? 'warning' : 'ok'
      };
    }, {
      type: CHECK_TYPES.SYSTEM,
      critical: true,
      timeout: 3000
    });

    // Disk space check
    this.addCheck('system_disk', async () => {
      try {
        const stats = await fs.stat(process.cwd());
        const diskUsage = {
          path: process.cwd(),
          accessible: true,
          status: 'ok'
        };
        return diskUsage;
      } catch (error) {
        throw new Error(`Disk access failed: ${error.message}`);
      }
    }, {
      type: CHECK_TYPES.SYSTEM,
      critical: false,
      timeout: 5000
    });

    // Database connection check
    this.addCheck('database_connection', async () => {
      try {
        // Check if database is configured first
        if (!process.env.MYSQLPASSWORD && !process.env.DB_PASS) {
          return {
            connected: false,
            status: 'not_configured',
            message: 'Database not configured - running without database'
          };
        }

        // Try to require database connection module
        const { testConnection, pool } = require('../database/connection');
        if (!pool) {
          return {
            connected: false,
            status: 'pool_not_available',
            message: 'Database pool not initialized'
          };
        }
        
        if (testConnection) {
          const result = await testConnection();
          return {
            connected: true,
            responseTime: result.responseTime || 0,
            status: 'connected'
          };
        } else {
          return {
            connected: false,
            status: 'no_test_function',
            message: 'Database test function not available'
          };
        }
      } catch (error) {
        // Database module may not exist or connection may be down
        return {
          connected: false,
          status: 'error',
          error: error.message
        };
      }
    }, {
      type: CHECK_TYPES.DATABASE,
      critical: true,
      timeout: 10000,
      retries: 2
    });

    // Event bus check
    this.addCheck('event_bus', async () => {
      const stats = eventBus.getStats();
      return {
        status: 'active',
        eventsEmitted: stats.eventsEmitted,
        eventTypes: stats.eventTypes.length,
        recentEvents: stats.recentEvents.length,
        operational: true
      };
    }, {
      type: CHECK_TYPES.BUSINESS,
      critical: false,
      timeout: 3000
    });

    // Performance monitoring check
    this.addCheck('performance_monitor', async () => {
      const dashboard = performanceMonitor.getDashboard();
      const current = dashboard.current || {};
      
      return {
        status: 'active',
        responseTime: current.responseTime?.avg || 0,
        errorRate: current.errorRate || 0,
        throughput: current.throughput || 0,
        alerts: dashboard.alerts?.length || 0,
        healthy: (current.responseTime?.avg || 0) < this.alertThresholds.responseTime
      };
    }, {
      type: CHECK_TYPES.BUSINESS,
      critical: false,
      timeout: 3000
    });

    // File system permissions check
    this.addCheck('filesystem_permissions', async () => {
      const testDir = path.join(__dirname, '..', '..', '..', 'logs');
      
      try {
        // Test read permission
        await fs.access(testDir, fs.constants.R_OK);
        
        // Test write permission
        await fs.access(testDir, fs.constants.W_OK);
        
        // Test creating a temporary file
        const testFile = path.join(testDir, 'health-check-test.tmp');
        await fs.writeFile(testFile, 'health check test');
        await fs.unlink(testFile);
        
        return {
          readable: true,
          writable: true,
          path: testDir,
          status: 'ok'
        };
      } catch (error) {
        throw new Error(`Filesystem permission error: ${error.message}`);
      }
    }, {
      type: CHECK_TYPES.SYSTEM,
      critical: false,
      timeout: 5000
    });
  }

  /**
   * Add a new health check
   */
  addCheck(name, checkFunction, options = {}) {
    const healthCheck = new HealthCheck(name, checkFunction, options);
    this.checks.set(name, healthCheck);
    structuredLogger.info(`Health check '${name}' added`, { 
      type: options.type,
      critical: options.critical 
    });
  }

  /**
   * Remove a health check
   */
  removeCheck(name) {
    if (this.checks.has(name)) {
      this.checks.delete(name);
      structuredLogger.info(`Health check '${name}' removed`);
    }
  }

  /**
   * Enable/disable a health check
   */
  setCheckEnabled(name, enabled) {
    const check = this.checks.get(name);
    if (check) {
      check.enabled = enabled;
      structuredLogger.info(`Health check '${name}' ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = [];
    const enabledChecks = Array.from(this.checks.values()).filter(c => c.enabled);
    
    const checkPromises = enabledChecks.map(async (check) => {
      try {
        return await check.execute();
      } catch (error) {
        structuredLogger.error(`Health check '${check.name}' failed`, {
          error: error.message,
          checkType: check.type
        });
        
        return {
          name: check.name,
          type: check.type,
          status: check.critical ? HEALTH_STATUS.CRITICAL : HEALTH_STATUS.UNHEALTHY,
          error: error.message,
          critical: check.critical,
          timestamp: new Date().toISOString()
        };
      }
    });

    const checkResults = await Promise.all(checkPromises);
    results.push(...checkResults);

    return results;
  }

  /**
   * Run a specific health check
   */
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }

    if (!check.enabled) {
      throw new Error(`Health check '${name}' is disabled`);
    }

    return await check.execute();
  }

  /**
   * Get overall system health status
   */
  async getHealthStatus() {
    const startTime = Date.now();
    const results = await this.runAllChecks();
    const duration = Date.now() - startTime;

    // Determine overall status
    let overallStatus = HEALTH_STATUS.HEALTHY;
    const criticalFailures = results.filter(r => r.critical && r.status !== HEALTH_STATUS.HEALTHY);
    const failures = results.filter(r => r.status === HEALTH_STATUS.UNHEALTHY || r.status === HEALTH_STATUS.CRITICAL);

    if (criticalFailures.length > 0) {
      overallStatus = HEALTH_STATUS.CRITICAL;
    } else if (failures.length > 0) {
      overallStatus = HEALTH_STATUS.UNHEALTHY;
    } else if (results.some(r => r.status === HEALTH_STATUS.DEGRADED)) {
      overallStatus = HEALTH_STATUS.DEGRADED;
    }

    // Calculate statistics
    const stats = {
      total: results.length,
      healthy: results.filter(r => r.status === HEALTH_STATUS.HEALTHY).length,
      degraded: results.filter(r => r.status === HEALTH_STATUS.DEGRADED).length,
      unhealthy: results.filter(r => r.status === HEALTH_STATUS.UNHEALTHY).length,
      critical: results.filter(r => r.status === HEALTH_STATUS.CRITICAL).length
    };

    const healthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration,
      version: '1.0.0',
      service: 'gauge-tracking-api',
      environment: process.env.NODE_ENV || 'development',
      stats,
      checks: results,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: os.loadavg(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    // Log health status
    if (overallStatus === HEALTH_STATUS.CRITICAL) {
      structuredLogger.security('Critical health status detected', {
        status: overallStatus,
        criticalFailures: criticalFailures.length,
        failures: failures.length
      });
    } else if (overallStatus !== HEALTH_STATUS.HEALTHY) {
      structuredLogger.warn('System health degraded', {
        status: overallStatus,
        failures: failures.length
      });
    }

    return healthResponse;
  }

  /**
   * Get detailed health report
   */
  async getDetailedReport() {
    const healthStatus = await this.getHealthStatus();
    const checkStats = Array.from(this.checks.values()).map(check => check.getStats());
    
    return {
      ...healthStatus,
      checkStatistics: checkStats,
      monitoring: {
        enabled: this.monitoring,
        interval: this.monitoringInterval ? 30000 : null
      },
      alertThresholds: this.alertThresholds
    };
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMs = 30000) {
    if (this.monitoring) {
      structuredLogger.warn('Health monitoring already running');
      return;
    }

    this.monitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        const healthStatus = await this.getHealthStatus();
        
        // Log periodic health status
        structuredLogger.performance('Periodic health check', {
          status: healthStatus.status,
          duration: healthStatus.duration,
          healthyChecks: healthStatus.stats.healthy,
          totalChecks: healthStatus.stats.total
        });

        // Emit health events for monitoring
        if (healthStatus.status === HEALTH_STATUS.CRITICAL) {
          eventBus.emitEvent('system.health_critical', {
            status: healthStatus.status,
            criticalChecks: healthStatus.checks.filter(c => c.critical && c.status !== HEALTH_STATUS.HEALTHY),
            timestamp: healthStatus.timestamp
          });
        }

      } catch (error) {
        structuredLogger.error('Health monitoring error', {
          error: error.message
        });
      }
    }, intervalMs);

    structuredLogger.info('Health monitoring started', { interval: intervalMs });
  }

  /**
   * Stop continuous health monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.monitoring = false;
    structuredLogger.info('Health monitoring stopped');
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    return {
      monitoring: this.monitoring,
      totalChecks: this.checks.size,
      enabledChecks: Array.from(this.checks.values()).filter(c => c.enabled).length,
      criticalChecks: Array.from(this.checks.values()).filter(c => c.critical).length,
      alertThresholds: this.alertThresholds
    };
  }
}

// Create singleton instance
const healthMonitor = new HealthMonitor();

module.exports = {
  healthMonitor,
  HealthMonitor,
  HealthCheck,
  HEALTH_STATUS,
  CHECK_TYPES
};