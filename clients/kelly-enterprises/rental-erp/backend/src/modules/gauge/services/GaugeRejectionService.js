const auditService = require('../../../infrastructure/audit/auditService');
const logger = require('../../../infrastructure/utils/logger');
const BaseService = require('../../../infrastructure/services/BaseService');
const RejectionRepository = require('../repositories/RejectionRepository');
const GaugeRepository = require('../repositories/GaugeRepository');

class GaugeRejectionService extends BaseService {
  constructor(rejectionRepository, gaugeRepository) {
    super(rejectionRepository);
    this.rejectionRepository = rejectionRepository || new RejectionRepository();
    this.gaugeRepository = gaugeRepository || new GaugeRepository();
  }
  /**
   * Reject a gauge with a specific reason
   * @param {string} gaugeId - The gauge ID
   * @param {number} reasonId - The rejection reason ID
   * @param {string} notes - Optional rejection notes
   * @param {number} userId - The user performing the rejection
   * @returns {Promise<Object>} Rejection result
   */
  async rejectGauge(gaugeId, reasonId, notes, userId) {
    return await this.executeInTransaction(async (connection) => {
      // Get rejection reason details
      const reason = await this.rejectionRepository.getRejectionReasonById(reasonId, connection);
      
      if (!reason) {
        throw new Error('Invalid or inactive rejection reason');
      }
      
      // Check if notes are required
      if (reason.requires_notes && !notes) {
        throw new Error('Notes are required for this rejection reason');
      }
      
      // Get gauge info
      const gauge = await this.gaugeRepository.findByGaugeId(gaugeId, connection);
      
      if (!gauge) {
        throw new Error('Gauge not found');
      }
      
      // Allow rejection for gauges pending return or pending QC approval
      const validStatuses = ['calibration_due', 'pending_qc'];
      if (!validStatuses.includes(gauge.status)) {
        throw new Error(`Gauge cannot be rejected from status '${gauge.status}'. Valid statuses: ${validStatuses.join(', ')}`);
      }

      // Log the rejection in core_audit_log
      await auditService.logAction({
        userId: userId,
        module: 'gauge',
        action: 'gauge_rejected',
        tableName: 'gauges',
        recordId: gauge.id,
        details: {
          gauge_id: gaugeId,
          rejection_reason: reason.reason_name,
          rejection_reason_id: reasonId,
          action_type: reason.action_type,
          notes: notes || null,
          previous_status: gauge.status
        },
        ipAddress: null,
        userAgent: null
      }, connection);

      // Handle rejection based on current gauge status
      if (gauge.status === 'pending_qc') {
        // QC Rejection: Gauge was returned by user and failed inspection
        // No checkout to remove - just transition to target status
        await this.gaugeRepository.update(gauge.id, {
          status: reason.target_status || 'out_of_service'
        }, connection);
      } else if (gauge.status === 'calibration_due') {
        // Calibration Return Rejection: Gauge returned from calibration vendor
        // Handle checkout removal based on action_type
        if (reason.action_type === 'remove_checkout') {
          await this.rejectionRepository.removeFromActiveCheckouts(gauge.id, connection);
          await this.gaugeRepository.update(gauge.id, {
            status: reason.target_status || 'available'
          }, connection);
        } else {
          // Keep checked out to user
          await this.gaugeRepository.update(gauge.id, {
            status: 'checked_out'
          }, connection);
        }
      }
      
      // Determine final status for response
      let finalStatus;
      if (gauge.status === 'pending_qc') {
        finalStatus = reason.target_status || 'out_of_service';
      } else {
        finalStatus = reason.action_type === 'remove_checkout' ?
          (reason.target_status || 'available') : 'checked_out';
      }

      logger.info(`Gauge ${gaugeId} rejected with reason: ${reason.reason_name}, new status: ${finalStatus}`);

      return {
        success: true,
        message: `Gauge rejected: ${reason.reason_name}`,
        action: reason.action_type,
        new_status: finalStatus
      };
    });
  }
  
  /**
   * Get rejection history for a gauge
   * @param {string} gaugeId - The gauge ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Rejection history
   */
  async getRejectionHistory(gaugeId, limit = 10) {
    try {
      // Get gauge internal ID
      const gauge = await this.gaugeRepository.findByGaugeId(gaugeId);
      
      if (!gauge) {
        throw new Error('Gauge not found');
      }
      
      // Query rejection events from core_audit_log
      const history = await this.rejectionRepository.getRejectionHistory(gauge.id, limit);
      
      return history;
    } catch (error) {
      logger.error('Error fetching rejection history:', error);
      throw error;
    }
  }
  
  /**
   * Get all rejection reasons
   * @param {boolean} includeInactive - Include inactive reasons
   * @returns {Promise<Array>} List of rejection reasons
   */
  async getRejectionReasons(includeInactive = false) {
    try {
      return await this.rejectionRepository.getRejectionReasons(includeInactive);
    } catch (error) {
      logger.error('Error fetching rejection reasons:', error);
      throw error;
    }
  }
  
  /**
   * Create a new rejection reason
   * @param {Object} reasonData - The rejection reason data
   * @returns {Promise<Object>} Created reason
   */
  async createRejectionReason(reasonData) {
    try {
      const result = await this.rejectionRepository.createRejectionReason(reasonData);
      return {
        success: true,
        id: result.id
      };
    } catch (error) {
      logger.error('Error creating rejection reason:', error);
      throw error;
    }
  }
  
  /**
   * Update a rejection reason
   * @param {number} id - The rejection reason ID
   * @param {Object} reasonData - The updated rejection reason data
   * @returns {Promise<Object>} Update result
   */
  async updateRejectionReason(id, reasonData) {
    try {
      await this.rejectionRepository.updateRejectionReason(id, reasonData);
      return {
        success: true,
        message: 'Rejection reason updated successfully'
      };
    } catch (error) {
      logger.error('Error updating rejection reason:', error);
      throw error;
    }
  }
  
  /**
   * Delete or deactivate a rejection reason
   * @param {number} id - The rejection reason ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteRejectionReason(id) {
    try {
      const result = await this.rejectionRepository.deleteRejectionReason(id);
      return {
        success: true,
        message: result.success ? 'Rejection reason deleted successfully' : 'Default rejection reason deactivated'
      };
    } catch (error) {
      logger.error('Error deleting rejection reason:', error);
      throw error;
    }
  }
}

module.exports = GaugeRejectionService;