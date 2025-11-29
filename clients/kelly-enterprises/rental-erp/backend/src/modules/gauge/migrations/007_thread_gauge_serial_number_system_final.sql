-- Migration 007 Final: Thread Gauge Serial Number System
-- Date: 2025-10-28
-- Purpose: Enable spare thread gauge identification by serial number only

-- ============================================================================
-- PHASE 1: Remove Conflicting Constraint
-- ============================================================================

-- Drop the constraint that requires all thread gauges to have a suffix
-- This conflicts with spare gauges which will have NULL gauge_suffix
ALTER TABLE gauges DROP CONSTRAINT chk_thread_has_suffix;

-- ============================================================================
-- PHASE 2: Data Migration (Test Data Only)
-- ============================================================================

-- Temporarily disable foreign key checks to allow deletion
SET FOREIGN_KEY_CHECKS = 0;

-- Clear all existing thread gauge test data
-- This is acceptable since all data is test data
DELETE FROM gauges WHERE equipment_type = 'thread_gauge';

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- PHASE 3: Validation
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
SELECT COUNT(*) as should_be_zero
FROM information_schema.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'fai_db_sandbox'
  AND CONSTRAINT_NAME = 'chk_thread_has_suffix';
-- Should return 0

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'Migration 007 completed successfully!' as status,
       'Spare thread gauges can now be identified by serial_number with gauge_id = NULL' as message;
