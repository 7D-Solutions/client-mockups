# Architecture Patterns

**Fire-Proof ERP Backend - Architectural Design Patterns**

## Overview

The Fire-Proof ERP backend follows a layered architecture with strict separation of concerns. This document describes the core architectural patterns used throughout the backend.

## Layered Architecture

### Layer Hierarchy

```
┌─────────────────────────────────────┐
│         HTTP Layer (Routes)         │  ← Express endpoints
├─────────────────────────────────────┤
│      Presentation Layer             │  ← Presenters, DTOs
├─────────────────────────────────────┤
│       Service Layer                 │  ← Business logic orchestration
├─────────────────────────────────────┤
│       Domain Layer                  │  ← Business rules, entities
├─────────────────────────────────────┤
│      Repository Layer               │  ← Data access abstraction
├─────────────────────────────────────┤
│     Infrastructure Layer            │  ← Database, auth, audit
└─────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. HTTP Layer (Routes)
**Location**: `modules/*/routes/`

**Responsibilities**:
- Define HTTP endpoints
- Route parameter validation
- Request parsing
- Middleware application
- Response sending

**Example**:
```javascript
router.post('/gauges',
  authenticateToken,
  checkPermission('gauge.create.access'),
  async (req, res) => {
    try {
      const gauge = await gaugeCreationService.createGauge(req.body, req.user.id);
      const response = GaugePresenter.formatGaugeResponse(gauge);
      res.status(201).json({ success: true, data: response });
    } catch (error) {
      next(error);
    }
  }
);
```

#### 2. Presentation Layer (Presenters)
**Location**: `modules/*/presenters/`

**Responsibilities**:
- Format responses for API consumers
- Add computed fields (displayName, HATEOAS links)
- Transform database models to DTOs
- Apply presentation-specific logic

**Example**:
```javascript
class GaugePresenter {
  static formatGaugeResponse(gauge) {
    return {
      ...gauge,
      displayName: this.generateDisplayName(gauge),
      _links: this.generateHATEOASLinks(gauge)
    };
  }
}
```

#### 3. Service Layer
**Location**: `modules/*/services/`

**Responsibilities**:
- Orchestrate business operations
- Coordinate multiple repositories
- Implement business workflows
- Manage transactions
- Create audit trail

**Pattern**: See [Service Layer Documentation](./02-Service-Layer.md)

#### 4. Domain Layer
**Location**: `modules/*/domain/`

**Responsibilities**:
- Define business entities
- Enforce business rules
- Validate domain constraints
- Encapsulate domain logic

**Example**:
```javascript
class GaugeEntity {
  constructor(data) {
    this.validateGaugeData(data);
    this.threadSize = this.normalizeThreadSize(data.threadSize);
    this.threadClass = data.threadClass;
    this.serialNumber = data.serialNumber;
  }

