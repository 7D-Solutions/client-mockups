# Simple Gauge ID Refactor - Implementation Status

**Date:** 2025-01-29
**Migration:** 016-simple-gauge-id-refactor.sql
**Status:** Core implementation complete, remaining work documented below

---

## ✅ Completed

### 1. Database Migration
- **File:** `backend/src/infrastructure/database/migrations/016-simple-gauge-id-refactor.sql`
- **Status:** ✅ Executed successfully
- **Changes:**
  - Deleted all test gauge data (TRUNCATE)
  - Added check constraint: only thread gauges can have set_id
  - Dropped columns: system_gauge_id, serial_number, companion_gauge_id, gauge_suffix
  - Made gauge_id NOT NULL
  - is_go_gauge column already exists in gauge_thread_specifications

### 2. Repository Updates
- **GaugeRepository.js:**
  - ✅ Removed `findBySystemGaugeId()` method
  - ✅ Removed `findBySerialNumber()` method
  - ✅ Updated `createGauge()` - removed system_gauge_id and serial_number, added set_id

- **GaugeSetRepository.js:**
  - ✅ Updated `linkCompanionsWithinTransaction()` - now assigns set_id to both gauges
  - ✅ Updated `unlinkCompanionsWithinTransaction()` - now clears set_id
  - ✅ Updated `unpairGauges()` - clears set_id instead of companion_gauge_id

### 3. Service Updates
- **GaugeSetService.js:**
  - ✅ Updated `pairSpareGauges()` - assigns set_id, removes system_gauge_id/companion_gauge_id logic

### 4. Frontend Helper
- **File:** `frontend/src/modules/gauge/utils/gaugeDisplayHelper.ts`
- **Status:** ✅ Created
- **Functions:**
  - `getGaugeDisplayId()` - Computes display ID from gauge_id/set_id + is_go_gauge
  - `formatGaugeDisplayId()` - Uses user preference for A/B vs GO/NG format

---

## ⚠️ Remaining Work

### Critical (Must Complete Before Testing)

1. **GaugeSetService.js** - Additional method updates:
   - Line 64: `createGaugeSet()` - Update linkCompanionsWithinTransaction call to pass setId
   - Line 217-218: `replaceCompanionGauge()` - Update companion linking logic
   - Lines 240-310: `unpairGauges()` and `unpairSet()` - Remove companion_gauge_id references
   - Line 472-505: `unpairSetBySetId()` - Update SQL to use set_id
   - Line 540-585: `replaceCompanionWithSerial()` - Remove system_gauge_id/companion_gauge_id logic

2. **Fallback Logic Removal** (|| gauge.system_gauge_id):
   - Search pattern: `gauge\.gauge_id\s*\|\|\s*gauge\.system_gauge_id`
   - Files identified (30 total):
     - CertificateService.js
     - CalibrationCertificatePDFService.js
     - GaugeCreationService.js
     - gauge-certificates.js (routes)
     - gauges-v2.js (routes)
     - GaugeQueryService.js
     - ReportsRepository.js
     - Plus 23 additional files

3. **Update Queries and SQL**:
   - All SELECT queries referencing system_gauge_id, serial_number, companion_gauge_id
   - All UPDATE queries setting these fields
   - All INSERT queries including these columns

### Medium Priority

4. **Domain Models:**
   - GaugeEntity.js - Remove system_gauge_id, serial_number properties
   - GaugeSet.js - Update set linking logic

5. **DTO Mapping:**
   - GaugeDTOMapper.js - Remove system_gauge_id, serial_number transformations
   - Update transformToDTO() and transformFromDTO()

6. **Validation:**
   - gaugeValidationRules.js - Update validation rules
   - Remove serial_number validators

7. **Query Builders:**
   - GaugeSetSQLBuilder.js - Update SQL generation
   - GaugeQueryRepository.js - Update query methods

### Low Priority

8. **Services:**
   - gaugeCalibrationService.js
   - GaugeCheckoutService.js
   - GaugeCascadeService.js
   - OperationsService.js
   - CalibrationWorkflowService.js

9. **Repositories:**
   - CheckoutRepository.js
   - OperationsRepository.js

10. **Frontend Integration:**
    - Import and use `gaugeDisplayHelper.ts` in all gauge display components
    - Replace direct gauge_id references with getGaugeDisplayId()
    - Add user preference settings for A/B vs GO/NG format

---

## 🔧 Implementation Approach

### Recommended Order:

1. **Complete GaugeSetService.js updates** (Critical)
   - Update all remaining methods
   - Search for system_gauge_id, companion_gauge_id references
   - Replace with set_id logic

2. **Remove fallback logic** (Critical)
   ```bash
   # Find all instances
   grep -r "gauge\.gauge_id.*||.*gauge\.system_gauge_id" backend/src/modules/gauge/

   # Replace with
   gauge.gauge_id  # system_gauge_id no longer exists
   ```

3. **Update queries** (Critical)
   - Use Grep to find all SQL queries with removed columns
   - Update column lists in SELECT/INSERT/UPDATE

4. **Test each module** (After each update)
   - Restart Docker containers
   - Test create/pair/unpair workflows
   - Verify display logic

5. **Frontend integration** (After backend stable)
   - Update GaugeList.tsx
   - Update GaugeDetail components
   - Test display formats

---

## 📋 Testing Checklist

### Database Schema
- [x] gauge_id is NOT NULL
- [x] set_id exists and is nullable
- [x] system_gauge_id, serial_number, companion_gauge_id, gauge_suffix dropped
- [x] Constraint chk_set_id_thread_only exists

### Thread Gauge Workflows
- [ ] Create unpaired thread gauge with serial number
- [ ] Pair two spare thread gauges (assigns set_id)
- [ ] Display shows "SP1001 GO" or "SP1001A" format
- [ ] Unpair set (clears set_id)
- [ ] Query gauges by set_id
- [ ] Replace damaged gauge in set

### Other Equipment Types
- [ ] Create hand tool (system-generated gauge_id, set_id=NULL)
- [ ] Create large equipment (system-generated gauge_id, set_id=NULL)
- [ ] Create calibration standard (system-generated gauge_id, set_id=NULL)
- [ ] Verify constraint blocks set_id on non-thread equipment

### Display Logic
- [ ] Unpaired thread gauge shows serial number
- [ ] Paired thread gauge shows set_id + suffix
- [ ] Hand tool shows generated gauge_id
- [ ] User can toggle A/B vs GO/NG format

---

## 🚀 Next Steps

1. Review this status document
2. Complete Critical remaining work (GaugeSetService + fallback logic)
3. Run comprehensive tests
4. Update frontend components
5. Delete test data and recreate with new structure
6. Full end-to-end testing

---

**Estimated Remaining Effort:** 3-5K tokens (Critical items only)
**Total Implementation:** ~8-10K tokens
