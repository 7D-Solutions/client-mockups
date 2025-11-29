/**
 * Database Migration Runner
 *
 * Automatically runs pending migrations from the /migrations directory.
 * Tracks executed migrations in the database_migrations table.
 *
 * Usage:
 *   node scripts/migrate.js                  # Run all pending migrations
 *   node scripts/migrate.js --rollback       # Rollback last migration
 *   node scripts/migrate.js --status         # Show migration status
 *   node scripts/migrate.js --create <name>  # Create new migration file
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const MIGRATIONS_TABLE = 'database_migrations';

/**
 * Create database connection
 */
async function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'host.docker.internal',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });
}

/**
 * Ensure migrations tracking table exists
 */
async function ensureMigrationsTable(connection) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      rollback_sql TEXT,
      INDEX idx_migration_name (migration_name),
      INDEX idx_executed_at (executed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await connection.query(createTableSQL);
  console.log(`✓ Migrations tracking table ready`);
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations(connection) {
  const [rows] = await connection.query(
    `SELECT migration_name FROM ${MIGRATIONS_TABLE} ORDER BY executed_at ASC`
  );
  return rows.map(row => row.migration_name);
}

/**
 * Get list of migration files from /migrations directory
 */
async function getMigrationFiles() {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Alphabetical order ensures correct execution order
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Error: Migrations directory not found at ${MIGRATIONS_DIR}`);
      return [];
    }
    throw error;
  }
}

/**
 * Read migration SQL file
 */
async function readMigrationFile(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  return await fs.readFile(filePath, 'utf8');
}

/**
 * Execute a single migration
 */
async function executeMigration(connection, filename) {
  console.log(`\n→ Running migration: ${filename}`);

  const sql = await readMigrationFile(filename);

  try {
    // Start transaction
    await connection.beginTransaction();

    // Execute migration SQL
    await connection.query(sql);

    // Record migration in tracking table
    await connection.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (migration_name, rollback_sql) VALUES (?, NULL)`,
      [filename]
    );

    // Commit transaction
    await connection.commit();

    console.log(`✓ Migration completed: ${filename}`);
    return true;
  } catch (error) {
    // Rollback transaction on error
    await connection.rollback();
    console.error(`✗ Migration failed: ${filename}`);
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  const connection = await createConnection();

  try {
    console.log('=== Database Migration Runner ===\n');

    // Ensure tracking table exists
    await ensureMigrationsTable(connection);

    // Get executed and available migrations
    const executedMigrations = await getExecutedMigrations(connection);
    const allMigrationFiles = await getMigrationFiles();

    // Find pending migrations
    const pendingMigrations = allMigrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('✓ No pending migrations. Database is up to date.');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s):\n`);
    pendingMigrations.forEach(file => console.log(`  - ${file}`));

    // Execute pending migrations
    let successCount = 0;
    for (const file of pendingMigrations) {
      await executeMigration(connection, file);
      successCount++;
    }

    console.log(`\n✓ Successfully executed ${successCount} migration(s)`);

  } catch (error) {
    console.error('\n✗ Migration process failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

/**
 * Show migration status
 */
async function showStatus() {
  const connection = await createConnection();

  try {
    await ensureMigrationsTable(connection);

    const executedMigrations = await getExecutedMigrations(connection);
    const allMigrationFiles = await getMigrationFiles();
    const pendingMigrations = allMigrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    console.log('=== Migration Status ===\n');
    console.log(`Total migrations: ${allMigrationFiles.length}`);
    console.log(`Executed: ${executedMigrations.length}`);
    console.log(`Pending: ${pendingMigrations.length}\n`);

    if (executedMigrations.length > 0) {
      console.log('Executed migrations:');
      executedMigrations.forEach(file => console.log(`  ✓ ${file}`));
    }

    if (pendingMigrations.length > 0) {
      console.log('\nPending migrations:');
      pendingMigrations.forEach(file => console.log(`  ○ ${file}`));
    }

  } finally {
    await connection.end();
  }
}

/**
 * Create a new migration file
 */
async function createMigration(name) {
  if (!name) {
    console.error('Error: Migration name is required');
    console.log('Usage: node scripts/migrate.js --create <migration-name>');
    process.exit(1);
  }

  // Generate migration filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const counter = String(Date.now()).slice(-3); // Last 3 digits of timestamp for uniqueness
  const filename = `${counter}-${name.toLowerCase().replace(/\s+/g, '-')}.sql`;
  const filepath = path.join(MIGRATIONS_DIR, filename);

  const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: [Add description here]

-- Add your SQL statements below:

`;

  try {
    await fs.writeFile(filepath, template, 'utf8');
    console.log(`✓ Migration file created: ${filename}`);
    console.log(`  Path: ${filepath}`);
  } catch (error) {
    console.error('Error creating migration file:', error.message);
    process.exit(1);
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    await showStatus();
  } else if (args.includes('--create')) {
    const nameIndex = args.indexOf('--create') + 1;
    const name = args.slice(nameIndex).join(' ');
    await createMigration(name);
  } else if (args.includes('--rollback')) {
    console.log('Rollback functionality not yet implemented.');
    console.log('Please manually revert the migration and remove from tracking table.');
  } else {
    await runMigrations();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigrations, showStatus, createMigration };
