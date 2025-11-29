const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class RejectionRepository extends BaseRepository {
  constructor() {
    super('rejection_reasons', 'id');
  }

  /**
   * Get rejection reason by ID
   */
  async getRejectionReasonById(reasonId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const rows = await this.executeQuery(
        'SELECT * FROM rejection_reasons WHERE id = ? AND is_active = true',
        [reasonId]
      );
      
      return rows[0] || null;
    } catch (error) {
      logger.error('Failed to get rejection reason:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get all rejection reasons
   */
  async getRejectionReasons(includeInactive = false, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const query = includeInactive
        ? 'SELECT * FROM rejection_reasons ORDER BY display_order ASC, reason_name ASC'
        : 'SELECT * FROM rejection_reasons WHERE is_active = true ORDER BY display_order ASC, reason_name ASC';
      
      const rows = await this.executeQuery(query);
      return rows;
    } catch (error) {
      logger.error('Failed to get rejection reasons:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Create a new rejection reason
   */
  async createRejectionReason(reasonData, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      // Check if reason already exists
      const existing = await this.executeQuery(
        'SELECT id FROM rejection_reasons WHERE reason_name = ?',
        [reasonData.reason_name]
      );
      
      if (existing.length > 0) {
        throw new Error('A rejection reason with this name already exists');
      }
      
      const result = await this.executeQuery(
        `INSERT INTO rejection_reasons 
         (reason_name, action_type, target_status, requires_notes, is_active, display_order) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          reasonData.reason_name,
          reasonData.action_type,
          reasonData.target_status || null,
          reasonData.requires_notes || false,
          reasonData.is_active !== false,
          reasonData.display_order || 0
        ]
      );
      
      if (shouldCommit) await connection.commit();
      
      return {
        id: result.insertId,
        ...reasonData
      };
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to create rejection reason:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update a rejection reason
   */
  async updateRejectionReason(id, reasonData, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      // Check if reason exists
      const existing = await this.executeQuery(
        'SELECT id FROM rejection_reasons WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        throw new Error('Rejection reason not found');
      }
      
      // Check for duplicate name
      const duplicate = await this.executeQuery(
        'SELECT id FROM rejection_reasons WHERE reason_name = ? AND id != ?',
        [reasonData.reason_name, id]
      );
      
      if (duplicate.length > 0) {
        throw new Error('Another rejection reason with this name already exists');
      }
      
      await this.executeQuery(
        `UPDATE rejection_reasons 
         SET reason_name = ?, action_type = ?, target_status = ?, 
             requires_notes = ?, is_active = ?, display_order = ?
         WHERE id = ?`,
        [
          reasonData.reason_name,
          reasonData.action_type,
          reasonData.target_status || null,
          reasonData.requires_notes || false,
          reasonData.is_active !== false,
          reasonData.display_order || 0,
          id
        ]
      );
      
      if (shouldCommit) await connection.commit();
      
      return { id, ...reasonData };
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to update rejection reason:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Delete or deactivate a rejection reason
   */
  async deleteRejectionReason(id, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      // Check if reason exists
      const existing = await this.executeQuery(
        'SELECT reason_name FROM rejection_reasons WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        throw new Error('Rejection reason not found');
      }
      
      // Don't delete default reasons, just deactivate them
      const defaultReasons = ['Damaged', 'Lost', 'Wrong Gauge'];
      if (defaultReasons.includes(existing[0].reason_name)) {
        await this.executeQuery(
          'UPDATE rejection_reasons SET is_active = false WHERE id = ?',
          [id]
        );
      } else {
        // Delete non-default reasons
        await this.executeQuery('DELETE FROM rejection_reasons WHERE id = ?', [id]);
      }
      
      if (shouldCommit) await connection.commit();
      
      return { success: true };
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to delete rejection reason:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get rejection history for a gauge
   */
  async getRejectionHistory(gaugeInternalId, limit = 10, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const rows = await this.executeQuery(
        `SELECT 
          cal.id,
          cal.user_id,
          cal.timestamp as rejected_at,
          JSON_UNQUOTE(JSON_EXTRACT(cal.details, '$.rejection_reason')) as rejection_reason,
          JSON_UNQUOTE(JSON_EXTRACT(cal.details, '$.notes')) as notes,
          JSON_UNQUOTE(JSON_EXTRACT(cal.details, '$.action_type')) as action_type,
          u.name as rejected_by
        FROM core_audit_log cal
        LEFT JOIN core_users u ON cal.user_id = u.id
        WHERE cal.action = 'gauge_rejected' 
          AND cal.table_name = 'gauges'
          AND cal.record_id = ?
        ORDER BY cal.timestamp DESC
        LIMIT ?`,
        [gaugeInternalId, parseInt(limit)]
      );
      
      return rows;
    } catch (error) {
      logger.error('Failed to get rejection history:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Remove gauge from active checkouts
   */
  async removeFromActiveCheckouts(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      await this.executeQuery(
        'DELETE FROM gauge_active_checkouts WHERE gauge_id = ?',
        [gaugeId]
      );
    } catch (error) {
      logger.error('Failed to remove from active checkouts:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = RejectionRepository;