  validateGaugeData(data) {
    if (!data.serialNumber) {
      throw new DomainValidationError('Serial number is required');
    }
    if (data.threadSize && !this.isValidThreadSize(data.threadSize)) {
      throw new DomainValidationError('Invalid thread size format');
    }
  }
}
```

#### 5. Repository Layer
**Location**: `modules/*/repositories/`, `infrastructure/repositories/`

**Responsibilities**:
- Abstract data access
- Execute database queries
- Handle database connections
- Manage transactions
- Map database rows to objects

**Pattern**: See [Repository Layer Documentation](./03-Repository-Layer.md)

#### 6. Infrastructure Layer
**Location**: `infrastructure/`

**Responsibilities**:
- Cross-cutting concerns
- Authentication and authorization
- Database connection pooling
- Audit logging
- Error handling
- Event bus
- Notifications

**Pattern**: See [Infrastructure Services Documentation](./04-Infrastructure-Services.md)

## Modular Architecture

### Module Structure

Each business domain is self-contained:

```
modules/gauge/
├── domain/                    # Business entities and rules
│   ├── GaugeEntity.js
│   ├── GaugeSet.js
│   └── DomainValidationError.js
├── repositories/              # Data access
│   ├── GaugeRepository.js
│   ├── GaugeSetRepository.js
│   └── CalibrationRepository.js
├── services/                  # Business logic
│   ├── GaugeCreationService.js
│   ├── GaugeSetService.js
│   └── GaugeValidationService.js
├── routes/                    # HTTP endpoints
│   ├── gauges-v2.js
│   └── calibration.routes.js
├── middleware/                # Module-specific middleware
│   └── validation.js
├── mappers/                   # DTO transformations
│   └── GaugeDTOMapper.js
├── presenters/                # Response formatting
│   └── GaugePresenter.js
├── queries/                   # Complex SQL queries
│   └── gaugeQueries.js
└── utils/                     # Module utilities
    └── threadSizeNormalizer.js
```

### Module Boundaries

**Strict Rules**:
1. Modules cannot directly access other module internals
2. Cross-module communication through:
   - Service Registry pattern
   - Event bus for async operations
   - Shared infrastructure services
3. Shared code lives in `infrastructure/` or `erp-core/`

**Example**:
```javascript
// ✅ CORRECT - Use service registry
const validationService = serviceRegistry.get('GaugeValidationService');

// ❌ WRONG - Direct import from other module
const { validateUser } = require('../../admin/services/UserService');
```

## Repository Pattern

### Base Repository Pattern

All repositories extend `BaseRepository`:

```javascript
class GaugeRepository extends BaseRepository {
  constructor(pool = null) {
    super('gauges', 'id'); // tableName, primaryKey
  }

  // Specialized query methods
  async findByGaugeId(gaugeId, connection = null) {
    return await this._fetchGaugeByField('gauge_id', gaugeId, connection);
  }

  async findBySetId(setId, connection = null) {
    // Custom implementation
  }
}
```

### Transaction Support

Repositories support external connections for transactions:

```javascript
// Service layer manages transaction
await this.executeInTransaction(async (connection) => {
  const gauge1 = await this.gaugeRepository.create(data1, connection);
  const gauge2 = await this.gaugeRepository.create(data2, connection);
  await this.auditService.logAction({ ... }, connection);
  return { gauge1, gauge2 };
});
```

### Connection Management Patterns

#### Pattern 1: Automatic Connection Management
```javascript
// Repository handles connection
async findById(id) {
  return this.withConnection(async (connection) => {
    const [rows] = await connection.execute(query, [id]);
    return rows[0];
  });
}
```

#### Pattern 2: External Connection (Transaction)
```javascript
// Caller provides connection
async create(data, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;

  try {
    const [result] = await connection.execute(query, values);
    return { id: result.insertId, ...data };
  } finally {
    if (shouldRelease) connection.release();
  }
}
```

## Service Pattern

### Base Service Pattern

All services extend `BaseService`:

```javascript
class GaugeCreationService extends BaseService {
  constructor(gaugeRepository, gaugeSetRepository, options = {}) {
    super(gaugeRepository, options);
    this.gaugeSetRepository = gaugeSetRepository;
  }

  async createGauge(gaugeData, userId) {
    // Validation
    // Business logic
    // Repository calls
    // Audit trail
  }
}
```

### Dependency Injection

Services receive dependencies via constructor:

```javascript
// Bootstrap/service registration
const gaugeRepository = new GaugeRepository();
const gaugeSetRepository = new GaugeSetRepository();
const gaugeCreationService = new GaugeCreationService(
  gaugeRepository,
  gaugeSetRepository,
  { auditService }
);
```

### Service Orchestration

Services coordinate multiple repositories and operations:

```javascript
async createGaugeSet(goGaugeData, noGoGaugeData, userId) {
  return this.executeInTransaction(async (connection) => {
    // Validate business rules
    this._validateGaugeSetSpecs(goGaugeData, noGoGaugeData);

    // Generate IDs
    const setId = await this.gaugeIdService.generateSystemId(categoryId);

    // Create both gauges
    const goGauge = await this.repository.createGauge(goData, connection);
    const noGoGauge = await this.repository.createGauge(noGoData, connection);

    // Record in inventory (cross-module)
    await this.movementService.moveItem({ ... });

    // Audit trail
    await this.auditService.logAction({ ... }, connection);

    return { go: goGauge, noGo: noGoGauge, setId };
  });
}
```

## Domain-Driven Design Elements

### Domain Entities

Encapsulate business rules and validation:

```javascript
class GaugeSet {
  constructor({ baseId, goGauge, noGoGauge, category }) {
    // Validate relationship-level rules
    this.validateCompanionCompatibility(goGauge, noGoGauge);
    this.validateCategoryRestrictions(category);

    this.baseId = baseId;
    this.goGauge = goGauge;
    this.noGoGauge = noGoGauge;
    this.category = category;
  }

  validateCompanionCompatibility(go, noGo) {
    if (go.threadSize !== noGo.threadSize) {
      throw new DomainValidationError('Thread sizes must match');
    }
  }
}
```

### Value Objects

Immutable objects representing domain concepts:

```javascript
class ThreadSize {
  constructor(value) {
    this.value = this.normalize(value);
  }

  normalize(value) {
    // Convert fractional to decimal: "1/2" → "0.500"
    // Standardize format
  }

  equals(other) {
    return this.value === other.value;
  }
}
```

### Domain Events

Raise events for significant business operations:

```javascript
// In service layer
const event = {
  type: 'gauge_set_created',
  data: { setId, goGaugeId, noGoGaugeId },
  timestamp: new Date()
};
eventBus.emit('gauge:set_created', event);

// Event handlers
eventBus.on('gauge:set_created', async (event) => {
  await notificationService.notifySetCreated(event.data);
});
```

## Transaction Patterns

### Explicit Transaction Pattern (Recommended)

```javascript
class GaugeSetService {
  async createGaugeSet(data, userId) {
    return await this.transactionHelper.executeInTransaction(async (connection) => {
      // All operations use the same connection
      const goGauge = await this.repository.create(goData, connection);
      const noGoGauge = await this.repository.create(noGoData, connection);
      await this.auditRepository.log(auditData, connection);
      return { goGauge, noGoGauge };
    });
  }
}
```

### BaseService Transaction Helper

```javascript
class BaseService {
  async executeInTransaction(operation, auditData = null) {
    const pool = this.pool || dbConnection.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await operation(connection);

      if (auditData && this.auditService) {
        await this.auditService.logAction(auditData, connection);
      }

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
```

## Error Handling Pattern

### Service Layer Error Handling

```javascript
async createGauge(gaugeData, userId) {
  try {
    // Validation
    const validationService = serviceRegistry.get('GaugeValidationService');
    gaugeData = validationService.normalizeThreadData(gaugeData);

    // Business logic
    const gauge = await this.repository.createGauge(gaugeData);

    // Audit
    await this.auditService.logAction({ ... });

    return gauge;
  } catch (error) {
    logger.error('Failed to create gauge:', {
      error: error.message,
      gaugeData,
      userId
    });
    throw error; // Let error handler middleware process it
  }
}
```

### Repository Layer Error Handling

```javascript
async create(data, conn) {
  try {
    const [result] = await connection.execute(query, values);
    return { id: result.insertId, ...data };
  } catch (error) {
    logger.error(`${this.constructor.name}.create failed:`, {
      error: error.message,
      table: this.tableName,
      sqlState: error.sqlState
    });
    throw error;
  }
}
```

## File Size Management

### Refactoring Triggers

**When a file exceeds 300 lines**:

1. **Extract Helper Classes**:
```javascript
// Before: GaugeSetService.js (450 lines)
// After: Split into:
//   - GaugeSetService.js (280 lines)
//   - GaugeSetTransactionHelper.js (80 lines)
//   - GaugeSetValidationHelper.js (90 lines)
```

2. **Extract Specialized Services**:
```javascript
// Before: GaugeService.js (600 lines)
// After: Split into:
//   - GaugeCreationService.js (280 lines)
//   - GaugeSetService.js (250 lines)
//   - GaugeValidationService.js (70 lines)
```

3. **Move Domain Logic to Entities**:
```javascript
// Before: Service contains validation logic
// After: Move to GaugeEntity, GaugeSet domain objects
```

### Size Constraints

- **Target**: 200-300 lines
- **Maximum**: 500 lines (absolute limit)
- **Refactoring Trigger**: >300 lines
- **Production Blocker**: >500 lines

## Best Practices

### 1. Separation of Concerns
- Keep layers independent
- Routes should not contain business logic
- Services should not format responses
- Repositories should only handle data access

### 2. Dependency Direction
- Dependencies flow inward (routes → services → repositories)
- Infrastructure layer is accessed by all layers
- Domain layer has no dependencies on other layers

### 3. Transaction Boundaries
- Services define transaction boundaries
- Repositories accept connections for transactions
- Always commit or rollback explicitly

### 4. Error Propagation
- Let errors bubble up to error handler middleware
- Log errors at the layer where they occur
- Add context to errors for debugging

### 5. Testing Strategy
- Test services with mocked repositories
- Test repositories with test database
- Test routes with integration tests
- Test domain entities in isolation
