-- Add tolerance specification field to hand tool specifications
-- This stores the acceptable deviation for calibration measurements

ALTER TABLE gauge_hand_tool_specifications
ADD COLUMN tolerance DECIMAL(10,6) NULL COMMENT 'Acceptable deviation for calibration (e.g., 0.001 for ±0.001")' AFTER resolution;

-- Set default tolerances based on common industry standards
-- These can be updated per tool as needed
UPDATE gauge_hand_tool_specifications
SET tolerance = CASE
  WHEN tool_type = 'caliper' AND format = 'digital' THEN 0.001
  WHEN tool_type = 'caliper' AND format = 'dial' THEN 0.001
  WHEN tool_type = 'micrometer' AND format = 'digital' THEN 0.0001
  WHEN tool_type = 'micrometer' AND format = 'dial' THEN 0.0001
  WHEN tool_type = 'depth_gauge' THEN 0.001
  WHEN tool_type = 'bore_gauge' THEN 0.0005
  ELSE 0.001
END
WHERE tolerance IS NULL;

-- Add index for tolerance lookups
CREATE INDEX idx_tolerance ON gauge_hand_tool_specifications(tolerance);
