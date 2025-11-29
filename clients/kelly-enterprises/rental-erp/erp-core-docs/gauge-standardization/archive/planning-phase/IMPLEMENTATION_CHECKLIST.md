# Gauge Set System - Implementation Checklist

**Status**: Ready for Implementation
**Start Date**: TBD
**Target**: Development Environment

---

## Phase 1: Database Schema

**Status**: ⏳ Not Started
**Estimated**: 1 day

### Tasks

- [ ] Apply migration file `002_gauge_set_constraints.sql`
  - [ ] Review migration file
  - [ ] Backup current database (even though test data)
  - [ ] Apply to development database
  - [ ] Verify no errors

- [ ] Test CHECK constraints
  - [ ] Test invalid suffix rejection (try inserting suffix 'X')
  - [ ] Test NPT companion rejection (try adding companion to NPT)
  - [ ] Test suffix-ID mismatch rejection
  - [ ] Verify all constraints active: `SHOW CREATE TABLE gauges;`

- [ ] Test triggers
  - [ ] Insert gauge with ID ending in 'A' → verify gauge_suffix auto-set to 'A'
  - [ ] Insert gauge with ID ending in 'B' → verify gauge_suffix auto-set to 'B'
  - [ ] Update gauge companion_gauge_id → verify bidirectional link created
  - [ ] Verify triggers active: `SHOW TRIGGERS LIKE 'gauges';`

- [ ] Test indexes
  - [ ] Run EXPLAIN on spare query → verify idx_spare_lookup used
  - [ ] Run EXPLAIN on companion query → verify idx_companion_gauge_id used
  - [ ] Verify all indexes created: `SHOW INDEX FROM gauges;`

- [ ] Run validation queries
  - [ ] Query: Thread gauges without suffix (expect 0)
  - [ ] Query: One-way companions (expect 0)
  - [ ] Query: Suffix mismatches (expect 0)
  - [ ] Query: NPT with companions (expect 0)

- [ ] Document results
  - [ ] Screenshot of constraint list
  - [ ] Screenshot of trigger list
  - [ ] Screenshot of index list
  - [ ] Screenshot of validation query results

**Acceptance Criteria**:
- ✅ All 4 CHECK constraints active
- ✅ All 3 triggers active
- ✅ All 4 indexes created
- ✅ All validation queries return 0 violations
- ✅ Test inserts/updates work as expected

---

## Phase 2: Domain Model

**Status**: ⏳ Not Started
**Estimated**: 1 day

### Tasks

- [ ] Create domain directory structure
  - [ ] Create `backend/src/modules/gauge/domain/`
  - [ ] Create test directory `backend/tests/modules/gauge/domain/`

- [ ] Implement DomainValidationError
  - [ ] Create `backend/src/modules/gauge/domain/DomainValidationError.js`
  - [ ] Extend Error class
  - [ ] Add error code and metadata support

- [ ] Implement GaugeEntity
  - [ ] Create `backend/src/modules/gauge/domain/GaugeEntity.js`
  - [ ] Add constructor with validation
  - [ ] Add `suffix` getter property
  - [ ] Add `toDatabase()` method
  - [ ] Add `validate()` method

- [ ] Implement GaugeSet
  - [ ] Create `backend/src/modules/gauge/domain/GaugeSet.js`
  - [ ] Add constructor with validation
  - [ ] Add `specificationsMatch()` method
  - [ ] Add `toDatabase()` method
  - [ ] Add `validate()` method with all business rules

- [ ] Write unit tests
  - [ ] Test GaugeEntity validation (required fields)
  - [ ] Test GaugeSet specification matching
  - [ ] Test GaugeSet NPT rejection
  - [ ] Test GaugeSet suffix validation
  - [ ] Test GaugeSet.toDatabase() output format
  - [ ] Test error messages are descriptive

- [ ] Run tests
  - [ ] Execute: `npm test -- backend/tests/modules/gauge/domain`
  - [ ] Verify 100% coverage for domain logic
  - [ ] Document test results

**Acceptance Criteria**:
- ✅ GaugeSet validates matching specifications
- ✅ GaugeSet rejects NPT pairs with clear error
- ✅ GaugeSet enforces correct suffixes ('A' and 'B')
- ✅ GaugeEntity validates required fields
- ✅ All domain logic has unit tests
- ✅ 100% test coverage for domain layer

**Files Created**:
- `backend/src/modules/gauge/domain/DomainValidationError.js`
- `backend/src/modules/gauge/domain/GaugeEntity.js`
- `backend/src/modules/gauge/domain/GaugeSet.js`
- `backend/tests/modules/gauge/domain/GaugeEntity.test.js`
- `backend/tests/modules/gauge/domain/GaugeSet.test.js`

---

## Phase 3: Repository Refactor

