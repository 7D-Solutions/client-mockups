const BaseService = require('../../../infrastructure/services/BaseService');
const CheckoutRepository = require('../repositories/CheckoutRepository');
const AuditRepository = require('../repositories/AuditRepository');
const TransfersRepository = require('../repositories/TransfersRepository');
const TrackingRepository = require('../repositories/TrackingRepository');
const OperationsRepository = require('../repositories/OperationsRepository');
const GaugeCascadeService = require('./GaugeCascadeService');
const MovementService = require('../../inventory/services/MovementService');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const { getPool } = require('../../../infrastructure/database/connection');
const logger = require('../../../infrastructure/utils/logger');
const ValidationError = require('../../../infrastructure/errors/ValidationError');

/**
 * GaugeCheckoutService
 *
 * Handles gauge checkout/return operations with complete business rule validation
 * and proper transaction management.
 *
 * Responsibilities:
 * - Checkout gauges with validation (equipment type, seal status, calibration)
 * - Return gauges with QC workflow and transfer cancellation
 * - QC verification with status transitions
 * - All operations wrapped in transactions for data integrity
 *
 * Business Rules Enforced:
 * - Large equipment cannot be checked out (fixed-location)
 * - Sealed gauges require unseal approval before checkout
 * - Overdue calibration blocks checkout
 * - Returns trigger pending QC status
 * - Pending transfers cancelled on return
 */
class GaugeCheckoutService extends BaseService {
  constructor() {
    super(new OperationsRepository());
    this.trackingRepository = new TrackingRepository();
    this.checkoutRepository = new CheckoutRepository();
    this.auditRepository = AuditRepository; // Singleton instance
    this.movementService = new MovementService(); // Inventory integration
    this._cascadeService = null; // Lazy initialization
  }

  /**
   * Get cascade service instance (lazy initialization to ensure pool is ready)
   * @private
   */
  get cascadeService() {
    if (!this._cascadeService) {
      this._cascadeService = new GaugeCascadeService(getPool());
    }
    return this._cascadeService;
  }

  /**
   * Get gauge details with repository abstraction
   */
  async getGaugeDetails(gaugeId) {
    try {
      const gauge = await this.repository.getGaugeDetails(gaugeId);
      if (!gauge) {
        return { success: false, error: 'Gauge not found' };
      }
      return { success: true, data: gauge };
    } catch (error) {
      throw new Error(`Failed to get gauge details: ${error.message}`);
    }
  }

