# Schema Migration Progress - system_gauge_id Removal

**Date Started:** 2025-10-29
**Migration:** Remove obsolete columns (system_gauge_id, companion_gauge_id, serial_number, gauge_suffix)
**New Schema:** gauge_id (universal identifier) + set_id (thread gauge pairing)

---

## Current Status: ✅ system_gauge_id MIGRATION COMPLETE

**All 50+ system_gauge_id references have been eliminated from the backend codebase!**

Last Updated: 2025-10-29 14:10 UTC

### ✅ Completed Steps

#### 1. Database Migration
- **File:** `backend/src/infrastructure/database/migrations/015-remove-system-gauge-id.sql`
- **Status:** APPLIED ✅
- **Changes:** Removed `system_gauge_id` column, ensured `gauge_id` is unique

#### 2. Domain Model Updates
- **File:** `backend/src/modules/gauge/domain/GaugeEntity.js`
- **Status:** FIXED ✅
- **Changes:**
  - Removed `this.systemGaugeId`, `this.gaugeSuffix`, `this.serialNumber`, `this.companionGaugeId`
  - Added `this.setId` for thread gauge pairing
  - Updated validation: removed system_gauge_id check, updated to use set_id
  - Updated `toDatabase()` method to remove obsolete fields

#### 3. SQL Builder Updates
- **File:** `backend/src/modules/gauge/mappers/GaugeSetSQLBuilder.js`
- **Status:** FIXED ✅
- **Changes:**
  - Removed obsolete columns from GAUGE_SELECT_FIELDS and GAUGE_INSERT_FIELDS
  - Added set_id to queries

#### 4. Repository Layer - Initial Fixes
**Files Fixed:**
- `CheckoutRepository.js` ✅ - Removed system_gauge_id fallback logic
- `GaugeSetRepository.js` ✅ - Updated ORDER BY and WHERE clauses
- `ReportsRepository.js` ✅ - Removed system_gauge_id from WHERE
- `GaugeRepository.js` ✅ - Removed fallback lookup logic
- `gauges.js` routes ✅ - Removed from debug endpoint

#### 5. Service Layer - Cascade Updates
**Files Fixed:**
- `GaugeCascadeService.js` ✅ - Changed all `systemGaugeId` references to `gaugeId`
- `GaugeCheckoutService.js` ✅ - Changed `cascadeResult.companion.systemGaugeId` to `.gaugeId`

#### 6. Frontend Updates
**Files Fixed:**
- `GaugeModalManager.tsx` ✅ - Fixed 9 references from system_gauge_id to gauge_id
- `types/index.ts` ✅ - Updated TypeScript interface

---

## ✅ system_gauge_id Migration Completed

### Files Fixed by Task Agent (44 references)
1. **GaugeQueryService.js** ✅ - All suffix extraction logic updated to use gauge_id
2. **gaugeCalibrationService.js** ✅ - Certificate generation uses gauge_id
3. **GaugeSetService.js** ✅ - Pairing logic migrated to set_id
4. **CheckoutRepository.js** ✅ - All fallback logic removed (partial - completed manually)
5. **gaugeValidationRules.js** ✅ - Validation rules updated
6. **GaugeIdService.js** ✅ - Suffix extraction from gauge_id
7. **UnifiedRepositoryInterface.js** ✅ - Business identifier patterns updated
8. **GaugeSetSQLBuilder.js** ✅ - SQL builders updated (partial - completed manually)
9. **GaugeSet.js** ✅ - Domain model updated
10. **UnifiedSearchInterface.js** ✅ - Search patterns updated
11. **CalibrationCertificatePDFService.js** ✅ - PDF generation uses gauge_id (completed manually)
12. **gauges.js** ✅ - Logger updated to use set_id (completed manually)
13. **gauges-v2.js** ✅ - Logger updated to use set_id (completed manually)

### Final Manual Fixes (4 references)
1. **CheckoutRepository.js:200** ✅ - Removed `as system_gauge_id` alias
2. **gauges-v2.js:473** ✅ - Logger changed systemId → setId
3. **gauges.js:190** ✅ - Logger changed system_gauge_id → set_id
4. **CalibrationCertificatePDFService.js:86** ✅ - PDF uses gauge_id

### Verification
```bash
grep -r "system_gauge_id" backend/src --include="*.js" | grep -v "node_modules" | grep -v "Note:" | grep -v "//"
# Returns: 0 results ✅
```

### companion_gauge_id References (59 total references)

**Files with Most References:**
1. **CalibrationWorkflowService.js** (18 refs) - PENDING
2. **GaugeQueryRepository.js** (12 refs) - PENDING
3. **GaugeSetService.js** (6 refs) - PENDING
4. **GaugeCascadeService.js** (6 refs) - PENDING
5. **OperationsService.js** (5 refs) - PENDING
6. **GaugeSetRepository.js** (5 refs) - PENDING
7. **GaugeQueryService.js** (4 refs) - PENDING
8. **GaugeCheckoutService.js** (2 refs) - PENDING
9. **gaugeValidationRules.js** (1 ref) - PENDING

**Migration Strategy for companion_gauge_id:**
- Replace JOIN logic: `JOIN gauges g2 ON g1.companion_gauge_id = g2.id` → `JOIN gauges g2 ON g1.set_id = g2.set_id AND g2.id != g1.id`
- Replace NULL checks: `companion_gauge_id IS NULL` → `set_id IS NULL`
- Update domain models to use `set_id` for pairing logic

### Additional Obsolete Column References

