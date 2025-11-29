# Gauge Set Management - Comprehensive Implementation Plan

**Created**: 2025-11-05
**Status**: Planning
**Priority**: High (Critical data integrity issue identified)

---

## Executive Summary

Thread gauge sets (GO/NO-GO pairs) require careful lifecycle management to maintain data integrity, audit trail accuracy, and operational safety. This plan addresses:

1. **Critical Issue**: Set ID reuse after unpair causes audit trail confusion
2. **Missing Operations**: No "retire set" functionality
3. **Business Logic Gaps**: Unclear when to replace vs unpair vs delete
4. **Frontend Gaps**: No UI for set management operations

---

## Current State Analysis

### What Works ✅
- ✅ Create gauge set (just fixed serial number preservation bug)
- ✅ Serial number → gauge_id mapping for both single gauges and sets
- ✅ Validation: matching specifications, GO/NO-GO designation
- ✅ Location tracking via inventory system
- ✅ Audit trail via gauge_set_history table
- ✅ Transaction safety with rollback support

### Critical Gaps ❌
- ❌ **Set ID reuse allowed** after unpair (historical ambiguity)
- ❌ No "retire set" operation (both gauges worn out)
- ❌ No frontend UI for replace/unpair/retire
- ❌ Unclear business rules for when to use each operation
- ❌ No validation preventing replace during checkout
- ❌ Incomplete set status not surfaced in UI

### Production Readiness Gaps 🔴
- 🔴 **No rollback strategy** for set ID reuse check deployment
- 🔴 **No migration script** for existing sets → gauge_set_history backfill
- 🔴 **No performance benchmarks** or load testing plan
- 🔴 **No monitoring/alerting** for set operations
- 🔴 **No feature flag system** for gradual rollout

### Technical Debt ⚠️
- ⚠️ Two different GaugeSetService implementations (old domain model vs new)
- ⚠️ Inconsistent use of database ID vs serial number in operations
- ⚠️ Location tracking errors logged but silently ignored
- ⚠️ No calibration system integration (manual process)

---

## Business Rules & Scenarios

### Scenario Matrix

| Situation | Recommended Action | Reasoning | Set ID Preserved? |
|-----------|-------------------|-----------|-------------------|
| **1 gauge damaged, spare available** | REPLACE | Maintain set identity, minimal disruption | ✅ YES |
| **Both gauges need calibration** | KEEP PAIRED | Calibrate together, return as same set | ✅ YES |
| **1 gauge lost, no spare yet** | SOFT DELETE | Mark incomplete, preserve for future replacement | ✅ YES |
| **Incorrectly paired** | UNPAIR | Both gauges wrong, abandon set ID | ❌ NO |
| **Both gauges worn out** | RETIRE SET | Remove from service, preserve history | ✅ YES |
| **Set never should have existed** | UNPAIR + AUDIT | Correct mistake, document reason | ❌ NO |

### Detailed Scenario Workflows

#### Scenario 1: Replace Damaged Gauge (Common - 60% of cases)

```
Initial State:
  Set SP0222: ABC123 (GO, damaged) + DEF456 (NO-GO, good)
  Available: XYZ789 (unpaired spare)

Business Process:
  1. User identifies damaged gauge ABC123
  2. User finds compatible spare XYZ789
  3. System validates:
     - XYZ789 is unpaired (set_id = NULL)
     - XYZ789 matches specifications
     - Neither gauge in set is checked out
     - XYZ789 not in pending_qc status
  4. System performs replace:
     - ABC123: set_id = NULL (returns to spare pool)
     - XYZ789: set_id = SP0222 (joins set)
     - Location: XYZ789 moved to set's location
     - Audit: "Replaced ABC123 with XYZ789 in set SP0222"

Result:
  Set SP0222: XYZ789 (GO) + DEF456 (NO-GO)
  Spare: ABC123 (can be recalibrated/reused)
  Set identity preserved ✅
```

#### Scenario 2: Both Gauges Need Calibration (Common - 25% of cases)

```
Initial State:
  Set SP0222: ABC123 (GO, due for cal) + DEF456 (NO-GO, due for cal)

Business Process:
  1. System identifies both gauges due for calibration
  2. User sends ENTIRE SET to calibration together
  3. Set remains paired during calibration:
     - Both gauges: status = 'in_calibration'
     - set_id = SP0222 (unchanged)
  4. After calibration:
     - Both gauges: status = 'available'
     - set_id = SP0222 (unchanged)
     - Calibration dates updated
     - Return to same location

Result:
  Set SP0222: ABC123 (GO, recal'd) + DEF456 (NO-GO, recal'd)
  Set identity preserved ✅
  Historical continuity maintained ✅

Note: DO NOT unpair for calibration!
  - Unpairing loses set identity
  - Creates unnecessary administrative overhead
  - Breaks calibration history linkage
```

#### Scenario 3: One Gauge Lost, No Spare Available (Uncommon - 10% of cases)

```
Initial State:
  Set SP0222: ABC123 (GO, good) + DEF456 (NO-GO, permanently lost)
  No spare available yet

Business Process:
  1. User reports DEF456 lost/destroyed
  2. System performs soft delete:
     - DEF456: deleted_at = NOW()
     - DEF456: set_id = SP0222 (preserved!)
     - ABC123: set_id = SP0222 (unchanged)
  3. Set marked as "Incomplete" in UI
  4. When replacement arrives:
     - Use REPLACE operation
     - New gauge joins set SP0222
     - Set becomes complete again

Result (Immediate):
  Set SP0222 (INCOMPLETE): ABC123 (GO) + [empty]
  Set identity preserved for future ✅

Result (After Replacement):
  Set SP0222: ABC123 (GO) + XYZ789 (NO-GO, replacement)
  Same set ID, restored to service ✅
```

#### Scenario 4: Incorrectly Paired (Rare - 3% of cases)

