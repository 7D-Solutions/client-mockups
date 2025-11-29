# Service Layer Standards

**Fire-Proof ERP Backend - Service Layer Patterns**

## Overview

The service layer orchestrates business logic, coordinates repository operations, manages transactions, and implements business workflows. Services act as the primary interface between the HTTP layer and the data layer.

## BaseService Pattern

### Class Structure

All services should extend `BaseService`:

```javascript
const BaseService = require('../../../infrastructure/services/BaseService');

class GaugeCreationService extends BaseService {
  constructor(gaugeRepository, gaugeSetRepository, gaugeReferenceRepository, options = {}) {
    super(gaugeRepository, options);
    this.gaugeSetRepository = gaugeSetRepository;
    this.gaugeReferenceRepository = gaugeReferenceRepository;
    this.auditService = auditService;
    this.movementService = new MovementService();
  }
}
```

### BaseService Implementation

**Location**: `backend/src/infrastructure/services/BaseService.js`

```javascript
class BaseService {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.pool = options.pool || null;
    this.auditService = options.auditService || null;
  }

  async executeInTransaction(operation, auditData = null) {
    const pool = this.pool || dbConnection.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await operation(connection);

      if (auditData && this.auditService) {
        await this.auditService.logAction({
          ...auditData,
          details: { ...auditData.details, result }
        }, connection);
      }

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error(`Transaction failed: ${error.message}`);
      throw error;
    } finally {
      connection.release();
    }
  }
}
```

## Service Responsibilities

### 1. Business Logic Orchestration

Services coordinate multiple operations and enforce business rules:

```javascript
class GaugeCreationService extends BaseService {
  /**
   * Create a new gauge
   * NEW SYSTEM: Uses gauge_id for all equipment types
   * CUSTOMIZABLE IDs: gauge_id can be provided by user or auto-generated
   */
  async createGauge(gaugeData, userId) {
    // 1. Validation - Get validation service
    const validationService = serviceRegistry.get('GaugeValidationService');
    gaugeData = validationService.normalizeThreadData(gaugeData);

    // 2. ID Generation - Get ID service
    const gaugeIdService = serviceRegistry.get('GaugeIdService');

    // 3. Business rule validation
    if (!gaugeData.name || !gaugeData.equipment_type || !gaugeData.category_id) {
      throw new Error('Name, equipment type, and category are required');
    }

    // 4. Handle gauge_id: either custom or auto-generated
    if (gaugeData.gauge_id) {
      const validation = await gaugeIdService.validateCustomGaugeId(
        gaugeData.gauge_id,
        gaugeData.category_id,
        gaugeData.gauge_type || null,
        gaugeData.spec?.is_go_gauge !== undefined ? gaugeData.spec.is_go_gauge : null
      );

      if (!validation.valid || !validation.available) {
        throw new Error(validation.message);
      }
    } else {
      gaugeData.gauge_id = await gaugeIdService.generateSystemId(
        gaugeData.category_id,
        gaugeData.gauge_type || null,
        gaugeData.spec?.is_go_gauge
      );
    }

    // 5. Create gauge
    const gauge = await this.repository.createGauge({
      ...gaugeData,
      created_by: userId
    });

    // 6. Audit trail
    await this._logAuditAction('gauge_created', gauge.id, userId, {
      ipAddress: gaugeData.ip_address,
      details: {
        gauge_id: gaugeData.gauge_id,
        name: gaugeData.name,
        equipment_type: gaugeData.equipment_type
      }
    });

    // 7. Cross-module integration (inventory)
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
        // Don't fail the whole operation if inventory update fails
      }
    }

    return gauge;
  }
}
```

### 2. Transaction Management

Services define transaction boundaries:

