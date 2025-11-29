# Gauge Module Service Layer Architecture Analysis

## Current Service Responsibilities

### 1. **GaugeOperationsService** (THIN FACADE)
**Location**: `backend/src/modules/gauge/services/GaugeOperationsService.js`
**Role**: Facade/Dispatcher - delegates all business logic to specialized services
**Methods**:
- `checkoutGauge()` → GaugeCheckoutService
- `returnGauge()` → GaugeCheckoutService
- `transferGauge()` → GaugeCheckoutService (compound operation)
- `getTransferHistory()` → GaugeHistoryService
- `updateGaugeStatus()` → GaugeStatusService
- `markGaugeDamaged()` → GaugeStatusService
- `retireGauge()` → GaugeStatusService
- `sealGauge()` → SealService
- `unsealGauge()` → UnsealsService
- `recordCalibration()` → GaugeCalibrationService
- `getCalibrationHistory()` → GaugeCalibrationService
- `getCalibrationDue()` → GaugeCalibrationService
- `getGaugeByGaugeId()` → GaugeQueryService

**Key Pattern**: NO business logic here - only ServiceRegistry lookups and delegation

---

### 2. **GaugeStatusService** (STATUS RULES)
**Location**: `backend/src/modules/gauge/services/GaugeStatusService.js`
**Role**: Single source of truth for gauge status management
**Methods**:
- `calculateStatus(gauge)` - Calculates derived status based on gauge properties
- `updateStatus(gaugeId, status, connection)` - Updates status with optional transaction support
- `updateAllStatuses()` - Batch status updates (replaces statusUpdater.js)
- `canCheckout(gauge)` - Validation logic for checkout eligibility
- `getStatusDisplay(status)` - Display metadata
- `getSealStatusDisplay(sealStatus)` - Display metadata
- `handleStatusChangeEvent()` - Event-driven status updates
- `updateStatusAfterQC()` - Post-QC status transitions

**Status Enum**:
```
- AVAILABLE: 'available'
- CHECKED_OUT: 'checked_out'
- CALIBRATION_DUE: 'calibration_due'
- PENDING_QC: 'pending_qc'
- OUT_OF_SERVICE: 'out_of_service'
- PENDING_UNSEAL: 'pending_unseal'
- RETIRED: 'retired'
```

**Key Pattern**: 
- Accepts optional `connection` for transaction support
- Emits GAUGE_UPDATED events via EventBus
- Validates status is in allowed enum before updating

---

### 3. **GaugeCheckoutService** (CHECKOUT WORKFLOW)
**Location**: `backend/src/modules/gauge/services/GaugeCheckoutService.js`
**Role**: Handles checkout/return/QC operations with complete business rule enforcement
**Methods**:
- `checkoutGauge(gaugeId, checkoutData, userId)` - Checkout with validation
- `returnGauge(gaugeId, returnData, userId)` - Return with transfer cancellation
- `qcVerifyGauge(gaugeId, verificationData, userId)` - QC inspection workflow
- `acceptGaugeReturn(gaugeId, acceptData, userId)` - Admin approval workflow

**Business Rules Enforced**:
- Large equipment cannot be checked out (fixed-location)
- Sealed gauges require unseal approval before checkout
- Overdue calibration blocks checkout
- Cannot checkout already checked out gauge
- Returns trigger automatic transfer cancellation
- Cross-user returns require acknowledgment

**Key Pattern**: 
- ALL operations wrapped in `executeInTransaction()`
- Creates checkout records → updates status → records history → creates audit logs
- Data inconsistency fixes (status ≠ checkout state)
- Automatic transfer cancellation on return

---

