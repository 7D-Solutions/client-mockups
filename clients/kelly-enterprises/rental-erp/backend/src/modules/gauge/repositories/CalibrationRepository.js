const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class CalibrationRepository extends BaseRepository {
  constructor() {
    super('gauge_calibrations', 'id');
  }

  /**
   * Get calibration history for a gauge
   */
  async getCalibrationHistory(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const rows = await this.executeQuery(
        `SELECT gc.*, g.gauge_id as display_gauge_id, u.name as calibrated_by_name
         FROM gauge_calibrations gc
         JOIN gauges g ON gc.gauge_id = g.id
         LEFT JOIN core_users u ON gc.calibrated_by = u.id
         WHERE g.gauge_id = ?
         ORDER BY gc.calibration_date DESC`,
        [gaugeId]
      );
      return rows;
    } catch (error) {
      logger.error('Failed to get calibration history:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get overdue calibrations
   */
  async getOverdueCalibrations(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const rows = await this.executeQuery(
        `SELECT g.*, gc.due_date, gc.calibration_date as last_calibration_date
         FROM gauges g
         LEFT JOIN (
           SELECT gauge_id, MAX(calibration_date) as calibration_date, MAX(due_date) as due_date
           FROM gauge_calibrations
           GROUP BY gauge_id
         ) gc ON g.id = gc.gauge_id
         WHERE g.is_deleted = 0 
           AND g.status != 'retired'
           AND (gc.due_date IS NULL OR gc.due_date < CURDATE())
         ORDER BY gc.due_date ASC`
      );
      return rows;
    } catch (error) {
      logger.error('Failed to get overdue calibrations:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get calibrations due soon
   */
  async getCalibrationsDueSoon(days = 30, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const rows = await this.executeQuery(
        `SELECT g.*, gc.due_date, gc.calibration_date as last_calibration_date
         FROM gauges g
         LEFT JOIN (
           SELECT gauge_id, MAX(calibration_date) as calibration_date, MAX(due_date) as due_date
           FROM gauge_calibrations
           GROUP BY gauge_id
         ) gc ON g.id = gc.gauge_id
         WHERE g.is_deleted = 0 
           AND g.status != 'retired'
           AND gc.due_date IS NOT NULL
           AND gc.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
         ORDER BY gc.due_date ASC`,
        [days]
      );
      return rows;
    } catch (error) {
      logger.error('Failed to get calibrations due soon:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get latest calibration for a gauge
   */
  async getLatestCalibration(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const rows = await this.executeQuery(
        `SELECT gc.*, g.gauge_id as display_gauge_id
         FROM gauge_calibrations gc
         JOIN gauges g ON gc.gauge_id = g.id
         WHERE g.gauge_id = ?
         ORDER BY gc.calibration_date DESC
         LIMIT 1`,
        [gaugeId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      logger.error('Failed to get latest calibration:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Create calibration record
   */
  async createCalibration(calibrationData, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      const result = await this.executeQuery(
        `INSERT INTO gauge_calibrations 
         (gauge_id, calibration_date, due_date, passed, document_path, calibrated_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          calibrationData.gauge_id,
          calibrationData.calibration_date,
          calibrationData.due_date,
          calibrationData.passed,
          calibrationData.document_path,
          calibrationData.calibrated_by,
          calibrationData.notes
        ]
      );
      
      if (shouldCommit) await connection.commit();
      
      return {
        id: result.insertId,
        ...calibrationData
      };
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to create calibration:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update calibration record
   */
  async updateCalibration(calibrationId, updateData, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      // Build update query dynamically based on provided fields
      const updateFields = [];
      const values = [];
      
      if (updateData.calibration_date !== undefined) {
        updateFields.push('calibration_date = ?');
        values.push(updateData.calibration_date);
      }
      
      if (updateData.due_date !== undefined) {
        updateFields.push('due_date = ?');
        values.push(updateData.due_date);
      }
      
      if (updateData.passed !== undefined) {
        updateFields.push('passed = ?');
        values.push(updateData.passed ? 1 : 0);
      }
      
      if (updateData.document_path !== undefined) {
        updateFields.push('document_path = ?');
        values.push(updateData.document_path);
      }
      
      if (updateData.notes !== undefined) {
        updateFields.push('notes = ?');
        values.push(updateData.notes);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      updateFields.push('updated_at = NOW()');
      values.push(calibrationId);
      
      await this.executeQuery(
        `UPDATE gauge_calibrations SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
      
      if (shouldCommit) await connection.commit();
      
      return { id: calibrationId, ...updateData };
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to update calibration:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get gauge details for calibration
   */
  async getGaugeForCalibration(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const rows = await this.executeQuery(
        'SELECT * FROM gauges WHERE id = ? AND is_deleted = 0 FOR UPDATE',
        [gaugeId]
      );

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      logger.error('Failed to get gauge for calibration:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = CalibrationRepository;