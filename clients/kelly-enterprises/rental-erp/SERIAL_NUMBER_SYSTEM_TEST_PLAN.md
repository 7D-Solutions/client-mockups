# Serial Number System - Test Plan & Verification

**Date**: 2025-10-28
**System**: Thread Gauge Serial Number Identification
**Status**: Ready for Testing

---

## Overview

This document outlines the testing and verification process for the new serial number identification system for thread gauges.

### System Changes

**Before**:
- All thread gauges had `gauge_id` (e.g., SP0001A, SP0001B)
- Spare/unpaired gauges were identified by gauge_id
- Sets shared the same base ID with A/B suffix

**After**:
- Spare thread gauges have `gauge_id = NULL`
- Spares are identified by `serial_number` (REQUIRED)
- When paired into sets, both get `gauge_id = SP####` (shared)
- Serial numbers are preserved throughout lifecycle

---

## Pre-Migration Checklist

### 1. Database Backup
```bash
# Backup current database
mysqldump -h localhost -P 3307 -u [user] -p fai_db_sandbox > backup_pre_serial_system_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Verify Test Data Status
```sql
-- Check current thread gauge count
SELECT COUNT(*) as thread_gauge_count
FROM gauges
WHERE equipment_type = 'thread_gauge';

-- Verify all data is test data (user confirmed this is acceptable to delete)
SELECT id, gauge_id, serial_number, name
FROM gauges
WHERE equipment_type = 'thread_gauge'
LIMIT 10;
```

### 3. Stop Application Services
```bash
cd "/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox"
docker-compose -f docker-compose.dev.yml down
```

---

## Migration Execution

### Step 1: Run Migration Script

```bash
# Connect to MySQL
mysql -h localhost -P 3307 -u [user] -p fai_db_sandbox

# Run migration
source /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend/src/modules/gauge/migrations/007_thread_gauge_serial_number_system.sql
```

### Step 2: Verify Migration Success

```sql
-- 1. Verify gauge_id is nullable
DESCRIBE gauges;
-- Look for: gauge_id VARCHAR(50) DEFAULT NULL

-- 2. Verify CHECK constraint exists
SHOW CREATE TABLE gauges;
-- Look for: chk_thread_serial_required

-- 3. Verify index was created
SHOW INDEX FROM gauges WHERE Key_name = 'idx_spare_thread_gauges';

-- 4. Verify no thread gauges exist (should be 0 after DELETE)
SELECT COUNT(*) FROM gauges WHERE equipment_type = 'thread_gauge';
-- Expected: 0

-- 5. Verify validation query returns 0
SELECT COUNT(*) as invalid_count
FROM gauges
WHERE equipment_type = 'thread_gauge'
  AND (serial_number IS NULL OR serial_number = '');
-- Expected: 0
```

### Step 3: Restart Application

```bash
# Restart services
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker ps

# Check logs for any errors
docker logs fireproof-erp-modular-backend-dev -f
docker logs fireproof-erp-modular-frontend-dev -f
```

---

## Functional Testing

### Test Case 1: Create Spare Thread Gauge

**Objective**: Verify thread gauges are created as spares with NULL gauge_id

**Steps**:
1. Navigate to Add Gauge Wizard
2. Select "Thread Gauge" category
3. Fill in required fields:
   - Thread Size: 1/4-20
   - Thread Class: 2A
   - Gauge Type: Plug
   - **Serial Number**: ABC123 (REQUIRED)
   - Create Option: GO
4. Submit form

**Expected Results**:
- ✅ Gauge created successfully
- ✅ Database: `gauge_id IS NULL`
- ✅ Database: `serial_number = 'ABC123'`
- ✅ UI displays: "S/N ABC123"

**Database Verification**:
```sql
SELECT id, system_gauge_id, gauge_id, serial_number, name
FROM gauges
WHERE serial_number = 'ABC123';
```

---

### Test Case 2: Serial Number Required Validation

**Objective**: Verify serial_number is required for thread gauges

**Steps**:
1. Navigate to Add Gauge Wizard
2. Select "Thread Gauge" category
3. Fill in fields WITHOUT serial number
4. Attempt to submit

**Expected Results**:
- ✅ Form validation prevents submission
- ✅ Error message: "Serial number is required for thread gauges"

---

### Test Case 3: View Spare Thread Gauges List

**Objective**: Verify spare thread gauges display correctly

**Prerequisites**: Create 2 spare thread gauges with different specs

**Steps**:
1. Navigate to Gauge List
2. Filter by Thread Gauge category

**Expected Results**:
- ✅ Both spares appear in list
- ✅ Display shows: "S/N {serial_number}"
- ✅ No gauge_id displayed for spares

---

### Test Case 4: Pair Spare Thread Gauges

**Objective**: Verify pairing creates set with SP#### ID

**Prerequisites**:
- Create spare GO gauge: S/N GO-001
- Create spare NO GO gauge: S/N NOGO-001
- Both same thread size, class, type

**Steps**:
1. Open SparePairingInterface component (or implement in UI)
2. Filter to find matching spares
3. Select GO gauge: S/N GO-001
4. Select NO GO gauge: S/N NOGO-001
5. Set storage location: SHELF-A1
6. Click "Pair Gauges"

**Expected Results**:
- ✅ Success message: "Set SP#### created successfully"
- ✅ Database: Both gauges now have `gauge_id = 'SP####'` (same ID)
- ✅ Database: GO gauge has `gauge_suffix = 'A'`
- ✅ Database: NO GO gauge has `gauge_suffix = 'B'`
- ✅ Database: `companion_gauge_id` set on both
- ✅ Database: Serial numbers preserved
- ✅ UI: Set appears in list with SP#### identifier

**Database Verification**:
```sql
SELECT gauge_id, gauge_suffix, serial_number, companion_gauge_id
FROM gauges
WHERE serial_number IN ('GO-001', 'NOGO-001');
```

**API Test**:
```bash
curl -X POST http://localhost:8000/api/gauges-v2/pair-spares-by-serial \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "go_serial_number": "GO-001",
    "nogo_serial_number": "NOGO-001",
    "storage_location": "SHELF-A1"
  }'
