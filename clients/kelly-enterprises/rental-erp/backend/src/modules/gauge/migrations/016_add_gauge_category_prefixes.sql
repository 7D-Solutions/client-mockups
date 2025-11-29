-- Migration 016: Add prefix column to gauge_categories and populate with default prefixes
-- Date: 2025-11-06
-- Purpose: Enable customizable gauge IDs for all gauge types (thread gauges, hand tools, large equipment, calibration standards)
-- Related: GAUGE_STANDARDIZATION_MASTER_SPEC.md

-- ============================================================================
-- PHASE 1: Add prefix column to gauge_categories
-- ============================================================================

ALTER TABLE gauge_categories
ADD COLUMN prefix VARCHAR(4) NULL COMMENT 'ID prefix for this category (e.g., SP, CA, MI, LE, CS)';

-- ============================================================================
-- PHASE 2: Populate prefixes for existing categories
-- ============================================================================

-- Thread Gauge Prefixes
UPDATE gauge_categories SET prefix = 'SP' WHERE equipment_type = 'thread_gauge' AND category_name = 'Standard';
UPDATE gauge_categories SET prefix = 'MP' WHERE equipment_type = 'thread_gauge' AND category_name = 'Metric';
UPDATE gauge_categories SET prefix = 'AC' WHERE equipment_type = 'thread_gauge' AND category_name = 'ACME';
UPDATE gauge_categories SET prefix = 'NPT' WHERE equipment_type = 'thread_gauge' AND category_name = 'NPT';
UPDATE gauge_categories SET prefix = 'ST' WHERE equipment_type = 'thread_gauge' AND category_name = 'STI';
UPDATE gauge_categories SET prefix = 'SL' WHERE equipment_type = 'thread_gauge' AND category_name = 'Spiralock';

-- Hand Tool Prefixes
UPDATE gauge_categories SET prefix = 'CA' WHERE equipment_type = 'hand_tool' AND category_name = 'Caliper';
UPDATE gauge_categories SET prefix = 'MI' WHERE equipment_type = 'hand_tool' AND category_name = 'Micrometer';
UPDATE gauge_categories SET prefix = 'DG' WHERE equipment_type = 'hand_tool' AND category_name = 'Depth Gauge';
UPDATE gauge_categories SET prefix = 'BG' WHERE equipment_type = 'hand_tool' AND category_name = 'Bore Gauge';

-- Large Equipment Prefix (unified for all types)
UPDATE gauge_categories SET prefix = 'LE' WHERE equipment_type = 'large_equipment';

-- Calibration Standard Prefix (unified for all types)
UPDATE gauge_categories SET prefix = 'CS' WHERE equipment_type = 'calibration_standard';

-- ============================================================================
-- PHASE 3: Make prefix column NOT NULL and add constraints
-- ============================================================================

-- Verify all rows have prefixes
SELECT category_name, equipment_type, prefix
FROM gauge_categories
WHERE prefix IS NULL;
-- Should return 0 rows

-- Make prefix NOT NULL and add unique constraint
ALTER TABLE gauge_categories
MODIFY COLUMN prefix VARCHAR(4) NOT NULL,
ADD CONSTRAINT chk_prefix_format CHECK (LENGTH(prefix) BETWEEN 2 AND 4 AND prefix REGEXP '^[A-Z]+$'),
ADD UNIQUE KEY unique_prefix (prefix);

-- ============================================================================
-- PHASE 4: Initialize gauge_id_config for each category
-- ============================================================================

-- Insert configurations for each category that doesn't already have one
INSERT IGNORE INTO gauge_id_config (category_id, gauge_type, prefix, current_sequence)
SELECT
  gc.id as category_id,
  CASE
    WHEN gc.equipment_type = 'thread_gauge' THEN 'plug'
    ELSE NULL
  END as gauge_type,
  gc.prefix,
  0 as current_sequence
FROM gauge_categories gc
WHERE gc.equipment_type IN ('hand_tool', 'large_equipment', 'calibration_standard')
   OR (gc.equipment_type = 'thread_gauge' AND gc.category_name NOT IN ('Standard', 'Metric'));

-- For Standard and Metric thread gauges, add both plug and ring configurations
INSERT IGNORE INTO gauge_id_config (category_id, gauge_type, prefix, current_sequence)
SELECT gc.id, 'plug', CONCAT(gc.prefix, 'P'), 0
FROM gauge_categories gc
WHERE gc.equipment_type = 'thread_gauge' AND gc.category_name IN ('Standard', 'Metric');

INSERT IGNORE INTO gauge_id_config (category_id, gauge_type, prefix, current_sequence)
SELECT gc.id, 'ring', CONCAT(gc.prefix, 'R'), 0
FROM gauge_categories gc
WHERE gc.equipment_type = 'thread_gauge' AND gc.category_name IN ('Standard', 'Metric');

-- ============================================================================
-- PHASE 5: Validation
-- ============================================================================

-- Verify all categories have prefixes
SELECT
  equipment_type,
  category_name,
  prefix,
  (SELECT COUNT(*) FROM gauge_id_config WHERE category_id = gc.id) as config_count
FROM gauge_categories gc
ORDER BY equipment_type, display_order;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration:
-- DROP INDEX unique_prefix ON gauge_categories;
-- ALTER TABLE gauge_categories DROP CONSTRAINT chk_prefix_format;
-- ALTER TABLE gauge_categories DROP COLUMN prefix;
-- DELETE FROM gauge_id_config WHERE category_id IN (SELECT id FROM gauge_categories WHERE equipment_type IN ('hand_tool', 'large_equipment', 'calibration_standard'));
