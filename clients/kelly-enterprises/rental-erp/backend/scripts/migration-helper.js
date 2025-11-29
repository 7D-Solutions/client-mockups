/**
 * Migration Helper
 *
 * Provides utilities for tracking migrations/seeds to prevent duplicate execution.
 */

const mysql = require('mysql2/promise');

class MigrationHelper {
  constructor(connection) {
    this.connection = connection;
  }

  /**
   * Check if a migration has already been applied
   */
  async hasBeenApplied(migrationName) {
    const [rows] = await this.connection.query(
      'SELECT id FROM schema_migrations WHERE migration_name = ?',
      [migrationName]
    );
    return rows.length > 0;
  }

  /**
   * Mark a migration as applied
   */
  async markAsApplied(migrationName, type = 'seed', appliedBy = 'system') {
    await this.connection.query(
      'INSERT INTO schema_migrations (migration_name, migration_type, applied_by) VALUES (?, ?, ?)',
      [migrationName, type, appliedBy]
    );
  }

  /**
   * Run a seed/migration only if it hasn't been applied yet
   */
  async runOnce(migrationName, seedFunction, type = 'seed') {
    // Check if already applied
    const alreadyApplied = await this.hasBeenApplied(migrationName);

    if (alreadyApplied) {
      console.log(`⏭️  Skipping "${migrationName}" - already applied`);
      return { skipped: true, reason: 'already_applied' };
    }

    console.log(`🚀 Running "${migrationName}"...`);

    try {
      // Run the seed function
      const result = await seedFunction(this.connection);

      // Mark as applied
      await this.markAsApplied(migrationName, type);

      console.log(`✅ Completed "${migrationName}"`);
      return { success: true, result };

    } catch (error) {
      console.error(`❌ Failed "${migrationName}":`, error.message);
      throw error;
    }
  }

  /**
   * Ensure migration tracking table exists
   */
  async ensureMigrationTable() {
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        migration_type ENUM('migration', 'seed', 'data') NOT NULL DEFAULT 'migration',
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        applied_by VARCHAR(100) DEFAULT 'system',
        checksum VARCHAR(64) NULL,
        INDEX idx_migration_name (migration_name),
        INDEX idx_applied_at (applied_at),
        INDEX idx_migration_type (migration_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
}

module.exports = MigrationHelper;
