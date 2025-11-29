/**
 * GaugeSetService
 *
 * Application service layer for gauge set operations.
 * Orchestrates domain model validation with repository persistence.
 *
 * Responsibilities:
 * - Create gauge sets with domain validation
 * - Pair spare gauges into sets
 * - Replace companion gauges
 * - Query gauge sets and spare gauges
 * - Manage transactions and audit trail
 *
 * Architecture:
 * - Uses GaugeSet and GaugeEntity domain models for validation
 * - Uses GaugeSetRepository for data access
 * - Follows explicit transaction pattern (ADR-002)
 * - Creates audit trail for all operations
 *
 * Reference: UNIFIED_IMPLEMENTATION_PLAN.md Phase 3
 */

const GaugeEntity = require('../domain/GaugeEntity');
const GaugeSet = require('../domain/GaugeSet');
const DomainValidationError = require('../domain/DomainValidationError');
const TransactionHelper = require('./helpers/GaugeSetTransactionHelper');
const ValidationHelper = require('./helpers/GaugeSetValidationHelper');
const logger = require('../../../infrastructure/utils/logger');

class GaugeSetService {
  constructor(pool, repository, gaugeRepository = null) {
    this.pool = pool;
    this.repository = repository; // GaugeSetRepository
    this.gaugeRepository = gaugeRepository; // GaugeRepository for serial number lookups
    this.transactionHelper = new TransactionHelper(pool);
    this.validationHelper = new ValidationHelper(repository, pool);
  }

