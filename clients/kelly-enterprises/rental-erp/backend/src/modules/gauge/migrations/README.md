# Gauge Module Database Migrations

This directory contains SQL migration scripts for the gauge module database schema changes.

## Migration Files

| File | Description | Status | Date |
|------|-------------|--------|------|
| `001_schema_and_fks.sql` | Initial schema and foreign keys | ✅ Applied | 2025-10-23 |
| `002_views.sql` | Database views | ✅ Applied | 2025-10-23 |
| `003_phase1_fixes.sql` | Phase 1 fixes | ✅ Applied | 2025-10-23 |
| `004_cleanup_duplicate_tables.sql` | Cleanup duplicate companion_history table | ✅ Applied | 2025-10-25 |
| `005_cascade_operations_schema.sql` | **Cascade operations & calibration workflow** | ⏳ **PENDING** | 2025-10-25 |

---

## Migration 005: Cascade Operations & Calibration Workflow

**Status**: ⏳ READY FOR APPLICATION
**ADDENDUM Reference**: Lines 1658-1863

### What This Migration Does

1. **Adds 3 New Status Values** to `gauges.status` enum:
   - `out_for_calibration` - Gauge sent to calibration (Step 3 of workflow)
   - `pending_certificate` - Gauge returned, awaiting certificate upload (Step 4)
   - `returned` - Customer gauge returned (Admin/QC only)

2. **Adds Customer Ownership Support**:
   - `customer_id` INT NULL column with foreign key to `customers` table
   - Index for customer gauge queries

3. **Adds Certificate History Tracking**:
   - `is_current` BOOLEAN - Whether this is the current/active certificate
   - `superseded_at` TIMESTAMP - When this certificate was superseded
   - `superseded_by` INT - ID of certificate that superseded this one

4. **Creates Calibration Batch Tables**:
   - `calibration_batches` - Tracks calibration batches sent to labs
   - `calibration_batch_gauges` - Junction table linking gauges to batches

### Prerequisites

**Database Requirements**:
- ✅ Migrations 001-004 must be applied first
- ✅ `customers` table must exist with `id` column
- ✅ `core_users` table must exist with `id` column

**Code Dependencies**:
- **Required for**: Cascade operations implementation (ADDENDUM lines 641-1002)
- **Enables**: GaugeSetService cascade methods, calibration workflow, customer ownership

### How to Apply Migration 005

#### Option 1: Direct MySQL Application (Recommended)

```bash
# From project root
mysql -h host.docker.internal -P 3307 -u root -p fai_db_sandbox < backend/src/modules/gauge/migrations/005_cascade_operations_schema.sql
```

#### Option 2: MySQL Workbench

1. Open MySQL Workbench
2. Connect to `localhost:3307`
3. Select database: `fai_db_sandbox`
4. File → Open SQL Script → Select `005_cascade_operations_schema.sql`
5. Execute script (Lightning bolt icon)

#### Option 3: Command Line with Password

```bash
mysql -h host.docker.internal -P 3307 -u root -p"YOUR_PASSWORD" fai_db_sandbox < backend/src/modules/gauge/migrations/005_cascade_operations_schema.sql
```

### Verification

After applying the migration, verify success:

```sql
-- 1. Verify status enum includes new values
SELECT COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME = 'gauges'
AND COLUMN_NAME = 'status';
-- Should include: 'out_for_calibration', 'pending_certificate', 'returned'

-- 2. Verify customer_id column exists
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME = 'gauges'
AND COLUMN_NAME = 'customer_id';
-- Should return: customer_id | int | YES

-- 3. Verify certificate columns exist
SELECT COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME = 'certificates'
AND COLUMN_NAME IN ('is_current', 'superseded_at', 'superseded_by');
-- Should return 3 rows

-- 4. Verify calibration tables exist
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME IN ('calibration_batches', 'calibration_batch_gauges');
-- Should return 2 rows
```

### Rollback

If you need to rollback this migration, see the ROLLBACK section at the bottom of `005_cascade_operations_schema.sql`.

