/**
 * Reliability Budget Monitor
 * Implements SLO/SLI tracking for 99.9% uptime target
 * 
 * Key Metrics:
 * - Availability: successful requests / total requests
 * - Latency: requests under threshold / total requests  
 * - Error Budget: allowed downtime - actual downtime
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');
const { performanceMonitor } = require('../utils/performanceMonitor');

class ReliabilityBudgetMonitor extends EventEmitter {
  constructor() {
    super();
    
    // SLO Targets (99.9% uptime = 43.8 min/month downtime)
    this.sloTargets = {
      availability: 0.999,      // 99.9%
      latencyP95: 1000,        // 1 second
      latencyP99: 2000,        // 2 seconds
      errorRate: 0.001,        // 0.1%
    };
    
    // Budget configuration
    this.budgetConfig = {
      windowDuration: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
      alertThresholds: {
        warning: 0.5,    // Alert at 50% budget consumed
        critical: 0.8,   // Critical at 80% budget consumed
        emergency: 0.95  // Emergency at 95% budget consumed
      }
    };
    
    // Tracking data
    this.metrics = {
      requests: [],
      violations: [],
      budgetSnapshots: []
    };
    
    // Current state
    this.currentPeriodStart = Date.now();
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Start monitoring reliability budget
   */
  start(intervalMs = 60000) { // Check every minute
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.currentPeriodStart = Date.now();
    
    // Initial calculation
    this.calculateCurrentBudget();
    
    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.calculateCurrentBudget();
      this.checkThresholds();
      this.cleanupOldData();
    }, intervalMs);
    
    logger.info('Reliability budget monitoring started', {
      sloTargets: this.sloTargets,
      monitoringInterval: intervalMs
    });
    
    this.emit('started', { timestamp: Date.now() });
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    logger.info('Reliability budget monitoring stopped');
    this.emit('stopped', { timestamp: Date.now() });
  }

  /**
   * Record a request and check against SLOs
   */
  recordRequest(request) {
    const timestamp = Date.now();
    
    // Determine if request meets SLOs
    const sloMet = {
      availability: request.success,
      latency: request.responseTime < this.sloTargets.latencyP95,
      errorBudget: !request.error
    };
    
    // Record the request
    const record = {
      timestamp,
      success: request.success,
      responseTime: request.responseTime,
      statusCode: request.statusCode,
      sloMet,
      violations: []
    };
    
    // Check for SLO violations
    if (!sloMet.availability) {
      record.violations.push('availability');
    }
    if (!sloMet.latency) {
      record.violations.push('latency');
    }
    if (request.statusCode >= 500) {
      record.violations.push('error');
    }
    
    this.metrics.requests.push(record);
    
    // Track violations separately for faster queries
    if (record.violations.length > 0) {
      this.metrics.violations.push({
        timestamp,
        violations: record.violations,
        impact: this.calculateViolationImpact(record)
      });
    }
    
    return record;
  }

  /**
   * Calculate current error budget status
   */
  calculateCurrentBudget() {
    const now = Date.now();
    const windowStart = now - this.budgetConfig.windowDuration;
    
    // Get requests within the window
    const windowRequests = this.metrics.requests.filter(
      r => r.timestamp >= windowStart
    );
    
    if (windowRequests.length === 0) {
      return {
        totalRequests: 0,
        budgetRemaining: 1.0,
        budgetConsumed: 0,
        sliMetrics: {}
      };
    }
    
    // Calculate SLIs
    const totalRequests = windowRequests.length;
    const successfulRequests = windowRequests.filter(r => r.success).length;
    const fastRequests = windowRequests.filter(
      r => r.responseTime < this.sloTargets.latencyP95
    ).length;
    const errorRequests = windowRequests.filter(
      r => r.statusCode >= 500
    ).length;
    
    // Calculate availability SLI
    const availabilitySLI = successfulRequests / totalRequests;
    const latencySLI = fastRequests / totalRequests;
    const errorRateSLI = 1 - (errorRequests / totalRequests);
    
    // Calculate error budget consumption
    const allowedDowntime = (1 - this.sloTargets.availability) * this.budgetConfig.windowDuration;
    const actualDowntime = (1 - availabilitySLI) * this.budgetConfig.windowDuration;
    const budgetConsumed = actualDowntime / allowedDowntime;
    const budgetRemaining = Math.max(0, 1 - budgetConsumed);
    
    // Store snapshot
    const snapshot = {
      timestamp: now,
      windowStart,
      totalRequests,
      sliMetrics: {
        availability: availabilitySLI,
        latency: latencySLI,
        errorRate: errorRateSLI
      },
      budget: {
        allowed: allowedDowntime,
        consumed: actualDowntime,
        remaining: budgetRemaining,
        percentConsumed: budgetConsumed * 100
      },
      violations: this.metrics.violations.filter(
        v => v.timestamp >= windowStart
      ).length
    };
    
    this.metrics.budgetSnapshots.push(snapshot);
    
    // Emit current status
    this.emit('budget-calculated', snapshot);
    
    return snapshot;
  }

  /**
   * Check if we need to send alerts based on thresholds
   */
  checkThresholds() {
    const current = this.calculateCurrentBudget();
    const { budgetConsumed } = current.budget;
    const { alertThresholds } = this.budgetConfig;
    
    // Check each threshold
    if (budgetConsumed >= alertThresholds.emergency) {
      this.emitAlert('EMERGENCY', current);
    } else if (budgetConsumed >= alertThresholds.critical) {
      this.emitAlert('CRITICAL', current);
    } else if (budgetConsumed >= alertThresholds.warning) {
      this.emitAlert('WARNING', current);
    }
  }

  /**
   * Emit an alert event
   */
  emitAlert(severity, budgetStatus) {
    const alert = {
      severity,
      timestamp: Date.now(),
      budgetConsumed: budgetStatus.budget.percentConsumed,
      budgetRemaining: budgetStatus.budget.remaining,
      message: this.getAlertMessage(severity, budgetStatus),
      actions: this.getRecommendedActions(severity, budgetStatus)
    };
    
    logger.warn('Reliability budget alert triggered', alert);
    this.emit('budget-alert', alert);
    
    return alert;
  }

  /**
   * Generate alert message based on severity
   */
  getAlertMessage(severity, status) {
    const consumed = Math.round(status.budget.percentConsumed);
    
    switch (severity) {
      case 'EMERGENCY':
        return `EMERGENCY: ${consumed}% of error budget consumed. Immediate action required!`;
      case 'CRITICAL':
        return `CRITICAL: ${consumed}% of error budget consumed. System reliability at risk.`;
      case 'WARNING':
        return `WARNING: ${consumed}% of error budget consumed. Monitor closely.`;
      default:
        return `Error budget ${consumed}% consumed.`;
    }
  }

  /**
   * Get recommended actions based on severity
   */
  getRecommendedActions(severity, status) {
    const actions = [];
    
    if (severity === 'EMERGENCY') {
      actions.push('Freeze all deployments immediately');
      actions.push('Activate incident response team');
      actions.push('Review recent changes for rollback');
    } else if (severity === 'CRITICAL') {
      actions.push('Postpone non-critical deployments');
      actions.push('Increase monitoring frequency');
      actions.push('Prepare rollback procedures');
    } else if (severity === 'WARNING') {
      actions.push('Review deployment schedule');
      actions.push('Check system health metrics');
      actions.push('Identify potential issues');
    }
    
    // Add specific recommendations based on SLI violations
    if (status.sliMetrics.availability < this.sloTargets.availability) {
      actions.push('Focus on availability improvements');
    }
    if (status.sliMetrics.latency < 0.95) {
      actions.push('Investigate performance bottlenecks');
    }
    
    return actions;
  }

  /**
   * Calculate the impact of a violation on the error budget
   */
  calculateViolationImpact(record) {
    // Base impact on violation type
    let impact = 0;
    
    if (record.violations.includes('availability')) {
      impact += 1.0; // Full impact for availability failures
    }
    if (record.violations.includes('latency')) {
      impact += 0.5; // Half impact for latency violations
    }
    if (record.violations.includes('error')) {
      impact += 0.8; // High impact for 5xx errors
    }
    
    return impact;
  }

  /**
   * Get budget forecast based on current burn rate
   */
  getBudgetForecast() {
    const current = this.calculateCurrentBudget();
    const burnRate = current.budget.percentConsumed / 
      ((Date.now() - this.currentPeriodStart) / this.budgetConfig.windowDuration);
    
    // Forecast when budget will be exhausted at current rate
    let exhaustionTime = null;
    if (burnRate > 0) {
      const remainingBudget = 1 - current.budget.percentConsumed;
      const timeToExhaustion = (remainingBudget / burnRate) * this.budgetConfig.windowDuration;
      exhaustionTime = Date.now() + timeToExhaustion;
    }
    
    return {
      currentBurnRate: burnRate,
      projectedExhaustion: exhaustionTime,
      daysRemaining: exhaustionTime ? 
        Math.floor((exhaustionTime - Date.now()) / (24 * 60 * 60 * 1000)) : null,
      recommendation: this.getForecastRecommendation(burnRate)
    };
  }

  /**
   * Get recommendation based on burn rate
   */
  getForecastRecommendation(burnRate) {
    if (burnRate > 2.0) {
      return 'CRITICAL: Burning budget 2x faster than sustainable';
    } else if (burnRate > 1.5) {
      return 'WARNING: High burn rate detected';
    } else if (burnRate > 1.0) {
      return 'CAUTION: Slightly elevated burn rate';
    } else {
      return 'HEALTHY: Burn rate within normal bounds';
    }
  }

  /**
   * Clean up old data outside the monitoring window
   */
  cleanupOldData() {
    const cutoff = Date.now() - (this.budgetConfig.windowDuration * 2);
    
    this.metrics.requests = this.metrics.requests.filter(
      r => r.timestamp > cutoff
    );
    this.metrics.violations = this.metrics.violations.filter(
      v => v.timestamp > cutoff
    );
    
    // Keep only last 1000 snapshots
    if (this.metrics.budgetSnapshots.length > 1000) {
      this.metrics.budgetSnapshots = this.metrics.budgetSnapshots.slice(-1000);
    }
  }

  /**
   * Get current status for dashboards
   */
  getStatus() {
    const current = this.calculateCurrentBudget();
    const forecast = this.getBudgetForecast();
    
    return {
      isMonitoring: this.isMonitoring,
      currentPeriod: {
        start: this.currentPeriodStart,
        end: this.currentPeriodStart + this.budgetConfig.windowDuration
      },
      sloTargets: this.sloTargets,
      currentBudget: current.budget,
      sliMetrics: current.sliMetrics,
      forecast,
      recentViolations: this.metrics.violations.slice(-10),
      totalRequests: current.totalRequests
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics() {
    const status = this.getStatus();
    const lines = [];
    
    // SLI metrics
    lines.push('# HELP sli_availability Service Level Indicator for availability');
    lines.push('# TYPE sli_availability gauge');
    lines.push(`sli_availability ${status.sliMetrics.availability || 0}`);
    
    lines.push('# HELP sli_latency Service Level Indicator for latency');
    lines.push('# TYPE sli_latency gauge');
    lines.push(`sli_latency ${status.sliMetrics.latency || 0}`);
    
    // Error budget metrics
    lines.push('# HELP error_budget_remaining Percentage of error budget remaining');
    lines.push('# TYPE error_budget_remaining gauge');
    lines.push(`error_budget_remaining ${status.currentBudget.remaining * 100}`);
    
    lines.push('# HELP error_budget_burn_rate Current burn rate of error budget');
    lines.push('# TYPE error_budget_burn_rate gauge');
    lines.push(`error_budget_burn_rate ${status.forecast.currentBurnRate || 0}`);
    
    return lines.join('\\n');
  }
}

// Create singleton instance
const reliabilityBudgetMonitor = new ReliabilityBudgetMonitor();

module.exports = { reliabilityBudgetMonitor, ReliabilityBudgetMonitor };