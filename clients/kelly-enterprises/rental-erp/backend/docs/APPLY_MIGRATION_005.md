# Migration 005 Application Guide

**Status**: ⏳ Ready for Application
**Migration File**: `/backend/src/modules/gauge/migrations/005_cascade_operations_schema.sql`
**Database**: `fai_db_sandbox` on `localhost:3307`

---

## Quick Application

### Method 1: Direct Command Line (Recommended)

```bash
# From project root
mysql -h localhost -P 3307 -u root -p fai_db_sandbox < backend/src/modules/gauge/migrations/005_cascade_operations_schema.sql
```

### Method 2: MySQL Workbench

1. Open MySQL Workbench
2. Connect to `localhost:3307`
3. Select database: `fai_db_sandbox`
4. File → Open SQL Script → `005_cascade_operations_schema.sql`
5. Execute (Lightning bolt icon)

### Method 3: From Docker Container

```bash
# If MySQL is in Docker
docker exec -i mysql_container_name mysql -u root -p fai_db_sandbox < backend/src/modules/gauge/migrations/005_cascade_operations_schema.sql
```

---

## What This Migration Does

1. **Adds 3 New Status Values**:
   - `out_for_calibration` - Gauge sent to calibration
   - `pending_certificate` - Returned, awaiting cert upload
   - `returned` - Customer gauge returned

2. **Adds Customer Ownership**:
   - `customer_id INT NULL` column
   - Foreign key to `customers` table

3. **Adds Certificate Tracking**:
   - `is_current`, `superseded_at`, `superseded_by` columns
   - Certificate history chain

4. **Creates Calibration Tables**:
   - `calibration_batches`
   - `calibration_batch_gauges`

---

## Verification After Application

Run these queries to verify migration succeeded:

```sql
-- 1. Check status enum
SELECT COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME = 'gauges'
AND COLUMN_NAME = 'status';
-- Should show: out_for_calibration, pending_certificate, returned

-- 2. Check customer_id column
SELECT COLUMN_NAME, DATA_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME = 'gauges'
AND COLUMN_NAME = 'customer_id';
-- Should return: customer_id | int

-- 3. Check calibration tables
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME IN ('calibration_batches', 'calibration_batch_gauges');
-- Should return 2 rows
```

---

## After Migration

Once migration is applied successfully:

1. **Cascade operations code is ready** - Already implemented in GaugeSetService
2. **Run tests** - Ensure all 69 tests still pass
3. **Update tracker** - Mark migration as "Applied" in ADDENDUM_COMPLETION_TRACKER.md

---

## Troubleshooting

### Database Not Running
```bash
# Check if MySQL is running
docker ps | grep mysql
# Or
sudo systemctl status mysql
```

### Connection Refused
- Verify port 3307 is correct
- Check firewall settings
- Try `127.0.0.1` instead of `localhost`

### Tables Already Exist
Migration uses `IF NOT EXISTS` - safe to re-run if needed.

---

For full documentation, see `/backend/src/modules/gauge/migrations/README.md`
