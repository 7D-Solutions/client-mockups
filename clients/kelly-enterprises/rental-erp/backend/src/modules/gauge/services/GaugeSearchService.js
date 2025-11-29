const BaseService = require('../../../infrastructure/services/BaseService');
const GaugeRepository = require('../repositories/GaugeRepository');
const logger = require('../../../infrastructure/utils/logger');

/**
 * GaugeSearchService - REAL FIX: Direct GaugeRepository usage
 * No more wrapper nonsense - uses GaugeRepository directly
 */
class GaugeSearchService extends BaseService {
  constructor(gaugeRepository) {
    // REAL FIX: Constructor validation ensures GaugeRepository
    const GaugeRepo = gaugeRepository || new GaugeRepository();
    if (!(GaugeRepo instanceof GaugeRepository)) {
      throw new Error('GaugeSearchService requires GaugeRepository instance');
    }
    
    super(GaugeRepo);
    this.gaugeRepository = GaugeRepo;
    
    // Evidence logging
    logger.debug(`GaugeSearchService using repository: ${this.gaugeRepository.constructor.name}`);
  }

  /**
   * Search gauges with basic criteria - DIRECT repository call
   */
  async searchGauges(criteria = {}) {
    try {
      return await this.gaugeRepository.searchGauges(criteria);
    } catch (error) {
      logger.error('Error searching gauges:', error);
      throw error;
    }
  }

  /**
   * Advanced search - DIRECT repository call
   */
  async advancedSearch(filters = {}) {
    try {
      return await this.gaugeRepository.searchGauges(filters);
    } catch (error) {
      logger.error('Error in advanced search:', error);
      throw error;
    }
  }

  /**
   * Get gauges by category - DIRECT repository call
   */
  async getGaugesByCategory(categoryId) {
    try {
      return await this.gaugeRepository.searchGauges({ category_id: categoryId });
    } catch (error) {
      logger.error('Error fetching gauges by category:', error);
      throw error;
    }
  }

  /**
   * Get available gauges - DIRECT repository call
   */
  async getAvailableGauges() {
    try {
      return await this.gaugeRepository.searchGauges({ status: 'available' });
    } catch (error) {
      logger.error('Error fetching available gauges:', error);
      throw error;
    }
  }

  /**
   * Get dashboard summary - DIRECT repository calculation
   */
  async getDashboardSummary() {
    try {
      // Get all gauges once and calculate in-memory (more efficient)
      const allGauges = await this.gaugeRepository.searchGauges({});
      
      if (!Array.isArray(allGauges)) {
        return this._getEmptyDashboard();
      }

      const counts = {
        total: allGauges.length,
        available: allGauges.filter(g => g.status === 'available').length,
        checked_out: allGauges.filter(g => g.status === 'checked_out').length,
        calibration_due: allGauges.filter(g => g.calibration_status === 'Due Soon').length,
        sealed: allGauges.filter(g => g.is_sealed === 1).length,
        unsealed: allGauges.filter(g => g.is_sealed === 0).length,
        scheduled_calibration: allGauges.filter(g => g.status === 'scheduled_calibration').length,
        out_for_calibration: allGauges.filter(g => g.status === 'out_for_calibration').length
      };
      
      return {
        total_active: counts.total,
        available: counts.available,
        checked_out: counts.checked_out,
        calibration_due: counts.calibration_due,
        overdue_calibration: 0, // Business rule: handled by calibration system
        due_soon: 0, // Business rule: handled by calibration system
        sealed_gauges: counts.sealed,
        unsealed_gauges: counts.unsealed,
        scheduled_calibration: counts.scheduled_calibration,
        out_for_calibration: counts.out_for_calibration,
        available_percentage: counts.total > 0 
          ? Math.round((counts.available / counts.total) * 100) 
          : 0
      };
    } catch (error) {
      logger.error('Error fetching dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Get gauge count by status - DIRECT repository calculation
   */
  async getStatusCounts() {
    try {
      const allGauges = await this.gaugeRepository.searchGauges({});
      
      if (!Array.isArray(allGauges)) {
        return {};
      }

      const statusCounts = {};
      allGauges.forEach(gauge => {
        statusCounts[gauge.status] = (statusCounts[gauge.status] || 0) + 1;
      });
      
      return statusCounts;
    } catch (error) {
      logger.error('Error fetching status counts:', error);
      throw error;
    }
  }

  /**
   * Get user gauges - placeholder for future implementation
   */
  async getUserGauges(userId) {
    try {
      // Future implementation: use gaugeRepository.searchGauges({ checked_out_by_user_id: userId })
      logger.info(`getUserGauges called for user ${userId} - returning empty array (feature not implemented)`);
      return [];
    } catch (error) {
      logger.error('Error fetching user gauges:', error);
      throw error;
    }
  }

  /**
   * Helper method for empty dashboard
   */
  _getEmptyDashboard() {
    return {
      total_active: 0,
      available: 0,
      checked_out: 0,
      calibration_due: 0,
      overdue_calibration: 0,
      due_soon: 0,
      sealed_gauges: 0,
      unsealed_gauges: 0,
      scheduled_calibration: 0,
      out_for_calibration: 0,
      available_percentage: 0
    };
  }
}

module.exports = GaugeSearchService;