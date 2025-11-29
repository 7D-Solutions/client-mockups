# Inventory Module - Planning Documentation

**Created**: 2025-10-29
**Updated**: 2025-10-30 (Simplified for incremental development)
**Status**: Planning Phase - Ready for Implementation ✅
**Purpose**: Cross-module inventory visibility and movement tracking system

---

## 🎯 Deployment Context

**Critical Information**: Current database contains **test data only** - can be cleared and recreated

**Deployment Approach**:
- ✅ No backward compatibility needed (clean cutover)
- ✅ No initial data migration required
- ✅ No maintenance window needed
- ✅ Trivial rollback (just drop tables)
- ✅ Migration file ready: `020-create-inventory-tables.sql` ✅

**Benefits**: Simplified deployment, clean testing, no legacy concerns

---

## Quick Start

**New to this project?** Start with [REQUIREMENTS.md](REQUIREMENTS.md) - it contains everything you need to understand the inventory module.

**Ready to build?** Read [implementation-plan.md](implementation-plan.md) for the phased implementation approach.

**Want to see future features?** Check [FUTURE-ENHANCEMENTS.md](FUTURE-ENHANCEMENTS.md) for the backlog.

---

## Document Structure

### Core Planning Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| **[REQUIREMENTS.md](REQUIREMENTS.md)** | Complete requirements specification from Q&A session | Everyone |
| **[database-design.md](database-design.md)** | Simplified database schema with "add as needed" philosophy | Backend developers |
| **[implementation-plan.md](implementation-plan.md)** | 5-phase MVP implementation plan | Development team |
| **[FUTURE-ENHANCEMENTS.md](FUTURE-ENHANCEMENTS.md)** | Features to add after MVP based on actual needs | Product managers |

### Additional Resources

| Resource | Contents |
|----------|----------|
| **[mockups/](mockups/)** | Approved HTML mockups (v3 landing page, location detail, movement history) |
| **[archive/](archive/)** | Older planning documents (backend-structure, frontend-structure, module-overview) |

---

## What is the Inventory Module?

A **reporting and visibility layer** that provides a unified view of inventory across all modules (gauges, tools, parts) without owning the items themselves.

### Core Question Answered
**"Where are my items?"**

### Key Features (MVP)
- ✅ Cross-module inventory dashboard
- ✅ Location-based item tracking ("What's in location A1?")
- ✅ Movement history and audit trail
- ✅ Simple storage location CRUD
- ✅ Search functionality (4 options: All, ID, Name, Location)

### What It Does NOT Do
- ❌ Create/delete gauges, tools, or parts (modules own their items)
- ❌ Change item quantities (modules handle their own inventory)
- ❌ Manage item-specific attributes (calibration dates, checkout status, etc.)

---

## Architecture Principles

### 1. Simple First, Add As Needed
**Don't over-engineer upfront.** Start with minimal viable schema, add fields/indexes/features when actual production needs prove they're necessary.

### 2. Inventory Module = Reporting Layer
**Decision**: Inventory module shows cross-module view but doesn't own items

**Benefits**:
- Maintains single source of truth in each module
- Loose coupling between modules
- Easy to add new inventory types
- No risk of data inconsistency

### 3. API-Based Movement Tracking
**Decision**: Modules call inventory API when items move, inventory records in both tables atomically

**Benefits**:
- Simple, direct integration
- Atomic transactions ensure consistency
- Easy to add new modules
- Clear separation of concerns

### 4. Query Federation
**Decision**: Query each module's table dynamically instead of central table

**Benefits**:
- Single source of truth maintained
- No data duplication
- No sync issues
- Modules remain autonomous

---

## Simplified MVP Scope

### Database
- ✅ `inventory_movements` table with **3 indexes** (not 6)
- ✅ **4 movement types** (transfer, created, deleted, other)
- ✅ No cached fields (query source modules on demand)
- ✅ Reserved fields for parts (quantity, order_number, job_number)

### Implementation Phases
1. **Phase 1**: Database schema + movement tracking
2. **Phase 2**: Gauge module integration
3. **Phase 3**: Frontend dashboard + location detail
4. **Phase 4**: Movement history
5. **Phase 5**: Simple location management (create, edit, delete)

### Moved to Future Enhancements
- ❌ Advanced location management (bulk generator, drag-reorder)
- ❌ Analytics dashboard (utilization, trends, charts)
- ❌ Additional database optimizations (add when proven necessary)
- ❌ 40+ features documented in FUTURE-ENHANCEMENTS.md

**Philosophy**: Add features based on actual production needs, not speculation.

---

## Success Criteria

### Technical
- ✅ All modules continue to work independently
- ✅ Movement tracking doesn't slow down module operations
- ✅ No data inconsistencies between modules and inventory view

### User Experience
- ✅ Users can find any item's location quickly
- ✅ Movement history provides complete audit trail
- ✅ Dashboard provides clear inventory visibility

### Business
- ✅ Reduced time to locate items
- ✅ Complete movement audit trail
- ✅ Cross-module visibility without switching views
- ✅ Ready to add advanced features based on actual needs

---

## Current Status

### ✅ Completed
- Planning documentation complete (simplified for incremental development)
- Requirements finalized from Q&A session
- HTML mockups approved
- StorageLocationSelect infrastructure component exists
- Storage locations backend infrastructure exists

### ⏳ Next Steps
1. Review simplified plan with development team
2. Create Phase 1 tasks in project management tool
3. Run database migration (020-create-inventory-tables.sql)
4. Begin backend implementation (MovementRepository, MovementTrackingService)

---

## Key Design Decisions

### Why Inventory Owns Movement History
**Context**: Gauge module already has `gauge_transactions` table

**Decision**: Inventory creates its own `inventory_movements` table for location tracking only

**Rationale**:
- `gauge_transactions` tracks ALL lifecycle events (calibration, QC, unsealing, retirement)
- Inventory needs ONLY location changes with structured from/to fields
- Parts require quantity tracking + order/job numbers that don't fit gauge transaction model
- Consistent schema across all item types (gauges, tools, parts)

**Result**: Both tables coexist serving different purposes

### Why Simplified Schema
**Decision**: Start with 3 indexes and 4 movement types, not 6 and 8

**Rationale**:
- Don't optimize for problems we might never have
- Add indexes when queries prove slow
- Add movement types when parts module is built
- Remove cached fields (query source modules on demand)

**Result**: 40% simpler database, can add back features when proven necessary

---

## Document Change Log

| Date | Changes | Reason |
|------|---------|--------|
| 2025-10-29 | Initial planning documents created | Q&A session completed |
| 2025-10-30 | Simplified for incremental development | User feedback: "simple is best" |
| 2025-10-30 | Created FUTURE-ENHANCEMENTS.md | Separated MVP from future features |
| 2025-10-30 | Archived redundant documents | Consolidated into REQUIREMENTS.md |
| 2025-10-30 | Removed all timeline estimates | Cannot predict time accurately |

---

## Archived Documents

The following documents have been archived because their content was consolidated:

- **backend-structure.md** → Details now in implementation-plan.md
- **frontend-structure.md** → Details now in implementation-plan.md
- **module-overview.md** → Content merged into REQUIREMENTS.md

These are available in the `archive/` folder for reference.

---

**Philosophy**: "Simple is best in most cases. Long-term solutions, not short-term patches."

**Ready for**: Phase 1 implementation
