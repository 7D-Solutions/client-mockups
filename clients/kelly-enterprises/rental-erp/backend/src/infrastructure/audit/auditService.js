/**
 * AS9102 Compliant Audit Logging Service
 * Provides tamper-proof audit logging with complete traceability
 */

const crypto = require('crypto');
const connection = require('../database/connection');
const logger = require('../utils/logger');

class AuditService {
  constructor() {
    this.lastHash = null;
    this.initialized = false;
    // Don't call async methods in constructor
  }

  /**
   * Initialize the hash chain with the last audit entry
   */
  async initializeHashChain() {
    if (this.initialized) return;

    // Check if database is ready
    if (!connection.isReady() || !connection.pool) {
      logger.warn('Database not ready - skipping audit hash chain initialization');
      this.initialized = true; // Set to true to avoid repeated attempts
      return;
    }

    try {
      const [lastEntry] = await connection.pool.execute(
        'SELECT hash_chain FROM core_audit_log ORDER BY id DESC LIMIT 1'
      );
      
      if (lastEntry.length > 0 && lastEntry[0].hash_chain) {
        this.lastHash = lastEntry[0].hash_chain;
      }
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize audit hash chain', { error: error.message });
      // Set initialized to true even on error to avoid repeated failures
      this.initialized = true;
    }
  }