**⚠️ WARNING**: Rollback will:
- Remove all data in `calibration_batches` and `calibration_batch_gauges` tables
- Remove `customer_id` column and associated data
- Remove certificate tracking columns and data
- Revert status enum to pre-migration values (gauges with new statuses will fail)

### Impact

**Database Changes**:
- `gauges` table: 1 new column, 3 new status values
- `certificates` table: 3 new columns, 1 new foreign key
- `calibration_batches` table: NEW table
- `calibration_batch_gauges` table: NEW table

**Service Layer Enablement**:
- ✅ Enables cascade operations (OOS, Return to Service, Location Change, Checkout, Deletion)
- ✅ Enables calibration workflow (7-step process)
- ✅ Enables customer-owned gauge tracking
- ✅ Enables certificate versioning and history

**Feature Availability After Migration**:
- Cascade Operations: Service layer can be implemented
- Calibration Workflow: Database ready for Step 1-7 implementation
- Customer Ownership: Return workflow can be implemented

### What's Next

After applying migration 005:

1. **Implement Cascade Operations** in `GaugeSetService`:
   - Out of Service cascade
   - Return to Service cascade
   - Location Change cascade
   - Checkout Enforcement
   - Deletion/Retirement (orphan companion)

2. **Implement Calibration Workflow**:
   - Batch creation and management
   - Status transitions (out_for_calibration, pending_certificate)
   - Certificate upload and verification

3. **Implement Customer Ownership Workflow**:
   - Customer gauge return workflow
   - Customer gauge pairing validation

---

## Migration Best Practices

### Before Applying

1. **Backup the database**:
   ```bash
   mysqldump -h host.docker.internal -P 3307 -u root -p fai_db_sandbox > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Verify prerequisites**:
   - Check that all previous migrations have been applied
   - Check that required tables exist
   - Check database user has ALTER TABLE privileges

3. **Test in development first**:
   - Never apply directly to production without testing
   - Verify with the verification queries
   - Test rollback procedure

### During Application

1. **Monitor for errors**:
   - Watch for constraint violations
   - Watch for datatype mismatches
   - Watch for duplicate key errors

2. **Record migration**:
   - Update this README with application date
   - Document any issues encountered
   - Record who applied the migration

### After Application

1. **Verify success**:
   - Run all verification queries
   - Check for expected tables and columns
   - Test basic operations (insert, update, delete)

2. **Update status**:
   - Mark migration as "✅ Applied" in the table above
   - Update ADDENDUM completion tracker
   - Notify team members

---

## Troubleshooting

### Error: "Can't connect to MySQL server"

**Solution**: Check that MySQL is running and accessible:
```bash
mysql -h host.docker.internal -P 3307 -u root -p -e "SELECT 1;"
```

### Error: "Table 'customers' doesn't exist"

**Solution**: The `customers` table must exist before applying migration 005. Check if it exists:
```sql
SHOW TABLES LIKE 'customers';
```

If missing, you may need to apply additional migrations or create the table.

### Error: "Foreign key constraint fails"

**Solution**: Ensure no orphaned data exists before applying foreign keys:
```sql
-- Check for gauges with invalid customer_id values
SELECT id, customer_id
FROM gauges
WHERE customer_id IS NOT NULL
AND customer_id NOT IN (SELECT id FROM customers);
```

### Error: "Duplicate column name"

**Solution**: The migration has already been partially applied. Check which columns exist:
```sql
SELECT COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME IN ('gauges', 'certificates')
AND COLUMN_NAME IN ('customer_id', 'is_current', 'superseded_at', 'superseded_by');
```

Then manually apply only the missing parts of the migration.

---

## Contact

For questions or issues with migrations:
- **Documentation**: `/erp-core-docs/gauge-standardization/Plan/ADDENDUM_CASCADE_AND_RELATIONSHIP_OPS.md`
- **Tracking**: `/backend/docs/ADDENDUM_COMPLETION_TRACKER.md`
- **Session Summary**: `/erp-core-docs/gauge-standardization/Plan/SESSION_SUMMARY_2025-10-25.md`

---

**Last Updated**: 2025-10-25
**Maintained By**: Gauge Module Development Team