  /**
   * Check out a gauge with comprehensive business rule validation
   *
   * @param {string} gaugeId - System gauge ID (e.g., "1/4-20 UNC-2A A")
   * @param {object} checkoutData - Checkout data (assigned_to_user_id, assigned_to_department, notes)
   * @param {number} userId - User performing checkout
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async checkoutGauge(gaugeId, checkoutData, userId) {
    return await this.executeInTransaction(async (connection) => {
      // Get gauge details
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);
      if (!gauge) {
        throw new ValidationError('Gauge not found');
      }

      // BUSINESS RULE 1: Large equipment cannot be checked out (fixed-location)
      if (gauge.equipment_type === 'large_equipment') {
        throw new ValidationError('Large equipment is fixed-location and cannot be checked out');
      }

      // BUSINESS RULE 2: Sealed gauges require unseal approval
      if (gauge.is_sealed === 1) {
        throw new ValidationError('This gauge is sealed and requires approval to unseal before checkout');
      }

      // BUSINESS RULE 3: Overdue calibration blocks checkout
      const calibrationStatus = await this.checkCalibrationStatus(gauge.id);
      if (calibrationStatus && calibrationStatus.is_overdue) {
        throw new ValidationError(`This gauge is overdue for calibration (due: ${calibrationStatus.due_date}) and cannot be checked out`);
      }

      // BUSINESS RULE 4: Cannot checkout already checked out gauge
      const activeCheckout = await this.checkoutRepository.getActiveCheckout(gauge.id);
      if (activeCheckout) {
        throw new ValidationError('Gauge is already checked out');
      }

      // BUSINESS RULE 5: Gauges in sets must be checked out as a complete set
      // AUTO-CHECKOUT ALL GAUGES IN THE SET
      if (gauge.set_id) {
        logger.info('Auto-checking out entire set', {
          gaugeId,
          setId: gauge.set_id,
          userId
        });

        // Get all gauges in the set (including seal status)
        const [setGauges] = await connection.execute(`
          SELECT id, gauge_id, name, is_sealed
          FROM gauges
          WHERE set_id = ? AND is_deleted = 0
        `, [gauge.set_id]);

        if (setGauges.length === 0) {
          throw new Error('No gauges found in set');
        }

        // Check if ANY gauge in the set is sealed
        const sealedGauge = setGauges.find(g => g.is_sealed === 1);
        if (sealedGauge) {
          throw new ValidationError(`Cannot check out set ${gauge.set_id}: Gauge ${sealedGauge.gauge_id} is sealed and requires approval to unseal before checkout`);
        }

        // Check if any gauge in the set is already checked out
        for (const setGauge of setGauges) {
          const setGaugeCheckout = await this.checkoutRepository.getActiveCheckout(setGauge.id);
          if (setGaugeCheckout) {
            throw new ValidationError(`Cannot check out set ${gauge.set_id}: Gauge ${setGauge.gauge_id} is already checked out`);
          }
        }

        // Check out all gauges in the set
        const checkoutResults = [];
        for (const setGauge of setGauges) {
          const checkout = await this.checkoutRepository.createCheckout({
            gauge_id: setGauge.id,
            user_id: checkoutData.assigned_to_user_id || userId,
            department: checkoutData.assigned_to_department || null,
            notes: checkoutData.notes || `Set checkout: ${gauge.set_id}`
          });

          // Update gauge status
          const gaugeStatusService = serviceRegistry.get('GaugeStatusService');
          await gaugeStatusService.updateStatus(setGauge.id, 'checked_out');

          // Create transaction record
          await this.trackingRepository.createTransaction({
            gauge_id: setGauge.id,
            action: 'checkout',
            user_id: userId,
            related_user_id: checkoutData.assigned_to_user_id || userId,
            notes: `Set checkout: ${gauge.set_id}`
          });

          // Create audit log
          await this.auditRepository.createAuditLog({
            user_id: userId,
            action: 'CHECKOUT_SET',
            table_name: 'gauges',
            record_id: setGauge.id,
            details: JSON.stringify({
              gauge_id: setGauge.gauge_id,
              set_id: gauge.set_id,
              checked_out_to: checkoutData.assigned_to_user_id || userId,
              department: checkoutData.assigned_to_department
            })
          });

          checkoutResults.push({
            checkout_id: checkout.id,
            gauge_id: setGauge.gauge_id,
            gauge_name: setGauge.name
          });
        }

        logger.info('Set checked out successfully - all gauges', {
          setId: gauge.set_id,
          gaugeCount: setGauges.length,
          userId
        });

        return {
          success: true,
          data: {
            set_id: gauge.set_id,
            gauges: checkoutResults,
            message: `Set ${gauge.set_id} checked out successfully - all ${setGauges.length} gauge(s) are now checked out`
          }
        };
      }

      // Create checkout (all DB operations in transaction)
      const checkout = await this.checkoutRepository.createCheckout({
        gauge_id: gauge.id,
        user_id: checkoutData.assigned_to_user_id || userId,
        department: checkoutData.assigned_to_department || null,
        notes: checkoutData.notes || null
      });

      // Update gauge status
      const gaugeStatusService = serviceRegistry.get('GaugeStatusService');
      await gaugeStatusService.updateStatus(gauge.id, 'checked_out');

      // Create transaction record for history tracking
      await this.trackingRepository.createTransaction({
        gauge_id: gauge.id,
        action: 'checkout',
        user_id: userId,
        related_user_id: checkoutData.assigned_to_user_id || userId,
        notes: checkoutData.notes || null
      });

      // Create audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'CHECKOUT',
        table_name: 'gauges',
        record_id: gauge.id,
        details: JSON.stringify({
          gauge_id: gaugeId,
          checked_out_to: checkoutData.assigned_to_user_id || userId,
          department: checkoutData.assigned_to_department
        })
      });

      // CRITICAL: Check if gauge is part of a set and cascade checkout to companion
      const cascadeResult = await this.cascadeService.cascadeCheckout(gauge.id, userId, 'Set checkout - both gauges must stay together');

      if (cascadeResult.cascaded && cascadeResult.companion) {
        // Checkout the companion gauge
        const companionCheckout = await this.checkoutRepository.createCheckout({
          gauge_id: cascadeResult.companion.id,
          user_id: checkoutData.assigned_to_user_id || userId,
          department: checkoutData.assigned_to_department || null,
          notes: `Auto-checkout: Companion of ${gaugeId}`
        });

        // Update companion status
        await gaugeStatusService.updateStatus(cascadeResult.companion.id, 'checked_out');

        // Create transaction record for companion
        await this.trackingRepository.createTransaction({
          gauge_id: cascadeResult.companion.id,
          action: 'checkout',
          user_id: userId,
          related_user_id: checkoutData.assigned_to_user_id || userId,
          notes: `Auto-checkout: Companion of ${gaugeId}`
        });

        // Create audit log for companion
        await this.auditRepository.createAuditLog({
          user_id: userId,
          action: 'CHECKOUT_CASCADE',
          table_name: 'gauges',
          record_id: cascadeResult.companion.id,
          details: JSON.stringify({
            companion_of: gaugeId,
            checked_out_to: checkoutData.assigned_to_user_id || userId,
            department: checkoutData.assigned_to_department
          })
        });

        logger.info('Set checked out successfully - both gauges', {
          gaugeId,
          companionId: cascadeResult.companion.gaugeId,
          checkoutId: checkout.id,
          companionCheckoutId: companionCheckout.id,
          userId
        });

        return {
          success: true,
          data: {
            checkout_id: checkout.id,
            gauge_id: gaugeId,
            companion_checkout_id: companionCheckout.id,
            companion_gauge_id: cascadeResult.companion.gaugeId,
            message: `Set checked out successfully - both ${gaugeId} and ${cascadeResult.companion.gaugeId} are now checked out`
          }
        };
      }

      logger.info('Gauge checked out successfully', {
        gaugeId,
        checkoutId: checkout.id,
        userId,
        assignedTo: checkoutData.assigned_to_user_id || userId
      });

      return {
        success: true,
        data: {
          checkout_id: checkout.id,
          gauge_id: gaugeId,
          message: 'Gauge checked out successfully'
        }
      };
    });
  }

  /**
   * Return a gauge with QC workflow and transfer cancellation
   *
   * @param {string} gaugeId - System gauge ID
   * @param {object} returnData - Return data (condition_at_return, return_notes, cross_user_acknowledged)
   * @param {number} userId - User performing return
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async returnGauge(gaugeId, returnData, userId) {
    return await this.executeInTransaction(async (connection) => {
      // Get gauge details
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);
      if (!gauge) {
        throw new ValidationError('Gauge not found');
      }

      // Get active checkout
      const activeCheckout = await this.checkoutRepository.getActiveCheckout(gauge.id);
      if (!activeCheckout) {
        // DATA INCONSISTENCY FIX: If gauge status is "checked_out" but no active checkout,
        // auto-correct the status to "available" and treat as already returned
        if (gauge.status === 'checked_out') {
          const gaugeStatusService = serviceRegistry.get('GaugeStatusService');
          await gaugeStatusService.updateStatus(gauge.id, 'available');

          logger.warn('Data inconsistency corrected', {
            gaugeId,
            issue: 'Status was checked_out but no active checkout record'
          });

          return {
            success: true,
            data: {
              gauge_id: gaugeId,
              message: 'Gauge status corrected - was already returned (data inconsistency fixed)'
            }
          };
        }

        throw new ValidationError('Gauge is not checked out');
      }

      // Check return authorization (prevent unauthorized cross-user returns)
      if (activeCheckout.checked_out_to !== userId && !returnData.cross_user_acknowledged) {
        throw new ValidationError('Cross-user return requires acknowledgment');
      }

      // Complete checkout
      await this.checkoutRepository.completeCheckout(gauge.id);

      // Cancel any pending transfers for this gauge
      const transfersRepo = new TransfersRepository();
      const pendingTransfers = await transfersRepo.findPendingTransfersByGauge(gauge.id);

      let cancelledCount = 0;
      if (pendingTransfers && pendingTransfers.length > 0) {
        cancelledCount = await transfersRepo.cancelTransfersByGauge(
          gauge.id,
          userId,
          'Gauge returned - transfer automatically cancelled'
        );

        // Create audit logs for cancelled transfers
        for (const transfer of pendingTransfers) {
          await this.auditRepository.createAuditLog({
            user_id: userId,
            action: 'TRANSFER_CANCELLED',
            table_name: 'gauge_transfers',
            record_id: transfer.id,
            details: JSON.stringify({
              gauge_id: gaugeId,
              reason: 'Gauge returned - transfer automatically cancelled',
              from_user: transfer.from_user_name,
              to_user: transfer.to_user_name
            })
          });
        }
      }

      // Update gauge status to pending_qc (requires QC approval before available)
      const gaugeStatusService = serviceRegistry.get('GaugeStatusService');
      await gaugeStatusService.updateStatus(gauge.id, 'pending_qc');

      // Create transaction record for history tracking
      await this.trackingRepository.createTransaction({
        gauge_id: gauge.id,
        action: 'return',
        user_id: userId,
        related_user_id: activeCheckout.checked_out_to !== userId ? activeCheckout.checked_out_to : null,
        notes: returnData.return_notes || `Condition: ${returnData.condition_at_return}` || null
      });

      // Create audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'RETURN',
        table_name: 'gauges',
        record_id: gauge.id,
        details: JSON.stringify({
          gauge_id: gaugeId,
          condition: returnData.condition_at_return,
          notes: returnData.return_notes,
          cancelled_transfers: cancelledCount
        })
      });

      // CRITICAL: Check if gauge is part of a set and cascade return to companion
      const cascadeResult = await this.cascadeService.cascadeCheckin(gauge.id, userId, 'Set return - both gauges must stay together');

      if (cascadeResult.cascaded && cascadeResult.companion) {
        // Get companion's active checkout
        const companionCheckout = await this.checkoutRepository.getActiveCheckout(cascadeResult.companion.id);

        if (companionCheckout) {
          // Complete companion checkout
          await this.checkoutRepository.completeCheckout(cascadeResult.companion.id);

          // Cancel any pending transfers for companion
          const companionPendingTransfers = await transfersRepo.findPendingTransfersByGauge(cascadeResult.companion.id);
          let companionCancelledCount = 0;

          if (companionPendingTransfers && companionPendingTransfers.length > 0) {
            companionCancelledCount = await transfersRepo.cancelTransfersByGauge(
              cascadeResult.companion.id,
              userId,
              `Auto-return: Companion of ${gaugeId} returned`
            );

            // Create audit logs for cancelled companion transfers
            for (const transfer of companionPendingTransfers) {
              await this.auditRepository.createAuditLog({
                user_id: userId,
                action: 'TRANSFER_CANCELLED',
                table_name: 'gauge_transfers',
                record_id: transfer.id,
                details: JSON.stringify({
                  companion_of: gaugeId,
                  reason: `Auto-return: Companion of ${gaugeId} returned`,
                  from_user: transfer.from_user_name,
                  to_user: transfer.to_user_name
                })
              });
            }
          }

          // Update companion status to pending_qc
          await gaugeStatusService.updateStatus(cascadeResult.companion.id, 'pending_qc');

          // Create transaction record for companion
          await this.trackingRepository.createTransaction({
            gauge_id: cascadeResult.companion.id,
            action: 'return',
            user_id: userId,
            related_user_id: companionCheckout.checked_out_to !== userId ? companionCheckout.checked_out_to : null,
            notes: `Auto-return: Companion of ${gaugeId}`
          });

          // Create audit log for companion
          await this.auditRepository.createAuditLog({
            user_id: userId,
            action: 'RETURN_CASCADE',
            table_name: 'gauges',
            record_id: cascadeResult.companion.id,
            details: JSON.stringify({
              companion_of: gaugeId,
              condition: returnData.condition_at_return,
              cancelled_transfers: companionCancelledCount
            })
          });

          logger.info('Set returned successfully - both gauges', {
            gaugeId,
            companionId: cascadeResult.companion.gaugeId,
            userId,
            cancelledTransfers: cancelledCount + companionCancelledCount,
            status: 'pending_qc'
          });

          return {
            success: true,
            data: {
              gauge_id: gaugeId,
              companion_gauge_id: cascadeResult.companion.gaugeId,
              message: `Set returned successfully - both ${gaugeId} and ${cascadeResult.companion.gaugeId} are now pending QC verification${(cancelledCount + companionCancelledCount) > 0 ? `. ${cancelledCount + companionCancelledCount} pending transfer(s) were automatically cancelled.` : ''}`,
              cancelled_transfers: cancelledCount + companionCancelledCount
            }
          };
        }
      }

      logger.info('Gauge returned successfully', {
        gaugeId,
        userId,
        cancelledTransfers: cancelledCount,
        status: 'pending_qc'
      });

      return {
        success: true,
        data: {
          gauge_id: gaugeId,
          message: `Gauge returned successfully - pending QC verification${cancelledCount > 0 ? `. ${cancelledCount} pending transfer(s) were automatically cancelled.` : ''}`,
          cancelled_transfers: cancelledCount
        }
      };
    });
  }

  /**
   * QC verify a returned gauge
   *
   * @param {string} gaugeId - System gauge ID
   * @param {object} verificationData - QC data (condition_rating, notes, pass_fail, requires_calibration, storage_location)
   * @param {number} userId - Inspector user ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async qcVerifyGauge(gaugeId, verificationData, userId) {
    return await this.executeInTransaction(async (connection) => {
      // Get gauge details
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);
      if (!gauge) {
        throw new ValidationError('Gauge not found');
      }

      // Check if gauge needs QC verification
      if (gauge.status !== 'checked_out' && gauge.status !== 'pending_qc' && gauge.status !== 'out_of_service') {
        throw new ValidationError(`Gauge does not require QC verification - must be checked out, pending QC, or out of service (current: ${gauge.status})`);
      }

      // Create QC record
      const qcRecord = await this.repository.createQCRecord({
        gauge_id: gauge.id,
        inspector_id: userId,
        inspection_date: new Date(),
        condition_rating: verificationData.condition_rating,
        notes: verificationData.notes,
        pass_fail: verificationData.pass_fail,
        requires_calibration: verificationData.requires_calibration
      });

      // Update gauge status based on QC result
      const passed = verificationData.pass_fail === 'pass';
      const gaugeStatusService = serviceRegistry.get('GaugeStatusService');
      const newStatus = await gaugeStatusService.updateStatusAfterQC(gauge.id, passed);

      // Update storage location if provided
      if (verificationData.storage_location) {
        await gaugeService.updateGauge(gauge.id, {
          storage_location: verificationData.storage_location
        });
      }

      // Create transaction record
      const qcAction = verificationData.pass_fail === 'pass' ? 'qc_pass' : 'qc_fail';
      await this.trackingRepository.createTransaction({
        gauge_id: gauge.id,
        action: qcAction,
        user_id: userId,
        location: verificationData.storage_location || gauge.storage_location,
        notes: verificationData.notes || `Rating: ${verificationData.condition_rating}` || null
      });

      // Create audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'QC_VERIFY',
        table_name: 'gauges',
        record_id: gauge.id,
        details: JSON.stringify({
          gauge_id: gaugeId,
          pass_fail: verificationData.pass_fail,
          condition: verificationData.condition_rating
        })
      });

      logger.info('QC verification completed', {
        gaugeId,
        qcRecordId: qcRecord.id,
        result: verificationData.pass_fail,
        newStatus
      });

      return {
        success: true,
        data: {
          gauge_id: gaugeId,
          qc_record_id: qcRecord.id,
          new_status: newStatus,
          message: 'QC verification completed'
        }
      };
    });
  }

  /**
   * Accept a gauge return (admin/QC approval workflow)
   * This transitions gauge from pending_qc to available
   *
   * @param {string} gaugeId - System gauge ID
   * @param {object} acceptData - Acceptance data (notes, storage_location)
   * @param {number} userId - User accepting the return
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async acceptGaugeReturn(gaugeId, acceptData, userId) {
    return await this.executeInTransaction(async (connection) => {
      // Get gauge details
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);
      if (!gauge) {
        throw new ValidationError('Gauge not found');
      }

      // Verify gauge is pending QC
      if (gauge.status !== 'pending_qc') {
        throw new ValidationError(`Gauge must be in pending_qc status to accept return (current: ${gauge.status})`);
      }

      // Update gauge status to available
      const gaugeStatusService = serviceRegistry.get('GaugeStatusService');
      await gaugeStatusService.updateStatus(gauge.id, 'available');

      // Update storage location if provided
      if (acceptData.storage_location) {
        await gaugeService.updateGauge(gauge.id, {
          storage_location: acceptData.storage_location
        });
      }

      // Record location in inventory system
      const storageLocation = acceptData.storage_location || gauge.storage_location;
      if (storageLocation) {
        try {
          await this.movementService.moveItem({
            itemType: 'gauge',
            itemIdentifier: gaugeId,
            toLocation: storageLocation,
            movedBy: userId,
            movementType: 'transfer',
            notes: acceptData.notes || 'Return accepted - gauge now available'
          });
          logger.info('Gauge location recorded in inventory', {
            gaugeId,
            location: storageLocation
          });
        } catch (inventoryError) {
          logger.error('Failed to record gauge location in inventory', {
            gaugeId,
            location: storageLocation,
            error: inventoryError.message
          });
          // Don't fail the whole operation if inventory update fails
        }
      }

      // Create transaction record
      await this.trackingRepository.createTransaction({
        gauge_id: gauge.id,
        action: 'return_accepted',
        user_id: userId,
        location: acceptData.storage_location || gauge.storage_location,
        notes: acceptData.notes || 'Return accepted by QC/Admin'
      });

      // Create audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'RETURN_ACCEPTED',
        table_name: 'gauges',
        record_id: gauge.id,
        details: JSON.stringify({
          gauge_id: gaugeId,
          storage_location: acceptData.storage_location || gauge.storage_location,
          notes: acceptData.notes
        })
      });

      logger.info('Gauge return accepted', {
        gaugeId,
        userId,
        newStatus: 'available'
      });

      return {
        success: true,
        data: {
          gauge_id: gaugeId,
          status: 'available',
          message: 'Gauge return accepted - now available'
        }
      };
    });
  }

  /**
   * Check calibration status for a gauge
   * @private
   */
  async checkCalibrationStatus(gaugeId) {
    try {
      const connection = await this.repository.getConnectionWithTimeout();
      try {
        const [calibrations] = await connection.execute(`
          SELECT
            due_date,
            CASE
              WHEN due_date < NOW() THEN 1
              ELSE 0
            END as is_overdue
          FROM gauge_calibrations
          WHERE gauge_id = ?
          ORDER BY due_date DESC
          LIMIT 1
        `, [gaugeId]);

        if (calibrations.length === 0) {
          return null;
        }

        return {
          due_date: calibrations[0].due_date,
          is_overdue: calibrations[0].is_overdue === 1
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      throw new Error(`Failed to check calibration status: ${error.message}`);
    }
  }
}

module.exports = GaugeCheckoutService;
