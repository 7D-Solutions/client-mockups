# GaugeRepository.js Refactoring Plan

**Status**: Critical - 1,045 lines, 110 methods
**Priority**: #1 - Highest
**Location**: `backend/src/modules/gauge/repositories/GaugeRepository.js`

---

## Problem Analysis

**God Object Anti-Pattern**:
- Single repository handles all gauge-related data operations
- 110 methods mixed across different responsibilities
- Hard to navigate, test, and maintain
- High merge conflict risk

**Responsibilities Identified**:
1. Core CRUD operations (create, read, update, delete)
2. Complex queries and search operations
3. Specification management (thread, hand tool, large equipment)
4. Relationship management (companions, transfers)
5. Status transitions and history

---

## Refactoring Strategy

### Split into 5 Focused Repositories

```
GaugeRepository.js (1045 lines, 110 methods)
├── GaugeRepository.js (Core CRUD - ~200 lines, 20 methods)
├── GaugeQueryRepository.js (Queries - ~250 lines, 25 methods)
├── GaugeSpecificationRepository.js (Specs - ~200 lines, 20 methods)
├── GaugeRelationshipRepository.js (Relations - ~200 lines, 20 methods)
└── GaugeStatusRepository.js (Status - ~195 lines, 25 methods)
```

---

## File 1: GaugeRepository.js (Core CRUD)

**Purpose**: Essential gauge CRUD operations only

**Methods to Keep**:
```javascript
class GaugeRepository extends BaseRepository {
  constructor() {
    super('gauges', 'id');
  }

  // Universal Repository Interface
  async findByPrimaryKey(id, connection = null)
  async findByBusinessIdentifier(identifier, connection = null)

  // Gauge-specific finders
  async findByGaugeId(gaugeId, connection = null)
  async findBySystemGaugeId(systemGaugeId, connection = null)

  // Basic CRUD
  async getGaugeById(id, connection = null)
  async createGauge(gaugeData, connection = null)
  async updateGauge(id, updates, connection = null)
  async deleteGauge(id, connection = null)

  // Bulk operations
  async bulkUpdateStatus(gaugeIds, status, connection = null)
  async bulkUpdateOwnership(gaugeIds, ownership, connection = null)

  // Existence checks
  async gaugeExists(gaugeId, connection = null)
  async systemGaugeIdExists(systemGaugeId, connection = null)

  // Simple list operations
  async getAllGauges(connection = null)
  async getGaugesByIds(ids, connection = null)
}
```

**Lines**: ~200
**Responsibility**: Core gauge entity persistence

---

## File 2: GaugeQueryRepository.js (Complex Queries)

**Purpose**: Search, filtering, and complex query operations

**Methods to Move**:
```javascript
class GaugeQueryRepository {
  constructor(gaugeRepository) {
    this.gaugeRepository = gaugeRepository;
  }

  // Search operations
  async searchGauges(filters, connection = null)
  async advancedSearch(criteria, connection = null)

  // Filtering
  async filterByEquipmentType(type, connection = null)
  async filterByStatus(status, connection = null)
  async filterByCategory(categoryId, connection = null)
  async filterByOwnership(ownershipType, connection = null)
  async filterByOwner(ownerId, connection = null)

  // Complex queries with joins
  async getGaugesWithSpecifications(filters, connection = null)
  async getGaugesWithCheckoutInfo(filters, connection = null)
  async getGaugesWithCalibration(filters, connection = null)

  // Dashboard queries
  async getAvailableGauges(connection = null)
  async getCheckedOutGauges(connection = null)
  async getOutOfServiceGauges(connection = null)
  async getPendingApprovalGauges(connection = null)

  // Statistics
  async getGaugeCountByCategory(connection = null)
  async getGaugeCountByStatus(connection = null)
  async getGaugeCountByEquipmentType(connection = null)

  // Thread gauge specific queries
  async getThreadGaugesBySize(threadSize, connection = null)
  async getThreadGaugesByClass(threadClass, connection = null)
  async findMatchingThreadGauges(specs, connection = null)
}
```

**Lines**: ~250
**Responsibility**: Query operations and data retrieval with filters

---

## File 3: GaugeSpecificationRepository.js (Specifications)

**Purpose**: Manage equipment-specific specifications

**Methods to Move**:
```javascript
class GaugeSpecificationRepository {
  constructor(gaugeRepository) {
    this.gaugeRepository = gaugeRepository;
  }

  // Generic spec operations
  async getSpecifications(gaugeId, equipmentType, connection = null)
  async saveSpecifications(gaugeId, equipmentType, specs, connection = null)
  async updateSpecifications(gaugeId, equipmentType, specs, connection = null)
  async deleteSpecifications(gaugeId, equipmentType, connection = null)

  // Thread gauge specifications
  async getThreadSpecifications(gaugeId, connection = null)
  async saveThreadSpecifications(gaugeId, specs, connection = null)
  async updateThreadSpecifications(gaugeId, specs, connection = null)

  // Hand tool specifications
  async getHandToolSpecifications(gaugeId, connection = null)
  async saveHandToolSpecifications(gaugeId, specs, connection = null)
  async updateHandToolSpecifications(gaugeId, specs, connection = null)

  // Large equipment specifications
  async getLargeEquipmentSpecifications(gaugeId, connection = null)
  async saveLargeEquipmentSpecifications(gaugeId, specs, connection = null)
  async updateLargeEquipmentSpecifications(gaugeId, specs, connection = null)

  // Calibration standard specifications
  async getCalibrationStandardSpecifications(gaugeId, connection = null)
  async saveCalibrationStandardSpecifications(gaugeId, specs, connection = null)
  async updateCalibrationStandardSpecifications(gaugeId, specs, connection = null)

  // Utility methods
  async getSpecTableForEquipmentType(equipmentType)
  async specificationExists(gaugeId, equipmentType, connection = null)
}
```

