# Gauge Set System - Clean-Slate Architectural Plan

**Status**: Development Phase - Breaking Changes Allowed
**Date**: October 2024
**Scope**: Complete rebuild of gauge set creation and companion management system

---

## Executive Summary

### Critical Issues Identified

1. **Complete System Failure**: NO gauge sets exist in production database
   - All `companion_gauge_id` fields are NULL
   - All `gauge_suffix` fields are NULL
   - GO/NO GO distinction completely non-functional

2. **Root Causes**:
   - Transaction boundary violations in repository layer
   - Missing field population in service layer
   - Architectural confusion in dual-mode methods

3. **Solution**: Clean-slate architecture with:
   - Database constraints and triggers
   - Domain-driven design with GaugeSet aggregate
   - Explicit transaction passing pattern
   - Service layer orchestration

---

## Current State Analysis

### Database Reality (Evidence from `db_export_20251021_212300.sql`)

```sql
-- Example gauge record (line 1568):
INSERT INTO gauges VALUES
  (1568, 'SP0001', NULL, '.312-18 2A RING', 'thread_gauge',
   'JOE25022', 41, 'available', NULL, 0, ..., NULL, 'SP0001', NULL, ...)
   --                                                  ^^^^           ^^^^
   --                                      companion_gauge_id=NULL  gauge_suffix=NULL
```

**Finding**: 100% of gauges have NULL companion relationships and NULL suffixes.

### Implementation Status

| Component | Completeness | Status |
|-----------|--------------|--------|
| Database Schema | 95% | Fields exist but no constraints |
| Backend API Endpoints | 70% | Routes exist but broken logic |
| Backend Services | 80% | Logic exists but transaction bugs |
| Frontend Components | 40% | Basic UI, missing workflows |

### Gap Analysis

**Missing Functionality**:
- ❌ Spare Inventory UI
- ❌ Pair Spares workflow
- ❌ Replace Gauge workflow
- ❌ Companion History display

**Broken Functionality**:
- ❌ Gauge set creation (creates orphans instead)
- ❌ GO/NO GO distinction (no suffix population)
- ❌ Companion linking (transaction boundary violation)

---

## Root Cause Analysis

### Bug 1: Transaction Boundary Violation

**Location**: `backend/src/modules/gauge/repositories/GaugeRepository.js:934-943`

**The Problem**:
```javascript
async updateCompanionGauges(gaugeId1, gaugeId2, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  // ... validation logic ...

  // ❌ CRITICAL BUG: Missing connection parameter
  await this.executeQuery(
    'UPDATE gauges SET companion_gauge_id = ? WHERE id = ?',
    [gaugeId2, gaugeId1]
    // Should be: [gaugeId2, gaugeId1], connection
  );

  await this.executeQuery(
    'UPDATE gauges SET companion_gauge_id = ? WHERE id = ?',
    [gaugeId1, gaugeId2]
    // Should be: [gaugeId1, gaugeId2], connection
  );
}
```

**Why This Breaks**:
```javascript
// BaseRepository.executeQuery (lines 524-558):
async executeQuery(query, params = [], conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  //                  ^^^^
  // Without conn parameter, gets NEW connection from pool!
  // This breaks transaction isolation!
}
```

**Impact**: Updates execute on different connection → outside transaction scope → rollback doesn't affect companion updates → orphaned gauges created.

### Bug 2: Missing `gauge_suffix` Population

**Location**: `backend/src/modules/gauge/services/GaugeCreationService.js:266-290`

**The Problem**:
```javascript
const goGaugeWithId = {
  ...goGaugeData,
  system_gauge_id: `${baseId}A`,  // String contains 'A'
  gauge_id: `${baseId}A`,
  companion_gauge_id: null,
  // ❌ MISSING: gauge_suffix: 'A'
  created_by: userId
};

const noGoGaugeWithId = {
  ...noGoGaugeData,
  system_gauge_id: `${baseId}B`,  // String contains 'B'
  gauge_id: `${baseId}B`,
  companion_gauge_id: null,
  // ❌ MISSING: gauge_suffix: 'B'
  created_by: userId
};
```

**Impact**:
- No GO/NO GO distinction at database level
- Inefficient queries (must parse strings instead of indexed suffix column)
- Violates normalization (data encoded in string)

