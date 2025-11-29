# GaugeRepository Refactoring Strategy

**Date**: 2025-10-25
**Status**: Ready for Implementation
**Goal**: Reduce GaugeRepository from 1047 lines to ~400-500 lines by enforcing proper separation of concerns

---

## Current State Analysis

### Problems Identified

1. **Bloat**: 1047 lines with 21+ methods
2. **Separation of Concerns Violations**: Methods that belong in specialized repositories
3. **Code Duplication**: Functionality already exists in CalibrationRepository, CheckoutRepository, AuditRepository
4. **Legacy Code**: GaugeRepository.old.js moved to `/review-for-delete/`

### Repository Responsibilities (Gold Standard)

Each repository should have a **single, well-defined responsibility**:

| Repository | Responsibility | Lines | Status |
|------------|----------------|-------|--------|
| **GaugeRepository** | Core gauge CRUD, search, queries | 1047 → 400-500 | ⚠️ **NEEDS REFACTORING** |
| **GaugeSetRepository** | Gauge set/companion operations | 574 | ✅ **CLEAN** |
| **CalibrationRepository** | Calibration management | 250 | ✅ **CLEAN** |
| **CheckoutRepository** | Checkout/return operations | 257 | ✅ **CLEAN** |
| **TrackingRepository** | Transaction history tracking | 325 | ✅ **CLEAN** |
| **AuditRepository** | Audit trail logging | ~150 | ✅ **CLEAN** |

---

## Methods to Remove from GaugeRepository

### ❌ 1. Calibration Methods → CalibrationRepository

**Current Location**: `GaugeRepository.js:~800-850`
**Target**: `CalibrationRepository.js` (already exists)

```javascript
// ❌ REMOVE from GaugeRepository
async getCalibrationHistory(gaugeId, conn) { }
async createCalibrationSchedule(scheduleData, conn) { }

// ✅ ALREADY EXISTS in CalibrationRepository
async getCalibrationHistory(gaugeId, conn) { }
async createCalibration(calibrationData, conn) { }
async getOverdueCalibrations(conn) { }
```

**Action**: Delete from GaugeRepository, use CalibrationRepository directly

---

### ❌ 2. Checkout/Return Methods → CheckoutRepository

**Current Location**: `GaugeRepository.js:~850-920`
**Target**: `CheckoutRepository.js` (already exists)

```javascript
// ❌ REMOVE from GaugeRepository
async checkoutGauge(gaugeId, userId, conn) { }
async returnGauge(gaugeId, userId, conn) { }

// ✅ ALREADY EXISTS in CheckoutRepository
async checkout(gaugeId, opts, conn) { }
async return(gaugeId, opts, conn) { }
async getActiveCheckout(gaugeId) { }
```

**Action**: Delete from GaugeRepository, use CheckoutRepository directly

---

### ❌ 3. Audit Methods → AuditRepository

**Current Location**: `GaugeRepository.js:~980-1000`
**Target**: `AuditRepository.js` (already exists)

```javascript
// ❌ REMOVE from GaugeRepository
async createAuditTrail(auditData, conn) { }

// ✅ ALREADY EXISTS in AuditRepository
async createAuditLog(auditData) { }
async getAuditHistory(tableName, recordId, limit = 50) { }
```

**Action**: Delete from GaugeRepository, use AuditRepository directly

---

### ❌ 4. Transfer History → TrackingRepository

**Current Location**: `GaugeRepository.js:~750-800`
**Target**: `TrackingRepository.js` (needs implementation)

```javascript
// ❌ REMOVE from GaugeRepository
async getTransferHistory(gaugeId, conn) { }

// ⚠️ NEEDS IMPLEMENTATION in TrackingRepository
async getTransferHistory(gaugeId, conn) {
  // Query gauge_transactions WHERE gauge_id = ?
}
```

**Action**:
1. Implement `getTransferHistory` in TrackingRepository
2. Delete from GaugeRepository
3. Update services to use TrackingRepository

---

### ❌ 5. Companion Methods → GaugeSetRepository (Already Moved)