**Status**: ⏳ Not Started
**Estimated**: 2 days

### Tasks

- [ ] Refactor GaugeRepository write methods
  - [ ] Rename `create()` to `createWithinTransaction(data, connection)`
  - [ ] Add connection validation (throw if missing)
  - [ ] Ensure gauge_suffix field included in INSERT
  - [ ] Rename `updateCompanionGauges()` to `linkCompanionsWithinTransaction()`
  - [ ] Fix connection parameter passing in all executeQuery calls
  - [ ] Add `recordCompanionHistory(id1, id2, action, userId, connection)` method

- [ ] Add connection validation
  - [ ] Each write method checks: `if (!connection) throw new Error(...)`
  - [ ] Error message format: `"[methodName] requires connection parameter"`
  - [ ] Add JSDoc comments with @param {Connection} connection

- [ ] Update all callers
  - [ ] Find all calls to old method names
  - [ ] Update to new method names
  - [ ] Ensure connection parameter passed
  - [ ] Check GaugeCreationService.createGaugeSet

- [ ] Write integration tests
  - [ ] Test missing connection throws error
  - [ ] Test transaction rollback works
  - [ ] Test companion linking within transaction
  - [ ] Test createWithinTransaction returns correct data
  - [ ] Test all fields populated (especially gauge_suffix)

- [ ] Run integration tests
  - [ ] Execute: `npm test -- backend/tests/modules/gauge/repositories`
  - [ ] Verify transaction scenarios work
  - [ ] Document test results

**Acceptance Criteria**:
- ✅ All write methods require connection parameter
- ✅ Missing connection throws descriptive error
- ✅ All write operations participate in transactions
- ✅ Integration tests verify transaction rollback
- ✅ gauge_suffix field populated on create
- ✅ companion_gauge_id correctly linked

**Files Modified**:
- `backend/src/modules/gauge/repositories/GaugeRepository.js`

**Files Created**:
- `backend/tests/modules/gauge/repositories/GaugeRepository.test.js`

---

## Phase 4: Service Layer

**Status**: ⏳ Not Started
**Estimated**: 2 days

### Tasks

- [ ] Create GaugeSetService
  - [ ] Create `backend/src/modules/gauge/services/GaugeSetService.js`
  - [ ] Extend BaseService
  - [ ] Implement constructor with repository injection

- [ ] Implement createGaugeSet method
  - [ ] Method signature: `async createGaugeSet(goData, noGoData, userId)`
  - [ ] Use `this.executeInTransaction()`
  - [ ] Get next gauge ID
  - [ ] Create GaugeEntity objects with explicit suffix
  - [ ] Create GaugeSet aggregate (validates business rules)
  - [ ] Call repository.createWithinTransaction for both gauges
  - [ ] Call repository.linkCompanionsWithinTransaction
  - [ ] Call repository.recordCompanionHistory
  - [ ] Return complete gauge set with companion data

- [ ] Implement pairSpares method
  - [ ] Method signature: `async pairSpares(goGaugeId, noGoGaugeId, userId)`
  - [ ] Fetch both gauges from repository
  - [ ] Validate both are spares (companion_gauge_id IS NULL)
  - [ ] Create domain objects
  - [ ] Validate as GaugeSet (enforces matching specs)
  - [ ] Link companions within transaction
  - [ ] Record history
  - [ ] Return paired gauge set

- [ ] Update API routes
  - [ ] Modify `backend/src/modules/gauge/routes/gauges-v2.js`
  - [ ] Update POST /api/gauges/v2/create-set to use GaugeSetService
  - [ ] Add POST /api/gauges/v2/pair-spares endpoint
  - [ ] Update error handling

- [ ] Write service integration tests
  - [ ] Test successful set creation
  - [ ] Test mismatched specs rejected
  - [ ] Test NPT pair creation rejected
  - [ ] Test pairing spares works
  - [ ] Test pairing non-spares rejected
  - [ ] Test transaction rollback on error

- [ ] Run service tests
  - [ ] Execute: `npm test -- backend/tests/modules/gauge/services`
  - [ ] Verify all scenarios pass
  - [ ] Document test results

**Acceptance Criteria**:
- ✅ createGaugeSet creates both gauges with correct suffixes
- ✅ createGaugeSet links companions bidirectionally
- ✅ createGaugeSet records companion history
- ✅ pairSpares validates spares have no companions
- ✅ pairSpares validates matching specifications
- ✅ All operations atomic (rollback on error)
- ✅ API endpoints use new service

**Files Created**:
- `backend/src/modules/gauge/services/GaugeSetService.js`
- `backend/tests/modules/gauge/services/GaugeSetService.test.js`

**Files Modified**:
- `backend/src/modules/gauge/routes/gauges-v2.js`

---

## Phase 5: Testing

**Status**: ⏳ Not Started
**Estimated**: 2 days

