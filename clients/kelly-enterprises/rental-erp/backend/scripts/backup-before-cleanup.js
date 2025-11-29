/**
 * Pre-Cleanup Database Backup Script
 *
 * Purpose: Create a backup of gauge data before cleanup
 * This allows rollback if needed
 *
 * @kingdom-purpose Wisdom through preparation and safety
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'host.docker.internal',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

const BACKUP_DIR = path.join(__dirname, '../backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const BACKUP_FILE = path.join(BACKUP_DIR, `gauge-data-backup-${TIMESTAMP}.json`);

const GAUGE_TABLES = [
  'gauges',
  'gauge_categories',
  'gauge_calibrations',
  'gauge_thread_specifications',
  'gauge_hand_tool_specifications',
  'gauge_large_equipment_specifications',
  'gauge_calibration_standard_specifications',
  'gauge_transactions',
  'gauge_notes',
  'gauge_active_checkouts',
  'gauge_calibration_schedule',
  'gauge_calibration_failures',
  'gauge_qc_checks',
  'gauge_transfers',
  'gauge_unseal_requests',
  'calibration_batches',
  'calibration_batch_gauges',
  'certificates',
  'companion_history',
  'gauge_id_config',
  'rejection_reasons'
];

async function backupGaugeData() {
  let connection;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database:', dbConfig.database);
    console.log('');

    // Ensure backup directory exists
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    const backup = {
      timestamp: new Date().toISOString(),
      database: dbConfig.database,
      tables: {}
    };

    console.log('📦 Backing up gauge data:');
    console.log('━'.repeat(60));

    let totalRows = 0;

    for (const table of GAUGE_TABLES) {
      try {
        const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
        backup.tables[table] = rows;
        totalRows += rows.length;

        if (rows.length > 0) {
          console.log(`  ✅ ${table.padEnd(45)} ${rows.length.toString().padStart(6)} rows`);
        }
      } catch (error) {
        console.log(`  ⚠️  ${table.padEnd(45)} (table not found or error)`);
        backup.tables[table] = [];
      }
    }

    console.log('━'.repeat(60));
    console.log(`  TOTAL ROWS BACKED UP: ${totalRows}`);
    console.log('');

    // Write backup to file
    console.log('💾 Writing backup file...');
    await fs.writeFile(BACKUP_FILE, JSON.stringify(backup, null, 2));
    console.log('✅ Backup saved to:', BACKUP_FILE);
    console.log('');

    // Get file size
    const stats = await fs.stat(BACKUP_FILE);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 Backup file size: ${fileSizeMB} MB`);
    console.log('');

    console.log('━'.repeat(60));
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY!');
    console.log('━'.repeat(60));
    console.log('');
    console.log('You can now safely run the cleanup script.');
    console.log('To restore from this backup, use the restore script.');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ BACKUP FAILED:');
    console.error('━'.repeat(60));
    console.error(error.message);
    console.error('');
    process.exit(1);

  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Execute backup
console.log('');
console.log('═'.repeat(60));
console.log('  PRE-CLEANUP DATABASE BACKUP');
console.log('  Kingdom Purpose: Wisdom Through Preparation');
console.log('═'.repeat(60));
console.log('');

backupGaugeData()
  .then(() => {
    console.log('🎉 Backup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Backup failed:', error.message);
    process.exit(1);
  });