```
Initial State:
  Set SP0222: ABC123 (1/4-20 UNC GO) + DEF456 (1/2-13 UNC NO-GO)
  Problem: Different thread sizes paired together! ❌

Business Process:
  1. User or QC identifies incorrect pairing
  2. System performs unpair:
     - ABC123: set_id = NULL (spare)
     - DEF456: set_id = NULL (spare)
     - Audit: "Unpaired - incorrect specifications"
  3. Set SP0222 is DESTROYED
  4. Both gauges available for correct pairing:
     - ABC123 can be paired with correct 1/4-20 companion
     - DEF456 can be paired with correct 1/2-13 companion
  5. Create NEW sets with new IDs

Result:
  Set SP0222: DESTROYED (no longer exists) ❌
  ABC123: Available for correct pairing
  DEF456: Available for correct pairing
  Set ID SP0222 permanently retired ✅

Critical: SP0222 cannot be reused (see Issue #1)
```

#### Scenario 5: Retire Entire Set (Uncommon - 2% of cases)

```
Initial State:
  Set SP0222: ABC123 (GO, worn out) + DEF456 (NO-GO, worn out)
  Both gauges at end of service life

Business Process:
  1. User initiates "Retire Set" operation
  2. System performs set retirement:
     - ABC123: deleted_at = NOW()
     - DEF456: deleted_at = NOW()
     - Both: set_id = SP0222 (preserved!)
     - Audit: "Set retired - end of service life"
  3. Set marked as "Retired" in UI
  4. Gauges cannot be reactivated (permanent removal)

Result:
  Set SP0222 (RETIRED): Both gauges soft-deleted
  Set identity preserved for history ✅
  Cannot be accidentally reused ✅
  Audit trail complete ✅

Note: This is NOT unpair!
  - Unpairing implies gauges are reusable
  - Retirement is permanent
  - Preserves complete set history
```

---

## Critical Issue #1: Set ID Reuse Prevention

### The Problem

**Current Behavior:**
```
Day 1: Create set SP0222 (ABC123 + DEF456)
Day 2: Unpair SP0222
       → ABC123: set_id = NULL
       → DEF456: set_id = NULL
Day 3: Create new set SP0222 (XYZ789 + LMN012) ✅ ALLOWED!
```

**Why This Is Bad:**
```
Audit Trail Confusion:
┌─────────────────────────────────────────────────────────────┐
│ gauge_set_history table:                                     │
├─────────────────────────────────────────────────────────────┤
│ 2025-01-01 | set_id: SP0222 | action: created              │
│            | gauges: ABC123, DEF456                         │
│                                                             │
│ 2025-01-15 | set_id: SP0222 | action: unpaired             │
│                                                             │
│ 2025-02-01 | set_id: SP0222 | action: created  ← AMBIGUOUS!│
│            | gauges: XYZ789, LMN012                         │
│                                                             │
│ 2025-03-10 | set_id: SP0222 | action: calibrated           │
│            | Which SP0222? The old one or new one? ❌       │
└─────────────────────────────────────────────────────────────┘

Questions that cannot be answered:
- Which gauges were in SP0222 on 2025-02-15?
- How many times has "SP0222" been calibrated?
- What is the service life of set "SP0222"?
- Which SP0222 is currently in the field?
```

### The Solution

**Rule**: Set IDs are **NEVER** reused, even after unpair or delete.

**Implementation:**

```javascript
// backend/src/modules/gauge/services/GaugeCreationService.js
// Enhanced validation in createGaugeSet (around line 245)

if (goGaugeData.custom_set_id) {
  const setId = goGaugeData.custom_set_id;

  // Step 1: Check current usage (existing code)
  const existingGauges = await this.repository.findBySetId(setId, connection);
  if (existingGauges && existingGauges.length > 0) {
    throw new Error(`Set ID "${setId}" already exists with active gauges.`);
  }

  // Step 2: NEW - Check historical usage
  const [historyCheck] = await connection.query(
    `SELECT COUNT(*) as count,
            MAX(created_at) as last_used,
            GROUP_CONCAT(DISTINCT action) as actions
     FROM gauge_set_history
     WHERE set_id = ?`,
    [setId]
  );

  if (historyCheck[0].count > 0) {
    const lastUsed = new Date(historyCheck[0].last_used).toLocaleDateString();
    throw new Error(
      `Set ID "${setId}" was previously used (last activity: ${lastUsed}). ` +
      `Set IDs cannot be reused to maintain audit trail integrity. ` +
      `Please choose a different set ID.`
    );
  }

  logger.info('Custom set ID validated (no current or historical usage)', { setId });
}
```

**Alternative Approach**: Auto-increment set IDs only (remove custom set ID option)

**Pros**: Guarantees no reuse, simpler logic
**Cons**: Users lose control over set naming
**Recommendation**: Keep custom IDs but enforce no-reuse rule

---

## Missing Operation: Retire Set

### Why Needed

Current options for ending set lifecycle:
1. **Unpair** - Wrong semantics (implies gauges reusable)
2. **Delete each gauge** - Loses set relationship context
3. ❌ **No operation** for "set is permanently retired"

### Implementation

```javascript
// backend/src/modules/gauge/services/GaugeSetService.js
// Add new method

/**
 * Retire an entire gauge set (both gauges permanently removed from service)
 *
 * @param {string} setId - Set ID to retire
 * @param {number} userId - User performing action
 * @param {string} reason - Reason for retirement (required)
 * @returns {Promise<{success: boolean, setId: string, retiredGauges: number}>}
 */
async retireSet(setId, userId, reason) {
  if (!reason) {
    throw new Error('Reason is required for set retirement');
  }

  return await this.transactionHelper.executeInTransaction(async (connection) => {
    // Get all gauges in set
    const [gauges] = await connection.query(
      'SELECT id, gauge_id, status FROM gauges WHERE set_id = ? AND deleted_at IS NULL',
      [setId]
    );

    if (gauges.length === 0) {
      throw new Error(`No active gauges found for set ${setId}`);
    }

    if (gauges.length !== 2) {
      throw new Error(
        `Invalid set: expected 2 gauges, found ${gauges.length}. ` +
        `Use deleteGauge() for individual gauges.`
      );
    }

    // Validate neither gauge is checked out
    const checkedOut = gauges.filter(g => g.status === 'checked_out');
    if (checkedOut.length > 0) {
      throw new Error(
        `Cannot retire set while gauges are checked out. ` +
        `Please check in all gauges first.`
      );
    }

    // Soft delete both gauges (preserving set_id for history)
    await connection.query(
      `UPDATE gauges
       SET deleted_at = NOW(),
           status = 'retired',
           updated_at = NOW()
       WHERE set_id = ? AND deleted_at IS NULL`,
      [setId]
    );

    // Create audit trail
    await this._createAuditTrail(
      connection,
      gauges[0].id,
      gauges[1].id,
      'set_retired',
      userId,
      reason,
      {
        setId,
        retiredGauges: gauges.map(g => g.gauge_id),
        retiredCount: gauges.length
      }
    );

    logger.info('Set retired successfully', {
      setId,
      gaugeCount: gauges.length,
      reason
    });

    return {
      success: true,
      setId,
      retiredGauges: gauges.length
    };
  });
}
```

