/**
 * Migration 005 Application Script
 *
 * Applies 005_cascade_operations_schema.sql to the database
 * Uses existing database connection configuration
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load environment variables
require('dotenv').config();

// Database configuration from environment
const dbConfig = {
  host: process.env.DB_HOST || 'host.docker.internal',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fai_db_sandbox',
  multipleStatements: true // Required for running migration scripts
};

async function applyMigration() {
  let connection;

  try {
    console.log('🚀 Starting Migration 005 Application');
    console.log('📦 Database:', dbConfig.database);
    console.log('🔗 Host:', dbConfig.host);
    console.log('🔌 Port:', dbConfig.port);
    console.log('');

    // Read migration file
    const migrationPath = path.join(__dirname, 'src/modules/gauge/migrations/005_cascade_operations_schema.sql');
    console.log('📄 Reading migration file:', migrationPath);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded successfully');
    console.log('');

    // Connect to database
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    console.log('');

    // Execute migration
    console.log('⚡ Executing migration...');
    console.log('─'.repeat(50));

    await connection.query(migrationSQL);

    console.log('─'.repeat(50));
    console.log('✅ Migration executed successfully');
    console.log('');

    // Verify migration - Check status enum
    console.log('🔍 Verifying migration...');
    console.log('');

    const [statusResult] = await connection.query(`
      SELECT COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'gauges'
      AND COLUMN_NAME = 'status'
    `, [dbConfig.database]);

    console.log('1. Status enum:', statusResult[0].COLUMN_TYPE);

    const hasNewStatuses =
      statusResult[0].COLUMN_TYPE.includes('out_for_calibration') &&
      statusResult[0].COLUMN_TYPE.includes('pending_certificate') &&
      statusResult[0].COLUMN_TYPE.includes('returned');

    if (hasNewStatuses) {
      console.log('   ✅ New status values confirmed');
    } else {
      console.log('   ⚠️ New status values not found');
    }
    console.log('');

    // Check customer_id column
    const [customerIdResult] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'gauges'
      AND COLUMN_NAME = 'customer_id'
    `, [dbConfig.database]);

    if (customerIdResult.length > 0) {
      console.log('2. customer_id column:', customerIdResult[0].DATA_TYPE, '(nullable:', customerIdResult[0].IS_NULLABLE + ')');
      console.log('   ✅ customer_id column confirmed');
    } else {
      console.log('2. customer_id column: NOT FOUND');
      console.log('   ⚠️ customer_id column missing');
    }
    console.log('');

    // Check certificate columns
    const [certColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'certificates'
      AND COLUMN_NAME IN ('is_current', 'superseded_at', 'superseded_by')
      ORDER BY COLUMN_NAME
    `, [dbConfig.database]);

    console.log('3. Certificate columns:', certColumns.length, '/ 3');
    if (certColumns.length === 3) {
      certColumns.forEach(col => console.log('   ✅', col.COLUMN_NAME));
    } else {
      console.log('   ⚠️ Expected 3 columns, found', certColumns.length);
    }
    console.log('');

    // Check calibration tables
    const [calTables] = await connection.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME IN ('calibration_batches', 'calibration_batch_gauges')
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);

    console.log('4. Calibration tables:', calTables.length, '/ 2');
    if (calTables.length === 2) {
      calTables.forEach(table => console.log('   ✅', table.TABLE_NAME));
    } else {
      console.log('   ⚠️ Expected 2 tables, found', calTables.length);
    }
    console.log('');

    // Final summary
    const allVerified = hasNewStatuses && customerIdResult.length > 0 && certColumns.length === 3 && calTables.length === 2;

    if (allVerified) {
      console.log('🎉 Migration 005 applied and verified successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Run tests: npm test');
      console.log('2. Update ADDENDUM_COMPLETION_TRACKER.md - mark migration as "Applied"');
      console.log('3. Proceed with cascade operations implementation');
    } else {
      console.log('⚠️ Migration applied but some verifications failed');
      console.log('   Please review the output above');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    console.error('');

    if (error.code) console.error('Error code:', error.code);
    if (error.errno) console.error('Error errno:', error.errno);
    if (error.sqlMessage) console.error('SQL Message:', error.sqlMessage);

    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check database is running: docker ps | grep mysql');
    console.error('2. Check credentials in .env file');
    console.error('3. Try manual application: mysql -h localhost -P 3307 -u root -p < src/modules/gauge/migrations/005_cascade_operations_schema.sql');

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
applyMigration();