```javascript
/**
 * Create a gauge set (GO/NO GO pair) with proper validation and transaction safety
 */
async createGaugeSet(goGaugeData, noGoGaugeData, userId) {
  return this.executeInTransaction(async (connection) => {
    // Validate NPT cannot have companions
    const category = await this.gaugeReferenceRepository.getCategoryById(
      goGaugeData.category_id,
      connection
    );

    if (category.name === 'NPT') {
      throw new Error('NPT gauges cannot have companion pairs');
    }

    // Validate matching specifications
    this._validateGaugeSetSpecs(goGaugeData, noGoGaugeData);

    // Use custom set ID if provided, otherwise generate
    const gaugeIdService = serviceRegistry.get('GaugeIdService');
    let setId;

    if (goGaugeData.custom_set_id) {
      setId = goGaugeData.custom_set_id;
      const existingGauges = await this.repository.findBySetId(setId, connection);

      if (existingGauges && existingGauges.length > 0) {
        throw new Error(`Set ID "${setId}" already exists`);
      }

      await this._checkSetIdHistoricalUsage(setId, connection);
    } else {
      setId = await gaugeIdService.generateSystemId(
        goGaugeData.category_id,
        goGaugeData.gauge_type,
        null
      );
    }

    // Prepare both gauges
    const goGaugeWithId = this._prepareGaugeForSet(goGaugeData, setId, true, userId);
    const noGoGaugeWithId = this._prepareGaugeForSet(noGoGaugeData, setId, false, userId);

    // Create both gauges
    const goGauge = await this.repository.createGauge(goGaugeWithId, connection);
    const noGoGauge = await this.repository.createGauge(noGoGaugeWithId, connection);

    // Record in inventory system
    const storageLocation = goGaugeData.location || noGoGaugeData.location;
    if (storageLocation) {
      await this.movementService.moveItem({ ... });
    }

    // Audit trail
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

    return {
      go: GaugeDTOMapper.transformToDTO(goGauge),
      noGo: GaugeDTOMapper.transformToDTO(noGoGauge),
      setId: setId
    };
  });
}
```

### 3. Dependency Injection

Services receive dependencies through constructors:

```javascript
class GaugeSetService {
  constructor(pool, repository, gaugeRepository = null) {
    this.pool = pool;
    this.repository = repository; // GaugeSetRepository
    this.gaugeRepository = gaugeRepository; // For serial number lookups
    this.transactionHelper = new TransactionHelper(pool);
    this.validationHelper = new ValidationHelper(repository, pool);
  }

  async pairSpareGauges(goGaugeId, noGoGaugeId, setLocation, userId) {
    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // Lock and retrieve both gauges
      const goGauge = await this.validationHelper.getAndValidateGauge(
        goGaugeId,
        connection,
        'GO gauge'
      );
      const noGoGauge = await this.validationHelper.getAndValidateGauge(
        noGoGaugeId,
        connection,
        'NO GO gauge'
      );

      // Business logic...
    });
  }
}
```

## Service Patterns

### Pattern 1: CRUD Service

Simple CRUD operations with audit:

```javascript
class GaugeCreationService extends BaseService {
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

  async deleteGauge(id, userId = null) {
    const result = await this.repository.softDelete(id);
    await this._logAuditAction('gauge_deleted', id, userId);
    return result;
  }

  _extractAuditValues(oldGauge, updates) {
    return Object.keys(updates).reduce((acc, key) => {
      acc.oldValues[key] = oldGauge[key];
      acc.newValues[key] = updates[key];
      return acc;
    }, { oldValues: {}, newValues: {} });
  }
}
```

### Pattern 2: Complex Workflow Service

Multi-step business workflows:

