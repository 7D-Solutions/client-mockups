# ADR-005: FOR UPDATE Locks with Explicit Transaction Isolation Level

**Date**: 2025-10-24
**Status**: Accepted
**Decision Makers**: Architect 1, Architect 2, Architect 3
**Phase**: Phase 0 - Architecture Alignment

---

## Context

**Concurrency Problem**: Multiple users creating gauge sets simultaneously could create race conditions

**Race Condition Scenario** (without locks):
```
Time | User A                          | User B
-----|----------------------------------|----------------------------------
T1   | Read gauge 1001 (no companion)  |
T2   |                                  | Read gauge 1001 (no companion)
T3   | Update: 1001 → companion 1002   |
T4   |                                  | Update: 1001 → companion 1003
T5   | ✅ Commit                        |
T6   |                                  | ✅ Commit (overwrites User A!)
```

**Result**: Gauge 1001 companion changed from 1002 to 1003. User A's work lost. Gauge 1002 orphaned.

**Transaction Isolation Investigation** (Architect 1 verified):
- Current: MySQL default REPEATABLE READ
- ✅ Supports FOR UPDATE locks
- ⚠️ Implicit dependency on MySQL default configuration

---

## Decision

**Implement row-level locks with explicit isolation**:

1. **Add FOR UPDATE to companion linking queries**:
```javascript
const gauges = await this.executeQuery(
  `SELECT id, companion_gauge_id
   FROM gauges
   WHERE id IN (?, ?)
   FOR UPDATE`,  // ← Explicit row lock
  [gaugeId1, gaugeId2],
  connection
);
```

2. **Set explicit transaction isolation level**:
```javascript
async executeInTransaction(operation, auditData = null) {
  const connection = await pool.getConnection();
  await connection.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await connection.beginTransaction();
  // ... rest of code
}
```

3. **Validate constraints while locked**:
```javascript
// Validate neither gauge has companion (while locked)
if (gauges[0].companion_gauge_id || gauges[1].companion_gauge_id) {
  throw new Error('One or both gauges already have companions');
}
```

---

## Problem Analysis

### Race Condition Impact

**Without Locks**:
- User A and B both read same gauge as spare
- Both try to pair with different companions
- Last write wins
- Orphaned gauges created
- Data inconsistency

**With FOR UPDATE**:
- User A locks gauges
- User B waits for lock release
- User A completes pairing
- User B gets updated data (gauge now has companion)
- User B's validation fails appropriately
- Consistency maintained

### MySQL Transaction Isolation Levels

| Isolation Level | FOR UPDATE Works | Default | Performance |
|----------------|------------------|---------|-------------|
| READ UNCOMMITTED | ❌ No | No | Highest |
| READ COMMITTED | ❌ No | No | High |
| REPEATABLE READ | ✅ Yes | ✅ Yes | Medium |
| SERIALIZABLE | ✅ Yes | No | Lowest |

**Why Explicit Setting**:
- Current: Relies on MySQL default (REPEATABLE READ)
- Risk: DB config change could silently break FOR UPDATE
- Production quality: Make requirements explicit
- Documentation: Code clearly states needs

---

## Consequences

### Positive

✅ **Prevents race conditions**: Only one user can modify gauges at a time
✅ **Data consistency**: Cannot create conflicting companion relationships
✅ **Clear errors**: Second user gets clear "already has companion" message
✅ **Explicit requirements**: Transaction isolation level documented in code
✅ **Production safe**: Won't silently break if DB config changes

### Negative

⚠️ **Contention**: Multiple users wait for lock (acceptable for gauge creation)
⚠️ **Deadlock risk**: Must be careful with lock ordering (always lock lower ID first)

### Mitigation

- Lock ordering: Always lock gauges in ID order to prevent deadlocks
- Retry logic: Exponential backoff handles transient deadlocks
- Short transactions: Minimize time holding locks
- Performance monitoring: Track lock wait times

---

## Alternatives Considered

### Alternative 1: Optimistic Locking
**Approach**: Use version column, retry on conflict
```sql
UPDATE gauges SET companion_gauge_id = ?, version = version + 1
WHERE id = ? AND version = ?
```
**Rejected Because**:
- More complex (requires version column in all tables)
- More code (retry logic for every update)
- Less efficient (more aborted transactions)
- FOR UPDATE simpler and more reliable

### Alternative 2: Pessimistic Locking at Application Level
**Approach**: Use application-level locks (Redis, etc.)
**Rejected Because**:
- Requires additional infrastructure (Redis)
- More complex (distributed locking patterns)
- Database already provides row-level locks
- Over-engineering for this use case

