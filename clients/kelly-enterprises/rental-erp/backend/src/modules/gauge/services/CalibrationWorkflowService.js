const BaseService = require('../../../infrastructure/services/BaseService');
const GaugeRepository = require('../repositories/GaugeRepository');
const CertificateRepository = require('../repositories/CertificateRepository');
const AuditRepository = require('../repositories/AuditRepository');
const logger = require('../../../infrastructure/utils/logger');
const dbConnection = require('../../../infrastructure/database/connection');

/**
 * CalibrationWorkflowService
 *
 * Manages gauge calibration workflow after batch is sent (Steps 4, 6-7):
 * 4. Receive gauge from calibration
 * 5. Upload certificate (handled by CertificateService)
 * 6. Verify certificates and move to pending_release
 * 7. Verify location and release to available
 *
 * Reference: ADDENDUM lines 1215-1381
 */
class CalibrationWorkflowService extends BaseService {
  constructor(pool = null) {
    const dbPool = pool || dbConnection.getPool();
    const gaugeRepo = new GaugeRepository();
    gaugeRepo.pool = dbPool;  // Inject pool into repository instance
    super(gaugeRepo);
    this.gaugeRepository = gaugeRepo;
    this.certificateRepository = CertificateRepository;  // Already an instance
    this.auditRepository = AuditRepository;  // Already an instance
    this.auditRepository.setPool(dbPool);  // Inject pool into singleton
    this.pool = dbPool;
  }