### Bug 3: Architectural Ambiguity

**Problem**: Methods try to be dual-purpose (standalone + transactional)

```javascript
async updateCompanionGauges(gaugeId1, gaugeId2, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  //                  ^^^^ Who owns this transaction?
}
```

**Confusion**:
- If `conn` provided → use it (part of larger transaction)
- If `conn` not provided → create own transaction
- Violates Single Responsibility Principle
- Unclear transaction ownership

---

## Clean-Slate Architecture Design

### Design Principles

1. **Explicit Over Implicit**: Transaction boundaries must be obvious
2. **Fail Fast**: Invalid states prevented at database level
3. **Domain-Driven**: Business logic in domain objects, not scattered
4. **Single Responsibility**: Each layer has ONE job
5. **Type Safety**: Domain objects enforce invariants

### Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (React)                    │
│  - CreateGaugeWorkflow.tsx                          │
│  - GaugeSetDisplay.tsx                              │
│  - SpareInventoryPanel.tsx                          │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│              Service Layer                           │
│  - GaugeSetService (orchestrates transactions)      │
│  - Validates business rules                         │
│  - Manages transaction lifecycle                    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Domain Model                            │
│  - GaugeSet (aggregate root)                        │
│  - GaugeEntity (value object)                       │
│  - Enforces invariants                              │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│           Repository Layer                           │
│  - GaugeRepository (data access only)               │
│  - ALL write methods REQUIRE connection             │
│  - NO transaction management                        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               Database Layer                         │
│  - Constraints enforce data integrity               │
│  - Triggers maintain consistency                    │
│  - Foreign keys enforce relationships               │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema Improvements

### 1. Add Constraints

```sql
-- Constraint: Thread gauges must have valid suffix
ALTER TABLE gauges ADD CONSTRAINT chk_thread_has_suffix CHECK (
  (equipment_type != 'thread_gauge') OR
  (equipment_type = 'thread_gauge' AND gauge_suffix IN ('A', 'B', NULL))
);

-- Constraint: Suffix must match system_gauge_id ending
ALTER TABLE gauges ADD CONSTRAINT chk_suffix_matches_id CHECK (
  gauge_suffix IS NULL OR
  system_gauge_id LIKE CONCAT('%', gauge_suffix)
);

-- Constraint: Companion relationship must be bidirectional
ALTER TABLE gauges ADD CONSTRAINT chk_bidirectional_companion CHECK (
  companion_gauge_id IS NULL OR
  EXISTS (
    SELECT 1 FROM gauges g2
    WHERE g2.id = gauges.companion_gauge_id
    AND g2.companion_gauge_id = gauges.id
  )
);

-- Constraint: NPT gauges cannot have companions
ALTER TABLE gauges ADD CONSTRAINT chk_npt_no_companion CHECK (
  category_id != (SELECT id FROM gauge_categories WHERE name = 'NPT') OR
  companion_gauge_id IS NULL
);
```

### 2. Add Triggers

```sql
-- Trigger: Ensure bidirectional companion updates
DELIMITER $$
CREATE TRIGGER trg_companion_bidirectional
AFTER UPDATE ON gauges
FOR EACH ROW
BEGIN
  IF NEW.companion_gauge_id IS NOT NULL AND NEW.companion_gauge_id != OLD.companion_gauge_id THEN
    UPDATE gauges
    SET companion_gauge_id = NEW.id
    WHERE id = NEW.companion_gauge_id
    AND companion_gauge_id != NEW.id;
  END IF;
END$$
DELIMITER ;

-- Trigger: Auto-populate gauge_suffix from system_gauge_id
DELIMITER $$
CREATE TRIGGER trg_auto_suffix
BEFORE INSERT ON gauges
FOR EACH ROW
BEGIN
  IF NEW.equipment_type = 'thread_gauge' AND NEW.gauge_suffix IS NULL THEN
    IF NEW.system_gauge_id LIKE '%A' THEN
      SET NEW.gauge_suffix = 'A';
    ELSEIF NEW.system_gauge_id LIKE '%B' THEN
      SET NEW.gauge_suffix = 'B';
    END IF;
  END IF;
END$$
DELIMITER ;
```

### 3. Add Indexes

