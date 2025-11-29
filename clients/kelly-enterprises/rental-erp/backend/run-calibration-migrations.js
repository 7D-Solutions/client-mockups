const fs = require('fs');
const path = require('path');
const { getPool } = require('./src/infrastructure/database/connection');

async function runMigrations() {
  const pool = getPool();

  try {
    console.log('🔧 Running hand tool calibration migrations...\n');

    // Migration 013: Add tolerance field
    console.log('📋 Migration 013: Adding tolerance field to hand_tool_specifications...');
    const migration013 = fs.readFileSync(
      path.join(__dirname, 'src/modules/gauge/migrations/013_add_hand_tool_tolerance.sql'),
      'utf8'
    );

    const statements013 = migration013
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements013) {
      try {
        await pool.execute(statement);
        console.log('  ✅ Executed:', statement.substring(0, 60) + '...');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('  ⚠️  Column already exists, skipping...');
        } else {
          console.error('  ❌ Error:', error.message);
        }
      }
    }

    // Migration 014: Add calibration permission
    console.log('\n📋 Migration 014: Adding calibration permission...');
    const migration014 = fs.readFileSync(
      path.join(__dirname, 'src/modules/gauge/migrations/014_add_calibration_permission.sql'),
      'utf8'
    );

    const statements014 = migration014
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements014) {
      try {
        await pool.execute(statement);
        console.log('  ✅ Executed:', statement.substring(0, 60) + '...');
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log('  ⚠️  Permission already exists, skipping...');
        } else {
          console.error('  ❌ Error:', error.message);
        }
      }
    }

    console.log('\n✅ Migrations completed successfully!\n');

    // Verify the changes
    console.log('🔍 Verifying migrations...\n');

    const [toleranceCheck] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'fai_db_sandbox'
        AND TABLE_NAME = 'gauge_hand_tool_specifications'
        AND COLUMN_NAME = 'tolerance'
    `);

    if (toleranceCheck.length > 0) {
      console.log('✅ Tolerance column exists:', toleranceCheck[0]);
    } else {
      console.log('❌ Tolerance column NOT found!');
    }

    const [permissionCheck] = await pool.execute(`
      SELECT id, module_id, resource, action, description
      FROM core_permissions
      WHERE module_id = 'gauge' AND resource = 'calibration' AND action = 'record_internal'
    `);

    if (permissionCheck.length > 0) {
      console.log('✅ Calibration permission exists:', permissionCheck[0]);
    } else {
      console.log('❌ Calibration permission NOT found!');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Wait for DB to be ready
setTimeout(() => {
  runMigrations();
}, 2000);
