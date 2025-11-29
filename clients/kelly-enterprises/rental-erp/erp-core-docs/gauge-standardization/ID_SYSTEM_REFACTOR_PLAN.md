# Gauge ID System Refactor Plan

**Date:** 2025-01-28
**Status:** Planning Phase
**Priority:** Medium (Foundation improvement)
**Estimated Effort:** 50-75k tokens / 2-3 sessions

---

## Executive Summary

Current gauge ID system has redundant data storage where `gauge_id` and `system_gauge_id` are identical for 95% of records. This causes maintenance burden, confusion, and update anomalies. This plan outlines a refactor to use a generated column approach that eliminates redundancy while maintaining all functionality.

---

## Problem Statement

### Current Schema
```sql
id                INT PRIMARY KEY
gauge_id          VARCHAR(50) NULL
system_gauge_id   VARCHAR(50) UNIQUE NULL
```

### Issues

**1. Data Redundancy (95% of records)**
```
Hand tool:    gauge_id="CA0001", system_gauge_id="CA0001"  ← DUPLICATE
Caliper:      gauge_id="MI0002", system_gauge_id="MI0002"  ← DUPLICATE
```

**2. Manual Synchronization Required**
- Must set both fields when creating gauge
- Must update both fields when renaming
- Risk of inconsistency if one is updated without the other

**3. Confusion About Usage**
- Which field to use in queries?
- Which field to display to users?
- Which field for API routing?

**4. Non-Semantic URLs**
- Current: `/gauges/8501` (integer database ID)
- User sees: "CA7008A" on screen
- Mismatch between URL and display creates confusion

### Current Spare Threading Gauge System

**Unpaired Spares:**
```
gauge_id = NULL
system_gauge_id = NULL
serial_number = "TEST-E005"
```

**Paired Spares:**
```
Spare A: gauge_id = "CA7008", system_gauge_id = "CA7008A"
Spare B: gauge_id = "CA7008", system_gauge_id = "CA7008B"
```

**Purpose of Dual IDs:**
- `gauge_id`: Base identifier shared by spare set members
- `system_gauge_id`: Unique physical gauge identifier

---

## Proposed Solution: Generated Column Approach

### New Schema
```sql
id                INT PRIMARY KEY AUTO_INCREMENT
gauge_id          VARCHAR(50) NOT NULL
gauge_suffix      VARCHAR(1) NULL            -- 'A', 'B', or NULL
system_gauge_id   VARCHAR(50) GENERATED ALWAYS AS
                    (CONCAT(gauge_id, COALESCE(gauge_suffix, ''))) STORED

UNIQUE INDEX idx_gauge_id_suffix (gauge_id, gauge_suffix)
UNIQUE INDEX idx_system_gauge_id (system_gauge_id)
```

### Data Examples

**Hand Tools:**
```
gauge_id = "CA0001"
gauge_suffix = NULL
system_gauge_id = "CA0001"  (computed)
```

**Paired Thread Spares:**
```
Spare A:
  gauge_id = "CA7008"
  gauge_suffix = "A"
  system_gauge_id = "CA7008A"  (computed)

Spare B:
  gauge_id = "CA7008"
  gauge_suffix = "B"
  system_gauge_id = "CA7008B"  (computed)
```

**Unpaired Thread Spares:**
```
gauge_id = NULL
gauge_suffix = NULL
system_gauge_id = NULL  (cannot compute)
serial_number = "TEST-E005"  (identifier)
```

---

## Benefits

### 1. Eliminates Redundancy
- ✅ No duplicate data storage
- ✅ Single source of truth (gauge_id + suffix)
- ✅ Database automatically maintains system_gauge_id

### 2. Prevents Update Anomalies
- ✅ Cannot get out of sync (database enforces)
- ✅ Update gauge_id → system_gauge_id auto-updates
- ✅ No manual synchronization needed

### 3. Clearer Semantics
- ✅ Explicit: base ID + optional suffix = display ID
- ✅ Obvious spare set relationship
- ✅ Clear purpose for each column

### 4. Better Performance
- ✅ Fast spare grouping: `WHERE gauge_id = 'CA7008'` (exact match)
- ✅ Fast individual lookup: `WHERE system_gauge_id = 'CA7008A'` (indexed)
- ✅ No parsing or concatenation in application code

### 5. Data Integrity
- ✅ `UNIQUE(gauge_id, suffix)` prevents duplicate pairs
- ✅ Cannot create CA7008A twice
- ✅ Database enforces correctness

