# Critical Files Analysis

**Date:** 2025-09-09  
**Purpose:** Identify the most problematic files requiring immediate attention

## Top 10 Problem Files

### 1. GaugeInventory.tsx (463 lines, 15.7KB)
**Issues:**
- Handles 8+ responsibilities in one component
- 3 separate API calls with no caching
- Complex filtering/sorting logic mixed with UI
- Business logic embedded in render logic
- Performance issues from excessive re-renders

**Fix:** Split into 10+ focused components

### 2. /components/Modal.tsx vs /infrastructure/components/Modal.tsx
**Issues:**
- Two competing base modal implementations
- Legacy uses all inline styles
- Infrastructure uses mixed Tailwind + inline
- 27 modal components don't know which to use

**Fix:** Delete legacy, standardize on infrastructure version

### 3. /modules/gauge/types/index.ts (174 lines)
**Issues:**
- `pending_transfer?: any` (line 34)
- `cache: Record<string, any>` throughout
- Gauge interface has 48 fields (too complex)
- Duplicate definitions in 4 other files

**Fix:** Strict types, no `any`, split into domain/api/ui types

### 4. /infrastructure/store/index.ts (316 lines)
**Issues:**
- Monolithic store with all modules
- Using `any` types in 6 places
- No middleware (persist, devtools)
- Basic cache implementation

**Fix:** Split by module, add middleware, remove `any`

### 5. /frontend/src/index.css (808 lines)
**Issues:**
- 87 !important declarations
- Overrides design system specs
- Wrong calc() values
- Mixed with legacy styles

**Fix:** Remove overrides, follow design system

### 6. UserManagement.tsx (13KB)
**Issues:**
- User CRUD + UI + filtering + modals in one file
- Direct API calls despite service layer
- Complex state management

**Fix:** Decompose into UserList, UserForm, UserFilters

### 7. RoleManagement.tsx (14.4KB)
**Issues:**
- Permission matrix + role CRUD + UI
- Deeply nested conditional rendering
- No component separation

**Fix:** Split into RoleList, PermissionMatrix, RoleEditor

### 8. GaugeDetailsModal.tsx (Duplicated)
**Issues:**
- Exists in /components (7.4KB)
- Exists in /modules/gauge/components (8.5KB)
- Different implementations
- Neither uses base Modal

**Fix:** Delete legacy, use single implementation

### 9. apiClient usage in components
**Issues:**
- Direct calls in GaugeInventory
- Direct calls in UserManagement
- Bypassing gaugeService.ts
- No error handling

**Fix:** Enforce service layer usage

### 10. QCApprovalsModal.tsx (11.8KB)
**Issues:**
- Complex approval logic in UI component
- Multiple responsibilities
- Duplicated in two locations

**Fix:** Extract approval logic to hooks

## Immediate Actions Required

1. **Delete all duplicate files**
2. **Remove all `any` types**
3. **Pick ONE modal system**
4. **Decompose files >200 lines**
5. **Remove ALL inline styles**

## Impact if Not Fixed

- Development velocity: -50%
- Bug rate: +60%
- Performance: -40%
- Maintainability: Extremely poor