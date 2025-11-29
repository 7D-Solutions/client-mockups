-- ============================================================================
-- Migration 018: Populate Missing gauge_id Values
-- ============================================================================
-- Date: 2025-10-29
-- Purpose: Populate gauge_id for any existing gauges that don't have one
-- 
-- Problem: Migration 016 TRUNCATED all gauge data assuming it would be recreated
-- Solution: Generate gauge_id values for any gauges missing them
--
-- Logic:
-- 1. For thread gauges with set_id: Use set_id + suffix (A/B based on is_go_gauge)
-- 2. For thread gauges without set_id: Generate unique ID like "TG" + AUTO_INCREMENT
-- 3. For hand tools: Generate unique ID like "HT" + AUTO_INCREMENT  
-- 4. For large equipment: Generate unique ID like "LE" + AUTO_INCREMENT
-- 5. For calibration standards: Generate unique ID like "CS" + AUTO_INCREMENT
-- ============================================================================

-- Enable safe updates
SET sql_safe_updates = 0;

-- Step 1: Handle thread gauges WITH set_id (gauge sets)
-- Determine suffix from is_go_gauge in gauge_thread_specifications
UPDATE gauges g
INNER JOIN gauge_thread_specifications gts ON g.id = gts.gauge_id
SET g.gauge_id = CONCAT(
  g.set_id,
  CASE WHEN gts.is_go_gauge = 1 THEN 'A' ELSE 'B' END
)
WHERE g.equipment_type = 'thread_gauge'
  AND g.set_id IS NOT NULL
  AND (g.gauge_id IS NULL OR g.gauge_id = '' OR g.gauge_id = 'S/N');

-- Step 2: Handle thread gauges WITHOUT set_id (single gauges)
-- Generate unique IDs using a counter
SET @thread_counter = (
  SELECT COALESCE(MAX(CAST(SUBSTRING(gauge_id, 3) AS UNSIGNED)), 0)
  FROM gauges
  WHERE equipment_type = 'thread_gauge'
    AND gauge_id LIKE 'TG%'
);

UPDATE gauges
SET gauge_id = CONCAT('TG', LPAD(@thread_counter := @thread_counter + 1, 5, '0'))
WHERE equipment_type = 'thread_gauge'
  AND set_id IS NULL
  AND (gauge_id IS NULL OR gauge_id = '' OR gauge_id = 'S/N');

-- Step 3: Handle hand tools
SET @hand_tool_counter = (
  SELECT COALESCE(MAX(CAST(SUBSTRING(gauge_id, 3) AS UNSIGNED)), 0)
  FROM gauges
  WHERE equipment_type = 'hand_tool'
    AND gauge_id LIKE 'HT%'
);

UPDATE gauges
SET gauge_id = CONCAT('HT', LPAD(@hand_tool_counter := @hand_tool_counter + 1, 5, '0'))
WHERE equipment_type = 'hand_tool'
  AND (gauge_id IS NULL OR gauge_id = '' OR gauge_id = 'S/N');

-- Step 4: Handle large equipment
SET @large_eq_counter = (
  SELECT COALESCE(MAX(CAST(SUBSTRING(gauge_id, 3) AS UNSIGNED)), 0)
  FROM gauges
  WHERE equipment_type = 'large_equipment'
    AND gauge_id LIKE 'LE%'
);

UPDATE gauges
SET gauge_id = CONCAT('LE', LPAD(@large_eq_counter := @large_eq_counter + 1, 5, '0'))
WHERE equipment_type = 'large_equipment'
  AND (gauge_id IS NULL OR gauge_id = '' OR gauge_id = 'S/N');

-- Step 5: Handle calibration standards
SET @cal_std_counter = (
  SELECT COALESCE(MAX(CAST(SUBSTRING(gauge_id, 3) AS UNSIGNED)), 0)
  FROM gauges
  WHERE equipment_type = 'calibration_standard'
    AND gauge_id LIKE 'CS%'
);

UPDATE gauges
SET gauge_id = CONCAT('CS', LPAD(@cal_std_counter := @cal_std_counter + 1, 5, '0'))
WHERE equipment_type = 'calibration_standard'
  AND (gauge_id IS NULL OR gauge_id = '' OR gauge_id = 'S/N');

-- Step 6: Verify all gauges have gauge_id
SELECT 
  COUNT(*) as gauges_missing_id
FROM gauges
WHERE gauge_id IS NULL OR gauge_id = '' OR gauge_id = 'S/N';

-- Restore safe updates
SET sql_safe_updates = 1;

-- Done!
