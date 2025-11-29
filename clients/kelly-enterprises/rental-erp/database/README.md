# Database Management

This directory contains all database-related files for the Fire-Proof ERP system.

## 📁 Directory Structure

```
database/
├── backups/              # Database backups
│   ├── critical-config/  # Critical configuration table backups
│   └── full-dumps/       # Complete database dumps
├── migrations/           # Database schema migrations
├── seeds/                # Seed data for development/testing
├── scripts/              # Database utility scripts
└── docs/                 # Database documentation
```

## 🔐 Critical Configuration Data

### What Are Critical Config Tables?

These tables contain **essential system configuration** that should NEVER be deleted:

1. **`gauge_categories`** (20 rows)
   - Gauge type categories: Standard, Metric, ACME, NPT, STI, Spiralock
   - Hand tools: Caliper, Micrometer, Depth Gauge, Bore Gauge
   - Large equipment: CMM, Optical Comparator, Height Gauge, etc.
   - Calibration standards: Gauge Block, Master Ring, Master Plug, etc.

2. **`gauge_id_config`** (25 rows)
   - ID generation configuration for each category/type combination
   - Tracks current sequence numbers for gauge ID generation
   - Required for creating new gauges

3. **`rejection_reasons`** (9+ rows)
   - QC rejection reasons used throughout the system
   - Core reasons: Damaged, Lost, Calibration expired, etc.

### Why These Are Critical

**Without these tables:**
- ❌ Cannot create new gauges
- ❌ Cannot generate proper gauge IDs
- ❌ Cannot select categories in gauge creation wizard
- ❌ Cannot perform QC operations
- ❌ System becomes non-functional

## 🛠️ Quick Commands

### Backup Critical Config

**Before any database operation:**
```bash
# From project root
cd backend
npm run backup:config

# Direct execution
docker exec fireproof-erp-modular-backend-dev node /app/scripts/backup-critical-config.js
```

Creates: `database/backups/critical-config/critical-config-YYYY-MM-DD_HH-MM-SS.sql`

### Restore Critical Config

**If data is accidentally deleted:**
```bash
# List available backups
ls -lh database/backups/critical-config/

# Restore from backup
cd backend
npm run restore:config critical-config-2025-11-14_14-40-46.sql

# Or direct execution
docker exec fireproof-erp-modular-backend-dev node /app/scripts/restore-critical-config.js critical-config-2025-11-14_14-40-46.sql
```

### Verify Data

**Check if critical config is present:**
```bash
docker exec fireproof-erp-modular-backend-dev node -e "
  require('dotenv').config();
  const mysql = require('mysql2/promise');
  (async () => {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    const tables = ['gauge_categories', 'gauge_id_config', 'rejection_reasons'];
    console.log('📊 Critical Configuration Status:\n');

    for (const table of tables) {
      const [rows] = await pool.query(\`SELECT COUNT(*) as count FROM \${table}\`);
      const status = rows[0].count > 0 ? '✅' : '❌';
      console.log(\`\${status} \${table.padEnd(25)} \${rows[0].count} rows\`);
    }

    await pool.end();
  })();
"
```

**Expected output:**
```
✅ gauge_categories          20 rows
✅ gauge_id_config           25 rows
✅ rejection_reasons          9 rows
```

## 📋 When to Backup

### Always Backup Before:
- ✅ Clearing test data
- ✅ Running database migrations
- ✅ Making schema changes
- ✅ Importing/exporting data
- ✅ Restoring from old dumps
- ✅ Any operation that touches these tables

### Recommended Schedule:
- **Daily** during active development
- **Before** each deployment
- **After** adding new categories or configuration
- **Before** any major database operation

## 🚨 Emergency Recovery

### If You Have NO Backup:

1. **Check project backups:**
   ```bash
   ls -lh database/backups/critical-config/
   ls -lh erp-core-docs/database\ rebuild/dump/
   ```

2. **Use the emergency dump:**
   ```bash
   # Extract from the master dump
   grep -A 30 "INSERT INTO \`gauge_categories\`" \
     erp-core-docs/database\ rebuild/dump/dump_restorable_v1.1_2025-11-12_13-35-12.sql
   ```

3. **Railway Production Backup:**
   - If local backups are corrupted, export from Railway production database
   - Use: `railway db export`

## 📊 Database Connection Info

**Development (Local):**
- Host: `localhost` (host) or `host.docker.internal` (container)
- Port: `3307`
- Database: `fai_db_sandbox`
- User: See `.env` file

**Production (Railway):**
- Internal: `mysql.railway.internal:3306`
- External: Via TCP proxy (see Railway dashboard)

## 🔗 Related Documentation

- **Full Database Schema:** See `erp-core-docs/database rebuild/dump/database_structure_2025-11-14.yaml`
- **Migration System:** See `backend/scripts/migrate.js`
- **CSV Data Import:** See `backend/scripts/migrate-csv-gauge-data.js`

## ⚠️ Important Notes

1. **Never delete** these tables manually
2. **Always backup** before database operations
3. **Test restores** to verify backups work
4. **Keep multiple backups** (don't rely on just one)
5. **Document changes** to configuration data

## 🆘 Getting Help

If you encounter issues:
1. Check if critical config exists (run verify command above)
2. Check available backups in `database/backups/critical-config/`
3. Review backup/restore script logs
4. Contact the development team with error messages