### API Endpoint

```javascript
// backend/src/modules/gauge/routes/gaugeSets.routes.js

/**
 * POST /api/gauge-sets/:setId/retire
 * Retire an entire gauge set
 */
router.post('/:setId/retire',
  authenticateToken,
  requirePermissions('manage_gauges'),
  [
    param('setId').trim().notEmpty(),
    body('reason').trim().notEmpty().withMessage('Reason is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { setId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const result = await gaugeSetService.retireSet(setId, userId, reason);

      return res.json({
        success: true,
        message: `Set ${setId} retired successfully`,
        data: result
      });
    } catch (error) {
      logger.error('Error retiring gauge set:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);
```

---

## Database Schema Review

### Current Schema ✅

```sql
-- gauges table
CREATE TABLE gauges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gauge_id VARCHAR(50) UNIQUE,        -- Serial number (e.g., ABC123)
  set_id VARCHAR(50),                  -- Set membership (e.g., SP0222)
  status VARCHAR(50),                  -- available, checked_out, in_calibration, etc.
  deleted_at TIMESTAMP NULL,           -- Soft delete
  -- ... other fields
  INDEX idx_set_id (set_id),
  INDEX idx_gauge_id (gauge_id),
  INDEX idx_deleted (deleted_at)
);

-- gauge_set_history table
CREATE TABLE gauge_set_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  set_id VARCHAR(50),                  -- Set ID
  go_gauge_id INT,                     -- Database ID of GO gauge
  nogo_gauge_id INT,                   -- Database ID of NO-GO gauge
  action VARCHAR(50),                  -- created, paired, replaced, unpaired, etc.
  user_id INT,
  reason TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_set_id (set_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);
```

### Needed Index for Set ID Reuse Prevention

```sql
-- Add index to optimize historical lookup
CREATE INDEX idx_set_history_lookup
ON gauge_set_history(set_id, created_at DESC);

-- This makes the reuse check fast:
-- SELECT COUNT(*) FROM gauge_set_history WHERE set_id = ?
-- Uses index, returns instantly even with millions of records
```

---

## API Endpoints Needed

### Existing Endpoints ✅
- `POST /api/gauges/v2/sets` - Create gauge set ✅
- `GET /api/gauges/v2/sets/:id` - Get gauge set ✅

### New Endpoints Needed ❌

```javascript
// 1. Replace gauge in set
POST /api/gauge-sets/:setId/replace
Body: {
  oldGaugeSerialNumber: "ABC123",
  newGaugeSerialNumber: "XYZ789",
  reason: "Gauge damaged during inspection"
}

// 2. Unpair gauge set (break set)
POST /api/gauge-sets/:setId/unpair
Body: {
  reason: "Incorrect pairing - wrong thread size"
}

// 3. Retire gauge set (both gauges)
POST /api/gauge-sets/:setId/retire
Body: {
  reason: "End of service life - both gauges worn out"
}

// 4. Get set history
GET /api/gauge-sets/:setId/history
Response: {
  setId: "SP0222",
  created: "2025-01-01",
  currentStatus: "active",
  history: [
    { action: "created", date: "2025-01-01", gauges: ["ABC123", "DEF456"] },
    { action: "replaced", date: "2025-02-15", old: "ABC123", new: "XYZ789" },
    { action: "calibrated", date: "2025-03-10", gauges: ["XYZ789", "DEF456"] }
  ]
}

// 5. Get incomplete sets (for monitoring)
GET /api/gauge-sets/incomplete
Response: {
  incompleteSets: [
    { setId: "SP0222", missingGauge: "GO", remainingGauge: "DEF456" },
    { setId: "SP0223", missingGauge: "NO-GO", remainingGauge: "ABC789" }
  ]
}

// 6. Validate set ID availability (before creating)
GET /api/gauge-sets/check-availability/:setId
Response: {
  available: false,
  reason: "Set ID was previously used (last activity: 2025-01-15)",
  suggestion: "SP0224"  // Next available ID
}
```

---

## Frontend UI Requirements

### 1. Set Detail View Enhancement

**Location**: `/frontend/src/modules/gauge/pages/SetDetail.tsx` (new page)

**Features**:
```
┌────────────────────────────────────────────────────────────┐
│ Set SP0222 Detail                                  [Status: Complete ✅]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│ GO Gauge                           NO-GO Gauge            │
│ ┌─────────────────────┐           ┌─────────────────────┐ │
│ │ S/N: ABC123         │           │ S/N: DEF456         │ │
│ │ Status: Available   │           │ Status: Available   │ │
│ │ Location: SHELF-A   │           │ Location: SHELF-A   │ │
│ │ Last Cal: 2025-01-15│           │ Last Cal: 2025-01-15│ │
│ │                     │           │                     │ │
│ │ [View Details]      │           │ [View Details]      │ │
│ └─────────────────────┘           └─────────────────────┘ │
│                                                            │
│ Set Actions:                                               │
│ [Replace Gauge] [Retire Set] [View History]               │
│                                                            │
│ ⚠️  Note: Set must remain paired during calibration       │
└────────────────────────────────────────────────────────────┘
```

### 2. Replace Gauge Modal

**Component**: `<ReplaceGaugeModal />` (new)