### 6. Semantic URLs
- ✅ Use system_gauge_id in URLs: `/gauges/CA7008A`
- ✅ Matches what user sees on screen
- ✅ Bookmarkable, shareable, meaningful

---

## Implementation Plan

### Phase 1: Database Migration (High Risk)

**1.1 Create Migration Script**
```sql
-- Add new columns
ALTER TABLE gauges ADD COLUMN gauge_suffix VARCHAR(1) NULL AFTER gauge_id;

-- Migrate thread gauge data
UPDATE gauges
SET gauge_suffix = CASE
  WHEN system_gauge_id LIKE '%A' THEN 'A'
  WHEN system_gauge_id LIKE '%B' THEN 'B'
  ELSE NULL
END
WHERE equipment_type = 'thread_gauge'
  AND gauge_id != system_gauge_id;

-- Add generated column
ALTER TABLE gauges ADD COLUMN system_gauge_id_new VARCHAR(50)
  GENERATED ALWAYS AS (CONCAT(gauge_id, COALESCE(gauge_suffix, ''))) STORED;

-- Verify data matches
SELECT COUNT(*) FROM gauges
WHERE system_gauge_id != system_gauge_id_new
  AND system_gauge_id IS NOT NULL;
-- Should be 0

-- Drop old column, rename new
ALTER TABLE gauges DROP COLUMN system_gauge_id;
ALTER TABLE gauges CHANGE system_gauge_id_new system_gauge_id VARCHAR(50);

-- Add indexes
CREATE UNIQUE INDEX idx_gauge_id_suffix ON gauges(gauge_id, gauge_suffix);
CREATE UNIQUE INDEX idx_system_gauge_id ON gauges(system_gauge_id);
```

**1.2 Testing Strategy**
- Run migration on test database copy
- Verify all data migrated correctly
- Test rollback procedure
- Backup production database before migration

**Risks:**
- Generated column syntax varies by MySQL version
- Potential downtime during migration
- Data loss if migration fails

**Mitigation:**
- Test on multiple MySQL versions
- Use transactions where possible
- Have rollback script ready
- Schedule during maintenance window

---

### Phase 2: Backend Repository Layer (Medium Risk)

**2.1 Add Lookup Methods**

File: `/backend/src/modules/gauge/repositories/GaugeRepository.js`

```javascript
/**
 * Find gauge by system_gauge_id (user-facing identifier)
 */
async findBySystemGaugeId(systemGaugeId) {
  const [rows] = await this.pool.execute(
    `SELECT * FROM gauges WHERE system_gauge_id = ?`,
    [systemGaugeId]
  );
  return rows[0] || null;
}

/**
 * Find gauge by system_gauge_id OR serial_number (for unpaired spares)
 */
async findByPublicIdentifier(identifier) {
  const [rows] = await this.pool.execute(
    `SELECT * FROM gauges
     WHERE system_gauge_id = ? OR serial_number = ?`,
    [identifier, identifier]
  );
  return rows[0] || null;
}
```

**2.2 Update Existing Methods**
- Add validation for gauge_suffix (must be NULL, 'A', or 'B')
- Update creation methods to set gauge_id and gauge_suffix
- Update pairing logic to set suffix when creating spare sets

**Files to Modify:**
- `GaugeRepository.js`
- `GaugeCreationService.js`
- `GaugeSetService.js`

**Testing:**
- Unit tests for new lookup methods
- Integration tests for gauge creation
- Test spare pairing workflow

---

### Phase 3: Backend Route Layer (High Risk - Breaking Changes)

**3.1 Update Route Handlers**

**Before:**
```javascript
router.get('/gauges/:id', async (req, res) => {
  const gaugeId = parseInt(req.params.id);  // Integer ID
  const gauge = await gaugeRepository.findById(gaugeId);
});
```

**After:**
```javascript
router.get('/gauges/:systemGaugeId', async (req, res) => {
  const { systemGaugeId } = req.params;  // String ID
  const gauge = await gaugeRepository.findBySystemGaugeId(systemGaugeId);

  // Fallback for unpaired spares
  if (!gauge) {
    gauge = await gaugeRepository.findBySerialNumber(systemGaugeId);
  }
});
```

**3.2 Files to Update (10+ files)**
- `/backend/src/modules/gauge/routes/gauges-v2.js`
- `/backend/src/modules/gauge/routes/calibration.routes.js`
- `/backend/src/modules/gauge/routes/gauge-certificates.js`
- `/backend/src/modules/gauge/routes/checkout.js`
- `/backend/src/modules/gauge/routes/returns.js`
- All other gauge-related routes

**3.3 Backward Compatibility (Optional)**

