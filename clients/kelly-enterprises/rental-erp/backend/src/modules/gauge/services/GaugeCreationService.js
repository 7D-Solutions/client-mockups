const BaseService = require('../../../infrastructure/services/BaseService');
const auditService = require('../../../infrastructure/audit/auditService');
const logger = require('../../../infrastructure/utils/logger');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const MovementService = require('../../inventory/services/MovementService');

/**
 * GaugeCreationService - Focused on gauge creation, updates, and workflow management
 * Handles gauge creation workflows, gauge sets, and deletion
 * Note: Display name generation moved to GaugePresenter (presentation layer)
 */
class GaugeCreationService extends BaseService {
  constructor(gaugeRepository, gaugeSetRepository, gaugeReferenceRepository, options = {}) {
    super(gaugeRepository, options);
    this.gaugeSetRepository = gaugeSetRepository;
    this.gaugeReferenceRepository = gaugeReferenceRepository;
    this.auditService = auditService;
    this.movementService = new MovementService(); // Inventory integration
  }

  /**
   * Private helper: Log audit action with consistent formatting
   */
  async _logAuditAction(action, recordId, userId, details = {}) {
    await this.auditService.logAction({
      module: 'gauge',
      action,
      tableName: 'gauges',
      recordId,
      userId: userId || null,
      ipAddress: details.ipAddress || '127.0.0.1',
      ...details
    });
  }

  /**
   * Private helper: Validate gauge set specifications match
   */
  _validateGaugeSetSpecs(goData, noGoData) {
    if (goData.thread_size !== noGoData.thread_size ||
        goData.thread_form !== noGoData.thread_form ||
        goData.thread_class !== noGoData.thread_class) {
      throw new Error('Companion gauges must have matching specifications');
    }
  }

  /**
   * Private helper: Check if set ID was used historically (prevents reuse after unpair)
   */
  async _checkSetIdHistoricalUsage(setId, connection) {
    const [rows] = await connection.query(
      `SELECT COUNT(*) as count
       FROM companion_history
       WHERE JSON_EXTRACT(metadata, '$.setId') = ?
          OR JSON_EXTRACT(metadata, '$.baseId') = ?`,
      [setId, setId]
    );

    if (rows[0].count > 0) {
      throw new Error(
        `Set ID "${setId}" was previously used and cannot be reused. ` +
        `This prevents audit trail confusion. Please choose a different ID.`
      );
    }
  }

  /**
   * Private helper: Prepare gauge data for set creation
   * NEW SYSTEM: Uses gauge_id for individual gauges, set_id for grouping, is_go_gauge for GO/NO GO designation
   * CUSTOMIZABLE IDs: gauge_id can be provided or auto-generated. serial_number is separate and optional.
   */
  _prepareGaugeForSet(gaugeData, setId, isGoGauge, userId) {
    // Note: gauge_id handling for sets is done in createGaugeSet method
    // This helper just prepares the data structure

    // Build specifications with is_go_gauge
    const specifications = gaugeData.spec || {
      thread_size: gaugeData.thread_size,
      thread_class: gaugeData.thread_class,
      thread_type: gaugeData.thread_type,
      thread_form: gaugeData.thread_form,
      gauge_type: gaugeData.gauge_type,
      thread_hand: gaugeData.thread_hand,
      acme_starts: gaugeData.acme_starts
    };

    // Add is_go_gauge to specifications
    specifications.is_go_gauge = isGoGauge;

    return {
      ...gaugeData,
      set_id: setId,
      created_by: userId,
      spec: specifications
    };
  }

  /**
   * Private helper: Extract old/new values for audit trail
   */
  _extractAuditValues(oldGauge, updates) {
    return Object.keys(updates).reduce((acc, key) => {
      acc.oldValues[key] = oldGauge[key];
      acc.newValues[key] = updates[key];
      return acc;
    }, { oldValues: {}, newValues: {} });
  }

