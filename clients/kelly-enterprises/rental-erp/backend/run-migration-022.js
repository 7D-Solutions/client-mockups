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

    // Check if table already exists
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'user_favorites'
    `);

    if (tables.length > 0) {
      console.log('\n✅ user_favorites table already exists. Migration not needed.');

      // Show table structure
      const [structure] = await connection.query('DESCRIBE user_favorites');
      console.log('\n📋 Table Structure:');
      structure.forEach(col => {
        console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });

      return;
    }

    const migrationPath = path.join(__dirname, 'src/infrastructure/database/migrations/022-create-user-favorites.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📄 Executing migration 022: Create user_favorites table...');
    await connection.query(sql);

    // Verify table was created
    const [afterTables] = await connection.query(`
      SHOW TABLES LIKE 'user_favorites'
    `);

    if (afterTables.length === 0) {
      throw new Error('Table creation failed - user_favorites not found after migration');
    }

    // Show table structure
    const [structure] = await connection.query('DESCRIBE user_favorites');
    console.log('\n✅ user_favorites table created successfully!');
    console.log('\n📋 Table Structure:');
    structure.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });

    console.log('\n✅ Migration 022 completed successfully!');
    console.log('\n⚠️  IMPORTANT: Add \'user_favorites\' to BaseRepository.ALLOWED_TABLES');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
