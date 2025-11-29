#!/usr/bin/env node
/**
 * Critical Configuration Backup Script
 *
 * Backs up essential configuration tables that should NEVER be deleted:
 * - gauge_categories
 * - gauge_id_config
 * - rejection_reasons
 *
 * Usage: node backup-critical-config.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Store backups in a directory accessible to the container
// This resolves to: backend/database-backups/critical-config
const BACKUP_DIR = path.join(__dirname, '../database-backups/critical-config');
const CRITICAL_TABLES = ['gauge_categories', 'gauge_id_config', 'rejection_reasons'];

async function backupDatabase() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'host.docker.internal',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19);
    const filename = `critical-config-${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    console.log('🔄 Starting critical configuration backup...\n');

    let sql = `-- Critical Configuration Backup
-- Created: ${new Date().toISOString()}
-- Database: ${process.env.DB_NAME}
-- Tables: ${CRITICAL_TABLES.join(', ')}
-- Purpose: Essential configuration data for gauge system
--
-- RESTORE INSTRUCTIONS:
-- 1. Review the SQL file to ensure data is correct
-- 2. Run: mysql -h host.docker.internal -P 3307 -u root -p fai_db_sandbox < ${filename}
-- 3. Or use: docker exec fireproof-erp-modular-backend-dev node backend/scripts/restore-critical-config.js ${filename}

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

`;

    for (const table of CRITICAL_TABLES) {
      console.log(`📦 Backing up ${table}...`);

      const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY id`);

      sql += `\n-- ============================================\n`;
      sql += `-- Table: ${table} (${rows.length} rows)\n`;
      sql += `-- ============================================\n`;
      sql += `DELETE FROM ${table};\n`;

      if (rows.length > 0) {
        // Get column names from first row
        const columns = Object.keys(rows[0]);

        for (const row of rows) {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'number') return val;
            if (val instanceof Date) return pool.escape(val);
            return pool.escape(val);
          }).join(',');

          sql += `INSERT INTO ${table} (${columns.join(',')}) VALUES (${values});\n`;
        }
      }

      console.log(`   ✅ ${rows.length} rows backed up`);
    }

    sql += '\nSET FOREIGN_KEY_CHECKS=1;\n';
    sql += `\n-- Backup completed: ${new Date().toISOString()}\n`;

    // Write to file
    await fs.writeFile(filepath, sql, 'utf8');

    const stats = await fs.stat(filepath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 File: ${filename}`);
    console.log(`📏 Size: ${sizeKB} KB`);
    console.log(`📂 Location: ${BACKUP_DIR}`);

    return filepath;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  backupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { backupDatabase };
