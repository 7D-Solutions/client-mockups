/**
 * {{ENTITY_NAME}}DTOMapper - Data Transfer Object Mapper Template
 *
 * USAGE:
 * Replace placeholders with actual values:
 * - {{ENTITY_NAME}} → PascalCase entity name (e.g., "Gauge", "Customer", "Order")
 * - {{FIELDS}} → List of entity fields (add to transformToDTO and transformFromDTO)
 *
 * PATTERN: DTO Mapper (Data Transformation)
 * - Bidirectional transformations: DB ↔ DTO
 * - Handles field name case conversion (snake_case ↔ camelCase)
 * - Structures related data from JOINs
 * - Integrates with Presenter for enrichment
 * - Provides both naming conventions for backward compatibility
 * - Type conversion (strings to numbers, booleans, etc.)
 * - Null handling and default values
 *
 * KEY METHODS:
 * - transformToDTO(dbEntity): Database → DTO (for API responses)
 * - transformFromDTO(apiEntity): DTO → Database (for API requests)
 *
 * INTEGRATION:
 * - Used by Repository layer to transform query results
 * - Used by Service layer to prepare data for database operations
 * - Integrated with {{ENTITY_NAME}}Presenter for display logic
 */

const logger = require('../../../infrastructure/utils/logger');
const {{ENTITY_NAME}}Presenter = require('../presenters/{{ENTITY_NAME}}Presenter');

class {{ENTITY_NAME}}DTOMapper {
  /**
   * Transform database record to DTO format
   * Converts snake_case to camelCase and structures related data
   *
   * @param {Object} dbEntity - Database record with snake_case fields
   * @returns {Object|null} DTO with camelCase fields or null
   */
  static transformToDTO(dbEntity) {
    if (!dbEntity) return null;

    // ========== CUSTOMIZATION POINT: Structure Related Data ==========
    // If your entity has specifications or related data from JOINs, structure them here
    let specifications = dbEntity.specifications || null;
    if (!specifications && dbEntity.some_spec_field) {
      specifications = {
        // Example: Map specification fields
        // specFieldOne: dbEntity.spec_field_one,
        // specFieldTwo: dbEntity.spec_field_two
      };
    }

    // ========== CUSTOMIZATION POINT: Main DTO Structure ==========
    // Add all entity fields here with proper type conversions
    const dto = {
      // Primary identifiers
      id: dbEntity.id != null ? String(dbEntity.id) : null,
      {{ENTITY_BUSINESS_ID}}: dbEntity.{{ENTITY_BUSINESS_ID}},
      {{ENTITY_BUSINESS_ID_CAMEL}}: dbEntity.{{ENTITY_BUSINESS_ID}}, // Camelcase alias

      // Basic fields (both snake_case and camelCase for compatibility)
      name: dbEntity.name,
      status: dbEntity.status,
      description: dbEntity.description,

      // Foreign keys (convert to strings)
      category_id: dbEntity.category_id != null ? String(dbEntity.category_id) : null,
      created_by: dbEntity.created_by ? String(dbEntity.created_by) : null,
      updated_by: dbEntity.updated_by ? String(dbEntity.updated_by) : null,

      // Boolean fields (convert MySQL 0/1 to proper booleans)
      is_active: Boolean(dbEntity.is_active),
      is_deleted: Boolean(dbEntity.is_deleted),

      // Timestamps
      created_at: dbEntity.created_at,
      updated_at: dbEntity.updated_at,

      // Related data (if applicable)
      specifications

      // ========== CUSTOMIZATION POINT: Add Entity-Specific Fields ==========
      // Example: JOINed fields from related tables
      // category_name: dbEntity.category_name,
      // assigned_to_user_name: dbEntity.assigned_to_user_name || null,
      // has_pending_action: Boolean(dbEntity.has_pending_action)
    };

    // ========== CUSTOMIZATION POINT: Enrich with Presenter ==========
    // If you have a Presenter class, enrich the DTO with display fields
    const enriched = {{ENTITY_NAME}}Presenter.toDTO(dto);

    return enriched;
  }

