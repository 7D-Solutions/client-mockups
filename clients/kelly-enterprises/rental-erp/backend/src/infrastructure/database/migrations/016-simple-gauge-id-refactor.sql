-- ============================================================================
-- Migration 016: Simple Gauge ID Refactor
-- ============================================================================
-- Date: 2025-01-29
-- Purpose: Simplify gauge identification system to use only gauge_id + set_id
-- Note: Test data will be deleted and recreated, no data migration needed
--
-- Changes:
-- 1. Delete all test gauge data
-- 2. set_id column already exists (skip)
-- 3. is_go_gauge already exists (skip)
-- 4. Add constraint: only thread gauges can have set_id
-- 5. Drop redundant columns: system_gauge_id, serial_number, companion_gauge_id, gauge_suffix
-- ============================================================================

-- Step 0: Delete all test data (disable foreign key checks temporarily)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE gauge_thread_specifications;
TRUNCATE TABLE gauge_hand_tool_specifications;
TRUNCATE TABLE gauge_large_equipment_specifications;
TRUNCATE TABLE gauge_calibration_standard_specifications;
TRUNCATE TABLE gauge_calibrations;
TRUNCATE TABLE gauge_qc_checks;
TRUNCATE TABLE gauge_transactions;
TRUNCATE TABLE gauge_active_checkouts;
TRUNCATE TABLE gauges;
SET FOREIGN_KEY_CHECKS = 1;

-- Step 1: Add constraint (thread gauges only)
-- Note: Using procedure to handle constraint already existing
DROP PROCEDURE IF EXISTS add_set_id_constraint;

DELIMITER //
CREATE PROCEDURE add_set_id_constraint()
BEGIN
  DECLARE CONTINUE HANDLER FOR 1061, 3822 BEGIN END; -- Ignore duplicate constraint errors
  ALTER TABLE gauges
    ADD CONSTRAINT chk_set_id_thread_only
      CHECK (set_id IS NULL OR equipment_type = 'thread_gauge');
END//
DELIMITER ;

CALL add_set_id_constraint();
DROP PROCEDURE IF EXISTS add_set_id_constraint;

-- Step 2: Drop constraints that reference columns we're removing
DROP PROCEDURE IF EXISTS drop_old_constraints;

DELIMITER //
CREATE PROCEDURE drop_old_constraints()
BEGIN
  DECLARE CONTINUE HANDLER FOR 3940, 1091 BEGIN END; -- Ignore constraint/key doesn't exist errors

  ALTER TABLE gauges DROP CONSTRAINT chk_suffix_matches_id;
  ALTER TABLE gauges DROP CONSTRAINT chk_thread_serial_required;
  ALTER TABLE gauges DROP FOREIGN KEY gauges_ibfk_2;
END//
DELIMITER ;

CALL drop_old_constraints();
DROP PROCEDURE IF EXISTS drop_old_constraints;

-- Step 3: Drop redundant columns
ALTER TABLE gauges
  DROP COLUMN system_gauge_id,
  DROP COLUMN serial_number,
  DROP COLUMN companion_gauge_id,
  DROP COLUMN gauge_suffix;

-- Step 4: Ensure gauge_id is required and unique
ALTER TABLE gauges MODIFY COLUMN gauge_id VARCHAR(50) NOT NULL;

-- Done!
