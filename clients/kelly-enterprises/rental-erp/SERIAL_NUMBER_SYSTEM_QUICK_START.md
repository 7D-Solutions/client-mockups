# Serial Number System - Quick Start Guide

**Status**: ✅ READY TO EXECUTE
**Date**: 2025-10-28

---

## 🚀 Execute in 5 Minutes

### Step 1: Backup Database (1 minute)
```bash
cd "/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox"
mysqldump -h localhost -P 3307 -u root -p fai_db_sandbox > backup_pre_serial_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Migration (2 minutes)
```bash
# Connect to MySQL
mysql -h localhost -P 3307 -u root -p fai_db_sandbox

# Run migration
source /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend/src/modules/gauge/migrations/007_thread_gauge_serial_number_system.sql

# Verify success
DESCRIBE gauges;  -- Check gauge_id is nullable
SHOW INDEX FROM gauges WHERE Key_name = 'idx_spare_thread_gauges';  -- Verify index
SELECT COUNT(*) FROM gauges WHERE equipment_type = 'thread_gauge';  -- Should be 0

# Exit MySQL
exit;
```

### Step 3: Restart Services (2 minutes)
```bash
cd "/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox"

# Restart backend and frontend
docker-compose -f docker-compose.dev.yml restart backend frontend

# Verify services are running
docker ps

# Check for errors
docker logs fireproof-erp-modular-backend-dev --tail 50
docker logs fireproof-erp-modular-frontend-dev --tail 50
```

---

## 🧪 Quick Smoke Test (5 minutes)

### Test 1: Create Spare Thread Gauge
1. Open browser: http://localhost:3001
2. Navigate to Add Gauge Wizard
3. Create thread gauge:
   - Thread Size: `1/4-20`
   - Thread Class: `2A`
   - Gauge Type: `plug`
   - **Serial Number**: `TEST-001` ⭐ REQUIRED
   - Create Option: `GO`
4. Submit

**✅ Success if**:
- No errors
- Gauge appears in list as "S/N TEST-001"

### Test 2: Verify Database
```sql
mysql -h localhost -P 3307 -u root -p fai_db_sandbox

SELECT gauge_id, serial_number, name
FROM gauges
WHERE serial_number = 'TEST-001';

-- Expected: gauge_id = NULL, serial_number = 'TEST-001'
```

### Test 3: API Test (Optional)
```bash
# Get spare thread gauges
curl http://localhost:8000/api/gauges-v2/spare-thread-gauges \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Returns list with TEST-001
```

---

## 📊 What Changed

### Before
```
Thread Gauge (Spare):
  gauge_id: SP0001A
  serial_number: (optional)
  Display: "SP0001A"
```

### After
```
Thread Gauge (Spare):
  gauge_id: NULL ⭐
  serial_number: TEST-001 (REQUIRED) ⭐
  Display: "S/N TEST-001" ⭐

Thread Gauge (Paired Set):
  gauge_id: SP0001
  serial_number: TEST-001 (preserved)
  Display: "SP0001" (set), "S/N TEST-001" (member)
```

---

## 🔧 API Endpoints Added

### 1. Get Spare Thread Gauges
```bash
GET /api/gauges-v2/spare-thread-gauges?thread_size=1/4-20&thread_class=2A
```

### 2. Pair Spares into Set
```bash
POST /api/gauges-v2/pair-spares-by-serial
{
  "go_serial_number": "TEST-001",
  "nogo_serial_number": "TEST-002",
  "storage_location": "SHELF-A1"
}
```

### 3. Unpair Set
```bash
POST /api/gauges-v2/unpair-set/SP0001
```

### 4. Replace Gauge in Set
```bash
POST /api/gauges-v2/replace-in-set/SP0001
{
  "old_serial_number": "TEST-001",
  "new_serial_number": "TEST-003"
}
```

---

## 🎯 Key Features

### ✅ Serial Number Required
- All thread gauges MUST have a serial number
- Database enforces this with CHECK constraint
- Form validation prevents submission without serial

### ✅ Spare Identification
- Spares have `gauge_id = NULL`
- Identified by serial number only
- Display shows: "S/N {serial_number}"

### ✅ Set Pairing
- Pair two spares → both get same `gauge_id = SP####`
- GO gauge gets suffix 'A', NO GO gets 'B'
- Serial numbers are preserved

### ✅ UI Components Updated
- GaugeDetail shows correct identifier
- GaugeRow displays "S/N {serial}" for spares
- SetDetail shows serial numbers for members
- ThreadGaugeForm requires serial number
- SparePairingInterface for easy pairing

---

## 📝 Files Modified

**Backend** (6 files):
1. `007_thread_gauge_serial_number_system.sql` - Migration
2. `GaugeRepository.js` - findBySerialNumber, findSpareThreadGauges
3. `GaugeCreationService.js` - Validation, NULL gauge_id
4. `GaugeSetService.js` - pairSpares, unpairSetBySetId, replaceGaugeInSet
5. `GaugeIdService.js` - generateSetId
6. `gauges-v2.js` - 4 new API routes

**Frontend** (7 files):
1. `types/index.ts` - Nullable gauge_id, display helpers
2. `gaugeService.ts` - 4 new service methods
3. `GaugeDetail.tsx` - Use display helper
4. `GaugeRow.tsx` - Use display helper
5. `SetDetail.tsx` - Show serial numbers
6. `ThreadGaugeForm.tsx` - Require serial number
7. `SparePairingInterface.tsx` - NEW component

---

## ⚠️ Important Notes

1. **All thread gauge test data will be deleted** by migration
   - User confirmed this is acceptable
   - Migration runs: `DELETE FROM gauges WHERE equipment_type = 'thread_gauge'`

2. **Non-thread gauges are unchanged**
   - Hand tools, large equipment, calibration standards work as before
   - Only thread gauges use the new serial number system

3. **Serial numbers must be unique and meaningful**
   - Used for warehouse identification
   - Should match physical gauge markings

4. **Breaking changes are intentional**
   - This is a complete redesign, not a patch
   - Old thread gauge pairing methods still exist for compatibility

---

## 🆘 Troubleshooting

### Migration Fails
```bash
# Rollback
mysql -h localhost -P 3307 -u root -p fai_db_sandbox < backup_file.sql
```

### Services Won't Start
```bash
# Check logs
docker logs fireproof-erp-modular-backend-dev
docker logs fireproof-erp-modular-frontend-dev

# Full restart
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

### Frontend Errors
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# Rebuild frontend
docker-compose -f docker-compose.dev.yml restart frontend
```

### Database Constraint Errors
```sql
-- Check if constraint exists
SHOW CREATE TABLE gauges;

-- Verify no thread gauges without serial numbers
SELECT COUNT(*) FROM gauges
WHERE equipment_type = 'thread_gauge'
  AND (serial_number IS NULL OR serial_number = '');
-- Should be 0
```

---

## 📚 Full Documentation

- **Test Plan**: `/SERIAL_NUMBER_SYSTEM_TEST_PLAN.md`
- **Audit Report**: See conversation history
- **Migration File**: `/backend/src/modules/gauge/migrations/007_thread_gauge_serial_number_system.sql`

---

## ✅ Ready to Execute?

1. ✅ All files saved
2. ✅ Migration script ready
3. ✅ Test plan documented
4. ✅ Backup command ready
5. ✅ Rollback plan available

**Execute when ready!** 🚀