```sql
-- Index for finding companion pairs
CREATE INDEX idx_companion_gauge_id ON gauges(companion_gauge_id);

-- Index for finding gauges by suffix
CREATE INDEX idx_gauge_suffix ON gauges(gauge_suffix);

-- Composite index for spare queries
CREATE INDEX idx_spare_lookup ON gauges(equipment_type, gauge_suffix, companion_gauge_id, status);
```

---

## Domain Model

### GaugeSet Aggregate Root

```javascript
// backend/src/modules/gauge/domain/GaugeSet.js

class GaugeSet {
  constructor({ baseId, goGauge, noGoGauge, category }) {
    this.baseId = baseId;
    this.goGauge = goGauge;
    this.noGoGauge = noGoGauge;
    this.category = category;

    this.validate();
  }

  validate() {
    // Business Rule: Companion gauges must have matching specifications
    if (!this.specificationsMatch()) {
      throw new DomainValidationError(
        'Companion gauges must have matching thread size, class, and type'
      );
    }

    // Business Rule: NPT gauges cannot have companion pairs
    if (this.category.name === 'NPT') {
      throw new DomainValidationError('NPT gauges cannot have companion pairs');
    }

    // Business Rule: GO gauge must have suffix 'A'
    if (this.goGauge.suffix !== 'A') {
      throw new DomainValidationError('GO gauge must have suffix A');
    }

    // Business Rule: NO GO gauge must have suffix 'B'
    if (this.noGoGauge.suffix !== 'B') {
      throw new DomainValidationError('NO GO gauge must have suffix B');
    }
  }

  specificationsMatch() {
    return (
      this.goGauge.threadSize === this.noGoGauge.threadSize &&
      this.goGauge.threadClass === this.noGoGauge.threadClass &&
      this.goGauge.threadType === this.noGoGauge.threadType
    );
  }

  toDatabase() {
    return {
      goGauge: {
        ...this.goGauge.toDatabase(),
        system_gauge_id: `${this.baseId}A`,
        gauge_id: `${this.baseId}A`,
        gauge_suffix: 'A'
      },
      noGoGauge: {
        ...this.noGoGauge.toDatabase(),
        system_gauge_id: `${this.baseId}B`,
        gauge_id: `${this.baseId}B`,
        gauge_suffix: 'B'
      }
    };
  }
}

module.exports = GaugeSet;
```

### GaugeEntity Value Object

```javascript
// backend/src/modules/gauge/domain/GaugeEntity.js

class GaugeEntity {
  constructor(data) {
    this.id = data.id;
    this.systemGaugeId = data.system_gauge_id;
    this.gaugeSuffix = data.gauge_suffix;
    this.description = data.description;
    this.equipmentType = data.equipment_type;
    this.manufacturer = data.manufacturer;
    this.categoryId = data.category_id;
    this.status = data.status;
    this.companionGaugeId = data.companion_gauge_id;

    // Thread specification fields
    this.threadSize = data.thread_size;
    this.threadClass = data.thread_class;
    this.threadType = data.thread_type;

    this.validate();
  }

  validate() {
    if (!this.systemGaugeId) {
      throw new DomainValidationError('system_gauge_id is required');
    }

    if (this.equipmentType === 'thread_gauge' && !this.threadSize) {
      throw new DomainValidationError('thread_size is required for thread gauges');
    }
  }

  get suffix() {
    return this.gaugeSuffix;
  }

  toDatabase() {
    return {
      system_gauge_id: this.systemGaugeId,
      gauge_suffix: this.gaugeSuffix,
      description: this.description,
      equipment_type: this.equipmentType,
      manufacturer: this.manufacturer,
      category_id: this.categoryId,
      status: this.status,
      companion_gauge_id: this.companionGaugeId,
      thread_size: this.threadSize,
      thread_class: this.threadClass,
      thread_type: this.threadType
    };
  }
}

module.exports = GaugeEntity;
```

---

## Repository Pattern

### Key Principles

1. **Explicit Transaction Requirement**: All write methods MUST receive connection
2. **No Transaction Management**: Repository doesn't manage transactions
3. **Single Responsibility**: Data access only, no business logic

### GaugeRepository (Refactored)

