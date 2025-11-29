/**
 * {{ENTITY_NAME}}Repository - Data Access Layer Template
 *
 * USAGE:
 * Replace placeholders with actual values:
 * - {{ENTITY_NAME}} → PascalCase entity name (e.g., "Gauge", "Customer", "Order")
 * - {{ENTITY_TABLE}} → Database table name (e.g., "gauges", "customers", "orders")
 * - {{ENTITY_PRIMARY_KEY}} → Primary key column (usually "id")
 * - {{ENTITY_BUSINESS_ID}} → Business identifier field (e.g., "gauge_id", "customer_number", "order_number")
 * - {{ENTITY_LOWER}} → Lowercase entity name (e.g., "gauge", "customer", "order")
 *
 * PATTERN: Repository Layer (Data Access)
 * - Extends BaseRepository for standard CRUD operations
 * - Implements universal repository interface (findByPrimaryKey, findByBusinessIdentifier)
 * - Adds entity-specific query methods
 * - Handles multi-table operations with transaction support
 * - Uses connection pooling with proper release semantics
 * - Maps entity types to specification tables (if applicable)
 * - DTO transformation via mapper
 *
 * SPEC_TABLES CUSTOMIZATION:
 * If your entity has multiple specification tables (like gauge has for different equipment types),
 * define SPEC_TABLES mapping. Otherwise, remove this section.
 *
 * Example:
 * const SPEC_TABLES = {
 *   thread_gauge: 'gauge_thread_specifications',
 *   hand_tool: 'gauge_hand_tool_specifications'
 * };
 */

const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');
const { {{ENTITY_UPPER}}_WITH_RELATIONS, build{{ENTITY_NAME}}Query } = require('../queries');
const {{ENTITY_NAME}}DTOMapper = require('../mappers/{{ENTITY_NAME}}DTOMapper');

// ========== CUSTOMIZATION POINT: Specification Tables Mapping ==========
// If your entity uses multiple specification tables, define them here.
// Remove this section if not applicable.
const SPEC_TABLES = {
  // Example: equipment_type → specification table name
  // type_a: '{{ENTITY_TABLE}}_type_a_specifications',
  // type_b: '{{ENTITY_TABLE}}_type_b_specifications'
};

/**
 * {{ENTITY_NAME}}Repository - Main data access class
 * Handles CRUD operations and complex queries for {{ENTITY_TABLE}} table
 */
class {{ENTITY_NAME}}Repository extends BaseRepository {
  constructor(pool = null) {
    // Support both legacy pool parameter and new pattern
    if (pool && typeof pool === 'object' && pool.execute) {
      super(pool, '{{ENTITY_TABLE}}');
    } else {
      super('{{ENTITY_TABLE}}', '{{ENTITY_PRIMARY_KEY}}');
    }
  }

  // ========== UNIVERSAL REPOSITORY INTERFACE ==========

