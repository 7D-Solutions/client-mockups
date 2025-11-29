const BaseService = require('../../../infrastructure/services/BaseService');
const OperationsRepository = require('../repositories/OperationsRepository');
const CheckoutRepository = require('../repositories/CheckoutRepository');
const AuditRepository = require('../repositories/AuditRepository');
const TransfersRepository = require('../repositories/TransfersRepository');
const TrackingRepository = require('../repositories/TrackingRepository');
const GaugeSetRepository = require('../repositories/GaugeSetRepository');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const connection = require('../../../infrastructure/database/connection');

class OperationsService extends BaseService {
  constructor() {
    super(new OperationsRepository());
    this.trackingRepository = new TrackingRepository();
    this.checkoutRepository = new CheckoutRepository();
    this.transfersRepository = new TransfersRepository();
    this.auditRepository = AuditRepository; // Singleton instance

    // GaugeSetRepository requires pool in constructor - will be lazily initialized
    this._gaugeSetRepository = null;
  }

  /**
   * Lazy initialization of GaugeSetRepository
   * Gets pool from global connection module
   */
  get gaugeSetRepository() {
    if (!this._gaugeSetRepository) {
      const pool = connection.pool;
      if (!pool) {
        throw new Error('Database pool not initialized - cannot create GaugeSetRepository');
      }
      this._gaugeSetRepository = new GaugeSetRepository(pool);
    }
    return this._gaugeSetRepository;
  }
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