### Tasks

- [ ] Domain model unit tests
  - [ ] GaugeSet validation rules (all scenarios)
  - [ ] GaugeEntity validation rules (all scenarios)
  - [ ] Domain error handling
  - [ ] Edge cases (empty strings, null values, etc.)

- [ ] Repository integration tests
  - [ ] Create within transaction (success and failure)
  - [ ] Link companions within transaction
  - [ ] Find spares query (with various filters)
  - [ ] Transaction rollback scenarios
  - [ ] Connection parameter validation

- [ ] Service integration tests
  - [ ] Create gauge set end-to-end
  - [ ] Pair spares workflow (all scenarios)
  - [ ] Error handling and rollback
  - [ ] Companion history recording

- [ ] API endpoint tests
  - [ ] POST /api/gauges/v2/create-set
    - [ ] Success case
    - [ ] Validation errors
    - [ ] Authentication errors
  - [ ] POST /api/gauges/v2/pair-spares
    - [ ] Success case
    - [ ] Both gauges must be spares
    - [ ] Specs must match
  - [ ] GET /api/gauges/v2/spares
    - [ ] No filters
    - [ ] Filter by suffix
    - [ ] Filter by equipment type
  - [ ] Error response format

- [ ] Generate coverage report
  - [ ] Run: `npm test -- --coverage`
  - [ ] Verify 90%+ overall coverage
  - [ ] Verify 100% domain model coverage
  - [ ] Document coverage metrics

- [ ] Create test data scripts
  - [ ] Script to create sample gauge sets
  - [ ] Script to create sample spares
  - [ ] Script to verify database state
  - [ ] Clean-up script for test data

**Acceptance Criteria**:
- ✅ 90%+ code coverage overall
- ✅ 100% domain model coverage
- ✅ All happy paths tested
- ✅ All error scenarios tested
- ✅ Transaction rollback scenarios tested
- ✅ Database constraint violations tested
- ✅ API error responses tested

**Test Files Created**:
- `backend/tests/modules/gauge/domain/GaugeSet.test.js`
- `backend/tests/modules/gauge/domain/GaugeEntity.test.js`
- `backend/tests/modules/gauge/repositories/GaugeRepository.test.js`
- `backend/tests/modules/gauge/services/GaugeSetService.test.js`
- `backend/tests/integration/gauges-v2.test.js`

---

## Phase 6: Frontend Integration

**Status**: ⏳ Not Started
**Estimated**: 2 days

### Tasks

- [ ] Update gaugeService.ts
  - [ ] Verify createGaugeSet method calls correct endpoint
  - [ ] Add pairSpares method
  - [ ] Add getSpares method with filter support
  - [ ] Add error handling

- [ ] Update CreateGaugeWorkflow component
  - [ ] Ensure "Both" option uses createGaugeSet
  - [ ] Add success/error notifications
  - [ ] Display created gauge set details
  - [ ] Show GO/NO GO distinction clearly

- [ ] Create SpareInventoryPanel component
  - [ ] Display list of available spares
  - [ ] Filter by suffix (GO/NO GO)
  - [ ] Filter by equipment type
  - [ ] Show gauge specifications
  - [ ] "Pair" button for each spare

- [ ] Create PairSparesModal component
  - [ ] Select GO gauge (filter by suffix 'A')
  - [ ] Select NO GO gauge (filter by suffix 'B')
  - [ ] Validate matching specifications client-side
  - [ ] Submit pairing request
  - [ ] Show success/error messages

- [ ] Update GaugeDetail component
  - [ ] Display gauge_suffix prominently
  - [ ] Show companion gauge information
  - [ ] Link to companion gauge detail
  - [ ] Display companion history

- [ ] Update GaugeList component
  - [ ] Show gauge suffix in list view
  - [ ] Show companion indicator
  - [ ] Filter by suffix
  - [ ] Filter by has/no companion

- [ ] Write E2E tests (Playwright)
  - [ ] Test create gauge set workflow
  - [ ] Test spare inventory display
  - [ ] Test pair spares workflow
  - [ ] Test gauge detail display
  - [ ] Test error scenarios

- [ ] Run E2E tests
  - [ ] Execute: `npm run test:e2e`
  - [ ] Verify all workflows work end-to-end
  - [ ] Document test results

**Acceptance Criteria**:
- ✅ Can create gauge set with GO/NO GO distinction visible
- ✅ Spares display shows available orphaned gauges
- ✅ Can filter spares by suffix
- ✅ Can pair spares through UI
- ✅ Pairing validates matching specs
- ✅ Companion relationships display correctly
- ✅ Error messages user-friendly
- ✅ All workflows tested with Playwright

