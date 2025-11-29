-- Migration 017: Drop triggers referencing removed columns
-- Date: 2025-01-29
-- Purpose: Remove triggers that reference gauge_suffix, system_gauge_id, serial_number, companion_gauge_id

-- Drop the actual triggers that reference old columns
DROP TRIGGER IF EXISTS trg_auto_suffix_insert;
DROP TRIGGER IF EXISTS trg_auto_suffix_update;

-- Drop any other triggers that might exist
DROP TRIGGER IF EXISTS gauges_before_insert;
DROP TRIGGER IF EXISTS gauges_before_update;
DROP TRIGGER IF EXISTS gauges_after_insert;
DROP TRIGGER IF EXISTS gauges_after_update;
DROP TRIGGER IF EXISTS validate_gauge_suffix;
DROP TRIGGER IF EXISTS validate_companion_pairing;
DROP TRIGGER IF EXISTS check_gauge_suffix;
DROP TRIGGER IF EXISTS check_serial_number;
DROP TRIGGER IF EXISTS check_system_gauge_id;

-- List any remaining triggers for verification
SHOW TRIGGERS WHERE `Table` = 'gauges';
