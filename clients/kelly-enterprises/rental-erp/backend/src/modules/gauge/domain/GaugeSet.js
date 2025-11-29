/**
 * GaugeSet
 *
 * Aggregate root representing a pair of set members (GO and NO GO).
 * Encapsulates all business rules for gauge set creation and pairing.
 *
 * Business Rules:
 * 1. Set members must have matching specifications (size, class, type)
 * 2. NPT gauges cannot have set pairing
 * 3. GO gauge must have suffix 'A'
 * 4. NO GO gauge must have suffix 'B'
 * 5. Both gauges must be thread gauges
 * 6. Both gauges must have same category
 * 7. Base IDs must match for set members
 *
 * Reference: ADR-001 (Adopt Domain-Driven Design)
 */

const DomainValidationError = require('./DomainValidationError');

class GaugeSet {
  constructor({ baseId, goGauge, noGoGauge, category }) {
    this.baseId = baseId;
    this.goGauge = goGauge;
    this.noGoGauge = noGoGauge;
    this.category = category;

    // Validate on construction (fail fast)
    this.validate();
  }

  /**
   * Relationship-level validation
   * Enforces all business rules for gauge set creation
   */
  validate() {
    // Business Rule #1: Set members must have matching specifications
    if (!this.specificationsMatch()) {
      throw new DomainValidationError(
        'Set members must have matching thread size, class, and type',
        'SPEC_MISMATCH',
        {
          goSpecs: {
            size: this.goGauge.threadSize,
            class: this.goGauge.threadClass,
            type: this.goGauge.threadType
          },
          noGoSpecs: {
            size: this.noGoGauge.threadSize,
            class: this.noGoGauge.threadClass,
            type: this.noGoGauge.threadType
          }
        }
      );
    }

    // Business Rule #2: NPT gauges cannot have set pairing
    if (this.category.name === 'NPT') {
      throw new DomainValidationError(
        'NPT (National Pipe Thread) gauges cannot have set pairing',
        'NPT_NO_COMPANION',
        { categoryName: this.category.name }
      );
    }

    // Business Rule #3: Gauges must have different suffixes (for identification)
    // Note: The suffix is informational only - is_go_gauge field in gauge_thread_specifications
    // is the authoritative source for determining GO vs NO-GO
    if (this.goGauge.suffix && this.noGoGauge.suffix &&
        this.goGauge.suffix === this.noGoGauge.suffix) {
      throw new DomainValidationError(
        'GO and NO-GO gauges must have different suffixes',
        'DUPLICATE_SUFFIX',
        { received: this.goGauge.suffix }
      );
    }

    // Business Rule #5: Both gauges must be same equipment type
    if (this.goGauge.equipmentType !== 'thread_gauge' ||
        this.noGoGauge.equipmentType !== 'thread_gauge') {
      throw new DomainValidationError(
        'Both gauges in a set must be thread gauges',
        'INVALID_EQUIPMENT_TYPE'
      );
    }

    // Business Rule #6: Both gauges must have same category
    if (this.goGauge.categoryId !== this.noGoGauge.categoryId) {
      throw new DomainValidationError(
        'Set members must have the same category',
        'CATEGORY_MISMATCH'
      );
    }

    // Business Rule #8: Ownership types must match
    if (this.goGauge.ownershipType !== this.noGoGauge.ownershipType) {
      throw new DomainValidationError(
        'Cannot pair company-owned with customer-owned gauges',
        'OWNERSHIP_MISMATCH',
        {
          goOwnership: this.goGauge.ownershipType,
          noGoOwnership: this.noGoGauge.ownershipType
        }
      );
    }

    // Business Rule #9: Customer-owned gauges must belong to same customer
    if (this.goGauge.ownershipType === 'customer') {
      if (!this.goGauge.customerId || !this.noGoGauge.customerId) {
        throw new DomainValidationError(
          'Customer-owned gauges must have customer_id specified',
          'MISSING_CUSTOMER_ID'
        );
      }

      if (this.goGauge.customerId !== this.noGoGauge.customerId) {
        throw new DomainValidationError(
          'Customer-owned gauges must belong to the same customer',
          'CUSTOMER_MISMATCH',
          {
            goCustomerId: this.goGauge.customerId,
            noGoCustomerId: this.noGoGauge.customerId
          }
        );
      }
    }

    // NOTE: Thread specifications matching is validated in Business Rule #1
    // Base ID matching was removed - compatibility is based on thread specs only
  }

