const BaseService = require('../../../infrastructure/services/BaseService');
const CalibrationBatchRepository = require('../repositories/CalibrationBatchRepository');
const GaugeRepository = require('../repositories/GaugeRepository');
const AuditRepository = require('../repositories/AuditRepository');
const logger = require('../../../infrastructure/utils/logger');
const dbConnection = require('../../../infrastructure/database/connection');

/**
 * CalibrationBatchManagementService
 *
 * Manages calibration batch creation and gauge assignment (Steps 1-3):
 * 1. Create calibration batch
 * 2. Add/remove gauges to batch
 * 3. Send batch to calibration
 *
 * Reference: ADDENDUM lines 1137-1210
 */
class CalibrationBatchManagementService extends BaseService {
  constructor(pool = null) {
    const dbPool = pool || dbConnection.getPool();
    const batchRepo = new CalibrationBatchRepository();
    batchRepo.pool = dbPool;  // Inject pool into repository instance
    const gaugeRepo = new GaugeRepository();
    gaugeRepo.pool = dbPool;  // Inject pool into repository instance
    super(batchRepo);
    this.calibrationBatchRepository = batchRepo;
    this.gaugeRepository = gaugeRepo;
    this.auditRepository = AuditRepository;  // Already an instance
    this.auditRepository.setPool(dbPool);  // Inject pool into singleton
    this.pool = dbPool;
  }

