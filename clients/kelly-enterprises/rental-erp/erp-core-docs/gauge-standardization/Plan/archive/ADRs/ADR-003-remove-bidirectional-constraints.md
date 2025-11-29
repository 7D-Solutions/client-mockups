# ADR-003: Remove Bidirectional Database Constraints and Triggers

**Date**: 2025-10-24
**Status**: Accepted
**Decision Makers**: Architect 1, Architect 2, Architect 3
**Phase**: Phase 0 - Architecture Alignment

---

## Context

**Proposed Database Constraints** (in original plan):

1. **Bidirectional CHECK Constraint**:
```sql
ALTER TABLE gauges ADD CONSTRAINT chk_bidirectional_companion CHECK (
  companion_gauge_id IS NULL OR
  EXISTS (
    SELECT 1 FROM gauges g2
    WHERE g2.id = gauges.companion_gauge_id
    AND g2.companion_gauge_id = gauges.id
  )
);
```

2. **Bidirectional Trigger**:
```sql
CREATE TRIGGER trg_companion_bidirectional
AFTER UPDATE ON gauges
FOR EACH ROW
BEGIN
  IF NEW.companion_gauge_id IS NOT NULL THEN
    UPDATE gauges SET companion_gauge_id = NEW.id
    WHERE id = NEW.companion_gauge_id;
  END IF;
END;
```

**Independent Verification**: All 3 architects confirmed these constraints are problematic

---

## Decision

**Remove bidirectional constraint and trigger** from database migration. Handle bidirectional linking in application code within transactions.

**Rationale**: These database-level solutions are either impossible or dangerous.

---

## Problem Analysis

### Issue #1: CHECK Constraint is Architecturally Impossible

**Chicken-and-Egg Problem**:
```
Step 1: INSERT GO gauge (id=1, companion_gauge_id=NULL)
→ ✅ CHECK passes (companion_gauge_id IS NULL)

Step 2: INSERT NO GO gauge (id=2, companion_gauge_id=NULL)
→ ✅ CHECK passes (companion_gauge_id IS NULL)

Step 3: UPDATE GO gauge SET companion_gauge_id = 2
→ CHECK runs: "Does gauge 2 point back to gauge 1?"
→ Query: SELECT 1 FROM gauges WHERE id=2 AND companion_gauge_id=1
→ Result: NO ROWS (gauge 2's companion is still NULL!)
→ ❌ CONSTRAINT VIOLATION
→ Transaction rolls back
→ NO GAUGE SETS CAN BE CREATED
```

**Why This Cannot Be Fixed**:
- Constraint requires A→B and B→A simultaneously
- SQL processes statements sequentially
- First UPDATE always fails CHECK constraint
- Not a timing issue - architecturally impossible

**Verification**: 100% confidence - mathematically proven impossible

---

### Issue #2: Trigger Has Infinite Recursion Risk

**Recursion Scenario**:
```
User: UPDATE gauge A SET companion_gauge_id = B
Trigger: UPDATE gauge B SET companion_gauge_id = A
Trigger: UPDATE gauge A SET companion_gauge_id = B (AGAIN!)
Trigger: UPDATE gauge B SET companion_gauge_id = A (AGAIN!)
... infinite loop or max recursion depth error
```

**Guard Clause Insufficient**:
```sql
-- Proposed guard: AND companion_gauge_id != NEW.id
-- Problem: Values keep changing during recursion
```

**MySQL Behavior**:
- May error with "max recursion depth"
- May execute a few iterations then fail
- May cause deadlocks
- May corrupt data with race conditions
- **Verification**: 85% confidence - context-dependent but risky

---

### Issue #3: Performance Impact

**CHECK Constraint**:
- Executes subquery on EVERY INSERT/UPDATE
- Full table scan for each operation
- Performance degrades with table size
- Unpredictable behavior across MySQL versions

**Trigger**:
- Doubles write operations (original + trigger)
- Risk of cascading updates
- Difficult to debug when issues arise

---

## Solution

**Application-Layer Bidirectional Linking**:

