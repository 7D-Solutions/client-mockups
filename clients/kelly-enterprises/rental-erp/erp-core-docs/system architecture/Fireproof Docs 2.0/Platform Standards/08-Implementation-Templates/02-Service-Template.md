# Service Implementation Template

Ready-to-use template for creating backend service classes that extend `BaseService`.

## Overview

Services contain **business logic**, **transaction management**, and **audit trail integration**. They orchestrate repository operations and enforce business rules.

## Template

```javascript
const BaseService = require('../../../infrastructure/repositories/BaseService');
const auditService = require('../../../infrastructure/audit/auditService');
const logger = require('../../../infrastructure/utils/logger');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

/**
 * TODO: Replace [Module] with actual module name (e.g., Gauge, Inventory, User)
 * [Module]Service - [TODO: Brief description of service responsibility]
 *
 * Responsibilities:
 * - [TODO: List primary responsibilities]
 * - Transaction management for multi-step operations
 * - Audit trail integration
 * - Business rule enforcement
 *
 * @example
 * const service = new [Module]Service([module]Repository);
 * const item = await service.create[ModuleName](data, userId);
 */
class [Module]Service extends BaseService {
  /**
   * Constructor
   * @param {Object} [module]Repository - Main repository for this service
   * @param {Object} options - Service options
   * TODO: Add additional repositories as needed
   */
  constructor([module]Repository, options = {}) {
    super([module]Repository, options);
    // TODO: Inject additional dependencies
    this.auditService = auditService;

    // Example: Inject related services
    // this.validationService = serviceRegistry.get('[Module]ValidationService');
  }

  /**
   * Private helper: Log audit action with consistent formatting
   * @private
   */
  async _logAuditAction(action, recordId, userId, details = {}) {
    await this.auditService.logAction({
      module: '[module_name]', // TODO: Replace with module name (lowercase)
      action,
      tableName: '[table_name]', // TODO: Replace with primary table name
      recordId,
      userId: userId || null,
      ipAddress: details.ipAddress || '127.0.0.1',
      ...details
    });
  }

  /**
   * Private helper: Validate required fields
   * TODO: Customize validation logic for your domain
   * @private
   */
  _validateRequiredFields(data) {
    const required = ['field1', 'field2']; // TODO: Replace with actual required fields
    const missing = required.filter(field => !data[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Create a new [module item]
   * TODO: Customize creation logic, validation, and audit trail
   * @param {Object} data - Item data
   * @param {number} userId - User creating the item
   * @returns {Promise<Object>} Created item
   *
   * @example
   * const item = await service.create[ModuleName]({
   *   name: 'Example Item',
   *   category: 'Standard'
   * }, userId);
   */
  async create[ModuleName](data, userId) {
    // Validate required fields
    this._validateRequiredFields(data);

    // Additional validation
    // TODO: Add domain-specific validation
    if (data.some_field && data.some_field < 0) {
      throw new Error('Some field must be positive');
    }

    // Create item in database
    const item = await this.repository.create[ModuleName]({
      ...data,
      created_by: userId
    });

    // Log creation for audit trail
    await this._logAuditAction('[module]_created', item.id, userId, {
      ipAddress: data.ip_address,
      details: {
        // TODO: Add relevant audit details
        name: data.name,
        category: data.category
      }
    });

    // Optional: Trigger side effects
    // TODO: Add any necessary side effects (e.g., notifications, related record creation)
    // Example: await this.notificationService.notifyCreation(item);

    return item;
  }

  /**
   * Update an existing [module item]
   * TODO: Customize update logic and validation
   * @param {number} id - Item ID
   * @param {Object} updates - Update data
   * @param {number} userId - User making the update
   * @returns {Promise<Object>} Updated item
   */
  async update[ModuleName](id, updates, userId = null) {
    // Get current state for audit trail
    const oldItem = await this.repository.get[ModuleName]ById(id);

    if (!oldItem) {
      throw new Error('[Module item] not found');
    }

    // Validate updates
    // TODO: Add validation logic for updates
    if (updates.some_field && updates.some_field < 0) {
      throw new Error('Some field must be positive');
    }

    // Extract changes for audit
    const { oldValues, newValues } = this._extractAuditValues(oldItem, updates);

    logger.info('Updating [module item]', { itemId: id, oldValues, newValues });

    // Perform update
    const item = await this.repository.update[ModuleName](id, updates);

    // Log update for audit trail
    await this.auditService.logAction({
      module: '[module_name]',
      action: '[module]_updated',
      tableName: '[table_name]',
      recordId: id,
      userId,
      ipAddress: '127.0.0.1',
      oldValues,
      newValues
    });

    return item;
  }

  /**
   * Private helper: Extract old/new values for audit trail
   * @private
   */
  _extractAuditValues(oldItem, updates) {
    return Object.keys(updates).reduce((acc, key) => {
      acc.oldValues[key] = oldItem[key];
      acc.newValues[key] = updates[key];
      return acc;
    }, { oldValues: {}, newValues: {} });
  }

  /**
   * Delete a [module item] (soft delete)
   * TODO: Consider if hard delete is needed instead
   * @param {number} id - Item ID
   * @param {number} userId - User deleting the item
   * @returns {Promise<Object>} Deletion result
   */
  async delete[ModuleName](id, userId = null) {
    // Check if item exists
    const item = await this.repository.get[ModuleName]ById(id);
    if (!item) {
      throw new Error('[Module item] not found');
    }

    // TODO: Check if deletion is allowed (business rules)
    // Example: if (item.status === 'active') throw new Error('Cannot delete active item');

    // Perform soft delete
    const result = await this.repository.softDelete(id);

    // Log deletion
    await this._logAuditAction('[module]_deleted', id, userId);

    return result;
  }

  /**
   * Get [module item] by ID
   * @param {number} id - Item ID
   * @returns {Promise<Object|null>} Item or null if not found
   */
  async get[ModuleName]ById(id) {
    return await this.repository.get[ModuleName]ById(id);
  }

  /**
   * Example: Complex operation with transaction
   * TODO: Replace with actual complex operation
   * @param {Object} data - Operation data
   * @param {number} userId - User performing operation
   * @returns {Promise<Object>} Operation result
   */
  async performComplexOperation(data, userId) {
    return this.executeInTransaction(async (connection) => {
      // Step 1: Create main item
      const mainItem = await this.repository.create[ModuleName](
        { ...data.mainData, created_by: userId },
        connection
      );

      // Step 2: Create related items
      // TODO: Add related item creation
      // Example:
      // const relatedItem = await this.relatedRepository.create(
      //   { ...data.relatedData, main_id: mainItem.id },
      //   connection
      // );

      // Step 3: Log audit trail
      await this.auditService.logAction({
        user_id: userId,
        module: '[module_name]',
        action: 'complex_operation',
        entity_type: '[module]',
        entity_id: mainItem.id,
        changes: {
          operation: 'complex',
          main_item: mainItem.id
          // related_item: relatedItem.id
        }
      });

      // If anything fails, transaction will rollback automatically
      return {
        mainItem
        // relatedItem
      };
    });
  }

  /**
   * Example: Validation with external service
   * TODO: Customize for your validation needs
   * @param {Object} data - Data to validate
   * @returns {Promise<boolean>} Validation result
   */
  async validateData(data) {
    const validationService = serviceRegistry.get('[Module]ValidationService');

    if (!validationService) {
      logger.warn('Validation service not available, skipping validation');
      return true;
    }

    return await validationService.validate(data);
  }
}

module.exports = [Module]Service;
```