**Current Location**: `GaugeRepository.js:925-955` ✅ **FIXED (Bug #1)**
**Target**: `GaugeSetRepository.js` (already exists)

```javascript
// ❌ DEPRECATED in GaugeRepository (still needed for legacy compatibility)
async updateCompanionGauges(gaugeId1, gaugeId2, conn) { }

// ✅ ALREADY EXISTS in GaugeSetRepository
async linkCompanionsWithinTransaction(connection, goGaugeId, noGoGaugeId) { }
async unlinkCompanionsWithinTransaction(connection, gaugeId) { }
async createCompanionHistory(connection, goGaugeId, noGoGaugeId, action, userId, reason, metadata) { }
```

**Action**:
- Keep `updateCompanionGauges` for now (used by GaugeCreationService)
- Migrate GaugeCreationService to use GaugeSetRepository
- Then remove `updateCompanionGauges`

---

## Methods to Keep in GaugeRepository

### ✅ Core CRUD Operations

```javascript
async findByPrimaryKey(id, connection = null)
async findByBusinessIdentifier(identifier, connection = null)
async findByGaugeId(gaugeId, connection = null)
async findBySystemGaugeId(systemGaugeId, connection = null)
async createGauge(gaugeData, conn)
async createGaugeWithSpecs(gaugeData, connection)
async getGaugeById(id, conn)
async getGaugeByGaugeId(gaugeId, conn)
async updateGauge(id, updates, conn)
```

**Rationale**: Core gauge entity management is the primary responsibility

---

### ✅ Query & Search Operations

```javascript
async searchGauges(filters = {}, conn)
```

**Rationale**: General gauge queries belong in GaugeRepository

---

### ✅ Lookup/Reference Data

```javascript
async getSealStatuses(conn)
async getManufacturers(conn)
async getCategoryById(categoryId, conn)
async getCategoriesByEquipmentType(equipmentType, conn)
```

**Rationale**: Reference data queries related to gauges

---

### ✅ Utility Methods

```javascript
validateIntegerParameter(value, paramName, min, max)
getSpecTableFor(type)
transformToDTO(dbGauge)
transformFromDTO(apiGauge)
```

**Rationale**: Data transformation and validation helpers

---

## Service Layer Updates Required

### 1. GaugeQueryService

**File**: `backend/src/modules/gauge/services/GaugeQueryService.js`

```javascript
// ❌ BEFORE
const history = await this.repository.getCalibrationHistory(gaugeId);

// ✅ AFTER - Inject CalibrationRepository
constructor(gaugeRepository, calibrationRepository) {
  this.gaugeRepository = gaugeRepository;
  this.calibrationRepository = calibrationRepository;
}

const history = await this.calibrationRepository.getCalibrationHistory(gaugeId);
```

---

### 2. GaugeOperationsService

**File**: `backend/src/modules/gauge/services/GaugeOperationsService.js`

```javascript
// ❌ BEFORE
await this.repository.checkoutGauge(gaugeId, userId);

// ✅ AFTER - Inject CheckoutRepository
constructor(gaugeRepository, checkoutRepository) {
  this.gaugeRepository = gaugeRepository;
  this.checkoutRepository = checkoutRepository;
}

await this.checkoutRepository.checkout(gaugeId, { userId });
```

---

### 3. GaugeCreationService

**File**: `backend/src/modules/gauge/services/GaugeCreationService.js`

```javascript
// ❌ BEFORE
await this.repository.updateCompanionGauges(goGauge.id, noGoGauge.id, connection);

// ✅ AFTER - Inject GaugeSetRepository
constructor(gaugeRepository, gaugeSetRepository) {
  this.gaugeRepository = gaugeRepository;
  this.gaugeSetRepository = gaugeSetRepository;
}

await this.gaugeSetRepository.linkCompanionsWithinTransaction(
  connection,
  goGauge.id,
  noGoGauge.id
);
```

---

## Implementation Plan

### Phase 1: Preparation (No Breaking Changes)
1. ✅ Move `GaugeRepository.old.js` to `/review-for-delete/`
2. ✅ Fix Bug #1 in `updateCompanionGauges`
3. Implement `getTransferHistory` in TrackingRepository
4. Update service constructors to accept multiple repositories

### Phase 2: Service Migration
1. Update GaugeQueryService to use CalibrationRepository
2. Update GaugeOperationsService to use CheckoutRepository
3. Update services to use AuditRepository
4. Update GaugeCreationService to use GaugeSetRepository

### Phase 3: Cleanup
1. Remove calibration methods from GaugeRepository
2. Remove checkout methods from GaugeRepository
3. Remove audit methods from GaugeRepository
4. Remove transfer history from GaugeRepository
5. Remove `updateCompanionGauges` from GaugeRepository

### Phase 4: Testing
1. Run all domain tests (should pass)
2. Run all integration tests (should pass)
3. Verify no regressions

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Lines of Code** | 1047 | ~400-500 | 52-62% reduction |
| **Methods** | 27 | ~15 | 44% reduction |
| **Lines per Method** | ~39 | ~30 | More focused methods |
| **Responsibilities** | 5+ | 1 | ✅ Single Responsibility |
| **Code Duplication** | High | None | ✅ DRY principle |
| **Maintainability** | Low | High | ✅ Gold standard |

---

## Testing Strategy

### 1. Unit Tests
- ✅ Domain tests (49 passing)
- ✅ Validation logic tests

### 2. Integration Tests
- ✅ GaugeSetService (11 passing)
- Update GaugeQueryService tests
- Update GaugeOperationsService tests

### 3. Regression Testing
- Run full test suite after each phase
- Verify no broken imports or missing methods

---

## Benefits

1. **Maintainability**: Each repository has clear, focused responsibility
2. **Testability**: Smaller, focused repositories are easier to test
3. **Reusability**: Services can use specialized repositories directly
4. **Performance**: Less code to load and parse
5. **Scalability**: Clear patterns for adding new features

---

## Gold Standard Checklist

- ✅ Single Responsibility Principle (SRP)
- ✅ Don't Repeat Yourself (DRY)
- ✅ Explicit Transaction Pattern (ADR-002)
- ✅ Dependency Injection
- ✅ Clear separation between repositories
- ✅ Services orchestrate multiple repositories
- ✅ All tests passing
- ✅ No code duplication
- ✅ Comprehensive documentation

---

**Next Steps**: Execute Phase 1 - Implement `getTransferHistory` in TrackingRepository
