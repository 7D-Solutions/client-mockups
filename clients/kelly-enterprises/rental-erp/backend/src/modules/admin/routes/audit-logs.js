const express = require('express');
const { authenticateToken, requireAdmin } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const logger = require('../../../infrastructure/utils/logger');
const AdminRepository = require('../repositories/AdminRepository');

const router = express.Router();

/**
 * GET /api/admin/audit-logs
 * Retrieve audit logs with optional filters
 */
router.get('/', 
  authenticateToken, 
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const {
      userId,
      action,
      resource,
      gaugeId,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    logger.info('Fetching audit logs with filters', {
      userId, action, resource, gaugeId, startDate, endDate, limit, offset
    });

    try {
      // Build the query
      let query = `
        SELECT
          al.id,
          al.user_id,
          al.action,
          al.entity_type as resource,
          al.entity_id as resource_id,
          al.old_values,
          al.new_values,
          al.ip_address,
          al.user_agent,
          al.created_at as timestamp,
          u.name as username,
          u.email as user_email
        FROM core_audit_log al
        LEFT JOIN core_users u ON al.user_id = u.id
        WHERE 1=1
      `;

      const params = [];

      // Add filters
      if (userId) {
        query += ' AND al.user_id = ?';
        params.push(userId);
      }

      if (action) {
        query += ' AND al.action LIKE ?';
        params.push(`%${action}%`);
      }

      if (resource) {
        query += ' AND al.entity_type LIKE ?';
        params.push(`%${resource}%`);
      }

      if (gaugeId) {
        query += ' AND al.entity_type = ? AND al.entity_id = ?';
        params.push('gauge', parseInt(gaugeId));
      }

      if (startDate) {
        query += ' AND al.created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND al.created_at <= ?';
        params.push(endDate);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT[\s\S]+?FROM/,
        'SELECT COUNT(*) as total FROM'
      );
      const adminRepository = new AdminRepository();
      const conn = await adminRepository.getConnectionWithTimeout();
      try {
        const [[{ total }]] = await conn.query(countQuery, params);

      // Add ordering and pagination
      query += ' ORDER BY al.created_at DESC';
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      // Execute query
      const [logs] = await conn.query(query, params);

      // Parse JSON fields and combine old/new values into details
      const parsedLogs = logs.map(log => {
        // Helper to safely parse JSON or return the value if already an object
        const safeJsonParse = (value) => {
          if (!value) return null;
          if (typeof value === 'object') return value;
          try {
            return JSON.parse(value);
          } catch (e) {
            return value;
          }
        };

        return {
          id: log.id,
          userId: log.user_id,
          action: log.action,
          resource: log.resource,
          resourceId: log.resource_id,
          details: {
            oldValues: safeJsonParse(log.old_values),
            newValues: safeJsonParse(log.new_values)
          },
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          timestamp: log.timestamp,
          username: log.username,
          userEmail: log.user_email
        };
      });

      res.json({
        success: true,
        logs: parsedLogs,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      } finally {
        conn.release();
      }
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      throw error;
    }
  })
);

/**
 * GET /api/admin/audit-logs/:id
 * Get a specific audit log entry
 */
router.get('/:id',
  authenticateToken,
  requireAdmin,
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    
    const adminRepository = new AdminRepository();
    const conn = await adminRepository.getConnectionWithTimeout();
    try {
      const [logs] = await conn.query(`
        SELECT 
          al.*,
          u.name as user_name,
          u.email as user_email
        FROM core_audit_log al
        LEFT JOIN core_users u ON al.user_id = u.id
        WHERE al.id = ?
      `, [id]);

      if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Audit log entry not found'
      });
    }

    const log = logs[0];
    log.details = log.details ? JSON.parse(log.details) : null;

    res.json({
      success: true,
      data: log
    });
    } finally {
      conn.release();
    }
  })
);

module.exports = router;