```javascript
// backend/src/modules/gauge/repositories/GaugeRepository.js

class GaugeRepository extends BaseRepository {

  // ✅ CORRECT: Explicit connection requirement
  async createWithinTransaction(gaugeData, connection) {
    if (!connection) {
      throw new Error('createWithinTransaction requires connection parameter');
    }

    const query = `
      INSERT INTO gauges (
        system_gauge_id, gauge_suffix, description, equipment_type,
        manufacturer, category_id, status, created_by, thread_size,
        thread_class, thread_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      gaugeData.system_gauge_id,
      gaugeData.gauge_suffix,  // ✅ Explicitly set
      gaugeData.description,
      gaugeData.equipment_type,
      gaugeData.manufacturer,
      gaugeData.category_id,
      gaugeData.status || 'available',
      gaugeData.created_by,
      gaugeData.thread_size,
      gaugeData.thread_class,
      gaugeData.thread_type
    ];

    const result = await this.executeQuery(query, params, connection);
    return { id: result.insertId, ...gaugeData };
  }

  // ✅ CORRECT: Explicit connection requirement
  async linkCompanionsWithinTransaction(gaugeId1, gaugeId2, connection) {
    if (!connection) {
      throw new Error('linkCompanionsWithinTransaction requires connection parameter');
    }

    // Validation: Ensure both gauges exist
    const gauges = await this.executeQuery(
      'SELECT id, equipment_type FROM gauges WHERE id IN (?, ?)',
      [gaugeId1, gaugeId2],
      connection
    );

    if (gauges.length !== 2) {
      throw new Error('Both gauges must exist to link as companions');
    }

    // Update both gauges in single transaction
    await this.executeQuery(
      'UPDATE gauges SET companion_gauge_id = ? WHERE id = ?',
      [gaugeId2, gaugeId1],
      connection  // ✅ Explicit connection passing
    );

    await this.executeQuery(
      'UPDATE gauges SET companion_gauge_id = ? WHERE id = ?',
      [gaugeId1, gaugeId2],
      connection  // ✅ Explicit connection passing
    );
  }

  // ✅ CORRECT: Read operations can use default connection
  async findById(id) {
    const query = `
      SELECT g.*,
             c.system_gauge_id as companion_system_id,
             c.gauge_suffix as companion_suffix
      FROM gauges g
      LEFT JOIN gauges c ON g.companion_gauge_id = c.id
      WHERE g.id = ?
    `;

    const results = await this.executeQuery(query, [id]);
    return results[0];
  }

  // ✅ CORRECT: Spares query with efficient suffix index usage
  async findSpares(filters = {}) {
    const conditions = [];
    const params = [];

    // Spares are gauges without companions
    conditions.push('companion_gauge_id IS NULL');

    if (filters.equipmentType) {
      conditions.push('equipment_type = ?');
      params.push(filters.equipmentType);
    }

    if (filters.gaugeSuffix) {
      conditions.push('gauge_suffix = ?');
      params.push(filters.gaugeSuffix);
    }

    const query = `
      SELECT * FROM gauges
      WHERE ${conditions.join(' AND ')}
      ORDER BY system_gauge_id
    `;

    return this.executeQuery(query, params);
  }
}
```

---

## Service Layer

### GaugeSetService (New)

```javascript
// backend/src/modules/gauge/services/GaugeSetService.js

const BaseService = require('../../../infrastructure/services/BaseService');
const GaugeRepository = require('../repositories/GaugeRepository');
const GaugeSet = require('../domain/GaugeSet');
const GaugeEntity = require('../domain/GaugeEntity');

class GaugeSetService extends BaseService {
  constructor() {
    super('gauges');
    this.gaugeRepository = new GaugeRepository();
  }

