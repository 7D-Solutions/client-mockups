-- ============================================================================
-- Migration 005: Cascade Operations & Calibration Workflow Schema
-- Date: 2025-10-25
-- Description: Add schema changes for cascade operations and calibration workflow
-- ============================================================================

-- CONTEXT:
-- This migration implements database schema changes specified in ADDENDUM_CASCADE_AND_RELATIONSHIP_OPS.md
-- to support:
--   1. Cascade Operations (Out of Service, Return to Service, Location Change, Checkout Enforcement, Deletion/Retirement)
--   2. Calibration Workflow (7-step process with new statuses)
--   3. Certificate History Tracking (superseding and versioning)
--   4. Customer Ownership (customer-owned gauge support)
--
-- This migration enables the service layer to implement cascade operations while
-- maintaining data integrity and audit trails.

-- ============================================================================
-- 1. STATUS ENUM UPDATE
-- ============================================================================

-- Add new status values for calibration workflow and customer returns
ALTER TABLE gauges
MODIFY COLUMN status ENUM(
  'available',
  'checked_out',
  'calibration_due',
  'pending_qc',
  'out_of_service',
  'pending_unseal',
  'retired',
  'out_for_calibration',      -- NEW: Gauge sent to calibration (Step 3 of calibration workflow)
  'pending_certificate',       -- NEW: Gauge returned, awaiting certificate upload (Step 4)
  'returned'                   -- NEW: Customer gauge returned (Admin/QC only)
) DEFAULT 'available';

-- ============================================================================
-- 2. CUSTOMER OWNERSHIP SUPPORT
-- ============================================================================

-- Add customer_id for customer-owned gauges
ALTER TABLE gauges
ADD COLUMN customer_id INT NULL COMMENT 'Customer ID if customer-owned (NULL for company-owned)';

-- Add foreign key constraint to customers table
-- NOTE: Commented out - customers table doesn't exist yet
-- Will need to add this constraint in a future migration after customers table is created
-- ALTER TABLE gauges
-- ADD CONSTRAINT fk_gauge_customer FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Create index for customer gauge queries
CREATE INDEX IF NOT EXISTS idx_customer_gauges ON gauges(customer_id, is_deleted);

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
CREATE INDEX IF NOT EXISTS idx_current_certs ON certificates(gauge_id, is_current);

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
) ENGINE=InnoDB COMMENT='Tracks calibration batches sent to internal/external labs';

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
) ENGINE=InnoDB COMMENT='Links gauges to calibration batches (many-to-many)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify status enum includes new values
SELECT COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME = 'gauges'
AND COLUMN_NAME = 'status';

-- Expected result:
-- enum('available','checked_out','calibration_due','pending_qc','out_of_service',
--      'pending_unseal','retired','out_for_calibration','pending_certificate','returned')

-- Verify customer_id column exists
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME = 'gauges'
AND COLUMN_NAME = 'customer_id';

-- Expected result:
-- customer_id | int | YES | Customer ID if customer-owned (NULL for company-owned)

-- Verify certificate columns exist
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME = 'certificates'
AND COLUMN_NAME IN ('is_current', 'superseded_at', 'superseded_by');

-- Expected result:
-- is_current      | tinyint(1) | YES | Whether this is the current/active certificate
-- superseded_at   | timestamp  | YES | When this certificate was superseded
-- superseded_by   | int        | YES | ID of certificate that superseded this one

-- Verify calibration tables exist
SELECT TABLE_NAME, TABLE_ROWS, ENGINE, TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME IN ('calibration_batches', 'calibration_batch_gauges');

-- Expected result:
-- calibration_batches       | 0 | InnoDB | Tracks calibration batches sent to internal/external labs
-- calibration_batch_gauges  | 0 | InnoDB | Links gauges to calibration batches (many-to-many)

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

/*
-- WARNING: This rollback script will remove all data in calibration tables
-- and reset status values to pre-migration state.

-- Revert status enum
ALTER TABLE gauges
MODIFY COLUMN status ENUM(
  'available',
  'checked_out',
  'calibration_due',
  'pending_qc',
  'out_of_service',
  'pending_unseal',
  'retired'
) DEFAULT 'available';

-- Drop customer_id column and constraints
ALTER TABLE gauges DROP FOREIGN KEY fk_gauge_customer;
ALTER TABLE gauges DROP COLUMN customer_id;
DROP INDEX idx_customer_gauges ON gauges;

-- Drop certificate enhancements
ALTER TABLE certificates DROP FOREIGN KEY fk_cert_superseded_by;
ALTER TABLE certificates DROP COLUMN is_current;
ALTER TABLE certificates DROP COLUMN superseded_at;
ALTER TABLE certificates DROP COLUMN superseded_by;
DROP INDEX idx_current_certs ON certificates;

-- Drop calibration tables (CASCADE will remove junction table data)
DROP TABLE IF EXISTS calibration_batch_gauges;
DROP TABLE IF EXISTS calibration_batches;
*/

-- ============================================================================
-- NOTES
-- ============================================================================

-- Migration Status: READY FOR APPLICATION
-- Dependencies:
--   - Migration 001, 002, 003, 004 must be applied first
--   - customers table must exist with id column
--   - core_users table must exist with id column
--
-- Impact:
--   - Enables calibration workflow implementation
--   - Enables customer-owned gauge tracking
--   - Enables certificate versioning and history
--   - Enables cascade operations (OOS, location, checkout)
--
-- Related Documentation:
--   - ADDENDUM_CASCADE_AND_RELATIONSHIP_OPS.md (lines 1658-1863)
--   - Calibration Workflow: ADDENDUM lines 1061-1381
--   - Customer Ownership: ADDENDUM lines 1461-1601
--
-- companion_history Action Types:
-- The companion_history.action_type column (VARCHAR(50)) now supports these values:
--   - 'created_together' - Set created with both gauges
--   - 'paired_from_spares' - Orphans paired into set
--   - 'replaced' - One gauge replaced with spare
--   - 'unpaired' - Set dissolved, both become spares
--   - 'orphaned' - Companion deleted/retired
--   - 'cascaded_oos' - Out of service cascaded to both (NEW)
--   - 'cascaded_return' - Return to service cascaded to both (NEW)
--   - 'cascaded_location' - Location change cascaded to both (NEW)
--   - 'set_returned' - Customer set returned together (NEW)
-- No schema change needed - VARCHAR(50) handles all values.
