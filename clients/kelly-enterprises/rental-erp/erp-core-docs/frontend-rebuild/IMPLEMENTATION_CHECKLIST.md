# Serial Number System - Implementation Checklist

**Project**: Thread Gauge Serial Number Redesign
**Status**: Ready to Begin
**Approach**: Complete System Redesign (No Compromises)

---

## Phase 1: Database Foundation

### Migration File Creation
- [ ] Create `backend/src/modules/gauge/migrations/XXX_thread_gauge_serial_system.sql`
- [ ] Make `gauge_id` nullable: `ALTER TABLE gauges MODIFY COLUMN gauge_id VARCHAR(50) UNIQUE;`
- [ ] Add serial number requirement constraint for thread gauges
- [ ] Add unique index on serial_number for thread gauges
- [ ] Add index for spare thread gauge lookups
- [ ] Add composite index for identifier lookups
- [ ] Document rollback procedure

### Migration Testing
- [ ] Run migration on local development database
- [ ] Verify `gauge_id` is now nullable
- [ ] Test constraint: Try creating thread gauge without serial (should fail)
- [ ] Test constraint: Try duplicate serial number (should fail)
- [ ] Test constraint: Non-thread gauge without serial (should succeed)
- [ ] Verify indexes created successfully
- [ ] Test rollback procedure

### Data Preparation
- [ ] Backup current database
- [ ] Count existing thread gauges
- [ ] Count paired vs unpaired thread gauges
- [ ] Identify thread gauges without serial numbers
- [ ] Assign serial numbers to gauges that need them
- [ ] Clear `gauge_id` for unpaired thread gauges
- [ ] Verify data integrity after migration

---

## Phase 2: Backend Core

### GaugeRepository.js - Dual Identifier Support
- [ ] Add `findByIdentifier(identifier, equipmentType)` method
- [ ] Update `findByGaugeId(gaugeId)` to handle NULL
- [ ] Add `findBySerialNumber(serialNumber)` method
- [ ] Add `findSpareThreadGauges(filters)` method
- [ ] Update `create()` to accept NULL gauge_id
- [ ] Update `update()` to support gauge_id changes
- [ ] Update all queries to handle nullable gauge_id
- [ ] Add proper error handling for not found cases

### GaugeCreationService.js - Thread Gauge Logic
- [ ] Add serial number validation for thread gauges
- [ ] Check for duplicate serial numbers
- [ ] Create spare thread gauges with `gauge_id = NULL`
- [ ] Update non-thread gauge creation (no change needed)
- [ ] Update audit logging with appropriate identifier
- [ ] Add validation error messages
- [ ] Test create spare thread gauge
- [ ] Test create non-thread gauge (should still work)

