/**
 * Security Audit Service
 * Comprehensive security event logging and monitoring
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../../../infrastructure/config/config');
const logger = require('../../../infrastructure/utils/logger');

/**
 * Security event types
 */
const SECURITY_EVENTS = {
  AUTHENTICATION: {
    LOGIN_SUCCESS: 'auth.login.success',
    LOGIN_FAILED: 'auth.login.failed',
    LOGOUT: 'auth.logout',
    TOKEN_EXPIRED: 'auth.token.expired',
    TOKEN_INVALID: 'auth.token.invalid',
    SESSION_CREATED: 'auth.session.created',
    SESSION_EXPIRED: 'auth.session.expired',
    SESSION_DESTROYED: 'auth.session.destroyed'
  },
  AUTHORIZATION: {
    ACCESS_DENIED: 'authz.access.denied',
    PERMISSION_ESCALATION: 'authz.permission.escalation',
    ROLE_VIOLATION: 'authz.role.violation'
  },
  SECURITY_VIOLATIONS: {
    RATE_LIMIT_EXCEEDED: 'security.rate_limit.exceeded',
    SUSPICIOUS_ACTIVITY: 'security.suspicious.activity',
    BRUTE_FORCE_ATTACK: 'security.brute_force.detected',
    SQL_INJECTION_ATTEMPT: 'security.sql_injection.attempt',
    XSS_ATTEMPT: 'security.xss.attempt',
    PATH_TRAVERSAL_ATTEMPT: 'security.path_traversal.attempt',
    CSRF_TOKEN_MISMATCH: 'security.csrf.mismatch'
  },
  DATA_ACCESS: {
    SENSITIVE_DATA_ACCESS: 'data.sensitive.access',
    BULK_DATA_EXPORT: 'data.bulk.export',
    UNAUTHORIZED_QUERY: 'data.unauthorized.query',
    DATA_MODIFICATION: 'data.modification',
    DATA_DELETION: 'data.deletion'
  },
  SYSTEM: {
    CONFIG_CHANGE: 'system.config.change',
    ADMIN_ACTION: 'system.admin.action',
    SERVICE_START: 'system.service.start',
    SERVICE_STOP: 'system.service.stop',
    ERROR_THRESHOLD_EXCEEDED: 'system.error.threshold'
  }
};

/**
 * Security risk levels
 */
const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Security audit log structure
 */
class SecurityEvent {
  constructor(eventType, riskLevel, details = {}) {
    this.timestamp = new Date().toISOString();
    this.eventType = eventType;
    this.riskLevel = riskLevel;
    this.details = details;
    this.id = `sec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  addContext(req) {
    this.details.request = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl || req.url,
      referer: req.get('Referer'),
      sessionId: req.user?.sessionId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role
    };
    return this;
  }

  addUser(user) {
    this.details.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id
    };
    return this;
  }

  addData(data) {
    this.details.data = data;
    return this;
  }

  addError(error) {
    this.details.error = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
    return this;
  }
}

class SecurityAuditService {
  constructor() {
    this.logFile = path.join(__dirname, '../../../logs/security-audit.log');
    this.alertThresholds = {
      [RISK_LEVELS.CRITICAL]: 1, // Alert immediately
      [RISK_LEVELS.HIGH]: 3,     // Alert after 3 events in 5 minutes
      [RISK_LEVELS.MEDIUM]: 10,  // Alert after 10 events in 15 minutes
      [RISK_LEVELS.LOW]: 50      // Alert after 50 events in 1 hour
    };
    this.recentEvents = new Map();
    this.initializeLogFile();
  }

  async initializeLogFile() {
    try {
      const logDir = path.dirname(this.logFile);
      await fs.mkdir(logDir, { recursive: true });
      
      // Create log file if it doesn't exist
      try {
        await fs.access(this.logFile);
      } catch {
        await fs.writeFile(this.logFile, '');
        logger.info('📋 Security audit log file created');
      }
    } catch (error) {
      logger.error('❌ Failed to initialize security audit log:', { error: error.message });
    }
  }

  /**
   * Log a security event
   */
  async logEvent(eventType, riskLevel, details = {}, req = null) {
    try {
      const event = new SecurityEvent(eventType, riskLevel, details);
      
      if (req) {
        event.addContext(req);
      }

      // Write to file
      await this.writeToLogFile(event);

      // Write to application logger
      const logLevel = this.getLogLevel(riskLevel);
      logger[logLevel]('Security Event', {
        eventId: event.id,
        eventType: event.eventType,
        riskLevel: event.riskLevel,
        details: event.details
      });

      // Check alert thresholds
      await this.checkAlertThresholds(event);

      // Store in recent events for analysis
      this.storeRecentEvent(event);

      return event.id;
    } catch (error) {
      logger.error('Failed to log security event', { 
        eventType, 
        riskLevel, 
        details, 
        error: error.message 
      });
      throw new Error(`Failed to log security event: ${error.message}`);
    }
  }

  async writeToLogFile(event) {
    try {
      const logEntry = JSON.stringify(event) + '\n';
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      logger.error('❌ Failed to write security event to log file:', { error: error.message });
    }
  }

  getLogLevel(riskLevel) {
    switch (riskLevel) {
      case RISK_LEVELS.CRITICAL: return 'error';
      case RISK_LEVELS.HIGH: return 'warn';
      case RISK_LEVELS.MEDIUM: return 'info';
      case RISK_LEVELS.LOW: return 'debug';
      default: return 'info';
    }
  }

  storeRecentEvent(event) {
    const key = `${event.eventType}_${event.riskLevel}`;
    if (!this.recentEvents.has(key)) {
      this.recentEvents.set(key, []);
    }
    
    const events = this.recentEvents.get(key);
    events.push({
      timestamp: Date.now(),
      event: event
    });

    // Clean old events (keep last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.recentEvents.set(key, events.filter(e => e.timestamp > oneHourAgo));
  }

  async checkAlertThresholds(event) {
    const threshold = this.alertThresholds[event.riskLevel];
    const key = `${event.eventType}_${event.riskLevel}`;
    const recentEvents = this.recentEvents.get(key) || [];

    if (recentEvents.length >= threshold) {
      await this.triggerSecurityAlert(event, recentEvents);
    }
  }

  async triggerSecurityAlert(event, recentEvents) {
    const alert = {
      alertId: `alert_${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: event.eventType,
      riskLevel: event.riskLevel,
      eventCount: recentEvents.length,
      timeWindow: '1 hour',
      firstEvent: recentEvents[0]?.event,
      latestEvent: event,
      recommended_actions: this.getRecommendedActions(event.eventType, event.riskLevel)
    };

    logger.error('🚨 SECURITY ALERT TRIGGERED', alert);

    // In production, send to security team, SIEM, etc.
    if (process.env.SECURITY_WEBHOOK_URL) {
      try {
        // Send webhook notification (implementation depends on your setup)
        logger.info('📢 Security alert would be sent to webhook:', { url: process.env.SECURITY_WEBHOOK_URL });
      } catch (error) {
        logger.error('❌ Failed to send security alert webhook:', { error: error.message });
      }
    }
  }

