const logger = require('../../../infrastructure/utils/logger');
const { addManufacturerDataSingle } = require('../utils/manufacturerExtractor');
const BaseService = require('../../../infrastructure/services/BaseService');
const TrackingRepository = require('../repositories/TrackingRepository');
const GaugeRepository = require('../repositories/GaugeRepository');

/**
 * GaugeHistoryService
 *
 * Handles gauge history and tracking queries.
 * NO checkout/return operations - those belong in GaugeCheckoutService.
 *
 * Responsibilities:
 * - Get gauge history and checkout records
 * - Query overdue calibrations
 * - Query calibrations due soon
 * - Dashboard summary counts
 * - Search gauges by filters
 *
 * NOTE: This service was refactored from GaugeTrackingService.
 * Checkout/return/QC operations were moved to GaugeCheckoutService for proper
 * separation of concerns and business rule enforcement.
 */
class GaugeHistoryService extends BaseService {
  constructor(trackingRepository, gaugeRepository) {
    super(trackingRepository);
    this.trackingRepository = trackingRepository || new TrackingRepository();
    this.gaugeRepository = gaugeRepository || new GaugeRepository();
  }

  /**
   * Get gauge by ID with manufacturer data enrichment
   */
  async getGaugeById(gaugeId) {
    try {
      const gauge = await this.trackingRepository.getGaugeWithDetails(gaugeId);
      if (gauge) {
        const gaugeWithManufacturer = addManufacturerDataSingle(gauge);
        return gaugeWithManufacturer;
      }
      return null;
    } catch (error) {
      logger.error(`Failed to get gauge by ID ${gaugeId}:`, error);
      throw error;
    }
  }

  /**
   * Check if gauge is available for checkout
   */
  async isGaugeAvailable(gaugeId) {
    try {
      const gauge = await this.getGaugeById(gaugeId);
      if (!gauge) {
        throw new Error('Gauge not found');
      }

      return {
        available: gauge.status === 'available',
        status: gauge.status,
        condition: gauge.condition || 'Unknown',
        reason: gauge.status !== 'available' ?
          `Gauge is currently ${gauge.status}` : null
      };
    } catch (error) {
      logger.error(`Failed to check gauge availability for ${gaugeId}:`, error);
      throw error;
    }
  }

  /**
   * Get complete checkout history for a gauge
   */
  async getGaugeHistory(gaugeId) {
    const gauge = await this.getGaugeById(gaugeId);
    if (!gauge) {
      throw new Error('Gauge not found');
    }

    return await this.trackingRepository.getCheckoutHistory(gauge.id);
  }

  /**
   * Get gauges with overdue calibrations
   */
  async getOverdueCalibrations() {
    return await this.trackingRepository.getOverdueCalibrations();
  }

  /**
   * Get calibrations due within specified days
   * @param {number} days - Number of days ahead to check (default: 30)
   */
  async getCalibrationsDueSoon(days = 30) {
    return await this.trackingRepository.getCalibrationsDueSoon(days);
  }

  /**
   * Get dashboard summary counts
   */
  async getDashboardSummary() {
    return await this.trackingRepository.getDashboardCounts();
  }

  /**
   * Search gauges with filters
   * @param {object} filters - Search filters (status, category, etc.)
   */
  async searchGauges(filters = {}) {
    return await this.gaugeRepository.searchGauges(filters);
  }

  /**
   * Close database connections
   */
  async close() {
    // Handled by repository
  }
}

module.exports = GaugeHistoryService;
