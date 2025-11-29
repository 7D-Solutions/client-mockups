# ADR-004: Explicit companion_history Schema with go_gauge_id/nogo_gauge_id

**Date**: 2025-10-24
**Status**: Accepted
**Decision Makers**: Architect 1, Architect 2, Architect 3
**Phase**: Phase 0 - Architecture Alignment

---

## Context

**Original Proposal** (ambiguous):
```sql
CREATE TABLE companion_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gauge_id_1 INT NOT NULL,  -- ❌ Which is GO? Which is NO GO?
  gauge_id_2 INT NOT NULL,  -- ❌ Ambiguous
  action VARCHAR(50),
  performed_by INT,
  performed_at TIMESTAMP
);
```

**Problems**:
1. **No way to identify gauge roles**: Cannot determine which is GO vs NO GO
2. **Complex queries**: Must check both IDs and cross-reference with gauges table
3. **Poor self-documentation**: Code unclear without comments
4. **Missing constraints**: No ON DELETE CASCADE or proper indexes

**Use Cases Requiring Role Identification**:
- Display history: "GO gauge TG001A paired with NO GO gauge TG001B"
- Query by role: "Find all pairings where specific gauge was the GO gauge"
- Audit reports: "Show GO/NO GO pairing patterns"
- Validation: Ensure GO gauge always has suffix 'A'

---

## Decision

**Use explicit column names** that clearly identify gauge roles:

```sql
CREATE TABLE companion_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  go_gauge_id INT NOT NULL COMMENT 'GO gauge (suffix A)',
  nogo_gauge_id INT NOT NULL COMMENT 'NO GO gauge (suffix B)',
  action VARCHAR(50) NOT NULL COMMENT 'created_together, paired_from_spares, replaced, unpaired',
  performed_by INT NOT NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  metadata JSON,

  FOREIGN KEY (go_gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  FOREIGN KEY (nogo_gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id),

  INDEX idx_go_gauge_history (go_gauge_id, performed_at),
  INDEX idx_nogo_gauge_history (nogo_gauge_id, performed_at),
  INDEX idx_action_type (action, performed_at)
) ENGINE=InnoDB COMMENT='Tracks companion gauge relationship history';
```

**Key Improvements**:
1. ✅ **Explicit roles**: `go_gauge_id` and `nogo_gauge_id` are self-documenting
2. ✅ **ON DELETE CASCADE**: History cleaned up when gauges deleted
3. ✅ **Proper indexes**: Efficient queries by either gauge or action type
4. ✅ **Rich context**: `reason` and `metadata` fields for audit trail
5. ✅ **Action types**: VARCHAR(50) with domain validation for flexibility

---

## Consequences

### Positive

✅ **Self-documenting**: Column names clearly indicate gauge roles
✅ **Simple queries**: No need to check both IDs and cross-reference
✅ **Clear history**: "GO gauge X paired with NO GO gauge Y"
✅ **Audit compliance**: Full audit trail with context
✅ **Easy validation**: Can verify GO gauge has suffix 'A', NO GO has 'B'
✅ **ON DELETE CASCADE**: Automatic cleanup prevents orphaned history

### Negative

⚠️ **Asymmetric**: Must know which gauge is GO vs NO GO when inserting
⚠️ **Order matters**: Cannot arbitrarily assign gauge_id_1 and gauge_id_2

### Mitigation

- Service layer uses GaugeSet domain model (knows GO vs NO GO)
- Repository method signature enforces order: `recordCompanionHistory(goGaugeId, noGoGaugeId, ...)`
- Domain validation ensures correct suffix assignment

---

## Alternatives Considered

### Alternative 1: Symmetric gauge_id_1/gauge_id_2
**Approach**: Keep original proposal with generic column names
**Rejected Because**:
- Requires complex queries to determine roles
- Not self-documenting (need comments everywhere)
- Architect 2 & 3 voted for explicit names
- Poor developer experience

