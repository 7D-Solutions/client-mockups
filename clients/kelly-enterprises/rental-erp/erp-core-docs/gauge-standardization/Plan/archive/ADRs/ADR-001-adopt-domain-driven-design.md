# ADR-001: Adopt Domain-Driven Design for Gauge Set System

**Date**: 2025-10-24
**Status**: Accepted
**Decision Makers**: Architect 1, Architect 2, Architect 3
**Phase**: Phase 0 - Architecture Alignment

---

## Context

The gauge set system has critical bugs and scattered business logic:

**Current Problems**:
1. **Transaction boundary violations**: Missing connection parameters cause updates outside transaction scope
2. **Missing gauge_suffix population**: Frontend sends data but backend ignores it
3. **Scattered business rules**: Validation logic spread across 4+ files
   - `GaugeValidationService` - Field validation
   - `GaugeIdService` - Suffix extraction
   - `GaugeCreationService` - Name generation
   - `GaugeRepository` - Companion linking logic

**Evidence**:
- 100% of gauges have NULL companion_gauge_id (transaction bug)
- 100% of gauges have NULL gauge_suffix (missing population)
- Cannot enforce invariants (e.g., matching specifications for companion pairs)

**Environment**:
- Development phase - breaking changes acceptable
- Test data only - easy to reset/migrate
- Strong foundation exists (repository pattern, transaction infrastructure)

---

## Decision

**Adopt Domain-Driven Design with these components**:

1. **Domain Models** (encapsulate business rules):
   - `GaugeEntity` - Value object for individual gauges
   - `GaugeSet` - Aggregate root for GO/NO GO pairs
   - `DomainValidationError` - Rich error handling with metadata

2. **Business Rules in Domain Layer**:
   - Companion gauges must have matching thread specifications
   - NPT gauges cannot have companions
   - GO gauges must have suffix 'A'
   - NO GO gauges must have suffix 'B'
   - Both gauges must be same equipment type and category

3. **Repository Pattern** (data access only):
   - No business logic
   - Explicit transaction requirements
   - All write methods require connection parameter

4. **Service Layer** (orchestration):
   - Manages transaction lifecycle
   - Uses domain models for validation
   - Coordinates repository operations

---

## Consequences

### Positive

✅ **Cannot create invalid states**: Domain model validates on construction
✅ **Business rules centralized**: Single source of truth in domain objects
✅ **Clear error messages**: DomainValidationError includes metadata for debugging
✅ **Easy to test**: Domain models have no database dependencies
✅ **Self-documenting**: Code clearly expresses business intent
✅ **Future-proof**: Easy to add new business rules

### Negative

⚠️ **Learning curve**: Team needs to understand DDD patterns
⚠️ **More files**: 3 new domain files vs scattered logic
⚠️ **Migration effort**: Requires refactoring existing code

### Neutral

- Fits well with existing architecture (repository pattern already in place)
- No performance impact (validation happens in-memory)
- Development phase allows clean refactor

---

## Alternatives Considered

### Alternative 1: Minimal Bug Fix Only
**Approach**: Fix connection parameter bug and add gauge_suffix field
**Rejected Because**:
- Doesn't prevent future bugs (no invariant enforcement)
- Business rules remain scattered
- Mismatched gauge pairs still possible
- User requirement: "clean solution not patchwork"

### Alternative 2: Database Constraints Only
**Approach**: Enforce all rules via CHECK constraints and triggers
**Rejected Because**:
- Complex constraints architecturally impossible (bidirectional companion)
- Poor error messages (database errors not user-friendly)
- Less flexible (schema changes required for rule changes)
- Performance impact (subqueries on every insert/update)

### Alternative 3: Service Layer Validation Only
**Approach**: Keep validation in service layer without domain models
**Rejected Because**:
- Cannot enforce invariants (rules can be bypassed)
- Logic remains scattered across multiple services
- Hard to test (requires database mocking)
- No type safety for business rules

---

## Implementation Notes

**Phase 2 Tasks**:
1. Create `backend/src/modules/gauge/domain/` directory
2. Implement `DomainValidationError.js`
3. Implement `GaugeEntity.js` with field validation
4. Implement `GaugeSet.js` with relationship validation
5. Write comprehensive unit tests (100% coverage target)

**Code Example** (GaugeSet validation):
```javascript
class GaugeSet {
  constructor({ baseId, goGauge, noGoGauge, category }) {
    this.validate(); // Enforces ALL business rules
  }

  validate() {
    // Rule: Specifications must match
    if (!this.specificationsMatch()) {
      throw new DomainValidationError(
        'Companion gauges must have matching specs',
        'SPEC_MISMATCH',
        { goSpecs: {...}, noGoSpecs: {...} }
      );
    }

    // Rule: NPT cannot have companions
    if (this.category.name === 'NPT') {
      throw new DomainValidationError(
        'NPT gauges cannot have companion pairs',
        'NPT_NO_COMPANION'
      );
    }

    // Additional rules...
  }
}
```

---

## Validation Criteria

**Success Metrics**:
- ✅ Cannot create GaugeSet with mismatched specifications
- ✅ Cannot create NPT gauge pairs
- ✅ Cannot create gauge set with wrong suffixes
- ✅ 100% domain model test coverage
- ✅ Clear error messages with actionable metadata

**Review Checklist**:
- [ ] All 3 architects approved
- [ ] Team understands DDD patterns
- [ ] Unit test strategy defined
- [ ] Migration path clear

---

## References

- Unified Implementation Plan: `UNIFIED_IMPLEMENTATION_PLAN.md`
- Bug Evidence: Lines 67-144 (transaction violation, missing suffix)
- Architecture Analysis: Lines 145-197 (strengths and weaknesses)
- Domain Model Design: Lines 539-776

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-24 | 1.0 | Initial ADR | Architect 3 |
