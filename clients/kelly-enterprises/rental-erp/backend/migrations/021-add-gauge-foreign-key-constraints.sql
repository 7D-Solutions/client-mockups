-- Migration: Add Foreign Key Constraints for Gauge Tables
-- Purpose: Prevent orphaned records when gauges are deleted
-- Date: 2025-11-05
--
-- This migration adds ON DELETE CASCADE constraints to ensure
-- related records are automatically deleted when a gauge is removed.
--
-- IMPORTANT: Run this AFTER cleaning up orphaned records

-- Add foreign key to gauge_thread_specifications
-- First check if the constraint already exists
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'gauge_thread_specifications'
    AND CONSTRAINT_NAME = 'fk_thread_spec_gauge_id'
);

-- Only add if it doesn't exist
SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE gauge_thread_specifications
     ADD CONSTRAINT fk_thread_spec_gauge_id
     FOREIGN KEY (gauge_id) REFERENCES gauges(id)
     ON DELETE CASCADE',
    'SELECT "Foreign key fk_thread_spec_gauge_id already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key to gauge_calibration_schedule
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'gauge_calibration_schedule'
    AND CONSTRAINT_NAME = 'fk_calib_schedule_gauge_id'
);

SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE gauge_calibration_schedule
     ADD CONSTRAINT fk_calib_schedule_gauge_id
     FOREIGN KEY (gauge_id) REFERENCES gauges(id)
     ON DELETE CASCADE',
    'SELECT "Foreign key fk_calib_schedule_gauge_id already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key to gauge_active_checkouts
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'gauge_active_checkouts'
    AND CONSTRAINT_NAME = 'fk_active_checkout_gauge_id'
);

SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE gauge_active_checkouts
     ADD CONSTRAINT fk_active_checkout_gauge_id
     FOREIGN KEY (gauge_id) REFERENCES gauges(id)
     ON DELETE CASCADE',
    'SELECT "Foreign key fk_active_checkout_gauge_id already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes to improve foreign key lookup performance
CREATE INDEX IF NOT EXISTS idx_thread_spec_gauge_id ON gauge_thread_specifications(gauge_id);
CREATE INDEX IF NOT EXISTS idx_calib_schedule_gauge_id ON gauge_calibration_schedule(gauge_id);
CREATE INDEX IF NOT EXISTS idx_active_checkout_gauge_id ON gauge_active_checkouts(gauge_id);

-- Verification query
SELECT
    CONSTRAINT_NAME,
    TABLE_NAME,
    CONSTRAINT_TYPE,
    REFERENCED_TABLE_NAME
FROM information_schema.TABLE_CONSTRAINTS tc
WHERE tc.CONSTRAINT_SCHEMA = DATABASE()
AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
AND (tc.TABLE_NAME IN ('gauge_thread_specifications', 'gauge_calibration_schedule', 'gauge_active_checkouts'))
ORDER BY tc.TABLE_NAME;