```

---

### Test Case 5: View Set Details

**Objective**: Verify set details show serial numbers for members

**Prerequisites**: Paired set from Test Case 4

**Steps**:
1. Navigate to Set Details page for SP####
2. View "Gauge Members" section

**Expected Results**:
- ✅ GO Gauge (A): S/N GO-001
- ✅ NO GO Gauge (B): S/N NOGO-001
- ✅ Links to individual gauge detail pages work

---

### Test Case 6: Unpair Gauge Set

**Objective**: Verify unpairing returns gauges to spare state

**Prerequisites**: Paired set from Test Case 4

**Steps**:
1. Navigate to Set Details page
2. Click "Unpair Set" button
3. Confirm action

**Expected Results**:
- ✅ Success message
- ✅ Database: Both gauges now have `gauge_id = NULL`
- ✅ Database: `gauge_suffix = NULL`
- ✅ Database: `companion_gauge_id = NULL`
- ✅ Database: Serial numbers preserved
- ✅ UI: Both gauges appear as individual spares
- ✅ UI: Display shows "S/N {serial_number}" for both

**Database Verification**:
```sql
SELECT gauge_id, gauge_suffix, serial_number, companion_gauge_id
FROM gauges
WHERE serial_number IN ('GO-001', 'NOGO-001');
-- Expected: gauge_id = NULL for both
```

**API Test**:
```bash
curl -X POST http://localhost:8000/api/gauges-v2/unpair-set/SP0001 \
  -H "Authorization: Bearer {token}"
```

---

### Test Case 7: Replace Gauge in Set

**Objective**: Verify replacing a gauge in a set

**Prerequisites**:
- Paired set: SP0002 with GO-002 and NOGO-002
- Spare gauge: GO-003 (compatible)

**Steps**:
1. Navigate to Set Details for SP0002
2. Click "Replace Gauge" button
3. Select gauge to replace: GO Gauge (A)
4. Enter new gauge serial: GO-003
5. Confirm replacement

**Expected Results**:
- ✅ Success message
- ✅ Database: GO-002 now has `gauge_id = NULL` (returned to spare)
- ✅ Database: GO-003 now has `gauge_id = 'SP0002'`, `gauge_suffix = 'A'`
- ✅ Database: NOGO-002 unchanged (still in set)
- ✅ UI: Set shows GO-003 as new member

**Database Verification**:
```sql
-- Old gauge should be spare
SELECT gauge_id, gauge_suffix, serial_number
FROM gauges
WHERE serial_number = 'GO-002';
-- Expected: gauge_id = NULL

-- New gauge should be in set
SELECT gauge_id, gauge_suffix, serial_number, companion_gauge_id
FROM gauges
WHERE serial_number = 'GO-003';
-- Expected: gauge_id = 'SP0002', gauge_suffix = 'A'
```

**API Test**:
```bash
curl -X POST http://localhost:8000/api/gauges-v2/replace-in-set/SP0002 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "old_serial_number": "GO-002",
    "new_serial_number": "GO-003"
  }'
