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

    // Read migration file
    const migrationPath = path.join(__dirname, 'src/infrastructure/database/migrations/017-drop-old-column-triggers.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration 017...');
    const [results] = await connection.query(sql);

    console.log('✅ Migration 017 executed successfully');
    console.log('Results:', results);

    // Check remaining triggers
    const [triggers] = await connection.query("SHOW TRIGGERS WHERE `Table` = 'gauges'");
    console.log('\n📊 Remaining triggers on gauges table:');
    if (triggers.length === 0) {
      console.log('   ✅ No triggers found (all old triggers removed)');
    } else {
      console.table(triggers);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
