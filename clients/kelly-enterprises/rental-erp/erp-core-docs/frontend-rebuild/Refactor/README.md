# Code Refactoring Plans

**Purpose**: Detailed plans for refactoring oversized files in the codebase
**Status**: Planning Phase
**Date Created**: 2025-10-24

---

## Overview

This directory contains comprehensive refactoring plans for files that have grown too large and need to be split into more maintainable components.

**Industry Standards**:
- 300-500 lines: Review for optimization
- 500-700 lines: Should be refactored
- 700+ lines: **Must be refactored** (high priority)
- 1000+ lines: **Critical** - immediate attention needed

---

## Refactoring Plans

### 🔴 Critical Priority (1000+ lines)

#### 1. GaugeRepository.js - [View Plan](./01_GaugeRepository_Refactor_Plan.md)
**File**: `backend/src/modules/gauge/repositories/GaugeRepository.js`
**Size**: 1,045 lines, 110 methods
**Problem**: God Object - single repository doing everything
**Solution**: Split into 5 focused repositories

**Split**:
- `GaugeRepository.js` - Core CRUD (~200 lines)
- `GaugeQueryRepository.js` - Search/filters (~250 lines)
- `GaugeSpecificationRepository.js` - Specs (~200 lines)
- `GaugeRelationshipRepository.js` - Relations (~200 lines)
- `GaugeStatusRepository.js` - Status (~195 lines)

**Impact**: Reduces complexity significantly, improves testability
**Risk**: Medium - requires service layer updates

---

#### 2. gauge-certificates.js - [View Plan](./02_GaugeCertificates_Route_Refactor_Plan.md)
**File**: `backend/src/modules/gauge/routes/gauge-certificates.js`
**Size**: 987 lines, 6 routes (164 lines per route!)
**Problem**: Fat route handlers with massive inline logic
**Solution**: Extract service layer

**Create**:
- `GaugeCertificateService.js` - Business logic (~400 lines)
- `CertificateRepository.js` - Data access (~100 lines)
- Refactored routes (~200 lines)

**Impact**: 5x reduction in route file size, improves testability
**Risk**: Low - clear separation, easy to verify

---

### 🟠 High Priority (700-1000 lines)

#### 3. AdminRepository.js - [View Plan](./03_AdminRepository_Refactor_Plan.md)
**File**: `backend/src/modules/admin/repositories/AdminRepository.js`
**Size**: 909 lines, 94 methods
**Problem**: God Object handling all admin operations
**Solution**: Split by admin function area

**Split**:
- `AdminUserRepository.js` - User management (~250 lines)
- `AdminGaugeRepository.js` - Gauge admin (~250 lines)
- `AdminAuditRepository.js` - Audit queries (~200 lines)
- `AdminStatsRepository.js` - Statistics (~209 lines)

**Impact**: Better organization of admin functionality
**Risk**: Medium - requires service layer updates

---

#### 4. GaugeList.tsx - [View Plan](./04_GaugeList_Frontend_Refactor_Plan.md)
**File**: `frontend/src/modules/gauge/pages/GaugeList.tsx`
**Size**: 762 lines
**Problem**: Massive component doing everything
**Solution**: Extract sub-components and custom hooks

**Create**:
- Main component (~150 lines)
- `useGaugeFilters.ts` hook (~80 lines)
- `useGaugeSelection.ts` hook (~100 lines)
- `useGaugeTabs.ts` hook (~60 lines)
- `GaugeListHeader.tsx` (~120 lines)
- `GaugeListToolbar.tsx` (~100 lines)
- `GaugeListTable.tsx` (~180 lines)
- `GaugeListFooter.tsx` (~80 lines)

**Impact**: 5x reduction in main component, reusable pieces
**Risk**: Medium - requires careful state management

---

#### 5. EditGaugeModal.tsx - [View Plan](./05_EditGaugeModal_Frontend_Refactor_Plan.md)
**File**: `frontend/src/modules/admin/components/EditGaugeModal.tsx`
**Size**: 734 lines
**Problem**: Modal handling gauge editing + certificate management
**Solution**: Split concerns into focused components