## Working Example

Based on `GaugeCreationService.js`:

```javascript
const BaseService = require('../../../infrastructure/services/BaseService');
const auditService = require('../../../infrastructure/audit/auditService');
const logger = require('../../../infrastructure/utils/logger');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const MovementService = require('../../inventory/services/MovementService');

/**
 * GaugeCreationService - Focused on gauge creation, updates, and workflow management
 * Handles gauge creation workflows, gauge sets, and deletion
 */
class GaugeCreationService extends BaseService {
  constructor(gaugeRepository, gaugeSetRepository, gaugeReferenceRepository, options = {}) {
    super(gaugeRepository, options);
    this.gaugeSetRepository = gaugeSetRepository;
    this.gaugeReferenceRepository = gaugeReferenceRepository;
    this.auditService = auditService;
    this.movementService = new MovementService(); // Inventory integration
  }

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

  async createGauge(gaugeData, userId) {
    const validationService = serviceRegistry.get('GaugeValidationService');
    gaugeData = validationService.normalizeThreadData(gaugeData);

    const gaugeIdService = serviceRegistry.get('GaugeIdService');

    if (!gaugeData.name || !gaugeData.equipment_type || !gaugeData.category_id) {
      throw new Error('Name, equipment type, and category are required');
    }

    if (!gaugeData.gauge_id) {
      gaugeData.gauge_id = await gaugeIdService.generateSystemId(
        gaugeData.category_id,
        gaugeData.gauge_type || null,
        gaugeData.spec?.is_go_gauge !== undefined ? gaugeData.spec.is_go_gauge : null
      );
    }

    const gauge = await this.repository.createGauge({
      ...gaugeData,
      created_by: userId
    });

    await this._logAuditAction('gauge_created', gauge.id, userId, {
      ipAddress: gaugeData.ip_address,
      details: {
        gauge_id: gaugeData.gauge_id,
        name: gaugeData.name,
        equipment_type: gaugeData.equipment_type
      }
    });

    // Record initial location in inventory system
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
      } catch (inventoryError) {
        logger.error('Failed to record gauge in inventory', {
          gaugeId: gaugeData.gauge_id,
          error: inventoryError.message
        });
      }
    }

    return gauge;
  }
}

module.exports = GaugeCreationService;
```

