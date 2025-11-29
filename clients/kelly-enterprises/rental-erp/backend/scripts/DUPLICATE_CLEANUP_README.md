# Duplicate Gauge Cleanup Guide

## Problem

The seed script ran multiple times without tracking, creating duplicate gauges in the database.

## Solution: 3-Step Process

### Step 1: Find Duplicates (Analyze)

```bash
node backend/scripts/find-duplicate-gauges.js
```

**What it does:**
- Identifies duplicate `gauge_id` entries
- Identifies duplicate set members (same `set_id` + `go_nogo`)
- Shows how many duplicates exist
- **Does NOT modify data** - safe to run anytime

**Expected Output:**
```
📊 Duplicate Gauge IDs: 45
📊 Duplicate Set Members: 12
📈 Summary:
  Total gauges that need deletion: 102
  Current total gauges in DB: 450
  After cleanup: 348
```

---

### Step 2: Preview Deletion (Dry Run)

```bash
node backend/scripts/remove-duplicate-gauges.js --dry-run
```

**What it does:**
- Shows EXACTLY which records will be deleted
- Keeps the **oldest entry** (lowest ID) for each duplicate
- **Does NOT modify data** - preview only

**Expected Output:**
```
🔍 DRY RUN MODE - No changes will be made

  gauge_id: TG-001
    Keeping ID: 123 (oldest)
    Deleting IDs: 456, 789
    💡 Would delete 2 duplicate(s)

💡 DRY RUN COMPLETE
   Would delete 102 duplicate gauges
```

---

### Step 3: Actually Delete Duplicates

```bash
node backend/scripts/remove-duplicate-gauges.js
```

**What it does:**
- **PERMANENTLY DELETES** duplicate records
- Keeps the oldest entry (first created)
- Cannot be undone

**⚠️ BACKUP FIRST:**
```bash
# Create backup before deletion
mysqldump -h localhost -P 3307 -u root -p fai_db_sandbox > backup_before_cleanup_$(date +%Y%m%d_%H%M%S).sql
```

**Expected Output:**
```
⚠️  DELETION MODE - Duplicates will be permanently removed

  gauge_id: TG-001
    Keeping ID: 123 (oldest)
    Deleting IDs: 456, 789
    ✅ Deleted 2 duplicate(s)

✅ CLEANUP COMPLETE
   Deleted 102 duplicate gauges
   Current gauge count: 348
```

---

## Step 4: Prevent Future Duplicates

### Create Migration Tracking System

```bash
node backend/scripts/create-migration-tracking.js
```

**What it does:**
- Creates `schema_migrations` table
- Tracks which seeds/migrations have been applied
- Prevents duplicate execution

---

### Update Future Seed Scripts

Use the `MigrationHelper` to make seeds idempotent:

```javascript
const MigrationHelper = require('./migration-helper');

async function seedThreadGauges() {
  const connection = await mysql.createConnection(dbConfig);
  const migrationHelper = new MigrationHelper(connection);

  // Ensure tracking table exists
  await migrationHelper.ensureMigrationTable();

  // Run seed only if not already applied
  await migrationHelper.runOnce('seed-thread-gauges-v1', async (conn) => {
    // Your seed logic here
    console.log('Creating 150 thread gauges...');
    // ... seed code ...
    return { created: 150 };
  });

  await connection.end();
}

seedThreadGauges();
```

**Benefits:**
- ✅ Script can be run multiple times safely
- ✅ Automatically skips if already applied
- ✅ Clear logging of what was done
- ✅ Tracks who and when it was applied

---

## Quick Reference

```bash
# 1. Analyze (safe)
node backend/scripts/find-duplicate-gauges.js

# 2. Preview (safe)
node backend/scripts/remove-duplicate-gauges.js --dry-run

# 3. Backup (required before deletion)
mysqldump -h localhost -P 3307 -u root -p fai_db_sandbox > backup.sql

# 4. Delete duplicates (destructive)
node backend/scripts/remove-duplicate-gauges.js

# 5. Prevent future duplicates
node backend/scripts/create-migration-tracking.js
```

---

## Recovery from Backup

If something goes wrong:

```bash
# Restore from backup
mysql -h localhost -P 3307 -u root -p fai_db_sandbox < backup.sql
```

---

## How Duplicates Are Identified

**Duplicate `gauge_id`:**
- Multiple records with the same `gauge_id`
- **Keep:** Oldest entry (lowest `id`)
- **Delete:** Newer duplicates

**Duplicate Set Members:**
- Multiple records with same `set_id` AND `go_nogo` combination
- **Keep:** Oldest entry (lowest `id`)
- **Delete:** Newer duplicates

**Example:**
```
gauge_id: TG-001
  id: 123 (created first)  ← KEEP
  id: 456 (created second) ← DELETE
  id: 789 (created third)  ← DELETE
```

---

## Verification After Cleanup

```bash
# Run analysis again to confirm no duplicates
node backend/scripts/find-duplicate-gauges.js

# Expected output:
# 📊 Duplicate Gauge IDs: 0
# 📊 Duplicate Set Members: 0
```

---

## Prevention Best Practices

1. **Always use migration tracking** for seeds and migrations
2. **Check if data exists** before creating in ad-hoc scripts
3. **Use transactions** for multi-step operations
4. **Test with --dry-run** before destructive operations
5. **Backup before major changes**
