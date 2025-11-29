# Fire-Proof ERP - Gold Standard Implementation Roadmap

**Total Effort**: ~663,000 tokens (code changes only, minimum estimate)
**Timeline**: 6-9 months (26-39 weeks)
**Phases**: 8 major phases
**Overall Health Target**: 72/100 → 95/100

---

## Roadmap Overview

| Phase | Focus | Tokens | Timeline | Priority | Health Impact |
|-------|-------|--------|----------|----------|---------------|
| **Phase 0** | Infrastructure Setup | ~10K | Week 1 | P0 | 72→73 |
| **Phase 1** | Security Blockers | ~2K | Week 1 | P0 | 73→74 |
| **Phase 1.5** | Test Safety Net | ~30K | Week 2-3 | P0 | 74→76 |
| **Phase 2** | Refactoring | ~250K | Week 4-10 | P1 | 76→82 |
| **Phase 2.5** | UI Improvements | ~17K | Week 11 | P1 | 82→84 |
| **Phase 3** | Comprehensive Testing | ~145K | Week 12-18 | P1 | 84→88 |
| **Phase 4** | Quality + Backend Tests | ~89K | Week 19-25 | P2 | 88→92 |
| **Phase 5** | Long-Term | ~120K | Week 26-39 | P2 | 92→95 |

**Total**: 663K tokens (minimum estimate, variance: ±20%)

---

## Phase 0: Infrastructure Setup (~10K tokens, Week 1)

**Goal**: Set up critical dependencies and configurations BEFORE any code changes
**Health Impact**: 72 → 73 (+1 point)
**Priority**: MUST complete before any other phases

### Tasks

1. **Package Dependencies** (3,000 tokens)
   - Add security packages: `csurf`, `helmet`, `express-rate-limit`
   - Add validation: `joi`
   - Add caching: `redis`, `ioredis`
   - Add testing utilities: `@testing-library/user-event`, `msw`
   - Update `package.json` in both `/backend` and `/frontend`

2. **Environment Configuration** (2,000 tokens)
   - Add `.env` variables for Redis
   - Add CSRF secret key
   - Add rate limiting configs
   - Document all new env vars

3. **TypeScript Configuration** (3,000 tokens)
   - Enable strict mode in `tsconfig.json`
   - Add path aliases for cleaner imports
   - Configure type checking for tests
   - Set up type declaration files

4. **Database Migrations Setup** (2,000 tokens)
   - **Purpose**: Infrastructure for FUTURE schema changes only (database exists with 47 tables)
   - Create migration infrastructure in `/backend/migrations/`
   - Add migration runner script with tracking table (`schema_migrations`)
   - Document migration process in `/backend/migrations/README.md`
   - **NO baseline migration** - database already exists with comprehensive schema

**Deliverables**:
- All dependencies installed
- Environment configured
- TypeScript strict mode enabled
- Migration infrastructure ready

---

## Phase 1: Security Blockers (~2K tokens, Week 1)

**Goal**: Eliminate CRITICAL security vulnerabilities immediately
**Health Impact**: 73 → 74 (+1 point)
**Priority**: P0 - MUST complete before any other code changes

### Tasks

1. **Remove Password Logging** (500 tokens)
   - File: `backend/src/infrastructure/database/connection.js:45`
   - Delete line completely
   - Audit entire codebase for sensitive data logging
   - Update logging guidelines

2. **CSRF Protection** (1,500 tokens)
   - Backend: Create `backend/src/infrastructure/middleware/csrf.js`
   - Integrate with all POST/PUT/DELETE routes
   - Frontend: Add CSRF token interceptor to `apiClient.js`
   - Test CSRF protection on all forms

**Deliverables**:
- Zero password logging in codebase
- CSRF protection on all state-changing endpoints
- Security scan shows zero CRITICAL vulnerabilities

---

## Phase 1.5: Test Safety Net (~30K tokens, Week 2-3)

**Goal**: Write critical tests BEFORE refactoring to prevent breaking changes
**Health Impact**: 74 → 76 (+2 points)
**Priority**: P0 - MUST complete before Phase 2 refactoring

**CRITICAL**: This phase prevents breaking the codebase during refactoring. We MUST have tests before splitting files.

### 1.5.1 Critical Path Tests (15,000 tokens)

**Test files that will be refactored in Phase 2**:

#### Gauge Module (8,000 tokens)
- `GaugeList.test.jsx` (2,000 tokens)
  - Test filtering, sorting, pagination
  - Test bulk actions
  - Test data loading states