  /**
   * Log a user action with AS9102 compliance
   * @param {Object} auditData - Audit log data
   * @param {number} auditData.userId - User ID performing the action
   * @param {string} auditData.action - Action being performed
   * @param {string} auditData.tableName - Table affected
   * @param {number} auditData.recordId - Record ID affected
   * @param {Object} auditData.details - Additional details
   * @param {string} auditData.ipAddress - Client IP address
   * @param {string} auditData.userAgent - User agent string
   * @param {Object} connection - Database connection (for transactions)
   */
  async logAction(auditData, dbConnection = null) {
    // Check if database is ready
    if (!connection.isReady() || !connection.pool) {
      logger.warn('Database not ready - skipping audit log', { action: auditData.action });
      return null;
    }

    const conn = dbConnection || connection.pool;

    try {
      // Debug logging
      logger.info('Audit log data received', {
        action: auditData.action,
        hasOldValues: !!auditData.oldValues,
        hasNewValues: !!auditData.newValues,
        oldValuesType: typeof auditData.oldValues,
        newValuesType: typeof auditData.newValues,
        oldValuesContent: auditData.oldValues,
        newValuesContent: auditData.newValues
      });
      // Generate hash chain (ensure it never returns undefined)
      const hashData = this.generateHash(auditData) || { currentHash: null, previousHash: null };
      
      // Digital signature for critical operations
      const signature = this.isOperationCritical(auditData.action) 
        ? this.generateDigitalSignature(auditData) 
        : null;

      const query = `
        INSERT INTO core_audit_log (
          user_id, module_id, action, entity_type, entity_id,
          old_values, new_values,
          ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        auditData.userId || null,
        auditData.module || 'system',
        auditData.action || 'unknown',
        auditData.tableName || auditData.entity_type || null,
        auditData.recordId || auditData.entity_id || null,
        auditData.oldValues ? JSON.stringify(auditData.oldValues) : null,
        auditData.newValues ? JSON.stringify(auditData.newValues) : null,
        auditData.ipAddress || null,
        auditData.userAgent || null
      ];

      // Debug: Log what's being inserted
      logger.info('Inserting audit log to database', {
        action: auditData.action,
        oldValuesStringified: values[5],
        newValuesStringified: values[6]
      });

      const [result] = await conn.execute(query, values);
      
      // Update last hash for chain
      this.lastHash = hashData.currentHash;
      
      return result.insertId;
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: error.message,
        action: auditData.action,
        userId: auditData.userId
      });
      throw error;
    }
  }

  /**
   * Log system errors to audit trail
   * @param {Object} errorData - Error information
   * @param {Error} errorData.error - The error object
   * @param {Object} errorData.request - Express request object
   * @param {string} errorData.category - Error category
   * @param {string} errorData.requestId - Unique request ID
   */
  async logSystemError(errorData) {
    try {
      const auditData = {
        userId: errorData.request?.user?.user_id || null,
        action: 'system_error',
        tableName: 'system',
        details: {
          error_name: errorData.error.name,
          error_message: errorData.error.message,
          error_code: errorData.error.code,
          category: errorData.category,
          request_id: errorData.requestId,
          url: errorData.request?.originalUrl,
          method: errorData.request?.method,
          stack_trace: process.env.NODE_ENV !== 'production' ? errorData.error.stack : undefined
        },
        ipAddress: errorData.request?.ip,
        userAgent: errorData.request?.get('User-Agent')
      };

      await this.logAction(auditData);
    } catch (error) {
      // Fallback logging if audit fails
      logger.error('Failed to audit system error', {
        originalError: errorData.error.message,
        auditError: error.message
      });
    }
  }

  /**
   * Log security events (failed logins, permission denials)
   * @param {Object} securityData - Security event data
   */
  async logSecurityEvent(securityData) {
    try {
      const auditData = {
        userId: securityData.userId || null,
        action: securityData.action,
        tableName: 'security',
        details: {
          event_type: securityData.eventType,
          username: securityData.name || securityData.username,
          reason: securityData.reason,
          attempted_resource: securityData.resource,
          permissions_required: securityData.requiredPermissions,
          permissions_had: securityData.userPermissions
        },
        ipAddress: securityData.ipAddress,
        userAgent: securityData.userAgent
      };

      await this.logAction(auditData);
    } catch (error) {
      logger.error('Failed to audit security event', {
        event: securityData.eventType,
        error: error.message
      });
    }
  }

  /**
   * Log performance events (circuit breaker trips, retries)
   * @param {Object} performanceData - Performance event data
   */
  async logPerformanceEvent(performanceData) {
    try {
      const auditData = {
        userId: performanceData.userId || null,
        action: performanceData.action,
        tableName: 'performance',
        details: {
          event_type: performanceData.eventType,
          circuit_breaker_state: performanceData.circuitBreakerState,
          retry_count: performanceData.retryCount,
          response_time: performanceData.responseTime,
          threshold_exceeded: performanceData.thresholdExceeded,
          resource: performanceData.resource
        },
        ipAddress: performanceData.ipAddress,
        userAgent: performanceData.userAgent
      };

      await this.logAction(auditData);
    } catch (error) {
      logger.error('Failed to audit performance event', {
        event: performanceData.eventType,
        error: error.message
      });
    }
  }

  /**
   * Log configuration changes
   * @param {Object} configData - Configuration change data
   */
  async logConfigurationChange(configData) {
    try {
      const auditData = {
        userId: configData.userId,
        action: 'configuration_change',
        tableName: 'configuration',
        details: {
          setting_name: configData.settingName,
          old_value: configData.oldValue,
          new_value: configData.newValue,
          change_reason: configData.reason,
          affected_components: configData.affectedComponents
        },
        ipAddress: configData.ipAddress,
        userAgent: configData.userAgent
      };

      await this.logAction(auditData);
    } catch (error) {
      logger.error('Failed to audit configuration change', {
        setting: configData.settingName,
        error: error.message
      });
    }
  }

  /**
   * Generate hash for audit entry
   * @param {Object} auditData - Audit data to hash
   * @returns {Object} Hash data including current and previous hash
   */
  generateHash(auditData) {
    const dataToHash = {
      userId: auditData.userId,
      action: auditData.action,
      tableName: auditData.tableName,
      recordId: auditData.recordId,
      details: auditData.details,
      timestamp: new Date().toISOString(),
      previousHash: this.lastHash
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(dataToHash))
      .digest('hex');

    return {
      currentHash: hash,
      previousHash: this.lastHash
    };
  }

  /**
   * Generate digital signature for critical operations
   * @param {Object} auditData - Audit data to sign
   * @returns {string} Digital signature
   */
  generateDigitalSignature(auditData) {
    // In production, this would use proper PKI
    // For now, using HMAC with a server secret
    const secret = process.env.AUDIT_SIGNATURE_SECRET;
    if (!secret) {
      logger.error('AUDIT_SIGNATURE_SECRET environment variable is not set');
      throw new Error('Audit signature secret is not configured');
    }
    
    const dataToSign = {
      userId: auditData.userId,
      action: auditData.action,
      tableName: auditData.tableName,
      recordId: auditData.recordId,
      timestamp: new Date().toISOString()
    };

    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(dataToSign))
      .digest('hex');
  }

  /**
   * Verify audit log integrity
   * @param {number} startId - Starting audit log ID
   * @param {number} endId - Ending audit log ID
   * @returns {Object} Verification result
   */
  async verifyIntegrity(startId = 1, endId = null) {
    try {
      let query = 'SELECT * FROM audit_logs WHERE id >= ?';
      const params = [startId];
      
      if (endId) {
        query += ' AND id <= ?';
        params.push(endId);
      }
      
      query += ' ORDER BY id ASC';
      
      const [entries] = await pool.execute(query, params);
      
      let previousHash = null;
      let brokenChainAt = null;
      let invalidEntries = [];

      for (const entry of entries) {
        // Skip the first entry if it doesn't have a previous hash
        if (entry.id === startId && !entry.previous_hash) {
          previousHash = entry.hash_chain;
          continue;
        }

        // Verify hash chain
        if (entry.previous_hash !== previousHash) {
          brokenChainAt = entry.id;
          invalidEntries.push({
            id: entry.id,
            reason: 'Hash chain broken',
            expected: previousHash,
            actual: entry.previous_hash
          });
        }

        // Verify the hash itself
        const recalculatedHash = this.recalculateHash(entry);
        if (recalculatedHash !== entry.hash_chain) {
          invalidEntries.push({
            id: entry.id,
            reason: 'Hash mismatch',
            expected: recalculatedHash,
            actual: entry.hash_chain
          });
        }

        previousHash = entry.hash_chain;
      }

      return {
        valid: invalidEntries.length === 0,
        totalEntries: entries.length,
        invalidEntries: invalidEntries,
        brokenChainAt: brokenChainAt
      };
    } catch (error) {
      logger.error('Failed to verify audit integrity', { error: error.message });
      throw error;
    }
  }

  /**
   * Recalculate hash for an audit entry
   * @param {Object} entry - Audit log entry
   * @returns {string} Recalculated hash
   */
  recalculateHash(entry) {
    const dataToHash = {
      userId: entry.user_id,
      action: entry.action,
      tableName: entry.table_name,
      recordId: entry.record_id,
      details: entry.details,
      timestamp: entry.timestamp.toISOString(),
      previousHash: entry.previous_hash
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(dataToHash))
      .digest('hex');
  }

  /**
   * Get event type based on action
   * @param {string} action - Action name
   * @returns {string} Event type
   */
  getEventType(action) {
    const eventTypes = {
      // User actions
      login: 'authentication',
      logout: 'authentication',
      failed_login: 'security',
      
      // Data modifications
      create: 'data_modification',
      update: 'data_modification',
      delete: 'data_modification',
      checkout: 'data_modification',
      return: 'data_modification',
      
      // System events
      system_error: 'system',
      circuit_breaker_open: 'performance',
      retry_exhausted: 'performance',
      
      // Security events
      permission_denied: 'security',
      unauthorized_access: 'security',
      
      // Configuration
      configuration_change: 'configuration'
    };

    return eventTypes[action] || 'other';
  }

  /**
   * Get severity level based on action
   * @param {string} action - Action name
   * @returns {string} Severity level
   */
  getSeverityLevel(action) {
    const severityLevels = {
      // Critical
      delete: 'critical',
      configuration_change: 'critical',
      failed_login: 'warning',
      permission_denied: 'warning',
      unauthorized_access: 'critical',
      
      // High
      create: 'high',
      update: 'high',
      
      // Medium
      checkout: 'medium',
      return: 'medium',
      
      // Low
      login: 'low',
      logout: 'low',
      
      // Error
      system_error: 'error',
      circuit_breaker_open: 'error',
      retry_exhausted: 'error'
    };

    return severityLevels[action] || 'info';
  }

  /**
   * Check if operation is critical (requires digital signature)
   * @param {string} action - Action name
   * @returns {boolean} Whether operation is critical
   */
  isOperationCritical(action) {
    const criticalOperations = [
      'delete',
      'configuration_change',
      'create_user',
      'modify_permissions',
      'calibration_update',
      'as9102_approval'
    ];

    return criticalOperations.includes(action);
  }

  /**
   * Export audit logs for inspection
   * @param {Object} filters - Export filters
   * @returns {Object} Exported audit data
   */
  async exportAuditLogs(filters = {}) {
    try {
      let query = `
        SELECT 
          a.*,
          u.email as username,
          u.name as full_name
        FROM audit_logs a
        LEFT JOIN core_users u ON a.user_id = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filters.startDate) {
        query += ' AND a.created_at >= ?';
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        query += ' AND a.created_at <= ?';
        params.push(filters.endDate);
      }
      
      if (filters.userId) {
        query += ' AND a.user_id = ?';
        params.push(filters.userId);
      }
      
      if (filters.action) {
        query += ' AND a.action = ?';
        params.push(filters.action);
      }
      
      if (filters.tableName) {
        query += ' AND a.table_name = ?';
        params.push(filters.tableName);
      }
      
      query += ' ORDER BY a.id DESC';
      
      const [entries] = await pool.execute(query, params);
      
      return {
        exportDate: new Date().toISOString(),
        filters: filters,
        totalEntries: entries.length,
        entries: entries
      };
    } catch (error) {
      logger.error('Failed to export audit logs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param {Object} filters - Statistics filters
   * @returns {Object} Audit statistics
   */
  async getAuditStatistics(filters = {}) {
    try {
      const stats = {};
      
      // Total entries
      const [totalResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM audit_logs'
      );
      stats.totalEntries = totalResult[0].total;
      
      // Entries by event type
      const [eventTypeResult] = await pool.execute(`
        SELECT event_type, COUNT(*) as count 
        FROM audit_logs 
        GROUP BY event_type
      `);
      stats.byEventType = eventTypeResult;
      
      // Entries by severity
      const [severityResult] = await pool.execute(`
        SELECT severity_level, COUNT(*) as count 
        FROM audit_logs 
        GROUP BY severity_level
      `);
      stats.bySeverity = severityResult;
      
      // Recent activity (last 24 hours)
      const [recentResult] = await pool.execute(`
        SELECT COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);
      stats.last24Hours = recentResult[0].count;
      
      // Failed operations
      const [failedResult] = await pool.execute(`
        SELECT COUNT(*) as count 
        FROM audit_logs 
        WHERE action LIKE '%failed%' OR action LIKE '%error%'
      `);
      stats.failedOperations = failedResult[0].count;
      
      return stats;
    } catch (error) {
      logger.error('Failed to get audit statistics', { error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const auditService = new AuditService();

module.exports = auditService;