### GaugeSetService.js - Pairing System Redesign
- [ ] Create `createSet(goSerial, noGoSerial, sharedData, userId)` method
- [ ] Find gauges by serial number
- [ ] Validate both are unpaired (gauge_id IS NULL)
- [ ] Validate compatibility (thread size, class, type)
- [ ] Generate new set ID (SP####)
- [ ] Update GO gauge with setId + suffix 'A'
- [ ] Update NO GO gauge with setId + suffix 'B'
- [ ] Add audit logging for set creation

### GaugeSetService.js - Unpair Logic
- [ ] Create `unpairSet(setId, userId)` method
- [ ] Find both gauges in set by gauge_id
- [ ] Validate set has exactly 2 gauges
- [ ] Set `gauge_id = NULL` for both gauges
- [ ] Clear gauge_suffix for both
- [ ] Clear companion_gauge_id for both
- [ ] Set is_spare = true
- [ ] Add audit logging

### GaugeSetService.js - Replace Logic
- [ ] Create `replaceGaugeInSet(setId, oldSerial, newSerial, userId)` method
- [ ] Find old gauge by serial number
- [ ] Find new gauge by serial number
- [ ] Validate old gauge is in the set
- [ ] Validate new gauge is unpaired spare (gauge_id IS NULL)
- [ ] Validate compatibility
- [ ] Return old gauge to spare (gauge_id = NULL)
- [ ] Add new gauge to set (gauge_id = setId)
- [ ] Update companion references
- [ ] Add audit logging

### GaugeIdService.js - Set ID Generation
- [ ] Add `generateSetId(categoryId)` method
- [ ] Use SP prefix for thread gauge sets
- [ ] Format: SP0001, SP0002, etc. (no suffix)
- [ ] Test sequence generation
- [ ] Verify uniqueness

---

## Phase 3: Backend API Endpoints

### Core Gauge Endpoints
- [ ] `GET /api/gauges/:identifier` - Support both gauge_id and serial_number
- [ ] `POST /api/gauges` - Create gauge (validate serial for thread)
- [ ] `PUT /api/gauges/:identifier` - Update gauge
- [ ] `DELETE /api/gauges/:identifier` - Delete gauge

### Spare Thread Gauge Endpoints
- [ ] `GET /api/gauges/spare-thread-gauges` - Get all spare thread gauges
- [ ] Add filters: thread_size, thread_class, gauge_type
- [ ] Test filtering logic
- [ ] Test response format

### Set Management Endpoints
- [ ] `POST /api/gauges/pair-spares` - Create set from spares
- [ ] Validate request body (go_serial_number, nogo_serial_number)
- [ ] Test successful pairing
- [ ] Test validation errors

- [ ] `POST /api/gauges/unpair-set/:setId` - Unpair a set
- [ ] Validate setId exists
- [ ] Test successful unpair
- [ ] Verify gauges returned to spare state

- [ ] `POST /api/gauges/replace-in-set/:setId` - Replace gauge in set
- [ ] Validate request body (old_serial_number, new_serial_number)
- [ ] Test successful replacement
- [ ] Test validation errors

### Calibration Endpoints
- [ ] Update `POST /api/calibration/send` to support both identifiers
- [ ] Test with gauge_id array
- [ ] Test with serial_number array
- [ ] Test with mixed array

### Checkout Endpoints
- [ ] Update `POST /api/gauges/checkout/:setId` to enforce sets only
- [ ] Validate set has exactly 2 gauges
- [ ] Prevent checkout of spare gauges
- [ ] Test checkout enforcement

### Validation Rules
- [ ] Add thread gauge creation validation
- [ ] Serial number required for thread gauges
- [ ] Serial number format validation
- [ ] Pairing validation rules
- [ ] Replacement validation rules

---

## Phase 4: Backend Integration

### CalibrationWorkflowService.js
- [ ] Update `sendToCalibration()` to support serial lookups
- [ ] Update `receiveFromCalibration()` to use identifiers
- [ ] Update certificate upload to use identifiers
- [ ] Test calibration workflow with spare thread gauges
- [ ] Test calibration workflow with sets

### GaugeCheckoutService.js
- [ ] Update `checkoutSet()` to verify both gauges exist
- [ ] Prevent checkout of unpaired thread gauges
- [ ] Test checkout validation
- [ ] Test checkout cascade operations

### Cascade Operations
- [ ] Update status change to cascade to companion
- [ ] Update location change to cascade to companion
- [ ] Test cascade with serial number lookups
- [ ] Verify orphan handling on deletion

### Audit Logging
- [ ] Update audit logs to show serial numbers for spares
- [ ] Update audit logs to show set IDs for sets
- [ ] Test audit trail for pairing
- [ ] Test audit trail for unpairing
- [ ] Test audit trail for replacement

---

## Phase 5: Backend Testing (Rewrite All Tests)

### Repository Tests
- [ ] Test `findByIdentifier()` with gauge_id
- [ ] Test `findByIdentifier()` with serial_number
- [ ] Test `findBySerialNumber()` success case
- [ ] Test `findBySerialNumber()` not found case
- [ ] Test `findSpareThreadGauges()` with no filters
- [ ] Test `findSpareThreadGauges()` with filters
- [ ] Test creating gauge with NULL gauge_id

### Creation Service Tests
- [ ] Test creating spare thread gauge (gauge_id should be NULL)
- [ ] Test creating spare thread gauge without serial (should fail)
- [ ] Test creating spare thread gauge with duplicate serial (should fail)
- [ ] Test creating non-thread gauge (should work as before)

### Set Service Tests
- [ ] Test pairing two spare thread gauges (success)
- [ ] Test pairing gauge that already has gauge_id (should fail)
- [ ] Test pairing incompatible gauges (should fail)
- [ ] Test unpairing set (success)
- [ ] Test unpairing non-existent set (should fail)
- [ ] Test replacing gauge in set (success)
- [ ] Test replacing with non-spare gauge (should fail)
- [ ] Test replacing with incompatible gauge (should fail)

### API Endpoint Tests
- [ ] Test GET /api/gauges/:identifier with gauge_id
- [ ] Test GET /api/gauges/:identifier with serial_number
- [ ] Test GET /api/gauges/spare-thread-gauges
- [ ] Test POST /api/gauges (create spare)
- [ ] Test POST /api/gauges/pair-spares (success)
- [ ] Test POST /api/gauges/pair-spares (validation errors)
- [ ] Test POST /api/gauges/unpair-set/:setId
- [ ] Test POST /api/gauges/replace-in-set/:setId

### Integration Tests
- [ ] Test complete workflow: create 2 spares → pair → view → unpair
- [ ] Test replacement workflow: create spare → create set → replace gauge
- [ ] Test calibration with spare thread gauges
- [ ] Test calibration with sets
- [ ] Test checkout enforcement (sets only)
- [ ] Test cascade operations with serial lookups

### Test Coverage
- [ ] Verify all 232 tests are rewritten and passing
- [ ] Add new tests for spare thread gauge workflows
- [ ] Achieve >80% code coverage
- [ ] Document any edge cases

---

## Phase 6: Frontend Types & Services

### Type Definitions
- [ ] Update `Gauge` interface (gauge_id is nullable)
- [ ] Create `getGaugeIdentifier(gauge)` helper
- [ ] Create `getGaugeDisplayName(gauge)` helper
- [ ] Create `isSpareThreadGauge(gauge)` helper
- [ ] Create `isThreadGaugeSet(gauge)` helper
- [ ] Update all type exports

### Service Layer
- [ ] Update `gaugeService.getByIdentifier(identifier)`
- [ ] Add `gaugeService.getSpareThreadGauges(filters)`
- [ ] Add `gaugeService.createSpareThreadGauge(data)`
- [ ] Add `gaugeService.pairSpares(goSerial, noGoSerial, sharedData)`
- [ ] Add `gaugeService.unpairSet(setId)`
- [ ] Add `gaugeService.replaceGaugeInSet(setId, oldSerial, newSerial)`
- [ ] Update error handling for all methods
- [ ] Test all service methods

---

## Phase 7: Frontend Components

### ThreadGaugeForm.tsx
- [ ] Make serial number field required
- [ ] Add validation for serial number format
- [ ] Add duplicate serial number check
- [ ] Test form submission
- [ ] Test validation errors

### GaugeDetail.tsx
- [ ] Update to handle nullable gauge_id
- [ ] Display "S/N {serial}" for spare thread gauges
- [ ] Display "{setId} (S/N {serial})" for sets
- [ ] Show appropriate sections based on spare vs set
- [ ] Add "Unpair Set" button for sets
- [ ] Add "Replace Gauge" button for sets
- [ ] Test navigation with serial numbers
- [ ] Test all button actions

### SetDetailsPage.tsx
- [ ] Update title to show specs instead of just ID
- [ ] Display gauge members with serial numbers
- [ ] Make serial numbers clickable links
- [ ] Show set-level information
- [ ] Add "Replace Gauge" action
- [ ] Add "Unpair Set" action
- [ ] Test modal interactions
- [ ] Test navigation

### SparePairingInterface.tsx (NEW)
- [ ] Create two-column layout (GO | NO GO)
- [ ] Fetch spare thread gauges
- [ ] Filter by thread size and class
- [ ] Display gauges with serial numbers
- [ ] Implement selection logic
- [ ] Validate compatibility before pairing
- [ ] Call pairing API
- [ ] Show success/error messages
- [ ] Refresh gauge list after pairing

### GaugeList.tsx
- [ ] Update to display spare thread gauges correctly
- [ ] Show "S/N {serial}" for spares
- [ ] Show "{setId}" for sets
- [ ] Add visual indicator for spares vs sets
- [ ] Update filtering logic
- [ ] Test search functionality
- [ ] Test status badges

### ReplaceGaugeModal.tsx (NEW)
- [ ] Create modal for gauge replacement
- [ ] Select spare thread gauge from list
- [ ] Filter by compatibility
- [ ] Show serial numbers
- [ ] Call replacement API
- [ ] Handle success/error
- [ ] Refresh set details

### UnpairSetModal.tsx (NEW)
- [ ] Create confirmation modal
- [ ] Show set details
- [ ] Explain consequences (both return to spare)
- [ ] Call unpair API
- [ ] Navigate back to gauge list
- [ ] Show success message

---

## Phase 8: Frontend Integration

### Navigation & Routing
- [ ] Update routes to support serial number navigation
- [ ] Test `/gauges/:identifier` with gauge_id
- [ ] Test `/gauges/:identifier` with serial_number
- [ ] Update navigation helpers
- [ ] Test deep linking

### State Management
- [ ] Update React Query keys to use correct identifiers
- [ ] Invalidate queries after pairing/unpairing
- [ ] Update cache after gauge replacement
- [ ] Test optimistic updates

### Error Handling
- [ ] Add error messages for duplicate serial numbers
- [ ] Add error messages for pairing failures
- [ ] Add error messages for replacement failures
- [ ] Add error messages for unpair failures
- [ ] Test all error scenarios

### Loading States
- [ ] Add loading spinners for pairing
- [ ] Add loading spinners for unpair
- [ ] Add loading spinners for replacement
- [ ] Test loading states

---

## Phase 9: End-to-End Testing

### Workflow 1: Create and Pair Spares
- [ ] Create GO spare thread gauge with serial number
- [ ] Verify gauge_id is NULL in database
- [ ] Verify display shows "S/N {serial}"
- [ ] Create NO GO spare thread gauge with serial number
- [ ] Verify gauge_id is NULL in database
- [ ] Open pairing interface
- [ ] Select both gauges
- [ ] Create set
- [ ] Verify both gauges now have gauge_id = SP####A/B
- [ ] Verify set appears in gauge list
- [ ] Open set details
- [ ] Verify serial numbers are clickable

### Workflow 2: Unpair Set
- [ ] Open set details page
- [ ] Click "Unpair Set"
- [ ] Confirm action
- [ ] Verify both gauges return to spare state
- [ ] Verify gauge_id is NULL for both
- [ ] Verify both appear in spare inventory
- [ ] Verify display shows "S/N {serial}"

### Workflow 3: Replace Gauge in Set
- [ ] Create spare thread gauge
- [ ] Open set details page
- [ ] Click "Replace Gauge"
- [ ] Select which gauge to replace (A or B)
- [ ] Select replacement from spare inventory
- [ ] Confirm replacement
- [ ] Verify old gauge returned to spare (gauge_id = NULL)
- [ ] Verify new gauge added to set (gauge_id = SP####)
- [ ] Verify set details updated
- [ ] Verify old gauge in spare inventory

### Workflow 4: Calibration with Spares
- [ ] Create spare thread gauge
- [ ] Send to calibration
- [ ] Verify lookup by serial number works
- [ ] Upload certificate
- [ ] Verify certificate attached to correct gauge

### Workflow 5: Calibration with Sets
- [ ] Create set
- [ ] Send set to calibration
- [ ] Verify both gauges sent
- [ ] Upload certificates (one per gauge)
- [ ] Verify location verification
- [ ] Return to available

### Workflow 6: Checkout Enforcement
- [ ] Try to checkout spare thread gauge (should fail)
- [ ] Checkout set (should succeed)
- [ ] Verify both gauges checked out together

---

## Phase 10: Data Migration & Deployment

### Pre-Migration
- [ ] Backup production database
- [ ] Document current state (counts, samples)
- [ ] Identify thread gauges without serial numbers
- [ ] Plan serial number assignment for missing data
- [ ] Review migration script one final time

### Migration Execution
- [ ] Run migration on staging database
- [ ] Verify schema changes applied correctly
- [ ] Run post-migration validation queries
- [ ] Test API endpoints on staging
- [ ] Test frontend on staging
- [ ] Get user approval from staging

### Production Deployment
- [ ] Schedule maintenance window
- [ ] Run migration on production database
- [ ] Verify migration success
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Smoke test critical workflows
- [ ] Monitor for errors

### Post-Deployment
- [ ] Verify all thread gauges have serial numbers
- [ ] Verify unpaired gauges have NULL gauge_id
- [ ] Verify paired gauges share gauge_id
- [ ] Check audit logs
- [ ] Monitor error rates
- [ ] Gather user feedback

---

## Validation Queries

### Pre-Migration Checks
```sql
-- Count thread gauges
SELECT COUNT(*) FROM gauges WHERE equipment_type = 'thread_gauge';

-- Count paired thread gauges
SELECT COUNT(*) FROM gauges
WHERE equipment_type = 'thread_gauge' AND companion_gauge_id IS NOT NULL;

-- Count unpaired thread gauges
SELECT COUNT(*) FROM gauges
WHERE equipment_type = 'thread_gauge' AND companion_gauge_id IS NULL;

-- Find thread gauges without serial numbers
SELECT id, gauge_id, status
FROM gauges
WHERE equipment_type = 'thread_gauge'
  AND (serial_number IS NULL OR serial_number = '');
```

### Post-Migration Validation
```sql
-- Verify all thread gauges have serial numbers (should return 0)
SELECT COUNT(*) FROM gauges
WHERE equipment_type = 'thread_gauge'
  AND (serial_number IS NULL OR serial_number = '');

-- Verify unpaired thread gauges have NULL gauge_id (should return 0)
SELECT COUNT(*) FROM gauges
WHERE equipment_type = 'thread_gauge'
  AND companion_gauge_id IS NULL
  AND gauge_id IS NOT NULL;

-- Verify paired thread gauges have same gauge_id (should return 0)
SELECT g1.gauge_id AS g1_id, g2.gauge_id AS g2_id
FROM gauges g1
JOIN gauges g2 ON g1.companion_gauge_id = g2.id
WHERE g1.equipment_type = 'thread_gauge'
  AND g1.gauge_id != g2.gauge_id;

-- Sample spare thread gauges
SELECT id, gauge_id, serial_number, status
FROM gauges
WHERE equipment_type = 'thread_gauge' AND gauge_id IS NULL
LIMIT 10;

-- Sample thread gauge sets
SELECT gauge_id, serial_number, gauge_suffix, companion_gauge_id
FROM gauges
WHERE equipment_type = 'thread_gauge' AND gauge_id IS NOT NULL
ORDER BY gauge_id
LIMIT 20;
```

---

## Progress Tracking

**Current Phase**: Not Started

- [ ] Phase 1: Database Foundation
- [ ] Phase 2: Backend Core
- [ ] Phase 3: Backend API Endpoints
- [ ] Phase 4: Backend Integration
- [ ] Phase 5: Backend Testing
- [ ] Phase 6: Frontend Types & Services
- [ ] Phase 7: Frontend Components
- [ ] Phase 8: Frontend Integration
- [ ] Phase 9: End-to-End Testing
- [ ] Phase 10: Data Migration & Deployment

**Estimated Completion**: 3-4 weeks

---

**This is the complete checklist for a REAL architectural fix.**