- `SetDetail.test.jsx` (2,000 tokens)
  - Test gauge card rendering
  - Test history display
  - Test actions (repair, remove)

- `GaugeForm.test.jsx` (2,000 tokens)
  - Test form validation
  - Test submission
  - Test field interactions

- `QCApprovalsModal.test.tsx` (2,000 tokens)
  - Test approval list
  - Test approval actions
  - Test validation

#### Admin Module (4,000 tokens)
- `UserManagement.test.jsx` (2,000 tokens)
  - Test user table
  - Test filters
  - Test bulk actions

- `EditUserModal.test.tsx` (2,000 tokens)
  - Test form fields
  - Test permission management
  - Test validation

#### Inventory Module (3,000 tokens)
- `InventoryDashboard.test.jsx` (2,000 tokens)
  - Test metrics display
  - Test filters
  - Test table interactions

- `LocationDetailPage.test.jsx` (1,000 tokens)
  - Test location data display
  - Test item actions

### 1.5.2 Backend Repository Tests (8,000 tokens)

Test backend repositories before refactoring:

- `GaugeRepository.test.js` (2,000 tokens)
- `SetRepository.test.js` (2,000 tokens)
- `UserRepository.test.js` (2,000 tokens)
- `InventoryRepository.test.js` (2,000 tokens)

### 1.5.3 Integration Tests (7,000 tokens)

Test critical API endpoints:

- Gauge endpoints (2,000 tokens)
- Admin/User endpoints (2,000 tokens)
- Inventory endpoints (2,000 tokens)
- Auth endpoints (1,000 tokens)

**Deliverables**:
- All files to be refactored have test coverage
- Critical paths protected by tests
- Tests pass before refactoring begins
- Test coverage: Frontend 15% → 25%, Backend 58.7% → 65%

---

## Phase 2: Refactoring (~250K tokens, Week 4-10)

**Goal**: Split oversized files, eliminate duplication, WITH tests to verify
**Health Impact**: 76 → 82 (+6 points)
**Priority**: P1

**CRITICAL**: Tests from Phase 1.5 MUST pass after EVERY file split. If tests fail, rollback immediately.

### 2.1 File Size Compliance (200,000 tokens)

**40 files >500 lines need refactoring** (updated count from agent review)

#### Gauge Module (10 files, ~75K tokens)

1. **GaugeList.jsx** (782 lines → 4 files, 10,000 tokens)
   - Extract `GaugeFilters.jsx` (200 lines)
   - Extract `GaugeTable.jsx` (250 lines)
   - Extract `GaugeBulkActions.jsx` (150 lines)
   - Core: 180 lines
   - **Test after split**: Run `GaugeList.test.jsx` → MUST PASS

2. **SetDetail.jsx** (654 lines → 4 files, 9,000 tokens)
   - Extract `SetGaugeCard.jsx` (180 lines)
   - Extract `SetHistory.jsx` (200 lines)
   - Extract `SetActions.jsx` (120 lines)
   - Core: 150 lines
   - **Test after split**: Run `SetDetail.test.jsx` → MUST PASS

3. **GaugeForm.jsx** (589 lines → 3 files, 8,000 tokens)
   - Extract `GaugeFormFields.jsx` (280 lines)
   - Extract `GaugeValidation.js` (150 lines)
   - Core: 160 lines
   - **Test after split**: Run `GaugeForm.test.jsx` → MUST PASS

4. **QCApprovalsModal.tsx** (571 lines → 4 files, 8,000 tokens)
   - Extract `ApprovalList.tsx` (200 lines)
   - Extract `ApprovalActions.tsx` (150 lines)
   - Extract `ApprovalValidation.ts` (120 lines)
   - Core: 100 lines
   - **Test after split**: Run `QCApprovalsModal.test.tsx` → MUST PASS

5. **GaugeRepository.js** (560 lines → 3 files, 8,000 tokens)
   - Extract `GaugeQueries.js` (250 lines)
   - Extract `GaugeValidators.js` (150 lines)
   - Core: 160 lines
   - **Test after split**: Run `GaugeRepository.test.js` → MUST PASS

6-10. **5 more gauge files** (530-560 lines each, 32,000 tokens total)
   - Similar extraction patterns
   - Test after each split

#### Admin Module (12 files, ~84K tokens)