  async checkoutGauge(gaugeId, checkoutData, userId) {
    try {
      // Get gauge details first
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);
      if (!gauge) {
        return { success: false, error: 'Gauge not found' };
      }

      // Check if this is large equipment (cannot be checked out)
      if (gauge.equipment_type === 'large_equipment') {
        return {
          success: false,
          error: 'large_equipment_checkout_blocked',
          gauge_id: gauge.gauge_id,
          message: 'Large equipment is fixed-location and cannot be checked out'
        };
      }

      if (gauge.is_sealed === 1) {
        return {
          success: false,
          error: 'sealed_gauge',
          gauge_id: gauge.gauge_id,
          message: 'This gauge is sealed and requires approval to unseal before checkout'
        };
      }

      // Check if gauge is overdue for calibration
      const calibrationStatus = await this.checkCalibrationStatus(gauge.id);
      if (calibrationStatus && calibrationStatus.is_overdue) {
        return {
          success: false,
          error: 'calibration_overdue',
          gauge_id: gauge.gauge_id,
          message: 'This gauge is overdue for calibration and cannot be checked out',
          due_date: calibrationStatus.due_date
        };
      }

      // Check if already checked out
      const activeCheckout = await this.checkoutRepository.getActiveCheckout(gauge.id);
      if (activeCheckout) {
        return {
          success: false,
          error: 'Gauge is already checked out',
          currentCheckout: activeCheckout
        };
      }

      // Create checkout (convert undefined to null for MySQL compatibility)
      const checkout = await this.checkoutRepository.createCheckout({
        gauge_id: gauge.id,
        user_id: checkoutData.assigned_to_user_id || userId,
        department: checkoutData.assigned_to_department || null,
        notes: checkoutData.notes || null
      });

      // Update gauge status (will automatically set to 'checked_out' based on checkout)
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

      return { 
        success: true, 
        data: { 
          checkout_id: checkout.id,
          gauge_id: gaugeId,
          message: 'Gauge checked out successfully' 
        } 
      };
    } catch (error) {
      throw new Error(`Failed to checkout gauge: ${error.message}`);
    }
  }

  async returnGauge(gaugeId, returnData, userId) {
    try {
      // Get gauge details
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);
      if (!gauge) {
        return { success: false, error: 'Gauge not found' };
      }

      // Get active checkout
      const activeCheckout = await this.checkoutRepository.getActiveCheckout(gauge.id);
      if (!activeCheckout) {
        // Data inconsistency fix: if gauge status is "checked_out" but no active checkout exists,
        // auto-correct the status to "available" and treat as already returned
        if (gauge.status === 'checked_out') {
          const gaugeStatusService = serviceRegistry.get('GaugeStatusService');
          await gaugeStatusService.updateStatus(gauge.id, 'available');
          return { 
            success: true, 
            data: { 
              gauge_id: gaugeId,
              message: 'Gauge status corrected - was already returned (data inconsistency fixed)' 
            } 
          };
        }
        
        return { success: false, error: 'Gauge is not checked out' };
      }

      // Check return authorization
      if (activeCheckout.checked_out_to !== userId && !returnData.cross_user_acknowledged) {
        return { 
          success: false, 
          error: 'Cross-user return requires acknowledgment',
          requiresAcknowledgment: true,
          checkedOutTo: activeCheckout.checked_out_to_name
        };
      }

      // Complete checkout
      await this.checkoutRepository.completeCheckout(gauge.id);

      // Cancel any pending transfers for this gauge
      const pendingTransfers = await this.transfersRepository.findPendingTransfersByGauge(gauge.id);
      
      if (pendingTransfers && pendingTransfers.length > 0) {
        // Cancel all pending transfers
        const cancelledCount = await this.transfersRepository.cancelTransfersByGauge(
          gauge.id,
          userId,
          'Gauge returned - transfer automatically cancelled'
        );
        
        // Create audit logs for each cancelled transfer
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

      // Update gauge status to pending_qc (needs QC approval before becoming available)
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
          cancelled_transfers: pendingTransfers ? pendingTransfers.length : 0
        })
      });

      return { 
        success: true, 
        data: { 
          gauge_id: gaugeId,
          message: `Gauge returned successfully - pending QC verification${pendingTransfers && pendingTransfers.length > 0 ? `. ${pendingTransfers.length} pending transfer(s) were automatically cancelled.` : ''}`,
          cancelled_transfers: pendingTransfers ? pendingTransfers.length : 0
        } 
      };
    } catch (error) {
      throw new Error(`Failed to return gauge: ${error.message}`);
    }
  }

  async qcVerifyGauge(gaugeId, verificationData, userId) {
    try {
      // Get gauge details
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);
      if (!gauge) {
        return { success: false, error: 'Gauge not found' };
      }

      // Check if gauge needs QC - checked_out, pending_qc, or out_of_service gauges can be QC verified
      if (gauge.status !== 'checked_out' && gauge.status !== 'pending_qc' && gauge.status !== 'out_of_service') {
        return {
          success: false,
          error: 'Gauge does not require QC verification - must be checked out, pending QC, or out of service',
          currentStatus: gauge.status
        };
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

      // Create transaction record for history tracking
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

      return {
        success: true,
        data: {
          gauge_id: gaugeId,
          qc_record_id: qcRecord.id,
          new_status: newStatus,
          message: 'QC verification completed'
        }
      };
    } catch (error) {
      throw new Error(`Failed to QC verify gauge: ${error.message}`);
    }
  }

  async returnCustomerGauge(gaugeId, userId, returnBoth = false) {
    try {
      // Get gauge details
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);

      if (!gauge) {
        return { success: false, error: 'Gauge not found' };
      }

      // Validate gauge is customer-owned (customer gauges have customer_id set)
      if (!gauge.customer_id) {
        return {
          success: false,
          error: 'Only customer-owned gauges can be marked as returned',
          gauge_id: gauge.gauge_id
        };
      }

      // Get connection for transaction
      const connection = await this.repository.getConnectionWithTimeout();

      try {
        await connection.beginTransaction();

        // Update gauge status to 'returned'
        const gaugeStatusService = serviceRegistry.get('GaugeStatusService');
        await gaugeStatusService.updateStatus(gauge.id, 'returned');

        // Create tracking record for this gauge
        await this.trackingRepository.createTransaction({
          gauge_id: gauge.id,
          action: 'return',
          user_id: userId,
          location: gauge.storage_location,
          notes: `Customer gauge returned (Customer ID: ${gauge.customer_id || 'N/A'})`
        });

        // Create audit log for this gauge
        await this.auditRepository.createAuditLog({
          user_id: userId,
          action: 'CUSTOMER_GAUGE_RETURNED',
          table_name: 'gauges',
          record_id: gauge.id,
          details: JSON.stringify({
            gauge_id: gauge.gauge_id,
            customer_id: gauge.customer_id,
            return_both: returnBoth,
            has_companion: !!gauge.set_id
          })
        });

        let result = {
          returned: [parseInt(gauge.id)],
          setReturned: false,
          message: `Customer gauge ${gauge.gauge_id} returned successfully`
        };

        // If part of set and returnBoth is true
        if (returnBoth && gauge.set_id) {
          // Calculate companion gauge_id from set_id and suffix
          let companionGaugeId = null;
          if (gauge.gauge_id) {
            const suffix = gauge.gauge_id.slice(-1);
            if (suffix === 'A' || suffix === 'B') {
              const companionSuffix = suffix === 'A' ? 'B' : 'A';
              companionGaugeId = gauge.set_id + companionSuffix;
            }
          }

          const companion = companionGaugeId ? await gaugeService.getGaugeByGaugeId(companionGaugeId) : null;

          if (companion) {
            // Update companion status to 'returned'
            await gaugeStatusService.updateStatus(companion.id, 'returned');

            // Create tracking record for companion
            await this.trackingRepository.createTransaction({
              gauge_id: companion.id,
              action: 'return',
              user_id: userId,
              location: companion.storage_location,
              notes: `Customer gauge returned with companion (Customer ID: ${gauge.customer_id || 'N/A'})`
            });

            // Record in gauge set history
            // Determine GO and NO GO gauge IDs based on suffix
            const goGaugeId = gauge.gauge_suffix === 'A' ? gauge.id : companion.id;
            const noGoGaugeId = gauge.gauge_suffix === 'A' ? companion.id : gauge.id;

            await this.gaugeSetRepository.createSetHistory(
              connection,
              goGaugeId,
              noGoGaugeId,
              'set_returned',
              userId,
              `Customer gauge set returned (Customer ID: ${gauge.customer_id || 'N/A'})`
            );

            // Create audit log for companion
            await this.auditRepository.createAuditLog({
              user_id: userId,
              action: 'CUSTOMER_GAUGE_RETURNED',
              table_name: 'gauges',
              record_id: companion.id,
              details: JSON.stringify({
                gauge_id: companion.gauge_id,
                customer_id: gauge.customer_id,
                returned_with_companion: gauge.gauge_id
              })
            });

            result = {
              returned: [parseInt(gauge.id), parseInt(companion.id)],
              setReturned: true,
              message: `Customer gauge set (${gauge.gauge_id}, ${companion.gauge_id}) returned successfully`
            };
          }
        }

        // If not returning both and has companion, orphan the companion
        if (!returnBoth && gauge.set_id) {
          // Find companion's numeric ID from set_id
          let companionIdForUnpair = null;
          if (gauge.gauge_id) {
            const suffix = gauge.gauge_id.slice(-1);
            if (suffix === 'A' || suffix === 'B') {
              const companionSuffix = suffix === 'A' ? 'B' : 'A';
              const companionGaugeId = gauge.set_id + companionSuffix;
              const companionGauge = await gaugeService.getGaugeByGaugeId(companionGaugeId);
              if (companionGauge) {
                companionIdForUnpair = companionGauge.id;
              }
            }
          }

          if (companionIdForUnpair) {
            // Unpair the gauges
            await this.gaugeSetRepository.unpairGauges(connection, gauge.id, companionIdForUnpair);

            result.companionOrphaned = true;
            result.message += ` (companion gauge orphaned)`;
          }
        }

        await connection.commit();

        return {
          success: true,
          data: result
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      throw new Error(`Failed to return customer gauge: ${error.message}`);
    }
  }

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
          return null; // No calibration record found
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

module.exports = OperationsService;