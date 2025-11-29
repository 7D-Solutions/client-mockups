# Critical Configuration Backups

This directory contains backups of **critical configuration tables** that should NEVER be deleted during development or testing.

## What's Backed Up

These tables are essential for the gauge system to function:

1. **`gauge_categories`** - Gauge type categories (Standard, Metric, ACME, NPT, STI, Spiralock, etc.)
2. **`gauge_id_config`** - ID generation configuration for each category/type combination
3. **`rejection_reasons`** - QC rejection reasons used throughout the system

## When to Use

### Create a Backup
Run this **BEFORE**:
- Clearing test data
- Running database migrations
- Making schema changes
- Any operation that might affect these tables

```bash
# From backend container
docker exec fireproof-erp-modular-backend-dev node /app/scripts/backup-critical-config.js

# From host (if scripts are in PATH)
cd backend
npm run backup:config
```

### Restore from Backup
Run this **IF** you accidentally delete or corrupt the configuration data:

```bash
# List available backups
ls -lh "erp-core-docs/database rebuild/config-backups/"

# Restore specific backup
docker exec fireproof-erp-modular-backend-dev node /app/scripts/restore-critical-config.js critical-config-2025-11-14_14-40-46.sql

# Or using npm
cd backend
npm run restore:config critical-config-2025-11-14_14-40-46.sql
```

## Backup Schedule

**Recommended:**
- Before any major database operation
- After adding new categories or configuration
- Daily during active development
- Before deployment to production

## File Naming Convention

`critical-config-YYYY-MM-DD_HH-MM-SS.sql`

Example: `critical-config-2025-11-14_14-40-46.sql`

## What's NOT Backed Up

These scripts do NOT backup:
- Gauge data (actual gauges)
- User data
- Transactions
- Calibration records
- Audit logs

For full database backups, use the Railway backup system or `mysqldump`.

## Verification

After restore, verify the data:

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

    const [cat] = await pool.query('SELECT COUNT(*) as c FROM gauge_categories');
    const [cfg] = await pool.query('SELECT COUNT(*) as c FROM gauge_id_config');
    const [rej] = await pool.query('SELECT COUNT(*) as c FROM rejection_reasons');

    console.log('gauge_categories:', cat[0].c, 'rows');
    console.log('gauge_id_config:', cfg[0].c, 'rows');
    console.log('rejection_reasons:', rej[0].c, 'rows');

    await pool.end();
  })();
"
```

**Expected Results:**
- gauge_categories: 20 rows
- gauge_id_config: 25 rows
- rejection_reasons: 9+ rows

## Emergency Restoration

If all else fails and you have NO backup, the most recent restorable dump is:
`../dump/dump_restorable_v1.1_2025-11-12_13-35-12.sql`

Extract the INSERT statements for these three tables from that file.