Support both integer and string IDs during transition:

```javascript
router.get('/gauges/:id', async (req, res) => {
  const { id } = req.params;

  let gauge;
  if (/^\d+$/.test(id)) {
    // Integer ID - legacy support
    gauge = await gaugeRepository.findById(parseInt(id));
  } else {
    // String ID - new system
    gauge = await gaugeRepository.findByPublicIdentifier(id);
  }
});
```

**Testing:**
- Test all API endpoints with new ID format
- Test unpaired spare edge cases
- Test error handling for invalid IDs
- Load testing for performance impact

---

### Phase 4: Frontend Updates (Medium Risk)

**4.1 Update Hooks**

File: `/frontend/src/modules/gauge/hooks/useGauges.ts`

```typescript
// Before
export function useGauge(id: string) {
  return useQuery(['gauge', id], () =>
    apiClient.get(`/api/gauges/${id}`)
  );
}

// After
export function useGauge(systemGaugeId: string) {
  return useQuery(['gauge', systemGaugeId], () =>
    apiClient.get(`/api/gauges/${systemGaugeId}`)
  );
}
```

**4.2 Update Navigation**

All components that link to gauge detail must use `system_gauge_id`:

```typescript
// Before
<Link to={`/gauges/${gauge.id}`}>

// After
<Link to={`/gauges/${gauge.system_gauge_id}`}>
```

**4.3 Files to Update (20+ components)**
- `GaugeDetail.tsx`
- `GaugeList.tsx`
- `GaugeDashboardContainer.tsx`
- `CheckoutModal.tsx`
- `CalibrationForm.tsx`
- All components linking to gauge detail

**4.4 Update Routing**

File: `/frontend/src/App.tsx`

```typescript
// Update route parameter name for clarity
<Route path="/gauges/:systemGaugeId" element={<GaugeDetail />} />
```

**Testing:**
- Test all navigation flows
- Test bookmarking/sharing URLs
- Test browser back/forward buttons
- Test search and filtering
- Visual regression testing

---

### Phase 5: Testing & Validation

**5.1 Unit Tests**
- Repository lookup methods
- Gauge creation with suffix
- Spare pairing logic
- URL parsing helpers

**5.2 Integration Tests**
- Complete gauge lifecycle (create → view → edit → delete)
- Spare pairing workflow
- Calibration workflow with new IDs
- Checkout/return flows

**5.3 End-to-End Tests**
- User creates hand tool gauge
- User pairs thread spare gauges
- User navigates via URLs
- User searches for gauges
- User generates calibration certificate

**5.4 Performance Tests**
- Query performance with generated column index
- Load testing API endpoints
- Measure impact on database size
- Check for N+1 query issues

**5.5 Manual Testing Checklist**
- [ ] Create new hand tool gauge
- [ ] Create new thread gauge spare
- [ ] Pair two spares into set
- [ ] Navigate to gauge via URL
- [ ] Bookmark and return via bookmark
- [ ] Search for gauge by ID
- [ ] Search for gauge set
- [ ] Edit gauge details
- [ ] Generate calibration certificate
- [ ] Checkout gauge
- [ ] Return gauge
- [ ] Delete gauge

---

## Rollback Plan

### If Issues Discovered Post-Deployment

**Option 1: Keep generated column, revert routes**
```javascript
// Restore integer ID routes temporarily
router.get('/gauges/:id', async (req, res) => {
  const gaugeId = parseInt(req.params.id);
  const gauge = await gaugeRepository.findById(gaugeId);
});
```

**Option 2: Restore old column, keep both temporarily**
```sql
-- Add back old column
ALTER TABLE gauges ADD COLUMN system_gauge_id_legacy VARCHAR(50);
UPDATE gauges SET system_gauge_id_legacy = system_gauge_id;
```

**Option 3: Full rollback**
```sql
-- Restore original schema
ALTER TABLE gauges DROP COLUMN system_gauge_id;
ALTER TABLE gauges DROP COLUMN gauge_suffix;
ALTER TABLE gauges ADD COLUMN gauge_id_backup VARCHAR(50);
ALTER TABLE gauges ADD COLUMN system_gauge_id_backup VARCHAR(50);
-- Restore from backup
```

---

## Risk Assessment

### High Risk Areas

**1. Database Migration**
- **Risk:** Data loss or corruption
- **Probability:** Low (with proper testing)
- **Impact:** Critical
- **Mitigation:** Full backup, test migration, rollback script

**2. API Breaking Changes**
- **Risk:** Existing integrations break
- **Probability:** High (if external consumers exist)
- **Impact:** High
- **Mitigation:** Version API, support both formats temporarily