  /**
   * Create a gauge set (GO + NO GO pair)
   * @param {Object} goData - GO gauge data
   * @param {Object} noGoData - NO GO gauge data
   * @param {number} userId - User creating the set
   * @returns {Promise<Object>} Created gauge set
   */
  async createGaugeSet(goData, noGoData, userId) {
    return this.executeInTransaction(async (connection) => {

      // 1. Get next gauge ID
      const baseId = await this.gaugeRepository.getNextGaugeId(connection);

      // 2. Create domain objects
      const goGauge = new GaugeEntity({
        ...goData,
        gauge_suffix: 'A',  // ✅ Explicitly set
        system_gauge_id: `${baseId}A`,
        created_by: userId
      });

      const noGoGauge = new GaugeEntity({
        ...noGoData,
        gauge_suffix: 'B',  // ✅ Explicitly set
        system_gauge_id: `${baseId}B`,
        created_by: userId
      });

      // 3. Create GaugeSet aggregate (validates business rules)
      const gaugeSet = new GaugeSet({
        baseId,
        goGauge,
        noGoGauge,
        category: goData.category
      });

      // 4. Convert to database format
      const dbData = gaugeSet.toDatabase();

      // 5. Create both gauges within transaction
      const createdGo = await this.gaugeRepository.createWithinTransaction(
        dbData.goGauge,
        connection  // ✅ Explicit connection passing
      );

      const createdNoGo = await this.gaugeRepository.createWithinTransaction(
        dbData.noGoGauge,
        connection  // ✅ Explicit connection passing
      );

      // 6. Link companions within same transaction
      await this.gaugeRepository.linkCompanionsWithinTransaction(
        createdGo.id,
        createdNoGo.id,
        connection  // ✅ Explicit connection passing
      );

      // 7. Record in companion history
      await this.gaugeRepository.recordCompanionHistory(
        createdGo.id,
        createdNoGo.id,
        'created_together',
        userId,
        connection  // ✅ Explicit connection passing
      );

      // 8. Return complete set
      return {
        baseId,
        goGauge: await this.gaugeRepository.findById(createdGo.id),
        noGoGauge: await this.gaugeRepository.findById(createdNoGo.id)
      };
    });
  }

  /**
   * Create gauge set from existing spares
   * @param {number} goGaugeId - Existing GO gauge (spare)
   * @param {number} noGoGaugeId - Existing NO GO gauge (spare)
   * @param {number} userId - User performing pairing
   * @returns {Promise<Object>} Paired gauge set
   */
  async pairSpares(goGaugeId, noGoGaugeId, userId) {
    return this.executeInTransaction(async (connection) => {

      // 1. Fetch both gauges
      const goGauge = await this.gaugeRepository.findById(goGaugeId);
      const noGoGauge = await this.gaugeRepository.findById(noGoGaugeId);

      // 2. Validate both are spares (no companion)
      if (goGauge.companion_gauge_id || noGoGauge.companion_gauge_id) {
        throw new Error('Both gauges must be spares (no existing companion)');
      }

      // 3. Create domain objects
      const goEntity = new GaugeEntity(goGauge);
      const noGoEntity = new GaugeEntity(noGoGauge);

      // 4. Validate as set (this enforces matching specs)
      const gaugeSet = new GaugeSet({
        baseId: goGauge.system_gauge_id.replace(/[AB]$/, ''),
        goGauge: goEntity,
        noGoGauge: noGoEntity,
        category: goGauge.category
      });

      // 5. Link companions
      await this.gaugeRepository.linkCompanionsWithinTransaction(
        goGaugeId,
        noGoGaugeId,
        connection
      );

      // 6. Record in history
      await this.gaugeRepository.recordCompanionHistory(
        goGaugeId,
        noGoGaugeId,
        'paired_from_spares',
        userId,
        connection
      );

      return {
        goGauge: await this.gaugeRepository.findById(goGaugeId),
        noGoGauge: await this.gaugeRepository.findById(noGoGaugeId)
      };
    });
  }
}

module.exports = GaugeSetService;
```

---

## Implementation Roadmap

### Phase 1: Database Schema (1 day)

**Objectives**:
- Add database constraints
- Create triggers
- Add indexes

**Tasks**:
1. Create migration file `002_gauge_set_constraints.sql`
2. Add CHECK constraints
3. Create bidirectional companion trigger
4. Create auto-suffix trigger
5. Add performance indexes
6. Test constraint enforcement

**Acceptance Criteria**:
- ✅ Cannot insert thread gauge without valid suffix
- ✅ Cannot create one-way companion relationship
- ✅ NPT gauges reject companion assignment
- ✅ Suffix auto-populates from system_gauge_id

**Testing**:
```sql
-- Test 1: Invalid suffix rejected
INSERT INTO gauges (system_gauge_id, gauge_suffix, equipment_type)
VALUES ('TEST001X', 'X', 'thread_gauge');
-- Expected: CHECK constraint violation

