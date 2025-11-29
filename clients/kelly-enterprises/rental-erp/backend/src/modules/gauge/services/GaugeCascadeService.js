/**
 * GaugeCascadeService
 *
 * Handles cascade operations for gauge sets (GO/NO-GO pairs).
 * When one gauge in a set is modified, companion gauge may need to be updated.
 *
 * Cascade Rules:
 * - Status changes (OOS, return to service, pending_qc) cascade to companion
 * - Location changes cascade to companion
 * - Deletion orphans the companion (sets set_id = NULL)
 * - Checkout/checkin operations cascade to companion (sets must stay together)
 *
 * NEW SCHEMA: Uses set_id for pairing (e.g., SP0001A/SP0001B both have set_id='SP0001')
 * OLD SCHEMA: Used companion_gauge_id (deprecated and removed)
 *
 * Reference: ADDENDUM_CASCADE_AND_RELATIONSHIP_OPS.md
 */

const { pool: defaultPool } = require('../../../infrastructure/database/connection');
const GaugeSetRepository = require('../repositories/GaugeSetRepository');
const TransactionHelper = require('./helpers/GaugeSetTransactionHelper');
const logger = require('../../../infrastructure/utils/logger');

class GaugeCascadeService {
  constructor(pool = null) {
    this.pool = pool || defaultPool;
    this.repository = new GaugeSetRepository(this.pool);
    this.transactionHelper = new TransactionHelper(this.pool);
  }

  /**
   * Helper: Determine GO and NO GO gauge IDs from two gauge entities
   * @private
   */
  _determineGoNoGoIds(gauge, companion) {
    const goGaugeId = gauge.gaugeSuffix === 'A' ? gauge.id : companion.id;
    const noGoGaugeId = gauge.gaugeSuffix === 'A' ? companion.id : gauge.id;
    return { goGaugeId, noGoGaugeId };
  }