### 4. **GaugeSetService** (GAUGE PAIR MANAGEMENT)
**Location**: `backend/src/modules/gauge/services/GaugeSetService.js`
**Role**: Manages GO/NO-GO gauge sets and spare gauge pairing
**Methods**:
- `createGaugeSet(gaugeSetData, userId)` - Create paired GO/NO-GO gauges
- `pairSpareGauges(goGaugeId, noGoGaugeId, setLocation, userId, reason)` - Pair existing spares
- `replaceCompanion(existingGaugeId, newCompanionId, userId, reason)` - Swap companion
- `unpairGauges(gaugeId, userId, reason)` - Break the set (deprecated)
- `unpairSet(gaugeId, userId, reason)` - Break the set (current)
- `findSpareGauges(categoryId, suffix, status)` - Query spares
- `getGaugeSetByBaseId(baseId)` - Retrieve set by base ID
- `validateGaugeSetCompatibility()` - Pre-validation without persistence

**Key Pattern**:
- Uses GaugeSetTransactionHelper for explicit transaction management
- Uses GaugeSetValidationHelper for complex validation
- Uses domain models (GaugeEntity, GaugeSet) for validation
- Validates: pending_qc status, checked_out status, spare validation
- Creates companion history audit trail

---

### 5. **GaugeCheckoutService** (HISTORY/TRACKING - READ ONLY)
**Location**: `backend/src/modules/gauge/services/GaugeHistoryService.js`
**Role**: Query and reporting for gauge history
**Methods**:
- `getGaugeById(gaugeId)` - Get with manufacturer enrichment
- `isGaugeAvailable(gaugeId)` - Availability check
- `getGaugeHistory(gaugeId)` - Complete checkout history
- `getOverdueCalibrations()` - Calibrations due
- `getCalibrationsDueSoon(days)` - Calibrations due soon
- `getDashboardSummary()` - Dashboard counts
- `searchGauges(filters)` - Search with filters

**Key Pattern**: Read-only, delegates to repositories, no transaction management needed

---

### 6. **GaugeQueryService** (SEARCH & RETRIEVAL)
**Location**: `backend/src/modules/gauge/services/GaugeQueryService.js`
**Role**: Search, filtering, and retrieval operations
**Methods**:
- `getAllGauges()` - All gauges
- `searchGauges(criteria)` - Search with criteria
- `search(criteria)` - Enhanced search with groupBySet
- `groupBySet(gauges)` - Group thread gauges by base ID (O(1) Map-based)
- `getSpares(options)` - Get available spares
- `getActiveGauges(filters)` - Active gauges
- `getUserGauges(userId)` - Gauges checked out to user
- `getGaugesByStatus(status)` - Gauges by status
- `getGaugeById(identifier)` - Get by ID or gauge_id
- `getGaugeByGaugeId(gaugeId)` - Alias for backwards compatibility
- `getDashboardSummary()` - Dashboard data
- `getGaugeSet(gaugeId)` - Get gauge set info
- `getCategoriesByEquipmentType(equipmentType)` - Lookup data

**Key Pattern**: Read-only, heavy use of Map-based grouping for performance, role-based filtering

---

### 7. **GaugeCreationService** (CREATION & UPDATES)
**Location**: `backend/src/modules/gauge/services/GaugeCreationService.js`
**Role**: Gauge creation, updates, and deletion
**Methods**:
- `createGauge(gaugeData, userId)` - Create single gauge
- `updateGauge(id, updates, userId)` - Update gauge
- `deleteGauge(id, userId)` - Soft delete
- `createGaugeSet(goGaugeData, noGoGaugeData, userId)` - Create paired set
- `getGaugeSet(gaugeId)` - Get gauge set by ID
- `getGaugeById(id)` - Get gauge
- `createGaugeV2(gaugeData, userId)` - V2 API creation
- `generateStandardizedName(gaugeData)` - Name standardization
- `convertToDecimal(size)` - Convert thread sizes to decimal

**Key Pattern**:
- Uses ServiceRegistry for ID generation and validation
- Creates audit trail for all operations
- Validates gauge set specs match before creation
- Handles transaction management via BaseService

---

