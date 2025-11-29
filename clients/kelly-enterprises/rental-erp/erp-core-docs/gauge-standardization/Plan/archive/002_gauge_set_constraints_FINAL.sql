-- ============================================================================
-- Migration: 002_gauge_set_constraints_FINAL.sql
-- Purpose: Safe constraints, triggers, and indexes for gauge set system
-- Status: READY FOR DEPLOYMENT
-- Consensus: All 3 architects approved
-- Date: 2025-10-24
-- ============================================================================
--
-- OVERVIEW:
-- This migration implements database-level validation and indexing for the
-- gauge set standardization system. It reflects consensus architectural
-- decisions documented in Architecture Decision Records (ADRs).
--
-- KEY ARCHITECTURAL DECISIONS:
-- - ADR-003: Bidirectional constraints/triggers REMOVED (impossible/risky)
-- - ADR-004: companion_history uses explicit go_gauge_id/nogo_gauge_id
-- - Application layer handles bidirectional linking with FOR UPDATE locks
--
-- SAFETY NOTES:
-- - All constraints are safe (no impossible chicken-and-egg scenarios)
-- - Triggers are defensive only (auto-populate suffix as fallback)
-- - Rollback script included below (commented out)
-- - Validation queries verify successful migration
--
-- DEPLOYMENT INSTRUCTIONS:
-- 1. Backup database before running
-- 2. Test on database copy first (see PHASE_0_STATUS.md)
-- 3. Execute during maintenance window
-- 4. Run validation queries to confirm success
-- 5. Monitor application logs after deployment
--
-- REFERENCES:
-- - ADR-001: Domain-Driven Design approach
-- - ADR-002: Explicit transaction pattern
-- - ADR-003: Remove bidirectional constraints
-- - ADR-004: Explicit companion_history schema
-- - ADR-005: FOR UPDATE locks with explicit isolation
-- - ADR-006: Retry logic with exponential backoff
-- - TRIGGER_VALIDATION_REPORT.md: Evidence for trigger removal
-- - UNIFIED_IMPLEMENTATION_PLAN.md: Complete implementation details
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PHASE 1: SAFE CHECK CONSTRAINTS
-- ----------------------------------------------------------------------------

-- Constraint: Thread gauges must have valid suffix (A or B, NOT NULL)
-- CORRECTED: Explicit NULL check to prevent SQL three-valued logic bug
-- Rationale: GO gauges always 'A', NO GO gauges always 'B'
-- Bug Fix: Added "IS NOT NULL" to prevent UNKNOWN from passing constraint
ALTER TABLE gauges ADD CONSTRAINT chk_thread_has_suffix CHECK (
  (equipment_type != 'thread_gauge') OR
  (gauge_suffix IS NOT NULL AND gauge_suffix IN ('A', 'B'))  -- ✅ Explicit NULL check
);

-- Constraint: Suffix must match system_gauge_id ending
-- Ensures data consistency between ID and suffix fields
ALTER TABLE gauges ADD CONSTRAINT chk_suffix_matches_id CHECK (
  gauge_suffix IS NULL OR
  system_gauge_id LIKE CONCAT('%', gauge_suffix)
);

-- ============================================================================
-- REMOVED CONSTRAINTS (with rationale):
--
-- 1. chk_bidirectional_companion - REMOVED
--    Reason: Mathematically impossible (chicken-and-egg problem)
--    Evidence: All 3 architects independently verified impossibility
--    Solution: Handle in application code with FOR UPDATE locks (ADR-003)
--
-- 2. chk_npt_no_companion - REMOVED
--    Reason: Domain rule, not database constraint (better in application)
--    Evidence: Business rules change, database constraints are rigid
--    Solution: Enforce in GaugeSet domain model with rich error messages
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PHASE 2: SAFETY NET TRIGGERS (Auto-populate suffix)
-- ----------------------------------------------------------------------------

-- ============================================================================
-- REMOVED TRIGGERS (with rationale):
--
-- trg_companion_bidirectional - REMOVED
--    Reason: Multiple critical issues identified
--    Issues:
--      - Test 2: Creates orphaned links when changing companions
--      - Test 3: Race conditions (no concurrency protection)
--      - Test 4: Recursion risk (especially with cleanup logic)
--      - Test 5: Performance impact (doubles write operations)
--    Evidence: TRIGGER_VALIDATION_REPORT.md (comprehensive analysis)
--    Risk: MEDIUM-HIGH (complexity, race conditions, orphaned links)
--    Solution: Application-layer bidirectional linking with transactions
-- ============================================================================

