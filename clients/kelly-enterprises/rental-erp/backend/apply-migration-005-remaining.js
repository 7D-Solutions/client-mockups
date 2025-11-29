/**
 * Migration 005 - Apply Remaining Parts
 *
 * Only applies the parts that haven't been applied yet:
 * - Certificate history tracking columns
 * - Calibration batch tables
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'host.docker.internal',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fai_db_sandbox',
  multipleStatements: true
};

const remainingSQL = `
-- ============================================================================
-- 3. CERTIFICATE HISTORY TRACKING
-- ============================================================================

-- Add certificate history tracking columns
ALTER TABLE certificates
ADD COLUMN is_current BOOLEAN DEFAULT TRUE COMMENT 'Whether this is the current/active certificate',
ADD COLUMN superseded_at TIMESTAMP NULL COMMENT 'When this certificate was superseded',
ADD COLUMN superseded_by INT NULL COMMENT 'ID of certificate that superseded this one';

-- Add foreign key for certificate supersession chain
ALTER TABLE certificates
ADD CONSTRAINT fk_cert_superseded_by FOREIGN KEY (superseded_by) REFERENCES certificates(id);

-- Create index for current certificate queries
CREATE INDEX idx_current_certs ON certificates(gauge_id, is_current);

-- ============================================================================
-- 4. CALIBRATION BATCH TABLES
-- ============================================================================

-- Create calibration_batches table
CREATE TABLE IF NOT EXISTS calibration_batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  created_by INT NOT NULL,
  calibration_type ENUM('internal', 'external') NOT NULL,
  vendor_name VARCHAR(255) NULL,
  tracking_number VARCHAR(100) NULL,
  status ENUM('pending_send', 'sent', 'completed', 'cancelled') DEFAULT 'pending_send',
  sent_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES core_users(id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Create calibration_batch_gauges junction table
CREATE TABLE IF NOT EXISTS calibration_batch_gauges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL,
  gauge_id INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES calibration_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  UNIQUE KEY unique_batch_gauge (batch_id, gauge_id),
  INDEX idx_batch (batch_id),
  INDEX idx_gauge (gauge_id)
);
`;

async function applyRemainingMigration() {
  let connection;

  try {
    console.log('🚀 Applying Remaining Migration 005 Parts');
    console.log('📦 Database:', dbConfig.database);
    console.log('');

    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    console.log('');

    console.log('⚡ Executing remaining migration...');
    console.log('─'.repeat(50));
    await connection.query(remainingSQL);
    console.log('─'.repeat(50));
    console.log('✅ Migration executed successfully');
    console.log('');

    // Verify
    console.log('🔍 Verifying...');

    const [certColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'certificates'
      AND COLUMN_NAME IN ('is_current', 'superseded_at', 'superseded_by')
    `, [dbConfig.database]);

    console.log('1. Certificate columns:', certColumns.length === 3 ? '✅ ALL 3 ADDED' : `❌ Only ${certColumns.length}/3`);

    const [calTables] = await connection.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME IN ('calibration_batches', 'calibration_batch_gauges')
    `, [dbConfig.database]);

    console.log('2. Calibration tables:', calTables.length === 2 ? '✅ BOTH CREATED' : `❌ Only ${calTables.length}/2`);

    if (certColumns.length === 3 && calTables.length === 2) {
      console.log('');
      console.log('🎉 Migration 005 COMPLETE!');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    if (error.sqlMessage) console.error('SQL Message:', error.sqlMessage);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

applyRemainingMigration();