  /**
   * Step 1: Create calibration batch
   * ADDENDUM lines 1137-1150
   *
   * @param {Object} batchData - Batch creation data
   * @param {string} batchData.calibrationType - 'internal' or 'external'
   * @param {string} batchData.vendorName - Required if external
   * @param {string} batchData.trackingNumber - Required if external
   * @param {number} userId - User creating the batch
   * @returns {Promise<Object>} Created batch
   */
  async createBatch(batchData, userId) {
    const { calibrationType, vendorName, trackingNumber } = batchData;

    // Validate required fields
    if (!calibrationType) {
      throw new Error('Calibration type is required');
    }

    if (!['internal', 'external'].includes(calibrationType)) {
      throw new Error('Calibration type must be either "internal" or "external"');
    }

    // External calibration requires vendor info
    if (calibrationType === 'external') {
      if (!vendorName) {
        throw new Error('Vendor name is required for external calibration');
      }
      if (!trackingNumber) {
        throw new Error('Tracking number is required for external calibration');
      }
    }

    return await this.executeInTransaction(async (connection) => {
      const batch = await this.calibrationBatchRepository.createBatch({
        created_by: userId,
        calibration_type: calibrationType,
        vendor_name: vendorName || null,
        tracking_number: trackingNumber || null,
        status: 'pending_send'
      }, connection);

      // Audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'create_calibration_batch',
        entity_type: 'calibration_batches',
        entity_id: batch.id,
        new_values: JSON.stringify({
          calibration_type: calibrationType,
          vendor_name: vendorName,
          tracking_number: trackingNumber,
          status: 'pending_send'
        })
      });

      logger.info(`Calibration batch ${batch.id} created by user ${userId}`);
      return batch;
    });
  }

  /**
   * Step 2: Add gauge to batch
   * ADDENDUM lines 1155-1173
   *
   * @param {number} batchId - Batch ID
   * @param {number} gaugeId - Gauge ID (database ID)
   * @param {number} userId - User performing the action
   * @returns {Promise<Object>} Result with batchId and gaugeId
   */
  async addGaugeToBatch(batchId, gaugeId, userId) {
    return await this.executeInTransaction(async (connection) => {
      // Validate batch exists and status is 'pending_send'
      const batch = await this.calibrationBatchRepository.findById(batchId, connection);
      if (!batch) {
        throw new Error('Calibration batch not found');
      }

      if (batch.status !== 'pending_send') {
        throw new Error(`Cannot add gauges to batch with status "${batch.status}". Only "pending_send" batches can be modified.`);
      }

      // Validate gauge exists
      const gauge = await this.gaugeRepository.findByPrimaryKey(gaugeId, connection);
      if (!gauge) {
        throw new Error('Gauge not found');
      }

      // Block if gauge.status === 'checked_out'
      if (gauge.status === 'checked_out') {
        throw new Error('Cannot add checked out gauge to calibration batch. Gauge must be returned first.');
      }

      // Block if gauge already in another active batch
      const existingBatch = await this.calibrationBatchRepository.findActiveGaugeBatch(gaugeId, connection);
      if (existingBatch) {
        throw new Error(`Gauge is already in active calibration batch #${existingBatch.batch_id}`);
      }

      // Add gauge to batch
      await this.calibrationBatchRepository.addGaugeToBatch(batchId, gaugeId, connection);

      // Audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'add_gauge_to_calibration_batch',
        entity_type: 'calibration_batch_gauges',
        entity_id: batchId,
        new_values: JSON.stringify({
          batch_id: batchId,
          gauge_id: gaugeId,
          gauge_identifier: gauge.gauge_id
        })
      });

      logger.info(`Gauge ${gaugeId} (${gauge.gauge_id}) added to batch ${batchId} by user ${userId}`);
      return { batchId, gaugeId };
    });
  }

  /**
   * Remove gauge from batch (before sending)
   *
   * @param {number} batchId - Batch ID
   * @param {number} gaugeId - Gauge ID (database ID)
   * @param {number} userId - User performing the action
   * @returns {Promise<Object>} Removal result
   */
  async removeGaugeFromBatch(batchId, gaugeId, userId) {
    return await this.executeInTransaction(async (connection) => {
      const batch = await this.calibrationBatchRepository.findById(batchId, connection);
      if (!batch) {
        throw new Error('Calibration batch not found');
      }

      if (batch.status !== 'pending_send') {
        throw new Error(`Cannot remove gauges from batch with status "${batch.status}". Only "pending_send" batches can be modified.`);
      }

      const gauge = await this.gaugeRepository.findByPrimaryKey(gaugeId, connection);
      if (!gauge) {
        throw new Error('Gauge not found');
      }

      await this.calibrationBatchRepository.removeGaugeFromBatch(batchId, gaugeId, connection);

      // Audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'remove_gauge_from_calibration_batch',
        entity_type: 'calibration_batch_gauges',
        entity_id: batchId,
        new_values: JSON.stringify({
          batch_id: batchId,
          gauge_id: gaugeId,
          gauge_identifier: gauge.gauge_id
        })
      });

      logger.info(`Gauge ${gaugeId} (${gauge.gauge_id}) removed from batch ${batchId} by user ${userId}`);
      return { batchId, gaugeId, removed: true };
    });
  }

  /**
   * Step 3: Send batch to calibration
   * ADDENDUM lines 1178-1210
   *
   * @param {number} batchId - Batch ID
   * @param {number} userId - User performing the action
   * @returns {Promise<Object>} Result with batchId and gaugesSent count
   */
  async sendBatch(batchId, userId) {
    return await this.executeInTransaction(async (connection) => {
      // Get all gauges in batch
      const gauges = await this.calibrationBatchRepository.getBatchGauges(batchId, connection);

      // Validate batch has at least 1 gauge
      if (!gauges || gauges.length === 0) {
        throw new Error('Cannot send empty calibration batch. Add at least one gauge first.');
      }

      // Validate batch status
      const batch = await this.calibrationBatchRepository.findById(batchId, connection);
      if (batch.status !== 'pending_send') {
        throw new Error(`Cannot send batch with status "${batch.status}". Only "pending_send" batches can be sent.`);
      }

      // Update all gauge statuses to 'out_for_calibration'
      for (const gauge of gauges) {
        await this.gaugeRepository.update(
          gauge.id,
          { status: 'out_for_calibration' },
          connection
        );
      }

      // Update batch status to 'sent', set sent_at timestamp
      await this.calibrationBatchRepository.updateBatch(
        batchId,
        {
          status: 'sent',
          sent_at: new Date()
        },
        connection
      );

      // Audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'send_calibration_batch',
        entity_type: 'calibration_batches',
        entity_id: batchId,
        new_values: JSON.stringify({
          batch_id: batchId,
          gauges_sent: gauges.length,
          gauge_ids: gauges.map(g => g.gauge_id)
        })
      });

      logger.info(`Calibration batch ${batchId} sent with ${gauges.length} gauges by user ${userId}`);
      return { batchId, gaugesSent: gauges.length };
    });
  }

  /**
   * Get batch with full details (gauges + statistics)
   *
   * @param {number} batchId - Batch ID
   * @returns {Promise<Object>} Batch with gauges and statistics
   */
  async getBatchDetails(batchId) {
    const connection = await this.pool.getConnection();
    try {
      const batch = await this.calibrationBatchRepository.findById(batchId, connection);
      if (!batch) {
        throw new Error('Calibration batch not found');
      }

      const gauges = await this.calibrationBatchRepository.getBatchGauges(batchId, connection);
      const statistics = await this.calibrationBatchRepository.getBatchStatistics(batchId, connection);

      return {
        ...batch,
        gauges,
        statistics
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Cancel batch (before sending)
   *
   * @param {number} batchId - Batch ID
   * @param {number} userId - User performing the action
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelBatch(batchId, userId, reason) {
    return await this.executeInTransaction(async (connection) => {
      const batch = await this.calibrationBatchRepository.findById(batchId, connection);
      if (!batch) {
        throw new Error('Calibration batch not found');
      }

      // Validate batch.status === 'pending_send'
      if (batch.status !== 'pending_send') {
        throw new Error(`Cannot cancel batch with status "${batch.status}". Only "pending_send" batches can be cancelled.`);
      }

      // Update batch.status = 'cancelled'
      await this.calibrationBatchRepository.updateBatch(
        batchId,
        {
          status: 'cancelled',
          cancelled_at: new Date()
        },
        connection
      );

      // Audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'cancel_calibration_batch',
        entity_type: 'calibration_batches',
        entity_id: batchId,
        new_values: JSON.stringify({
          batch_id: batchId,
          reason,
          status: 'cancelled'
        })
      });

      logger.info(`Calibration batch ${batchId} cancelled by user ${userId}. Reason: ${reason}`);
      return {
        batchId,
        status: 'cancelled',
        reason
      };
    });
  }

  /**
   * Find batches with optional filters
   *
   * @param {Object} filters - Filter criteria
   * @param {string} filters.status - Batch status
   * @param {string} filters.calibrationType - internal or external
   * @returns {Promise<Array>} List of batches
   */
  async findBatches(filters = {}) {
    const connection = await this.pool.getConnection();
    try {
      return await this.calibrationBatchRepository.findBatches(filters, connection);
    } finally {
      connection.release();
    }
  }
}

module.exports = CalibrationBatchManagementService;