-- Trigger: Auto-populate suffix on INSERT
-- Defensive fallback if application code doesn't set suffix
DELIMITER $$
CREATE TRIGGER trg_auto_suffix_insert
BEFORE INSERT ON gauges
FOR EACH ROW
BEGIN
  IF NEW.equipment_type = 'thread_gauge' AND NEW.gauge_suffix IS NULL THEN
    IF NEW.system_gauge_id LIKE '%A' THEN
      SET NEW.gauge_suffix = 'A';
    ELSEIF NEW.system_gauge_id LIKE '%B' THEN
      SET NEW.gauge_suffix = 'B';
    END IF;
  END IF;
END$$
DELIMITER ;

-- Trigger: Auto-populate suffix on UPDATE
-- Defensive fallback if application code doesn't set suffix
DELIMITER $$
CREATE TRIGGER trg_auto_suffix_update
BEFORE UPDATE ON gauges
FOR EACH ROW
BEGIN
  IF NEW.equipment_type = 'thread_gauge' AND NEW.gauge_suffix IS NULL THEN
    IF NEW.system_gauge_id LIKE '%A' THEN
      SET NEW.gauge_suffix = 'A';
    ELSEIF NEW.system_gauge_id LIKE '%B' THEN
      SET NEW.gauge_suffix = 'B';
    END IF;
  END IF;
END$$
DELIMITER ;

-- ----------------------------------------------------------------------------
-- PHASE 3: PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

-- Index: Lookup gauges by companion (used in bidirectional queries)
CREATE INDEX idx_companion_gauge_id ON gauges(companion_gauge_id);

-- Index: Filter by suffix (used in spare gauge queries)
CREATE INDEX idx_gauge_suffix ON gauges(gauge_suffix);

-- Index: Composite for spare gauge lookup
-- Query: Find spare GO or NO GO gauges of specific type
CREATE INDEX idx_spare_lookup ON gauges(equipment_type, gauge_suffix, companion_gauge_id, status);

-- Index: Composite for gauge set lookup
-- Query: Find gauge sets by category and status
CREATE INDEX idx_gauge_set_lookup ON gauges(category_id, companion_gauge_id, status);

-- Index: Composite for companion detail queries
-- Query: Fetch companion gauge details efficiently
CREATE INDEX idx_companion_detail ON gauges(id, system_gauge_id, gauge_suffix, status);

-- ----------------------------------------------------------------------------
-- PHASE 4: NEW TABLES
-- ----------------------------------------------------------------------------

