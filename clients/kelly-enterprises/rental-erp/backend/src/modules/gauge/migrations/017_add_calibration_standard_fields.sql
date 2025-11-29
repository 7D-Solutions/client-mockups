-- Migration 017: Add missing calibration standard specification fields
-- Date: 2025-11-07
-- Purpose: Fix critical data loss bug - add missing columns for calibration standard compliance
-- Related: CalibrationStandardForm.tsx, ISO 17025 compliance requirements
--
-- ISSUE: CalibrationStandardForm collects 5 fields but only 2 are stored in database
-- IMPACT: Users enter critical compliance data that is silently lost after submission
-- SOLUTION: Add 3 missing database columns to persist all required calibration data

-- ============================================================================
-- PHASE 1: Add missing columns to gauge_calibration_standard_specifications
-- ============================================================================

-- Add certification_number - Required for ISO 17025 compliance
ALTER TABLE gauge_calibration_standard_specifications
ADD COLUMN certification_number VARCHAR(100) NULL
COMMENT 'Certificate number from calibration lab (e.g., NIST-123456, CAL-2023-001)';

-- Add actual_certified_value - Actual measured value from calibration certificate
ALTER TABLE gauge_calibration_standard_specifications
ADD COLUMN actual_certified_value DECIMAL(15,6) NULL
COMMENT 'Actual certified value from calibration lab (may differ slightly from nominal)';

-- Add temperature_requirements - Environmental conditions for accurate measurement
ALTER TABLE gauge_calibration_standard_specifications
ADD COLUMN temperature_requirements VARCHAR(100) NULL
COMMENT 'Required temperature conditions (e.g., 20°C ± 0.5°C, 68°F ± 1°F)';

-- ============================================================================
-- PHASE 2: Add index for certification_number lookups
-- ============================================================================

-- Index for certificate number searches (used in compliance audits)
CREATE INDEX idx_certification_number ON gauge_calibration_standard_specifications(certification_number);

-- ============================================================================
-- PHASE 3: Validation
-- ============================================================================

-- Verify all columns were added successfully
SELECT
  COLUMN_NAME,
  DATA_TYPE,
  CHARACTER_MAXIMUM_LENGTH,
  NUMERIC_PRECISION,
  NUMERIC_SCALE,
  IS_NULLABLE,
  COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
  AND TABLE_NAME = 'gauge_calibration_standard_specifications'
  AND COLUMN_NAME IN ('certification_number', 'actual_certified_value', 'temperature_requirements')
ORDER BY ORDINAL_POSITION;

-- Expected results:
-- certification_number       | varchar | 100  | NULL | NULL | YES | Certificate number from calibration lab...
-- actual_certified_value     | decimal | NULL | 15   | 6    | YES | Actual certified value from calibration lab...
-- temperature_requirements   | varchar | 100  | NULL | NULL | YES | Required temperature conditions...

-- Verify table structure
DESCRIBE gauge_calibration_standard_specifications;

-- ============================================================================
-- NOTES
-- ============================================================================

-- Frontend Field Mapping (CalibrationStandardForm.tsx):
-- - formData.certification_number  → certification_number
-- - formData.actual_value           → actual_certified_value
-- - formData.temperature_requirements → temperature_requirements
-- - formData.accuracy_value         → uncertainty (already exists)
-- - formData.nominal_value          → nominal_value (already exists)

-- Backend Changes Required After This Migration:
-- 1. Update routes/gauges-v2.js validation schema to include new fields
-- 2. Update GaugeDTOMapper to map actual_value → actual_certified_value
-- 3. Update GaugeRepository to handle new fields in INSERT/UPDATE
-- 4. Test end-to-end calibration standard creation workflow

-- ISO 17025 Compliance Impact:
-- ✅ Certification number - Required for traceability chain
-- ✅ Actual certified value - Required for measurement accuracy documentation
-- ✅ Temperature requirements - Required for environmental controls documentation

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration:
-- DROP INDEX idx_certification_number ON gauge_calibration_standard_specifications;
-- ALTER TABLE gauge_calibration_standard_specifications DROP COLUMN temperature_requirements;
-- ALTER TABLE gauge_calibration_standard_specifications DROP COLUMN actual_certified_value;
-- ALTER TABLE gauge_calibration_standard_specifications DROP COLUMN certification_number;

-- WARNING: Rollback will permanently delete all data in these columns
