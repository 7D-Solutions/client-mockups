# Gauge Test Data Cleanup Instructions

**Purpose**: Remove all gauge test data from the database while preserving user accounts and core infrastructure, preparing for real CSV data migration.

**Kingdom Purpose**: "Whatever you do, work heartily, as for the Lord and not for men." - Colossians 3:23

---

## ⚠️ CRITICAL: Safety First

This cleanup will **permanently delete** all gauge-related test data. Follow these steps carefully.

---

## Pre-Requisites

1. **Database Access**: Ensure `.env` file has correct credentials
2. **Node.js**: Version 16+ installed
3. **Dependencies**: `mysql2` package installed

---

## Step-by-Step Execution

### Step 1: Backup Current Data (REQUIRED)

**Always backup before cleanup!**

```bash
# Navigate to backend directory
cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend

# Run backup script
node scripts/backup-before-cleanup.js
```

**Expected Output:**
```
═══════════════════════════════════════════════════════
  PRE-CLEANUP DATABASE BACKUP
  Kingdom Purpose: Wisdom Through Preparation
═══════════════════════════════════════════════════════

🔌 Connecting to database...
✅ Connected to database: fai_db_sandbox

📦 Backing up gauge data:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ gauges                                           XX rows
  ✅ gauge_calibrations                               XX rows
  ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TOTAL ROWS BACKED UP: XXX

💾 Writing backup file...
✅ Backup saved to: backend/backups/gauge-data-backup-YYYY-MM-DD.json
📊 Backup file size: X.XX MB

✅ BACKUP COMPLETED SUCCESSFULLY!
```

**Verify:** Check that backup file exists in `backend/backups/` directory

---

### Step 2: Review What Will Be Deleted

The cleanup script will DELETE:
- ✅ All gauge records (`gauges` table)
- ✅ All calibration records (`gauge_calibrations` table)
- ✅ All gauge transactions and history
- ✅ All gauge categories and configurations
- ✅ All gauge-related lookup tables

The cleanup script will PRESERVE:
- ✅ User accounts (`core_users`)
- ✅ Roles and permissions
- ✅ Facilities, buildings, zones
- ✅ Storage locations
- ✅ All core infrastructure tables

---

### Step 3: Run Cleanup Script

```bash
# Still in backend directory
node scripts/cleanup-gauge-test-data.js
```

**Expected Output:**
```
═══════════════════════════════════════════════════════
  GAUGE TEST DATA CLEANUP SCRIPT
  Kingdom Purpose: Integrity and Excellence in Data Management
═══════════════════════════════════════════════════════

🔌 Connecting to database...
✅ Connected to database: fai_db_sandbox

📊 Current Database State:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  gauge_active_checkouts                                0 rows
  gauge_calibration_failures                            0 rows
  ...

✅ User Accounts to Preserve: X

⚠️  WARNING: About to delete all gauge test data!

Will DELETE:
  - All gauge records
  - All calibration records
  - All gauge transactions
  - All gauge-related configuration

Will PRESERVE:
  - X user accounts
  - All roles and permissions
  - All facility/location data
  - All core infrastructure

Starting deletion in 3 seconds... (Ctrl+C to cancel)

🔧 Disabling foreign key checks...
🚀 Starting cleanup transaction...

🗑️  Clearing gauge tables:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ gauge_active_checkouts                             X rows deleted
  ✅ gauges                                             X rows deleted
  ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TOTAL ROWS DELETED: XXX

🔄 Resetting auto-increment counters...
✅ Auto-increment counters reset

💾 Committing transaction...
✅ Transaction committed successfully

🔧 Re-enabling foreign key checks...
✅ Foreign key checks re-enabled

🔍 Verifying cleanup:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ All gauge tables are empty

🔍 Verifying preserved data:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Users:            X
  ✅ Facilities:       X
  ✅ Storage Locations: X

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CLEANUP COMPLETED SUCCESSFULLY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  - XXX gauge-related rows deleted
  - X user accounts preserved
  - Database ready for real gauge data migration

Next Steps:
  1. Run migration script to import CSV data
  2. Verify imported data
  3. Set up calibration schedules
```

---

### Step 4: Verify Cleanup Success

**Database Verification:**
```bash
# Connect to MySQL
mysql -h localhost -P 3307 -u your_user -p fai_db_sandbox

# Check gauge tables are empty
SELECT COUNT(*) FROM gauges;
SELECT COUNT(*) FROM gauge_calibrations;

# Check users are preserved
SELECT COUNT(*) FROM core_users;
SELECT id, name, email FROM core_users;

# Exit MySQL
exit;
```

**Expected Results:**
- `gauges`: 0 rows
- `gauge_calibrations`: 0 rows
- `core_users`: Should show all your user accounts

---

## Troubleshooting

### Error: "Cannot delete or update a parent row"
**Cause**: Foreign key constraint issue
**Solution**: Script handles this with `SET FOREIGN_KEY_CHECKS = 0`, but if it fails, check database permissions

### Error: "Access denied"
**Cause**: Database user lacks DELETE permissions
**Solution**: Grant permissions or use admin user

### Script hangs during deletion
**Cause**: Large dataset or table locks
**Solution**:
1. Stop script (Ctrl+C)
2. Check for active connections: `SHOW PROCESSLIST;`
3. Retry during low-usage period

---

## Rollback (If Needed)

If something goes wrong, you can restore from backup:

```bash
# Create restore script (to be implemented)
node scripts/restore-gauge-backup.js backend/backups/gauge-data-backup-YYYY-MM-DD.json
```

---

## Post-Cleanup Checklist

- [ ] Cleanup completed successfully
- [ ] All gauge tables show 0 rows
- [ ] User accounts preserved and verified
- [ ] Backup file saved and verified
- [ ] Ready for CSV migration

---

## Next Steps After Cleanup

1. **Schema Enhancements**: Add missing fields for CSV data
2. **User Mapping**: Map CSV usernames to database user IDs
3. **Location Setup**: Create storage locations from CSV
4. **CSV Migration**: Import 409 gauges from CSV file
5. **Data Validation**: Verify imported data integrity
6. **Calibration Setup**: Configure calibration schedules

---

## Support

If you encounter issues:
1. Check backup file exists
2. Verify database connection settings in `.env`
3. Review script output for specific error messages
4. Database state is protected by transaction rollback on error

---

**Kingdom Reminder**: "The plans of the diligent lead surely to abundance, but everyone who is hasty comes only to poverty." - Proverbs 21:5

Work with diligence and care. Test thoroughly. Trust in the Lord's guidance.
