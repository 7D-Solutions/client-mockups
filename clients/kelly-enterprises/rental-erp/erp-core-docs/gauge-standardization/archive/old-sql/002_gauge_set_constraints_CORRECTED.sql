-- ============================================================================
-- Migration: 002_gauge_set_constraints_CORRECTED.sql
-- Purpose: Add safe constraints, triggers, and indexes for gauge set system
-- Status: READY FOR DEPLOYMENT
-- Date: October 2024
-- IMPORTANT: Corrected version - fixes critical flaws in original proposal
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PHASE 1: SAFE CHECK CONSTRAINTS
-- ----------------------------------------------------------------------------

-- Constraint: Thread gauges must have valid suffix (A or B, NOT NULL)
-- CORRECTED: Removed NULL from allowed values
ALTER TABLE gauges ADD CONSTRAINT chk_thread_has_suffix CHECK (
  (equipment_type != 'thread_gauge') OR
  (gauge_suffix IN ('A', 'B'))  -- ✅ NOT NULL required for thread gauges
);

-- Constraint: Suffix must match system_gauge_id ending
ALTER TABLE gauges ADD CONSTRAINT chk_suffix_matches_id CHECK (
  gauge_suffix IS NULL OR
  system_gauge_id LIKE CONCAT('%', gauge_suffix)
);

-- NOTE: Bidirectional companion constraint REMOVED (architecturally impossible)
-- Reason: Cannot satisfy during gauge set creation - chicken-and-egg problem
-- Solution: Handle in application code with transaction

-- Constraint: NPT gauges cannot have companions
-- Alternative: Consider handling in application code if this causes issues
-- ALTER TABLE gauges ADD CONSTRAINT chk_npt_no_companion CHECK (
--   (equipment_type != 'thread_gauge') OR
--   (companion_gauge_id IS NOT NULL) OR
--   (category_id != (SELECT id FROM gauge_categories WHERE name = 'NPT' LIMIT 1))
-- );

-- Better approach: Handle NPT validation in domain model

-- ----------------------------------------------------------------------------
-- PHASE 2: SAFE TRIGGERS (Safety Net Only)
-- ----------------------------------------------------------------------------

-- NOTE: Bidirectional companion trigger REMOVED (recursion risk)
-- Reason: Trigger would fire recursively, causing infinite loop or errors
-- Solution: Handle bidirectional linking in service layer within transaction

-- Trigger: Auto-populate gauge_suffix as fallback (safety net)
-- This should rarely activate - service layer should set suffix explicitly
DELIMITER $$
CREATE TRIGGER trg_auto_suffix_insert
BEFORE INSERT ON gauges
FOR EACH ROW
BEGIN
  IF NEW.equipment_type = 'thread_gauge' AND NEW.gauge_suffix IS NULL THEN
    IF NEW.system_gauge_id LIKE '%A' THEN
      SET NEW.gauge_suffix = 'A';
    ELSEIF NEW.system_gauge_id LIKE '%B' THEN
      SET NEW.gauge_suffix = 'B';
    END IF;
  END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER trg_auto_suffix_update
BEFORE UPDATE ON gauges
FOR EACH ROW
BEGIN
  IF NEW.equipment_type = 'thread_gauge' AND NEW.gauge_suffix IS NULL THEN
    IF NEW.system_gauge_id LIKE '%A' THEN
      SET NEW.gauge_suffix = 'A';
    ELSEIF NEW.system_gauge_id LIKE '%B' THEN
      SET NEW.gauge_suffix = 'B';
    END IF;
  END IF;
END$$
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PHASE 3: PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

-- Index: Find companion pairs efficiently
CREATE INDEX idx_companion_gauge_id ON gauges(companion_gauge_id);

-- Index: Find gauges by suffix
CREATE INDEX idx_gauge_suffix ON gauges(gauge_suffix);

-- Composite index: Optimize spare lookup queries
CREATE INDEX idx_spare_lookup ON gauges(
  equipment_type,
  gauge_suffix,
  companion_gauge_id,
  status
);

-- Composite index: Optimize gauge set queries
CREATE INDEX idx_gauge_set_lookup ON gauges(
  category_id,
  companion_gauge_id,
  status
);

-- ----------------------------------------------------------------------------
-- PHASE 4: FIX EXISTING DATA
-- ----------------------------------------------------------------------------