```

---

### Test Case 8: Get Spare Thread Gauges with Filters

**Objective**: Verify filtering of spare thread gauges

**Prerequisites**: Multiple spare gauges with different specs

**Steps**:
1. Call API with filters

**API Test**:
```bash
# Get all spares
curl http://localhost:8000/api/gauges-v2/spare-thread-gauges \
  -H "Authorization: Bearer {token}"

# Filter by thread size
curl "http://localhost:8000/api/gauges-v2/spare-thread-gauges?thread_size=1/4-20" \
  -H "Authorization: Bearer {token}"

# Filter by multiple criteria
curl "http://localhost:8000/api/gauges-v2/spare-thread-gauges?thread_size=1/4-20&thread_class=2A&gauge_type=plug" \
  -H "Authorization: Bearer {token}"
```

**Expected Results**:
- ✅ Returns only spares (gauge_id IS NULL)
- ✅ Filters work correctly
- ✅ Results show serial_number field

---

### Test Case 9: Non-Thread Gauge Creation

**Objective**: Verify non-thread gauges still work normally

**Steps**:
1. Create Hand Tool gauge
2. Verify gauge_id is assigned immediately

**Expected Results**:
- ✅ gauge_id is NOT NULL
- ✅ Serial number is optional
- ✅ System works as before

---

## Edge Cases & Error Handling

### Edge Case 1: Duplicate Serial Numbers
**Test**: Attempt to create two thread gauges with same serial number
**Expected**: Database UNIQUE constraint prevents duplicate (if exists)

### Edge Case 2: Pair Already Paired Gauge
**Test**: Attempt to pair a gauge that has gauge_id != NULL
**Expected**: Error: "Both gauges must be unpaired spares"

### Edge Case 3: Unpair Non-Existent Set
**Test**: Call unpair with invalid set ID
**Expected**: Error: "Set not found" or similar

### Edge Case 4: Replace with Non-Spare
**Test**: Attempt to replace with a gauge that's already in a set
**Expected**: Error: "Gauge must be an unpaired spare"

### Edge Case 5: Missing Serial Number in Database
**Test**: Verify CHECK constraint prevents NULL serial_number for thread gauges
**Expected**: Database rejects INSERT/UPDATE

---

## Performance Testing

### Test 1: Large Spare List Performance
**Scenario**: Load spare thread gauges list with 100+ items
**Metric**: Page load time should be < 2 seconds
**Index**: Verify `idx_spare_thread_gauges` is used

```sql
EXPLAIN SELECT * FROM gauges
WHERE equipment_type = 'thread_gauge' AND gauge_id IS NULL;
-- Should show index usage
```

### Test 2: Serial Number Lookup Performance
**Scenario**: Find gauge by serial number
**Metric**: Query time should be < 100ms
**Index**: Verify index usage

```sql
EXPLAIN SELECT * FROM gauges WHERE serial_number = 'ABC123';
-- Should use index on serial_number
```

---

## Rollback Plan

If critical issues are found, rollback using:

```sql
-- Drop new index
DROP INDEX idx_spare_thread_gauges ON gauges;

-- Remove CHECK constraint
ALTER TABLE gauges DROP CONSTRAINT chk_thread_serial_required;

-- Make gauge_id NOT NULL again
ALTER TABLE gauges MODIFY COLUMN gauge_id VARCHAR(50) NOT NULL UNIQUE;

-- Restore backup
-- mysql -h localhost -P 3307 -u [user] -p fai_db_sandbox < backup_file.sql
```

---

## Sign-Off Checklist

- [ ] Migration executed successfully
- [ ] All database constraints verified
- [ ] Application starts without errors
- [ ] Test Case 1: Create spare thread gauge ✅
- [ ] Test Case 2: Serial number validation ✅
- [ ] Test Case 3: View spare list ✅
- [ ] Test Case 4: Pair spares ✅
- [ ] Test Case 5: View set details ✅
- [ ] Test Case 6: Unpair set ✅
- [ ] Test Case 7: Replace gauge ✅
- [ ] Test Case 8: Filter spares ✅
- [ ] Test Case 9: Non-thread gauges work ✅
- [ ] All edge cases handled correctly
- [ ] Performance acceptable
- [ ] No console errors in browser
- [ ] No backend errors in logs

---

## Notes

- All test data will be cleared by migration (user confirmed acceptable)
- Serial numbers must be unique and meaningful for warehouse operations
- System maintains backward compatibility for non-thread gauge types
- Display logic correctly shows "S/N {serial}" for spares and "SP####" for sets

---

## Contact

For issues or questions, refer to:
- Implementation files in `/backend/src/modules/gauge/` and `/frontend/src/modules/gauge/`
- Migration file: `007_thread_gauge_serial_number_system.sql`
- This test plan document
