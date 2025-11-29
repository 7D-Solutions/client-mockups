const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class TrackingRepository extends BaseRepository {
  constructor() {
    super('gauge_active_checkouts', 'id');
  }

  /**
   * Get gauge with full details including specifications and checkout info
   */
  async getGaugeWithDetails(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const query = `
        SELECT 
          g.*,
          gac.checkout_date as assignment_date, 
          gac.checked_out_to as assigned_to_user, 
          gac.department as assigned_to_department,
          gac.expected_return as expected_return_date,
          -- Hand tool specifications
          hts.range_min as measurement_range_min,
          hts.range_max as measurement_range_max,
          hts.range_unit as measurement_unit,
          hts.resolution as resolution_value,
          -- Large equipment specifications
          les.accuracy_class as accuracy_value,
          -- Calibration schedule
          gcs.frequency_days as calibration_frequency_days,
          -- Thread specifications (for additional details)
          gts.thread_size,
          gts.thread_type,
          gts.thread_class,
          -- Last calibration info
          gc.calibration_date as last_calibration_date
        FROM gauges g
        LEFT JOIN gauge_active_checkouts gac ON g.id = gac.gauge_id
        LEFT JOIN gauge_hand_tool_specifications hts ON g.id = hts.gauge_id
        LEFT JOIN gauge_large_equipment_specifications les ON g.id = les.gauge_id
        LEFT JOIN gauge_thread_specifications gts ON g.id = gts.gauge_id
        LEFT JOIN gauge_calibration_schedule gcs ON g.id = gcs.gauge_id AND gcs.is_active = 1
        LEFT JOIN (
          SELECT gauge_id, MAX(calibration_date) as calibration_date
          FROM gauge_calibrations
          GROUP BY gauge_id
        ) gc ON g.id = gc.gauge_id
        WHERE g.gauge_id = ?
      `;

      const rows = await this.executeQuery(query, [gaugeId]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      logger.error('Failed to get gauge with details:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Create checkout record
   */
  async createCheckout(gaugeId, checkoutData, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      const result = await this.executeQuery(
        `INSERT INTO gauge_active_checkouts (
          gauge_id, user_id, department
        ) VALUES (?, ?, ?)`,
        [
          gaugeId,
          checkoutData.user_id,
          checkoutData.department
        ]
      );
      
      if (shouldCommit) await connection.commit();
      
      return {
        id: result.insertId,
        gauge_id: gaugeId,
        ...checkoutData
      };
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to create checkout:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Create transaction record for history tracking
   */
  async createTransaction(transactionData, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      const result = await this.executeQuery(
        `INSERT INTO gauge_transactions (
          gauge_id, action, user_id, related_user_id, location, notes
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          transactionData.gauge_id,
          transactionData.action || transactionData.transaction_type, // support both naming conventions
          transactionData.user_id,
          transactionData.related_user_id || transactionData.to_user_id || transactionData.from_user_id || null,
          transactionData.location || transactionData.to_location || transactionData.from_location || null,
          transactionData.notes || null
        ],
        connection
      );
      
      if (shouldCommit) await connection.commit();
      return result.insertId;
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to create transaction record:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get active checkout for a gauge
   */
  async getActiveCheckout(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const rows = await this.executeQuery(
        'SELECT * FROM gauge_active_checkouts WHERE gauge_id = ?',
        [gaugeId]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      logger.error('Failed to get active checkout:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Remove checkout (return gauge)
   */
  async removeCheckout(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      await this.executeQuery(
        'DELETE FROM gauge_active_checkouts WHERE gauge_id = ?',
        [gaugeId]
      );
      
      if (shouldCommit) await connection.commit();
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to remove checkout:', error);
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
      const query = `
        SELECT 
          g.gauge_id, g.name,
          gcs.next_due_date as calibration_due_date,
          g.ownership_type,
          DATEDIFF(CURDATE(), gcs.next_due_date) as days_overdue
        FROM gauges g
        LEFT JOIN gauge_calibration_schedule gcs ON g.id = gcs.gauge_id AND gcs.is_active = 1
        LEFT JOIN gauge_active_checkouts gac ON g.id = gac.gauge_id
        WHERE gcs.next_due_date < CURDATE() 
          AND g.is_deleted = 0
        ORDER BY days_overdue DESC
      `;

      const rows = await this.executeQuery(query);
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
      const query = `
        SELECT 
          g.gauge_id, g.name,
          gcs.next_due_date as calibration_due_date,
          g.ownership_type,
          DATEDIFF(gcs.next_due_date, CURDATE()) as days_until_due
        FROM gauges g
        LEFT JOIN gauge_calibration_schedule gcs ON g.id = gcs.gauge_id AND gcs.is_active = 1
        LEFT JOIN gauge_active_checkouts gac ON g.id = gac.gauge_id
        WHERE gcs.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY) 
          AND g.is_deleted = 0
        ORDER BY gcs.next_due_date ASC
      `;

      const rows = await this.executeQuery(query, [days]);
      return rows;
    } catch (error) {
      logger.error('Failed to get calibrations due soon:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get dashboard summary counts
   */
  async getDashboardCounts(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const queries = [
        'SELECT COUNT(*) as total FROM gauges WHERE is_deleted = 0',
        'SELECT COUNT(*) as checked_out FROM gauges WHERE status = "checked_out"',
        'SELECT COUNT(*) as pending_return FROM gauges WHERE status = "calibration_due"',
        `SELECT COUNT(*) as overdue 
         FROM gauges g 
         JOIN gauge_calibration_schedule gcs ON g.id = gcs.gauge_id AND gcs.is_active = 1
         WHERE gcs.next_due_date < CURDATE() AND g.is_deleted = 0`,
        `SELECT COUNT(*) as due_soon 
         FROM gauges g 
         JOIN gauge_calibration_schedule gcs ON g.id = gcs.gauge_id AND gcs.is_active = 1
         WHERE gcs.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
         AND g.is_deleted = 0`,
        'SELECT COUNT(*) as sealed FROM gauges WHERE is_sealed = 1 AND is_deleted = 0',
        'SELECT COUNT(*) as unsealed FROM gauges WHERE is_sealed = 0 AND is_deleted = 0'
      ];

      const results = await Promise.all(queries.map(query => this.executeQuery(query)));

      return {
        total_active: results[0][0][0].total,
        checked_out: results[1][0][0].checked_out,
        pending_return: results[2][0][0].pending_return,
        overdue_calibration: results[3][0][0].overdue,
        due_soon: results[4][0][0].due_soon,
        sealed_gauges: results[5][0][0].sealed,
        unsealed_gauges: results[6][0][0].unsealed,
        available: results[0][0][0].total - results[1][0][0].checked_out - results[2][0][0].pending_return
      };
    } catch (error) {
      logger.error('Failed to get dashboard counts:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get checkout history for a gauge
   */
  async getCheckoutHistory(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const query = `
        SELECT
          checkout_date as assignment_date,
          NULL as actual_return_date,
          checked_out_to as assigned_to_user,
          department as assigned_to_department,
          NULL as location
        FROM gauge_active_checkouts
        WHERE gauge_id = ?
        ORDER BY checkout_date DESC
      `;

      const rows = await this.executeQuery(query, [gaugeId]);
      return rows;
    } catch (error) {
      logger.error('Failed to get checkout history:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get transfer history for a gauge
   */
  async getTransferHistory(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const transfers = await this.executeQuery(
        `SELECT gt.*,
          from_user.name as from_user_name,
          to_user.name as to_user_name
         FROM gauge_transfers gt
         LEFT JOIN core_users from_user ON gt.from_user_id = from_user.id
         LEFT JOIN core_users to_user ON gt.to_user_id = to_user.id
         WHERE gt.gauge_id = ?
         ORDER BY gt.initiated_at DESC`,
        [gaugeId],
        connection
      );

      return transfers;
    } catch (error) {
      logger.error('Failed to get transfer history:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = TrackingRepository;