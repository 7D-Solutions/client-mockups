const logger = require('../../../infrastructure/utils/logger');
const { addManufacturerDataSingle } = require('../utils/manufacturerExtractor');
const BaseService = require('../../../infrastructure/services/BaseService');
const TrackingRepository = require('../repositories/TrackingRepository');
const GaugeRepository = require('../repositories/GaugeRepository');
const auditService = require('../../../infrastructure/audit/auditService');

class GaugeTrackingService extends BaseService {
  constructor(trackingRepository, gaugeRepository) {
    super(trackingRepository);
    this.trackingRepository = trackingRepository || new TrackingRepository();
    this.gaugeRepository = gaugeRepository || new GaugeRepository();
  }

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

  async checkoutGauge(gaugeId, checkoutData) {
    return await this.executeInTransaction(async (connection) => {
      // Verify gauge is available
      const availability = await this.isGaugeAvailable(gaugeId);
      if (!availability.available) {
        throw new Error(availability.reason);
      }

      const gauge = await this.getGaugeById(gaugeId);

      await this.trackingRepository.createCheckout(gauge.id, {
        user_id: checkoutData.assigned_to_user,
        department: checkoutData.assigned_to_department,
        location: checkoutData.location || 'Unknown'
      }, connection);

      // Create transaction record for history
      await this.trackingRepository.createTransaction({
        gauge_id: gauge.id,
        transaction_type: 'checkout',
        user_id: checkoutData.assigned_to_user || checkoutData.user_id,
        from_status: 'available',
        to_status: 'checked_out',
        to_location: checkoutData.location || 'Unknown',
        to_user_id: checkoutData.assigned_to_user,
        details: {
          department: checkoutData.assigned_to_department
        },
        notes: checkoutData.notes
      }, connection);

      if (gauge.is_sealed) {
        await this.gaugeRepository.update(gauge.id, {
          is_sealed: 0
        }, connection);
        
        await auditService.logAction({
          userId: checkoutData.user_id,
          action: 'gauge_unsealed',
          tableName: 'gauges',
          recordId: gauge.id,
          details: {
            reason: 'checkout',
            date: new Date().toISOString()
          }
        }, connection);
      }

      return {
        gauge_id: gaugeId,
        status: 'checked_out',
        unsealed: gauge.is_sealed
      };
    });
  }

  async returnGauge(gaugeId, returnData) {
    return await this.executeInTransaction(async (connection) => {
      const gauge = await this.getGaugeById(gaugeId);
      if (!gauge) {
        throw new Error('Gauge not found');
      }

      if (gauge.status !== 'checked_out') {
        throw new Error('Gauge is not currently checked out');
      }

      // Find active checkout
      const activeCheckout = await this.trackingRepository.getActiveCheckout(gauge.id, connection);
      if (!activeCheckout) {
        throw new Error('No active checkout found for this gauge');
      }

      await this.trackingRepository.removeCheckout(gauge.id, connection);

      // Create transaction record for history
      await this.trackingRepository.createTransaction({
        gauge_id: gauge.id,
        transaction_type: 'return',
        user_id: returnData?.user_id || activeCheckout.user_id,
        from_status: 'checked_out',
        to_status: 'pending_return',
        from_user_id: activeCheckout.user_id,
        from_location: returnData?.from_location,
        details: {
          requires_qc: true,
          returned_by: returnData?.returned_by || activeCheckout.user_id
        },
        notes: returnData?.notes
      }, connection);

      return {
        gauge_id: gaugeId,
        status: 'pending_return',
        requires_qc: true
      };
    });
  }

  async qcVerifyGauge(gaugeId, qcData) {
    return await this.executeInTransaction(async (connection) => {
      const gauge = await this.getGaugeById(gaugeId);
      if (!gauge) {
        throw new Error('Gauge not found');
      }

      if (gauge.status !== 'calibration_due') {
        throw new Error('Gauge is not pending QC verification');
      }

      await this.gaugeRepository.update(gauge.id, {
        status: 'available'
      }, connection);

      return {
        gauge_id: gaugeId,
        status: 'available',
        qc_verified: true
      };
    });
  }

  async getGaugeHistory(gaugeId) {
    const gauge = await this.getGaugeById(gaugeId);
    if (!gauge) {
      throw new Error('Gauge not found');
    }

    // Get checkout history from repository
    return await this.trackingRepository.getCheckoutHistory(gauge.id);
  }

  // Get overdue calibrations
  async getOverdueCalibrations() {
    return await this.trackingRepository.getOverdueCalibrations();
  }

  async getCalibrationsDueSoon(days = 30) {
    return await this.trackingRepository.getCalibrationsDueSoon(days);
  }

  async getDashboardSummary() {
    return await this.trackingRepository.getDashboardCounts();
  }

  // REAL FIX: Search gauges - use GaugeRepository directly
  async searchGauges(filters = {}) {
    return await this.gaugeRepository.searchGauges(filters);
  }

  // Close database connections
  async close() {
    // Handled by repository
  }
}

module.exports = GaugeTrackingService;