  /**
   * Transform DTO/API format to database format
   * Converts camelCase to snake_case and prepares for database operations
   *
   * @param {Object} apiEntity - API request with camelCase fields
   * @returns {Object|null} Database-ready object with snake_case fields or null
   */
  static transformFromDTO(apiEntity) {
    if (!apiEntity) return null;

    logger.debug('🔍 transformFromDTO input:', JSON.stringify(apiEntity, null, 2));

    // Start with a copy of the input
    const transformed = { ...apiEntity };

    // ========== CUSTOMIZATION POINT: Convert ID Fields to Integers ==========
    // Primary key
    if (apiEntity.id !== undefined) {
      transformed.id = apiEntity.id ? parseInt(apiEntity.id) : undefined;
    }

    // Foreign keys and other integer fields
    const idFields = [
      'category_id', 'created_by', 'updated_by'
      // Add other ID/integer fields here
    ];

    idFields.forEach(field => {
      if (apiEntity[field] !== undefined) {
        transformed[field] = apiEntity[field] ? parseInt(apiEntity[field]) : null;
      }
    });

    // ========== CUSTOMIZATION POINT: Convert Boolean Fields ==========
    // Convert JavaScript booleans to MySQL 0/1
    const booleanFields = [
      'is_active', 'is_deleted'
      // Add other boolean fields here
    ];

    booleanFields.forEach(field => {
      if (apiEntity[field] !== undefined) {
        transformed[field] = apiEntity[field] ? 1 : 0;
      }
    });

    // ========== CUSTOMIZATION POINT: Build Specifications Object ==========
    // If your entity has separate specification tables, build the specifications object here
    if (apiEntity.equipment_type === 'some_type') {
      const hasSpecFields = apiEntity.spec_field_one || apiEntity.spec_field_two;

      if (hasSpecFields) {
        // Check if specifications already provided as object
        if (apiEntity.spec && typeof apiEntity.spec === 'object') {
          // Use spec object and map to snake_case for database
          transformed.specifications = {
            spec_field_one: apiEntity.spec.spec_field_one || apiEntity.spec.specFieldOne,
            spec_field_two: apiEntity.spec.spec_field_two || apiEntity.spec.specFieldTwo
            // Add other specification fields
          };
        } else {
          // Build from individual fields
          transformed.specifications = {
            spec_field_one: apiEntity.spec_field_one,
            spec_field_two: apiEntity.spec_field_two
            // Add other specification fields
          };
        }

        // Remove null/undefined values to avoid inserting empty columns
        Object.keys(transformed.specifications).forEach(key => {
          if (transformed.specifications[key] === null || transformed.specifications[key] === undefined) {
            delete transformed.specifications[key];
          }
        });

        logger.debug('✅ Built specifications object:', JSON.stringify(transformed.specifications, null, 2));
      }
    }

    // ========== CUSTOMIZATION POINT: Field Name Mapping ==========
    // If you need to rename fields or apply special transformations, do it here
    // Example: Map frontend field names to database column names
    // if (apiEntity.customFieldName !== undefined) {
    //   transformed.database_field_name = apiEntity.customFieldName;
    //   delete transformed.customFieldName; // Remove old field name
    // }

    logger.debug('🔍 transformFromDTO output:', JSON.stringify(transformed, null, 2));
    return transformed;
  }
}

module.exports = {{ENTITY_NAME}}DTOMapper;

/* ========== IMPLEMENTATION CHECKLIST ==========

1. Replace all {{PLACEHOLDERS}} with actual values
2. Add all entity fields to transformToDTO with proper type conversions
3. Add ID fields to idFields array for integer conversion
4. Add boolean fields to booleanFields array for MySQL conversion
5. Build specifications object if your entity has separate spec tables
6. Add field name mappings if frontend/backend use different names
7. Update Presenter integration if you have display logic
8. Test with actual API requests/responses to ensure transformations work
9. Remove null/undefined handling if your API requires explicit nulls

*/