  /**
   * Cascade status change to companion gauge (Out of Service / Return to Service)
   *
   * @param {number} gaugeId - The gauge being updated
   * @param {string} newStatus - New status (out_of_service or available)
   * @param {number} userId - User ID performing the action
   * @param {string} [reason] - Optional reason for status change
   * @returns {Promise<{cascaded: boolean, affectedGauges: number[], message: string}>}
   */
  async cascadeStatusChange(gaugeId, newStatus, userId, reason = null) {
    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Get the gauge with FOR UPDATE lock
      const gauge = await this.repository.getGaugeById(gaugeId, connection);

      if (!gauge) {
        throw new Error(`Gauge with ID ${gaugeId} not found`);
      }

      // Check if gauge is part of a set (has set_id)
      if (!gauge.setId) {
        // Single gauge - just update its status
        await this.repository.updateStatus(connection, gaugeId, newStatus);

        logger.info(`Updated single gauge ${gaugeId} status to ${newStatus}`);

        return {
          cascaded: false,
          affectedGauges: [gaugeId],
          message: `Gauge status updated to ${newStatus}`
        };
      }

      // Gauge is part of a set - cascade the status change
      const companion = await this.repository.getSetMemberGauge(gaugeId, connection);

      if (!companion) {
        // Companion not found (data inconsistency), update only this gauge
        await this.repository.updateStatus(connection, gaugeId, newStatus);

        logger.warn(`Gauge ${gaugeId} has set_id but companion not found`);

        return {
          cascaded: false,
          affectedGauges: [gaugeId],
          message: `Gauge status updated (companion not found)`
        };
      }

      // Update both gauges
      await this.repository.updateStatus(connection, gauge.id, newStatus);
      await this.repository.updateStatus(connection, companion.id, newStatus);

      // Record in companion history
      const { goGaugeId, noGoGaugeId } = this._determineGoNoGoIds(gauge, companion);

      const action = newStatus === 'out_of_service' ? 'cascaded_oos' : 'cascaded_return';
      const historyReason = reason || `Cascade from companion status change to ${newStatus}`;

      await this.repository.createSetHistory(
        connection,
        goGaugeId,
        noGoGaugeId,
        action,
        userId,
        historyReason,
        {
          initiatedBy: gaugeId,
          newStatus,
          gaugeSystemId: gauge.gaugeId,
          companionSystemId: companion.gaugeId
        }
      );

      logger.info(
        `Cascaded ${newStatus}: Gauge ${gaugeId} (${gauge.gaugeId}) and companion ${companion.id} (${companion.gaugeId})`
      );

      return {
        cascaded: true,
        affectedGauges: [gauge.id, companion.id],
        message: `Both gauges in set marked ${newStatus}`,
        gauge: {
          id: gauge.id,
          systemGaugeId: gauge.gaugeId,
          newStatus
        },
        companion: {
          id: companion.id,
          systemGaugeId: companion.gaugeId,
          newStatus
        }
      };
    });
  }

  /**
   * Cascade location change to companion gauge
   *
   * @param {number} gaugeId - The gauge being moved
   * @param {string} newLocation - New storage location
   * @param {number} userId - User ID performing the action
   * @param {string} [reason] - Optional reason for location change
   * @returns {Promise<{cascaded: boolean, affectedGauges: number[], newLocation: string, message: string}>}
   */
  async cascadeLocationChange(gaugeId, newLocation, userId, reason = null) {
    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Get the gauge with FOR UPDATE lock
      const gauge = await this.repository.getGaugeById(gaugeId, connection);

      if (!gauge) {
        throw new Error(`Gauge with ID ${gaugeId} not found`);
      }

      // Check if gauge is part of a set (has set_id)
      if (!gauge.setId) {
        // Single gauge - just update its location
        await this.repository.updateLocation(connection, gaugeId, newLocation);

        logger.info(`Updated single gauge ${gaugeId} location to ${newLocation}`);

        return {
          cascaded: false,
          affectedGauges: [gaugeId],
          newLocation,
          message: `Gauge moved to ${newLocation}`
        };
      }

      // Gauge is part of a set - cascade the location change
      const companion = await this.repository.getSetMemberGauge(gaugeId, connection);

      if (!companion) {
        // Companion not found, update only this gauge
        await this.repository.updateLocation(connection, gaugeId, newLocation);

        logger.warn(`Gauge ${gaugeId} has set_id but companion not found`);

        return {
          cascaded: false,
          affectedGauges: [gaugeId],
          newLocation,
          message: `Gauge moved (companion not found)`
        };
      }

      // Update both locations
      await this.repository.updateLocation(connection, gauge.id, newLocation);
      await this.repository.updateLocation(connection, companion.id, newLocation);

      // Record in companion history
      const { goGaugeId, noGoGaugeId } = this._determineGoNoGoIds(gauge, companion);

      const historyReason = reason || `Cascade location update to ${newLocation}`;

      await this.repository.createSetHistory(
        connection,
        goGaugeId,
        noGoGaugeId,
        'cascaded_location',
        userId,
        historyReason,
        {
          initiatedBy: gaugeId,
          newLocation,
          gaugeSystemId: gauge.gaugeId,
          companionSystemId: companion.gaugeId
        }
      );

      logger.info(
        `Cascaded location: Gauge ${gaugeId} (${gauge.gaugeId}) and companion ${companion.id} (${companion.gaugeId}) moved to ${newLocation}`
      );

      return {
        cascaded: true,
        affectedGauges: [gauge.id, companion.id],
        newLocation,
        message: `Both gauges in set moved to ${newLocation}`,
        gauge: {
          id: gauge.id,
          systemGaugeId: gauge.gaugeId,
          newLocation
        },
        companion: {
          id: companion.id,
          systemGaugeId: companion.gaugeId,
          newLocation
        }
      };
    });
  }

  /**
   * Delete gauge and orphan its companion
   * (Sets companion's set_id to NULL)
   *
   * @param {number} gaugeId - The gauge being deleted
   * @param {number} userId - User ID performing the deletion
   * @param {string} [reason] - Optional reason for deletion
   * @returns {Promise<{deleted: number, companionOrphaned: number|null, message: string}>}
   */
  async deleteGaugeAndOrphanCompanion(gaugeId, userId, reason = null) {
    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Get the gauge with FOR UPDATE lock
      const gauge = await this.repository.getGaugeById(gaugeId, connection);

      if (!gauge) {
        throw new Error(`Gauge with ID ${gaugeId} not found`);
      }

      // Check if companion exists (gauge is part of a set)
      let companionId = null;
      if (gauge.setId) {
        const companion = await this.repository.getSetMemberGauge(gaugeId, connection);

        if (companion) {
          // Block if companion is checked out
          if (companion.status === 'checked_out') {
            throw new Error(
              `Cannot delete gauge ${gauge.gaugeId} - companion ${companion.gaugeId} is currently checked out`
            );
          }

          companionId = companion.id;

          // Record orphaning in history
          const { goGaugeId, noGoGaugeId } = this._determineGoNoGoIds(gauge, companion);

          await this.repository.createSetHistory(
            connection,
            goGaugeId,
            noGoGaugeId,
            'orphaned',
            userId,
            reason || `Companion deleted: ${gauge.gaugeId}`,
            {
              deletedGaugeId: gauge.id,
              deletedGaugeSystemId: gauge.gaugeId,
              orphanedGaugeId: companion.id,
              orphanedGaugeSystemId: companion.gaugeId
            }
          );

          // Orphan the companion (unpair)
          await this.repository.unpairGauges(connection, gauge.id, companion.id);

          logger.info(
            `Orphaned gauge ${companion.id} (${companion.gaugeId}) - companion ${gauge.id} (${gauge.gaugeId}) deleted`
          );
        }
      }

      // Soft delete the gauge
      await this.repository.softDeleteGauge(connection, gaugeId);

      logger.info(`Soft deleted gauge ${gaugeId} (${gauge.gaugeId})`);

      return {
        deleted: gaugeId,
        companionOrphaned: companionId,
        message: companionId
          ? `Gauge deleted and companion orphaned (now available as spare)`
          : `Gauge deleted (no companion)`
      };
    });
  }

  /**
   * Check if gauge set can be checked out (both gauges available)
   *
   * @param {number} gaugeId - Either gauge in the set
   * @returns {Promise<{canCheckout: boolean, reason: string|null, companionId: number|null}>}
   */
  async canCheckoutSet(gaugeId) {
    const gauge = await this.repository.getGaugeById(gaugeId);

    if (!gauge) {
      return {
        canCheckout: false,
        reason: 'Gauge not found',
        companionId: null
      };
    }

    // Check if gauge is part of a set (has set_id)
    if (!gauge.setId) {
      return {
        canCheckout: false,
        reason: 'Gauge is not part of a set (no set_id)',
        companionId: null
      };
    }

    // Get companion
    const companion = await this.repository.getSetMemberGauge(gaugeId);

    if (!companion) {
      return {
        canCheckout: false,
        reason: 'Companion gauge not found',
        companionId: null
      };
    }

    // Check if both gauges are available
    if (gauge.status !== 'available') {
      return {
        canCheckout: false,
        reason: `Gauge ${gauge.gaugeId} is ${gauge.status}`,
        companionId: companion.id
      };
    }

    if (companion.status !== 'available') {
      return {
        canCheckout: false,
        reason: `Companion gauge ${companion.gaugeId} is ${companion.status}`,
        companionId: companion.id
      };
    }

    // Both gauges available
    return {
      canCheckout: true,
      reason: null,
      companionId: companion.id,
      gauge: {
        id: gauge.id,
        systemGaugeId: gauge.gaugeId,
        status: gauge.status
      },
      companion: {
        id: companion.id,
        systemGaugeId: companion.gaugeId,
        status: companion.status
      }
    };
  }

  /**
   * Cascade checkout operation to companion gauge
   * CRITICAL: Sets MUST be checked out together
   *
   * @param {number} gaugeId - The gauge being checked out
   * @param {number} userId - User ID performing checkout
   * @param {string} [reason] - Optional reason for checkout
   * @returns {Promise<{cascaded: boolean, affectedGauges: number[], message: string}>}
   */
  async cascadeCheckout(gaugeId, userId, reason = null) {
    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Get the gauge with FOR UPDATE lock
      const gauge = await this.repository.getGaugeById(gaugeId, connection);

      if (!gauge) {
        throw new Error(`Gauge with ID ${gaugeId} not found`);
      }

      // Check if gauge is part of a set (has set_id)
      if (!gauge.setId) {
        // Single gauge - no cascade needed
        logger.info(`Gauge ${gaugeId} has no set_id - no cascade for checkout`);
        return {
          cascaded: false,
          affectedGauges: [gaugeId],
          message: `Single gauge checkout (not part of set)`
        };
      }

      // Gauge is part of a set - MUST checkout both together
      const companion = await this.repository.getSetMemberGauge(gaugeId, connection);

      if (!companion) {
        logger.warn(`Gauge ${gaugeId} has set_id but companion not found`);
        return {
          cascaded: false,
          affectedGauges: [gaugeId],
          message: `Gauge checkout (companion not found)`
        };
      }

      // Verify companion is available
      if (companion.status !== 'available') {
        throw new Error(
          `Cannot checkout set - companion gauge ${companion.gaugeId} is ${companion.status}`
        );
      }

      // Record in companion history
      const { goGaugeId, noGoGaugeId } = this._determineGoNoGoIds(gauge, companion);

      const historyReason = reason || `Cascade checkout - sets must stay together`;

      await this.repository.createSetHistory(
        connection,
        goGaugeId,
        noGoGaugeId,
        'cascaded_checkout',
        userId,
        historyReason,
        {
          initiatedBy: gaugeId,
          gaugeSystemId: gauge.gaugeId,
          companionSystemId: companion.gaugeId
        }
      );

      logger.info(
        `Cascaded checkout: Gauge ${gaugeId} (${gauge.gaugeId}) triggers companion ${companion.id} (${companion.gaugeId})`
      );

      return {
        cascaded: true,
        affectedGauges: [gauge.id, companion.id],
        message: `Both gauges in set must be checked out together`,
        gauge: {
          id: gauge.id,
          systemGaugeId: gauge.gaugeId
        },
        companion: {
          id: companion.id,
          systemGaugeId: companion.gaugeId
        }
      };
    });
  }

  /**
   * Cascade checkin (return) operation to companion gauge
   * CRITICAL: Sets MUST be returned together
   *
   * @param {number} gaugeId - The gauge being returned
   * @param {number} userId - User ID performing return
   * @param {string} [reason] - Optional reason for return
   * @returns {Promise<{cascaded: boolean, affectedGauges: number[], message: string}>}
   */
  async cascadeCheckin(gaugeId, userId, reason = null) {
    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Get the gauge with FOR UPDATE lock
      const gauge = await this.repository.getGaugeById(gaugeId, connection);

      if (!gauge) {
        throw new Error(`Gauge with ID ${gaugeId} not found`);
      }

      // Check if gauge is part of a set (has set_id)
      if (!gauge.setId) {
        // Single gauge - no cascade needed
        logger.info(`Gauge ${gaugeId} has no set_id - no cascade for checkin`);
        return {
          cascaded: false,
          affectedGauges: [gaugeId],
          message: `Single gauge checkin (not part of set)`
        };
      }

      // Gauge is part of a set - MUST return both together
      const companion = await this.repository.getSetMemberGauge(gaugeId, connection);

      if (!companion) {
        logger.warn(`Gauge ${gaugeId} has set_id but companion not found`);
        return {
          cascaded: false,
          affectedGauges: [gaugeId],
          message: `Gauge checkin (companion not found)`
        };
      }

      // Verify companion is checked out
      if (companion.status !== 'checked_out') {
        throw new Error(
          `Cannot checkin set - companion gauge ${companion.gaugeId} is ${companion.status}`
        );
      }

      // Record in companion history
      const { goGaugeId, noGoGaugeId } = this._determineGoNoGoIds(gauge, companion);

      const historyReason = reason || `Cascade checkin - sets must stay together`;

      await this.repository.createSetHistory(
        connection,
        goGaugeId,
        noGoGaugeId,
        'cascaded_checkin',
        userId,
        historyReason,
        {
          initiatedBy: gaugeId,
          gaugeSystemId: gauge.gaugeId,
          companionSystemId: companion.gaugeId
        }
      );

      logger.info(
        `Cascaded checkin: Gauge ${gaugeId} (${gauge.gaugeId}) triggers companion ${companion.id} (${companion.gaugeId})`
      );

      return {
        cascaded: true,
        affectedGauges: [gauge.id, companion.id],
        message: `Both gauges in set must be returned together`,
        gauge: {
          id: gauge.id,
          systemGaugeId: gauge.gaugeId
        },
        companion: {
          id: companion.id,
          systemGaugeId: companion.gaugeId
        }
      };
    });
  }
}

module.exports = GaugeCascadeService;
