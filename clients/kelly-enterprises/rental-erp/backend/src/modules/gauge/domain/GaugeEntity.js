/**
 * GaugeEntity
 *
 * Value object representing a single gauge with validation.
 * Encapsulates gauge-level business rules and field validation.
 *
 * Matches actual database schema:
 * - Main fields from gauges table
 * - Thread specifications from thread_gauge_specifications table
 *
 * Reference: ADR-001 (Adopt Domain-Driven Design)
 */

const DomainValidationError = require('./DomainValidationError');

class GaugeEntity {
  constructor(data) {
    // Map database snake_case to camelCase
    // Main gauge table fields
    this.id = data.id;
    this.gaugeId = data.gauge_id; // Universal public identifier (serial number for thread gauges, system-generated for others)
    this.setId = data.set_id; // Thread gauge set grouping (e.g., "SP1001") - thread gauges only
    this.customId = data.custom_id;
    this.name = data.name;
    // Note: displayName is computed by GaugePresenter in presentation layer
    this.equipmentType = data.equipment_type;
    this.categoryId = data.category_id;
    this.status = data.status;

    // Boolean flags - convert MySQL 0/1 to proper booleans
    this.isSpare = data.is_spare !== undefined ? Boolean(data.is_spare) : false;
    this.isSealed = data.is_sealed !== undefined ? Boolean(data.is_sealed) : false;
    this.isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;
    this.isDeleted = data.is_deleted !== undefined ? Boolean(data.is_deleted) : false;

    // Ownership and metadata
    this.createdBy = data.created_by;
    this.ownershipType = data.ownership_type;
    this.employeeOwnerId = data.employee_owner_id;
    this.customerId = data.customer_id;
    this.purchaseInfo = data.purchase_info;
    this.storageLocation = data.storage_location;

    // Additional gauge information
    this.description = data.description;
    this.serialNumber = data.serial_number;
    this.manufacturer = data.manufacturer;
    this.modelNumber = data.model_number;

    // Thread specification fields (from thread_gauge_specifications table)
    this.threadSize = data.thread_size;
    this.threadClass = data.thread_class;
    this.threadType = data.thread_type;

    // NEW SCHEMA: Extract suffix from gauge_id for thread gauges
    // For thread gauges, gauge_id ends with A (GO) or B (NO-GO)
    // Examples: SP0001A, SP0001B, TEST-001A, TEST-001B
    this.gaugeSuffix = data.gauge_suffix || this._extractSuffixFromGaugeId();

    // Validate on construction (fail fast)
    this.validate();
  }

  /**
   * Extract suffix from gauge_id
   * NEW SCHEMA: gauge_suffix moved to gauge_thread_specifications table
   * Domain model extracts suffix from gauge_id for business logic
   * @private
   */
  _extractSuffixFromGaugeId() {
    if (!this.gaugeId) {
      return null;
    }

    const id = this.gaugeId.toUpperCase();

    // Pattern 1: Single letter suffix (A or B)
    // Examples: SP0001A, SP0001B, TEST-001A
    const lastChar = id.charAt(id.length - 1);
    if (lastChar === 'A' || lastChar === 'B') {
      return lastChar;
    }

    // Pattern 2: Multi-letter suffix (GO, NG, NOGO)
    // Examples: SP0001GO, SP0001NG, TEST-001NOGO
    if (id.endsWith('GO') && !id.endsWith('NOGO')) {
      return 'GO';
    }
    if (id.endsWith('NG') || id.endsWith('NOGO')) {
      return 'NG'; // Normalize NOGO to NG
    }

    return null;
  }

  /**
   * Field-level validation
   * Enforces required fields and basic constraints
   */
  validate() {
    // NEW SCHEMA: gauge_id is required for all gauges
    // gauge_id is the universal public identifier (serial number for thread gauges, system-generated for others)
    if (!this.gaugeId) {
      throw new DomainValidationError(
        'gauge_id is required for all gauges',
        'MISSING_GAUGE_ID'
      );
    }

    // Thread gauge specific validation
    if (this.equipmentType === 'thread_gauge') {
      // Thread size is optional only for EXISTING gauges (from database) that are:
      // 1. Retired or out_of_service (end-of-life)
      // 2. Spare gauges (generic inventory, specs added when assigned)
      // 3. Unpaired gauges (no set_id - waiting to be paired)
      //
      // NEW gauges (no id) must have complete specifications
      const isExistingGauge = this.id !== undefined && this.id !== null;
      const allowIncompleteSpecs =
        isExistingGauge &&
        (this.isSpare ||
          !this.setId ||
          (this.status && ['retired', 'out_of_service'].includes(this.status)));

      if (!allowIncompleteSpecs && !this.threadSize) {
        throw new DomainValidationError(
          'thread_size is required for thread gauges',
          'MISSING_THREAD_SIZE'
        );
      }
    }
  }

  /**
   * Getter for suffix (provides clean API)
   */
  get suffix() {
    return this.gaugeSuffix;
  }

  /**
   * Convert domain object to database format
   * Returns object for gauges table insertion
   */
  toDatabase() {
    return {
      gauge_id: this.gaugeId,
      set_id: this.setId,
      custom_id: this.customId,
      name: this.name,
      description: this.description,
      equipment_type: this.equipmentType,
      manufacturer: this.manufacturer,
      category_id: this.categoryId,
      status: this.status,
      is_spare: this.isSpare ? 1 : 0,
      is_sealed: this.isSealed ? 1 : 0,
      is_active: this.isActive ? 1 : 0,
      is_deleted: this.isDeleted ? 1 : 0,
      created_by: this.createdBy,
      ownership_type: this.ownershipType,
      employee_owner_id: this.employeeOwnerId,
      customer_id: this.customerId,
      purchase_info: this.purchaseInfo,
      storage_location: this.storageLocation,
      thread_size: this.threadSize,
      thread_class: this.threadClass,
      thread_type: this.threadType
    };
  }

  /**
   * Get thread specifications for separate table
   * Returns object for thread_gauge_specifications table
   */
  toThreadSpecifications() {
    if (this.equipmentType !== 'thread_gauge') {
      return null;
    }

    return {
      thread_size: this.threadSize,
      thread_class: this.threadClass,
      thread_type: this.threadType
    };
  }
}

module.exports = GaugeEntity;