  /**
   * Create a new gauge set (GO and NO GO gauges created together)
   *
   * @param {object} gaugeSetData - Gauge set data
   * @param {number} userId - User ID performing the action
   * @returns {Promise<{goGaugeId: number, noGoGaugeId: number, baseId: string}>}
   * @throws {DomainValidationError} If business rules are violated
   */
  async createGaugeSet(gaugeSetData, userId) {
    const { baseId, goGaugeData, noGoGaugeData, category } = gaugeSetData;

    // Create domain entities (validates field-level rules)
    const goGauge = new GaugeEntity(goGaugeData);
    const noGoGauge = new GaugeEntity(noGoGaugeData);

    // Create gauge set (validates relationship-level rules)
    const gaugeSet = new GaugeSet({ baseId, goGauge, noGoGauge, category });

    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Create both gauges
      const { goGaugeId, noGoGaugeId } = await this.repository.createGaugeSetWithinTransaction(
        connection,
        gaugeSet
      );

      // Link gauges into set by assigning set_id
      await this.repository.linkCompanionsWithinTransaction(connection, goGaugeId, noGoGaugeId, baseId);

      // Create audit trail
      await this._createAuditTrail(connection, goGaugeId, noGoGaugeId, 'created_together', userId,
        'Gauge set created together', {
          baseId,
          specifications: {
            thread_size: goGauge.threadSize,
            thread_class: goGauge.threadClass,
            thread_type: goGauge.threadType
          },
          category: category.name
        }
      );

      return { goGaugeId, noGoGaugeId, baseId };
    });
  }

  /**
   * Pair two spare gauges into a gauge set (ADDENDUM: Enhanced with location requirement)
   *
   * @param {number} goGaugeId - GO gauge ID (must have suffix A)
   * @param {number} noGoGaugeId - NO GO gauge ID (must have suffix B)
   * @param {string} setLocation - Storage location for the paired set (required)
   * @param {number} userId - User ID performing the action
   * @param {string} [reason] - Optional reason for pairing
   * @param {string} [customSetId] - Optional custom set ID (auto-generated if not provided)
   * @returns {Promise<{success: boolean, baseId: string}>}
   */
  async pairSpareGauges(goGaugeId, noGoGaugeId, setLocation, userId, reason = null, customSetId = null) {
    if (!setLocation) {
      throw new Error('Storage location is required when pairing spare gauges');
    }

    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Lock and retrieve both gauges
      const goGauge = await this.validationHelper.getAndValidateGauge(goGaugeId, connection, 'GO gauge');
      const noGoGauge = await this.validationHelper.getAndValidateGauge(noGoGaugeId, connection, 'NO GO gauge');

      // Verify gauges are spare (no existing companions)
      this.validationHelper.validateIsSpare(goGauge);
      this.validationHelper.validateIsSpare(noGoGauge);

      // Validate not in pending_qc
      if (goGauge.status === 'pending_qc') {
        throw new Error('Cannot pair GO gauge in pending_qc status');
      }
      if (noGoGauge.status === 'pending_qc') {
        throw new Error('Cannot pair NO GO gauge in pending_qc status');
      }

      // Validate matching specifications for thread gauges
      if (goGauge.equipment_type === 'thread_gauge') {
        // Fetch specifications for both gauges
        const [goSpecs] = await connection.query(
          'SELECT thread_size, thread_class, thread_form FROM gauge_thread_specifications WHERE gauge_id = ?',
          [goGaugeId]
        );
        const [noGoSpecs] = await connection.query(
          'SELECT thread_size, thread_class, thread_form FROM gauge_thread_specifications WHERE gauge_id = ?',
          [noGoGaugeId]
        );

        if (goSpecs.length === 0 || noGoSpecs.length === 0) {
          throw new Error('Both gauges must have thread specifications to be paired');
        }

        const goSpec = goSpecs[0];
        const noGoSpec = noGoSpecs[0];

        if (goSpec.thread_size !== noGoSpec.thread_size) {
          throw new Error(`Thread sizes do not match: GO gauge has ${goSpec.thread_size}, NO GO gauge has ${noGoSpec.thread_size}`);
        }
        if (goSpec.thread_class !== noGoSpec.thread_class) {
          throw new Error(`Thread classes do not match: GO gauge has ${goSpec.thread_class}, NO GO gauge has ${noGoSpec.thread_class}`);
        }
        if (goSpec.thread_form !== noGoSpec.thread_form) {
          throw new Error(`Thread forms do not match: GO gauge has ${goSpec.thread_form}, NO GO gauge has ${noGoSpec.thread_form}`);
        }
      }

      // Generate new SET ID for pairing spares
      const GaugeIdService = require('./GaugeIdService');
      const gaugeIdService = new GaugeIdService();
      const setId = await gaugeIdService.generateSetId(goGauge.categoryId);

      // Update both gauges - assign set_id only (location handled by inventory system)
      // Note: gauge_id remains the serial number, suffix is computed from is_go_gauge in specs
      const updateQuery = `
        UPDATE gauges
        SET set_id = ?, updated_at = NOW()
        WHERE id IN (?, ?)
      `;
      await connection.query(updateQuery, [
        setId,
        goGaugeId, noGoGaugeId
      ]);

      // Record location in inventory system for both gauges
      const MovementService = require('../../inventory/services/MovementService');
      const movementService = new MovementService();

      // Get gauge IDs for inventory tracking
      const [goGaugeRow] = await connection.query('SELECT gauge_id FROM gauges WHERE id = ?', [goGaugeId]);
      const [noGoGaugeRow] = await connection.query('SELECT gauge_id FROM gauges WHERE id = ?', [noGoGaugeId]);

      if (setLocation && goGaugeRow.length > 0 && noGoGaugeRow.length > 0) {
        await movementService.moveItem({
          itemType: 'gauge',
          itemIdentifier: goGaugeRow[0].gauge_id,
          toLocation: setLocation,
          movedBy: userId,
          movementType: 'paired',
          notes: `Paired into set ${setId}`
        });

        await movementService.moveItem({
          itemType: 'gauge',
          itemIdentifier: noGoGaugeRow[0].gauge_id,
          toLocation: setLocation,
          movedBy: userId,
          movementType: 'paired',
          notes: `Paired into set ${setId}`
        });
      }

      // Create audit trail
      await this._createAuditTrail(connection, goGaugeId, noGoGaugeId, 'paired_from_spares', userId, reason, {
        setId,
        location: setLocation
      });

      return { success: true, baseId: setId };
    });
  }

  /**
   * Replace a companion gauge in a set (ADDENDUM: Enhanced with checkout/pending_qc validation)
   *
   * @param {number} existingGaugeId - Existing gauge ID to keep
   * @param {number} newCompanionId - New companion gauge ID
   * @param {number} userId - User ID performing the action
   * @param {string} reason - Reason for replacement (required)
   * @returns {Promise<{success: boolean, baseId: string}>}
   */
  async replaceCompanion(existingGaugeId, newCompanionId, userId, reason) {
    if (!reason) {
      throw new Error('Reason is required for companion replacement');
    }

    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Lock and retrieve existing gauge - must be in a set
      const existingGauge = await this.validationHelper.getAndValidateGauge(existingGaugeId, connection, 'Existing gauge');

      if (!existingGauge.setId) {
        throw new Error('Existing gauge must be part of a set');
      }

      // Get all gauges in the set
      const [gaugesInSet] = await connection.query(
        'SELECT id FROM gauges WHERE set_id = ?',
        [existingGauge.setId]
      );

      if (gaugesInSet.length !== 2) {
        throw new Error('Invalid set: expected 2 gauges');
      }

      const oldCompanionId = gaugesInSet.find(g => g.id !== existingGaugeId)?.id;

      // Retrieve old companion gauge (being replaced)
      const oldCompanion = await this.validationHelper.getAndValidateGauge(oldCompanionId, connection, 'Old companion gauge');

      // Retrieve new companion and verify it's unpaired
      const newCompanion = await this.validationHelper.getAndValidateGauge(newCompanionId, connection, 'New companion gauge');

      if (newCompanion.setId) {
        throw new Error('New companion gauge must be unpaired (no set_id)');
      }

      // Validate neither gauge in set is checked out
      if (existingGauge.status === 'checked_out') {
        throw new Error('Cannot replace gauge while existing gauge in set is checked out');
      }
      if (oldCompanion.status === 'checked_out') {
        throw new Error('Cannot replace gauge while either gauge in set is checked out');
      }

      // Validate replacement not in pending_qc
      if (newCompanion.status === 'pending_qc') {
        throw new Error('Cannot use gauge in pending_qc status for replacement');
      }

      // Get set_id for the pairing
      const setId = existingGauge.setId;

      // Update new gauge location to match the set
      await this.repository.updateLocation(connection, newCompanionId, existingGauge.storageLocation);

      // Remove old companion from set (clear its set_id)
      await connection.execute(
        'UPDATE gauges SET set_id = NULL WHERE id = ?',
        [oldCompanionId]
      );

      // Add new companion to set (assign set_id)
      await connection.execute(
        'UPDATE gauges SET set_id = ? WHERE id = ?',
        [setId, newCompanionId]
      );

      // Create audit trail
      await this._createAuditTrail(connection, existingGaugeId, newCompanionId, 'replaced', userId, reason, {
        setId,
        previousCompanionId: oldCompanionId,
        replacedGaugeId: existingGaugeId,
        newCompanionId: newCompanionId
      });

      return { success: true, setId };
    });
  }

  /**
   * Unpair companion gauges (break the set)
   *
   * @param {number} gaugeId - ID of either gauge in the set
   * @param {number} userId - User ID performing the action
   * @param {string} reason - Reason for unpairing (optional)
   * @returns {Promise<{success: boolean}>}
   */
  async unpairGauges(gaugeId, userId, reason) {
    // Reason is optional - use default if not provided
    const unpairReason = reason || 'No reason provided';

    return await this.transactionHelper.executeInSimpleTransaction(async (connection) => {
      // Get gauge - must have set_id
      const gauge = await this.validationHelper.getAndValidateGauge(gaugeId, connection);

      if (!gauge.setId) {
        throw new Error('Gauge is not part of a set');
      }

      // Get all gauges in the set (should be 2 for thread gauge sets)
      const [gaugesInSet] = await connection.query(
        'SELECT id FROM gauges WHERE set_id = ?',
        [gauge.setId]
      );

      if (gaugesInSet.length !== 2) {
        throw new Error('Invalid set: expected 2 gauges');
      }

      const gaugeIds = gaugesInSet.map(g => g.id);
      const companionId = gaugeIds.find(id => id !== gaugeId);

      // Determine GO and NO GO for audit trail from specifications
      const [specs] = await connection.query(
        'SELECT gauge_id, is_go_gauge FROM gauge_thread_specifications WHERE gauge_id IN (?, ?)',
        [gaugeId, companionId]
      );

      const goGaugeId = specs.find(s => s.is_go_gauge)?.gauge_id || gaugeId;
      const noGoGaugeId = specs.find(s => !s.is_go_gauge)?.gauge_id || companionId;

      // Unpair: clear set_id from both gauges
      await this.repository.unpairGauges(connection, gaugeId, companionId);

      // Create audit trail
      await this._createAuditTrail(connection, goGaugeId, noGoGaugeId, 'unpaired', userId, unpairReason, {
        setId: gauge.setId,
        gaugeId: gauge.gaugeId,
        companionId: companionId
      });

      return { success: true };
    });
  }

  /**
   * Unpair gauge set (ADDENDUM: Relationship Operations)
   *
   * @param {number} gaugeId - ID of either gauge in the set
   * @param {number} userId - User ID performing the action
   * @param {string} [reason] - Optional reason for unpairing
   * @returns {Promise<{gauge: GaugeEntity, formerCompanion: GaugeEntity}>}
   * @throws {Error} If gauge is not part of a set
   */
  async unpairSet(gaugeId, userId, reason = null) {
    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // 1. Get gauge - must have set_id
      const gauge = await this.validationHelper.getAndValidateGauge(gaugeId, connection, 'Gauge');

      if (!gauge.setId) {
        throw new Error('Gauge is not part of a set');
      }

      // 2. Get all gauges in the set
      const [gaugesInSet] = await connection.query(
        'SELECT id FROM gauges WHERE set_id = ?',
        [gauge.setId]
      );

      if (gaugesInSet.length !== 2) {
        throw new Error('Invalid set: expected 2 gauges');
      }

      const companionId = gaugesInSet.find(g => g.id !== gaugeId)?.id;

      // 3. Determine GO and NO GO from specifications
      const [specs] = await connection.query(
        'SELECT gauge_id, is_go_gauge FROM gauge_thread_specifications WHERE gauge_id IN (?, ?)',
        [gaugeId, companionId]
      );

      const goGaugeId = specs.find(s => s.is_go_gauge)?.gauge_id || gaugeId;
      const noGoGaugeId = specs.find(s => !s.is_go_gauge)?.gauge_id || companionId;

      // 4. Record in history BEFORE unpairing
      await this._createAuditTrail(connection, goGaugeId, noGoGaugeId, 'unpaired', userId, reason, {
        initiatedBy: gaugeId,
        setId: gauge.setId,
        gaugeId: gauge.gaugeId,
        companionId: companionId
      });

      // 5. Unpair both gauges (clear set_id)
      await this.repository.unpairGauges(connection, gaugeId, companionId);

      // 6. Return both gauges (fetch fresh data after unpair)
      const unpairedGauge = await this.repository.getGaugeById(gaugeId, connection);
      const unpairedCompanion = await this.repository.getGaugeById(companionId, connection);

      return {
        gauge: unpairedGauge,
        formerCompanion: unpairedCompanion
      };
    });
  }

  /**
   * Retire gauge set (soft delete both gauges, preserves set_id for history)
   *
   * @param {number} gaugeId - ID of either gauge in the set
   * @param {number} userId - User ID performing the action
   * @param {string} reason - Reason for retirement (required)
   * @returns {Promise<{success: boolean, setId: string}>}
   * @throws {Error} If gauge is not part of a set or reason not provided
   */
  async retireSet(gaugeId, userId, reason) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required for retiring a gauge set');
    }

    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // 1. Get gauge - must have set_id
      const gauge = await this.validationHelper.getAndValidateGauge(gaugeId, connection, 'Gauge');

      if (!gauge.setId) {
        throw new Error('Gauge is not part of a set');
      }

      // 2. Get all gauges in the set
      const [gaugesInSet] = await connection.query(
        'SELECT id FROM gauges WHERE set_id = ? AND is_deleted = 0',
        [gauge.setId]
      );

      if (gaugesInSet.length !== 2) {
        throw new Error('Invalid set: expected 2 active gauges');
      }

      const companionId = gaugesInSet.find(g => g.id !== gaugeId)?.id;

      // 3. Determine GO and NO GO from specifications
      const [specs] = await connection.query(
        'SELECT gauge_id, is_go_gauge FROM gauge_thread_specifications WHERE gauge_id IN (?, ?)',
        [gaugeId, companionId]
      );

      const goGaugeId = specs.find(s => s.is_go_gauge)?.gauge_id || gaugeId;
      const noGoGaugeId = specs.find(s => !s.is_go_gauge)?.gauge_id || companionId;

      // 4. Soft delete both gauges (keeps set_id intact for historical reference)
      await connection.query(
        'UPDATE gauges SET is_deleted = 1, status = \'retired\', updated_at = NOW() WHERE id IN (?, ?)',
        [goGaugeId, noGoGaugeId]
      );

      // 5. Record in history AFTER deletion
      await this._createAuditTrail(connection, goGaugeId, noGoGaugeId, 'retired', userId, reason, {
        initiatedBy: gaugeId,
        setId: gauge.setId,
        gaugeId: gauge.gaugeId,
        companionId: companionId,
        retirementReason: reason
      });

      return {
        success: true,
        setId: gauge.setId,
        message: `Gauge set ${gauge.setId} retired successfully`
      };
    });
  }

  /**
   * Update gauge set properties (storage location and notes)
   * Updates both gauges in the set simultaneously
   *
   * @param {string} setId - Set ID
   * @param {object} updateData - Update data { storage_location?, notes? }
   * @param {number} userId - User ID performing the update
   * @returns {Promise<{success: boolean, setId: string}>}
   * @throws {Error} If set not found or validation fails
   */
  async updateSet(setId, updateData, userId) {
    const { storage_location, notes } = updateData;

    if (!storage_location && notes === undefined) {
      throw new Error('No update data provided. Provide storage_location or notes.');
    }

    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // 1. Get all gauges in the set
      const [gaugesInSet] = await connection.query(
        'SELECT id, gauge_id FROM gauges WHERE set_id = ? AND is_deleted = 0',
        [setId]
      );

      if (gaugesInSet.length !== 2) {
        throw new Error(gaugesInSet.length === 0 ? 'Gauge set not found' : `Invalid set: expected 2 gauges, found ${gaugesInSet.length}`);
      }

      const goGaugeId = gaugesInSet[0].id;
      const noGoGaugeId = gaugesInSet[1].id;
      const goGaugeSerialNumber = gaugesInSet[0].gauge_id;
      const noGoGaugeSerialNumber = gaugesInSet[1].gauge_id;

      // 2. Update storage location via inventory system if provided
      if (storage_location) {
        const MovementService = require('../../inventory/services/MovementService');
        const movementService = new MovementService();

        // Move both gauges to new location
        await movementService.moveItem({
          itemType: 'gauge',
          itemIdentifier: goGaugeSerialNumber,
          toLocation: storage_location,
          movedBy: userId,
          movementType: 'transfer',
          notes: `Set ${setId} storage location updated`
        });

        await movementService.moveItem({
          itemType: 'gauge',
          itemIdentifier: noGoGaugeSerialNumber,
          toLocation: storage_location,
          movedBy: userId,
          movementType: 'transfer',
          notes: `Set ${setId} storage location updated`
        });
      }

      // 3. Update notes if provided (stored per-gauge but synchronized)
      if (notes !== undefined) {
        // Update both gauges' notes field
        await connection.query(
          'UPDATE gauges SET notes = ?, updated_at = NOW() WHERE id IN (?, ?)',
          [notes, goGaugeId, noGoGaugeId]
        );
      }

      // 4. Create audit trail
      await this._createAuditTrail(
        connection,
        goGaugeId,
        noGoGaugeId,
        'set_updated',
        userId,
        'Gauge set properties updated',
        {
          setId,
          updates: {
            storage_location: storage_location || 'unchanged',
            notes: notes !== undefined ? 'updated' : 'unchanged'
          }
        }
      );

      return {
        success: true,
        setId,
        message: 'Gauge set updated successfully'
      };
    });
  }

  /**
   * Find spare gauges (without companions) by category and suffix
   */
  async findSpareGauges(categoryId, suffix, status = 'available') {
    return await this.repository.findSpareGauges(categoryId, suffix, status);
  }

  /**
   * Get gauge set by base ID
   */
  async getGaugeSetByBaseId(baseId) {
    const result = await this.repository.getGaugeSetByBaseId(baseId);
    return { ...result, isComplete: !!(result.goGauge && result.noGoGauge) };
  }

  /**
   * Validate gauge set compatibility without persisting
   */
  async validateGaugeSetCompatibility(goGaugeId, noGoGaugeId) {
    try {
      // Retrieve gauges without locking
      const goGauge = await this.repository.getGaugeById(goGaugeId);
      const noGoGauge = await this.repository.getGaugeById(noGoGaugeId);

      if (!goGauge) {
        return { valid: false, errors: [`GO gauge with ID ${goGaugeId} not found`] };
      }
      if (!noGoGauge) {
        return { valid: false, errors: [`NO GO gauge with ID ${noGoGaugeId} not found`] };
      }

      // Get category and extract base ID
      const category = await this.validationHelper.getCategory(goGauge.categoryId);
      const baseId = this.validationHelper.extractBaseId(goGauge.systemGaugeId);

      // Validate with domain model
      new GaugeSet({ baseId, goGauge, noGoGauge, category });

      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof DomainValidationError) {
        return { valid: false, errors: [error.message] };
      }
      throw error;
    }
  }

  /**
   * Private helper: Create audit trail
   */
  async _createAuditTrail(connection, goGaugeId, noGoGaugeId, action, userId, reason, metadata) {
    await this.repository.createSetHistory(
      connection,
      goGaugeId,
      noGoGaugeId,
      action,
      userId,
      reason,
      metadata
    );
  }

  /**
   * SERIAL NUMBER SYSTEM: Pair two spare thread gauges by serial number
   *
   * @param {string} goSerialNumber - GO gauge serial number
   * @param {string} noGoSerialNumber - NO GO gauge serial number
   * @param {object} sharedData - Shared data (storage_location, etc.)
   * @param {number} userId - User ID performing the action
   * @returns {Promise<{setId: string, goGaugeId: number, noGoGaugeId: number}>}
   * @throws {Error} If gauges not found or validation fails
   */
  async pairSpares(goSerialNumber, noGoSerialNumber, sharedData, userId) {
    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Get or create GaugeRepository for serial number lookups
      const GaugeRepository = require('../repositories/GaugeRepository');
      const gaugeRepo = this.gaugeRepository || new GaugeRepository();

      // Find gauges by serial number
      const goGauge = await gaugeRepo.findBySerialNumber(goSerialNumber, connection);
      const noGoGauge = await gaugeRepo.findBySerialNumber(noGoSerialNumber, connection);

      if (!goGauge || !noGoGauge) {
        throw new Error('One or both gauges not found');
      }

      // Validate both are unpaired spares (set_id IS NULL)
      if (goGauge.set_id !== null || noGoGauge.set_id !== null) {
        throw new Error('Both gauges must be unpaired spares (set_id must be NULL)');
      }

      // Validate basic compatibility (same category and equipment type)
      if (goGauge.category_id !== noGoGauge.category_id) {
        throw new Error('Gauges must have the same category');
      }
      if (goGauge.equipment_type !== 'thread_gauge' || noGoGauge.equipment_type !== 'thread_gauge') {
        throw new Error('Both gauges must be thread gauges');
      }

      // Generate or use custom SET ID (SP####)
      let setId;
      if (customSetId) {
        // Validate custom set ID doesn't already exist
        const [existingSets] = await connection.query(
          'SELECT id FROM gauges WHERE set_id = ? LIMIT 1',
          [customSetId]
        );
        if (existingSets.length > 0) {
          throw new Error(`Set ID "${customSetId}" already exists. Please choose a different ID.`);
        }
        setId = customSetId;
      } else {
        // Auto-generate set ID
        const GaugeIdService = require('./GaugeIdService');
        const gaugeIdService = new GaugeIdService(); // Uses default GaugeIdRepository
        setId = await gaugeIdService.generateSetId(goGauge.category_id);
      }

      // SERIAL NUMBER SYSTEM: When pairing spares into a set
      // - gauge_id becomes the set ID with A/B suffix (e.g., SP0001A, SP0001B)
      // - set_id is set to the base set ID (e.g., SP0001) for both gauges
      const goGaugeId = `${setId}A`;
      const noGoGaugeId = `${setId}B`;

      // Update GO gauge - set gauge_id with A suffix and set_id for set membership
      const updateGoQuery = `
        UPDATE gauges
        SET gauge_id = ?, set_id = ?, updated_at = NOW()
        WHERE id = ?
      `;
      await connection.query(updateGoQuery, [
        goGaugeId, setId,
        goGauge.id
      ]);

      // Update NO GO gauge - set gauge_id with B suffix and set_id for set membership
      const updateNoGoQuery = `
        UPDATE gauges
        SET gauge_id = ?, set_id = ?, updated_at = NOW()
        WHERE id = ?
      `;
      await connection.query(updateNoGoQuery, [
        noGoGaugeId, setId,
        noGoGauge.id
      ]);

      // Record location in inventory system if provided
      const storageLocation = sharedData.storage_location || sharedData.location;
      if (storageLocation) {
        const MovementService = require('../../inventory/services/MovementService');
        const movementService = new MovementService();

        await movementService.moveItem({
          itemType: 'gauge',
          itemIdentifier: goGaugeId,
          toLocation: storageLocation,
          movedBy: userId,
          movementType: 'paired',
          notes: `Paired spare S/N ${goSerialNumber} into set ${setId}`
        });

        await movementService.moveItem({
          itemType: 'gauge',
          itemIdentifier: noGoGaugeId,
          toLocation: storageLocation,
          movedBy: userId,
          movementType: 'paired',
          notes: `Paired spare S/N ${noGoSerialNumber} into set ${setId}`
        });
      }

      // Create audit trail
      await this._createAuditTrail(
        connection,
        goGauge.id,
        noGoGauge.id,
        'paired',
        userId,
        `Paired spares S/N ${goSerialNumber} and ${noGoSerialNumber} into set ${setId}`,
        { setId, goSerialNumber, noGoSerialNumber }
      );

      return { setId, goGaugeId: goGauge.id, noGoGaugeId: noGoGauge.id };
    });
  }

  /**
   * SERIAL NUMBER SYSTEM: Unpair a gauge set by set ID
   *
   * @param {string} setId - Set ID (gauge_id shared by both gauges)
   * @param {number} userId - User ID performing the action
   * @returns {Promise<{goGaugeId: number, noGoGaugeId: number}>}
   * @throws {Error} If set not found or validation fails
   */
  async unpairSetBySetId(setId, userId) {
    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Find both gauges in the set by set_id
      const findQuery = 'SELECT * FROM gauges WHERE set_id = ?';
      const [gauges] = await connection.query(findQuery, [setId]);

      if (gauges.length !== 2) {
        throw new Error(`Set ${setId} does not have exactly 2 gauges`);
      }

      const [goGauge, noGoGauge] = gauges;

      // Clear set_id to return both gauges to unpaired state
      // Note: gauge_id (serial number) remains unchanged
      const unpairQuery = `
        UPDATE gauges
        SET set_id = NULL, updated_at = NOW()
        WHERE id IN (?, ?)
      `;
      await connection.query(unpairQuery, [goGauge.id, noGoGauge.id]);

      // Create audit trail
      await this._createAuditTrail(
        connection,
        goGauge.id,
        noGoGauge.id,
        'unpaired',
        userId,
        `Unpaired set ${setId}, gauges returned to unpaired state`,
        { setId }
      );

      return { goGaugeId: goGauge.id, noGoGaugeId: noGoGauge.id };
    });
  }

  /**
   * SERIAL NUMBER SYSTEM: Replace a gauge in a set
   *
   * @param {string} setId - Set ID
   * @param {string} oldSerialNumber - Serial number of gauge to remove
   * @param {string} newSerialNumber - Serial number of replacement gauge
   * @param {number} userId - User ID performing the action
   * @returns {Promise<{setId: string, oldGaugeId: number, newGaugeId: number}>}
   * @throws {Error} If validation fails
   */
  async replaceGaugeInSet(setId, oldSerialNumber, newSerialNumber, userId) {
    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Get or create GaugeRepository for serial number lookups
      const GaugeRepository = require('../repositories/GaugeRepository');
      const gaugeRepo = this.gaugeRepository || new GaugeRepository();

      // Find gauges
      const oldGauge = await gaugeRepo.findBySerialNumber(oldSerialNumber, connection);
      const newGauge = await gaugeRepo.findBySerialNumber(newSerialNumber, connection);

      if (!oldGauge || !newGauge) {
        throw new Error('One or both gauges not found');
      }

      // Validate old gauge is in the set
      if (oldGauge.set_id !== setId) {
        throw new Error(`Gauge with S/N ${oldSerialNumber} is not part of set ${setId}`);
      }

      // Validate new gauge is a spare (no set_id)
      if (newGauge.set_id !== null) {
        throw new Error(`Gauge with S/N ${newSerialNumber} must be an unpaired spare (no set_id)`);
      }

      // Validate basic compatibility
      if (oldGauge.category_id !== newGauge.category_id) {
        throw new Error('Replacement gauge must have the same category');
      }
      if (newGauge.equipment_type !== 'thread_gauge') {
        throw new Error('Replacement gauge must be a thread gauge');
      }

      // Get companion gauge ID from the set
      const [gaugesInSet] = await connection.query(
        'SELECT id, gauge_id FROM gauges WHERE set_id = ?',
        [setId]
      );
      const companionId = gaugesInSet.find(g => g.id !== oldGauge.id)?.id;

      // Determine suffix from old gauge's gauge_id
      const GaugeIdService = require('./GaugeIdService');
      const gaugeSuffix = GaugeIdService.getGaugeSuffix(oldGauge.gauge_id);

      // SERIAL NUMBER SYSTEM: Return old gauge to spare state
      // Clear both gauge_id and set_id to mark as spare
      const removeQuery = `
        UPDATE gauges
        SET gauge_id = NULL, set_id = NULL, updated_at = NOW()
        WHERE id = ?
      `;
      await connection.query(removeQuery, [oldGauge.id]);

      // Add new gauge to set - assign gauge_id with suffix and set_id
      const newGaugeId = `${setId}${gaugeSuffix}`;
      const addQuery = `
        UPDATE gauges
        SET gauge_id = ?, set_id = ?, updated_at = NOW()
        WHERE id = ?
      `;
      await connection.query(addQuery, [
        newGaugeId, setId,
        newGauge.id
      ]);

      // Get current location from inventory system and move new gauge there
      const MovementService = require('../../inventory/services/MovementService');
      const movementService = new MovementService();

      try {
        // Get old gauge location from inventory
        const oldLocation = await movementService.getCurrentLocation('gauge', oldGauge.gauge_id);

        if (oldLocation && oldLocation.current_location) {
          // Move new gauge to same location
          await movementService.moveItem({
            itemType: 'gauge',
            itemIdentifier: newGaugeId,
            toLocation: oldLocation.current_location,
            movedBy: userId,
            movementType: 'replaced',
            notes: `Replaced gauge S/N ${oldSerialNumber} in set ${setId}`
          });
        }
      } catch (err) {
        // Location tracking is optional - log but don't fail the operation
        logger.error('Failed to track replacement location:', { error: err.message });
      }

      // Create audit trail
      await this._createAuditTrail(
        connection,
        newGauge.id,
        companionId,
        'gauge_replaced',
        userId,
        `Replaced S/N ${oldSerialNumber} with S/N ${newSerialNumber} in set ${setId}`,
        { setId, oldSerialNumber, newSerialNumber, oldGaugeId: oldGauge.id }
      );

      return { setId, oldGaugeId: oldGauge.id, newGaugeId: newGauge.id };
    });
  }
}

module.exports = GaugeSetService;