**Flow**:
```
┌────────────────────────────────────────────────────────────┐
│ Replace Gauge in Set SP0222                        [Close]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Which gauge needs replacement?                             │
│ ⦿ GO Gauge (ABC123)  ◯ NO-GO Gauge (DEF456)              │
│                                                            │
│ Select replacement gauge:                                  │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ [Search spare gauges...]                             │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ Available Spares:                                          │
│ ✅ XYZ789 - 1/4-20 UNC GO - Location: SHELF-B - ⭐ Match!  │
│ ❌ LMN012 - 1/2-13 UNC GO - Location: SHELF-C - Wrong size│
│                                                            │
│ Reason for replacement: (required)                         │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Gauge damaged during inspection                       │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ ⚠️  Old gauge (ABC123) will become an unpaired spare      │
│                                                            │
│          [Cancel]                    [Replace Gauge]       │
└────────────────────────────────────────────────────────────┘
```

### 3. Incomplete Sets Dashboard Widget

**Component**: `<IncompleteSetsWidget />` (new)

**Display**:
```
┌────────────────────────────────────────────────────────────┐
│ ⚠️  Incomplete Sets (2)                                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ SP0222 - Missing GO gauge                                  │
│ Remaining: DEF456 (NO-GO) - Location: SHELF-A             │
│ Since: 2025-10-15 (21 days)                               │
│ [Find Replacement]                                         │
│                                                            │
│ SP0223 - Missing NO-GO gauge                               │
│ Remaining: ABC789 (GO) - Location: SHELF-B                │
│ Since: 2025-11-01 (4 days)                                │
│ [Find Replacement]                                         │
└────────────────────────────────────────────────────────────┘
```

### 4. Set Creation Enhancement

**Update**: `/frontend/src/modules/gauge/components/creation/CreateGaugeWorkflow.tsx`

**Add**: Set ID validation before submission
```typescript
// Before creating set, check if set ID is available
const validateSetId = async (setId: string) => {
  const response = await apiClient.get(`/gauge-sets/check-availability/${setId}`);
  if (!response.data.available) {
    toast.error(
      'Set ID Unavailable',
      `${setId} was previously used. Suggested: ${response.data.suggestion}`
    );
    return false;
  }
  return true;
};
```

---

## Implementation Phases

### Token Estimation Methodology
**Token Categories**:
- Code Generation: Backend (JS) + Frontend (TSX) + SQL
- Test Code: Unit tests + integration tests
- Documentation: Comments, API docs, user guides
- Infrastructure: Feature flags, monitoring, migrations

**Baseline Estimate**: 40,700 tokens
**With Optimizations**: 38,500 tokens
**Expected (with debugging)**: 46,200 tokens
**Planning Buffer**: **50,000 tokens** (recommended)

---

### Phase 1: Critical Fixes 🔥
**Priority**: CRITICAL - Data integrity issue
**Token Estimate**: 10,100 tokens

1. ✅ **Serial Number Bug** (COMPLETED)
   - Fixed gauge_id preservation in sets
   - Status: Deployed, tested

2. **Set ID Reuse Prevention** (URGENT)
   - Add historical check in createGaugeSet (650 tokens)
   - Add database index + migration (250 tokens)
   - Feature flag support (600 tokens)
   - Unit + integration tests (1,400 tokens)
   - Documentation (600 tokens)
   - **Subtotal**: 2,900 tokens
   - **Testing**: Create set → unpair → try to reuse ID (should fail)

3. **Add Retire Set Operation**
   - Backend service method (1,400 tokens)
   - API endpoint + validation (600 tokens)
   - Unit + integration tests (1,600 tokens)
   - Documentation (500 tokens)
   - **Subtotal**: 4,100 tokens
   - **Testing**: Retire set → verify both gauges soft deleted with set_id preserved

4. **Rollback Strategy & Migration**
   - Feature flag implementation (600 tokens)
   - Historical data backfill SQL (900 tokens)
   - Performance monitoring (500 tokens)
   - Documentation (1,100 tokens)
   - **Subtotal**: 3,100 tokens

**Phase 1 Total**: 10,100 tokens

---

### Phase 2: Core Operations 🔧
**Priority**: HIGH - Essential functionality
**Token Estimate**: 8,900 tokens

5. **Replace Gauge API Enhancement**
   - Enhanced replaceCompanion() method (1,500 tokens)
   - Unit + integration tests (1,500 tokens)
   - Documentation (300 tokens)
   - **Subtotal**: 3,300 tokens

6. **Set History API**
   - GET /history endpoint (1,000 tokens)
   - Unit + integration tests (1,100 tokens)
   - Documentation (200 tokens)
   - **Subtotal**: 2,300 tokens

7. **Incomplete Sets Monitoring**
   - GET /incomplete endpoint (900 tokens)
   - Unit + integration tests (900 tokens)
   - Documentation (200 tokens)
   - **Subtotal**: 2,000 tokens

8. **Check Availability Endpoint**
   - GET /check-availability (700 tokens)
   - Unit tests (400 tokens)
   - Documentation (200 tokens)
   - **Subtotal**: 1,300 tokens

**Phase 2 Total**: 8,900 tokens

---

### Phase 3: Frontend UI 🎨
**Priority**: MEDIUM - User experience
**Token Estimate**: 13,400 tokens

9. **Set Detail View**
   - Component + hooks (2,200 tokens)
   - Styling (400 tokens)
   - Component + integration tests (1,400 tokens)
   - **Subtotal**: 4,000 tokens

10. **Replace Gauge Modal**
    - Component + validation (2,300 tokens)
    - Styling (300 tokens)
    - Component tests (900 tokens)
    - **Subtotal**: 3,500 tokens

11. **Set Action Modal** (Consolidated Unpair + Retire)
    - Generic modal structure (1,300 tokens)
    - Styling (200 tokens)
    - Component tests (700 tokens)
    - **Subtotal**: 2,200 tokens
    - **Note**: Consolidated from 2 separate modals

12. **Incomplete Sets Widget**
    - Component + data fetching (1,400 tokens)
    - Styling (200 tokens)
    - Component tests (600 tokens)
    - **Subtotal**: 2,200 tokens

13. **Set Creation Validation**
    - Pre-submit validation (700 tokens)
    - Custom hook (400 tokens)
    - Hook tests (400 tokens)
    - **Subtotal**: 1,500 tokens