### Alternative 3: SERIALIZABLE Isolation Level
**Approach**: Use highest isolation level for all transactions
**Rejected Because**:
- Performance impact on all operations
- REPEATABLE READ sufficient for our needs
- Only companion linking needs strict isolation
- Over-engineering for read operations

### Alternative 4: Rely on Default Isolation Level
**Approach**: Don't set explicit isolation, trust MySQL default
**Rejected Because**:
- Fragile: Silent breakage if config changes
- Implicit dependency difficult to debug
- Architect 1 recommended explicit setting
- Production quality requires explicit requirements

---

## Implementation Notes

**Phase 3 Tasks**:
1. Add FOR UPDATE to `linkCompanionsWithinTransaction`
2. Add explicit SET TRANSACTION ISOLATION LEVEL to `BaseService.executeInTransaction`
3. Implement lock ordering (always lock lower ID first)
4. Add deadlock retry logic in service layer
5. Write concurrency tests

**Lock Ordering Pattern** (prevent deadlocks):
```javascript
async linkCompanionsWithinTransaction(gaugeId1, gaugeId2, connection) {
  // Always lock in ascending ID order
  const [lowerId, higherId] = gaugeId1 < gaugeId2
    ? [gaugeId1, gaugeId2]
    : [gaugeId2, gaugeId1];

  const gauges = await this.executeQuery(
    `SELECT id, companion_gauge_id
     FROM gauges
     WHERE id IN (?, ?)
     FOR UPDATE`,
    [lowerId, higherId],  // ← Consistent order
    connection
  );
}
```

**Explicit Isolation Level**:
```javascript
// backend/src/infrastructure/services/BaseService.js
async executeInTransaction(operation, auditData = null) {
  const connection = await pool.getConnection();

  try {
    // ✅ Explicit isolation level for production quality
    await connection.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.beginTransaction();

    const result = await operation(connection);
    await connection.commit();
    return result;

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

---

## Validation Criteria

**Success Metrics**:
- ✅ FOR UPDATE locks added to companion linking
- ✅ Explicit isolation level set in BaseService
- ✅ Concurrency tests pass (10+ concurrent operations)
- ✅ No race conditions in load testing
- ✅ Lock wait times acceptable (< 100ms average)

**Concurrency Test**:
```javascript
test('concurrent gauge set creation prevents race conditions', async () => {
  const spareGo = await createSpareGauge('A');
  const spareNoGo = await createSpareGauge('B');

  // 10 users try to pair same spares simultaneously
  const promises = Array(10).fill(null).map((_, i) =>
    service.pairSpares(spareGo.id, spareNoGo.id, userId + i)
      .catch(err => err)
  );

  const results = await Promise.all(promises);

  // Exactly 1 succeeds, 9 fail with "already has companion"
  const successes = results.filter(r => r.goGauge);
  const failures = results.filter(r => r.message?.includes('companion'));

  expect(successes).toHaveLength(1);
  expect(failures).toHaveLength(9);
});
```

**Deadlock Test**:
```javascript
test('lock ordering prevents deadlocks', async () => {
  // User A: locks gauge 1 then 2
  // User B: locks gauge 2 then 1
  // Without ordering: potential deadlock
  // With ordering: both lock in same order (no deadlock)

  const promises = [
    service.createGaugeSet(data1, data2, userA),
    service.createGaugeSet(data3, data4, userB)
  ];

  await expect(Promise.all(promises)).resolves.toBeDefined();
});
```

---

## Performance Impact

**Lock Wait Time**:
- Expected: < 50ms for typical gauge creation (< 100ms)
- Acceptable: < 200ms under high load
- Monitoring: Track `innodb_row_lock_time` metric

**Deadlock Frequency**:
- Expected: < 1% of transactions (with lock ordering)
- Acceptable: < 5% (retry handles gracefully)
- Monitoring: Track `Innodb_deadlocks` counter

**Throughput**:
- Expected: 50-100 gauge set creations per second
- Acceptable: 20+ per second
- Monitoring: Track transaction rate and wait times

---

## References

- Unified Implementation Plan: Lines 847-854 (FOR UPDATE implementation)
- Transaction Isolation Verification: `convo.txt:332-390` (Architect 1's investigation)
- BaseService Current Code: `backend/src/infrastructure/services/BaseService.js:10-36`
- Repository Implementation: Lines 778-968 (linkCompanionsWithinTransaction)

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-24 | 1.0 | Initial ADR | Architect 3 |
