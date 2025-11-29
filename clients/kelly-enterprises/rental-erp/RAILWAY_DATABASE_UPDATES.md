# Railway Database Migration Instructions

**Date**: 2025-11-04
**Merge**: development-core → production-v1
**Commit**: 763e85d7

## Overview

The following database migrations need to be executed on the Railway production database to support the new features in this release.

## Required Migrations (In Order)

### 1. Storage Locations Table
**File**: `backend/src/infrastructure/database/migrations/019-create-storage-locations.sql`

**Purpose**: Creates the configurable storage locations system for gauges and equipment.

**What it does**:
- Creates `storage_locations` table with location codes (A1-L5 format)
- Inserts 60 default storage locations (A1 through L5)
- Supports different location types: bin, shelf, rack, cabinet, drawer, room

**Execution**:
```bash
# Connect to Railway MySQL
railway connect mysql

# Or use the TCP proxy
mysql -h switchback.proxy.rlwy.net -P 43662 -u <user> -p <database>

# Run the migration
source backend/src/infrastructure/database/migrations/019-create-storage-locations.sql
```

### 2. Migrate Gauge Locations
**File**: `migrate-gauge-locations-v2.sql`

**Purpose**: Migrates existing gauge storage locations to the new inventory system.

**What it does**:
- Extracts unique storage locations from existing gauges
- Creates storage location entries for any missing locations
- Populates `inventory_current_locations` table with gauge location data

**Execution**:
```bash
# After connecting to Railway MySQL
source migrate-gauge-locations-v2.sql
```

### 3. Fix Thread Gauge Data
**File**: `fix-thread-gauges.sql`

**Purpose**: Cleans up thread gauge data and standardizes descriptions.

**What it does**:
- Deletes test thread gauges without proper specifications
- Updates thread gauge descriptions to standard format (e.g., ".250-20 UN 2A")
- Shows results and samples of updated gauges

**Execution**:
```bash
# After connecting to Railway MySQL
source fix-thread-gauges.sql
```

## Verification Steps

After running all migrations, verify the results:

```sql
-- 1. Check storage locations were created
SELECT COUNT(*) as total_locations,
       COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_locations
FROM storage_locations;

-- Expected: At least 60 locations

-- 2. Check gauge locations were migrated
SELECT COUNT(*) as migrated_gauges,
       COUNT(DISTINCT current_location) as unique_locations
FROM inventory_current_locations
WHERE item_type = 'gauge';

-- 3. Check thread gauges were cleaned up
SELECT COUNT(*) as thread_gauges,
       COUNT(DISTINCT CONCAT(gts.thread_size, '-', gts.thread_class)) as unique_specs
FROM gauges g
JOIN gauge_thread_specifications gts ON g.id = gts.gauge_id
WHERE g.equipment_type = 'thread_gauge';

-- 4. Sample thread gauge descriptions
SELECT gauge_id, name, equipment_type
FROM gauges
WHERE equipment_type = 'thread_gauge'
LIMIT 10;
```

## Railway Deployment Notes

### Automatic Backend Deployment
Once these database migrations are complete, Railway will automatically deploy the backend from the `production-v1` branch. The backend includes:
- Storage location management API endpoints
- Enhanced gauge creation and management
- Inventory system integration
- Permission management improvements

### Environment Variables
Ensure the following environment variables are set in Railway:
- `DB_HOST` → Railway MySQL internal hostname
- `DB_PORT` → 3306 (internal)
- `DB_NAME` → Database name
- `DB_USER` → Database user
- `DB_PASS` → Database password

### Monitoring
After deployment, monitor:
1. Backend service logs: `railway logs --service Backend`
2. Database connection status
3. API endpoint health: Check `/health` endpoint
4. Frontend integration with new storage location features

## Optional: Review Files

The following files contain additional SQL scripts that may be useful for review but are not required for the migration:

- `backend/check-inventory-permissions.sql` - Check inventory permissions for users
- `backend/grant-inventory-to-john-doe.sql` - Example permission grant script
- `eliminate-legacy-locations.sql` - Script to clean up old location data (use with caution)

## Rollback Plan

If issues occur after deployment:

1. **Revert Git Changes**:
   ```bash
   git checkout production-v1
   git reset --hard 022d51ab
   git push -f origin production-v1
   ```

2. **Rollback Database** (if needed):
   - Storage locations can be deleted: `DROP TABLE storage_locations;`
   - Gauge locations can be cleared: `DELETE FROM inventory_current_locations WHERE item_type = 'gauge';`
   - Thread gauges: Restore from backup if available

3. **Railway Redeploy**: Railway will automatically deploy the reverted version

## Support

For issues or questions:
- Check Railway logs: `railway logs --service Backend --service Frontend`
- Review error logs in Railway dashboard
- Check database connection status
- Verify environment variables are correctly set

---

**Summary**: This release includes significant improvements to storage location management, gauge creation workflows, and inventory tracking. The database migrations are designed to be non-destructive and can be rolled back if needed.
