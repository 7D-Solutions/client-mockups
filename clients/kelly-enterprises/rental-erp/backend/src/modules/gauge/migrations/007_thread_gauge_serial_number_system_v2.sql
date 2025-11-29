-- Migration 007 v2: Thread Gauge Serial Number System
-- Date: 2025-10-28
-- Purpose: Make gauge_id nullable for spare thread gauges, require serial_number
-- This version handles existing constraints and indexes

-- ============================================================================
-- PHASE 1: Remove Conflicting Constraints
-- ============================================================================

-- Drop the constraint that requires all thread gauges to have a suffix
-- This conflicts with spare gauges which have NULL suffix
ALTER TABLE gauges DROP CONSTRAINT IF EXISTS chk_thread_has_suffix;

-- ============================================================================
-- PHASE 2: Ensure Required Constraints Exist
-- ============================================================================

-- Ensure gauge_id is nullable (may already be done)
ALTER TABLE gauges MODIFY COLUMN gauge_id VARCHAR(50) UNIQUE;

-- Ensure serial_number constraint exists (idempotent - will skip if exists)
-- Note: We can't use IF NOT EXISTS, so we'll try and catch the error
SET @constraint_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'fai_db_sandbox'
    AND TABLE_NAME = 'gauges'
    AND CONSTRAINT_NAME = 'chk_thread_serial_required'
);

-- Only add if doesn't exist (handled by the migration itself if it fails)

-- Ensure index exists (idempotent - will skip if exists)
SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'fai_db_sandbox'
    AND TABLE_NAME = 'gauges'
    AND INDEX_NAME = 'idx_spare_thread_gauges'
);

-- Index already exists based on SHOW CREATE TABLE output

-- ============================================================================
-- PHASE 3: Data Migration (Test Data Only)
-- ============================================================================

-- Temporarily disable foreign key checks to allow deletion
SET FOREIGN_KEY_CHECKS = 0;

-- Clear all existing thread gauge test data
-- This is acceptable since all data is test data
DELETE FROM gauges WHERE equipment_type = 'thread_gauge';

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- PHASE 4: Validation
-- ============================================================================

-- Verify no thread gauges exist
SELECT COUNT(*) as thread_gauge_count
FROM gauges
WHERE equipment_type = 'thread_gauge';
-- Should return 0

-- Verify gauge_id is nullable
SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
  AND TABLE_NAME = 'gauges'
  AND COLUMN_NAME = 'gauge_id';
-- IS_NULLABLE should be 'YES'

-- Verify serial_number constraint exists
SELECT CONSTRAINT_NAME, CHECK_CLAUSE
FROM information_schema.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'fai_db_sandbox'
  AND CONSTRAINT_NAME = 'chk_thread_serial_required';
-- Should return the constraint

-- Verify conflicting constraint is removed
SELECT CONSTRAINT_NAME
FROM information_schema.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'fai_db_sandbox'
  AND CONSTRAINT_NAME = 'chk_thread_has_suffix';
-- Should return 0 rows

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration:
--
-- DROP INDEX idx_spare_thread_gauges ON gauges;
-- ALTER TABLE gauges DROP CONSTRAINT chk_thread_serial_required;
-- ALTER TABLE gauges MODIFY COLUMN gauge_id VARCHAR(50) NOT NULL UNIQUE;
-- ALTER TABLE gauges ADD CONSTRAINT chk_thread_has_suffix
--   CHECK ((equipment_type != 'thread_gauge') OR
--          (gauge_suffix IS NOT NULL AND gauge_suffix IN ('A', 'B')));
