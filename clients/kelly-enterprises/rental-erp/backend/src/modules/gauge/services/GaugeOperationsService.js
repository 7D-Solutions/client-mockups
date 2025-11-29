const BaseService = require('../../../infrastructure/services/BaseService');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const logger = require('../../../infrastructure/utils/logger');

/**
 * GaugeOperationsService - Facade for gauge operations
 *
 * This is a THIN FACADE that delegates to specialized services.
 * NO business logic should live here - only delegation.
 *
 * Delegates to:
 * - GaugeCheckoutService: checkout, return, transfer operations (with complete business rules)
 * - GaugeHistoryService: checkout history and tracking queries
 * - GaugeStatusService: status updates and transitions
 * - SealService: seal and unseal operations
 * - GaugeCalibrationService: calibration operations
 */
class GaugeOperationsService extends BaseService {
  constructor(gaugeRepository, checkoutRepository, options = {}) {
    super(gaugeRepository, options);
    this.checkoutRepository = checkoutRepository;
  }

  // ========== CHECKOUT OPERATIONS (delegate to GaugeCheckoutService) ==========

  async checkoutGauge(gaugeId, userId, expectedReturn, additionalInfo = {}) {
    try {
      const checkoutService = serviceRegistry.get('GaugeCheckoutService');
      return await checkoutService.checkoutGauge(gaugeId, {
        assigned_to_user_id: userId,
        assigned_to_department: additionalInfo.department,
        notes: additionalInfo.notes
      }, userId);
    } catch (error) {
      logger.error('Error checking out gauge:', error);
      throw error;
    }
  }

  async returnGauge(gaugeId, userId, condition, notes) {
    try {
      const checkoutService = serviceRegistry.get('GaugeCheckoutService');
      return await checkoutService.returnGauge(gaugeId, {
        condition_at_return: condition,
        return_notes: notes
      }, userId);
    } catch (error) {
      logger.error('Error returning gauge:', error);
      throw error;
    }
  }

  async transferGauge(gaugeId, fromUserId, toUserId, reason) {
    try {
      const checkoutService = serviceRegistry.get('GaugeCheckoutService');

      // Return from current user then checkout to new user
      await checkoutService.returnGauge(gaugeId, {
        return_notes: `Transfer to user ${toUserId}: ${reason}`
      }, fromUserId);

      await checkoutService.checkoutGauge(gaugeId, {
        assigned_to_user_id: toUserId,
        notes: `Transferred from user ${fromUserId}: ${reason}`
      }, toUserId);

      return { success: true, message: 'Gauge transferred successfully' };
    } catch (error) {
      logger.error('Error transferring gauge:', error);
      throw error;
    }
  }

  async getTransferHistory(gaugeId) {
    try {
      const historyService = serviceRegistry.get('GaugeHistoryService');
      return await historyService.getGaugeHistory(gaugeId);
    } catch (error) {
      logger.error('Error getting transfer history:', error);
      throw error;
    }
  }

  // ========== STATUS OPERATIONS (delegate to GaugeStatusService) ==========

  async updateGaugeStatus(gaugeId, newStatus, userId = null, reason = null) {
    try {
      const statusService = serviceRegistry.get('GaugeStatusService');
      return await statusService.updateStatus(gaugeId, newStatus, userId, reason);
    } catch (error) {
      logger.error('Error updating gauge status:', error);
      throw error;
    }
  }

  async markGaugeDamaged(gaugeId, damageInfo, userId) {
    try {
      const statusService = serviceRegistry.get('GaugeStatusService');
      return await statusService.updateStatus(gaugeId, 'damaged', userId, damageInfo.reason);
    } catch (error) {
      logger.error('Error marking gauge as damaged:', error);
      throw error;
    }
  }

  async retireGauge(gaugeId, reason, userId) {
    try {
      const statusService = serviceRegistry.get('GaugeStatusService');
      return await statusService.updateStatus(gaugeId, 'retired', userId, reason);
    } catch (error) {
      logger.error('Error retiring gauge:', error);
      throw error;
    }
  }

  // ========== SEALING OPERATIONS (delegate to SealService) ==========

  async sealGauge(gaugeId, sealData, userId) {
    try {
      const sealService = serviceRegistry.get('SealService');
      return await sealService.seal(gaugeId, sealData, userId);
    } catch (error) {
      logger.error('Error sealing gauge:', error);
      throw error;
    }
  }

  async unsealGauge(gaugeId, userId, reason) {
    try {
      const unsealsService = serviceRegistry.get('UnsealsService');
      return await unsealsService.recordUnseal(gaugeId, userId, reason);
    } catch (error) {
      logger.error('Error unsealing gauge:', error);
      throw error;
    }
  }

  // ========== CALIBRATION OPERATIONS (delegate to GaugeCalibrationService) ==========

  async recordCalibration(gaugeId, calibrationData) {
    const calibrationService = serviceRegistry.get('GaugeCalibrationService');
    return calibrationService.recordCalibration(gaugeId, calibrationData);
  }

  async getCalibrationHistory(gaugeId) {
    const calibrationService = serviceRegistry.get('GaugeCalibrationService');
    return calibrationService.getCalibrationHistory(gaugeId);
  }

  async getCalibrationDue(daysAhead = 30) {
    const calibrationService = serviceRegistry.get('GaugeCalibrationService');
    return calibrationService.getCalibrationsDue(daysAhead);
  }

  // ========== UTILITY (delegate to GaugeQueryService) ==========

  async getGaugeByGaugeId(gaugeId) {
    try {
      const queryService = serviceRegistry.get('GaugeQueryService');
      return await queryService.getGaugeByGaugeId(gaugeId);
    } catch (error) {
      logger.error('Error getting gauge by gauge_id:', error);
      throw error;
    }
  }
}

module.exports = GaugeOperationsService;
