# Standardized Name Refactor Plan

**Date**: 2025-10-28
**Status**: Planning Phase
**Type**: Architectural Refactor - Breaking Change
**Estimated Effort**: 2.5 hours

---

## Overview

Removal of `standardized_name` column from `gauges` table and implementation of computed display names in the presentation layer.

## Problem Statement

Currently, gauge display names are stored in the `standardized_name` column, which creates several architectural issues:

1. **Data Redundancy**: Thread specifications exist in `gauge_thread_specifications`, but derived display name stored in `gauges`
2. **Synchronization Risk**: Two sources of truth that can drift out of sync
3. **Limited Flexibility**: Format changes require database migrations
4. **Maintenance Overhead**: Name generation logic exists in multiple places

## Solution

**Remove stored names, compute them in the presentation layer.**

- Thread specifications remain the single source of truth
- Display names computed on-demand from specifications
- Presentation logic separated from domain/persistence layers
- Zero risk of data inconsistency

## Documentation Structure

```
standardized-name-refactor/
├── README.md                           # This file - overview and index
├── 01-ARCHITECTURAL-DECISION.md        # Why we're doing this
├── 02-TECHNICAL-ANALYSIS.md            # Performance, tradeoffs, alternatives
├── 03-IMPLEMENTATION-PLAN.md           # Step-by-step execution guide
├── 04-MIGRATION-GUIDE.md               # Database changes and data migration
├── 05-TESTING-STRATEGY.md              # Test plan and verification
├── 06-ROLLBACK-PLAN.md                 # Emergency rollback procedures
└── assets/                             # Diagrams and supporting files
    ├── architecture-before.md
    ├── architecture-after.md
    └── performance-benchmarks.md
```

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **No backward compatibility** | Clean break allows simpler implementation |
| **Presentation layer computation** | Separation of concerns, single responsibility |
| **No database triggers** | Avoids hidden logic and vendor lock-in |
| **No caching initially** | Measure first, optimize if needed |

## Implementation Phases

1. **Phase 1: Database Migration** - Remove `standardized_name` column
2. **Phase 2: Backend Presenter** - Create `GaugePresenter` for name formatting
3. **Phase 3: Repository Updates** - Update queries to JOIN specifications
4. **Phase 4: Service Layer** - Integrate presenter into services
5. **Phase 5: Frontend Updates** - Replace `standardized_name` with `displayName`
6. **Phase 6: Cleanup** - Remove old code
7. **Phase 7: Testing** - Comprehensive verification
8. **Phase 8: Documentation** - API docs and migration notes

## Success Criteria

- ✅ All gauges display correct names
- ✅ Search functionality works
- ✅ Pairing logic still validates specs correctly
- ✅ No performance degradation (< 10ms difference)
- ✅ All tests pass
- ✅ API documentation updated

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance degradation | Medium | Benchmark before/after, add indexes |
| Frontend breakage | High | Global search/replace, comprehensive testing |
| Data loss | Low | Column drop is safe (derived data only) |
| Rollback complexity | Medium | Document rollback procedure with scripts |

## Timeline

- **Planning & Documentation**: Completed
- **Implementation**: 2.5 hours
- **Testing**: 30 minutes
- **Documentation**: 15 minutes
- **Total**: ~3.5 hours

## Next Steps

1. ✅ Commit current work (completed)
2. ✅ Create plan documentation (in progress)
3. Review and approve plan
4. Execute implementation
5. Deploy to development
6. Verify functionality
7. Update production when stable

---

**Last Updated**: 2025-10-28
**Author**: Architecture Team
**Approved By**: Pending Review