```javascript
class GaugeSetService {
  /**
   * Replace a companion gauge in a set
   * Business rules:
   * - Existing gauge must be in a set
   * - New companion must be unpaired
   * - Neither gauge in set can be checked out
   * - Replacement gauge cannot be in pending_qc
   */
  async replaceCompanion(existingGaugeId, newCompanionId, userId, reason) {
    if (!reason) {
      throw new Error('Reason is required for companion replacement');
    }

    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // 1. Validate existing gauge
      const existingGauge = await this.validationHelper.getAndValidateGauge(
        existingGaugeId,
        connection,
        'Existing gauge'
      );

      if (!existingGauge.setId) {
        throw new Error('Existing gauge must be part of a set');
      }

      // 2. Get all gauges in the set
      const [gaugesInSet] = await connection.query(
        'SELECT id FROM gauges WHERE set_id = ?',
        [existingGauge.setId]
      );

      if (gaugesInSet.length !== 2) {
        throw new Error('Invalid set: expected 2 gauges');
      }

      const oldCompanionId = gaugesInSet.find(g => g.id !== existingGaugeId)?.id;

      // 3. Validate old companion
      const oldCompanion = await this.validationHelper.getAndValidateGauge(
        oldCompanionId,
        connection,
        'Old companion gauge'
      );

      // 4. Validate new companion
      const newCompanion = await this.validationHelper.getAndValidateGauge(
        newCompanionId,
        connection,
        'New companion gauge'
      );

      if (newCompanion.setId) {
        throw new Error('New companion gauge must be unpaired (no set_id)');
      }

      // 5. Validate checkout status
      if (existingGauge.status === 'checked_out' || oldCompanion.status === 'checked_out') {
        throw new Error('Cannot replace gauge while either gauge in set is checked out');
      }

      if (newCompanion.status === 'pending_qc') {
        throw new Error('Cannot use gauge in pending_qc status for replacement');
      }

      // 6. Update new gauge location
      await this.repository.updateLocation(
        connection,
        newCompanionId,
        existingGauge.storageLocation
      );

      // 7. Remove old companion from set
      await connection.execute(
        'UPDATE gauges SET set_id = NULL WHERE id = ?',
        [oldCompanionId]
      );

      // 8. Add new companion to set
      await connection.execute(
        'UPDATE gauges SET set_id = ? WHERE id = ?',
        [existingGauge.setId, newCompanionId]
      );

      // 9. Create audit trail
      await this._createAuditTrail(
        connection,
        existingGaugeId,
        newCompanionId,
        'replaced',
        userId,
        reason,
        {
          setId: existingGauge.setId,
          previousCompanionId: oldCompanionId,
          replacedGaugeId: existingGaugeId,
          newCompanionId: newCompanionId
        }
      );

      return { success: true, setId: existingGauge.setId };
    });
  }
}
```

### Pattern 3: Helper Extraction

When services grow too large, extract helpers:

```javascript
// GaugeSetService.js
class GaugeSetService {
  constructor(pool, repository, gaugeRepository = null) {
    this.pool = pool;
    this.repository = repository;
    this.gaugeRepository = gaugeRepository;
    this.transactionHelper = new TransactionHelper(pool);
    this.validationHelper = new ValidationHelper(repository, pool);
  }
}

// helpers/GaugeSetTransactionHelper.js
class TransactionHelper {
  constructor(pool) {
    this.pool = pool;
  }

  async executeInTransaction(callback) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

// helpers/GaugeSetValidationHelper.js
class ValidationHelper {
  constructor(repository, pool) {
    this.repository = repository;
    this.pool = pool;
  }

  async getAndValidateGauge(gaugeId, connection, gaugeName = 'Gauge') {
    const [gauges] = await connection.query(
      'SELECT * FROM gauges WHERE id = ? FOR UPDATE',
      [gaugeId]
    );

    if (gauges.length === 0) {
      throw new Error(`${gaugeName} with ID ${gaugeId} not found`);
    }

    return gauges[0];
  }

  validateIsSpare(gauge) {
    if (gauge.set_id !== null) {
      throw new Error(`Gauge ${gauge.gauge_id} is already part of a set`);
    }
  }
}
```

## Service Registry Pattern

### Registration

**Location**: `backend/src/bootstrap/registerServices.js`

```javascript
const serviceRegistry = require('../infrastructure/services/ServiceRegistry');

// Create repositories
const gaugeRepository = new GaugeRepository();
const gaugeSetRepository = new GaugeSetRepository();

// Create services with dependencies
const gaugeIdService = new GaugeIdService();
const gaugeValidationService = new GaugeValidationService();
const gaugeCreationService = new GaugeCreationService(
  gaugeRepository,
  gaugeSetRepository,
  gaugeReferenceRepository,
  { auditService }
);

// Register services
serviceRegistry.register('GaugeIdService', gaugeIdService);
serviceRegistry.register('GaugeValidationService', gaugeValidationService);
serviceRegistry.register('GaugeCreationService', gaugeCreationService);
```

### Usage

```javascript
class GaugeCreationService extends BaseService {
  async createGauge(gaugeData, userId) {
    // Get validation service from registry
    const validationService = serviceRegistry.get('GaugeValidationService');
    gaugeData = validationService.normalizeThreadData(gaugeData);

    // Get ID service from registry
    const gaugeIdService = serviceRegistry.get('GaugeIdService');
    gaugeData.gauge_id = await gaugeIdService.generateSystemId(
      gaugeData.category_id
    );

    // Business logic...
  }
}
```

