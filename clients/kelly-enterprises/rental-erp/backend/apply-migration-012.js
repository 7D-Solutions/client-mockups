/**
 * Migration 012 Application Script
 *
 * Applies 012-remove-standardized-name.sql to the database
 * Removes standardized_name column and implements computed display names
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load environment variables
require('dotenv').config();

// Auto-detect if running inside Docker container
const isInsideDocker = process.env.DOCKER_ENVIRONMENT === 'true' ||
                       require('fs').existsSync('/.dockerenv');

// Override DB_HOST based on environment
process.env.DB_HOST = isInsideDocker ? 'host.docker.internal' : 'localhost';

// Database configuration from environment
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fai_db_sandbox',
  multipleStatements: true,
  connectTimeout: 60000
};

async function applyMigration() {
  let connection;

  try {
    console.log('🚀 Starting Migration 012 Application');
    console.log('📦 Database:', dbConfig.database);
    console.log('🔗 Host:', dbConfig.host);
    console.log('🔌 Port:', dbConfig.port);
    console.log('⚠️  BREAKING CHANGE: Removes standardized_name column');
    console.log('');

    // Read migration file
    const migrationPath = path.join(__dirname, 'src/infrastructure/database/migrations/012-remove-standardized-name.sql');
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

    // Create backup timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    console.log('💾 Backup timestamp:', timestamp);
    console.log('⚠️  Manual backup recommended before proceeding');
    console.log('   mysqldump -h localhost -P 3307 -u root -p fai_db_sandbox > backup_' + timestamp + '.sql');
    console.log('');

    // Execute migration
    console.log('⚡ Executing migration...');
    console.log('─'.repeat(50));

    await connection.query(migrationSQL);

    console.log('─'.repeat(50));
    console.log('✅ Migration executed successfully');
    console.log('');

    // Verify migration
    console.log('🔍 Verifying migration...');
    console.log('');

    // Check standardized_name column removed
    const [gaugesColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'gauges'
      AND COLUMN_NAME = 'standardized_name'
    `, [dbConfig.database]);

    if (gaugesColumns.length === 0) {
      console.log('✅ standardized_name column removed from gauges table');
    } else {
      console.log('⚠️ standardized_name column still exists');
    }

    // Check new indexes created
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME IN ('gauges', 'gauge_thread_specifications')
      AND INDEX_NAME IN ('idx_gauge_id_search', 'idx_serial_search', 'idx_thread_size_search', 'idx_thread_class_search', 'idx_thread_spec_lookup')
      GROUP BY INDEX_NAME
    `, [dbConfig.database]);

    const expectedIndexes = ['idx_gauge_id_search', 'idx_serial_search', 'idx_thread_size_search', 'idx_thread_class_search', 'idx_thread_spec_lookup'];
    const foundIndexes = indexes.map(row => row.INDEX_NAME);

    console.log('📊 Index verification:');
    expectedIndexes.forEach(indexName => {
      const present = foundIndexes.includes(indexName);
      console.log(present ? '   ✅' : '   ❌', indexName);
    });
    console.log('');

    // Check gauge_suffix removed from gauge_thread_specifications
    const [specsColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'gauge_thread_specifications'
      AND COLUMN_NAME = 'gauge_suffix'
    `, [dbConfig.database]);

    if (specsColumns.length === 0) {
      console.log('✅ gauge_suffix column removed from gauge_thread_specifications (if it existed)');
    } else {
      console.log('⚠️ gauge_suffix column still exists in gauge_thread_specifications');
    }
    console.log('');

    // Final summary
    const allIndexesPresent = expectedIndexes.every(idx => foundIndexes.includes(idx));
    const columnRemoved = gaugesColumns.length === 0;

    if (columnRemoved && allIndexesPresent) {
      console.log('🎉 Migration 012 applied and verified successfully!');
      console.log('');
      console.log('Breaking Changes:');
      console.log('   ❌ standardized_name column removed from gauges table');
      console.log('   ✅ New indexes created for JOIN performance');
      console.log('   ✅ gauge_suffix cleaned up from gauge_thread_specifications');
      console.log('');
      console.log('Next steps:');
      console.log('1. Implement GaugePresenter class (Phase 2)');
      console.log('2. Update repositories to JOIN specifications (Phase 3)');
      console.log('3. Update frontend to use displayName field (Phase 5)');
      console.log('4. Run all tests to verify functionality');
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
    console.error('1. Check database is running: docker ps');
    console.error('2. Check credentials in .env file');
    console.error('3. Ensure backup was created before running');
    console.error('4. Review rollback plan in erp-core-docs/database rebuild/standardized-name-refactor/06-ROLLBACK-PLAN.md');

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
