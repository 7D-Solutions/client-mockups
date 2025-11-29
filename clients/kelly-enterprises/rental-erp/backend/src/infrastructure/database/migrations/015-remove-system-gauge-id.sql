-- Migration 015: Remove redundant system_gauge_id column
-- This column duplicates the gauge_id value and serves no purpose
-- All APIs will now use gauge_id as the public identifier

-- Drop the redundant column
ALTER TABLE gauges DROP COLUMN system_gauge_id;

-- Ensure gauge_id is properly indexed and unique
ALTER TABLE gauges
  MODIFY COLUMN gauge_id VARCHAR(50) NOT NULL,
  ADD UNIQUE INDEX idx_gauge_id_unique (gauge_id);

-- Add comment for clarity
ALTER TABLE gauges
  COMMENT = 'Gauges table - Uses integer id for FK relationships, gauge_id for public API';