### 8. **GaugeTrackingService** (LEGACY - DEPRECATED)
**Status**: DEPRECATED in favor of GaugeCheckoutService + GaugeHistoryService
**Still contains**: Checkout/return logic (should be removed, use GaugeCheckoutService instead)

---

## Transaction Patterns

### Pattern 1: BaseService.executeInTransaction() (Generic)
```javascript
// From BaseService
async executeInTransaction(operation, auditData = null) {
  const pool = dbConnection.getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    
    if (auditData && this.auditService) {
      await this.auditService.logAction({ ...auditData }, connection);
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
```

**Usage**: Simple transactions in services extending BaseService
**Supports**: Audit data logging within transaction

---

### Pattern 2: GaugeSetTransactionHelper.executeInTransaction() (Explicit)
```javascript
// From GaugeSetTransactionHelper
async executeInTransaction(operation) {
  const connection = await this.pool.getConnection();
  try {
    await connection.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

**Usage**: Services needing explicit isolation level control
**Supports**: REPEATABLE READ isolation level (prevents phantom reads)
**Used by**: GaugeSetService

---

### Pattern 3: Direct Connection Passing (For Complex Operations)
```javascript
// From GaugeCheckoutService.checkoutGauge()
return await this.executeInTransaction(async (connection) => {
  // Get gauge details
  const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);
  
  // Validate business rules
  if (gauge.equipment_type === 'large_equipment') {
    throw new Error('Large equipment is fixed-location...');
  }
  
  // Create checkout (DB operation)
  const checkout = await this.checkoutRepository.createCheckout({...}, connection);
  
  // Update gauge status with connection
  await gaugeStatusService.updateStatus(gauge.id, 'checked_out', connection);
  
  // Create history record with connection
  await this.trackingRepository.createTransaction({...}, connection);
  
  // Create audit log with connection
  await this.auditRepository.createAuditLog({...}, connection);
  
  return { success: true, data: {...} };
});
```

**Key Feature**: Connection parameter threading throughout operation
**Benefit**: All database operations in single transaction

---

## Cascade Logic Requirements

### 1. **Location Updates (GaugeSetService)**
**Currently Implemented**:
```javascript
// From GaugeSetService.pairSpareGauges()
await this.repository.updateLocation(connection, goGaugeId, setLocation);
await this.repository.updateLocation(connection, noGoGaugeId, setLocation);
```

**Cascade Rule**: When pairing gauges, both must be at same location
**Status**: ✅ Implemented in pairSpareGauges()

---

### 2. **Pending QC Status Cascade**
**Current State**: When gauge returns, status → pending_qc
**Missing Cascade**: 
- Should companion status also change to pending_qc?
- Should set be unavailable for checkout if either gauge pending_qc?

**Recommendation**: Add validation that checks if gauge is part of set before returning

---

### 3. **Checked Out Status Cascade**
**Current State**: GaugeSetService validates neither gauge can be "checked_out" before replacement
**Code Location**: 
```javascript
// From GaugeSetService.replaceCompanion()
if (existingGauge.status === 'checked_out') {
  throw new Error('Cannot replace gauge while existing gauge in set is checked out');
}
if (oldCompanion.status === 'checked_out') {
  throw new Error('Cannot replace gauge while either gauge in set is checked out');
}
```

**Status**: ✅ Implemented

---

### 4. **Companion Updates Cascade**
**Currently**: When gauge updates, companion status not affected
**Missing**: 
- Storage location cascades to companion (yes, implemented in pairSpareGauges)
- Status changes don't cascade (by design - each gauge independent)

**Recommendation**: Status should be independent per gauge, not cascade

---

## Service Modification Strategy

### Where to Add Cascade Logic

#### **GaugeCheckoutService** (PRIMARY)
**For**: Checkout/return operations with cascades
**Methods to modify**:
- `checkoutGauge()` - Add companion checkout validation
- `returnGauge()` - Add companion status check if needed
- `qcVerifyGauge()` - Handle companion QC state

**Pattern**: Check if gauge has companion, validate both before operation

#### **GaugeSetService** (SECONDARY)
**For**: Gauge set operations with cascades
**Methods to modify**:
- `pairSpareGauges()` - Already cascades location ✅
- `replaceCompanion()` - Already validates checked_out ✅
- `unpairSet()` - New method needed for cascading effects

**Pattern**: Always validate both gauges when modifying set

#### **GaugeStatusService** (VALIDATION)
**For**: Status rules that affect companions
**Methods to add**:
- `canCheckoutSet(gaugeId)` - Check if gauge + companion can checkout
- `validateSetStatus(gaugeId)` - Validate set consistency

**Pattern**: Add set-aware status validation methods

#### **GaugeSetRepository** (DATA ACCESS)
**For**: Atomic multi-gauge operations
**Methods to add**:
- `getCompanionGauge(gaugeId)` - Get companion within transaction
- `updateBothGauges(goId, noGoId, updates)` - Atomic update both

**Pattern**: Support transactional multi-record updates

---

## New Methods Needed vs. Modified Methods

### New Methods Required

#### **GaugeSetService**
```javascript
// Check if gauge set can be checked out
async canCheckoutSet(gaugeId) {
  const gauge = await this.validationHelper.getAndValidateGauge(gaugeId);
  if (!gauge.companionGaugeId) {
    return { canCheckout: true, reason: null };
  }
  
  const companion = await this.validationHelper.getAndValidateGauge(gauge.companionGaugeId);
  const statusService = serviceRegistry.get('GaugeStatusService');
  
  const gaugeCheck = statusService.canCheckout(gauge);
  const companionCheck = statusService.canCheckout(companion);
  
  if (!gaugeCheck.canCheckout) return gaugeCheck;
  if (!companionCheck.canCheckout) return {
    canCheckout: false,
    reason: `Companion gauge cannot checkout: ${companionCheck.reason}`
  };
  
  return { canCheckout: true, reason: null };
}