-- Test 2: NPT with companion rejected
INSERT INTO gauges (system_gauge_id, companion_gauge_id, category_id)
VALUES ('NPT001', 123, (SELECT id FROM gauge_categories WHERE name = 'NPT'));
-- Expected: CHECK constraint violation

-- Test 3: Auto-suffix works
INSERT INTO gauges (system_gauge_id, equipment_type)
VALUES ('TEST002A', 'thread_gauge');
SELECT gauge_suffix FROM gauges WHERE system_gauge_id = 'TEST002A';
-- Expected: 'A'
```

---

### Phase 2: Domain Model (1 day)

**Objectives**:
- Create GaugeSet aggregate
- Create GaugeEntity value object
- Implement validation logic

**Tasks**:
1. Create `backend/src/modules/gauge/domain/GaugeSet.js`
2. Create `backend/src/modules/gauge/domain/GaugeEntity.js`
3. Create `backend/src/modules/gauge/domain/DomainValidationError.js`
4. Write unit tests for domain logic

**Acceptance Criteria**:
- ✅ GaugeSet validates matching specifications
- ✅ GaugeSet rejects NPT pairs
- ✅ GaugeSet enforces correct suffixes
- ✅ GaugeEntity validates required fields
- ✅ All domain logic has unit tests

**Testing**:
```javascript
// Test 1: Matching specs pass validation
const gaugeSet = new GaugeSet({
  baseId: 'TEST001',
  goGauge: new GaugeEntity({ threadSize: '.312-18', suffix: 'A', ... }),
  noGoGauge: new GaugeEntity({ threadSize: '.312-18', suffix: 'B', ... }),
  category: { name: '2A RING' }
});
// Expected: Success

// Test 2: Mismatched specs fail validation
const badSet = new GaugeSet({
  baseId: 'TEST002',
  goGauge: new GaugeEntity({ threadSize: '.312-18', ... }),
  noGoGauge: new GaugeEntity({ threadSize: '.500-20', ... }),
  category: { name: '2A RING' }
});
// Expected: DomainValidationError

// Test 3: NPT rejection
const nptSet = new GaugeSet({
  baseId: 'NPT001',
  goGauge: new GaugeEntity({ ... }),
  noGoGauge: new GaugeEntity({ ... }),
  category: { name: 'NPT' }
});
// Expected: DomainValidationError
```

---

### Phase 3: Repository Refactor (2 days)

**Objectives**:
- Refactor all write methods to require connection
- Remove dual-mode ambiguity
- Add explicit transaction methods

**Tasks**:
1. Rename methods:
   - `create()` → `createWithinTransaction(data, connection)`
   - `updateCompanionGauges()` → `linkCompanionsWithinTransaction(id1, id2, connection)`
2. Add connection validation (throw if missing)
3. Update all callers to pass connection
4. Add integration tests

**Acceptance Criteria**:
- ✅ All write methods require connection parameter
- ✅ Missing connection throws descriptive error
- ✅ All write operations participate in transactions
- ✅ Integration tests verify transaction rollback

**Testing**:
```javascript
// Test 1: Missing connection throws
await expect(
  gaugeRepository.createWithinTransaction(gaugeData)
).rejects.toThrow('requires connection parameter');

// Test 2: Transaction rollback works
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
  await gaugeRepository.createWithinTransaction(gaugeData, connection);
  throw new Error('Simulated error');
} catch (err) {
  await connection.rollback();
}
// Verify gauge not created