**Lines**: ~200
**Responsibility**: Equipment-specific specification management

---

## File 4: GaugeRelationshipRepository.js (Relationships)

**Purpose**: Manage gauge relationships (companions, transfers, checkouts)

**Methods to Move**:
```javascript
class GaugeRelationshipRepository {
  constructor(gaugeRepository) {
    this.gaugeRepository = gaugeRepository;
  }

  // Companion relationships
  async getCompanionGauge(gaugeId, connection = null)
  async updateCompanionGauges(gaugeId1, gaugeId2, connection = null)
  async linkCompanionsWithinTransaction(gaugeId1, gaugeId2, connection)
  async unlinkCompanions(gaugeId1, connection = null)
  async getGaugesWithCompanions(connection = null)
  async getSpareGauges(filters, connection = null)

  // Companion history
  async recordCompanionHistory(goGaugeId, noGoGaugeId, action, userId, connection, options = {})
  async getCompanionHistory(gaugeId, connection = null)

  // Checkout relationships
  async getActiveCheckout(gaugeId, connection = null)
  async checkoutGauge(gaugeId, userId, connection = null)
  async returnGauge(gaugeId, userId, connection = null)
  async getCheckedOutGauges(userId, connection = null)

  // Transfer relationships
  async getPendingTransfers(gaugeId, connection = null)
  async createTransfer(transferData, connection = null)
  async acceptTransfer(transferId, connection = null)
  async rejectTransfer(transferId, connection = null)

  // Ownership relationships
  async updateOwnership(gaugeId, ownerId, ownershipType, connection = null)
  async getGaugesByOwner(ownerId, connection = null)
  async getGaugesByDepartment(departmentId, connection = null)
}
```

**Lines**: ~200
**Responsibility**: Gauge relationships and associations

---

## File 5: GaugeStatusRepository.js (Status Management)

**Purpose**: Status transitions, history, and state management

**Methods to Move**:
```javascript
class GaugeStatusRepository {
  constructor(gaugeRepository) {
    this.gaugeRepository = gaugeRepository;
  }

  // Status operations
  async updateStatus(gaugeId, status, connection = null)
  async getStatusHistory(gaugeId, connection = null)
  async recordStatusChange(gaugeId, oldStatus, newStatus, userId, reason, connection = null)

  // Status queries
  async getGaugesByStatus(status, connection = null)
  async getAvailableGauges(connection = null)
  async getCheckedOutGauges(connection = null)
  async getOutOfServiceGauges(connection = null)
  async getRejectedGauges(connection = null)

  // Seal status
  async getSealStatus(gaugeId, connection = null)
  async breakSeal(gaugeId, connection = null)
  async resealGauge(gaugeId, connection = null)
  async getUnsealedGauges(connection = null)

  // Calibration status
  async getCalibrationStatus(gaugeId, connection = null)
  async updateCalibrationDate(gaugeId, date, connection = null)
  async getDueForCalibration(connection = null)
  async getOverdueCalibration(connection = null)

  // Approval status
  async getPendingApprovals(connection = null)
  async approveGauge(gaugeId, approverId, connection = null)
  async rejectGauge(gaugeId, rejectionData, connection = null)

  // Active status
  async activateGauge(gaugeId, connection = null)
  async deactivateGauge(gaugeId, connection = null)
  async getActiveGauges(connection = null)
  async getInactiveGauges(connection = null)
}
```

**Lines**: ~195
**Responsibility**: Status management and transitions

---

## Implementation Steps

### Step 1: Create New Files
1. Create empty files for all 5 repositories
2. Set up proper imports and base structure
3. Add JSDoc documentation headers

### Step 2: Extract GaugeSpecificationRepository
**Why First**: Least dependencies, clearest boundaries

1. Copy specification-related methods to new file
2. Update method signatures (add gaugeRepository dependency)
3. Update service layer to import GaugeSpecificationRepository
4. Test specification operations
5. Remove methods from original GaugeRepository

### Step 3: Extract GaugeStatusRepository
**Why Second**: Clear responsibility, moderate dependencies

1. Copy status-related methods
2. Update service imports
3. Test status operations
4. Remove from original

### Step 4: Extract GaugeRelationshipRepository
**Why Third**: More complex dependencies

