-- Migration: Backfill inventory locations for existing gauges
-- Purpose: Populate inventory_current_locations with existing gauge data
-- Date: 2025-11-11
-- Related: Fixes 404 errors when fetching gauge inventory locations

-- =====================================================
-- STEP 1: Insert current locations for all gauges
-- =====================================================
-- Insert gauges that don't have inventory records yet
-- Use default location 'A1' for gauges without a known location
INSERT INTO inventory_current_locations (
  item_type,
  item_identifier,
  current_location,
  quantity,
  last_moved_at,
  last_moved_by
)
SELECT
  'gauge' as item_type,
  g.gauge_id COLLATE utf8mb4_0900_ai_ci as item_identifier,
  'A1' as current_location,  -- Default location for backfilled gauges
  1 as quantity,
  COALESCE(g.updated_at, g.created_at) as last_moved_at,
  717 as last_moved_by  -- System user (using first admin user)
FROM
  gauges g
WHERE
  g.is_deleted = 0
  -- Only insert if not already in inventory
  AND NOT EXISTS (
    SELECT 1
    FROM inventory_current_locations icl
    WHERE icl.item_type = 'gauge'
      AND icl.item_identifier COLLATE utf8mb4_0900_ai_ci = g.gauge_id COLLATE utf8mb4_0900_ai_ci
  );

-- =====================================================
-- STEP 2: Create movement history records
-- =====================================================
-- Create historical 'created' movement records for backfilled gauges
INSERT INTO inventory_movements (
  movement_type,
  item_type,
  item_identifier,
  quantity,
  from_location,
  to_location,
  moved_by,
  moved_at,
  reason,
  notes
)
SELECT
  'created' as movement_type,
  'gauge' as item_type,
  g.gauge_id COLLATE utf8mb4_0900_ai_ci as item_identifier,
  1 as quantity,
  NULL as from_location,
  'A1' as to_location,  -- Default location for backfilled gauges
  717 as moved_by,  -- System user (using first admin user)
  COALESCE(g.created_at, NOW()) as moved_at,
  'Initial inventory location (backfilled)' as reason,
  CONCAT('Backfilled with default location A1 on ', DATE_FORMAT(NOW(), '%Y-%m-%d')) as notes
FROM
  gauges g
WHERE
  g.is_deleted = 0
  -- Only create movement for newly inserted inventory records
  AND EXISTS (
    SELECT 1
    FROM inventory_current_locations icl
    WHERE icl.item_type = 'gauge'
      AND icl.item_identifier COLLATE utf8mb4_0900_ai_ci = g.gauge_id COLLATE utf8mb4_0900_ai_ci
  )
  -- Don't duplicate if already has a created movement
  AND NOT EXISTS (
    SELECT 1
    FROM inventory_movements im
    WHERE im.item_type = 'gauge'
      AND im.item_identifier COLLATE utf8mb4_0900_ai_ci = g.gauge_id COLLATE utf8mb4_0900_ai_ci
      AND im.movement_type = 'created'
  );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the backfill was successful:
--
-- Count gauges with storage_location:
-- SELECT COUNT(*) as total_gauges_with_location
-- FROM gauges
-- WHERE storage_location IS NOT NULL AND storage_location != '';
--
-- Count gauges in inventory:
-- SELECT COUNT(*) as gauges_in_inventory
-- FROM inventory_current_locations
-- WHERE item_type = 'gauge';
--
-- Count created movement records:
-- SELECT COUNT(*) as gauge_created_movements
-- FROM inventory_movements
-- WHERE item_type = 'gauge' AND movement_type = 'created';
--
-- Sample of backfilled data:
-- SELECT * FROM inventory_current_locations WHERE item_type = 'gauge' LIMIT 10;
-- SELECT * FROM inventory_movements WHERE item_type = 'gauge' AND movement_type = 'created' LIMIT 10;