  /**
   * Check if thread specifications match between GO and NO GO gauges
   */
  specificationsMatch() {
    return (
      this.goGauge.threadSize === this.noGoGauge.threadSize &&
      this.goGauge.threadClass === this.noGoGauge.threadClass &&
      this.goGauge.threadType === this.noGoGauge.threadType
    );
  }

  /**
   * Compute set status based on individual gauge statuses (ADDENDUM Lines 1004-1059)
   *
   * AND Logic:
   * - Set is "available" ONLY if BOTH gauges are 'available'
   * - Set is "unusable" if ANY gauge has restrictive status
   *
   * @returns {Object} { status: string, canCheckout: boolean, reason: string|null }
   */
  computeSetStatus() {
    const goStatus = this.goGauge.status;
    const noGoStatus = this.noGoGauge.status;

    // AND logic: Both must be available for set to be available
    if (goStatus === 'available' && noGoStatus === 'available') {
      return {
        status: 'available',
        canCheckout: true,
        reason: null
      };
    }

    // One or both gauges unavailable - determine most descriptive status
    // Priority order: checked_out > out_of_service > calibration_due > others

    if (goStatus === 'checked_out' || noGoStatus === 'checked_out') {
      return {
        status: 'partially_checked_out',
        canCheckout: false,
        reason: 'One or both gauges already checked out'
      };
    }

    if (goStatus === 'out_of_service' || noGoStatus === 'out_of_service') {
      return {
        status: 'out_of_service',
        canCheckout: false,
        reason: 'One or both gauges out of service'
      };
    }

    if (goStatus === 'calibration_due' || noGoStatus === 'calibration_due') {
      return {
        status: 'calibration_due',
        canCheckout: false,
        reason: 'One or both gauges need calibration'
      };
    }

    if (goStatus === 'out_for_calibration' || noGoStatus === 'out_for_calibration') {
      return {
        status: 'out_for_calibration',
        canCheckout: false,
        reason: 'One or both gauges currently being calibrated'
      };
    }

    if (goStatus === 'pending_qc' || noGoStatus === 'pending_qc') {
      return {
        status: 'pending_qc',
        canCheckout: false,
        reason: 'One or both gauges pending quality control'
      };
    }

    if (goStatus === 'pending_certificate' || noGoStatus === 'pending_certificate') {
      return {
        status: 'pending_certificate',
        canCheckout: false,
        reason: 'One or both gauges pending calibration certificate'
      };
    }

    if (goStatus === 'pending_release' || noGoStatus === 'pending_release') {
      return {
        status: 'pending_release',
        canCheckout: false,
        reason: 'One or both gauges pending release to inventory'
      };
    }

    // Default: Both have same non-available status
    return {
      status: goStatus,
      canCheckout: false,
      reason: `Both gauges have status: ${goStatus}`
    };
  }

  /**
   * Compute seal status based on individual gauge seal states (ADDENDUM Lines 1048-1059)
   *
   * OR Logic:
   * - If ANY gauge sealed → Set is "sealed"
   * - If both unsealed → Set is "unsealed"
   *
   * @returns {string} "sealed" | "unsealed"
   */
  computeSealStatus() {
    // OR logic: If ANY gauge sealed, set is sealed
    if (this.goGauge.isSealed || this.noGoGauge.isSealed) {
      return 'sealed';
    }

    return 'unsealed';
  }

  /**
   * Convert domain object to database format
   * Ensures correct IDs and set_id for both gauges
   */
  toDatabase() {
    return {
      goGauge: {
        ...this.goGauge.toDatabase(),
        gauge_id: `${this.baseId}A`,
        set_id: this.baseId
      },
      noGoGauge: {
        ...this.noGoGauge.toDatabase(),
        gauge_id: `${this.baseId}B`,
        set_id: this.baseId
      }
    };
  }
}

module.exports = GaugeSet;