1. Copy relationship methods
2. Handle circular dependencies carefully
3. Update service imports
4. Test relationship operations
5. Remove from original

### Step 5: Extract GaugeQueryRepository
**Why Fourth**: Heavy dependencies on other repositories

1. Copy query methods
2. Add dependencies to other repositories as needed
3. Update service imports
4. Test query operations
5. Remove from original

### Step 6: Finalize Core GaugeRepository
**Why Last**: Core should be clean after extractions

1. Keep only core CRUD methods
2. Ensure all dependencies resolved
3. Update all service layer imports
4. Run full test suite

---

## Service Layer Updates

### Before (Current)
```javascript
const gaugeRepository = new GaugeRepository();

// All operations through one repository
const gauge = await gaugeRepository.getGaugeById(id);
const specs = await gaugeRepository.getThreadSpecifications(id);
const companion = await gaugeRepository.getCompanionGauge(id);
const status = await gaugeRepository.getStatusHistory(id);
```

### After (Refactored)
```javascript
const gaugeRepository = new GaugeRepository();
const gaugeQueryRepository = new GaugeQueryRepository(gaugeRepository);
const gaugeSpecRepository = new GaugeSpecificationRepository(gaugeRepository);
const gaugeRelationshipRepository = new GaugeRelationshipRepository(gaugeRepository);
const gaugeStatusRepository = new GaugeStatusRepository(gaugeRepository);

// Use specific repository for each concern
const gauge = await gaugeRepository.getGaugeById(id);
const specs = await gaugeSpecRepository.getThreadSpecifications(id);
const companion = await gaugeRelationshipRepository.getCompanionGauge(id);
const status = await gaugeStatusRepository.getStatusHistory(id);
```

---

## Services Requiring Updates

1. **GaugeCreationService.js**
   - Update imports: Add GaugeSpecificationRepository
   - Update constructor: Inject spec repository

2. **GaugeOperationsService.js**
   - Update imports: Add GaugeStatusRepository, GaugeRelationshipRepository
   - Update constructor: Inject repositories

3. **GaugeQueryService.js**
   - Update imports: Add GaugeQueryRepository
   - Update constructor: Inject query repository

4. **GaugeServiceCoordinator.js**
   - Update imports: Add all 5 repositories
   - Update service registry: Register all repositories

---

## Testing Strategy

### Unit Tests
```javascript
describe('GaugeRepository (Core CRUD)', () => {
  test('creates gauge with valid data');
  test('finds gauge by ID');
  test('updates gauge fields');
  test('deletes gauge');
});

describe('GaugeSpecificationRepository', () => {
  test('saves thread specifications');
  test('retrieves specifications by type');
  test('updates existing specifications');
});

describe('GaugeRelationshipRepository', () => {
  test('links companion gauges');
  test('records companion history');
  test('retrieves companion gauge');
});

describe('GaugeStatusRepository', () => {
  test('updates gauge status');
  test('records status history');
  test('retrieves status history');
});

describe('GaugeQueryRepository', () => {
  test('searches gauges with filters');
  test('retrieves gauges by status');
  test('gets dashboard statistics');
});
```

### Integration Tests
```javascript
describe('Repository Integration', () => {
  test('creates gauge with specifications in transaction');
  test('updates gauge and links companion in transaction');
  test('status change triggers history record');
  test('query repository uses core repository correctly');
});
```

---

## Benefits

### Before Refactor
- ❌ 1,045 lines (overwhelming)
- ❌ 110 methods (hard to navigate)
- ❌ Mixed responsibilities
- ❌ High merge conflict risk
- ❌ Difficult to test specific features

### After Refactor
- ✅ 5 files × ~200 lines (manageable)
- ✅ ~20-25 methods per file (clear focus)
- ✅ Single responsibility per file
- ✅ Reduced merge conflicts
- ✅ Easy to test individual concerns
- ✅ Clear boundaries and dependencies

---

## Risks & Mitigations

### Risk 1: Breaking Existing Services
**Mitigation**: Update services one at a time, test thoroughly

### Risk 2: Circular Dependencies
**Mitigation**: Core repository has no dependencies, others depend on core

### Risk 3: Transaction Management Complexity
**Mitigation**: All repositories accept connection parameter, transaction handled by service layer

### Risk 4: Missing Methods After Split
**Mitigation**: Comprehensive method inventory before split, verify all methods accounted for

---

## Acceptance Criteria

- ✅ All 110 methods accounted for in new repositories
- ✅ All existing services updated and working
- ✅ All tests passing
- ✅ No circular dependencies
- ✅ Each repository file < 300 lines
- ✅ Clear JSDoc documentation on all public methods
- ✅ Transaction handling works correctly across repositories

---

## Related Files to Update

1. `GaugeCreationService.js` - Import spec repository
2. `GaugeOperationsService.js` - Import status, relationship repositories
3. `GaugeQueryService.js` - Import query repository
4. `GaugeServiceCoordinator.js` - Register all repositories
5. All route handlers using GaugeRepository directly

---

**Status**: Ready for implementation
**Impact**: High - reduces complexity significantly
**Risk**: Medium - requires careful service layer updates