-- Populate gauge_suffix for existing records
UPDATE gauges
SET gauge_suffix = 'A'
WHERE equipment_type = 'thread_gauge'
  AND gauge_suffix IS NULL
  AND system_gauge_id LIKE '%A';

UPDATE gauges
SET gauge_suffix = 'B'
WHERE equipment_type = 'thread_gauge'
  AND gauge_suffix IS NULL
  AND system_gauge_id LIKE '%B';

-- NOTE: Companion relationships remain NULL and must be re-created
-- through proper service layer with transactions

-- ----------------------------------------------------------------------------
-- VALIDATION QUERIES
-- ----------------------------------------------------------------------------

-- Validate: All thread gauges should have suffix
SELECT
  'Thread gauges without suffix' as check_name,
  COUNT(*) as violation_count
FROM gauges
WHERE equipment_type = 'thread_gauge'
  AND gauge_suffix IS NULL;
-- Expected: 0 after migration

-- Validate: Suffix matches system_gauge_id
SELECT
  'Suffix mismatch with ID' as check_name,
  COUNT(*) as violation_count
FROM gauges
WHERE gauge_suffix IS NOT NULL
  AND system_gauge_id NOT LIKE CONCAT('%', gauge_suffix);
-- Expected: 0 after migration

-- ----------------------------------------------------------------------------
-- ROLLBACK SCRIPT (IN CASE OF ISSUES)
-- ----------------------------------------------------------------------------

/*
-- DROP CONSTRAINTS
ALTER TABLE gauges DROP CONSTRAINT IF EXISTS chk_thread_has_suffix;
ALTER TABLE gauges DROP CONSTRAINT IF EXISTS chk_suffix_matches_id;

-- DROP TRIGGERS
DROP TRIGGER IF EXISTS trg_auto_suffix_insert;
DROP TRIGGER IF EXISTS trg_auto_suffix_update;

-- DROP INDEXES
DROP INDEX IF EXISTS idx_companion_gauge_id ON gauges;
DROP INDEX IF EXISTS idx_gauge_suffix ON gauges;
DROP INDEX IF EXISTS idx_spare_lookup ON gauges;
DROP INDEX IF EXISTS idx_gauge_set_lookup ON gauges;
*/

-- ============================================================================
-- KEY CHANGES FROM ORIGINAL PROPOSAL:
--
-- 1. REMOVED: chk_bidirectional_companion (architecturally impossible)
--    Problem: Chicken-and-egg - first UPDATE always fails CHECK
--    Solution: Handle in application code within transaction
--
-- 2. REMOVED: trg_companion_bidirectional (recursion risk)
--    Problem: Trigger fires recursively, infinite loop
--    Solution: Handle in service layer with explicit updates
--
-- 3. FIXED: chk_thread_has_suffix (now correctly excludes NULL)
--    Was: gauge_suffix IN ('A', 'B', NULL)
--    Now: gauge_suffix IN ('A', 'B')
--
-- 4. REMOVED: chk_npt_no_companion (performance and complexity)
--    Problem: Subquery on every INSERT/UPDATE
--    Solution: Handle in domain model validation
--
-- 5. KEPT: Auto-suffix triggers (safe as fallback)
--    Service layer should still set suffix explicitly
--
-- 6. KEPT: All performance indexes (safe and beneficial)
--
-- ============================================================================
-- WHY BIDIRECTIONAL CONSTRAINT IS IMPOSSIBLE:
--
-- Execution sequence during gauge set creation:
--
-- Step 1: INSERT GO gauge (id=1, companion_gauge_id=NULL)
--   → CHECK: companion_gauge_id IS NULL → ✅ PASS
--
-- Step 2: INSERT NO GO gauge (id=2, companion_gauge_id=NULL)
--   → CHECK: companion_gauge_id IS NULL → ✅ PASS
--
-- Step 3: UPDATE GO gauge SET companion_gauge_id = 2 WHERE id = 1
--   → CHECK: Does gauge 2 point back to gauge 1?
--   → Query: SELECT 1 FROM gauges WHERE id=2 AND companion_gauge_id=1
--   → Result: NO ROWS (gauge 2's companion_gauge_id is still NULL!)
--   → ❌ CONSTRAINT VIOLATION
--   → Transaction rolls back
--   → NO GAUGE SETS CAN BE CREATED
--
-- This is not a timing issue - it's architecturally impossible to satisfy.
-- We cannot set A→B and B→A simultaneously in SQL.
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
