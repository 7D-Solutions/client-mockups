-- ============================================================================
-- Migration 006: Add pending_release Status
-- Date: 2025-10-25
-- Description: Add pending_release status for calibration workflow Step 6
-- ============================================================================

-- CONTEXT:
-- Migration 005 added out_for_calibration and pending_certificate for Steps 3-4
-- of the calibration workflow, but missed pending_release for Step 6.
--
-- This migration adds the missing status value to complete the calibration workflow:
--   Step 4: Receive gauge → pending_certificate
--   Step 5: Upload certificate (handled by CertificateService)
--   Step 6: Verify certificate → pending_release (THIS STATUS)
--   Step 7: Verify location → available

-- ============================================================================
-- STATUS ENUM UPDATE
-- ============================================================================

-- Add pending_release status value
ALTER TABLE gauges
MODIFY COLUMN status ENUM(
  'available',
  'checked_out',
  'calibration_due',
  'pending_qc',
  'out_of_service',
  'pending_unseal',
  'retired',
  'out_for_calibration',      -- Step 3: Sent to calibration
  'pending_certificate',       -- Step 4: Returned from calibration, awaiting certificate
  'pending_release',           -- Step 6: Certificate verified, awaiting location verification
  'returned'                   -- Customer gauge returned
) DEFAULT 'available';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify status enum includes pending_release
SELECT COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'fai_db_sandbox'
AND TABLE_NAME = 'gauges'
AND COLUMN_NAME = 'status';

-- Expected result:
-- enum('available','checked_out','calibration_due','pending_qc','out_of_service',
--      'pending_unseal','retired','out_for_calibration','pending_certificate',
--      'pending_release','returned')

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

/*
-- Revert to migration 005 status enum
ALTER TABLE gauges
MODIFY COLUMN status ENUM(
  'available',
  'checked_out',
  'calibration_due',
  'pending_qc',
  'out_of_service',
  'pending_unseal',
  'retired',
  'out_for_calibration',
  'pending_certificate',
  'returned'
) DEFAULT 'available';
*/

-- ============================================================================
-- NOTES
-- ============================================================================

-- Migration Status: READY FOR APPLICATION
-- Dependencies:
--   - Migration 005 must be applied first
--
-- Impact:
--   - Completes calibration workflow status chain
--   - Enables CalibrationWorkflowService.verifyCertificates() functionality
--
-- Related Code:
--   - CalibrationWorkflowService.js lines 178, 184, 224-227
--   - ADDENDUM lines 1093-1100 (Step 6-7 of calibration workflow)