**Files Created**:
- `frontend/src/modules/gauge/components/SpareInventoryPanel.tsx`
- `frontend/src/modules/gauge/components/PairSparesModal.tsx`
- `frontend/tests/e2e/gauge-set-creation.spec.ts`
- `frontend/tests/e2e/spare-pairing.spec.ts`

**Files Modified**:
- `frontend/src/modules/gauge/services/gaugeService.ts`
- `frontend/src/modules/gauge/components/creation/CreateGaugeWorkflow.tsx`
- `frontend/src/modules/gauge/components/GaugeDetail.tsx`
- `frontend/src/modules/gauge/components/GaugeList.tsx`

---

## Verification & Deployment

**Status**: ⏳ Not Started

### Pre-Deployment Verification

- [ ] Database validation
  - [ ] Run all validation queries (expect 0 violations)
  - [ ] Verify constraints active
  - [ ] Verify triggers active
  - [ ] Verify indexes created

- [ ] Backend verification
  - [ ] All unit tests pass: `npm test`
  - [ ] All integration tests pass
  - [ ] Test coverage ≥90%
  - [ ] No ESLint errors: `npm run lint`

- [ ] Frontend verification
  - [ ] All unit tests pass
  - [ ] All E2E tests pass: `npm run test:e2e`
  - [ ] No TypeScript errors: `npm run type-check`
  - [ ] No ESLint errors: `npm run lint`

- [ ] Manual testing
  - [ ] Create 5 gauge sets through UI
  - [ ] Verify all gauges have correct suffix in database
  - [ ] Verify all companion_gauge_id fields set correctly
  - [ ] Create 3 spares
  - [ ] Pair 2 spares through UI
  - [ ] Verify pairing works correctly
  - [ ] Test error scenarios (mismatched specs, etc.)

- [ ] Performance testing
  - [ ] Spare query uses index (EXPLAIN)
  - [ ] Gauge set creation < 100ms
  - [ ] Page load times acceptable

### Deployment

- [ ] Commit changes
  - [ ] Atomic commits per phase
  - [ ] Clear commit messages
  - [ ] Reference ARCHITECTURAL_PLAN.md

- [ ] Docker restart
  - [ ] Backend: `docker-compose restart backend`
  - [ ] Frontend: `docker-compose restart frontend`
  - [ ] Verify services running

- [ ] Post-deployment verification
  - [ ] API endpoints respond correctly
  - [ ] Frontend loads without errors
  - [ ] Create test gauge set
  - [ ] Verify database state

### Success Metrics

- [ ] Database metrics
  - [ ] 0 thread gauges without suffix
  - [ ] 0 one-way companion relationships
  - [ ] 0 suffix-ID mismatches
  - [ ] 0 NPT gauges with companions

- [ ] Functional metrics
  - [ ] Can create 10 gauge sets successfully
  - [ ] All 20 gauges have correct suffix
  - [ ] All 20 gauges have companion links
  - [ ] Can create and pair 5 spares
  - [ ] Spare queries work correctly

- [ ] Performance metrics
  - [ ] Spare query execution < 50ms
  - [ ] Gauge set creation < 100ms
  - [ ] Transaction rollback < 50ms

---

## Rollback Procedure

**If Critical Issues Arise**:

1. [ ] Stop services
   - [ ] `docker-compose stop backend frontend`

2. [ ] Rollback database
   - [ ] Run rollback script from `002_gauge_set_constraints.sql`
   - [ ] Verify constraints/triggers/indexes dropped

3. [ ] Rollback code
   - [ ] `git revert <commit-hash>`
   - [ ] Or checkout previous commit: `git checkout <commit-hash>`

4. [ ] Restart services
   - [ ] `docker-compose up -d backend frontend`

5. [ ] Verify rollback
   - [ ] Services running
   - [ ] Previous functionality works
   - [ ] Document issue for post-mortem

---

## Notes

**Development Phase Benefits**:
- Can break existing code
- Can restructure database freely
- Test data only - no production impact
- Can iterate quickly

**Key Success Factors**:
- Test each phase thoroughly before moving to next
- Run all validation queries regularly
- Keep test data clean for accurate testing
- Document any deviations from plan

**Communication**:
- Update this checklist as work progresses
- Mark items complete with date
- Document any blockers or issues
- Celebrate milestones!

---

## Progress Summary

**Overall Status**: ⏳ Not Started

- [ ] Phase 1: Database Schema (0/6 sections)
- [ ] Phase 2: Domain Model (0/6 sections)
- [ ] Phase 3: Repository Refactor (0/5 sections)
- [ ] Phase 4: Service Layer (0/6 sections)
- [ ] Phase 5: Testing (0/6 sections)
- [ ] Phase 6: Frontend Integration (0/8 sections)
- [ ] Verification & Deployment (0/3 sections)

**Estimated Total**: 10 days
**Actual**: TBD
**Start Date**: TBD
**Completion Date**: TBD
