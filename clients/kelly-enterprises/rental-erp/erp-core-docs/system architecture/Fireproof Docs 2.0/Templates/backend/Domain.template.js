/**
 * {{ENTITY_NAME}}Entity - Domain Entity Template
 *
 * USAGE:
 * Replace placeholders with actual values:
 * - {{ENTITY_NAME}} → PascalCase entity name (e.g., "Gauge", "Customer", "Order")
 * - {{ENTITY_TABLE}} → Database table name (e.g., "gauges", "customers", "orders")
 *
 * PATTERN: Domain Entity (Business Rules)
 * - Encapsulates field validation (fail-fast)
 * - Maps between camelCase (JS) and snake_case (DB)
 * - Implements custom serialization methods
 * - Throws domain-specific exceptions
 * - Contains business rule methods (not just data)
 * - Value object pattern (immutable after construction)
 *
 * KEY FEATURES:
 * - Constructor validation (throws on invalid data)
 * - toDatabase(): Convert to database format (snake_case)
 * - Business logic methods (e.g., canBeDeleted(), isActive())
 * - Domain-specific getters and computed properties
 *
 * REFERENCE:
 * - ADR-001: Adopt Domain-Driven Design
 * - DomainValidationError for business rule violations
 */

const DomainValidationError = require('./DomainValidationError');

/**
 * {{ENTITY_NAME}}Entity
 * Value object representing a {{ENTITY_LOWER}} with validation
 * Encapsulates {{ENTITY_LOWER}}-level business rules and field validation
 */
class {{ENTITY_NAME}}Entity {
  /**
   * Constructor
   * @param {Object} data - Entity data (snake_case from database or camelCase from application)
   * @throws {DomainValidationError} If validation fails
   */
  constructor(data) {
    // ========== CUSTOMIZATION POINT: Map Database Fields to Properties ==========
    // Map database snake_case to camelCase properties

    // Primary identifiers
    this.id = data.id;
    this.{{ENTITY_BUSINESS_ID_CAMEL}} = data.{{ENTITY_BUSINESS_ID}}; // Business identifier

    // Basic fields
    this.name = data.name;
    this.description = data.description;
    this.status = data.status;

    // Foreign keys
    this.categoryId = data.category_id;
    this.createdBy = data.created_by;

    // ========== CUSTOMIZATION POINT: Boolean Fields ==========
    // Convert MySQL 0/1 to proper booleans with defaults
    this.isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;
    this.isDeleted = data.is_deleted !== undefined ? Boolean(data.is_deleted) : false;

    // ========== CUSTOMIZATION POINT: Timestamps ==========
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;

    // ========== CUSTOMIZATION POINT: Entity-Specific Fields ==========
    // Add any entity-specific fields here
    // this.customField = data.custom_field;
    // this.equipmentType = data.equipment_type;

    // ========== CUSTOMIZATION POINT: Computed Properties ==========
    // Extract computed values from identifiers or other fields
    // this.suffix = this._extractSuffixFromIdentifier();

    // Validate on construction (fail fast)
    this.validate();
  }

  // ========== VALIDATION ==========