11. **UserManagement.jsx** (843 lines → 5 files, 12,000 tokens)
    - Extract `UserTable.jsx` (280 lines)
    - Extract `UserFilters.jsx` (180 lines)
    - Extract `UserBulkActions.jsx` (150 lines)
    - Extract `UserValidation.js` (120 lines)
    - Core: 110 lines
    - **Test after split**: Run `UserManagement.test.jsx` → MUST PASS

12. **EditUserModal.tsx** (678 lines → 4 files, 10,000 tokens)
    - Extract `UserFormFields.tsx` (250 lines)
    - Extract `PermissionManager.tsx` (220 lines)
    - Extract `UserValidation.ts` (120 lines)
    - Core: 90 lines
    - **Test after split**: Run `EditUserModal.test.tsx` → MUST PASS

13. **EquipmentRules.jsx** (623 lines → 3 files, 9,000 tokens)
14. **StatusRules.jsx** (598 lines → 3 files, 9,000 tokens)
15. **PermissionRules.jsx** (567 lines → 3 files, 8,000 tokens)
16. **UserRepository.js** (545 lines → 3 files, 7,000 tokens)

17-22. **7 more admin files** (505-600 lines each, 29,000 tokens total)

#### Inventory Module (10 files, ~56K tokens)

23. **InventoryDashboard.jsx** (756 lines → 5 files, 11,000 tokens)
    - Extract `InventoryMetrics.jsx` (200 lines)
    - Extract `InventoryFilters.jsx` (180 lines)
    - Extract `InventoryTable.jsx` (250 lines)
    - Extract `InventoryActions.jsx` (120 lines)
    - Core: 180 lines
    - **Test after split**: Run `InventoryDashboard.test.jsx` → MUST PASS

24. **LocationDetailPage.jsx** (689 lines → 4 files, 10,000 tokens)
    - **Test after split**: Run `LocationDetailPage.test.jsx` → MUST PASS

25-32. **8 more inventory files** (510-650 lines each, 35,000 tokens total)

#### Backend Module (8 files, ~35K tokens)

33-40. **8 backend files** (505-580 lines each)
    - Extract repositories, validators, utils
    - Test after each split

### 2.2 React Error Boundaries (10,000 tokens)

**Missing from original plan** - Critical for production stability:

1. **Global Error Boundary** (3,000 tokens)
   - Create `ErrorBoundary.tsx` component
   - Catch React errors app-wide
   - Fallback UI for crashes
   - Error logging integration

2. **Module-Level Error Boundaries** (7,000 tokens)
   - Gauge module boundary
   - Admin module boundary
   - Inventory module boundary
   - User module boundary

### 2.3 Modal Component Abstraction (20,000 tokens)

**Reduced from 30K** - Simpler than originally estimated:

1. **ConfirmationModal Component** (4,000 tokens)
   - Generic confirmation dialog
   - Replaces 16 duplicate patterns (updated count)
   - Props: title, message, onConfirm, variant

2. **FormModal Component** (6,000 tokens)
   - Generic form dialog with validation
   - Replaces 12+ duplicate form modal patterns

3. **DetailsModal Component** (4,000 tokens)
   - Generic details viewer
   - Replaces 8+ duplicate detail modal patterns

4. **Refactor Existing Modals** (6,000 tokens)
   - Convert 20+ modals to use new components
   - ~300 tokens per modal conversion

### 2.4 Duplication Elimination (20,000 tokens)

**Reduced from 30K** - Focused on high-impact duplication:

1. **API Error Handling** (4,000 tokens)
   - Create `useApiError` hook
   - Replace 23 duplicate error handling blocks

2. **Form Validation** (6,000 tokens)
   - Create validation utility library
   - Replace 15 duplicate validation patterns

3. **Data Formatting** (4,000 tokens)
   - Create formatting utility library
   - Replace 12 duplicate formatting functions

4. **Permission Checks** (3,000 tokens)
   - Centralize permission logic
   - Replace 18 duplicate permission checks

5. **Loading States** (3,000 tokens)
   - Create `useLoadingState` hook
   - Replace 20 duplicate loading patterns

**Phase 2 Deliverables**:
- Zero files >500 lines
- All tests pass after refactoring
- Error boundaries in place
- 3 new reusable modal components
- Duplication reduced significantly
- Code quality score: 60 → 78

---

## Phase 2.5: UI Improvements (~17K tokens, Week 11)

**Goal**: Complete UI/accessibility quick wins deferred from Phase 1
**Health Impact**: 82 → 84 (+2 points)
**Priority**: P1

### Tasks

