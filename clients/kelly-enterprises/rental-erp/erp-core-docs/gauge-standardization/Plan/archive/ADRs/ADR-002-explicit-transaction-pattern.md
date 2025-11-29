# ADR-002: Explicit Transaction Pattern in Repository Layer

**Date**: 2025-10-24
**Status**: Accepted
**Decision Makers**: Architect 1, Architect 2, Architect 3
**Phase**: Phase 0 - Architecture Alignment

---

## Context

**Current Problem**: Dual-mode repository methods create transaction ambiguity

**Bug Evidence** (`GaugeRepository.js:934-943`):
```javascript
async updateCompanionGauges(gaugeId1, gaugeId2, conn) {
  const connection = conn || await this.getConnectionWithTimeout();

  // ❌ BUG: Missing connection parameter
  await this.executeQuery(
    'UPDATE gauges SET companion_gauge_id = ? WHERE id = ?',
    [gaugeId2, gaugeId1]
    // MISSING: , connection
  );
}
```

**Root Cause**: Dual-mode pattern creates confusion
- If `conn` provided → use it (part of larger transaction)
- If `conn` not provided → create own transaction
- Violates Single Responsibility Principle
- Unclear transaction ownership

**Impact**:
- Updates execute on NEW connection from pool
- Transaction rollback doesn't affect companion updates
- Creates orphaned/inconsistent gauge pairs
- Evidence: 100% of gauges have NULL companion_gauge_id

---

## Decision

**Enforce explicit transaction pattern** for all write operations:

1. **All write methods REQUIRE connection parameter**:
   - `createWithinTransaction(data, connection)` - NOT `create(data, conn?)`
   - `linkCompanionsWithinTransaction(id1, id2, connection)` - NOT `updateCompanionGauges(id1, id2, conn?)`

2. **Throw error if connection missing**:
```javascript
async createWithinTransaction(gaugeData, connection) {
  if (!connection) {
    throw new Error('createWithinTransaction requires connection parameter');
  }
  // ... implementation
}
```

3. **Method naming convention**:
   - Write methods: `*WithinTransaction(...)` suffix
   - Read methods: No suffix (can use default connection)

4. **Service layer manages transactions**:
```javascript
// Service layer orchestrates
async createGaugeSet(goData, noGoData, userId) {
  return this.executeInTransaction(async (connection) => {
    const go = await repo.createWithinTransaction(goData, connection);
    const noGo = await repo.createWithinTransaction(noGoData, connection);
    await repo.linkCompanionsWithinTransaction(go.id, noGo.id, connection);
  });
}
```

---

## Consequences

### Positive

✅ **Clear transaction ownership**: Service layer owns transactions, repository executes queries
✅ **Cannot forget connection**: Missing connection throws descriptive error
✅ **Self-documenting**: Method names clearly state transaction requirement
✅ **Prevents bug class**: Impossible to violate transaction boundaries
✅ **Single Responsibility**: Repository does data access only

### Negative

⚠️ **Verbosity**: Method names longer (`createWithinTransaction` vs `create`)
⚠️ **Breaking change**: All calling code must be updated
⚠️ **Learning curve**: Team must understand explicit pattern

### Neutral

- Consistent with Single Responsibility Principle
- Aligns with development phase (breaking changes acceptable)
- No performance impact

---

## Alternatives Considered

### Alternative 1: Keep Dual-Mode Pattern (Fix Bug Only)
**Approach**: Fix missing connection parameter but keep dual-mode methods
**Rejected Because**:
- Doesn't prevent future bugs (ambiguity remains)
- Unclear who owns transaction lifecycle
- Easy to make same mistake again
- User requirement: "clean solution not patchwork"

### Alternative 2: Always Create Own Transaction
**Approach**: Repository methods always create their own transactions
**Rejected Because**:
- Cannot compose multiple operations in single transaction
- No way to enforce atomicity for gauge set creation
- Nested transactions problematic in MySQL

### Alternative 3: Implicit Connection Passing (Context)
**Approach**: Use thread-local storage or context to pass connection
**Rejected Because**:
- Node.js async context difficult to manage correctly
- Hidden dependencies make code harder to understand
- Explicit is better than implicit (Python Zen applies here)

---

## Implementation Notes

**Phase 3 Tasks**:
1. Rename all write methods with `WithinTransaction` suffix
2. Add connection validation at method start
3. Update all calling code to pass connection
4. Remove dual-mode logic (`conn || getConnection()`)
5. Write integration tests for transaction rollback

**Migration Pattern**:
```javascript
// OLD (dual-mode)
async create(gaugeData, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  await this.executeQuery(sql, params, connection);
}

// NEW (explicit)
async createWithinTransaction(gaugeData, connection) {
  if (!connection) {
    throw new Error('createWithinTransaction requires connection parameter');
  }
  await this.executeQuery(sql, params, connection);
}
```

**Affected Methods**:
- `create()` → `createWithinTransaction()`
- `updateCompanionGauges()` → `linkCompanionsWithinTransaction()`
- Any other write operation

---

## Validation Criteria

**Success Metrics**:
- ✅ All write methods require connection parameter
- ✅ Missing connection throws descriptive error
- ✅ Integration tests verify transaction rollback works
- ✅ No dual-mode methods remain in repository

**Test Cases**:
```javascript
// Should throw error
test('createWithinTransaction throws without connection', () => {
  expect(() => repo.createWithinTransaction(data, null))
    .toThrow('requires connection parameter');
});

// Should rollback on error
test('transaction rollback prevents partial writes', async () => {
  try {
    await service.executeInTransaction(async (conn) => {
      await repo.createWithinTransaction(go, conn);
      await repo.createWithinTransaction(noGo, conn);
      throw new Error('Simulate failure');
    });
  } catch (e) {}

  const gauges = await repo.findAll();
  expect(gauges).toHaveLength(0); // Both rolled back
});
```

---

## References

- Unified Implementation Plan: Lines 778-968 (Repository Pattern)
- Bug Evidence: Lines 67-102 (Transaction boundary violation)
- BaseRepository: `backend/src/infrastructure/repositories/BaseRepository.js:524`
- Service Layer: Lines 973-1198 (Transaction orchestration)

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-24 | 1.0 | Initial ADR | Architect 3 |
