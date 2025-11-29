const BaseService = require('../../../infrastructure/services/BaseService');
const GaugeStatusRepository = require('../repositories/GaugeStatusRepository');
const logger = require('../../../infrastructure/utils/logger');

/**
 * Unified Gauge Status Service
 * Single source of truth for all gauge status management
 * Refactored to use repository pattern
 */
class GaugeStatusService extends BaseService {
  // Status enum matching EXACTLY the database enum values
  // Database: enum('available','checked_out','calibration_due','pending_qc','out_of_service','pending_unseal','retired','out_for_calibration','pending_certificate','pending_release','returned')
  static STATUS = {
    AVAILABLE: 'available',                    // Ready for checkout
    CHECKED_OUT: 'checked_out',               // Currently in use
    CALIBRATION_DUE: 'calibration_due',       // Needs calibration now
    PENDING_QC: 'pending_qc',                 // Returned, awaiting QC verification
    OUT_OF_SERVICE: 'out_of_service',        // Broken/damaged/out of service
    PENDING_UNSEAL: 'pending_unseal',         // Awaiting physical unseal
    RETIRED: 'retired',                        // Permanently retired
    OUT_FOR_CALIBRATION: 'out_for_calibration', // Sent out for calibration
    PENDING_CERTIFICATE: 'pending_certificate', // Awaiting calibration certificate
    PENDING_RELEASE: 'pending_release',        // Calibrated, pending release approval
    RETURNED: 'returned'                       // Customer gauge returned
  };
  
  // Seal status values from database
  // Database: enum('sealed','unsealed','n/a')
  static SEAL_STATUS = {
    SEALED: 'sealed',
    UNSEALED: 'unsealed',
    NA: 'n/a'
  };

  constructor(gaugeStatusRepository) {
    super(gaugeStatusRepository);
    this.gaugeStatusRepository = gaugeStatusRepository || new GaugeStatusRepository();
  }

  /**
   * Calculate what the status should be based on gauge data
   * This is the ONLY place status logic should exist
   */
  calculateStatus(gauge) {
    // Priority order matters - most restrictive first
    
    // 1. Check base operational status
    if (gauge.status === 'retired' || gauge.status === 'lost' || 
        gauge.status === 'damaged' || gauge.status === 'quarantined' ||
        gauge.status === 'out_of_service') {
      return GaugeStatusService.STATUS.OUT_OF_SERVICE;
    }

    // 2. Check calibration due date
    if (gauge.next_due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(gauge.next_due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        return GaugeStatusService.STATUS.CALIBRATION_DUE;
      }
    }

    // 3. Keep existing status if it's one of the valid ones
    // Note: PENDING_QC is not in the database enum, so we skip this check

    // 4. Check checkout workflow
    if (gauge.checked_out_to) {
      return GaugeStatusService.STATUS.CHECKED_OUT;
    }

    // Default to available
    return GaugeStatusService.STATUS.AVAILABLE;
  }