### Alternative 2: Single gauge_id with role column
**Approach**:
```sql
CREATE TABLE companion_history (
  gauge_id INT,
  role ENUM('GO', 'NOGO'),
  companion_gauge_id INT,
  ...
);
```
**Rejected Because**:
- Requires 2 rows per pairing (more complex)
- More storage space
- Queries more complex (need to JOIN on self)
- Denormalized (companion_gauge_id duplicated)

### Alternative 3: Use ENUM for action_type
**Approach**: `action ENUM('created_together', 'paired_from_spares', ...)`
**Rejected Because**:
- Brittle: Schema change required for new action types
- VARCHAR(50) with domain validation more flexible
- Architect 2 recommended VARCHAR approach
- Future action types easier to add

---

## Implementation Notes

**Phase 1 Tasks**:
1. Create companion_history table with explicit schema
2. Add ON DELETE CASCADE to foreign keys
3. Create indexes for efficient queries
4. Document action types in comment

**Phase 3 Tasks**:
1. Implement `recordCompanionHistory(goGaugeId, noGoGaugeId, action, userId, connection, options)`
2. Domain validation for action types: `created_together`, `paired_from_spares`, `replaced`, `unpaired`
3. Include metadata for context (baseId, reason, etc.)

**Action Types** (domain validation):
- `created_together`: Both gauges created as new set
- `paired_from_spares`: Existing spares paired into set
- `replaced`: One gauge replaced in existing set
- `unpaired`: Companion relationship removed

**Example Usage**:
```javascript
await repo.recordCompanionHistory(
  goGaugeId,      // Always GO gauge (suffix A)
  noGoGaugeId,    // Always NO GO gauge (suffix B)
  'created_together',
  userId,
  connection,
  {
    reason: 'New gauge set created',
    metadata: { baseId: 'TG001' }
  }
);
```

**Example Queries**:
```sql
-- Find all history for a specific GO gauge
SELECT * FROM companion_history
WHERE go_gauge_id = 1001
ORDER BY performed_at DESC;

-- Find all pairing actions in last 30 days
SELECT * FROM companion_history
WHERE action = 'paired_from_spares'
AND performed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Audit report: all gauge set creations by user
SELECT
  g1.system_gauge_id AS go_gauge,
  g2.system_gauge_id AS nogo_gauge,
  ch.performed_at,
  u.username
FROM companion_history ch
JOIN gauges g1 ON ch.go_gauge_id = g1.id
JOIN gauges g2 ON ch.nogo_gauge_id = g2.id
JOIN users u ON ch.performed_by = u.id
WHERE ch.action = 'created_together'
AND ch.performed_by = 42;
```

---

## Validation Criteria

**Success Metrics**:
- ✅ Table created with correct schema
- ✅ Foreign keys enforce referential integrity
- ✅ ON DELETE CASCADE works (test with gauge deletion)
- ✅ Indexes used by queries (verify with EXPLAIN)
- ✅ History records accurately track pairings

**Test Cases**:
```javascript
test('records history with explicit roles', async () => {
  await repo.recordCompanionHistory(
    goGaugeId, noGoGaugeId, 'created_together', userId, conn
  );

  const history = await repo.getCompanionHistory(goGaugeId);
  expect(history[0].go_gauge_id).toBe(goGaugeId);
  expect(history[0].nogo_gauge_id).toBe(noGoGaugeId);
});

test('cascade deletes history when gauge deleted', async () => {
  await repo.deleteGauge(goGaugeId, conn);
  const history = await repo.getCompanionHistory(goGaugeId);
  expect(history).toHaveLength(0);
});
```

---

## References

- Unified Implementation Plan: Lines 295-317 (Issue #5: companion_history)
- Migration Script: Lines 440-457 (Final schema)
- Repository Implementation: Lines 888-910 (recordCompanionHistory method)
- Conversation Log: Architects 2 & 3 consensus on explicit names

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-24 | 1.0 | Initial ADR | Architect 3 |