**3. URL Changes**
- **Risk:** Bookmarked URLs stop working
- **Probability:** High
- **Impact:** Medium
- **Mitigation:** Redirect old URLs, support both formats

### Medium Risk Areas

**4. Frontend Navigation**
- **Risk:** Broken links, navigation failures
- **Probability:** Medium
- **Impact:** High (user-facing)
- **Mitigation:** Comprehensive testing, gradual rollout

**5. Performance Impact**
- **Risk:** Slower queries with generated column
- **Probability:** Low (indexes should help)
- **Impact:** Medium
- **Mitigation:** Performance testing, query optimization

### Low Risk Areas

**6. Report Generation**
- **Risk:** Certificates show wrong IDs
- **Probability:** Low (single field reference)
- **Impact:** Low (visual only)
- **Mitigation:** Update PDF templates, test generation

---

## Success Criteria

### Functional Requirements
- ✅ All gauges have correct system_gauge_id computed
- ✅ Spare sets grouped correctly by gauge_id
- ✅ URLs use semantic IDs (CA7008A not 8501)
- ✅ All navigation works correctly
- ✅ Search finds gauges by base ID
- ✅ Calibration workflow functions end-to-end

### Non-Functional Requirements
- ✅ Query performance maintained or improved
- ✅ No data loss during migration
- ✅ All tests passing
- ✅ Zero downtime deployment (if possible)
- ✅ Documentation updated

### Quality Gates
- ✅ 100% of routes updated and tested
- ✅ 100% of components updated
- ✅ 90%+ test coverage on new code
- ✅ Performance benchmarks met
- ✅ Security audit passed

---

## Dependencies

**Must Complete Before Starting:**
- [ ] Full database backup
- [ ] Test environment setup
- [ ] Rollback procedures documented
- [ ] Team approval on downtime window

**Blockers:**
- MySQL version supports generated columns
- No parallel development on gauge routes
- Testing environment available

---

## Timeline Estimate

**Phase 1: Database Migration** - 1 session (8-10k tokens)
- Write migration script
- Test on copy of production data
- Verify data integrity
- Document rollback

**Phase 2: Backend Repository** - 1 session (10-15k tokens)
- Update repository methods
- Add lookup helpers
- Unit tests
- Integration tests

**Phase 3: Backend Routes** - 1-2 sessions (20-30k tokens)
- Update all route handlers
- Add backward compatibility layer
- Test each endpoint
- Fix bugs

**Phase 4: Frontend Updates** - 1-2 sessions (15-20k tokens)
- Update hooks and navigation
- Update all components
- Fix broken links
- Visual testing

**Phase 5: Testing & Validation** - 1 session (10-15k tokens)
- E2E testing
- Performance testing
- Manual QA
- Bug fixes

**Total Estimate: 4-6 sessions, 50-75k tokens**

---

## Alternative: Minimal Approach

If generated columns are not feasible, implement minimal version:

### Schema
```sql
id           INT PRIMARY KEY
gauge_id     VARCHAR NOT NULL
gauge_suffix VARCHAR(1) NULL
-- No system_gauge_id column
```

### Application Code Computes Display ID
```javascript
function getDisplayId(gauge) {
  return gauge.gauge_suffix
    ? `${gauge.gauge_id}${gauge.gauge_suffix}`
    : gauge.gauge_id;
}
```

**Pros:**
- Simpler schema
- No generated column complexity
- Easier to understand

**Cons:**
- Must compute display ID everywhere
- Cannot query by system_gauge_id directly
- URLs need parsing

**Estimate: 30-40k tokens (simpler)**

---

## Decision Required

Choose one approach:

**A) Full Generated Column Solution**
- Best long-term solution
- Database does the work
- 50-75k token effort

**B) Minimal Application-Layer Solution**
- Simpler schema
- App code handles display
- 30-40k token effort

**C) Defer Refactor**
- Keep current system
- Test calibration first
- Revisit in future session

---

## Next Steps

1. Review this plan with team
2. Choose approach (A, B, or C)
3. Schedule dedicated session for implementation
4. Ensure fresh token budget
5. Have stakeholders approve downtime window
6. Execute in controlled manner

---

## References

- Initial analysis: This session (121k tokens)
- Database schema: `/backend/src/infrastructure/database/schema.sql`
- Current routes: `/backend/src/modules/gauge/routes/`
- Frontend navigation: `/frontend/src/modules/gauge/components/`
- Testing docs: `/erp-core-docs/system architecture/`

---

**End of Plan**