  /**
   * Update a gauge's status in the database
   * @param {number} gaugeId - The gauge database ID
   * @param {string} status - The new status to set
   * @param {Object} connection - Optional database connection for transactions
   */
  async updateStatus(gaugeId, status, connection = null) {
    try {
      // Validate status is in allowed list
      const allowedStatuses = Object.values(GaugeStatusService.STATUS);
      logger.debug('GaugeStatusService.updateStatus - Allowed statuses:', allowedStatuses);
      logger.debug('GaugeStatusService.updateStatus - Requested status:', status);
      if (!allowedStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Allowed: ${allowedStatuses.join(', ')}`);
      }

      // Get current status
      const currentStatus = await this.gaugeStatusRepository.getGaugeStatus(gaugeId, connection);

      // Update status if changed
      if (currentStatus !== status) {
        await this.gaugeStatusRepository.updateGaugeStatus(gaugeId, status, connection);
        
        logger.info(`Gauge ${gaugeId} status changed from ${currentStatus} to ${status}`);
        
        // Emit canonical event (handle gracefully if EventBus unavailable)
        try {
          const { eventBus, EVENT_TYPES } = require('../../../infrastructure/events/EventBus');
          if (eventBus && eventBus.emitEvent) {
            eventBus.emitEvent(EVENT_TYPES.GAUGE_UPDATED, {
              gaugeId,
              oldStatus: currentStatus,
              newStatus: status,
              timestamp: new Date()
            });
          }
        } catch (eventError) {
          // EventBus not available, continue without emitting
          logger.warn(`EventBus not available for gauge ${gaugeId} status change`, eventError);
        }
      }

      return status;
    } catch (error) {
      logger.error(`Error updating status for gauge ${gaugeId}:`, error);
      throw error;
    }
  }

  /**
   * Batch update all gauge statuses
   * Replaces the statusUpdater.js functionality
   */
  async updateAllStatuses() {
    try {
      // Get all active gauges
      const gauges = await this.gaugeStatusRepository.getAllGaugesWithStatus();

      const updates = [];
      
      for (const gauge of gauges) {
        const calculatedStatus = this.calculateStatus(gauge);
        
        if (gauge.status !== calculatedStatus) {
          updates.push({ gaugeId: gauge.id, status: calculatedStatus });
        }
      }

      let updatedCount = 0;
      if (updates.length > 0) {
        const result = await this.gaugeStatusRepository.batchUpdateStatuses(updates);
        updatedCount = result.updated;
      }

      logger.info(`Updated ${updatedCount} gauge statuses out of ${gauges.length} total`);
      return { total: gauges.length, updated: updatedCount };
    } catch (error) {
      logger.error('Error in batch status update:', error);
      throw error;
    }
  }

  /**
   * Check if a gauge can be checked out
   * @param {Object} gauge - The gauge object
   * @returns {Object} { canCheckout: boolean, reason: string }
   */
  canCheckout(gauge) {
    const status = gauge.status || this.calculateStatus(gauge);
    
    switch (status) {
      case GaugeStatusService.STATUS.AVAILABLE:
        // Check seal status separately - sealed gauges CAN be checked out
        if (gauge.is_sealed) {
          return { canCheckout: true, reason: 'Seal will be unsealed on first use' };
        }
        return { canCheckout: true, reason: null };
      
      case GaugeStatusService.STATUS.CHECKED_OUT:
        return { canCheckout: false, reason: 'Already checked out' };
      
      case GaugeStatusService.STATUS.CALIBRATION_DUE:
        return { canCheckout: false, reason: 'Calibration overdue' };
      
      // PENDING_QC status not in database enum, removed
      
      case GaugeStatusService.STATUS.OUT_OF_SERVICE:
        return { canCheckout: false, reason: 'Out of service' };
      
      default:
        return { canCheckout: false, reason: 'Unknown status' };
    }
  }

  /**
   * Get display information for a status
   * @param {string} status - The status value
   * @returns {Object} { label: string, cssClass: string, icon: string }
   */
  static getStatusDisplay(status) {
    const displays = {
      [this.STATUS.AVAILABLE]: {
        label: 'Available',
        cssClass: 'success',
        icon: 'check-circle'
      },
      [this.STATUS.CHECKED_OUT]: {
        label: 'Checked Out',
        cssClass: 'info',
        icon: 'arrow-right-from-bracket'
      },
      // DUE_SOON removed - not in database enum
      [this.STATUS.CALIBRATION_DUE]: {
        label: 'Calibration Due',
        cssClass: 'danger',
        icon: 'exclamation-triangle'
      },
      // PENDING_QC status not in database enum, removed
      [this.STATUS.OUT_OF_SERVICE]: {
        label: 'Out of Service',
        cssClass: 'danger',
        icon: 'ban'
      },
      // SEALED removed - use is_sealed column instead
      // OUT_FOR_CALIBRATION removed - not in database enum
    };

    return displays[status] || {
      label: status,
      cssClass: 'secondary',
      icon: 'question-circle'
    };
  }

  /**
   * Get display information for seal status
   * @param {boolean} isSealed - The is_sealed value
   * @returns {Object} { label: string, cssClass: string, icon: string }
   */
  static getSealStatusDisplay(sealStatus) {
    const displays = {
      [this.SEAL_STATUS.SEALED]: {
        label: 'Sealed',
        cssClass: 'info',
        icon: 'lock'
      },
      [this.SEAL_STATUS.UNSEALED]: {
        label: 'Seal Unsealed',
        cssClass: 'warning',
        icon: 'unlock'
      },
      [this.SEAL_STATUS.NA]: {
        label: 'Not Applicable',
        cssClass: 'secondary',
        icon: 'minus-circle'
      }
    };

    return displays[sealStatus] || {
      label: sealStatus || 'N/A',
      cssClass: 'secondary',
      icon: 'question-circle'
    };
  }

  /**
   * Handle status change events
   * Called when gauge properties change that might affect status
   */
  async handleStatusChangeEvent(gaugeId, eventType, eventData, connection = null) {
    try {
      // Get gauge info to calculate new status
      const gauge = await this.gaugeStatusRepository.getGaugeWithStatusInfo(gaugeId, connection);
      const calculatedStatus = this.calculateStatus(gauge);
      
      // Update status if needed
      const newStatus = await this.updateStatus(gaugeId, calculatedStatus, connection);
      
      // Log the event
      logger.info(`Status change event: ${eventType} for gauge ${gaugeId}, new status: ${newStatus}`);
      
      return newStatus;
    } catch (error) {
      logger.error(`Error handling status change event for gauge ${gaugeId}:`, error);
      throw error;
    }
  }

  /**
   * Update gauge status after QC verification
   * @param {number} gaugeId - The gauge ID
   * @param {boolean} passed - Whether QC passed or failed
   * @param {object} connection - Optional database connection
   */
  async updateStatusAfterQC(gaugeId, passed, connection = null) {
    try {
      const newStatus = passed ? 
        GaugeStatusService.STATUS.AVAILABLE : 
        GaugeStatusService.STATUS.CALIBRATION_DUE;
      
      await this.gaugeStatusRepository.updateStatusAfterQC(gaugeId, newStatus, connection);
      
      logger.info(`Gauge ${gaugeId} status updated to ${newStatus} after QC (passed: ${passed})`);
      
      return newStatus;
    } catch (error) {
      logger.error(`Error updating gauge ${gaugeId} status after QC:`, error);
      throw error;
    }
  }
}

module.exports = GaugeStatusService;