-- Table: companion_history
-- Purpose: Audit trail for all companion gauge relationship changes
-- Design: Explicit go_gauge_id/nogo_gauge_id (not ambiguous gauge_id_1/2)
-- Reference: ADR-004 (Explicit companion_history Schema)
CREATE TABLE companion_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  go_gauge_id INT NOT NULL COMMENT 'GO gauge (suffix A)',
  nogo_gauge_id INT NOT NULL COMMENT 'NO GO gauge (suffix B)',
  action VARCHAR(50) NOT NULL COMMENT 'created_together, paired_from_spares, replaced, unpaired',
  performed_by INT NOT NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT COMMENT 'User-provided reason for action',
  metadata JSON COMMENT 'Additional context (previous companions, specifications, etc.)',

  FOREIGN KEY (go_gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  FOREIGN KEY (nogo_gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES core_users(id),

  INDEX idx_go_gauge_history (go_gauge_id, performed_at),
  INDEX idx_nogo_gauge_history (nogo_gauge_id, performed_at),
  INDEX idx_action_type (action, performed_at)
) ENGINE=InnoDB COMMENT='Tracks companion gauge relationship history';

-- ----------------------------------------------------------------------------
-- PHASE 5: FIX EXISTING DATA
-- ----------------------------------------------------------------------------

-- Populate gauge_suffix for existing thread gauges ending in 'A'
UPDATE gauges
SET gauge_suffix = 'A'
WHERE equipment_type = 'thread_gauge'
  AND gauge_suffix IS NULL
  AND system_gauge_id LIKE '%A';

-- Populate gauge_suffix for existing thread gauges ending in 'B'
UPDATE gauges
SET gauge_suffix = 'B'
WHERE equipment_type = 'thread_gauge'
  AND gauge_suffix IS NULL
  AND system_gauge_id LIKE '%B';

-- ============================================================================
-- IMPORTANT: Companion relationships are NOT automatically re-created
--
-- Reason: Bidirectional relationships require transactional integrity
-- Action: Application layer must re-create companion links through:
--   - GaugeSetService.linkCompanionsWithinTransaction() with FOR UPDATE locks
--   - Proper validation and audit trail creation
--   - See ADR-002 (Explicit Transaction Pattern) and ADR-005 (FOR UPDATE Locks)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- VALIDATION QUERIES
-- ----------------------------------------------------------------------------

-- Validation 1: Verify all thread gauges have suffix
SELECT 'Thread gauges without suffix' as check_name, COUNT(*) as count
FROM gauges
WHERE equipment_type = 'thread_gauge' AND gauge_suffix IS NULL;
-- Expected: 0

-- Validation 2: Verify suffix matches system_gauge_id
SELECT 'Suffix mismatch with ID' as check_name, COUNT(*) as count
FROM gauges
WHERE gauge_suffix IS NOT NULL
  AND system_gauge_id NOT LIKE CONCAT('%', gauge_suffix);
-- Expected: 0

-- Validation 3: Show suffix distribution
SELECT
  equipment_type,
  gauge_suffix,
  COUNT(*) as count
FROM gauges
GROUP BY equipment_type, gauge_suffix
ORDER BY equipment_type, gauge_suffix;
-- Review: Ensure reasonable distribution

-- Validation 4: Verify indexes created
SHOW INDEX FROM gauges WHERE Key_name IN (
  'idx_companion_gauge_id',
  'idx_gauge_suffix',
  'idx_spare_lookup',
  'idx_gauge_set_lookup',
  'idx_companion_detail'
);
-- Expected: 5 indexes listed

-- Validation 5: Verify companion_history table created
SHOW TABLES LIKE 'companion_history';
-- Expected: 1 row

-- ----------------------------------------------------------------------------
-- ROLLBACK SCRIPT (IN CASE OF ISSUES)
-- ----------------------------------------------------------------------------
-- Execute the following commands to completely reverse this migration
-- IMPORTANT: Backup data before rollback

/*
-- DROP CONSTRAINTS
ALTER TABLE gauges DROP CONSTRAINT IF EXISTS chk_thread_has_suffix;
ALTER TABLE gauges DROP CONSTRAINT IF EXISTS chk_suffix_matches_id;

-- DROP TRIGGERS
DROP TRIGGER IF EXISTS trg_auto_suffix_insert;
DROP TRIGGER IF EXISTS trg_auto_suffix_update;

-- DROP INDEXES
DROP INDEX IF EXISTS idx_companion_gauge_id ON gauges;
DROP INDEX IF EXISTS idx_gauge_suffix ON gauges;
DROP INDEX IF EXISTS idx_spare_lookup ON gauges;
DROP INDEX IF EXISTS idx_gauge_set_lookup ON gauges;
DROP INDEX IF EXISTS idx_companion_detail ON gauges;

-- DROP TABLES
DROP TABLE IF EXISTS companion_history;

-- RESET DATA (optional - only if reverting to pre-migration state)
UPDATE gauges SET gauge_suffix = NULL WHERE gauge_suffix IS NOT NULL;
*/

-- ============================================================================
-- SUMMARY OF KEY CHANGES FROM ORIGINAL PROPOSAL:
-- ============================================================================
--
-- 1. REMOVED: chk_bidirectional_companion
--    Reason: Architecturally impossible (chicken-and-egg)
--    Evidence: All 3 architects independently verified
--    Reference: ADR-003, TRIGGER_VALIDATION_REPORT.md
--
-- 2. REMOVED: trg_companion_bidirectional
--    Reason: Multiple critical issues (orphaned links, race conditions)
--    Evidence: TRIGGER_VALIDATION_REPORT.md (5 test scenarios)
--    Risk: MEDIUM-HIGH → Application approach: LOW
--    Reference: ADR-003
--
-- 3. FIXED: chk_thread_has_suffix
--    Before: gauge_suffix IN ('A', 'B', NULL)  -- ❌ Allows NULL
--    After:  gauge_suffix IN ('A', 'B')        -- ✅ Excludes NULL
--    Reason: Thread gauges always have suffix
--    Reference: ADR-003
--
-- 4. REMOVED: chk_npt_no_companion
--    Reason: Business rule better enforced in domain layer
--    Evidence: Enables clear error messages and flexible validation
--    Reference: ADR-001 (Domain-Driven Design)
--
-- 5. IMPROVED: companion_history table schema
--    Before: gauge_id_1, gauge_id_2 (ambiguous)
--    After:  go_gauge_id, nogo_gauge_id (explicit)
--    Added:  ON DELETE CASCADE, proper indexes
--    Reference: ADR-004
--
-- 6. KEPT: Auto-suffix triggers (safe defensive fallback)
-- 7. KEPT: All performance indexes (safe and beneficial)
--
-- ============================================================================
-- CONSENSUS VALIDATION:
-- ============================================================================
-- ✅ Architect 1: Approved (codebase investigation and evidence)
-- ✅ Architect 2: Approved (consolidated plan and structure)
-- ✅ Architect 3: Approved (unified document and ADRs)
-- ✅ All ADRs: Complete and approved
-- ✅ Trigger Validation: Complete (TRIGGER_VALIDATION_REPORT.md)
-- ⏳ Database Testing: Pending (next Phase 0 task)
--
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