**Create**:
- Main modal (~150 lines)
- `useGaugeEdit.ts` hook (~120 lines)
- `GaugeEditForm.tsx` (~220 lines)
- `GaugeSpecificationFields.tsx` (~150 lines)
- `CertificateManager.tsx` (~220 lines)

**Impact**: Cleaner modal structure, better maintainability
**Risk**: Medium - requires careful state management

---

## Implementation Priority

### Phase 1: Critical Backend (Recommended Start)
1. ✅ **GaugeRepository.js** (1045 → 5 files × 200 lines)
2. ✅ **gauge-certificates.js** (987 → extract service layer)

**Rationale**: Highest impact, improves backend architecture significantly

---

### Phase 2: High Priority Backend
3. **AdminRepository.js** (909 → 4 files × 225 lines)
4. **gauges.js route** (785 → extract to services)

**Rationale**: Cleaner admin code, better separation of concerns

---

### Phase 3: Frontend Components
5. **GaugeList.tsx** (762 → component tree)
6. **EditGaugeModal.tsx** (734 → split concerns)

**Rationale**: Improves frontend maintainability and reusability

---

## Additional Files Needing Refactoring

### 🟡 Medium Priority (500-700 lines)

**Backend**:
- `ObservabilityManager.js` - 660 lines
- `auditService.js` - 609 lines
- `HealthMonitor.js` - 584 lines
- `BaseRepository.js` - 581 lines (acceptable for base class)

**Frontend**:
- `GaugeModalManager.tsx` - 667 lines
- Various other modals and complex components

**Note**: Plans for these files can be created as needed, following similar patterns established in the critical/high priority files.

---

## General Refactoring Principles

### When to Split a File

**Split when**:
- ✅ File exceeds 500 lines
- ✅ Multiple distinct responsibilities
- ✅ Hard to understand in one sitting
- ✅ Difficult to test
- ✅ High merge conflict frequency

**Don't split when**:
- ❌ Base classes with common functionality
- ❌ File is large but has single, clear purpose
- ❌ Splitting would create more complexity than it solves

### How to Split

**Repositories**:
1. Identify responsibilities (CRUD, queries, relationships, etc.)
2. Group related methods
3. Create focused repositories
4. Update service layer to use multiple repositories

**Route Files**:
1. Extract business logic to service layer
2. Keep routes thin (5-15 lines per route)
3. Create service methods for complex operations

**React Components**:
1. Extract custom hooks for state management
2. Create sub-components for distinct UI sections
3. Keep main component as orchestrator (~100-200 lines)

**Testing Strategy**:
1. Write unit tests for extracted pieces
2. Integration tests for component/service interactions
3. Ensure 100% of original functionality preserved

---

## Benefits of Refactoring

### Code Quality
- ✅ Easier to understand
- ✅ Easier to test
- ✅ Single Responsibility Principle
- ✅ Better organization

### Team Productivity
- ✅ Fewer merge conflicts
- ✅ Faster onboarding
- ✅ Easier code reviews
- ✅ Reduced cognitive load

### Maintainability
- ✅ Easier to modify
- ✅ Easier to debug
- ✅ Better reusability
- ✅ Clear boundaries

---

## Progress Tracking

### Completed
- [ ] GaugeRepository.js refactoring
- [ ] gauge-certificates.js refactoring
- [ ] AdminRepository.js refactoring
- [ ] GaugeList.tsx refactoring
- [ ] EditGaugeModal.tsx refactoring

### In Progress
- None

### Planned
- See priority order above

---

## Notes

- All refactoring plans include detailed implementation steps
- Each plan specifies acceptance criteria
- Service layer updates documented where needed
- Testing strategies included
- No time estimates (user preference)

---

## Questions or Issues?

If you need clarification on any refactoring plan or want to create plans for additional files, refer to the existing plans as templates.

**Plan Structure**:
1. Problem Analysis
2. Refactoring Strategy
3. File Structure (with line counts)
4. Implementation Steps
5. Benefits
6. Acceptance Criteria