// Test 3: Companion linking within transaction
await connection.beginTransaction();
const go = await gaugeRepository.createWithinTransaction(goData, connection);
const noGo = await gaugeRepository.createWithinTransaction(noGoData, connection);
await gaugeRepository.linkCompanionsWithinTransaction(go.id, noGo.id, connection);
await connection.commit();
// Verify both companion_gauge_id fields set correctly
```

---

### Phase 4: Service Layer (2 days)

**Objectives**:
- Create GaugeSetService
- Implement createGaugeSet with proper transactions
- Implement pairSpares workflow

**Tasks**:
1. Create `backend/src/modules/gauge/services/GaugeSetService.js`
2. Implement `createGaugeSet(goData, noGoData, userId)`
3. Implement `pairSpares(goGaugeId, noGoGaugeId, userId)`
4. Update API routes to use new service
5. Write integration tests

**Acceptance Criteria**:
- ✅ createGaugeSet creates both gauges with correct suffixes
- ✅ createGaugeSet links companions bidirectionally
- ✅ createGaugeSet records companion history
- ✅ pairSpares validates spares have no companions
- ✅ pairSpares validates matching specifications
- ✅ All operations atomic (rollback on error)

**Testing**:
```javascript
// Test 1: Successful set creation
const result = await gaugeSetService.createGaugeSet(goData, noGoData, userId);
expect(result.goGauge.gauge_suffix).toBe('A');
expect(result.noGoGauge.gauge_suffix).toBe('B');
expect(result.goGauge.companion_gauge_id).toBe(result.noGoGauge.id);
expect(result.noGoGauge.companion_gauge_id).toBe(result.goGauge.id);

// Test 2: Mismatched specs rejected
await expect(
  gaugeSetService.createGaugeSet(
    { threadSize: '.312-18', ... },
    { threadSize: '.500-20', ... },
    userId
  )
).rejects.toThrow('matching specifications');

// Test 3: Pairing spares works
const spare1 = await createSpareGauge({ suffix: 'A', ... });
const spare2 = await createSpareGauge({ suffix: 'B', ... });
const paired = await gaugeSetService.pairSpares(spare1.id, spare2.id, userId);
expect(paired.goGauge.companion_gauge_id).toBe(spare2.id);