## Common Patterns

### Pattern 1: Validation Before Create
```javascript
async createItem(data, userId) {
  // 1. Validate required fields
  if (!data.name) throw new Error('Name is required');

  // 2. Normalize/sanitize data
  const validationService = serviceRegistry.get('ValidationService');
  data = validationService.normalize(data);

  // 3. Check business rules
  if (await this.isDuplicate(data)) {
    throw new Error('Item already exists');
  }

  // 4. Create item
  const item = await this.repository.createItem(data);

  // 5. Log audit
  await this._logAuditAction('created', item.id, userId);

  return item;
}
```

### Pattern 2: Transaction for Multi-Step Operation
```javascript
async createWithRelated(data, userId) {
  return this.executeInTransaction(async (connection) => {
    const main = await this.repository.create(data.main, connection);
    const related = await this.relatedRepo.create({
      ...data.related,
      main_id: main.id
    }, connection);

    await this.auditService.logAction({
      user_id: userId,
      action: 'created_with_related',
      entity_id: main.id
    });

    return { main, related };
  });
}
```

### Pattern 3: Side Effects with Error Handling
```javascript
async createItem(data, userId) {
  const item = await this.repository.createItem(data);

  // Side effects don't fail main operation
  try {
    await this.notificationService.notify(item);
  } catch (error) {
    logger.error('Notification failed', { error: error.message });
    // Don't throw - main operation succeeded
  }

  return item;
}
```

## TODO Checklist

When using this template:

- [ ] Replace `[Module]` with actual module name (PascalCase)
- [ ] Replace `[module_name]` with lowercase module name
- [ ] Replace `[table_name]` with primary database table
- [ ] Replace `[ModuleName]` with method names
- [ ] Add constructor dependencies (repositories, services)
- [ ] Implement validation logic in `_validateRequiredFields`
- [ ] Customize audit trail details
- [ ] Add domain-specific business logic
- [ ] Implement complex operations with transactions if needed
- [ ] Add JSDoc documentation
- [ ] Keep file under 300 lines (extract helper services if needed)
- [ ] Write unit tests for business logic
- [ ] Write integration tests for database operations

## Common Pitfalls

- ❌ **Don't** duplicate auth logic - use infrastructure middleware
- ❌ **Don't** skip audit trail for important operations
- ❌ **Don't** forget transaction management for multi-step operations
- ❌ **Don't** let files exceed 300 lines - extract specialized services
- ❌ **Don't** catch errors without logging them
- ❌ **Don't** skip validation on user input

## Best Practices

- ✅ **Do** use transactions for operations affecting multiple tables
- ✅ **Do** log all state-changing operations to audit trail
- ✅ **Do** validate input before database operations
- ✅ **Do** use dependency injection for testability
- ✅ **Do** extract complex logic to private helper methods
- ✅ **Do** handle side effects gracefully (don't fail main operation)
- ✅ **Do** use ServiceRegistry for optional dependencies
