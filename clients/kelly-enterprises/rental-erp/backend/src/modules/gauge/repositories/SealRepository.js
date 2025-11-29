const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class SealRepository extends BaseRepository {
  constructor() {
    super('gauges', 'id');
  }

  /**
   * Get gauge seal status by ID
   */
  async getGaugeSealStatus(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const rows = await this.executeQuery(
        'SELECT id, is_sealed, calibration_frequency_days FROM gauges WHERE id = ?',
        [gaugeId],
        connection
      );
      
      return rows[0] || null;
    } catch (error) {
      logger.error(`Failed to get gauge seal status for ID ${gaugeId}:`, error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Break the seal on a gauge
   */
  async breakSeal(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const result = await this.executeQuery(
        'UPDATE gauges SET is_sealed = 0 WHERE id = ?',
        [gaugeId],
        connection
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Failed to break seal for gauge ${gaugeId}:`, error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update seal status for a gauge
   */
  async updateSealStatus(gaugeId, isSealed, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const result = await this.executeQuery(
        'UPDATE gauges SET is_sealed = ? WHERE id = ?',
        [isSealed ? 1 : 0, gaugeId],
        connection
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Failed to update seal status for gauge ${gaugeId}:`, error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Log seal-related actions to audit log
   */
  async logSealAction(userId, action, gaugeId, details, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      await this.executeQuery(
        `INSERT INTO core_audit_log (user_id, action, table_name, record_id, details, timestamp)
         VALUES (?, ?, 'gauges', ?, ?, NOW())`,
        [userId, action, gaugeId, JSON.stringify(details)],
        connection
      );
      
      return true;
    } catch (error) {
      logger.error(`Failed to log seal action for gauge ${gaugeId}:`, error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get gauge for seal operations (includes seal status)
   */
  async getGaugeForSealOperation(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const rows = await this.executeQuery(
        `SELECT id, is_sealed, calibration_frequency_days, 
                first_use_date, last_calibration_date, 
                created_at, calibration_due_date
         FROM gauges WHERE id = ?`,
        [gaugeId],
        connection
      );
      
      return rows[0] || null;
    } catch (error) {
      logger.error(`Failed to get gauge for seal operation ${gaugeId}:`, error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = SealRepository;