// Test 4: Pairing non-spares rejected
const existing = await createGaugeSet();
await expect(
  gaugeSetService.pairSpares(existing.goGauge.id, spare2.id, userId)
).rejects.toThrow('must be spares');
```

---

### Phase 5: Testing (2 days)

**Objectives**:
- Comprehensive test coverage
- Integration tests
- End-to-end tests

**Tasks**:
1. Unit tests for domain model (GaugeSet, GaugeEntity)
2. Integration tests for repository methods
3. Integration tests for service layer
4. End-to-end tests for API endpoints
5. Test error scenarios and edge cases

**Acceptance Criteria**:
- ✅ 90%+ code coverage
- ✅ All happy paths tested
- ✅ All error scenarios tested
- ✅ Transaction rollback scenarios tested
- ✅ Database constraint violations tested

**Test Categories**:

1. **Domain Model Tests** (`backend/tests/modules/gauge/domain/`)
   - GaugeSet validation rules
   - GaugeEntity validation rules
   - Domain error handling

2. **Repository Tests** (`backend/tests/modules/gauge/repositories/`)
   - Create within transaction
   - Link companions within transaction
   - Find spares query
   - Transaction rollback scenarios

3. **Service Tests** (`backend/tests/modules/gauge/services/`)
   - Create gauge set end-to-end
   - Pair spares workflow
   - Error handling and rollback

4. **API Tests** (`backend/tests/integration/`)
   - POST /api/gauges/v2/create-set
   - POST /api/gauges/v2/pair-spares
   - GET /api/gauges/v2/spares
   - Error responses

---

### Phase 6: Frontend Integration (2 days)

**Objectives**:
- Update frontend to use new API
- Add spare pairing UI
- Display companion relationships

**Tasks**:
1. Update `CreateGaugeWorkflow.tsx` to use new service
2. Create `SpareInventoryPanel.tsx` component
3. Create `PairSparesModal.tsx` component
4. Update `GaugeDetail.tsx` to show companion info
5. Add E2E tests with Playwright

**Acceptance Criteria**:
- ✅ Can create gauge set with GO/NO GO distinction visible
- ✅ Spares display shows available orphaned gauges
- ✅ Can pair spares through UI
- ✅ Companion relationships display correctly
- ✅ Error messages user-friendly

---

## Acceptance Criteria

### Overall System

1. **Gauge Set Creation**:
   - ✅ Creates both GO and NO GO gauges atomically
   - ✅ Both gauges have correct `gauge_suffix` ('A' and 'B')
   - ✅ Both gauges linked bidirectionally via `companion_gauge_id`
   - ✅ Companion history record created
   - ✅ Transaction rollback on any error

2. **Spare Management**:
   - ✅ Spares query efficient (uses suffix index)
   - ✅ Can filter spares by suffix (A or B)
   - ✅ Can pair compatible spares into set
   - ✅ Pairing validates matching specifications

3. **Data Integrity**:
   - ✅ Database constraints prevent invalid states
   - ✅ Triggers maintain bidirectional relationships
   - ✅ NPT gauges cannot have companions
   - ✅ Thread gauges must have valid suffix

4. **Code Quality**:
   - ✅ Explicit transaction boundaries
   - ✅ Domain logic in domain objects
   - ✅ Repository does data access only
   - ✅ Service orchestrates transactions
   - ✅ 90%+ test coverage

---

## Migration Strategy

### From Current Broken State

1. **Database Migration**:
   ```sql
   -- Apply constraints and triggers
   SOURCE 002_gauge_set_constraints.sql;

   -- Fix existing data (if any salvageable)
   UPDATE gauges SET gauge_suffix = 'A' WHERE system_gauge_id LIKE '%A';
   UPDATE gauges SET gauge_suffix = 'B' WHERE system_gauge_id LIKE '%B';
   ```

2. **Code Deployment**:
   - Deploy new domain model
   - Deploy refactored repository
   - Deploy new service layer
   - Update API routes
   - Deploy frontend updates

3. **Verification**:
   ```bash
   # Run integration tests
   npm test -- backend/tests/modules/gauge

   # Run E2E tests
   npm run test:e2e

   # Manual verification
   # 1. Create gauge set via UI
   # 2. Verify both gauges in database with correct suffix
   # 3. Verify companion_gauge_id bidirectional
   # 4. Create spare and pair it
   # 5. Verify history records
   ```

---

## Rollback Plan

**If Issues Arise**:

1. **Database Rollback**:
   ```sql
   -- Drop constraints if causing issues
   ALTER TABLE gauges DROP CONSTRAINT chk_thread_has_suffix;
   ALTER TABLE gauges DROP CONSTRAINT chk_suffix_matches_id;
   ALTER TABLE gauges DROP CONSTRAINT chk_bidirectional_companion;

   -- Drop triggers
   DROP TRIGGER trg_companion_bidirectional;
   DROP TRIGGER trg_auto_suffix;
   ```

2. **Code Rollback**:
   - Revert to previous Git commit
   - Restart backend service

3. **Data Recovery**:
   - Test data only, no recovery needed
   - Re-run migration after fixes

---

## Success Metrics

**Post-Implementation Verification**:

1. **Database Validation**:
   ```sql
   -- All thread gauge sets should have suffixes
   SELECT COUNT(*) FROM gauges
   WHERE equipment_type = 'thread_gauge'
   AND gauge_suffix IS NULL;
   -- Expected: 0

   -- All companion relationships should be bidirectional
   SELECT COUNT(*) FROM gauges g1
   WHERE companion_gauge_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM gauges g2
     WHERE g2.id = g1.companion_gauge_id
     AND g2.companion_gauge_id = g1.id
   );
   -- Expected: 0
   ```

2. **Functional Testing**:
   - Create 10 gauge sets
   - Verify all 20 gauges have correct suffix
   - Verify all 20 gauges have companion links
   - Create 5 spares and pair 4 of them
   - Verify spare queries work correctly

3. **Performance**:
   - Spare query should use index (EXPLAIN shows idx_spare_lookup)
   - Gauge set creation < 100ms
   - Transaction rollback < 50ms

---

## Notes

**Development Phase Advantages**:
- Can break existing code without compatibility concerns
- Can restructure database without data migration
- Can implement ideal architecture from scratch
- Test data only - no production impact

**Key Architectural Decisions**:
1. **Explicit Transactions**: Clarity over convenience
2. **Domain-Driven**: Business rules in domain objects
3. **Fail Fast**: Database constraints prevent bad states
4. **Type Safety**: Domain objects enforce invariants
5. **Single Responsibility**: Each layer does ONE thing

**Future Enhancements** (Post-MVP):
- Replace gauge workflow (swap companion in existing set)
- Companion history timeline UI
- Bulk spare pairing
- Gauge set import/export
- Advanced spare search with specification matching
