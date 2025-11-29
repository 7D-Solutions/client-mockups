const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class GaugeStatusRepository extends BaseRepository {
  constructor() {
    super('gauges', 'id');
  }

  /**
   * Get current status of a gauge
   */
  async getGaugeStatus(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const rows = await this.executeQuery(
        'SELECT status FROM gauges WHERE id = ?',
        [gaugeId]
      );

      if (rows.length === 0) {
        throw new Error(`Gauge ${gaugeId} not found`);
      }

      return rows[0].status;
    } catch (error) {
      logger.error('Error getting gauge status:', { error: error.message, gaugeId });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update gauge status
   */
  async updateGaugeStatus(gaugeId, status, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const result = await this.executeQuery(
        'UPDATE gauges SET status = ? WHERE id = ?',
        [status, gaugeId]
      );
      
      return { affected: result.affectedRows };
    } catch (error) {
      logger.error('Error updating gauge status:', { error: error.message, gaugeId, status });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get all active gauges with status information
   */
  async getAllGaugesWithStatus(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const gauges = await this.executeQuery(
        `SELECT g.id, g.status, g.is_sealed,
                CASE WHEN ac.gauge_id IS NOT NULL THEN ac.user_id ELSE NULL END as checked_out_to,
                cs.next_due_date
         FROM gauges g
         LEFT JOIN gauge_active_checkouts ac ON g.id = ac.gauge_id
         LEFT JOIN gauge_calibration_schedule cs ON g.id = cs.gauge_id AND cs.is_active = 1
         WHERE g.is_deleted = 0`
      );

      return gauges;
    } catch (error) {
      logger.error('Error getting all gauges with status:', { error: error.message });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Batch update gauge statuses
   */
  async batchUpdateStatuses(updates, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      let updatedCount = 0;
      
      for (const { gaugeId, status } of updates) {
        const result = await this.executeQuery(
          'UPDATE gauges SET status = ? WHERE id = ?',
          [status, gaugeId]
        );
        
        if (result.affectedRows > 0) {
          updatedCount++;
        }
      }
      
      if (shouldCommit) await connection.commit();
      
      return { updated: updatedCount };
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Error in batch status update:', { error: error.message });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update gauge status after QC
   */
  async updateStatusAfterQC(gaugeId, newStatus, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const result = await this.executeQuery(
        'UPDATE gauges SET status = ? WHERE id = ?',
        [newStatus, gaugeId]
      );
      
      return { affected: result.affectedRows };
    } catch (error) {
      logger.error('Error updating gauge status after QC:', { error: error.message, gaugeId });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get gauge with full status info
   */
  async getGaugeWithStatusInfo(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const rows = await this.executeQuery(
        `SELECT g.*, 
                CASE WHEN ac.gauge_id IS NOT NULL THEN ac.user_id ELSE NULL END as checked_out_to,
                cs.next_due_date
         FROM gauges g
         LEFT JOIN gauge_active_checkouts ac ON g.id = ac.gauge_id
         LEFT JOIN gauge_calibration_schedule cs ON g.id = cs.gauge_id AND cs.is_active = 1
         WHERE g.id = ? AND g.is_deleted = 0`,
        [gaugeId]
      );

      return rows[0] || null;
    } catch (error) {
      logger.error('Error getting gauge with status info:', { error: error.message, gaugeId });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = GaugeStatusRepository;