## Audit Trail Integration

### Pattern: Consistent Audit Logging

```javascript
class GaugeCreationService extends BaseService {
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

  async createGauge(gaugeData, userId) {
    const gauge = await this.repository.createGauge(gaugeData);

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

    return gauge;
  }
}
```

## Error Handling in Services

### Pattern: Log and Rethrow

```javascript
async createGauge(gaugeData, userId) {
  try {
    // Business logic
    const gauge = await this.repository.createGauge(gaugeData);
    return gauge;
  } catch (error) {
    logger.error('Failed to create gauge:', {
      error: error.message,
      gaugeData,
      userId,
      stack: error.stack
    });
    throw error; // Let error handler middleware process it
  }
}
```

### Pattern: Graceful Degradation

```javascript
async createGauge(gaugeData, userId) {
  const gauge = await this.repository.createGauge(gaugeData);

  // Record in inventory (optional - don't fail if inventory is down)
  if (gaugeData.location) {
    try {
      await this.movementService.moveItem({ ... });
    } catch (inventoryError) {
      logger.error('Failed to record gauge in inventory', {
        gaugeId: gaugeData.gauge_id,
        error: inventoryError.message
      });
      // Don't fail the whole operation if inventory update fails
    }
  }

  return gauge;
}
```

## Best Practices

### 1. Single Responsibility
Each service should have a clear, focused purpose:
- ✅ `GaugeCreationService` - Create, update, delete gauges
- ✅ `GaugeSetService` - Manage gauge sets and pairing
- ✅ `GaugeValidationService` - Validate gauge data
- ❌ `GaugeService` - Too broad, handles everything

### 2. Keep Methods Focused
Target 10-20 lines per method, maximum 200 lines:

```javascript
// ✅ GOOD - Focused method
async createGauge(gaugeData, userId) {
  gaugeData = await this._validateAndNormalize(gaugeData);
  const gauge = await this._createWithId(gaugeData, userId);
  await this._recordInInventory(gauge, gaugeData.location, userId);
  await this._logAudit('gauge_created', gauge.id, userId);
  return gauge;
}

// ❌ BAD - 100+ line method with multiple concerns
async createGauge(gaugeData, userId) {
  // Validation logic (30 lines)
  // ID generation logic (20 lines)
  // Creation logic (20 lines)
  // Inventory logic (20 lines)
  // Audit logic (10 lines)
}
```

### 3. Extract Helpers at 300 Lines
When a service exceeds 300 lines, extract helpers:

```javascript
// Before: GaugeSetService.js (450 lines)
class GaugeSetService {
  // All validation logic inline
  // All transaction logic inline
}

// After: Split into focused files
// GaugeSetService.js (280 lines)
// helpers/GaugeSetTransactionHelper.js (80 lines)
// helpers/GaugeSetValidationHelper.js (90 lines)
```

### 4. Use Private Helpers
Extract repeated logic to private methods:

```javascript
class GaugeCreationService extends BaseService {
  // Public API
  async createGauge(gaugeData, userId) { }

  // Private helpers (prefix with _)
  _validateGaugeSetSpecs(goData, noGoData) { }
  _prepareGaugeForSet(gaugeData, setId, isGoGauge, userId) { }
  _extractAuditValues(oldGauge, updates) { }
  async _logAuditAction(action, recordId, userId, details) { }
  async _checkSetIdHistoricalUsage(setId, connection) { }
}
```

### 5. Document Complex Business Logic
Add JSDoc comments for complex methods:

```javascript
/**
 * Create a gauge set (GO/NO GO pair) with proper validation and transaction safety
 * NEW SYSTEM: Uses set_id for grouping, individual gauge_id for each gauge
 * @param {Object} goGaugeData - Data for the GO gauge
 * @param {Object} noGoGaugeData - Data for the NO GO gauge
 * @param {number} userId - User creating the set
 * @returns {Promise<Object>} Result with goId, noGoId, and setId
 */
async createGaugeSet(goGaugeData, noGoGaugeData, userId) {
  // Implementation...
}
```