  /**
   * Field-level validation
   * Enforces required fields and basic constraints
   * @throws {DomainValidationError} If validation fails
   */
  validate() {
    // ========== CUSTOMIZATION POINT: Required Field Validation ==========
    if (!this.{{ENTITY_BUSINESS_ID_CAMEL}}) {
      throw new DomainValidationError(
        '{{ENTITY_BUSINESS_ID}} is required for all {{ENTITY_LOWER}}s',
        'MISSING_{{ENTITY_BUSINESS_ID_UPPER}}'
      );
    }

    if (!this.name) {
      throw new DomainValidationError(
        'name is required',
        'MISSING_NAME'
      );
    }

    // ========== CUSTOMIZATION POINT: Business Rule Validation ==========
    // Add entity-specific validation rules here
    // Example: Status-based validation
    // const validStatuses = ['active', 'inactive', 'pending', 'archived'];
    // if (this.status && !validStatuses.includes(this.status)) {
    //   throw new DomainValidationError(
    //     `Invalid status: ${this.status}. Must be one of: ${validStatuses.join(', ')}`,
    //     'INVALID_STATUS'
    //   );
    // }

    // Example: Conditional validation
    // if (this.equipmentType === 'special_type') {
    //   if (!this.customField) {
    //     throw new DomainValidationError(
    //       'customField is required for special_type equipment',
    //       'MISSING_CUSTOM_FIELD'
    //     );
    //   }
    // }

    // Example: Relationship validation
    // if (!this.categoryId) {
    //   throw new DomainValidationError(
    //     'category_id is required',
    //     'MISSING_CATEGORY'
    //   );
    // }
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Example: Extract computed value from identifier
   * @private
   * @returns {string|null} Extracted value or null
   */
  _extractSuffixFromIdentifier() {
    if (!this.{{ENTITY_BUSINESS_ID_CAMEL}}) {
      return null;
    }

    // ========== CUSTOMIZATION POINT: Add Entity-Specific Logic ==========
    // Example: Extract suffix from identifier
    // const id = this.{{ENTITY_BUSINESS_ID_CAMEL}}.toUpperCase();
    // const lastChar = id.charAt(id.length - 1);
    // if (lastChar === 'A' || lastChar === 'B') {
    //   return lastChar;
    // }

    return null;
  }

  // ========== BUSINESS LOGIC METHODS ==========

  /**
   * Check if entity can be deleted
   * @returns {boolean} True if entity can be deleted
   */
  canBeDeleted() {
    // ========== CUSTOMIZATION POINT: Deletion Business Rules ==========
    // Example: Cannot delete active entities
    // if (this.status === 'active') {
    //   return false;
    // }

    // Cannot delete already deleted entities
    if (this.isDeleted) {
      return false;
    }

    return true;
  }

  /**
   * Check if entity is active
   * @returns {boolean} True if entity is active
   */
  isActiveEntity() {
    return this.isActive && !this.isDeleted && this.status === 'active';
  }

  // ========== CUSTOMIZATION POINT: Add Entity-Specific Business Methods ==========
  /**
   * Example: Check if entity requires approval
   *
   * requiresApproval() {
   *   return this.status === 'pending' && this.createdAt < someThreshold;
   * }
   */

  /**
   * Example: Calculate computed value
   *
   * calculateTotalValue() {
   *   return this.quantity * this.unitPrice;
   * }
   */

  // ========== SERIALIZATION ==========

  /**
   * Convert domain object to database format
   * Returns object for {{ENTITY_TABLE}} table insertion
   * @returns {Object} Database-ready object (snake_case)
   */
  toDatabase() {
    return {
      // ========== CUSTOMIZATION POINT: Map Properties to Database Columns ==========
      {{ENTITY_BUSINESS_ID}}: this.{{ENTITY_BUSINESS_ID_CAMEL}},
      name: this.name,
      description: this.description,
      status: this.status,
      category_id: this.categoryId,
      is_active: this.isActive ? 1 : 0,
      is_deleted: this.isDeleted ? 1 : 0,
      created_by: this.createdBy,
      created_at: this.createdAt,
      updated_at: this.updatedAt
      // Add other fields as needed
    };
  }

  /**
   * Get specifications for separate table (if applicable)
   * Returns object for {{ENTITY_TABLE}}_specifications table
   * @returns {Object|null} Specifications object or null
   */
  toSpecifications() {
    // ========== CUSTOMIZATION POINT: Build Specifications Object ==========
    // If your entity doesn't use separate specification tables, remove this method
    // if (this.equipmentType !== 'special_type') {
    //   return null;
    // }

    // return {
    //   spec_field_one: this.specFieldOne,
    //   spec_field_two: this.specFieldTwo
    // };

    return null;
  }

  // ========== GETTERS ==========
  // Add computed properties as getters for clean API

  /**
   * Example: Get display name (computed property)
   * @returns {string} Display name
   */
  get displayName() {
    return this.name || this.{{ENTITY_BUSINESS_ID_CAMEL}};
  }

  /**
   * Example: Get full identifier (computed property)
   * @returns {string} Full identifier
   */
  get fullIdentifier() {
    return `${this.{{ENTITY_BUSINESS_ID_CAMEL}}} - ${this.name}`;
  }
}

module.exports = {{ENTITY_NAME}}Entity;

/* ========== IMPLEMENTATION CHECKLIST ==========

1. Replace all {{PLACEHOLDERS}} with actual values
2. Add all entity fields to constructor with proper mapping
3. Implement validate() method with business rules
4. Add business logic methods (canBeDeleted, requiresApproval, etc.)
5. Update toDatabase() method to include all database columns
6. Add toSpecifications() if entity uses separate spec tables
7. Add getters for computed properties
8. Create DomainValidationError.js if not exists:
   class DomainValidationError extends Error {
     constructor(message, code) {
       super(message);
       this.name = 'DomainValidationError';
       this.code = code;
     }
   }
9. Test with various input data to ensure validation works correctly
10. Document business rules and validation logic

*/
