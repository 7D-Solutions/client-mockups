/**
 * {{ENTITY_NAME}}Service - Business Logic Layer Template
 *
 * USAGE:
 * Replace placeholders with actual values:
 * - {{ENTITY_NAME}} → PascalCase entity name (e.g., "Gauge", "Customer", "Order")
 * - {{ENTITY_LOWER}} → Lowercase entity name (e.g., "gauge", "customer", "order")
 * - {{MODULE_NAME}} → Module name for audit logging (e.g., "gauge", "customer", "order")
 *
 * PATTERN: Service Layer (Business Logic)
 * - Extends BaseService for standard operations and transaction support
 * - Constructor with dependency injection for repositories and services
 * - Transaction management via executeInTransaction (inherited from BaseService)
 * - Consistent audit logging for all mutations
 * - Validation at service level (business rules)
 * - Private helper methods for complexity management
 * - Returns DTOs (transformed by repository/mapper)
 *
 * DEPENDENCIES:
 * - {{ENTITY_NAME}}Repository: Main data access
 * - Additional repositories: Inject as needed
 * - auditService: For audit trail logging
 * - Other services: Inject as needed
 *
 * KEY METHODS:
 * - create{{ENTITY_NAME}}: Create new entity with validation and audit
 * - update{{ENTITY_NAME}}: Update existing entity with validation and audit
 * - delete{{ENTITY_NAME}}: Soft delete entity with audit
 * - Private helpers: _validate{{ENTITY_NAME}}Data, _prepare{{ENTITY_NAME}}Data, _logAuditAction
 */

const BaseService = require('../../../infrastructure/services/BaseService');
const auditService = require('../../../infrastructure/audit/auditService');
const logger = require('../../../infrastructure/utils/logger');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

/**
 * {{ENTITY_NAME}}Service
 * Handles business logic and workflows for {{ENTITY_LOWER}} operations
 */
