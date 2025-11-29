/**
 * Run a single migration file
 * Usage: node scripts/run-single-migration.js <migration-file>
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runSingleMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Error: Please specify migration file');
    console.log('Usage: node scripts/run-single-migration.js <migration-file>');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'host.docker.internal',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    const migrationPath = path.join(__dirname, '../migrations', migrationFile);
    const sql = await fs.readFile(migrationPath, 'utf8');

    console.log(`Running migration: ${migrationFile}`);
    await connection.query(sql);
    console.log(`✓ Migration completed successfully`);

  } catch (error) {
    console.error(`✗ Migration failed: ${error.message}`);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runSingleMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