  /**
   * Create a new gauge
   * NEW SYSTEM: Uses gauge_id for all equipment types. Thread gauges can be unpaired (no set_id) or paired (with set_id).
   * CUSTOMIZABLE IDs: gauge_id can be provided by user or auto-generated. serial_number is separate and optional.
   * FIX: Wrapped entire operation in single transaction to prevent race conditions
   * @param {Object} gaugeData - Gauge data
   * @param {number} userId - User creating the gauge
   * @returns {Promise<Object>} Created gauge
   */
  async createGauge(gaugeData, userId) {
    // FIX: Wrap entire operation in single transaction
    return this.executeInTransaction(async (connection) => {
      // Get validation service
      const validationService = serviceRegistry.get('GaugeValidationService');

      // Normalize and validate thread fields
      gaugeData = validationService.normalizeThreadData(gaugeData);

      // Get ID generation service
      const gaugeIdService = serviceRegistry.get('GaugeIdService');

      // Validate required fields
      if (!gaugeData.name || !gaugeData.equipment_type || !gaugeData.category_id) {
        throw new Error('Name, equipment type, and category are required');
      }

      // Handle gauge_id: either custom or auto-generated
      // FIX: All validation and ID generation now happens inside the same transaction
      if (gaugeData.gauge_id) {
        // User provided custom gauge_id - validate it WITH row locking
        const validation = await gaugeIdService.validateCustomGaugeId(
          gaugeData.gauge_id,
          gaugeData.category_id,
          gaugeData.gauge_type || null,
          gaugeData.spec?.is_go_gauge !== undefined ? gaugeData.spec.is_go_gauge : null,
          connection,  // FIX: Pass connection for transaction safety
          true         // FIX: Enable FOR UPDATE locking
        );

        if (!validation.valid) {
          throw new Error(validation.message);
        }

        if (!validation.available) {
          throw new Error(
            `${validation.message}. Suggested ID: ${validation.suggestedId}`
          );
        }

        logger.info('Using custom gauge ID', {
          customGaugeId: gaugeData.gauge_id,
          categoryId: gaugeData.category_id
        });
      } else {
        // Auto-generate gauge_id
        // FIX: Pass connection to generateSystemId so ID generation happens in same transaction
        const isThreadGauge = gaugeData.equipment_type === 'thread_gauge';
        const gaugeType = gaugeData.gauge_type || null;
        const isGoGauge = gaugeData.spec?.is_go_gauge !== undefined
          ? gaugeData.spec.is_go_gauge
          : null;

        gaugeData.gauge_id = await gaugeIdService.generateSystemId(
          gaugeData.category_id,
          isThreadGauge ? gaugeType : null,
          isThreadGauge ? isGoGauge : null,
          connection  // FIX: Pass connection for transaction safety
        );

        logger.info('Generated gauge ID', {
          generatedGaugeId: gaugeData.gauge_id,
          categoryId: gaugeData.category_id,
          gaugeType,
          isGoGauge
        });
      }

      // Create gauge (displayName will be generated by GaugePresenter in presentation layer)
      // FIX: Pass connection to ensure INSERT happens in same transaction
      const gauge = await this.repository.createGauge({
        ...gaugeData,
        created_by: userId
      }, connection);

      // Log creation (audit happens in same transaction)
      await this._logAuditAction('gauge_created', gauge.id, userId, {
        ipAddress: gaugeData.ip_address,
        details: {
          gauge_id: gaugeData.gauge_id,
          set_id: gaugeData.set_id || null,
          serial_number: gaugeData.serial_number || null,
          name: gaugeData.name,
          equipment_type: gaugeData.equipment_type
        }
      });

      // Record initial location in inventory system (location must be passed in via gaugeData.location)
      if (gaugeData.location) {
        try {
          await this.movementService.moveItem({
            itemType: 'gauge',
            itemIdentifier: gaugeData.gauge_id,
            toLocation: gaugeData.location,
            movedBy: userId,
            movementType: 'created',
            notes: `Gauge created: ${gaugeData.name}`
          });
          logger.info('Gauge location recorded in inventory', {
            gaugeId: gaugeData.gauge_id,
            location: gaugeData.location
          });
        } catch (inventoryError) {
          logger.error('Failed to record gauge in inventory', {
            gaugeId: gaugeData.gauge_id,
            location: gaugeData.location,
            error: inventoryError.message
          });
          // Don't fail the whole operation if inventory update fails
        }
      }

      // Insert initial note if provided (for calibration standards and other equipment)
      if (gaugeData.notes) {
        try {
          await connection.execute(
            `INSERT INTO gauge_notes (gauge_id, user_id, note_type, note, created_at)
             VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
            [gauge.id, userId, 'general', gaugeData.notes]
          );
          logger.info('Gauge note recorded', {
            gaugeId: gauge.id,
            gaugeIdentifier: gaugeData.gauge_id
          });
        } catch (noteError) {
          logger.error('Failed to record gauge note', {
            gaugeId: gauge.id,
            error: noteError.message
          });
          // Don't fail the whole operation if note insertion fails
        }
      }

      // Create calibration schedule if frequency provided (for calibration standards and other equipment)
      if (gaugeData.calibration_frequency_days) {
        try {
          // Calculate next due date from today
          const today = new Date();
          const nextDueDate = new Date(today);
          nextDueDate.setDate(nextDueDate.getDate() + parseInt(gaugeData.calibration_frequency_days));

          await connection.execute(
            `INSERT INTO gauge_calibration_schedule (gauge_id, frequency_days, next_due_date, auto_notify_days, is_active)
             VALUES (?, ?, ?, ?, ?)`,
            [gauge.id, parseInt(gaugeData.calibration_frequency_days), nextDueDate, 30, 1]
          );
          logger.info('Gauge calibration schedule created', {
            gaugeId: gauge.id,
            gaugeIdentifier: gaugeData.gauge_id,
            frequencyDays: gaugeData.calibration_frequency_days,
            nextDueDate: nextDueDate.toISOString()
          });
        } catch (scheduleError) {
          logger.error('Failed to create calibration schedule', {
            gaugeId: gauge.id,
            error: scheduleError.message
          });
          // Don't fail the whole operation if schedule creation fails
        }
      }

      return gauge;
    });
  }

  /**
   * Update an existing gauge
   * @param {number} id - Gauge ID
   * @param {Object} updates - Update data
   * @param {number} userId - User making the update
   * @returns {Promise<Object>} Updated gauge
   */
  async updateGauge(id, updates, userId = null) {
    const oldGauge = await this.repository.getGaugeById(id);
    const { oldValues, newValues } = this._extractAuditValues(oldGauge, updates);

    logger.info('Updating gauge', { gaugeId: id, oldValues, newValues });

    const gauge = await this.repository.updateGauge(id, updates);

    await this.auditService.logAction({
      module: 'gauge',
      action: 'gauge_updated',
      tableName: 'gauges',
      recordId: id,
      userId,
      ipAddress: '127.0.0.1',
      oldValues,
      newValues
    });

    return gauge;
  }

  /**
   * Delete a gauge (soft delete)
   * @param {number} id - Gauge ID
   * @param {number} userId - User deleting the gauge
   * @returns {Promise<Object>} Deletion result
   */
  async deleteGauge(id, userId = null) {
    const result = await this.repository.softDelete(id);
    await this._logAuditAction('gauge_deleted', id, userId);
    return result;
  }

  // ========== DISPLAY NAME GENERATION REMOVED ==========
  // Note: Display name generation has been moved to GaugePresenter (presentation layer)
  // for better separation of concerns and single source of truth.
  // See: backend/src/modules/gauge/presenters/GaugePresenter.js

  // ========== GAUGE SET CREATION ==========
  
  /**
   * Create a gauge set (GO/NO GO pair) with proper validation and transaction safety
   * NEW SYSTEM: Uses set_id for grouping, individual gauge_id for each gauge, is_go_gauge in specs
   * @param {Object} goGaugeData - Data for the GO gauge
   * @param {Object} noGoGaugeData - Data for the NO GO gauge
   * @param {number} userId - User creating the set
   * @returns {Promise<Object>} Result with goId, noGoId, and setId
   */
  async createGaugeSet(goGaugeData, noGoGaugeData, userId) {
    return this.executeInTransaction(async (connection) => {
      // DEBUG: Log incoming data to trace custom_set_id
      logger.info('🔍 createGaugeSet called with data:', {
        goGauge_custom_set_id: goGaugeData.custom_set_id,
        goGauge_keys: Object.keys(goGaugeData),
        noGoGauge_custom_set_id: noGoGaugeData.custom_set_id
      });

      // Validate NPT cannot have companions
      const category = await this.gaugeReferenceRepository.getCategoryById(goGaugeData.category_id, connection);

      if (!category) {
        throw new Error(`Category not found: ${goGaugeData.category_id}`);
      }

      if (category.name === 'NPT') {
        throw new Error('NPT gauges cannot have companion pairs');
      }

      // Validate matching specifications
      this._validateGaugeSetSpecs(goGaugeData, noGoGaugeData);

      // Use custom set ID if provided, otherwise generate one
      const gaugeIdService = serviceRegistry.get('GaugeIdService');
      let setId;

      if (goGaugeData.custom_set_id) {
        // User provided custom set ID
        setId = goGaugeData.custom_set_id;
        logger.info('Using custom set ID', { customSetId: setId });

        // Validate that custom set ID doesn't already exist
        const existingGauges = await this.repository.findBySetId(setId, connection);
        logger.info('Checked for existing gauges with set ID', {
          setId,
          found: existingGauges?.length || 0
        });

        if (existingGauges && existingGauges.length > 0) {
          logger.warn('Custom set ID already exists', {
            setId,
            existingCount: existingGauges.length,
            existingIds: existingGauges.map(g => g.gauge_id)
          });
          throw new Error(`Set ID "${setId}" already exists. Please choose a different ID.`);
        }

        // Check if set ID was used historically (prevents reuse after unpair/retire)
        await this._checkSetIdHistoricalUsage(setId, connection);

        logger.info('Custom set ID validated successfully', { setId });
      } else {
        // Generate set ID automatically (base ID for the set)
        logger.info('No custom set ID provided, generating automatically');
        setId = await gaugeIdService.generateSystemId(
          goGaugeData.category_id,
          goGaugeData.spec?.gauge_type || goGaugeData.gauge_type,
          null
        );
        logger.info('Generated automatic set ID', { setId });

        // Check if auto-generated ID was used historically (prevents reuse)
        await this._checkSetIdHistoricalUsage(setId, connection);
      }

      logger.info('Preparing gauge set (serial_number required for each gauge)', {
        setId,
        goSerialNumber: goGaugeData.serial_number,
        noGoSerialNumber: noGoGaugeData.serial_number
      });

      // Prepare both gauges with set_id and is_go_gauge
      const goGaugeWithId = this._prepareGaugeForSet(goGaugeData, setId, true, userId);
      const noGoGaugeWithId = this._prepareGaugeForSet(noGoGaugeData, setId, false, userId);

      // Generate individual gauge_id for each gauge in the set
      // GO gauge gets suffix 'A', NO GO gauge gets suffix 'B'
      goGaugeWithId.gauge_id = `${setId}-A`;
      noGoGaugeWithId.gauge_id = `${setId}-B`;

      logger.info('Generated individual gauge IDs for set', {
        setId,
        goGaugeId: goGaugeWithId.gauge_id,
        noGoGaugeId: noGoGaugeWithId.gauge_id
      });

      // Create both gauges (set_id and gauge_id are now included)
      const goGauge = await this.repository.createGauge(goGaugeWithId, connection);
      const noGoGauge = await this.repository.createGauge(noGoGaugeWithId, connection);

      // Record both gauges in inventory system (location must be passed in via gaugeData)
      const storageLocation = goGaugeData.location || noGoGaugeData.location;
      if (storageLocation) {
        try {
          // Record GO gauge location
          await this.movementService.moveItem({
            itemType: 'gauge',
            itemIdentifier: goGaugeWithId.gauge_id,
            toLocation: storageLocation,
            movedBy: userId,
            movementType: 'created',
            notes: `Gauge set created: ${goGaugeData.name} (GO)`
          });

          // Record NO-GO gauge location
          await this.movementService.moveItem({
            itemType: 'gauge',
            itemIdentifier: noGoGaugeWithId.gauge_id,
            toLocation: storageLocation,
            movedBy: userId,
            movementType: 'created',
            notes: `Gauge set created: ${noGoGaugeData.name} (NO-GO)`
          });

          logger.info('Gauge set locations recorded in inventory', {
            setId,
            goGaugeId: goGaugeWithId.gauge_id,
            noGoGaugeId: noGoGaugeWithId.gauge_id,
            location: storageLocation
          });
        } catch (inventoryError) {
          logger.error('Failed to record gauge set in inventory', {
            setId,
            location: storageLocation,
            error: inventoryError.message
          });
          // Don't fail the whole operation if inventory update fails
        }
      }

      // Add audit trail
      await this.auditService.logAction({
        user_id: userId,
        module: 'gauge',
        action: 'create_gauge_set',
        entity_type: 'gauge',
        entity_id: goGauge.id,
        changes: {
          set_created: {
            go_id: goGauge.id,
            nogo_id: noGoGauge.id,
            set_id: setId
          }
        }
      });

      logger.info('Created gauge set successfully', {
        goId: goGauge.id,
        noGoId: noGoGauge.id,
        setId: setId,
        userId
      });

      // Fetch the complete gauges with updated set_id and specifications
      const GaugeDTOMapper = require('../mappers/GaugeDTOMapper');
      const completeGoGauge = await this.repository.getGaugeById(goGauge.id, connection);
      const completeNoGoGauge = await this.repository.getGaugeById(noGoGauge.id, connection);

      return {
        go: GaugeDTOMapper.transformToDTO(completeGoGauge),
        noGo: GaugeDTOMapper.transformToDTO(completeNoGoGauge),
        setId: setId
      };
    });
  }

  /**
   * Get a gauge set by gauge ID
   * NEW SYSTEM: Uses set_id to find all gauges in the set
   * @param {number} gaugeId - ID of either gauge in the set
   * @returns {Promise<Object>} Object with gauges array and completion status
   */
  async getGaugeSet(gaugeId) {
    const gauge = await this.getGaugeById(gaugeId);
    if (!gauge) {
      throw new Error(`Gauge not found: ${gaugeId}`);
    }

    // Single gauge (no set)
    if (!gauge.set_id) {
      return { gauges: [gauge], isComplete: true };
    }

    // Fetch all gauges in the set
    const setGauges = await this.repository.findBySetId(gauge.set_id);
    if (!setGauges || setGauges.length === 0) {
      logger.warn('No gauges found for set_id', { gaugeId, setId: gauge.set_id });
      return { gauges: [gauge], isComplete: false };
    }

    // Sort with GO gauge first (using is_go_gauge from specifications)
    const gauges = setGauges.sort((a, b) => {
      const aIsGo = a.specifications?.is_go_gauge || a.is_go_gauge;
      const bIsGo = b.specifications?.is_go_gauge || b.is_go_gauge;
      return aIsGo ? -1 : (bIsGo ? 1 : 0);
    });

    return { gauges, isComplete: gauges.length >= 2 };
  }

  /**
   * Helper method to get gauge by ID
   * @param {number} id - Gauge ID
   * @returns {Promise<Object|null>} Gauge object
   */
  async getGaugeById(id) {
    return await this.repository.getGaugeById(id);
  }

  /**
   * Create new gauge with V2 specifications
   * @param {Object} gaugeData - Gauge data with V2 specs
   * @param {number} userId - User creating the gauge
   * @returns {Promise<Object>} Created gauge
   */
  async createGaugeV2(gaugeData, userId) {
    const validationService = serviceRegistry.get('GaugeValidationService');
    const normalizedData = validationService.validateGaugeData(gaugeData, false);
    return await this.createGauge(normalizedData, userId);
  }
}

module.exports = GaugeCreationService;