const os = require('os');
const logger = require('./logger');
const { getPoolStats } = require('../database/connection');
const { factory: circuitBreakerFactory } = require('./circuitBreaker');
const { getPerformanceMetrics: getDegradationMetrics } = require('./gracefulDegradation');

// Performance metrics storage
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: [],
      responseTimes: [],
      errorRates: [],
      throughput: [],
      systemResources: [],
      connectionPoolStats: [],
      circuitBreakerStats: []
    };
    
    this.baselines = {
      responseTime: null,
      errorRate: null,
      throughput: null
    };
    
    this.alerts = [];
    this.monitoring = false;
    this.monitoringInterval = null;
    
    // Auto-scaling configuration
    this.autoScalingConfig = {
      enabled: true,
      minConnections: 10,
      maxConnections: 100,
      scaleUpThreshold: 80, // % utilization
      scaleDownThreshold: 20, // % utilization
      cooldownPeriod: 300000 // 5 minutes
    };
    
    this.lastScaleAction = 0;
  }

  // Start monitoring
  start(intervalMs = 10000) {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collect();
      this.analyze();
      this.checkAlerts();
    }, intervalMs);
    
    logger.info('Performance monitoring started', { interval: intervalMs });
  }

  // Stop monitoring
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.monitoring = false;
    logger.info('Performance monitoring stopped');
  }

  // Record request metrics
  recordRequest(method, path, statusCode, responseTime) {
    const timestamp = Date.now();
    
    this.metrics.requests.push({
      timestamp,
      method,
      path,
      statusCode,
      responseTime,
      success: statusCode < 400
    });
    
    // Keep only last hour of data
    const oneHourAgo = timestamp - 3600000;
    this.metrics.requests = this.metrics.requests.filter(r => r.timestamp > oneHourAgo);
    
    // Update response times
    this.metrics.responseTimes.push({ timestamp, value: responseTime });
    this.metrics.responseTimes = this.metrics.responseTimes.filter(r => r.timestamp > oneHourAgo);
  }

  // Collect system metrics
  collect() {
    const timestamp = Date.now();
    
    // System resources
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    this.metrics.systemResources.push({
      timestamp,
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percent: os.loadavg()[0] / os.cpus().length * 100
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        percent: (memUsage.heapUsed / memUsage.heapTotal) * 100
      }
    });
    
    // Connection pool stats
    try {
      const poolStats = getPoolStats();
      this.metrics.connectionPoolStats.push({
        timestamp,
        ...poolStats,
        utilizationPercent: (poolStats.activeConnections / poolStats.connectionLimit) * 100
      });
      
      // Auto-scaling logic
      this.checkAutoScaling(poolStats);
    } catch (error) {
      logger.error('Failed to collect pool stats', { error: error.message });
    }
    
    // Circuit breaker stats
    const circuitBreakerStats = circuitBreakerFactory.getStatus();
    this.metrics.circuitBreakerStats.push({
      timestamp,
      breakers: circuitBreakerStats
    });
    
    // Calculate current metrics
    this.calculateCurrentMetrics();
    
    // Trim old data (keep last hour)
    const oneHourAgo = timestamp - 3600000;
    Object.keys(this.metrics).forEach(key => {
      if (Array.isArray(this.metrics[key])) {
        this.metrics[key] = this.metrics[key].filter(m => m.timestamp > oneHourAgo);
      }
    });
  }

  // Calculate current performance metrics
  calculateCurrentMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Response time (last minute)
    const recentResponseTimes = this.metrics.responseTimes
      .filter(r => r.timestamp > oneMinuteAgo)
      .map(r => r.value);
    
    const avgResponseTime = recentResponseTimes.length > 0
      ? recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length
      : 0;
    
    const p95ResponseTime = this.calculatePercentile(recentResponseTimes, 95);
    const p99ResponseTime = this.calculatePercentile(recentResponseTimes, 99);
    
    // Error rate (last minute)
    const recentRequests = this.metrics.requests.filter(r => r.timestamp > oneMinuteAgo);
    const errorRate = recentRequests.length > 0
      ? (recentRequests.filter(r => !r.success).length / recentRequests.length) * 100
      : 0;
    
    // Throughput (requests per second)
    const throughput = recentRequests.length / 60;
    
    // Store current metrics
    this.currentMetrics = {
      timestamp: now,
      responseTime: {
        avg: Math.round(avgResponseTime),
        p95: Math.round(p95ResponseTime),
        p99: Math.round(p99ResponseTime)
      },
      errorRate: Math.round(errorRate * 100) / 100,
      throughput: Math.round(throughput * 10) / 10,
      requests: {
        total: recentRequests.length,
        successful: recentRequests.filter(r => r.success).length,
        failed: recentRequests.filter(r => !r.success).length
      }
    };
    
    // Update metrics arrays
    this.metrics.errorRates.push({ timestamp: now, value: errorRate });
    this.metrics.throughput.push({ timestamp: now, value: throughput });
  }

  // Calculate percentile
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  // Analyze trends and detect anomalies
  analyze() {
    if (!this.currentMetrics) return;
    
    // Set baselines if not set
    if (!this.baselines.responseTime) {
      this.setBaselines();
    }
    
    const anomalies = [];
    
    // Check response time anomaly (>2x baseline)
    if (this.currentMetrics.responseTime.avg > this.baselines.responseTime * 2) {
      anomalies.push({
        type: 'response_time',
        severity: 'warning',
        message: `Response time ${this.currentMetrics.responseTime.avg}ms exceeds baseline ${this.baselines.responseTime}ms`,
        value: this.currentMetrics.responseTime.avg,
        baseline: this.baselines.responseTime
      });
    }
    
    // Check error rate anomaly (>5%)
    if (this.currentMetrics.errorRate > 5) {
      anomalies.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate ${this.currentMetrics.errorRate}% exceeds threshold`,
        value: this.currentMetrics.errorRate,
        threshold: 5
      });
    }
    
    // Check throughput drop (< 50% of baseline)
    if (this.baselines.throughput && this.currentMetrics.throughput < this.baselines.throughput * 0.5) {
      anomalies.push({
        type: 'throughput',
        severity: 'warning',
        message: `Throughput ${this.currentMetrics.throughput} req/s below baseline`,
        value: this.currentMetrics.throughput,
        baseline: this.baselines.throughput
      });
    }
    
    // Store anomalies
    if (anomalies.length > 0) {
      this.alerts.push({
        timestamp: Date.now(),
        anomalies
      });
      
      // Log critical anomalies
      anomalies.filter(a => a.severity === 'critical').forEach(anomaly => {
        logger.error('Performance anomaly detected', anomaly);
      });
    }
  }

  // Set performance baselines
  setBaselines() {
    const fiveMinutesAgo = Date.now() - 300000;
    
    // Response time baseline (median of last 5 minutes)
    const recentResponseTimes = this.metrics.responseTimes
      .filter(r => r.timestamp > fiveMinutesAgo)
      .map(r => r.value);
    
    if (recentResponseTimes.length > 0) {
      this.baselines.responseTime = this.calculatePercentile(recentResponseTimes, 50);
    } else {
      this.baselines.responseTime = 100; // Default 100ms
    }
    
    // Error rate baseline (should be near 0)
    this.baselines.errorRate = 0.1; // 0.1% baseline
    
    // Throughput baseline (average of last 5 minutes)
    const recentThroughput = this.metrics.throughput
      .filter(t => t.timestamp > fiveMinutesAgo)
      .map(t => t.value);
    
    if (recentThroughput.length > 0) {
      this.baselines.throughput = recentThroughput.reduce((a, b) => a + b, 0) / recentThroughput.length;
    } else {
      this.baselines.throughput = 10; // Default 10 req/s
    }
    
    logger.info('Performance baselines set', this.baselines);
  }

  // Check and trigger alerts
  checkAlerts() {
    const recentAlerts = this.alerts.filter(a => a.timestamp > Date.now() - 60000);
    
    // Group alerts by type
    const alertCounts = {};
    recentAlerts.forEach(alert => {
      alert.anomalies.forEach(anomaly => {
        alertCounts[anomaly.type] = (alertCounts[anomaly.type] || 0) + 1;
      });
    });
    
    // Trigger actions based on alert frequency
    Object.entries(alertCounts).forEach(([type, count]) => {
      if (count >= 3) { // 3 alerts in last minute
        this.triggerAlert(type, count);
      }
    });
  }

  // Trigger specific alert actions
  triggerAlert(type, count) {
    logger.error('Performance alert triggered', {
      type,
      count,
      message: `${type} anomaly detected ${count} times in last minute`
    });
    
    // Add alert-specific actions here
    // For example, notify ops team, scale resources, etc.
  }

  // Auto-scaling logic
  checkAutoScaling(poolStats) {
    if (!this.autoScalingConfig.enabled) return;
    
    const now = Date.now();
    const timeSinceLastScale = now - this.lastScaleAction;
    
    // Check cooldown period
    if (timeSinceLastScale < this.autoScalingConfig.cooldownPeriod) return;
    
    const utilizationPercent = (poolStats.activeConnections / poolStats.connectionLimit) * 100;
    
    // Scale up
    if (utilizationPercent > this.autoScalingConfig.scaleUpThreshold) {
      const newLimit = Math.min(
        poolStats.connectionLimit + 10,
        this.autoScalingConfig.maxConnections
      );
      
      if (newLimit > poolStats.connectionLimit) {
        logger.info('Auto-scaling UP connection pool', {
          currentLimit: poolStats.connectionLimit,
          newLimit,
          utilization: utilizationPercent
        });
        
        this.lastScaleAction = now;
        // Note: Actual scaling would be implemented in the database module
      }
    }
    
    // Scale down
    else if (utilizationPercent < this.autoScalingConfig.scaleDownThreshold) {
      const newLimit = Math.max(
        poolStats.connectionLimit - 10,
        this.autoScalingConfig.minConnections
      );
      
      if (newLimit < poolStats.connectionLimit) {
        logger.info('Auto-scaling DOWN connection pool', {
          currentLimit: poolStats.connectionLimit,
          newLimit,
          utilization: utilizationPercent
        });
        
        this.lastScaleAction = now;
        // Note: Actual scaling would be implemented in the database module
      }
    }
  }

  // Get performance dashboard data
  getDashboard() {
    const degradationMetrics = getDegradationMetrics();
    
    return {
      current: this.currentMetrics || {},
      baselines: this.baselines,
      systemResources: this.metrics.systemResources.slice(-10), // Last 10 readings
      connectionPool: this.metrics.connectionPoolStats.slice(-10),
      circuitBreakers: this.metrics.circuitBreakerStats.slice(-1)[0] || {},
      degradation: degradationMetrics,
      alerts: this.alerts.filter(a => a.timestamp > Date.now() - 300000), // Last 5 minutes
      trends: {
        responseTime: this.calculateTrend(this.metrics.responseTimes),
        errorRate: this.calculateTrend(this.metrics.errorRates),
        throughput: this.calculateTrend(this.metrics.throughput)
      }
    };
  }

  // Calculate trend (increasing, decreasing, stable)
  calculateTrend(metrics) {
    if (metrics.length < 10) return 'insufficient_data';
    
    const recent = metrics.slice(-10);
    const firstHalf = recent.slice(0, 5).map(m => m.value);
    const secondHalf = recent.slice(5).map(m => m.value);
    
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const changePercent = ((avgSecond - avgFirst) / avgFirst) * 100;
    
    if (changePercent > 10) return 'increasing';
    if (changePercent < -10) return 'decreasing';
    return 'stable';
  }

  // Export metrics for external monitoring
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      current: this.currentMetrics,
      baselines: this.baselines,
      alerts: this.alerts.length,
      systemHealth: {
        cpu: os.loadavg()[0],
        memoryUsagePercent: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        uptime: process.uptime()
      }
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Middleware for recording request metrics
function performanceMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    performanceMonitor.recordRequest(
      req.method,
      req.path,
      res.statusCode,
      responseTime
    );
    
    // Add performance headers before ending (if not already sent)
    if (!res.headersSent) {
      res.set({
        'X-Response-Time': `${responseTime}ms`,
        'X-Request-ID': req.id || 'unknown'
      });
    }
    
    originalEnd.apply(res, args);
  };
  
  next();
}

module.exports = {
  performanceMonitor,
  performanceMiddleware
};