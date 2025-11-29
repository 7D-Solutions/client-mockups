-- ============================================================================
-- Migration 004: Cleanup Duplicate Tables
-- Date: 2025-10-25
-- Description: Remove duplicate gauge_companion_history table
-- ============================================================================

-- CONTEXT:
-- The database had two companion history tables:
--   1. companion_history (active, 96 records) - used by GaugeSetRepository
--   2. gauge_companion_history (duplicate, 0 records) - unused
--
-- This migration removes the duplicate table to eliminate confusion and
-- maintain a clean database schema.

-- ============================================================================
-- CLEANUP OPERATIONS
-- ============================================================================

-- 1. Create backup of gauge_companion_history (already executed)
-- This was done programmatically before dropping the table
-- CREATE TABLE gauge_companion_history_backup AS SELECT * FROM gauge_companion_history;

-- 2. Drop duplicate table (already executed)
-- DROP TABLE IF EXISTS gauge_companion_history;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify only companion_history remains
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME,
    UPDATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME LIKE '%companion%'
ORDER BY TABLE_NAME;

-- Expected result:
-- companion_history              ~96 rows
-- gauge_companion_history_backup   0 rows

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration (restore gauge_companion_history):
-- CREATE TABLE gauge_companion_history AS SELECT * FROM gauge_companion_history_backup;
--
-- Note: This rollback is NOT recommended as the table was never used
-- and the active system uses companion_history exclusively.

-- ============================================================================
-- NOTES
-- ============================================================================

-- Migration Status: COMPLETED (2025-10-25)
-- Applied By: Automated cleanup script
-- Impact: None - table was empty and unused
-- Related: Phase 1-4 gauge set implementation uses companion_history
