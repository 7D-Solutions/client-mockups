const BaseService = require('../../../infrastructure/services/BaseService');
const logger = require('../../../infrastructure/utils/logger');

class BadgeCountsService extends BaseService {
  constructor(badgeCountsRepository, options = {}) {
    super(badgeCountsRepository, options);
  }

  /**
   * Get all badge counts for the current user
   * Returns combined counts from gauge, inventory, and dashboard modules
   */
  async getAllBadgeCounts(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get all badge counts in parallel
      const [gaugeCounts, userCheckouts, inventoryCounts, dashboardCounts] = await Promise.all([
        this.repository.getGaugeBadgeCounts(),
        this.repository.getUserCheckoutCount(userId),
        this.repository.getInventoryBadgeCounts(),
        this.repository.getDashboardBadgeCounts(userId)
      ]);

      // Combine all counts into a single response
      const allCounts = {
        // Gauge operations counts
        pendingQC: gaugeCounts.pendingQC,
        pendingUnseal: gaugeCounts.pendingUnseal,
        outOfService: gaugeCounts.outOfService,
        calibrationDue: gaugeCounts.calibrationDue,
        checkedOut: gaugeCounts.checkedOut,

        // Inventory counts
        lowStock: inventoryCounts.lowStock,
        pendingOrders: inventoryCounts.pendingOrders,

        // Dashboard counts
        myCheckouts: userCheckouts,
        alerts: dashboardCounts.alerts
      };

      return {
        success: true,
        data: allCounts
      };
    } catch (error) {
      logger.error('Failed to get all badge counts:', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get gauge-specific badge counts only
   * Useful for partial updates
   */
  async getGaugeBadgeCounts() {
    try {
      const counts = await this.repository.getGaugeBadgeCounts();

      return {
        success: true,
        data: counts
      };
    } catch (error) {
      logger.error('Failed to get gauge badge counts:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user dashboard counts only
   * Useful for partial updates
   */
  async getDashboardBadgeCounts(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const [userCheckouts, dashboardCounts] = await Promise.all([
        this.repository.getUserCheckoutCount(userId),
        this.repository.getDashboardBadgeCounts(userId)
      ]);

      return {
        success: true,
        data: {
          myCheckouts: userCheckouts,
          alerts: dashboardCounts.alerts
        }
      };
    } catch (error) {
      logger.error('Failed to get dashboard badge counts:', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

module.exports = BadgeCountsService;