**Phase 3 Total**: 13,400 tokens

---

### Phase 4: Documentation & Training 📚
**Priority**: MEDIUM - Knowledge transfer
**Token Estimate**: 4,500 tokens

14. **Update Documentation**
    - Business rules document (600 tokens)
    - API documentation (Swagger) (800 tokens)
    - User guide updates (700 tokens)
    - Architecture diagrams (400 tokens)
    - **Subtotal**: 2,500 tokens

15. **Create Training Materials**
    - Decision tree guide (500 tokens)
    - Common scenarios walkthrough (600 tokens)
    - Troubleshooting guide (500 tokens)
    - Quick reference cards (400 tokens)
    - **Subtotal**: 2,000 tokens

**Phase 4 Total**: 4,500 tokens

---

### Phase 1.5: Production Readiness (NEW) 🛡️
**Priority**: CRITICAL - Deploy safety
**Token Estimate**: 3,800 tokens

16. **Monitoring & Alerts**
    - Performance monitoring code (1,000 tokens)
    - Monitoring guide + runbook (900 tokens)
    - **Subtotal**: 1,900 tokens

17. **Load Testing**
    - Load test scenarios (1,500 tokens)
    - Test results report (400 tokens)
    - **Subtotal**: 1,900 tokens

**Phase 1.5 Total**: 3,800 tokens

---

### Project Token Summary

```
Phase 1: Critical Fixes               10,100 tokens
Phase 2: Core Operations               8,900 tokens
Phase 3: Frontend UI                  13,400 tokens
Phase 4: Documentation                 4,500 tokens
Phase 1.5: Production Readiness        3,800 tokens
─────────────────────────────────────────────────
TOTAL PROJECT:                        40,700 tokens

With 20% debugging buffer:            48,840 tokens
Recommended planning buffer:          50,000 tokens
```

### Estimated Sessions
- **Theoretical**: 1 session (200K token limit)
- **Realistic**: 4-5 sessions with testing/validation
  - Session 1: Phase 1 (~10K tokens)
  - Session 2: Phase 2 + 1.5 (~13K tokens)
  - Session 3: Phase 3 (~13K tokens)
  - Session 4: Phase 4 + review (~5K tokens)

### Cost Estimate (Claude Sonnet)
- Input tokens: ~25,000 tokens
- Output tokens: ~48,000 tokens
- **Total cost**: ~$0.85 at Sonnet pricing ($3/$15 per million)

---

## Testing Strategy

### Unit Tests

```javascript
// backend/tests/modules/gauge/services/GaugeSetService.test.js

describe('GaugeSetService - Set ID Reuse Prevention', () => {
  test('should prevent reuse of historical set IDs', async () => {
    // Create set
    const setId = 'TEST-001';
    await gaugeSetService.createGaugeSet({...}, setId);

    // Unpair set
    await gaugeSetService.unpairSet(setId);

    // Try to reuse set ID - should fail
    await expect(
      gaugeSetService.createGaugeSet({...}, setId)
    ).rejects.toThrow(/previously used/);
  });

  test('should allow creating set with never-used ID', async () => {
    const setId = 'BRAND-NEW-001';
    const result = await gaugeSetService.createGaugeSet({...}, setId);
    expect(result.success).toBe(true);
  });
});

describe('GaugeSetService - Retire Set', () => {
  test('should soft delete both gauges and preserve set_id', async () => {
    const { setId } = await createTestSet();

    await gaugeSetService.retireSet(setId, userId, 'End of life');

    const gauges = await db.query(
      'SELECT deleted_at, set_id FROM gauges WHERE set_id = ?',
      [setId]
    );

    expect(gauges).toHaveLength(2);
    expect(gauges[0].deleted_at).not.toBeNull();
    expect(gauges[0].set_id).toBe(setId); // Preserved!
  });

  test('should prevent retirement while gauges checked out', async () => {
    const { setId, goGaugeId } = await createTestSet();
    await checkoutGauge(goGaugeId);

    await expect(
      gaugeSetService.retireSet(setId, userId, 'Test')
    ).rejects.toThrow(/checked out/);
  });
});
```

### Integration Tests

```javascript
// backend/tests/integration/gauge-set-lifecycle.test.js

describe('Gauge Set Lifecycle - End to End', () => {
  test('Complete lifecycle: create → replace → retire', async () => {
    // 1. Create set
    const createRes = await api.post('/api/gauges/v2/sets', {
      custom_set_id: 'LIFECYCLE-001',
      go_gauge: { serial_number: 'GO-001', ... },
      nogo_gauge: { serial_number: 'NOGO-001', ... }
    });
    expect(createRes.data.success).toBe(true);

    // 2. Replace GO gauge
    const replaceRes = await api.post('/api/gauge-sets/LIFECYCLE-001/replace', {
      oldGaugeSerialNumber: 'GO-001',
      newGaugeSerialNumber: 'GO-002',
      reason: 'Damaged'
    });
    expect(replaceRes.data.success).toBe(true);

    // 3. Retire set
    const retireRes = await api.post('/api/gauge-sets/LIFECYCLE-001/retire', {
      reason: 'End of service life'
    });
    expect(retireRes.data.success).toBe(true);

    // 4. Verify set cannot be reused
    const reuseRes = await api.post('/api/gauges/v2/sets', {
      custom_set_id: 'LIFECYCLE-001', // Same ID
      ...newSetData
    });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.data.message).toContain('previously used');
  });
});
```

### Manual Test Cases

