const BaseService = require('../../../infrastructure/services/BaseService');
const TransfersRepository = require('../repositories/TransfersRepository');
const CheckoutRepository = require('../repositories/CheckoutRepository');
const AuditRepository = require('../repositories/AuditRepository');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

class TransfersService extends BaseService {
  constructor() {
    super(new TransfersRepository());
    this.checkoutRepository = new CheckoutRepository();
    this.auditRepository = AuditRepository; // Singleton instance
  }
  async getTransfers(userId, filters) {
    try {
      const transfers = await this.repository.findByUser(userId, filters);
      return { success: true, data: transfers };
    } catch (error) {
      throw new Error(`Failed to get transfers: ${error.message}`);
    }
  }

  async getAllTransfers(filters = {}) {
    try {
      const transfers = await this.repository.findAll(filters);
      return { success: true, data: transfers };
    } catch (error) {
      throw new Error(`Failed to get all transfers: ${error.message}`);
    }
  }

  async createTransfer(transferData, userId) {
    try {
      const { gauge_id, to_user_id, reason } = transferData;

      // Get gauge details - gauge_id is the string gauge ID, not numeric
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeByGaugeId(gauge_id);
      if (!gauge) {
        return { success: false, error: 'Gauge not found' };
      }

      // Check if gauge is checked out
      const activeCheckout = await this.checkoutRepository.getActiveCheckout(gauge.id);
      if (!activeCheckout) {
        return { 
          success: false, 
          error: 'Gauge must be checked out to transfer' 
        };
      }

      // Verify user owns the gauge
      if (parseInt(activeCheckout.checked_out_to) !== parseInt(userId)) {
        return {
          success: false,
          error: 'You can only transfer gauges you have checked out'
        };
      }

      // Prevent self-transfer
      if (parseInt(to_user_id) === parseInt(userId)) {
        return {
          success: false,
          error: 'Cannot transfer gauge to yourself'
        };
      }

      // Check for existing pending transfer
      const existingTransfer = await this.repository.findByUser(userId, {
        status: 'pending',
        user_type: 'outgoing'
      });
      
      const pendingForGauge = existingTransfer.find(t => t.gauge_db_id === gauge.id);
      if (pendingForGauge) {
        return { 
          success: false, 
          error: 'A transfer is already pending for this gauge' 
        };
      }

      // Create transfer
      const transferId = await this.repository.create({
        gauge_id: parseInt(gauge.id),  // Convert string ID to integer for database storage
        from_user_id: userId,
        to_user_id: to_user_id,
        reason: reason,
        initiated_by: userId
      });

      // Create audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'TRANSFER_INITIATED',
        table_name: 'gauge_transfers',
        record_id: transferId,
        details: JSON.stringify({
          gauge_id: gauge_id,
          from_user_id: userId,
          to_user_id: to_user_id,
          reason: reason
        })
      });

      // Fetch the updated gauge with has_pending_transfer flag
      const updatedGauge = await gaugeService.getGaugeByGaugeId(gauge_id);

      // DEBUG LOGGING
      const logger = require('../../../infrastructure/utils/logger');
      logger.info('🔍 TRANSFER DEBUG - Transfer created successfully', {
        transferId,
        gauge_id_string: gauge_id,
        gauge_numeric_id: gauge.id,
        transfer_record_gauge_id: parseInt(gauge.id),
        fetched_gauge: {
          id: updatedGauge?.id,
          gauge_id: updatedGauge?.gauge_id,
          has_pending_transfer: updatedGauge?.has_pending_transfer,
          pending_transfer_id: updatedGauge?.pending_transfer_id
        }
      });

      return {
        success: true,
        data: updatedGauge,  // Return the complete gauge object with has_pending_transfer flag
        transfer_id: transferId,  // Include transfer_id for backwards compatibility
        message: 'Transfer request created successfully'
      };
    } catch (error) {
      throw new Error(`Failed to create transfer: ${error.message}`);
    }
  }

  async acceptTransfer(transferId, userId) {
    try {
      // Get transfer details
      const transfer = await this.repository.findById(transferId);
      if (!transfer) {
        return { success: false, error: 'Transfer not found' };
      }

      // Check if user is the recipient
      // Convert to integers for comparison to handle string/number type mismatch
      if (parseInt(transfer.to_user_id) !== parseInt(userId)) {
        return { 
          success: false, 
          error: 'Only the recipient can accept the transfer' 
        };
      }

      // Check transfer status
      if (transfer.status !== 'pending') {
        return { 
          success: false, 
          error: `Transfer is already ${transfer.status}` 
        };
      }

      // Update checkout record
      await this.checkoutRepository.transferCheckout(
        transfer.gauge_db_id, 
        transfer.from_user_id, 
        transfer.to_user_id
      );

      // Update transfer status
      await this.repository.updateStatus(transferId, 'accepted', userId);

      // Create audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'TRANSFER_ACCEPTED',
        table_name: 'gauge_transfers',
        record_id: transferId,
        details: JSON.stringify({
          gauge_id: transfer.gauge_id,
          from_user: transfer.from_user_name,
          to_user: transfer.to_user_name
        })
      });

      return { 
        success: true, 
        data: { 
          message: 'Transfer accepted successfully' 
        } 
      };
    } catch (error) {
      throw new Error(`Failed to accept transfer: ${error.message}`);
    }
  }

  async rejectTransfer(transferId, userId, rejectionReason) {
    try {
      // Get transfer details
      const transfer = await this.repository.findById(transferId);
      if (!transfer) {
        return { success: false, error: 'Transfer not found' };
      }

      // Check if user can reject (recipient or sender)
      // Convert to integers for comparison to handle string/number type mismatch
      const transferToUserId = parseInt(transfer.to_user_id);
      const transferFromUserId = parseInt(transfer.from_user_id);
      const currentUserId = parseInt(userId);
      
      if (transferToUserId !== currentUserId && transferFromUserId !== currentUserId) {
        return { 
          success: false, 
          error: 'Only the sender or recipient can reject the transfer' 
        };
      }

      // Check transfer status
      if (transfer.status !== 'pending') {
        return { 
          success: false, 
          error: `Transfer is already ${transfer.status}` 
        };
      }

      // Update transfer status
      await this.repository.updateStatus(transferId, 'rejected', userId);

      // Create audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'TRANSFER_REJECTED',
        table_name: 'gauge_transfers',
        record_id: transferId,
        details: JSON.stringify({
          gauge_id: transfer.gauge_id,
          rejected_by: userId === transfer.from_user_id ? 'sender' : 'recipient',
          reason: rejectionReason
        })
      });

      return { 
        success: true, 
        data: { 
          message: 'Transfer rejected successfully' 
        } 
      };
    } catch (error) {
      throw new Error(`Failed to reject transfer: ${error.message}`);
    }
  }
}

module.exports = TransfersService;