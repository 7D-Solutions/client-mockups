-- ============================================================================
-- Migration: 002_gauge_set_constraints.sql
-- Purpose: Add constraints, triggers, and indexes for gauge set system
-- Status: READY FOR DEPLOYMENT
-- Date: October 2024
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PHASE 1: CHECK CONSTRAINTS
-- ----------------------------------------------------------------------------

-- Constraint: Thread gauges must have valid suffix (A, B, or NULL for NPT)
ALTER TABLE gauges ADD CONSTRAINT chk_thread_has_suffix CHECK (
  (equipment_type != 'thread_gauge') OR
  (equipment_type = 'thread_gauge' AND gauge_suffix IN ('A', 'B', NULL))
);

-- Constraint: Suffix must match system_gauge_id ending
-- Example: system_gauge_id 'SP0001A' must have gauge_suffix 'A'
ALTER TABLE gauges ADD CONSTRAINT chk_suffix_matches_id CHECK (
  gauge_suffix IS NULL OR
  system_gauge_id LIKE CONCAT('%', gauge_suffix)
);

-- Constraint: Companion relationship must be bidirectional
-- If gauge A points to gauge B, then gauge B must point to gauge A
ALTER TABLE gauges ADD CONSTRAINT chk_bidirectional_companion CHECK (
  companion_gauge_id IS NULL OR
  EXISTS (
    SELECT 1 FROM gauges g2
    WHERE g2.id = gauges.companion_gauge_id
    AND g2.companion_gauge_id = gauges.id
  )
);

-- Constraint: NPT gauges cannot have companions
-- NPT (National Pipe Thread) gauges are single gauges, not sets
ALTER TABLE gauges ADD CONSTRAINT chk_npt_no_companion CHECK (
  category_id != (SELECT id FROM gauge_categories WHERE name = 'NPT') OR
  companion_gauge_id IS NULL
);

-- ----------------------------------------------------------------------------
-- PHASE 2: TRIGGERS
-- ----------------------------------------------------------------------------

-- Trigger: Ensure bidirectional companion updates
-- When gauge A is linked to gauge B, automatically link B back to A
DELIMITER $$
CREATE TRIGGER trg_companion_bidirectional
AFTER UPDATE ON gauges
FOR EACH ROW
BEGIN
  IF NEW.companion_gauge_id IS NOT NULL AND NEW.companion_gauge_id != OLD.companion_gauge_id THEN
    -- Update the companion to point back
    UPDATE gauges
    SET companion_gauge_id = NEW.id
    WHERE id = NEW.companion_gauge_id
    AND companion_gauge_id != NEW.id;
  END IF;
END$$
DELIMITER ;

-- Trigger: Auto-populate gauge_suffix from system_gauge_id
-- Extracts suffix from ID string (e.g., 'SP0001A' → 'A')
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

-- Trigger: Auto-populate gauge_suffix on update as well
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
-- PHASE 3: INDEXES FOR PERFORMANCE
-- ----------------------------------------------------------------------------

-- Index: Find companion pairs efficiently
-- Used by: Gauge detail views, set management queries
CREATE INDEX idx_companion_gauge_id ON gauges(companion_gauge_id);

-- Index: Find gauges by suffix
-- Used by: Spare queries filtered by GO (A) or NO GO (B)
CREATE INDEX idx_gauge_suffix ON gauges(gauge_suffix);

-- Composite index: Optimize spare lookup queries
-- Used by: Spare inventory panel with filters
-- Query pattern: WHERE equipment_type = 'thread_gauge' AND gauge_suffix = 'A' AND companion_gauge_id IS NULL AND status = 'available'
CREATE INDEX idx_spare_lookup ON gauges(equipment_type, gauge_suffix, companion_gauge_id, status);

-- Composite index: Optimize gauge set queries
-- Used by: Finding complete gauge sets by category
CREATE INDEX idx_gauge_set_lookup ON gauges(category_id, companion_gauge_id, status);

-- ----------------------------------------------------------------------------
-- PHASE 4: FIX EXISTING DATA (IF SALVAGEABLE)
-- ----------------------------------------------------------------------------

-- Populate gauge_suffix from system_gauge_id for existing records
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

-- NOTE: Companion relationships will remain NULL for existing data
-- They need to be re-created through proper service layer

-- ----------------------------------------------------------------------------
-- VALIDATION QUERIES
-- ----------------------------------------------------------------------------

-- Validate: All thread gauges should have suffix
SELECT
  'VALIDATION: Thread gauges without suffix' as check_name,
  COUNT(*) as violation_count
FROM gauges
WHERE equipment_type = 'thread_gauge'
  AND gauge_suffix IS NULL;
-- Expected: 0 (after migration)

-- Validate: All companion relationships should be bidirectional
SELECT
  'VALIDATION: One-way companion relationships' as check_name,
  COUNT(*) as violation_count
FROM gauges g1
WHERE companion_gauge_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM gauges g2
    WHERE g2.id = g1.companion_gauge_id
    AND g2.companion_gauge_id = g1.id
  );
-- Expected: 0 (always, enforced by trigger)

-- Validate: Suffix matches system_gauge_id
SELECT
  'VALIDATION: Suffix mismatch with ID' as check_name,
  COUNT(*) as violation_count
FROM gauges
WHERE gauge_suffix IS NOT NULL
  AND system_gauge_id NOT LIKE CONCAT('%', gauge_suffix);
-- Expected: 0 (always, enforced by constraint)

-- Validate: NPT gauges without companions
SELECT
  'VALIDATION: NPT gauges with companions' as check_name,
  COUNT(*) as violation_count
FROM gauges g
JOIN gauge_categories c ON g.category_id = c.id
WHERE c.name = 'NPT'
  AND g.companion_gauge_id IS NOT NULL;
-- Expected: 0 (always, enforced by constraint)

-- ----------------------------------------------------------------------------
-- ROLLBACK SCRIPT (IN CASE OF ISSUES)
-- ----------------------------------------------------------------------------

/*
-- DROP CONSTRAINTS
ALTER TABLE gauges DROP CONSTRAINT chk_thread_has_suffix;
ALTER TABLE gauges DROP CONSTRAINT chk_suffix_matches_id;
ALTER TABLE gauges DROP CONSTRAINT chk_bidirectional_companion;
ALTER TABLE gauges DROP CONSTRAINT chk_npt_no_companion;

-- DROP TRIGGERS
DROP TRIGGER IF EXISTS trg_companion_bidirectional;
DROP TRIGGER IF EXISTS trg_auto_suffix_insert;
DROP TRIGGER IF EXISTS trg_auto_suffix_update;

-- DROP INDEXES
DROP INDEX idx_companion_gauge_id ON gauges;
DROP INDEX idx_gauge_suffix ON gauges;
DROP INDEX idx_spare_lookup ON gauges;
DROP INDEX idx_gauge_set_lookup ON gauges;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
