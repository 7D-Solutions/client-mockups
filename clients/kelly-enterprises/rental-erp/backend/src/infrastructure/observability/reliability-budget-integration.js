/**
 * Reliability Budget Monitor Integration
 * Example integration for app.js
 */

const { reliabilityBudgetMonitor } = require('./ReliabilityBudgetMonitor');
const { eventBus } = require('../events/EventBus');
const { notificationService } = require('../notifications/NotificationService');
const logger = require('../utils/logger');

/**
 * Initialize reliability budget monitoring
 */
function initializeReliabilityBudget() {
  // Configure alert handlers
  reliabilityBudgetMonitor.on('budget-alert', async (alert) => {
    logger.error('Reliability budget alert', alert);
    
    // Send notifications based on severity
    if (alert.severity === 'EMERGENCY') {
      await notificationService.sendEmergencyAlert({
        subject: 'EMERGENCY: Error Budget Critical',
        message: alert.message,
        actions: alert.actions,
        recipients: process.env.EMERGENCY_CONTACTS?.split(',') || []
      });
    } else if (alert.severity === 'CRITICAL') {
      await notificationService.sendCriticalAlert({
        subject: 'CRITICAL: Error Budget Warning',
        message: alert.message,
        actions: alert.actions
      });
    }
    
    // Emit system event for other components
    eventBus.emit('reliability-budget-alert', alert);
  });

  // Start monitoring
  reliabilityBudgetMonitor.start(60000); // Check every minute
  
  logger.info('Reliability budget monitoring initialized');
}

/**
 * Middleware to track requests for SLO monitoring
 */
function reliabilityTrackingMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Capture response details
  res.on('finish', () => {
    const request = {
      success: res.statusCode < 500,
      responseTime: Date.now() - startTime,
      statusCode: res.statusCode,
      error: res.statusCode >= 500,
      path: req.path,
      method: req.method
    };
    
    // Record request for budget tracking
    reliabilityBudgetMonitor.recordRequest(request);
  });
  
  next();
}

/**
 * Add to app.js after performance middleware:
 * 
 * // Reliability budget tracking
 * const { initializeReliabilityBudget, reliabilityTrackingMiddleware } = require('./infrastructure/observability/reliability-budget-integration');
 * 
 * // Initialize reliability monitoring
 * initializeReliabilityBudget();
 * 
 * // Apply tracking middleware
 * app.use(reliabilityTrackingMiddleware);
 */

/**
 * Enhanced metrics endpoint addition for app.js
 */
function addReliabilityMetrics(existingDashboard) {
  // Add reliability budget metrics to existing dashboard
  const reliabilityStatus = reliabilityBudgetMonitor.getStatus();
  
  return {
    ...existingDashboard,
    reliability: {
      sloTargets: reliabilityStatus.sloTargets,
      currentBudget: reliabilityStatus.currentBudget,
      sliMetrics: reliabilityStatus.sliMetrics,
      forecast: reliabilityStatus.forecast,
      isHealthy: reliabilityStatus.currentBudget.remaining > 0.2 // 20% buffer
    }
  };
}

/**
 * Prometheus metrics addition
 */
function addPrometheusReliabilityMetrics(existingMetrics) {
  const reliabilityMetrics = reliabilityBudgetMonitor.exportPrometheusMetrics();
  return existingMetrics + '\\n\\n' + reliabilityMetrics;
}

/**
 * Emergency response automation
 */
reliabilityBudgetMonitor.on('budget-calculated', (snapshot) => {
  // Auto-enable read-only mode if budget critically low
  if (snapshot.budget.remaining < 0.05) { // Less than 5% remaining
    const { enableReadOnlyMode } = require('../utils/gracefulDegradation');
    enableReadOnlyMode('Critical error budget - automatic protection enabled');
    
    logger.critical('Automatic read-only mode enabled due to critical error budget');
  }
});

module.exports = {
  initializeReliabilityBudget,
  reliabilityTrackingMiddleware,
  addReliabilityMetrics,
  addPrometheusReliabilityMetrics
};