  /**
   * Find entity by primary key (database ID)
   * REQUIRED: Universal repository interface implementation
   *
   * @param {number} id - Primary key value
   * @param {Object|null} connection - Optional database connection
   * @returns {Promise<Object|null>} Entity DTO or null
   */
  async findByPrimaryKey(id, connection = null) {
    try {
      return await this.get{{ENTITY_NAME}}ById(id, connection);
    } catch (error) {
      logger.error('{{ENTITY_NAME}}Repository.findByPrimaryKey failed:', {
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find entity by business identifier (public-facing ID)
   * OPTIONAL: Implement if your entity has a business identifier
   *
   * @param {string} identifier - Business identifier value
   * @param {Object|null} connection - Optional database connection
   * @returns {Promise<Object|null>} Entity DTO or null
   */
  async findByBusinessIdentifier(identifier, connection = null) {
    try {
      return await this.findBy{{ENTITY_BUSINESS_ID_PASCAL}}(identifier, connection);
    } catch (error) {
      logger.error('{{ENTITY_NAME}}Repository.findByBusinessIdentifier failed:', {
        identifier,
        error: error.message
      });
      throw error;
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Private helper: Fetch entity with specifications by field
   * Centralizes common query logic for different lookup methods
   *
   * @private
   * @param {string} fieldName - Database column name
   * @param {*} fieldValue - Value to search for
   * @param {Object|null} connection - Optional database connection
   * @returns {Promise<Object|null>} Entity DTO or null
   */
  async _fetch{{ENTITY_NAME}}ByField(fieldName, fieldValue, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      // Build query with WHERE clause
      const { sql, params } = build{{ENTITY_NAME}}Query(
        `WHERE e.${fieldName} = ? AND e.is_deleted = 0`,
        [fieldValue]
      );
      const entities = await this.executeQuery(sql, params, conn);

      if (entities.length === 0) return null;

      const entity = entities[0];

      // ========== CUSTOMIZATION POINT: Load Specifications ==========
      // If your entity has separate specification tables, load them here.
      // Remove this section if not applicable.
      if (entity.equipment_type && SPEC_TABLES[entity.equipment_type]) {
        const specTable = this.getSpecTableFor(entity.equipment_type);
        const specs = await this.executeQuery(
          `SELECT * FROM \`${specTable}\` WHERE {{ENTITY_BUSINESS_ID}} = ?`,
          [entity.{{ENTITY_PRIMARY_KEY}}],
          conn
        );
        entity.specifications = specs[0] || null;
      }

      // Transform to DTO
      return {{ENTITY_NAME}}DTOMapper.transformToDTO(entity);
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  // ========== ENTITY-SPECIFIC QUERY METHODS ==========

  /**
   * Get entity by primary key (database ID)
   * @param {number} id - Primary key value
   * @param {Object|null} connection - Optional database connection
   * @returns {Promise<Object|null>} Entity DTO or null
   */
  async get{{ENTITY_NAME}}ById(id, connection) {
    return await this._fetch{{ENTITY_NAME}}ByField('{{ENTITY_PRIMARY_KEY}}', id, connection);
  }

  /**
   * Find entity by business identifier
   * @param {string} {{ENTITY_LOWER}}Id - Business identifier value
   * @param {Object|null} connection - Optional database connection
   * @returns {Promise<Object|null>} Entity DTO or null
   */
  async findBy{{ENTITY_BUSINESS_ID_PASCAL}}({{ENTITY_LOWER}}Id, connection = null) {
    return await this._fetch{{ENTITY_NAME}}ByField('{{ENTITY_BUSINESS_ID}}', {{ENTITY_LOWER}}Id, connection);
  }

  // ========== CUSTOMIZATION POINT: Add Entity-Specific Queries ==========
  /**
   * Example: Find all entities by category
   *
   * async findByCategory(categoryId, connection = null) {
   *   const conn = connection || await this.getConnectionWithTimeout();
   *   const shouldRelease = !connection;
   *
   *   try {
   *     const { sql, params } = build{{ENTITY_NAME}}Query(
   *       `WHERE e.category_id = ? AND e.is_deleted = 0`,
   *       [categoryId]
   *     );
   *     const entities = await this.executeQuery(sql, params, conn);
   *     return entities.map(e => {{ENTITY_NAME}}DTOMapper.transformToDTO(e));
   *   } finally {
   *     if (shouldRelease) conn.release();
   *   }
   * }
   */

  // ========== CREATE OPERATION ==========

  /**
   * Create a new entity
   * Handles multi-table insert with transaction support
   *
   * @param {Object} {{ENTITY_LOWER}}Data - Entity data to create
   * @param {Object|null} conn - Optional database connection (for transactions)
   * @returns {Promise<Object>} Created entity DTO
   */
  async create{{ENTITY_NAME}}({{ENTITY_LOWER}}Data, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      // Transform from DTO format to database format
      const dbData = {{ENTITY_NAME}}DTOMapper.transformFromDTO({{ENTITY_LOWER}}Data);

      // ========== CUSTOMIZATION POINT: Set Required Defaults ==========
      // Add any default values here
      const createdBy = dbData.created_by || 1;

      // ========== CUSTOMIZATION POINT: Main Table Insert ==========
      // Adjust field list to match your entity's schema
      const res = await this.executeQuery(
        `INSERT INTO {{ENTITY_TABLE}} (
          {{ENTITY_BUSINESS_ID}}, name, status,
          is_active, is_deleted, created_by, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          dbData.{{ENTITY_BUSINESS_ID}},
          dbData.name,
          dbData.status || 'active',
          dbData.is_active !== undefined ? dbData.is_active : 1,
          dbData.is_deleted || 0,
          createdBy
        ],
        connection
      );

      const {{ENTITY_LOWER}}Id = res.insertId;

      // ========== CUSTOMIZATION POINT: Specification Tables ==========
      // If your entity has separate specification tables, insert them here.
      // Remove this section if not applicable.
      if (dbData.specifications && dbData.equipment_type) {
        const specTable = this.getSpecTableFor(dbData.equipment_type);
        const specs = dbData.specifications;

        // Build dynamic INSERT based on spec fields with validation
        const fields = Object.keys(specs);
        // Validate all field names to prevent SQL injection
        const validatedFields = fields.map(field => {
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
            throw new Error(`Invalid field name: ${field}`);
          }
          return field;
        });
        const placeholders = validatedFields.map(() => '?').join(', ');
        const values = [{{ENTITY_LOWER}}Id, ...validatedFields.map(f => specs[f])];

        // Use backticks for identifiers to prevent injection
        const fieldList = validatedFields.map(f => `\`${f}\``).join(', ');
        await this.executeQuery(
          `INSERT INTO \`${specTable}\` (\`{{ENTITY_BUSINESS_ID}}\`, ${fieldList}) VALUES (?, ${placeholders})`,
          values,
          connection
        );
      }

      if (shouldCommit) await connection.commit();

      // Return the created entity with DTO transformation
      const created{{ENTITY_NAME}} = { {{ENTITY_PRIMARY_KEY}}: {{ENTITY_LOWER}}Id, ...dbData };
      return {{ENTITY_NAME}}DTOMapper.transformToDTO(created{{ENTITY_NAME}});
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to create {{ENTITY_LOWER}}:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  // ========== UPDATE OPERATION ==========

  /**
   * Update an existing entity
   * @param {number} id - Primary key value
   * @param {Object} updates - Fields to update
   * @param {Object|null} conn - Optional database connection
   * @returns {Promise<Object>} Updated entity DTO
   */
  async update{{ENTITY_NAME}}(id, updates, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      // Transform from DTO format to database format
      const dbUpdates = {{ENTITY_NAME}}DTOMapper.transformFromDTO(updates);

      // Update main table
      const result = await this.update(id, dbUpdates, connection);

      // ========== CUSTOMIZATION POINT: Update Specifications ==========
      // If your entity has separate specification tables, update them here.
      // Remove this section if not applicable.
      if (dbUpdates.specifications && dbUpdates.equipment_type) {
        const specTable = this.getSpecTableFor(dbUpdates.equipment_type);
        const specs = dbUpdates.specifications;

        // Check if specs exist
        const existing = await this.executeQuery(
          `SELECT {{ENTITY_BUSINESS_ID}} FROM \`${specTable}\` WHERE {{ENTITY_BUSINESS_ID}} = ?`,
          [id],
          connection
        );

        if (existing.length > 0) {
          // Update existing specs
          const fields = Object.keys(specs);
          const validatedFields = fields.map(field => {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
              throw new Error(`Invalid field name: ${field}`);
            }
            return field;
          });
          const setClause = validatedFields.map(f => `\`${f}\` = ?`).join(', ');
          const values = [...validatedFields.map(f => specs[f]), id];

          await this.executeQuery(
            `UPDATE \`${specTable}\` SET ${setClause} WHERE {{ENTITY_BUSINESS_ID}} = ?`,
            values,
            connection
          );
        } else {
          // Insert new specs (same logic as create)
          const fields = Object.keys(specs);
          const validatedFields = fields.map(field => {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
              throw new Error(`Invalid field name: ${field}`);
            }
            return field;
          });
          const placeholders = validatedFields.map(() => '?').join(', ');
          const fieldList = validatedFields.map(f => `\`${f}\``).join(', ');
          const values = [id, ...validatedFields.map(f => specs[f])];

          await this.executeQuery(
            `INSERT INTO \`${specTable}\` (\`{{ENTITY_BUSINESS_ID}}\`, ${fieldList}) VALUES (?, ${placeholders})`,
            values,
            connection
          );
        }
      }

      if (shouldCommit) await connection.commit();

      // Return the result with DTO transformation
      return {{ENTITY_NAME}}DTOMapper.transformToDTO(result);
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to update {{ENTITY_LOWER}}:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  // ========== SPECIFICATION TABLE HELPER ==========
  // Remove this method if your entity doesn't use specification tables

  /**
   * Get specification table name for equipment type
   * @param {string} type - Equipment type
   * @returns {string} Specification table name
   * @throws {Error} If type is not supported
   */
  getSpecTableFor(type) {
    const table = SPEC_TABLES[type];
    if (!table) throw new Error(`Unsupported equipment_type: ${type}`);
    return table;
  }
}

module.exports = {{ENTITY_NAME}}Repository;

/* ========== IMPLEMENTATION CHECKLIST ==========

1. Replace all {{PLACEHOLDERS}} with actual values
2. Update SPEC_TABLES mapping or remove if not applicable
3. Adjust main table INSERT/UPDATE field lists in create/update methods
4. Add entity-specific query methods (findByCategory, findByStatus, etc.)
5. Update query builder import to match your queries file
6. Test with actual data to ensure DTO transformations work correctly
7. Add any business-specific validation logic
8. Register repository in ServiceRegistry

*/
