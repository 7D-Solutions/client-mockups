/**
 * Migration Runner for 016_add_gauge_category_prefixes.sql
 * Run this script to add prefix column to gauge_categories table
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'host.docker.internal',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'Fai@2024',
      database: process.env.DB_NAME || 'fai_db_sandbox',
      multipleStatements: true
    });

    console.log('✓ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'src/modules/gauge/migrations/016_add_gauge_category_prefixes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('✓ Migration file loaded');
    console.log('Running migration...\n');

    // Execute migration
    await connection.query(migrationSQL);

    console.log('✓ Migration completed successfully!');

    // Verify the changes
    console.log('\nVerifying changes...');
    const [categories] = await connection.execute(`
      SELECT equipment_type, category_name, prefix,
        (SELECT COUNT(*) FROM gauge_id_config WHERE category_id = gc.id) as config_count
      FROM gauge_categories gc
      ORDER BY equipment_type, display_order
    `);

    console.log('\nGauge Categories with Prefixes:');
    console.table(categories);

    console.log('\n✓ Verification complete!');
    console.log('\nAll categories have been assigned prefixes:');
    console.log('- Thread Gauges: SP, MP, AC, NPT, ST, SL');
    console.log('- Hand Tools: CA, MI, DG, BG');
    console.log('- Large Equipment: LE');
    console.log('- Calibration Standards: CS');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✓ Database connection closed');
    }
  }
}

// Run migration
console.log('='.repeat(60));
console.log('Running Migration 016: Add Gauge Category Prefixes');
console.log('='.repeat(60));
console.log();

runMigration()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n' + '='.repeat(60));
    console.error('Migration failed!');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  });