1. **Fix Window.confirm Violations** (9,000 tokens)
   - Replace 16 window.confirm usages with Modal component (updated count)
   - Ensure WCAG 2.1 AA focus management
   - Add double-click protection
   - Files: 16 components across Gauge, Admin, Inventory, User modules

2. **Add ARIA Labels** (3,000 tokens)
   - 12 forms with proper label associations
   - Required field indicators
   - Error state announcements
   - Screen reader testing

3. **Server-Side Pagination** (5,000 tokens)
   - Backend: Pagination endpoints for gauges, inventory
   - Frontend: Pagination UI components
   - Testing: Load testing with 1000+ records

**Deliverables**:
- Zero window.confirm violations
- All forms have ARIA labels
- Pagination working on large datasets
- WCAG 2.1 AA basics pass

---

## Phase 3: Comprehensive Testing (~145K tokens, Week 12-18)

**Goal**: Increase test coverage from current to 60% frontend, 80% backend
**Health Impact**: 84 → 88 (+4 points)
**Priority**: P1

### 3.1 Frontend Unit Tests (100,000 tokens)

**Target**: Frontend coverage 25% → 60%

#### Gauge Module (38,000 tokens)
- **Components** (26,000 tokens): 20 components after refactoring, ~1,300 tokens each
- **Hooks** (6,000 tokens): 10 custom hooks, ~600 tokens each
- **Utils** (6,000 tokens): 12 utility functions, ~500 tokens each

#### Admin Module (32,000 tokens)
- **Components** (22,000 tokens): 15 components after refactoring, ~1,500 tokens each
- **Hooks** (5,000 tokens): 8 custom hooks, ~650 tokens each
- **Utils** (5,000 tokens): 10 utility functions, ~500 tokens each

#### Inventory Module (25,000 tokens)
- **Components** (18,000 tokens): 12 components after refactoring, ~1,500 tokens each
- **Hooks** (4,000 tokens): 7 custom hooks, ~600 tokens each
- **Utils** (3,000 tokens): 8 utility functions, ~400 tokens each

#### User Module (5,000 tokens)
- **Components** (3,000 tokens): 3 components, ~1,000 tokens each
- **Hooks** (1,000 tokens): 2 custom hooks, ~500 tokens each
- **Utils** (1,000 tokens): 3 utility functions, ~350 tokens each

### 3.2 Integration Tests (25,000 tokens)

1. **API Integration Tests** (10,000 tokens)
   - Test all API client methods with MSW (Mock Service Worker)
   - Test error handling and retry logic
   - Test authentication flows

2. **State Management Tests** (6,000 tokens)
   - Test Zustand stores with mock data
   - Test React Query cache behavior
   - Test state persistence

3. **Routing Tests** (5,000 tokens)
   - Test all route transitions
   - Test protected route behavior
   - Test navigation guards

4. **Form Integration Tests** (4,000 tokens)
   - Test form submission flows
   - Test validation with backend
   - Test error recovery

### 3.3 E2E Tests (15,000 tokens)

1. **Critical User Journeys** (10,000 tokens)
   - Login → Dashboard → Create Item → Logout
   - Gauge pairing workflow
   - Inventory transfer workflow
   - User management workflow

2. **Cross-Browser Tests** (3,000 tokens)
   - Chrome, Firefox, Safari compatibility
   - Responsive design validation

3. **Performance Tests** (2,000 tokens)
   - Load time benchmarking
   - Memory leak detection

### 3.4 Test Infrastructure (5,000 tokens)

1. **Test Utilities** (3,000 tokens)
   - Custom render functions
   - Mock data factories
   - Test helpers

2. **CI/CD Integration** (2,000 tokens)
   - Write `.github/workflows/test.yml`
   - Coverage reporting configuration
   - Failed test notification setup

**Phase 3 Deliverables**:
- Frontend test coverage: 25% → 60%
- Backend test coverage: 65% → 70%
- All critical paths covered by E2E tests
- Automated testing in CI/CD
- Testing score: 35 → 75

---

## Phase 4: Quality + Backend Tests (~89K tokens, Week 19-25)

**Goal**: Improve TypeScript quality, complete documentation, improve backend tests
**Health Impact**: 88 → 92 (+4 points)
**Priority**: P2

### 4.1 TypeScript Quality (50,000 tokens)

**Updated estimates** - More work than originally planned:

1. **Eliminate `any` Types** (35,000 tokens)
   - Replace 222 `any` types with proper types (updated count)
   - ~160 tokens per type replacement
   - Create shared type definitions