  /**
   * Step 4: Receive gauge from calibration
   * ADDENDUM lines 1215-1259
   *
   * @param {number} gaugeId - Gauge ID (database ID)
   * @param {number} userId - User performing the action
   * @param {boolean} calibrationPassed - Whether calibration passed (default: true)
   * @returns {Promise<Object>} Result with gaugeId, status, and details
   */
  async receiveGauge(gaugeId, userId, calibrationPassed = true) {
    return await this.executeInTransaction(async (connection) => {
      // Validate gauge exists
      const gauge = await this.gaugeRepository.findByPrimaryKey(gaugeId, connection);
      if (!gauge) {
        throw new Error('Gauge not found');
      }

      // Validate gauge.status === 'out_for_calibration'
      if (gauge.status !== 'out_for_calibration') {
        throw new Error(`Gauge must be in "out_for_calibration" status. Current status: "${gauge.status}"`);
      }

      // If calibration failed, retire the gauge
      if (calibrationPassed === false) {
        await this.gaugeRepository.update(
          gaugeId,
          {
            status: 'retired',
            retirement_reason: 'calibration_failed',
            retired_at: new Date()
          },
          connection
        );

        // Audit log
        await this.auditRepository.createAuditLog({
          user_id: userId,
          action: 'receive_gauge_calibration_failed',
          entity_type: 'gauges',
          entity_id: gaugeId,
          new_values: JSON.stringify({
            gauge_id: gaugeId,
            gauge_identifier: gauge.gauge_id,
            status: 'retired',
            reason: 'calibration_failed'
          })
        });

        logger.warn(`Gauge ${gaugeId} (${gauge.gauge_id}) retired due to calibration failure`);
        return {
          gaugeId,
          status: 'retired',
          reason: 'calibration_failed'
        };
      }

      // If calibration passed, update to pending_certificate and seal
      await this.gaugeRepository.update(
        gaugeId,
        {
          status: 'pending_certificate',
          is_sealed: 1
        },
        connection
      );

      // Audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'receive_gauge_calibration_passed',
        entity_type: 'gauges',
        entity_id: gaugeId,
        new_values: JSON.stringify({
          gauge_id: gaugeId,
          gauge_identifier: gauge.gauge_id,
          status: 'pending_certificate',
          is_sealed: true
        })
      });

      logger.info(`Gauge ${gaugeId} (${gauge.gauge_id}) received from calibration, now pending certificate`);
      return {
        gaugeId,
        status: 'pending_certificate',
        isSealed: true
      };
    });
  }

  /**
   * Step 6: Verify certificates uploaded for gauge/set
   * ADDENDUM lines 1093-1095 (set logic), Certificate Requirements section
   *
   * @param {number} gaugeId - Gauge ID (database ID)
   * @param {number} userId - User performing the action
   * @returns {Promise<Object>} Result with status update details
   */
  async verifyCertificates(gaugeId, userId) {
    return await this.executeInTransaction(async (connection) => {
      // Get gauge
      const gauge = await this.gaugeRepository.findByPrimaryKey(gaugeId, connection);
      if (!gauge) {
        throw new Error('Gauge not found');
      }

      // Validate gauge.status === 'pending_certificate'
      if (gauge.status !== 'pending_certificate') {
        throw new Error(`Gauge must be in "pending_certificate" status. Current status: "${gauge.status}"`);
      }

      // Verify certificate exists for this gauge
      const certificate = await this.certificateRepository.findByGaugeId(
        gaugeId,
        { is_current: true },
        connection
      );

      if (!certificate || certificate.length === 0) {
        throw new Error('No certificate uploaded for this gauge. Please upload certificate first.');
      }

      // Check if gauge is part of a set (has set_id)
      if (gauge.set_id) {
        // Get companion gauge
        const setMemberGauge = await this.gaugeRepository.findByPrimaryKey(
          gauge.set_id,
          connection
        );

        if (!setMemberGauge) {
          throw new Error('Companion gauge not found');
        }

        // Check if companion also has certificate AND status === 'pending_certificate'
        const companionCertificate = await this.certificateRepository.findByGaugeId(
          gauge.set_id,
          { is_current: true },
          connection
        );

        const companionReady = setMemberGauge.status === 'pending_certificate' &&
                              companionCertificate &&
                              companionCertificate.length > 0;

        if (companionReady) {
          // BOTH verified: Update BOTH to 'pending_release'
          await this.gaugeRepository.update(
            gaugeId,
            { status: 'pending_release' },
            connection
          );

          await this.gaugeRepository.update(
            gauge.set_id,
            { status: 'pending_release' },
            connection
          );

          // Audit log for both gauges
          await this.auditRepository.createAuditLog({
            user_id: userId,
            action: 'verify_certificates_set',
            entity_type: 'gauges',
            entity_id: gaugeId,
            new_values: JSON.stringify({
              gauge_id: gaugeId,
              gauge_identifier: gauge.gauge_id,
              set_id: gauge.set_id,
              companion_identifier: setMemberGauge.gauge_id,
              status: 'pending_release',
              note: 'Both gauges in set verified and moved to pending_release'
            })
          });

          logger.info(`Set verified: Gauges ${gaugeId} and ${gauge.set_id} moved to pending_release`);
          return {
            gaugeId,
            setMemberGaugeId: gauge.set_id,
            status: 'pending_release',
            message: 'Both gauges in set verified and moved to pending_release'
          };
        } else {
          // Only one verified: Keep current status, return waiting message
          logger.info(`Gauge ${gaugeId} certificate verified, waiting for companion gauge ${gauge.set_id}`);
          return {
            gaugeId,
            setMemberGaugeId: gauge.set_id,
            status: 'pending_certificate',
            message: `Certificate verified for this gauge. Waiting for companion gauge (ID: ${gauge.set_id}) to be ready.`
          };
        }
      } else {
        // NOT part of set: Update gauge to 'pending_release'
        await this.gaugeRepository.update(
          gaugeId,
          { status: 'pending_release' },
          connection
        );

        // Audit log
        await this.auditRepository.createAuditLog({
          user_id: userId,
          action: 'verify_certificates_single',
          entity_type: 'gauges',
          entity_id: gaugeId,
          new_values: JSON.stringify({
            gauge_id: gaugeId,
            gauge_identifier: gauge.gauge_id,
            status: 'pending_release'
          })
        });

        logger.info(`Gauge ${gaugeId} (${gauge.gauge_id}) certificate verified, moved to pending_release`);
        return {
          gaugeId,
          status: 'pending_release',
          message: 'Certificate verified and gauge moved to pending_release'
        };
      }
    });
  }

  /**
   * Step 7: Verify physical location and release to available
   * ADDENDUM lines 1097-1100
   *
   * @param {number} gaugeId - Gauge ID (database ID)
   * @param {number} userId - User performing the action
   * @param {string|null} storageLocation - Optional storage location update
   * @returns {Promise<Object>} Result with gaugeId, status, and location
   */
  async verifyLocationAndRelease(gaugeId, userId, storageLocation = null) {
    return await this.executeInTransaction(async (connection) => {
      // Get gauge
      const gauge = await this.gaugeRepository.findByPrimaryKey(gaugeId, connection);
      if (!gauge) {
        throw new Error('Gauge not found');
      }

      // Validate gauge.status === 'pending_release'
      if (gauge.status !== 'pending_release') {
        throw new Error(`Gauge must be in "pending_release" status. Current status: "${gauge.status}"`);
      }

      // Prepare update data
      const updateData = { status: 'available' };
      if (storageLocation) {
        updateData.storage_location = storageLocation;
      }

      // Update gauge
      await this.gaugeRepository.update(gaugeId, updateData, connection);

      // If part of set: Also update companion to 'available'
      let companionUpdated = false;
      if (gauge.set_id) {
        const setMemberGauge = await this.gaugeRepository.findByPrimaryKey(
          gauge.set_id,
          connection
        );

        if (setMemberGauge && setMemberGauge.status === 'pending_release') {
          const companionUpdateData = { status: 'available' };
          if (storageLocation) {
            companionUpdateData.storage_location = storageLocation;
          }

          await this.gaugeRepository.update(
            gauge.set_id,
            companionUpdateData,
            connection
          );
          companionUpdated = true;
        }
      }

      // Audit log
      await this.auditRepository.createAuditLog({
        user_id: userId,
        action: 'verify_location_and_release',
        entity_type: 'gauges',
        entity_id: gaugeId,
        new_values: JSON.stringify({
          gauge_id: gaugeId,
          gauge_identifier: gauge.gauge_id,
          set_id: gauge.set_id || null,
          companion_updated: companionUpdated,
          status: 'available',
          storage_location: storageLocation || gauge.storage_location
        })
      });

      logger.info(
        `Gauge ${gaugeId} (${gauge.gauge_id}) released to available` +
        (companionUpdated ? ` (companion gauge also released)` : '')
      );

      return {
        gaugeId,
        setMemberGaugeId: companionUpdated ? gauge.set_id : null,
        status: 'available',
        location: storageLocation || gauge.storage_location
      };
    });
  }

  /**
   * Bulk receive multiple gauges from calibration
   * Useful for processing entire batches
   *
   * @param {Array<{gaugeId: number, calibrationPassed: boolean}>} gauges - Gauges to receive
   * @param {number} userId - User performing the action
   * @returns {Promise<Object>} Summary of results
   */
  async receiveMultipleGauges(gauges, userId) {
    const results = {
      success: [],
      failed: [],
      retired: []
    };

    for (const { gaugeId, calibrationPassed } of gauges) {
      try {
        const result = await this.receiveGauge(gaugeId, userId, calibrationPassed);

        if (result.status === 'retired') {
          results.retired.push(result);
        } else {
          results.success.push(result);
        }
      } catch (error) {
        results.failed.push({
          gaugeId,
          error: error.message
        });
        logger.error(`Failed to receive gauge ${gaugeId}:`, error);
      }
    }

    return results;
  }

  /**
   * Get gauge calibration status
   * Helper method to check current workflow status
   *
   * @param {number} gaugeId - Gauge ID (database ID)
   * @returns {Promise<Object>} Calibration status information
   */
  async getCalibrationStatus(gaugeId) {
    const connection = await this.pool.getConnection();
    try {
      const gauge = await this.gaugeRepository.findByPrimaryKey(gaugeId, connection);
      if (!gauge) {
        throw new Error('Gauge not found');
      }

      // Get current certificate
      const certificate = await this.certificateRepository.findByGaugeId(
        gaugeId,
        { is_current: true },
        connection
      );

      // Determine workflow step
      let workflowStep = null;
      switch (gauge.status) {
        case 'out_for_calibration':
          workflowStep = 'sent_to_calibration';
          break;
        case 'pending_certificate':
          workflowStep = 'awaiting_certificate';
          break;
        case 'pending_release':
          workflowStep = 'awaiting_release';
          break;
        case 'available':
          workflowStep = 'completed';
          break;
        default:
          workflowStep = 'not_in_calibration';
      }

      return {
        gaugeId: Number(gauge.id), // Convert back to number for consistency
        gaugeIdentifier: gauge.gauge_id,
        status: gauge.status,
        workflowStep,
        isSealed: gauge.is_sealed === 1,
        hasCertificate: certificate && certificate.length > 0,
        setMemberGaugeId: gauge.set_id,
        isPartOfSet: !!gauge.set_id
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = CalibrationWorkflowService;
