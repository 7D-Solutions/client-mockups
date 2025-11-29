/**
 * Migration 006 Application Script
 *
 * Applies 006_add_pending_release_status.sql to the database
 * Adds the missing 'pending_release' status for calibration workflow Step 6
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load environment variables
require('dotenv').config();

// Auto-detect if running inside Docker container (same logic as test setup)
const isInsideDocker = process.env.DOCKER_ENVIRONMENT === 'true' ||
                       require('fs').existsSync('/.dockerenv');

// Override DB_HOST based on environment (same as tests/setup.js)
process.env.DB_HOST = isInsideDocker ? 'host.docker.internal' : 'localhost';

// Database configuration from environment
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fai_db_sandbox',
  multipleStatements: true, // Required for running migration scripts
  connectTimeout: 60000 // Match test setup timeout
};

async function applyMigration() {
  let connection;

  try {
    console.log('🚀 Starting Migration 006 Application');
    console.log('📦 Database:', dbConfig.database);
    console.log('🔗 Host:', dbConfig.host);
    console.log('🔌 Port:', dbConfig.port);
    console.log('');

    // Read migration file
    const migrationPath = path.join(__dirname, 'src/modules/gauge/migrations/006_add_pending_release_status.sql');
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

    console.log('Status enum:', statusResult[0].COLUMN_TYPE);

    const hasPendingRelease = statusResult[0].COLUMN_TYPE.includes('pending_release');

    if (hasPendingRelease) {
      console.log('✅ pending_release status confirmed');
    } else {
      console.log('⚠️ pending_release status not found');
    }
    console.log('');

    // Verify all calibration workflow statuses are present
    const expectedStatuses = ['out_for_calibration', 'pending_certificate', 'pending_release'];
    const allPresent = expectedStatuses.every(status => statusResult[0].COLUMN_TYPE.includes(status));

    if (allPresent) {
      console.log('✅ All calibration workflow statuses confirmed:');
      expectedStatuses.forEach(status => console.log('   ✅', status));
    } else {
      console.log('⚠️ Some calibration workflow statuses missing');
      expectedStatuses.forEach(status => {
        const present = statusResult[0].COLUMN_TYPE.includes(status);
        console.log(present ? '   ✅' : '   ❌', status);
      });
    }
    console.log('');

    // Final summary
    if (hasPendingRelease) {
      console.log('🎉 Migration 006 applied and verified successfully!');
      console.log('');
      console.log('Calibration Workflow Status Chain:');
      console.log('   Step 3: out_for_calibration');
      console.log('   Step 4: pending_certificate');
      console.log('   Step 6: pending_release ← NEW');
      console.log('   Step 7: available');
      console.log('');
      console.log('Next steps:');
      console.log('1. Run integration tests: npx jest tests/modules/gauge/integration/CalibrationWorkflow.integration.test.js');
      console.log('2. All calibration workflow tests should now pass');
    } else {
      console.log('⚠️ Migration applied but verification failed');
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
    console.error('3. Ensure migration 005 was applied first');
    console.error('4. Try manual application: mysql -h localhost -P 3307 -u root -p < src/modules/gauge/migrations/006_add_pending_release_status.sql');

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