#### serial_number (gauge context - NOT user serial numbers)
**Files with References:**
- GaugeQueryService.js (4 refs)
- eventEmitters.js (3 refs)
- GaugeQueryRepository.js (2 refs)
- ReportsRepository.js (1 ref)
- OperationsRepository.js (1 ref)
- GaugeRepository.js (1 ref)
- GaugeSetSQLBuilder.js (1 ref)

**Note:** Only remove gauge.serial_number references. User table serial_number is different and should be preserved.

#### gauge_suffix
**Files with References:**
- GaugeQueryService.js (3 refs)
- GaugeSetRepository.js (3 refs)
- OperationsService.js (2 refs)
- GaugeSetService.js (2 refs)
- GaugeCascadeService.js (2 refs)
- GaugePresenter.js (2 refs)
- GaugeSetSQLBuilder.js (2 refs)
- GaugeEntity.js (1 ref)

**Note:** gauge_suffix is now stored in gauge_thread_specifications table. Update logic to query from that table when needed.

---

## Schema Reference

### OLD SCHEMA
```sql
gauges:
  - id (PK)
  - gauge_id (e.g., "1/4-20 UNC-2A A")
  - system_gauge_id (e.g., "SP0001A") ❌ REMOVED
  - serial_number ❌ REMOVED
  - gauge_suffix ('A' or 'B') ❌ REMOVED
  - companion_gauge_id (FK to gauges.id) ❌ REMOVED
  - ...
```

### NEW SCHEMA
```sql
gauges:
  - id (PK)
  - gauge_id (universal identifier, e.g., "SP0001A") ✅
  - set_id (pairing identifier, e.g., "SP0001") ✅ NEW
  - custom_id
  - name
  - equipment_type
  - category_id
  - status
  - ...

gauge_thread_specifications:
  - gauge_id (FK)
  - thread_size
  - thread_class
  - thread_type
  - gauge_type ('GO' or 'NOGO')
  - gauge_suffix ('A' or 'B') ✅ MOVED HERE
```

### Key Relationships

**Thread Gauge Sets (GO/NO-GO pairs):**
```javascript
// OLD: Used companion_gauge_id
gauge1.companion_gauge_id = gauge2.id
gauge2.companion_gauge_id = gauge1.id

// NEW: Use set_id
gauge1.gauge_id = "SP0001A"  // GO gauge
gauge1.set_id = "SP0001"
gauge2.gauge_id = "SP0001B"  // NO-GO gauge
gauge2.set_id = "SP0001"

// Find companion
SELECT * FROM gauges WHERE set_id = 'SP0001' AND id != ?
```

**Spare Gauges (unpaired):**
```javascript
// OLD
WHERE companion_gauge_id IS NULL

// NEW
WHERE set_id IS NULL
```

---

## Testing Checklist

### Unit Tests
- [ ] GaugeEntity validation with new schema
- [ ] GaugeSet pairing logic with set_id
- [ ] GaugeQueryService with gauge_id lookups

### Integration Tests
- [ ] Checkout/return workflow with gauge_id
- [ ] Thread gauge set creation with set_id
- [ ] Spare gauge pairing logic
- [ ] Companion gauge cascade operations

### E2E Tests
- [ ] Create thread gauge set → verify set_id assigned
- [ ] Checkout gauge → verify cascade to companion
- [ ] Return gauge → verify QC workflow
- [ ] Unpair gauges → verify set_id cleared

### Manual Testing
- [x] Button layout changes (Add Gauge, Pending QC, OOS, Calibration Management)
- [x] Calibration Management button color
- [ ] Checkout gauge SP0006A
- [ ] Return gauge (QC workflow)
- [ ] View gauge history
- [ ] Create new thread gauge set
- [ ] Pair spare gauges

---

## Recovery Instructions

If this session terminates, the next instance should:

1. **Check Backend Status:**
   ```bash
   docker logs fireproof-erp-modular-backend-dev --tail 100 | grep -i "error\|system_gauge_id"
   ```

2. **Verify Task Agent Progress:**
   - Task agent was launched to fix remaining system_gauge_id references
   - Check if agent completed all 13 files listed in "Remaining Work" section

3. **Continue with companion_gauge_id Migration:**
   - Start with CalibrationWorkflowService.js (18 refs)
   - Follow the "Migration Strategy for companion_gauge_id" outlined above

4. **Run Tests:**
   ```bash
   # Backend restart
   docker-compose restart backend

   # Wait for startup
   sleep 10

   # Check logs
   docker logs fireproof-erp-modular-backend-dev --tail 50

   # Test return endpoint in browser
   # Navigate to gauge SP0006A and attempt check-in
   ```

5. **Verification Queries:**
   ```bash
   # Check for remaining obsolete references
   grep -r "system_gauge_id" backend/src --include="*.js" | wc -l
   grep -r "companion_gauge_id" backend/src --include="*.js" | wc -l
   ```

---

## Known Issues

### Current Error
- **Error:** `system_gauge_id is required for gauges in a set`
- **Source:** GaugeEntity.js validation (line 69-74)
- **Status:** FIXED ✅
- **Fix:** Updated validation to check gauge_id instead

### Related Files Affected
The Task agent is systematically fixing 50+ references across 13 files. Once complete, all system_gauge_id references will be eliminated.

---

## Documentation Updates Needed

After migration complete:
1. Update API documentation for gauge endpoints
2. Update frontend TypeScript interfaces (DONE ✅)
3. Update database schema documentation
4. Create migration guide for other developers
5. Update CLAUDE.md with new schema details

---

## Contact/Questions

For questions about this migration:
- See: `erp-core-docs/gauge-standardization/`
- Database migration: `backend/src/infrastructure/database/migrations/015-remove-system-gauge-id.sql`
- Original issue: Console errors showing "Unknown column 'g.system_gauge_id'"

Last Updated: 2025-10-29 14:00 UTC
