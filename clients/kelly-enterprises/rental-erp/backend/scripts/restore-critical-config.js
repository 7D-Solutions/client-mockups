#!/usr/bin/env node
/**
 * Critical Configuration Restore Script
 *
 * Restores essential configuration tables from a backup file.
 *
 * Usage: node restore-critical-config.js <backup-filename>
 * Example: node restore-critical-config.js critical-config-2025-11-14_14-40-46.sql
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../database-backups/critical-config');

async function restoreDatabase(backupFilename) {
  if (!backupFilename) {
    console.error('❌ Error: Backup filename is required');
    console.log('\nUsage: node restore-critical-config.js <backup-filename>');
    console.log('Example: node restore-critical-config.js critical-config-2025-11-14_14-40-46.sql');
    process.exit(1);
  }

  const filepath = path.join(BACKUP_DIR, backupFilename);

  // Check if file exists
  try {
    await fs.access(filepath);
  } catch (error) {
    console.error(`❌ Backup file not found: ${backupFilename}`);
    console.log(`📂 Looking in: ${BACKUP_DIR}`);
    process.exit(1);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'host.docker.internal',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('🔄 Starting critical configuration restore...\n');
    console.log(`📁 File: ${backupFilename}`);

    // Read SQL file
    const sql = await fs.readFile(filepath, 'utf8');

    console.log('\n⚠️  WARNING: This will DELETE and REPLACE the following tables:');
    console.log('   - gauge_categories');
    console.log('   - gauge_id_config');
    console.log('   - rejection_reasons');
    console.log('\n⏳ Executing restore...');

    // Execute the SQL
    await pool.query(sql);

    console.log('\n✅ Restore completed successfully!');

    // Verify restoration
    const [catCount] = await pool.query('SELECT COUNT(*) as count FROM gauge_categories');
    const [idCount] = await pool.query('SELECT COUNT(*) as count FROM gauge_id_config');
    const [rrCount] = await pool.query('SELECT COUNT(*) as count FROM rejection_reasons');

    console.log('\n📊 Restored Data:');
    console.log(`   gauge_categories: ${catCount[0].count} rows`);
    console.log(`   gauge_id_config: ${idCount[0].count} rows`);
    console.log(`   rejection_reasons: ${rrCount[0].count} rows`);

  } catch (error) {
    console.error('\n❌ Restore failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  const backupFilename = process.argv[2];
  restoreDatabase(backupFilename)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { restoreDatabase };