// Get companion status
async getCompanionStatus(gaugeId) {
  const gauge = await this.repository.getGaugeById(gaugeId);
  if (!gauge.companionGaugeId) return null;
  
  return await this.repository.getGaugeById(gauge.companionGaugeId);
}

// Validate location consistency
async validateLocationConsistency(gaugeId) {
  const gauge = await this.repository.getGaugeById(gaugeId);
  if (!gauge.companionGaugeId) return { consistent: true };
  
  const companion = await this.repository.getGaugeById(gauge.companionGaugeId);
  const consistent = gauge.storage_location === companion.storage_location;
  
  return {
    consistent,
    gaugeLocation: gauge.storage_location,
    companionLocation: companion.storage_location
  };
}
```

#### **GaugeCheckoutService**
```javascript
// Check if gauge set can be checked out
async checkoutGaugeSet(gaugeId, checkoutData, userId) {
  return await this.executeInTransaction(async (connection) => {
    const gauge = await gaugeService.getGaugeByGaugeId(gaugeId);
    
    // If part of set, checkout both gauges
    if (gauge.companion_gauge_id) {
      const companion = await gaugeService.getGaugeByGaugeId(gauge.companion_gauge_id);
      
      // Validate both can be checked out
      const checkCompanion = statusService.canCheckout(companion);
      if (!checkCompanion.canCheckout) {
        throw new Error(`Companion gauge cannot be checked out: ${checkCompanion.reason}`);
      }
      
      // Checkout both
      await this.checkoutGauge(gaugeId, checkoutData, userId);
      await this.checkoutGauge(companion.gauge_id, checkoutData, userId);
      
      return { success: true, data: { gaugeId, companionId: companion.gauge_id } };
    }
    
    // Single gauge
    return await this.checkoutGauge(gaugeId, checkoutData, userId);
  });
}