  getRecommendedActions(eventType, riskLevel) {
    const actions = [];

    if (riskLevel === RISK_LEVELS.CRITICAL) {
      actions.push('Immediate investigation required');
      actions.push('Consider blocking source IP');
      actions.push('Review user account for compromise');
    }

    if (eventType.includes('brute_force')) {
      actions.push('Implement IP-based rate limiting');
      actions.push('Force password reset for target accounts');
    }

    if (eventType.includes('injection')) {
      actions.push('Review input validation');
      actions.push('Check database logs for unauthorized queries');
    }

    return actions;
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const allEvents = Array.from(this.recentEvents.values()).flat();
    const hourEvents = allEvents.filter(e => e.timestamp > oneHourAgo);
    const dayEvents = allEvents.filter(e => e.timestamp > oneDayAgo);

    return {
      lastHour: {
        total: hourEvents.length,
        byRiskLevel: this.groupByRiskLevel(hourEvents),
        byEventType: this.groupByEventType(hourEvents)
      },
      lastDay: {
        total: dayEvents.length,
        byRiskLevel: this.groupByRiskLevel(dayEvents),
        byEventType: this.groupByEventType(dayEvents)
      },
      topRisks: this.getTopRisks(dayEvents)
    };
  }

  groupByRiskLevel(events) {
    return events.reduce((acc, e) => {
      const level = e.event.riskLevel;
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
  }

  groupByEventType(events) {
    return events.reduce((acc, e) => {
      const type = e.event.eventType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  getTopRisks(events) {
    const risks = {};
    events.forEach(e => {
      const key = `${e.event.eventType}_${e.event.riskLevel}`;
      risks[key] = (risks[key] || 0) + 1;
    });

    return Object.entries(risks)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({ event: key, count }));
  }

  // Convenience methods for common security events
  async logLoginSuccess(req, user) {
    return this.logEvent(
      SECURITY_EVENTS.AUTHENTICATION.LOGIN_SUCCESS,
      RISK_LEVELS.LOW,
      { user: { id: user.id, email: user.email, role: user.role } },
      req
    );
  }

  async logLoginFailed(req, email, reason) {
    return this.logEvent(
      SECURITY_EVENTS.AUTHENTICATION.LOGIN_FAILED,
      RISK_LEVELS.MEDIUM,
      { email, reason },
      req
    );
  }

  async logAccessDenied(req, resource, reason) {
    return this.logEvent(
      SECURITY_EVENTS.AUTHORIZATION.ACCESS_DENIED,
      RISK_LEVELS.MEDIUM,
      { resource, reason },
      req
    );
  }

  async logSuspiciousActivity(req, activity, details) {
    return this.logEvent(
      SECURITY_EVENTS.SECURITY_VIOLATIONS.SUSPICIOUS_ACTIVITY,
      RISK_LEVELS.HIGH,
      { activity, ...details },
      req
    );
  }

  async logRateLimitExceeded(req, endpoint, limit) {
    return this.logEvent(
      SECURITY_EVENTS.SECURITY_VIOLATIONS.RATE_LIMIT_EXCEEDED,
      RISK_LEVELS.MEDIUM,
      { endpoint, limit },
      req
    );
  }
}

// Create singleton instance
const securityAuditService = new SecurityAuditService();

module.exports = {
  securityAuditService,
  SECURITY_EVENTS,
  RISK_LEVELS,
  SecurityEvent
};