```
Test Case 1: Replace Gauge Happy Path
  1. Navigate to set detail page
  2. Click "Replace Gauge"
  3. Select GO gauge to replace
  4. Search for compatible spare
  5. Select spare XYZ789
  6. Enter reason: "Damaged during use"
  7. Click "Replace Gauge"
  8. ✅ Verify: Set now shows XYZ789 as GO gauge
  9. ✅ Verify: Old gauge is now unpaired spare
  10. ✅ Verify: Audit trail shows replacement

Test Case 2: Prevent Set ID Reuse
  1. Create set with ID "TEST-123"
  2. Unpair set
  3. Try to create new set with ID "TEST-123"
  4. ✅ Verify: Error message about previous usage
  5. ✅ Verify: Suggested alternative ID shown

Test Case 3: Retire Set
  1. Navigate to set detail page
  2. Click "Retire Set"
  3. Confirm action
  4. Enter reason: "Both gauges end of life"
  5. ✅ Verify: Set marked as "Retired"
  6. ✅ Verify: Both gauges soft deleted
  7. ✅ Verify: Cannot checkout gauges
  8. ✅ Verify: Historical data still accessible

Test Case 4: Incomplete Set Handling
  1. Delete one gauge from set (simulate loss)
  2. ✅ Verify: Set appears in "Incomplete Sets" widget
  3. Click "Find Replacement"
  4. System filters compatible spares
  5. Select replacement
  6. ✅ Verify: Set becomes complete again
  7. ✅ Verify: Same set ID preserved
```

---

## Rollback & Recovery Plan

### Phase 1 Rollback Strategy

#### Feature Flag Rollback (Zero Downtime)
```javascript
// Environment variable control
const SET_ID_REUSE_CHECK_ENABLED =
  process.env.FEATURE_SET_ID_REUSE_CHECK === 'true';

// In createGaugeSet()
if (SET_ID_REUSE_CHECK_ENABLED && goGaugeData.custom_set_id) {
  // Historical check
  const [historyCheck] = await connection.query(
    'SELECT COUNT(*) as count FROM gauge_set_history WHERE set_id = ?',
    [setId]
  );
  if (historyCheck[0].count > 0) {
    throw new Error(`Set ID "${setId}" was previously used...`);
  }
} else {
  // Skip check (rollback mode)
  logger.warn('Set ID reuse check disabled via feature flag', { setId });
}
```

**Rollback Procedure**:
1. Set `FEATURE_SET_ID_REUSE_CHECK=false` in environment
2. Restart backend service (rolling restart, zero downtime)
3. Historical check skipped, old behavior restored
4. Monitor error rates for 1 hour
5. If stable, investigate performance issue
6. If unstable, keep rollback active

#### Database Rollback (If Needed)
```sql
-- Remove index (optional, low impact)
DROP INDEX IF EXISTS idx_set_history_lookup ON gauge_set_history;

-- No data loss - index removal only
-- Set creation still works without index (just slower)
```

#### Monitoring Triggers for Auto-Rollback
```yaml
alerts:
  set_creation_latency_p99:
    threshold: 1000ms
    action: alert_oncall
    auto_rollback: false  # Manual decision

  set_creation_error_rate:
    threshold: 5%
    action: auto_rollback
    notification: critical

  historical_check_timeout:
    threshold: 500ms
    action: alert_oncall
    auto_rollback: false
```

---

## Data Migration Strategy

### Pre-Migration Assessment

**Estimate Existing Sets**:
```sql
-- Count sets that need migration
SELECT COUNT(DISTINCT set_id) as total_sets
FROM gauges
WHERE set_id IS NOT NULL
  AND deleted_at IS NULL;

-- Estimate: ~500 active sets in production (verify with actual query)
```

**Backup Strategy**:
```bash
# Full database backup before migration
mysqldump -u root -p fai_db_sandbox > backup_pre_set_migration_$(date +%Y%m%d).sql

# Verify backup
mysql -u root -p -e "SELECT COUNT(*) FROM gauges" fai_db_sandbox
```

### Migration Script

```sql
-- Backfill gauge_set_history for existing sets
-- Run during maintenance window OR as background task

INSERT INTO gauge_set_history (
  set_id,
  go_gauge_id,
  nogo_gauge_id,
  action,
  user_id,
  reason,
  metadata,
  created_at
)
SELECT
  g1.set_id,
  g1.id as go_gauge_id,
  g2.id as nogo_gauge_id,
  'migrated_existing_set' as action,
  1 as user_id,  -- System user
  'Historical data migration - existing set at time of system upgrade' as reason,
  JSON_OBJECT(
    'migration_date', NOW(),
    'go_gauge_serial', g1.gauge_id,
    'nogo_gauge_serial', g2.gauge_id,
    'migration_version', '1.0'
  ) as metadata,
  COALESCE(LEAST(g1.created_at, g2.created_at), NOW()) as created_at
FROM gauges g1
JOIN gauges g2 ON g1.set_id = g2.set_id
  AND g1.id < g2.id  -- Ensure each set only inserted once
WHERE g1.set_id IS NOT NULL
  AND g1.deleted_at IS NULL
  AND g2.deleted_at IS NULL
  AND NOT EXISTS (
    -- Don't duplicate if already migrated
    SELECT 1 FROM gauge_set_history
    WHERE set_id = g1.set_id AND action = 'migrated_existing_set'
  );

-- Expected result: ~500 rows inserted
```

### Post-Migration Verification

```sql
-- 1. Verify migration count matches
SELECT
  (SELECT COUNT(DISTINCT set_id) FROM gauges WHERE set_id IS NOT NULL) as active_sets,
  (SELECT COUNT(*) FROM gauge_set_history WHERE action = 'migrated_existing_set') as migrated_sets;
-- Should be equal (or migrated >= active if some sets have other history)

-- 2. Spot check random sets
SELECT
  h.set_id,
  h.created_at as history_date,
  g1.gauge_id as go_gauge,
  g2.gauge_id as nogo_gauge,
  g1.created_at as gauge_created
FROM gauge_set_history h
JOIN gauges g1 ON h.go_gauge_id = g1.id
JOIN gauges g2 ON h.nogo_gauge_id = g2.id
WHERE h.action = 'migrated_existing_set'
ORDER BY RAND()
LIMIT 10;
-- Verify data looks correct

-- 3. Check for orphaned sets (no history)
SELECT DISTINCT g.set_id
FROM gauges g
WHERE g.set_id IS NOT NULL
  AND g.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM gauge_set_history WHERE set_id = g.set_id
  );
-- Should return 0 rows

-- 4. Verify no duplicate migrations
SELECT set_id, COUNT(*) as migration_count
FROM gauge_set_history
WHERE action = 'migrated_existing_set'
GROUP BY set_id
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

### Rollback Migration (If Issues Found)

```sql
-- Remove migrated history entries if verification fails
DELETE FROM gauge_set_history
WHERE action = 'migrated_existing_set'
  AND created_at >= '[MIGRATION_START_TIME]';