// Return gauge set
async returnGaugeSet(gaugeId, returnData, userId) {
  // Similar logic - return both if part of set
}
```

#### **GaugeStatusService**
```javascript
// Validate set status consistency
async validateSetStatusConsistency(gaugeId, connection = null) {
  const gauge = await this.gaugeStatusRepository.getGaugeStatus(gaugeId, connection);
  if (!gauge.companionGaugeId) return { consistent: true };
  
  const companion = await this.gaugeStatusRepository.getGaugeStatus(gauge.companionGaugeId, connection);
  
  // Determine if statuses should match
  // Most status changes should be independent, but some workflows may require matching
  // Example: If either checked_out, both should be accessible
  
  return {
    consistent: true, // Status can differ by design
    gaugeStatus: gauge.status,
    companionStatus: companion.status
  };
}
```

### Modified Methods

#### **GaugeCheckoutService.returnGauge()**
**Addition**: Check if companion needs action
```javascript
// After cancelling transfers, check companion status
if (gauge.companion_gauge_id) {
  const companion = await gaugeService.getGaugeByGaugeId(gauge.companion_gauge_id);
  
  // Log if companion has different status
  if (companion.status !== 'pending_qc') {
    logger.warn('Companion gauge has different status after return', {
      gaugeId,
      gaugeStatus: 'pending_qc',
      companionId: gauge.companion_gauge_id,
      companionStatus: companion.status
    });
  }
}
```

#### **GaugeSetService.pairSpareGauges()**
**Addition**: Validate location availability
```javascript
// NEW: Validate location is available and appropriate
const locationValid = await this.validationHelper.validateLocationAvailable(setLocation);
if (!locationValid) {
  throw new Error(`Storage location is not available: ${setLocation}`);
}
```

#### **GaugeCheckoutService.checkoutGauge()**
**Addition**: Warn if companion checked out to different user
```javascript
// After successful checkout, check companion status
if (gauge.companion_gauge_id) {
  const companion = await gaugeService.getGaugeByGaugeId(gauge.companion_gauge_id);
  if (companion.status === 'checked_out' && companion.checked_out_to !== userId) {
    // Log warning - set is split across users
    logger.warn('Companion gauge checked out to different user', {
      gaugeId,
      checkoutUser: userId,
      companionId: gauge.companion_gauge_id,
      companionCheckoutUser: companion.checked_out_to
    });
  }
}
```

---

## Summary of Current Patterns

| Pattern | Location | Used By | Isolation | Benefits |
|---------|----------|---------|-----------|----------|
| BaseService.executeInTransaction() | Infrastructure | GaugeCreationService, GaugeTrackingService | Default | Simple, audit-aware |
| GaugeSetTransactionHelper.executeInTransaction() | Gauge module | GaugeSetService | REPEATABLE READ | Explicit, phantom-read safe |
| Direct connection threading | Implementations | GaugeCheckoutService | Transaction | Complex operations, all in one transaction |

---

## Key Architectural Observations

### Strengths
1. **Clear separation of concerns**: Each service has focused responsibility
2. **Proper transaction management**: Multiple patterns support different scenarios
3. **Business rule enforcement**: Validation happens before data modification
4. **Audit trail creation**: All operations logged consistently
5. **Status validation**: Single service for status rules

### Weaknesses
1. **Limited cascade support**: Companion gauges not fully integrated
2. **No set-level checkout**: Must checkout gauges individually
3. **Split responsibility**: GaugeCheckoutService + GaugeTrackingService + GaugeHistoryService overlap
4. **Location consistency**: Only enforced in pairing, not maintained during operations
5. **No set-level queries**: Must query individually and group client-side (done in QueryService)

### Recommendations
1. Add set-aware checkout methods to GaugeCheckoutService
2. Add companion validation to GaugeStatusService
3. Consider GaugeSetOperationService for complex set operations
4. Enhance location validation and cascade in GaugeSetService
5. Consolidate GaugeTrackingService into GaugeHistoryService (remove)

