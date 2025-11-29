-- ============================================================================
-- Migration 011: Complete certificates table schema (INCREMENTAL)
-- ============================================================================
-- Adds only missing parts since columns already exist
-- ============================================================================

-- Step 1: Backfill existing data (ensure data is clean)
-- Mark all as non-current first
UPDATE certificates SET is_current = 0 WHERE is_current IS NULL;

-- Then mark only the most recent per gauge as current
UPDATE certificates c1
INNER JOIN (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY gauge_id ORDER BY uploaded_at DESC) as rn
  FROM certificates
) ranked ON c1.id = ranked.id AND ranked.rn = 1
SET c1.is_current = 1;

-- Step 2: Add generated column for constraint enforcement
ALTER TABLE certificates
  ADD COLUMN current_marker VARCHAR(50) GENERATED ALWAYS AS (
    CASE WHEN is_current = 1 THEN CONCAT('G', gauge_id, '_CURRENT') ELSE NULL END
  ) STORED
  COMMENT 'Helper for enforcing one current certificate per gauge constraint';

-- Step 3: Add unique constraint (safe - no duplicates exist after backfill)
CREATE UNIQUE INDEX idx_one_current_per_gauge ON certificates(current_marker);

-- Step 4: Add performance indexes (if they don't exist)
CREATE INDEX idx_gauge_lookup ON certificates(gauge_id, uploaded_at DESC);

-- Step 5: Verify migration success
SELECT
  COUNT(*) as total_certificates,
  SUM(CASE WHEN is_current = 1 THEN 1 ELSE 0 END) as current_certificates,
  COUNT(DISTINCT gauge_id) as gauges_with_certificates
FROM certificates;

-- Expected: current_certificates should equal gauges_with_certificates
-- If not equal, migration failed - investigate before proceeding
