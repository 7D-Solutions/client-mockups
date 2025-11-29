const BaseService = require('../../../infrastructure/services/BaseService');
const SealRepository = require('../repositories/SealRepository');
const { statusFromIsSealed, isSealedFromStatus } = require('../../../infrastructure/utils/sealStatusConverter');
const logger = require('../../../infrastructure/utils/logger');

class SealService extends BaseService {
  constructor() {
    super(new SealRepository());
  }
  /**
   * Break the seal on a gauge and start calibration clock
   * @param {number} gaugeId - The ID of the gauge
   * @returns {Promise<Object>} Result of seal breaking operation
   */
  async breakSeal(gaugeId, userId = 1) {
    return await this.executeInTransaction(async (connection) => {
      // Get current gauge status
      const gauge = await this.repository.getGaugeSealStatus(gaugeId, connection);
      
      if (!gauge) {
        throw new Error('Gauge not found');
      }
      
      if (!gauge.is_sealed) {
        return {
          success: false,
          message: 'Gauge seal is already unsealed',
          unsealed: false
        };
      }
      
      // Break the seal
      const now = new Date();
      const updated = await this.repository.breakSeal(gaugeId, connection);
      
      if (!updated) {
        throw new Error('Failed to break seal');
      }
      
      // Note: Calibration due date calculation would need gauge_calibration_schedule table
      // This is handled by other services that manage calibration schedules
      
      // Log the seal breaking event
      await this.repository.logSealAction(
        userId,
        'unsealed',
        gaugeId,
        { unsealed_date: now },
        connection
      );
      
      return {
        success: true,
        message: 'Seal unsealed successfully',
        unsealed: true,
        unsealedDate: now
      };
    });
  }
  
  /**
   * Check the seal status of a gauge
   * @param {Object} gauge - The gauge object
   * @returns {Object} Seal status information
   */
  checkSealStatus(gauge) {
    return {
      isSealed: !!gauge.is_sealed,
      sealStatus: statusFromIsSealed(gauge.is_sealed),
      unsealedDate: gauge.unsealed_date || null,
      requiresCalibration: !gauge.is_sealed && !!gauge.unsealed_date
    };
  }
  
  /**
   * Calculate calibration due date based on seal status
   * @param {Object} gauge - The gauge object
   * @returns {Date|null} Calibration due date
   */
  calculateCalibrationDue(gauge) {
    if (!gauge.calibration_frequency_days) {
      return gauge.calibration_due_date;
    }
    
    let baseDate;
    
    // Priority: first_use_date > last_calibration_date > created_at
    if (gauge.first_use_date) {
      baseDate = new Date(gauge.first_use_date);
    } else if (gauge.last_calibration_date) {
      baseDate = new Date(gauge.last_calibration_date);
    } else if (gauge.created_at) {
      baseDate = new Date(gauge.created_at);
    } else {
      return gauge.calibration_due_date;
    }
    
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + gauge.calibration_frequency_days);
    
    return dueDate;
  }
  
  /**
   * Update seal status for a gauge
   * @param {number} gaugeId - The gauge ID
   * @param {string} newStatus - New seal status ('sealed', 'unsealed', 'n/a')
   * @returns {Promise<Object>} Update result
   */
  async updateSealStatus(gaugeId, newStatus, userId = 1) {
    const validStatuses = ['sealed', 'unsealed', 'n/a'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid seal status: ${newStatus}`);
    }
    
    return await this.executeInTransaction(async (connection) => {
      // Get current gauge
      const gauge = await this.repository.getGaugeSealStatus(gaugeId, connection);
      
      if (!gauge) {
        throw new Error('Gauge not found');
      }
      
      const oldStatus = statusFromIsSealed(gauge.is_sealed);
      const newIsSealed = isSealedFromStatus(newStatus);
      
      // Update seal status
      const updated = await this.repository.updateSealStatus(gaugeId, newIsSealed, connection);
      
      if (!updated) {
        throw new Error('Failed to update seal status');
      }
      
      // Log the change
      await this.repository.logSealAction(
        userId,
        'seal_status_changed',
        gaugeId,
        { 
          old_status: oldStatus,
          new_status: newStatus 
        },
        connection
      );
      
      return {
        success: true,
        message: `Seal status updated to ${newStatus}`,
        oldStatus: oldStatus,
        newStatus: newStatus
      };
    });
  }
  
  /**
   * Get seal information by gauge seal ID
   * @param {number} sealId - The seal ID from the gauge record
   * @returns {Promise<Object|null>} Seal information or null if not found
   */
  async getSealById(sealId) {
    try {
      if (!sealId) {
        return null;
      }
      
      // Since we don't have a separate seals table, return seal status info
      // This method is called by gaugeService to get seal info
      return {
        id: sealId,
        status: 'sealed',
        type: 'gauge_seal'
      };
    } catch (error) {
      logger.error('Error getting seal by ID:', error);
      return null;
    }
  }
}

module.exports = SealService;