class {{ENTITY_NAME}}Service extends BaseService {
  /**
   * Constructor with dependency injection
   * @param {Object} {{ENTITY_LOWER}}Repository - Main repository
   * @param {Object} options - Service options (inherited from BaseService)
   */
  constructor({{ENTITY_LOWER}}Repository, options = {}) {
    super({{ENTITY_LOWER}}Repository, options);
    this.{{ENTITY_LOWER}}Repository = {{ENTITY_LOWER}}Repository;
    this.auditService = auditService;

    // ========== CUSTOMIZATION POINT: Inject Additional Dependencies ==========
    // Example:
    // this.categoryRepository = serviceRegistry.get('CategoryRepository');
    // this.validationService = serviceRegistry.get('ValidationService');
    // this.movementService = new MovementService(); // For inventory integration
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Private helper: Log audit action with consistent formatting
   * @private
   * @param {string} action - Action name (e.g., '{{ENTITY_LOWER}}_created')
   * @param {number} recordId - Entity primary key
   * @param {number} userId - User performing the action
   * @param {Object} details - Additional audit details
   */
  async _logAuditAction(action, recordId, userId, details = {}) {
    await this.auditService.logAction({
      module: '{{MODULE_NAME}}',
      action,
      tableName: '{{ENTITY_TABLE}}',
      recordId,
      userId: userId || null,
      ipAddress: details.ipAddress || '127.0.0.1',
      ...details
    });
  }

  /**
   * Private helper: Validate entity data
   * Implement business rule validation here
   * @private
   * @param {Object} data - Entity data to validate
   * @throws {Error} If validation fails
   */
  _validate{{ENTITY_NAME}}Data(data) {
    // ========== CUSTOMIZATION POINT: Business Rule Validation ==========
    // Example:
    // if (!data.name) {
    //   throw new Error('Name is required');
    // }
    // if (!data.category_id) {
    //   throw new Error('Category is required');
    // }
    // Add any business-specific validation rules
  }

  /**
   * Private helper: Prepare entity data for creation/update
   * Apply data transformations and set defaults
   * @private
   * @param {Object} data - Raw entity data
   * @param {number} userId - User performing the operation
   * @returns {Object} Prepared entity data
   */
  _prepare{{ENTITY_NAME}}Data(data, userId) {
    return {
      ...data,
      created_by: userId,
      // ========== CUSTOMIZATION POINT: Set Default Values ==========
      // status: data.status || 'active',
      // is_active: data.is_active !== undefined ? data.is_active : true
    };
  }

  /**
   * Private helper: Extract old/new values for audit trail
   * @private
   * @param {Object} old{{ENTITY_NAME}} - Original entity state
   * @param {Object} updates - Update data
   * @returns {Object} Object with oldValues and newValues
   */
  _extractAuditValues(old{{ENTITY_NAME}}, updates) {
    return Object.keys(updates).reduce((acc, key) => {
      acc.oldValues[key] = old{{ENTITY_NAME}}[key];
      acc.newValues[key] = updates[key];
      return acc;
    }, { oldValues: {}, newValues: {} });
  }

  // ========== PUBLIC API METHODS ==========

  /**
   * Create a new entity
   * @param {Object} {{ENTITY_LOWER}}Data - Entity data
   * @param {number} userId - User creating the entity
   * @returns {Promise<Object>} Created entity DTO
   */
  async create{{ENTITY_NAME}}({{ENTITY_LOWER}}Data, userId) {
    try {
      // 1. Validate input
      this._validate{{ENTITY_NAME}}Data({{ENTITY_LOWER}}Data);

      // 2. Prepare data (transform DTOs, set defaults)
      const prepared = this._prepare{{ENTITY_NAME}}Data({{ENTITY_LOWER}}Data, userId);

      // ========== CUSTOMIZATION POINT: Additional Business Logic ==========
      // Example: Check for duplicates, validate relationships, etc.
      // const existing = await this.repository.findBy{{ENTITY_BUSINESS_ID}}(prepared.{{ENTITY_BUSINESS_ID}});
      // if (existing) {
      //   throw new Error('{{ENTITY_NAME}} with this ID already exists');
      // }

      // 3. Execute creation (repository handles transaction if needed)
      const created = await this.repository.create{{ENTITY_NAME}}(prepared);

      // 4. Log audit action
      await this._logAuditAction('{{ENTITY_LOWER}}_created', created.id, userId, {
        ipAddress: {{ENTITY_LOWER}}Data.ip_address,
        details: {
          {{ENTITY_BUSINESS_ID}}: prepared.{{ENTITY_BUSINESS_ID}},
          name: prepared.name
        }
      });

      // ========== CUSTOMIZATION POINT: Post-Creation Operations ==========
      // Example: Create related records, send notifications, etc.
      // if ({{ENTITY_LOWER}}Data.location) {
      //   await this.movementService.moveItem({
      //     itemType: '{{ENTITY_LOWER}}',
      //     itemIdentifier: prepared.{{ENTITY_BUSINESS_ID}},
      //     toLocation: {{ENTITY_LOWER}}Data.location,
      //     movedBy: userId,
      //     movementType: 'created',
      //     notes: `{{ENTITY_NAME}} created: ${prepared.name}`
      //   });
      // }

      logger.info('{{ENTITY_NAME}} created successfully', {
        {{ENTITY_LOWER}}Id: created.id,
        {{ENTITY_BUSINESS_ID}}: created.{{ENTITY_BUSINESS_ID}},
        userId
      });

      return created;
    } catch (error) {
      logger.error('{{ENTITY_NAME}} creation failed:', error);
      throw error;
    }
  }

  /**
   * Update an existing entity
   * @param {number} id - Entity primary key
   * @param {Object} updates - Update data
   * @param {number} userId - User making the update
   * @returns {Promise<Object>} Updated entity DTO
   */
  async update{{ENTITY_NAME}}(id, updates, userId = null) {
    try {
      // 1. Fetch existing entity
      const old{{ENTITY_NAME}} = await this.repository.get{{ENTITY_NAME}}ById(id);
      if (!old{{ENTITY_NAME}}) {
        throw new Error(`{{ENTITY_NAME}} not found: ${id}`);
      }

      // 2. Validate update data
      this._validate{{ENTITY_NAME}}Data({ ...old{{ENTITY_NAME}}, ...updates });

      // 3. Extract audit values
      const { oldValues, newValues } = this._extractAuditValues(old{{ENTITY_NAME}}, updates);

      logger.info('Updating {{ENTITY_LOWER}}', { {{ENTITY_LOWER}}Id: id, oldValues, newValues });

      // 4. Execute update
      const updated = await this.repository.update{{ENTITY_NAME}}(id, updates);

      // 5. Log audit action
      await this.auditService.logAction({
        module: '{{MODULE_NAME}}',
        action: '{{ENTITY_LOWER}}_updated',
        tableName: '{{ENTITY_TABLE}}',
        recordId: id,
        userId,
        ipAddress: '127.0.0.1',
        oldValues,
        newValues
      });

      logger.info('{{ENTITY_NAME}} updated successfully', {
        {{ENTITY_LOWER}}Id: id,
        userId
      });

      return updated;
    } catch (error) {
      logger.error('{{ENTITY_NAME}} update failed:', error);
      throw error;
    }
  }

  /**
   * Delete an entity (soft delete)
   * @param {number} id - Entity primary key
   * @param {number} userId - User deleting the entity
   * @returns {Promise<Object>} Deletion result
   */
  async delete{{ENTITY_NAME}}(id, userId = null) {
    try {
      // 1. Check if entity exists
      const existing = await this.repository.get{{ENTITY_NAME}}ById(id);
      if (!existing) {
        throw new Error(`{{ENTITY_NAME}} not found: ${id}`);
      }

      // 2. Execute soft delete
      const result = await this.repository.softDelete(id);

      // 3. Log audit action
      await this._logAuditAction('{{ENTITY_LOWER}}_deleted', id, userId, {
        details: {
          {{ENTITY_BUSINESS_ID}}: existing.{{ENTITY_BUSINESS_ID}},
          name: existing.name
        }
      });

      logger.info('{{ENTITY_NAME}} deleted successfully', {
        {{ENTITY_LOWER}}Id: id,
        userId
      });

      return result;
    } catch (error) {
      logger.error('{{ENTITY_NAME}} deletion failed:', error);
      throw error;
    }
  }

  /**
   * Get entity by ID
   * @param {number} id - Entity primary key
   * @returns {Promise<Object|null>} Entity DTO or null
   */
  async get{{ENTITY_NAME}}ById(id) {
    try {
      return await this.repository.get{{ENTITY_NAME}}ById(id);
    } catch (error) {
      logger.error('Failed to get {{ENTITY_LOWER}} by ID:', error);
      throw error;
    }
  }

  // ========== CUSTOMIZATION POINT: Add Entity-Specific Methods ==========
  /**
   * Example: Search entities with filters
   *
   * async search{{ENTITY_NAME}}s(filters) {
   *   try {
   *     const entities = await this.repository.findByFilters(filters);
   *     return entities;
   *   } catch (error) {
   *     logger.error('{{ENTITY_NAME}} search failed:', error);
   *     throw error;
   *   }
   * }
   */

  /**
   * Example: Complex workflow method
   *
   * async perform{{ENTITY_NAME}}Workflow(id, workflowData, userId) {
   *   return this.executeInTransaction(async (connection) => {
   *     // 1. Fetch entity
   *     const entity = await this.repository.get{{ENTITY_NAME}}ById(id, connection);
   *     if (!entity) {
   *       throw new Error('{{ENTITY_NAME}} not found');
   *     }
   *
   *     // 2. Validate workflow preconditions
   *     if (entity.status !== 'ready') {
   *       throw new Error('{{ENTITY_NAME}} is not ready for this workflow');
   *     }
   *
   *     // 3. Perform workflow steps
   *     // ... business logic ...
   *
   *     // 4. Update entity state
   *     await this.repository.update{{ENTITY_NAME}}(id, { status: 'completed' }, connection);
   *
   *     // 5. Log audit action
   *     await this._logAuditAction('workflow_completed', id, userId);
   *
   *     return { success: true, message: 'Workflow completed successfully' };
   *   });
   * }
   */
}

module.exports = {{ENTITY_NAME}}Service;

/* ========== IMPLEMENTATION CHECKLIST ==========

1. Replace all {{PLACEHOLDERS}} with actual values
2. Inject required dependencies in constructor
3. Implement _validate{{ENTITY_NAME}}Data with business rules
4. Implement _prepare{{ENTITY_NAME}}Data with default values
5. Add entity-specific methods (search, workflows, etc.)
6. Add post-creation/update operations (notifications, related records, etc.)
7. Test with actual data to ensure validation works correctly
8. Register service in ServiceRegistry

*/