2. **Type Coverage** (8,000 tokens)
   - Add missing return types (35 functions, updated count)
   - Add missing parameter types (45 functions, updated count)
   - Add strict null checks

3. **Type Utilities** (7,000 tokens)
   - Create shared type library
   - Generic utility types
   - Type guards and validators

### 4.2 Backend Validation Schemas (10,000 tokens)

**Missing from original plan** - Critical for data integrity:

1. **Joi Schema Library** (6,000 tokens)
   - Create validation schemas for all entities
   - Gauge validation schema
   - User validation schema
   - Inventory validation schema
   - Set validation schema

2. **Integrate Joi Middleware** (4,000 tokens)
   - Add validation middleware to routes
   - Standardize error responses
   - Document validation rules

### 4.3 Backend Test Improvements (14,000 tokens)

**Missing from original plan** - Backend needs 58.7% → 80%:

1. **Additional Repository Tests** (6,000 tokens)
   - Test edge cases in existing repositories
   - Test error handling
   - Test transaction rollback

2. **Service Layer Tests** (5,000 tokens)
   - Test business logic in services
   - Test service coordination
   - Test audit logging

3. **Middleware Tests** (3,000 tokens)
   - Test auth middleware
   - Test error handling middleware
   - Test validation middleware

### 4.4 Documentation Completion (15,000 tokens)

1. **API Documentation** (6,000 tokens)
   - Document all endpoints
   - Request/response examples
   - Error codes and handling

2. **Component Documentation** (5,000 tokens)
   - Props documentation
   - Usage examples
   - Storybook integration

3. **Architecture Documentation** (4,000 tokens)
   - Update system diagrams
   - Document patterns and conventions
   - Migration guides

**Phase 4 Deliverables**:
- Zero `any` types in codebase
- Backend test coverage: 65% → 80%
- Joi validation on all endpoints
- 100% API documentation
- All components documented
- Code quality score: 78 → 90

---

## Phase 5: Long-Term (~120K tokens, Week 26-39)

**Goal**: Achieve full accessibility, optimize performance, infrastructure components
**Health Impact**: 92 → 95 (+3 points)
**Priority**: P2

### 5.1 Full Accessibility (40,000 tokens)

1. **WCAG 2.1 AA Compliance** (25,000 tokens)
   - Keyboard navigation (all components)
   - Screen reader support
   - Focus management
   - Color contrast fixes
   - Alternative text for images

2. **Accessibility Testing** (10,000 tokens)
   - Automated accessibility tests
   - Manual testing with assistive tech
   - User testing with disabled users

3. **Accessibility Documentation** (5,000 tokens)
   - Accessibility guidelines
   - Testing procedures
   - Best practices guide

### 5.2 Performance Optimization (50,000 tokens)

1. **Bundle Optimization** (15,000 tokens)
   - Code splitting by route
   - Lazy loading components
   - Tree shaking optimization
   - Target: <500KB initial bundle

2. **Runtime Performance** (20,000 tokens)
   - Memoization strategies
   - Virtual scrolling for large lists
   - Debouncing and throttling
   - React.memo optimization
   - Target: 60fps all interactions

3. **Backend Performance** (15,000 tokens)
   - Database query optimization
   - Caching strategies (Redis)
   - Connection pooling
   - Target: <200ms P95 API response

### 5.3 Infrastructure Components (30,000 tokens)

1. **Advanced Form Components** (12,000 tokens)
   - Multi-step forms
   - Form wizards
   - Dynamic form builder
   - Conditional fields

2. **Data Visualization** (10,000 tokens)
   - Chart components
   - Dashboard widgets
   - Real-time updates

3. **Advanced Table Component** (8,000 tokens)
   - Sorting, filtering, pagination
   - Column customization
   - Export functionality
   - Inline editing

**Phase 5 Deliverables**:
- WCAG 2.1 AA compliance: 100%
- Initial bundle size: <500KB
- API response P95: <200ms
- All infrastructure components complete
- Overall health score: 95/100

---

## Success Metrics by Timeline

### Week 1 (Phase 0-1 Complete)
- [ ] All dependencies installed
- [ ] TypeScript strict mode enabled
- [ ] Zero CRITICAL security vulnerabilities
- [ ] CSRF protection enabled
- [ ] Health score: 74/100

### Week 3 (Phase 1.5 Complete)
- [ ] Critical tests written for all files to be refactored
- [ ] Frontend coverage: 15% → 25%
- [ ] Backend coverage: 58.7% → 65%
- [ ] All tests passing
- [ ] Health score: 76/100

