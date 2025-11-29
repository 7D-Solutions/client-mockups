const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class BadgeCountsRepository extends BaseRepository {
  constructor() {
    super('gauges', 'id');
  }

  /**
   * Get badge counts for gauge operations
   * Returns counts for: pendingQC, outOfService, calibrationDue, checkedOut, pendingUnseal
   */
  async getGaugeBadgeCounts(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const [gaugeRows] = await connection.execute(`
        SELECT
          SUM(CASE WHEN status = 'pending_qc' THEN 1 ELSE 0 END) as pendingQC,
          SUM(CASE WHEN status = 'out_of_service' THEN 1 ELSE 0 END) as outOfService,
          SUM(CASE WHEN status = 'calibration_due' THEN 1 ELSE 0 END) as calibrationDue,
          SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) as checkedOut
        FROM gauges
        WHERE is_deleted = 0
      `);

      // Get pending unseal requests count
      const [unsealRows] = await connection.execute(`
        SELECT COUNT(*) as pendingUnseal
        FROM gauge_unseal_requests
        WHERE status = 'pending'
      `);

      return {
        pendingQC: gaugeRows[0]?.pendingQC || 0,
        outOfService: gaugeRows[0]?.outOfService || 0,
        calibrationDue: gaugeRows[0]?.calibrationDue || 0,
        checkedOut: gaugeRows[0]?.checkedOut || 0,
        pendingUnseal: unsealRows[0]?.pendingUnseal || 0
      };
    } catch (error) {
      logger.error('Failed to get gauge badge counts:', {
        error: error.message
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get user-specific checkout count
   */
  async getUserCheckoutCount(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const [rows] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM gauge_active_checkouts
        WHERE checked_out_to = ?
      `, [userId]);

      return rows[0]?.count || 0;
    } catch (error) {
      logger.error('Failed to get user checkout count:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get inventory badge counts
   * Returns counts for: lowStock, pendingOrders
   * Note: Requires inventory tables to be populated with proper min/max values
   */
  async getInventoryBadgeCounts(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      // For now, return zeros since inventory module is not fully implemented
      // TODO: Implement when inventory min/max thresholds are configured
      return {
        lowStock: 0,
        pendingOrders: 0
      };
    } catch (error) {
      logger.error('Failed to get inventory badge counts:', {
        error: error.message
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get user dashboard badge counts
   * Returns counts for: alerts
   */
  async getDashboardBadgeCounts(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      // For now, return zeros since notification system is not fully connected
      // TODO: Implement when notification system is integrated
      return {
        alerts: 0
      };
    } catch (error) {
      logger.error('Failed to get dashboard badge counts:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = BadgeCountsRepository;