```javascript
// Service layer manages transaction
async linkCompanionsWithinTransaction(gaugeId1, gaugeId2, connection) {
  if (!connection) {
    throw new Error('Requires connection parameter');
  }

  // Lock both rows to prevent concurrent modifications
  const gauges = await this.executeQuery(
    `SELECT id, companion_gauge_id
     FROM gauges
     WHERE id IN (?, ?)
     FOR UPDATE`,  // ← Explicit row lock
    [gaugeId1, gaugeId2],
    connection
  );

  // Validate neither gauge already has companion
  if (gauges[0].companion_gauge_id || gauges[1].companion_gauge_id) {
    throw new Error('One or both gauges already have companions');
  }

  // Update both gauges bidirectionally within same transaction
  await this.executeQuery(
    'UPDATE gauges SET companion_gauge_id = ? WHERE id = ?',
    [gaugeId2, gaugeId1],
    connection
  );

  await this.executeQuery(
    'UPDATE gauges SET companion_gauge_id = ? WHERE id = ?',
    [gaugeId1, gaugeId2],
    connection
  );
}
```

**Benefits**:
- ✅ Works correctly (no chicken-and-egg problem)
- ✅ No recursion risk
- ✅ FOR UPDATE prevents race conditions
- ✅ Clear error messages
- ✅ Easy to test

---

## Consequences

### Positive

✅ **System works**: No impossible constraints blocking operations
✅ **Clear logic**: Bidirectional linking explicit in code
✅ **Testable**: Can unit test without database
✅ **Flexible**: Easy to modify business rules
✅ **Better errors**: Application errors more user-friendly than DB errors
✅ **Performance**: No subquery on every operation

### Negative

⚠️ **Application responsibility**: Must ensure application code always maintains bidirectional links
⚠️ **Manual enforcement**: Developers must use correct service methods

### Mitigation

- Domain model enforces validation before database operations
- Explicit transaction pattern prevents bypass
- Integration tests verify bidirectional linking
- Code review checks for proper service usage

---

## Alternatives Considered

### Alternative 1: Fix Guard Clause in Trigger
**Approach**: Improve trigger guard clause to prevent recursion
**Rejected Because**:
- Guard clause cannot reliably prevent recursion
- Still has performance impact (doubles writes)
- CHECK constraint still impossible regardless of trigger

### Alternative 2: Use Deferred Constraints
**Approach**: Use DEFERRABLE constraints (check at transaction end)
**Rejected Because**:
- MySQL doesn't support DEFERRABLE constraints
- Would require PostgreSQL migration (not in scope)

### Alternative 3: Single-Direction with Computed Companion
**Approach**: Store only one direction, compute other direction
**Rejected Because**:
- More complex queries (always need JOIN)
- Performance impact on all reads
- Unclear which direction is "source of truth"

---

## Implementation Notes

**Phase 1 Tasks**:
1. Remove `chk_bidirectional_companion` from migration
2. Remove `trg_companion_bidirectional` from migration
3. Keep simple CHECK constraints (suffix validation)
4. Document why removed (reference this ADR)

**Phase 3 Tasks**:
1. Implement `linkCompanionsWithinTransaction` with FOR UPDATE
2. Add validation: neither gauge has existing companion
3. Update both directions in same transaction
4. Write concurrency tests

**Validation Queries** (post-migration):
```sql
-- Verify all companions are bidirectional
SELECT COUNT(*) FROM gauges g1
WHERE companion_gauge_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM gauges g2
  WHERE g2.id = g1.companion_gauge_id
  AND g2.companion_gauge_id = g1.id
);
-- Expected: 0 (application maintains invariant)
```

---

## Validation Criteria

**Success Metrics**:
- ✅ Migration applies without errors
- ✅ Gauge sets can be created successfully
- ✅ All companions bidirectional (verified by query)
- ✅ Concurrency tests pass (no race conditions)
- ✅ Integration tests verify transaction rollback

**Review Checklist**:
- [ ] All 3 architects approved removal
- [ ] Team understands why constraints removed
- [ ] Application code handles bidirectional linking
- [ ] Tests verify invariant maintained

---

## References

- Unified Implementation Plan: Lines 204-294 (Critical Database Issues)
- Independent Verification: `INVESTIGATION_VERIFICATION.md` (constraint impossibility)
- Conversation Log: `convo.txt` (all 3 architects agree)
- Repository Implementation: Lines 778-968 (FOR UPDATE locks)

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-24 | 1.0 | Initial ADR | Architect 3 |
