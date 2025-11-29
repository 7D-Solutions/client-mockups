const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class UnsealRequestsRepository extends BaseRepository {
  constructor() {
    super('gauge_unseal_requests', 'id');
  }
  async create(requestData) {
    try {
      const { gauge_id, requested_by_user_id, reason } = requestData;
      
      const result = await this.executeQuery(
        `INSERT INTO gauge_unseal_requests (gauge_id, requested_by, reason, status, requested_at)
         VALUES (?, ?, ?, 'pending', NOW())`,
        [gauge_id, requested_by_user_id, reason]
      );
      
      return result.insertId;
    } catch (error) {
      logger.error(`Failed to create unseal request for gauge_id ${requestData.gauge_id}:`, error);
      throw error;
    }
  }

  async findById(requestId) {
    try {
      const rows = await this.executeQuery(
        `SELECT
          ur.id, ur.gauge_id, ur.requested_by, ur.reason,
          ur.status, ur.requested_at, ur.status_changed_at as reviewed_at, ur.status_changed_by as reviewed_by_user_id,
          u.name as requester_name, u.email as requester_email,
          ru.name as reviewer_name, ru.email as reviewer_email,
          g.gauge_id as gauge_tag, g.name as gauge_name, g.equipment_type, g.set_id
         FROM gauge_unseal_requests ur
         JOIN core_users u ON ur.requested_by = u.id
         LEFT JOIN core_users ru ON ur.status_changed_by = ru.id
         JOIN gauges g ON ur.gauge_id = g.id
         WHERE ur.id = ?`,
        [requestId]
      );
      
      return rows[0] || null;
    } catch (error) {
      logger.error(`Failed to find unseal request by id ${requestId}:`, error);
      throw error;
    }
  }

  async findPending(filters = {}) {
    try {
      let whereClause = "1=1";
      let params = [];

      if (filters.status) {
        whereClause += ' AND ur.status = ?';
        params.push(filters.status);
      }

      if (filters.requested_by_user_id) {
        whereClause += ' AND ur.requested_by = ?';
        params.push(filters.requested_by_user_id);
      }

      const rows = await this.executeQuery(
        `SELECT 
          ur.id, ur.gauge_id, ur.requested_by, ur.reason,
          ur.status, ur.requested_at, ur.status_changed_at, ur.status_changed_by,
          u.name as requester_name, u.email as requester_email,
          ru.name as status_changed_by_name,
          g.gauge_id as gauge_tag, g.name as gauge_name, g.equipment_type, g.is_sealed, g.set_id
         FROM gauge_unseal_requests ur
         JOIN core_users u ON ur.requested_by = u.id
         LEFT JOIN core_users ru ON ur.status_changed_by = ru.id
         JOIN gauges g ON ur.gauge_id = g.id
         WHERE ${whereClause}
         ORDER BY ur.requested_at DESC`,
        params
      );

      return rows;
    } catch (error) {
      logger.error('Failed to find pending unseal requests with filters:', { filters, error });
      throw error;
    }
  }

  async updateStatus(requestId, status, userId) {
    try {
      const result = await this.executeQuery(
        `UPDATE gauge_unseal_requests 
         SET status = ?, status_changed_at = NOW(), status_changed_by = ?
         WHERE id = ?`,
        [status, userId, requestId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Failed to update unseal request status for requestId ${requestId} to ${status}:`, error);
      throw error;
    }
  }

  async findByGaugeId(gaugeId) {
    try {
      const rows = await this.executeQuery(
        `SELECT 
          ur.id, ur.gauge_id, ur.requested_by, ur.reason,
          ur.status, ur.requested_at, ur.status_changed_at as reviewed_at,
          u.name as requester_name,
          ru.name as reviewer_name
         FROM gauge_unseal_requests ur
         JOIN core_users u ON ur.requested_by = u.id
         LEFT JOIN core_users ru ON ur.status_changed_by = ru.id
         WHERE ur.gauge_id = ?
         ORDER BY ur.requested_at DESC`,
        [gaugeId]
      );

      return rows;
    } catch (error) {
      logger.error(`Failed to find unseal requests by gauge_id ${gaugeId}:`, error);
      throw error;
    }
  }

  async findAll(filters = {}) {
    try {
      let whereClause = "1=1";
      let params = [];

      if (filters.status) {
        whereClause += ' AND ur.status = ?';
        params.push(filters.status);
      }

      if (filters.requested_by_user_id) {
        whereClause += ' AND ur.requested_by = ?';
        params.push(filters.requested_by_user_id);
      }

      if (filters.gauge_id) {
        whereClause += ' AND ur.gauge_id = ?';
        params.push(filters.gauge_id);
      }

      const rows = await this.executeQuery(
        `SELECT 
          ur.id, ur.gauge_id, ur.requested_by, ur.reason,
          ur.status, ur.requested_at, ur.status_changed_at, ur.status_changed_by,
          u.name as requester_name, u.email as requester_email,
          ru.name as status_changed_by_name,
          g.gauge_id as gauge_tag, g.name as gauge_name, g.equipment_type, g.is_sealed, g.set_id
         FROM gauge_unseal_requests ur
         JOIN core_users u ON ur.requested_by = u.id
         LEFT JOIN core_users ru ON ur.status_changed_by = ru.id
         JOIN gauges g ON ur.gauge_id = g.id
         WHERE ${whereClause}
         ORDER BY ur.requested_at DESC`,
        params
      );

      return rows;
    } catch (error) {
      logger.error('Failed to find all unseal requests with filters:', { filters, error });
      throw error;
    }
  }

  async delete(requestId) {
    try {
      const result = await this.executeQuery(
        'DELETE FROM gauge_unseal_requests WHERE id = ?',
        [requestId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Failed to delete unseal request with id ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Update gauge calibration schedule after unseal confirmation
   */
  async updateCalibrationSchedule(gaugeId, newDueDate, calibrationFrequencyDays, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      // Update existing schedule
      const updateResult = await this.executeQuery(
        `UPDATE gauge_calibration_schedule 
         SET next_due_date = ? 
         WHERE gauge_id = ? AND is_active = 1`,
        [newDueDate, gaugeId],
        connection
      );
      
      // Check if we need to create a new schedule
      const [countResult] = await this.executeQuery(
        `SELECT COUNT(*) as count FROM gauge_calibration_schedule 
         WHERE gauge_id = ? AND is_active = 1`,
        [gaugeId],
        connection
      );
      
      if (countResult.count === 0) {
        // Create new calibration schedule
        await this.executeQuery(
          `INSERT INTO gauge_calibration_schedule 
           (gauge_id, next_due_date, frequency_days, is_active, auto_notify_days) 
           VALUES (?, ?, ?, 1, 30)`,
          [gaugeId, newDueDate, calibrationFrequencyDays],
          connection
        );
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to update calibration schedule for gauge ${gaugeId}:`, error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = UnsealRequestsRepository;