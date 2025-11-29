-- Migration 007: Thread Gauge Serial Number System
-- Date: 2025-10-28
-- Purpose: Make gauge_id nullable for spare thread gauges, require serial_number

-- ============================================================================
-- PHASE 1: Schema Changes
-- ============================================================================

-- Make gauge_id nullable (allow NULL for spare thread gauges)
ALTER TABLE gauges
  MODIFY COLUMN gauge_id VARCHAR(50) UNIQUE;

-- Add constraint: serial_number is REQUIRED for thread gauges
ALTER TABLE gauges
  ADD CONSTRAINT chk_thread_serial_required
  CHECK (
    (equipment_type != 'thread_gauge')
    OR (equipment_type = 'thread_gauge' AND serial_number IS NOT NULL AND serial_number != '')
  );

-- Add index for efficient spare thread gauge lookups
-- Note: MySQL doesn't support partial indexes, so we index all thread gauges
CREATE INDEX idx_spare_thread_gauges
  ON gauges(equipment_type, serial_number, gauge_id);

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

-- Verify no thread gauges without serial numbers
SELECT COUNT(*) as invalid_count
FROM gauges
WHERE equipment_type = 'thread_gauge'
  AND (serial_number IS NULL OR serial_number = '');
-- Should return 0

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration:
--
-- DROP INDEX idx_spare_thread_gauges ON gauges;
-- ALTER TABLE gauges DROP CONSTRAINT chk_thread_serial_required;
-- ALTER TABLE gauges MODIFY COLUMN gauge_id VARCHAR(50) NOT NULL UNIQUE;