### Week 10 (Phase 2 Complete)
- [ ] Zero files >500 lines
- [ ] All tests still passing after refactoring
- [ ] Error boundaries in place
- [ ] Zero duplicate code blocks
- [ ] 3 reusable modal components
- [ ] Code quality score: 78/100
- [ ] Health score: 82/100

### Week 11 (Phase 2.5 Complete)
- [ ] Zero window.confirm violations
- [ ] All forms have ARIA labels
- [ ] Pagination working on large datasets
- [ ] Health score: 84/100

### Week 18 (Phase 3 Complete)
- [ ] Frontend test coverage: 60%
- [ ] Backend test coverage: 70%
- [ ] All critical paths covered by E2E tests
- [ ] CI/CD testing automated
- [ ] Health score: 88/100

### Week 25 (Phase 4 Complete)
- [ ] Zero `any` types
- [ ] Backend test coverage: 80%
- [ ] Joi validation on all endpoints
- [ ] 100% API documentation
- [ ] Health score: 92/100

### Week 39 (All Phases Complete)
- [ ] WCAG 2.1 AA compliance: 100%
- [ ] Initial bundle <500KB
- [ ] API response <200ms P95
- [ ] Health score: 95/100

---

## Risk Management

### High-Risk Areas

1. **File Refactoring** (Phase 2)
   - **Risk**: Breaking existing functionality
   - **Mitigation**: Phase 1.5 test safety net, test after EVERY split, rollback capability

2. **Testing Implementation** (Phase 3)
   - **Risk**: Time overruns, test maintenance burden
   - **Mitigation**: Focus on critical paths first, reusable test utilities

3. **Performance Optimization** (Phase 5)
   - **Risk**: Premature optimization, complexity increase
   - **Mitigation**: Profile first, measure everything, maintain simplicity

### Contingency Plans

- **Token Overruns**: Prioritize P0/P1 tasks, defer P2 improvements
- **Breaking Changes**: Phase 1.5 tests provide rollback safety
- **Resource Constraints**: Phase adjustments, focus on health score improvements

---

## Dependencies

### External Dependencies
- MySQL database (existing)
- Docker infrastructure (existing)
- CI/CD pipeline (to be configured in Phase 3)
- Redis (to be added in Phase 0)

### Internal Dependencies
- **Phase 0 → All Phases**: Must have dependencies before any work
- **Phase 1 → Phase 1.5**: Security fixes before test writing
- **Phase 1.5 → Phase 2**: Test safety net BEFORE refactoring (CRITICAL)
- **Phase 2 → Phase 2.5**: File size compliance before UI improvements
- **Phase 2.5 → Phase 3**: UI improvements before comprehensive testing
- **Phase 3 → Phase 4**: Test coverage before quality improvements
- **Phase 4 → Phase 5**: Type safety before performance optimization

---

## Token Budget Summary

| Phase | Description | Tokens | % of Total |
|-------|-------------|--------|------------|
| **Phase 0** | Infrastructure Setup | 10,000 | 1.5% |
| **Phase 1** | Security Blockers | 2,000 | 0.3% |
| **Phase 1.5** | Test Safety Net | 30,000 | 4.5% |
| **Phase 2** | Refactoring | 250,000 | 37.7% |
| **Phase 2.5** | UI Improvements | 17,000 | 2.6% |
| **Phase 3** | Comprehensive Testing | 145,000 | 21.9% |
| **Phase 4** | Quality + Backend Tests | 89,000 | 13.4% |
| **Phase 5** | Long-Term | 120,000 | 18.1% |
| **TOTAL** | - | **663,000** | **100%** |

---

## Variance Analysis

### Expected Variance: ±20%

**Optimistic Scenario** (-20%): ~530,000 tokens
- Simpler refactoring than expected
- Reusable patterns accelerate work
- Fewer edge cases

**Realistic Scenario**: ~663,000 tokens
- Current estimates based on agent analysis
- Accounts for typical complexity
- Code changes only (no infrastructure/deployment)

**Pessimistic Scenario** (+20%): ~796,000 tokens
- Additional complexity discovered during refactoring
- More duplicate code found
- Integration challenges
- Additional missing tasks identified

---

**Total Estimated Effort**: 663,000 tokens minimum (±20% variance, code changes only)
**Confidence Level**: Medium (based on agent analysis and historical data)
**Last Updated**: November 4, 2025 (Revised after agent review)
