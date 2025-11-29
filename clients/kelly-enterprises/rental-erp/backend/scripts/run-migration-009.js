/**
 * Migration Script: Make email optional
 * Run with: node backend/scripts/run-migration-009.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'host.docker.internal',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'root',
      database: process.env.DB_NAME || 'fai_db_sandbox',
      multipleStatements: true
    });

    console.log('Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, '../src/infrastructure/database/migrations/009-make-email-optional.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    console.log('Running migration: 009-make-email-optional.sql');
    console.log('---');

    // Execute migration
    const [results] = await connection.query(migrationSQL);

    console.log('Migration completed successfully');
    console.log('---');
    console.log('✅ Email is now optional for user accounts');
    console.log('✅ Users can be created with just username');
    console.log('✅ Username must be unique');

  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runMigration();
