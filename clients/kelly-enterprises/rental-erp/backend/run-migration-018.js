const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'fireproof_root_sandbox',
    database: 'fai_db_sandbox',
    multipleStatements: true
  });

  try {
    console.log('✅ Connected to database');

    const [before] = await connection.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN gauge_id IS NULL OR gauge_id = '' OR gauge_id = 'S/N' THEN 1 END) as missing
      FROM gauges
    `);
    
    console.log('\n📊 Before Migration:');
    console.log(`   Total gauges: ${before[0].total}`);
    console.log(`   Missing gauge_id: ${before[0].missing}`);

    if (before[0].missing === 0) {
      console.log('\n✅ All gauges already have gauge_id. Migration not needed.');
      return;
    }

    const migrationPath = path.join(process.cwd(), 'backend/src/infrastructure/database/migrations/018-populate-missing-gauge-ids.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📄 Executing migration 018...');
    await connection.query(sql);

    const [after] = await connection.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN gauge_id IS NULL OR gauge_id = '' OR gauge_id = 'S/N' THEN 1 END) as missing
      FROM gauges
    `);

    console.log('\n📊 After Migration:');
    console.log(`   Total gauges: ${after[0].total}`);
    console.log(`   Missing gauge_id: ${after[0].missing}`);

    const [samples] = await connection.query(`
      SELECT id, gauge_id, name, equipment_type, set_id
      FROM gauges
      ORDER BY id
      LIMIT 10
    `);

    console.log('\n📝 Sample Results (first 10):');
    samples.forEach(g => {
      console.log(`   ID ${g.id}: "${g.gauge_id}" | ${g.name} | ${g.equipment_type}`);
    });

    console.log('\n✅ Migration 018 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