-- Verify removal
SELECT COUNT(*) FROM gauge_set_history WHERE action = 'migrated_existing_set';
-- Should return 0
```

### Migration Execution Plan

**Downtime Required**: None (run as background task)

**Steps**:
1. **T-1 week**: Test migration script on staging database
2. **T-1 day**: Full production backup
3. **T-0 (Deploy Day)**:
   - 09:00 AM: Deploy code with feature flag OFF
   - 10:00 AM: Run migration script (takes ~2 minutes)
   - 10:05 AM: Run verification queries
   - 10:15 AM: If verified, enable feature flag
   - 10:30 AM: Monitor for 1 hour
4. **T+1 day**: Review metrics, confirm success

---

## Performance Requirements & Monitoring

### Performance Targets

| Operation | Target (99th %ile) | Monitoring |
|-----------|-------------------|------------|
| Set creation | <200ms | Datadog/CloudWatch |
| Historical check | <50ms | Query timing logs |
| Replace operation | <500ms | API endpoint metrics |
| History query | <100ms | Database slow query log |

### Load Testing Plan

```javascript
// Load test scenario: concurrent set creation
const loadtest = require('loadtest');

const options = {
  url: 'http://localhost:8000/api/gauges/v2/sets',
  maxRequests: 100,
  concurrency: 10,
  method: 'POST',
  body: {
    custom_set_id: 'LOAD-TEST-${i}',
    go_gauge: { serial_number: 'GO-${i}', ... },
    nogo_gauge: { serial_number: 'NOGO-${i}', ... }
  },
  headers: { 'Authorization': 'Bearer ${token}' }
};

// Test with increasing history table sizes:
// - 1K records: Baseline
// - 10K records: Typical usage
// - 50K records: Heavy usage
// - 100K records: Stress test
```

### Monitoring Setup

```yaml
# prometheus/gauge_set_metrics.yml
- name: gauge_set_creation_duration
  help: Time to create a gauge set
  type: histogram
  buckets: [50, 100, 200, 500, 1000, 2000]

- name: set_id_reuse_check_duration
  help: Time for historical reuse check
  type: histogram
  buckets: [10, 25, 50, 100, 200, 500]

- name: gauge_set_operations_total
  help: Total gauge set operations by type
  type: counter
  labels: [operation_type, success]

- name: incomplete_sets_count
  help: Current number of incomplete gauge sets
  type: gauge
```

### Alert Runbook

**Alert**: `HighSetCreationLatency`
- **Threshold**: P99 > 1000ms for 5 minutes
- **Investigation**:
  1. Check historical table size: `SELECT COUNT(*) FROM gauge_set_history`
  2. Verify index exists: `SHOW INDEX FROM gauge_set_history`
  3. Check query plan: `EXPLAIN SELECT ... FROM gauge_set_history WHERE set_id = ?`
  4. Monitor concurrent requests
- **Mitigation**: Enable query cache, add Redis cache layer, or disable feature flag

**Alert**: `HighSetCreationErrorRate`
- **Threshold**: Error rate > 5% for 10 minutes
- **Investigation**:
  1. Check error logs for patterns
  2. Verify database connectivity
  3. Check if validation errors or system errors
- **Mitigation**: If system errors, rollback via feature flag

**Alert**: `IncompleteSetsAccumulating`
- **Threshold**: >10 incomplete sets for >7 days
- **Investigation**:
  1. Query incomplete sets: `GET /api/gauge-sets/incomplete`
  2. Identify missing gauges
  3. Check if spares available
- **Action**: Notify QC supervisor to review

---

## Risk Analysis

### High Risk ⚠️

1. **Set ID Reuse Bug Currently in Production**
   - **Impact**: Historical data corruption, audit trail confusion
   - **Likelihood**: HIGH (can happen today)
   - **Mitigation**: Deploy Phase 1 within 1 week
   - **Rollback**: Add flag to disable check if performance issues

2. **Database Performance on Historical Check**
   - **Impact**: Slow set creation if history table is large
   - **Likelihood**: MEDIUM (depends on dataset size)
   - **Mitigation**: Add index, implement caching
   - **Fallback**: Use Redis cache for recent lookups

### Medium Risk ⚠️

3. **Frontend Complexity for Replace Operation**
   - **Impact**: Poor UX, user confusion
   - **Likelihood**: MEDIUM
   - **Mitigation**: Clear UI flow, inline validation
   - **Testing**: User acceptance testing with operators

4. **Incomplete Sets Accumulation**
   - **Impact**: Many incomplete sets if not monitored
   - **Likelihood**: MEDIUM
   - **Mitigation**: Dashboard widget, email alerts
   - **Monitoring**: Weekly report to management

### Low Risk ✅

5. **API Breaking Changes**
   - **Impact**: Frontend needs updates
   - **Likelihood**: LOW (all new endpoints)
   - **Mitigation**: Versioned API (v2)
   - **Documentation**: Swagger/OpenAPI spec

---

## Overengineering Review

### What We're NOT Doing (Good!) ✅

1. ❌ **Automatic Set Repair**: Don't auto-pair gauges without user action
   - **Why**: Requires human judgment, specifications must match
   - **Alternative**: Alert users, provide recommendation, require confirmation

2. ❌ **Set Versioning**: Don't create SP0222-v1, SP0222-v2, etc.
   - **Why**: Adds complexity, set ID should be unique identifier
   - **Alternative**: Audit trail shows all changes, no need for versions

3. ❌ **Complex Set Types**: Don't support 3+ gauge sets (master sets, etc.)
   - **Why**: Thread gauges are always GO/NO-GO pairs
   - **Alternative**: Keep simple, two-gauge model

4. ❌ **Set Templates**: Don't create "templates" for common pairings
   - **Why**: Each gauge is unique, specs validated at pair time
   - **Alternative**: Validation ensures compatibility

5. ❌ **Automated Calibration Scheduling**: Don't auto-schedule based on set
   - **Why**: Calibration system handles this independently
   - **Alternative**: Sets stay paired during calibration, no special logic

### Simplifications Applied ✅

1. ✅ **Retire Set = Soft Delete Both Gauges**
   - Simple, clear semantics
   - Reuses existing soft delete infrastructure
   - No new database columns needed

2. ✅ **Set ID Check = Simple History Query**
   - No complex caching initially
   - Add caching only if performance issue arises
   - Index makes query fast enough

3. ✅ **Replace Operation = Unpair + Pair**
   - Atomic transaction ensures consistency
   - No intermediate "replacing" status needed
   - Clear audit trail

4. ✅ **Frontend Shows Status, No Complex State Machine**
   - "Complete", "Incomplete", "Retired" covers all cases
   - No "partially paired", "pending replacement", etc.
   - Simple = maintainable

---

## Success Criteria

### Phase 1 (Critical Fixes)
- [ ] Set ID reuse prevented (test: create → unpair → try reuse → fail)
- [ ] Historical check performs in <100ms (with index)
- [ ] Retire set operation works (test: both gauges soft deleted)
- [ ] All unit tests pass

### Phase 2 (Core Operations)
- [ ] Replace gauge works via API
- [ ] Set history endpoint returns complete audit trail
- [ ] Incomplete sets query returns accurate results
- [ ] Integration tests pass

### Phase 3 (Frontend UI)
- [ ] Set detail view displays correctly
- [ ] Replace modal validates spare compatibility
- [ ] Incomplete sets widget shows alerts
- [ ] Set creation validates ID availability before submit

### Phase 4 (Documentation)
- [ ] Business rules documented
- [ ] API documentation complete
- [ ] User training materials ready
- [ ] Operations team trained

### Overall Success Metrics
- **Data Integrity**: Zero set ID reuse incidents
- **User Efficiency**: Replace operation takes <2 minutes
- **System Health**: Incomplete sets resolved within 7 days
- **Audit Quality**: 100% of set changes tracked in history

---

## Open Questions

1. **Calibration Workflow**: Should we prevent unpairing during calibration?
   - **Recommendation**: YES - Block unpair if either gauge status = 'in_calibration'

2. **Checkout Behavior**: Can one gauge from set be checked out alone?
   - **Current**: System allows individual checkout
   - **Question**: Should we force checkout of both gauges together?
   - **Recommendation**: NO - Allow individual, but show warning "Companion still in storage"

3. **Set ID Format**: Should we enforce format (e.g., SP####)?
   - **Current**: Free-form text
   - **Recommendation**: Add optional regex validation in settings

4. **Incomplete Set Timeout**: Auto-unpair if incomplete for >90 days?
   - **Pros**: Prevents orphaned sets
   - **Cons**: Loses set identity, may have spare on order
   - **Recommendation**: NO auto-unpair, alert only

5. **Historical Data Migration**: What about existing sets?
   - **Question**: Do we need to backfill gauge_set_history for existing sets?
   - **Recommendation**: YES - One-time migration script to populate history

---

## Appendix A: Database Queries

### Check Set ID Availability
```sql
-- Fast lookup with index
SELECT
  COUNT(*) as usage_count,
  MAX(created_at) as last_used,
  GROUP_CONCAT(DISTINCT action) as actions
