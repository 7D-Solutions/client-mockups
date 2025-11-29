-- ============================================================================
-- Migration 011: Complete certificates table schema
-- ============================================================================
-- Adds missing supersession tracking fields
-- Prevents data corruption with database constraint
--
-- CRITICAL: Steps must execute in this order to prevent constraint violations
-- ============================================================================

-- Step 1: Add columns with DEFAULT 0 (prevents duplicate current markers)
ALTER TABLE certificates
  ADD COLUMN is_current BOOLEAN NOT NULL DEFAULT 0
    COMMENT 'Whether this is the current active certificate',

  ADD COLUMN superseded_at DATETIME NULL
    COMMENT 'When this certificate was replaced',

  ADD COLUMN superseded_by INT NULL
    COMMENT 'ID of certificate that replaced this one';

-- Step 2: Add foreign key for supersession chain
ALTER TABLE certificates
  ADD CONSTRAINT fk_superseded_by
  FOREIGN KEY (superseded_by) REFERENCES certificates(id)
  ON DELETE SET NULL;

-- Step 3: Backfill BEFORE adding constraint
-- Mark all as non-current first
UPDATE certificates SET is_current = 0;

-- Then mark only the most recent per gauge as current
UPDATE certificates c1
INNER JOIN (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY gauge_id ORDER BY uploaded_at DESC) as rn
  FROM certificates
) ranked ON c1.id = ranked.id AND ranked.rn = 1
SET c1.is_current = 1;

-- Step 4: NOW add generated column (data is clean)
ALTER TABLE certificates
  ADD COLUMN current_marker VARCHAR(50) GENERATED ALWAYS AS (
    CASE WHEN is_current = 1 THEN CONCAT('G', gauge_id, '_CURRENT') ELSE NULL END
  ) STORED
  COMMENT 'Helper for enforcing one current certificate per gauge constraint';

-- Step 5: NOW add constraint (safe - no duplicates exist)
CREATE UNIQUE INDEX idx_one_current_per_gauge ON certificates(current_marker);

-- Step 6: Add performance indexes
CREATE INDEX idx_gauge_lookup ON certificates(gauge_id, uploaded_at DESC);
CREATE INDEX idx_superseded_by ON certificates(superseded_by);

-- Step 7: Verify migration success
SELECT
  COUNT(*) as total_certificates,
  SUM(CASE WHEN is_current = 1 THEN 1 ELSE 0 END) as current_certificates,
  COUNT(DISTINCT gauge_id) as gauges_with_certificates
FROM certificates;

-- Expected: current_certificates should equal gauges_with_certificates
-- If not equal, migration failed - investigate before proceeding
