const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class TransfersRepository extends BaseRepository {
  constructor() {
    super('gauge_transfers', 'id');
  }
  async create(transferData) {
    try {
      const { gauge_id, from_user_id, to_user_id, reason } = transferData;
      
      const result = await this.executeQuery(
        `INSERT INTO gauge_transfers (gauge_id, from_user_id, to_user_id, status, reason, initiated_at)
         VALUES (?, ?, ?, 'pending', ?, NOW())`,
        [gauge_id, from_user_id, to_user_id, reason]
      );
      
      return result.insertId;
    } catch (error) {
      logger.error(`Failed to create transfer for gauge_id ${transferData.gauge_id}:`, error);
      throw error;
    }
  }

  async findById(transferId) {
    try {
      const rows = await this.executeQuery(
        `SELECT 
          gt.id, gt.gauge_id as gauge_db_id, gt.from_user_id, gt.to_user_id, 
          gt.initiated_at, gt.status, gt.status_changed_at, gt.reason,
          fu.name as from_user_name, fu.email as from_user_email,
          tu.name as to_user_name, tu.email as to_user_email,
          g.gauge_id, g.name as gauge_name, g.equipment_type
         FROM gauge_transfers gt
         JOIN core_users fu ON gt.from_user_id = fu.id
         JOIN core_users tu ON gt.to_user_id = tu.id
         JOIN gauges g ON gt.gauge_id = g.id
         WHERE gt.id = ?`,
        [transferId]
      );
      
      return rows[0] || null;
    } catch (error) {
      logger.error(`Failed to find transfer by id ${transferId}:`, error);
      throw error;
    }
  }

  async findByUser(userId, filters = {}) {
    try {
      let whereClause = '1=1';
      let params = [];

      // Filter by status
      if (filters.status && filters.status !== 'all') {
        whereClause += ' AND gt.status = ?';
        params.push(filters.status);
      }

      // Filter by user involvement
      if (filters.user_type === 'outgoing') {
        whereClause += ' AND gt.from_user_id = ?';
        params.push(userId);
      } else if (filters.user_type === 'incoming') {
        whereClause += ' AND gt.to_user_id = ?';
        params.push(userId);
      } else if (filters.user_type === 'mine') {
        whereClause += ' AND (gt.from_user_id = ? OR gt.to_user_id = ?)';
        params.push(userId, userId);
      }

      const rows = await this.executeQuery(
        `SELECT 
          gt.id, gt.gauge_id as gauge_db_id, gt.initiated_at, gt.status,
          gt.status_changed_at, gt.reason,
          fu.name as from_user_name, fu.email as from_user_email,
          tu.name as to_user_name, tu.email as to_user_email,
          g.gauge_id, g.name as gauge_name, g.equipment_type
         FROM gauge_transfers gt
         JOIN core_users fu ON gt.from_user_id = fu.id
         JOIN core_users tu ON gt.to_user_id = tu.id
         JOIN gauges g ON gt.gauge_id = g.id
         WHERE ${whereClause}
         ORDER BY gt.initiated_at DESC`,
        params
      );

      return rows;
    } catch (error) {
      logger.error(`Failed to find transfers by user ${userId} with filters:`, { filters, error });
      throw error;
    }
  }

  async updateStatus(transferId, status, userId) {
    try {
      const result = await this.executeQuery(
        `UPDATE gauge_transfers 
         SET status = ?, status_changed_at = NOW(), status_changed_by = ?
         WHERE id = ?`,
        [status, userId, transferId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Failed to update transfer status for transferId ${transferId} to ${status}:`, error);
      throw error;
    }
  }

  async findAll(filters = {}) {
    try {
      let whereClause = '1=1';
      let params = [];

      // Filter by status
      if (filters.status && filters.status !== 'all') {
        whereClause += ' AND gt.status = ?';
        params.push(filters.status);
      }

      // Filter by date range
      if (filters.from_date) {
        whereClause += ' AND gt.initiated_at >= ?';
        params.push(filters.from_date);
      }
      if (filters.to_date) {
        whereClause += ' AND gt.initiated_at <= ?';
        params.push(filters.to_date);
      }

      const rows = await this.executeQuery(
        `SELECT 
          gt.id, gt.gauge_id as gauge_db_id, gt.initiated_at, gt.status,
          gt.status_changed_at, gt.reason,
          fu.name as from_user_name, fu.email as from_user_email,
          tu.name as to_user_name, tu.email as to_user_email,
          g.gauge_id, g.name as gauge_name, g.equipment_type
         FROM gauge_transfers gt
         JOIN core_users fu ON gt.from_user_id = fu.id
         JOIN core_users tu ON gt.to_user_id = tu.id
         JOIN gauges g ON gt.gauge_id = g.id
         WHERE ${whereClause}
         ORDER BY gt.initiated_at DESC`,
        params
      );

      return rows;
    } catch (error) {
      logger.error('Failed to find all transfers with filters:', { filters, error });
      throw error;
    }
  }

  async findPendingTransfersByGauge(gaugeDbId) {
    try {
      const rows = await this.executeQuery(
        `SELECT 
          gt.id, gt.gauge_id as gauge_db_id, gt.from_user_id, gt.to_user_id, 
          gt.initiated_at, gt.status, gt.reason,
          fu.name as from_user_name, tu.name as to_user_name
         FROM gauge_transfers gt
         JOIN core_users fu ON gt.from_user_id = fu.id
         JOIN core_users tu ON gt.to_user_id = tu.id
         WHERE gt.gauge_id = ? AND gt.status = 'pending'`,
        [gaugeDbId]
      );
      
      return rows;
    } catch (error) {
      logger.error(`Failed to find pending transfers for gauge ${gaugeDbId}:`, error);
      throw error;
    }
  }

  async cancelTransfersByGauge(gaugeDbId, userId, reason) {
    try {
      const result = await this.executeQuery(
        `UPDATE gauge_transfers 
         SET status = 'cancelled', 
             status_changed_at = NOW(), 
             status_changed_by = ?,
             reason = CONCAT(IFNULL(reason, ''), ' - ', ?)
         WHERE gauge_id = ? AND status = 'pending'`,
        [userId, reason, gaugeDbId]
      );
      
      return result.affectedRows;
    } catch (error) {
      logger.error(`Failed to cancel transfers for gauge ${gaugeDbId}:`, error);
      throw error;
    }
  }
}

module.exports = TransfersRepository;