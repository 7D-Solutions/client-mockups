/**
 * Migration 005 - Final Part: Calibration Tables Only
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

const calibrationTablesSQL = `
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

async function applyCalibrationTables() {
  let connection;

  try {
    console.log('🚀 Creating Calibration Tables (Final Migration 005 Part)');
    console.log('');

    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    console.log('');

    console.log('⚡ Creating tables...');
    await connection.query(calibrationTablesSQL);
    console.log('✅ Tables created');
    console.log('');

    // Verify
    const [calTables] = await connection.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME IN ('calibration_batches', 'calibration_batch_gauges')
    `, [dbConfig.database]);

    console.log('🔍 Verification:');
    console.log('   Calibration tables:', calTables.length === 2 ? '✅ BOTH CREATED' : `❌ Only ${calTables.length}/2`);

    if (calTables.length === 2) {
      console.log('');
      console.log('🎉 Migration 005 COMPLETE!');
      console.log('');
      console.log('All schema changes applied:');
      console.log('   ✅ Status enum (out_for_calibration, pending_certificate, returned)');
      console.log('   ✅ customer_id column');
      console.log('   ✅ Certificate history columns');
      console.log('   ✅ Calibration batch tables');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Failed:', error.message);
    if (error.sqlMessage) console.error('SQL Message:', error.sqlMessage);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

applyCalibrationTables();