FROM gauge_set_history
WHERE set_id = 'SP0222';

-- Returns:
-- usage_count: 5
-- last_used: 2025-01-15 10:30:00
-- actions: created,replaced,calibrated,unpaired
```

### Get Incomplete Sets
```sql
-- Find sets with only 1 active gauge
SELECT
  g.set_id,
  COUNT(*) as active_count,
  GROUP_CONCAT(g.gauge_id) as remaining_gauges,
  MIN(g.updated_at) as incomplete_since
FROM gauges g
WHERE g.set_id IS NOT NULL
  AND g.deleted_at IS NULL
GROUP BY g.set_id
HAVING COUNT(*) = 1
ORDER BY incomplete_since ASC;
```

### Get Set History
```sql
-- Complete audit trail for a set
SELECT
  h.action,
  h.created_at,
  h.reason,
  h.metadata,
  u.username,
  g1.gauge_id as go_gauge,
  g2.gauge_id as nogo_gauge
FROM gauge_set_history h
LEFT JOIN users u ON h.user_id = u.id
LEFT JOIN gauges g1 ON h.go_gauge_id = g1.id
LEFT JOIN gauges g2 ON h.nogo_gauge_id = g2.id
WHERE h.set_id = 'SP0222'
ORDER BY h.created_at DESC;
```

---

## Appendix B: Error Messages

### User-Facing Error Messages

```javascript
// Set ID reuse
"Set ID 'SP0222' was previously used (last activity: Jan 15, 2025).
Set IDs cannot be reused to maintain audit trail integrity.
Suggested ID: SP0223"

// Replace validation failures
"Cannot replace gauge while set is checked out. Please check in all gauges first."
"Replacement gauge must have matching specifications (thread size, class, form)."
"Replacement gauge must be an unpaired spare (no set_id)."

// Retire validation failures
"Cannot retire set while gauges are checked out. Please check in gauges first."
"Cannot retire set while gauges are in calibration. Wait for calibration completion."
"Reason is required for set retirement (minimum 10 characters)."

// Unpair validation failures
"Cannot unpair set while either gauge is checked out."
"Set 'SP0222' does not exist or has already been unpaired."
```

### Developer Error Messages (Logs)

```javascript
logger.error('Set ID reuse attempt detected', {
  setId: 'SP0222',
  lastUsed: '2025-01-15',
  attemptedBy: userId,
  action: 'createGaugeSet'
});

logger.warn('Replace operation attempted during checkout', {
  setId: 'SP0222',
  gaugeStatus: 'checked_out',
  user: userId
});

logger.info('Set retired successfully', {
  setId: 'SP0222',
  gaugesRetired: ['ABC123', 'DEF456'],
  reason: 'End of service life'
});
```

---

## Next Steps

1. **Review this plan** with team (30 min meeting)
2. **Get approval** from stakeholders for Phase 1
3. **Create Jira tickets** for each phase
4. **Begin Phase 1 implementation** (set ID reuse prevention)
5. **Schedule weekly checkpoint** meetings during implementation

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Author**: Claude (Anthropic AI)
**Review Status**: Pending team review
