-- Migration 008: Remove UNIQUE constraint from gauge_id
-- Date: 2025-10-28
-- Purpose: Allow multiple gauges to share the same gauge_id (for sets)
-- This is required for the serial number system where paired gauges share a set ID

-- Drop all UNIQUE constraints on gauge_id
ALTER TABLE gauges DROP INDEX gauge_id;
ALTER TABLE gauges DROP INDEX gauge_id_2;
ALTER TABLE gauges DROP INDEX gauge_id_3;

-- Add a regular (non-unique) index for performance
CREATE INDEX idx_gauge_id ON gauges(gauge_id);

-- Verify changes
SELECT COUNT(*) as gauge_id_unique_constraints
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'fai_db_sandbox'
  AND TABLE_NAME = 'gauges'
  AND CONSTRAINT_NAME LIKE '%gauge_id%'
  AND CONSTRAINT_TYPE = 'UNIQUE';
-- Should return 0

SELECT 'Migration 008 completed successfully!' as status;
