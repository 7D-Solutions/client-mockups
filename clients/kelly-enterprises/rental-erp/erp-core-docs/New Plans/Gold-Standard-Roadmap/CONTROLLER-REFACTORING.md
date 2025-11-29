# Backend Controller Refactoring - Phase 2A Implementation Guide

**Phase**: 2A (Week 4-6)
**Tokens**: ~170,000
**Priority**: P1 (MUST complete before Phase 2B frontend refactoring)
**Goal**: Extract Express.js route handlers into separate controllers following industry standards

---

## Executive Summary

### What We're Doing
Refactoring 28 Express.js route files to use the **controller pattern** (industry standard):
- Routes define endpoints and middleware
- Controllers handle business logic
- Aligns with NestJS, AdonisJS, Laravel patterns

### Why It Matters
- **File Size Compliance**: 3 backend files >500 lines (production blockers)
- **Industry Standard**: Current inline handlers violate best practices
- **Testability**: Controllers can be unit tested independently
- **Maintainability**: Separates routing concerns from business logic

### Scope
- **Files**: 28 route files (~5,530 lines of code)
- **Controllers**: ~20 new controller files to create
- **Endpoints**: ~130 API endpoints to refactor
- **Modules**: Gauge (10 files), Admin (8 files), Auth/User (10 files)

---

## ⚠️ Critical Requirements

### 1. Docker Restart Requirement (CLAUDE.md Constraint #2)

**After EVERY controller extraction**:
```bash
docker-compose restart backend
docker logs fireproof-erp-modular-backend-dev --tail 50 | grep -i error
```

### 2. Test Protection (Phase 1.5.4 Integration Tests)

**MUST have passing tests before starting**:
- 25+ gauge route integration tests
- 25+ admin route integration tests
- API contract validation

### 3. Zero Breaking Changes

**Preserve exact API contracts**:
- Same endpoints
- Same response structures
- Same middleware chains
- Same error handling

---

## File Inventory

### Gauge Module (10 files)

| File | Lines | Complexity | Priority |
|------|-------|------------|----------|
| **gauges-v2.js** | 1,087 | HIGH | P0 (>500 lines) |
| **gauges.js** | 477 | MEDIUM | P1 |
| calibration.routes.js | 328 | MEDIUM | P1 |
| gauge-qc.js | 252 | LOW | P2 |
| gauge-certificates.js | 269 | LOW | P2 |
| gauge-tracking-unseals.routes.js | 247 | LOW | P2 |
| gauge-tracking-operations.routes.js | 241 | LOW | P2 |
| gauge-tracking-transfers.routes.js | ~200 | LOW | P2 |
| gauge-tracking-reports.routes.js | ~150 | LOW | P2 |
| rejection-reasons.js | ~100 | LOW | P2 |

### Admin Module (8 files)

| File | Lines | Complexity | Priority |
|------|-------|------------|----------|
| **permissions.js** | 655 | HIGH | P0 (>500 lines) |
| **admin.js** | 536 | HIGH | P0 (>500 lines) |
| audit-logs.js | 194 | LOW | P2 |
| system-recovery.js | 182 | MEDIUM | P2 |
| user-management.js | 179 | MEDIUM | P1 |
| admin-stats.js | 155 | LOW | P2 |
| admin-maintenance.js | ~150 | LOW | P2 |
| run-migration.js | ~100 | LOW | P2 |

### Other Modules (10 files)

| File | Lines | Complexity | Priority |
|------|-------|------------|----------|
| auth/routes/auth.js | 219 | MEDIUM | P1 |
| user/routes/user.js | ~150 | LOW | P2 |
| Other small routes | ~200 | LOW | P2 |

---

## Controller Pattern Template

### BEFORE: Inline Handler (Current Anti-Pattern)

```javascript
// routes/gauges-v2.js - 1,087 lines of inline handlers
router.post('/create',
  authenticateToken,
  validateGauge,
  asyncErrorHandler(async (req, res) => {
    const gaugeService = serviceRegistry.get('GaugeCreationService');
    const gauge = await gaugeService.createGauge(req.body, req.user.id);

    logger.info('Gauge created', { gaugeId: gauge.id, userId: req.user.id });

    res.status(201).json({
      success: true,
      message: 'Gauge created successfully',
      data: gauge
    });
  })
);

// ... 14 more inline handlers in same file
```

**Problems**:
- 1,087 lines in single file (unmaintainable)
- Business logic mixed with routing
- Can't unit test handlers independently
- Violates Single Responsibility Principle

### AFTER: Controller Pattern (Industry Standard)

```javascript
// routes/gauge-creation.routes.js (split from gauges-v2.js)
const express = require('express');
const router = express.Router();
const gaugeController = require('../controllers/GaugeV2Controller');
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { validateGauge } = require('../middleware/validation');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');

router.post('/create',
  authenticateToken,
  validateGauge,
  asyncErrorHandler(gaugeController.createGauge)
);

router.post('/create-set',
  authenticateToken,
  asyncErrorHandler(gaugeController.createGaugeSet)
);

// ... other endpoints (file stays <200 lines)

module.exports = router;
```

```javascript
// controllers/GaugeV2Controller.js
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const logger = require('../../../infrastructure/utils/logger');

/**
 * Create a new gauge
 * @route POST /api/gauges/v2/create
 */
const createGauge = async (req, res) => {
  const gaugeService = serviceRegistry.get('GaugeCreationService');
  const gauge = await gaugeService.createGauge(req.body, req.user.id);

  logger.info('Gauge created', { gaugeId: gauge.id, userId: req.user.id });

  res.status(201).json({
    success: true,
    message: 'Gauge created successfully',
    data: gauge
  });
};

/**
 * Create a gauge set
 * @route POST /api/gauges/v2/create-set
 */
const createGaugeSet = async (req, res) => {
  const gaugeService = serviceRegistry.get('GaugeSetService');
  const set = await gaugeService.createSet(req.body, req.user.id);

  logger.info('Gauge set created', { setId: set.id, userId: req.user.id });

  res.status(201).json({
    success: true,
    message: 'Gauge set created successfully',
    data: set
  });
};

// ... other handlers

module.exports = {
  createGauge,
  createGaugeSet,
  // ... other exports
};
```

**Benefits**:
- ✅ Route file <200 lines (readable routing config)
- ✅ Controller <300 lines (focused business logic)
- ✅ Can unit test controllers independently
- ✅ Follows Single Responsibility Principle
- ✅ Industry standard pattern (NestJS, AdonisJS, Laravel)

---

## Step-by-Step Refactoring Process

### Pre-Flight Checklist

**BEFORE starting Phase 2A**:

1. ✅ **Phase 1.5.4 complete**: All backend route integration tests passing
2. ✅ **Git checkpoint**: Clean working tree, feature branch created
3. ✅ **Backup created**: `cp -r backend/src/modules backend/src/modules.backup`
4. ✅ **Dependencies installed**: `supertest`, `jest` for testing
5. ✅ **Docker running**: Backend container operational

**Create Feature Branch**:
```bash
cd backend
git checkout -b refactor/phase-2a-controllers
git add .
git commit -m "Checkpoint: Before Phase 2A controller refactoring"
```

---

### Step 1: Split Oversized Files FIRST (If >500 lines)

**Critical Files to Split BEFORE Controller Extraction**:

#### 1.1 gauges-v2.js (1,087 lines → 4 files)

**Analysis**: Identify logical boundaries
```bash
grep "^router\." backend/src/modules/gauge/routes/gauges-v2.js | wc -l
# Output: ~15 endpoints
```

**Split Plan**:
1. `gauge-creation.routes.js` (~300 lines)
   - POST /api/gauges/v2/create
   - POST /api/gauges/v2/create-set
   - Related validation middleware

2. `gauge-sets.routes.js` (~300 lines)
   - GET /api/gauges/v2/sets
   - PUT /api/gauges/v2/sets/:id
   - DELETE /api/gauges/v2/sets/:id

3. `gauge-spares.routes.js` (~250 lines)
   - POST /api/gauges/v2/pair-spares
   - GET /api/gauges/v2/spares
   - PUT /api/gauges/v2/spares/:id

4. `gauge-management.routes.js` (~237 lines)
   - GET /api/gauges/v2/:id
   - PUT /api/gauges/v2/:id
   - DELETE /api/gauges/v2/:id

**Process**:
```bash
# 1. Create new route files
touch backend/src/modules/gauge/routes/gauge-creation.routes.js
touch backend/src/modules/gauge/routes/gauge-sets.routes.js
touch backend/src/modules/gauge/routes/gauge-spares.routes.js
touch backend/src/modules/gauge/routes/gauge-management.routes.js

# 2. Copy relevant sections to each file
# (Use Edit tool to move code sections)

# 3. Update module index to register new routes
# backend/src/modules/gauge/index.js
```

**Verification After Split**:
```bash
# Syntax check
node -c backend/src/modules/gauge/routes/gauge-creation.routes.js
node -c backend/src/modules/gauge/routes/gauge-sets.routes.js

# Restart backend
docker-compose restart backend
docker logs fireproof-erp-modular-backend-dev --tail 50 | grep -i error

# Run integration tests
npm test -- gauge-v2.test.js

# Manual smoke test
curl -X POST http://localhost:8000/api/gauges/v2/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"serial_number": "TEST123"}'
```

**Git Commit**:
```bash
git add backend/src/modules/gauge/routes/
git commit -m "refactor(gauge): Split gauges-v2.js into logical modules

- gauge-creation.routes.js (300 lines)
- gauge-sets.routes.js (300 lines)
- gauge-spares.routes.js (250 lines)
- gauge-management.routes.js (237 lines)

All routes preserved, no breaking changes.
Tests passing."
```

#### 1.2 permissions.js (655 lines → 2 files)

**Split Plan**:
1. `role-permissions.routes.js` (~327 lines)
   - Role-based permission management

2. `user-permissions.routes.js` (~328 lines)
   - User-specific permission assignment

**Same process as gauges-v2.js**

#### 1.3 admin.js (536 lines → 2 files)

**Split Plan**:
1. `admin-users.routes.js` (~268 lines)
   - User CRUD operations

2. `admin-system.routes.js` (~268 lines)
   - System configuration

**Same process as gauges-v2.js**

---

### Step 2: Create Controller Directory Structure

```bash
# For each module
mkdir -p backend/src/modules/gauge/controllers
mkdir -p backend/src/modules/admin/controllers
mkdir -p backend/src/modules/auth/controllers
mkdir -p backend/src/modules/user/controllers
```

---

### Step 3: Extract Controllers (Per Route File)

**Template Process for Each File**:

#### 3.1 Read Route File
```bash
# Identify all handlers
grep -A 10 "async (req, res)" backend/src/modules/gauge/routes/gauge-creation.routes.js
```

#### 3.2 Create Controller File
```bash
touch backend/src/modules/gauge/controllers/GaugeCreationController.js
```

#### 3.3 Extract Handler Logic

**FROM routes/gauge-creation.routes.js**:
```javascript
router.post('/create',
  authenticateToken,
  validateGauge,
  asyncErrorHandler(async (req, res) => {
    // Extract this handler logic ↓
    const gaugeService = serviceRegistry.get('GaugeCreationService');
    const gauge = await gaugeService.createGauge(req.body, req.user.id);
    logger.info('Gauge created', { gaugeId: gauge.id, userId: req.user.id });
    res.status(201).json({
      success: true,
      message: 'Gauge created successfully',
      data: gauge
    });
  })
);
```

**TO controllers/GaugeCreationController.js**:
```javascript
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const logger = require('../../../infrastructure/utils/logger');

const createGauge = async (req, res) => {
  const gaugeService = serviceRegistry.get('GaugeCreationService');
  const gauge = await gaugeService.createGauge(req.body, req.user.id);

  logger.info('Gauge created', { gaugeId: gauge.id, userId: req.user.id });

  res.status(201).json({
    success: true,
    message: 'Gauge created successfully',
    data: gauge
  });
};

module.exports = {
  createGauge
};
```

#### 3.4 Update Route File

**Update routes/gauge-creation.routes.js**:
```javascript
const gaugeController = require('../controllers/GaugeCreationController');

router.post('/create',
  authenticateToken,
  validateGauge,
  asyncErrorHandler(gaugeController.createGauge)
);
```

#### 3.5 Run ESLint Validation

```bash
npm run lint
```

#### 3.6 Verify Syntax

```bash
node -c backend/src/modules/gauge/controllers/GaugeCreationController.js
node -c backend/src/modules/gauge/routes/gauge-creation.routes.js
```

#### 3.7 Restart Docker (CRITICAL)

```bash
docker-compose restart backend
docker logs fireproof-erp-modular-backend-dev --tail 50 | grep -i error
```

#### 3.8 Run Integration Tests

```bash
npm test -- gauge-creation.test.js
```

**Expected Output**:
```
PASS  tests/integration/gauge/gauge-creation.test.js
  ✓ POST /api/gauges/v2/create - should create gauge (245ms)
  ✓ POST /api/gauges/v2/create-set - should create gauge set (198ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

#### 3.9 Manual Smoke Test

```bash
# Test critical endpoint
curl -X POST http://localhost:8000/api/gauges/v2/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serial_number": "SMOKE-TEST-001",
    "manufacturer": "Test Corp"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Gauge created successfully",
  "data": {
    "id": 123,
    "serial_number": "SMOKE-TEST-001",
    "manufacturer": "Test Corp"
  }
}
```

#### 3.10 Git Commit

```bash
git add backend/src/modules/gauge/controllers/GaugeCreationController.js
git add backend/src/modules/gauge/routes/gauge-creation.routes.js
git commit -m "feat(gauge): Extract GaugeCreationController

- Extracted createGauge, createGaugeSet handlers
- Route file: 300 lines → 150 lines
- Controller file: 120 lines
- All integration tests passing
- Zero breaking changes"
```

---

### Repeat Steps 3.1-3.10 for All 28 Route Files

**Priority Order**:

**Week 4** (Gauge Module - 10 files):
1. GaugeCreationController (from gauge-creation.routes.js)
2. GaugeSetController (from gauge-sets.routes.js)
3. GaugeSpareController (from gauge-spares.routes.js)
4. GaugeManagementController (from gauge-management.routes.js)
5. GaugeController (from gauges.js - legacy routes)
6. CalibrationController (from calibration.routes.js)
7. QualityController (from gauge-qc.js)
8. CertificateController (from gauge-certificates.js)
9. UnsealController, OperationsController, TransferController, ReportsController, RejectionController

**Week 5** (Admin Module - 8 files):
10. RolePermissionsController (from role-permissions.routes.js)
11. UserPermissionsController (from user-permissions.routes.js)
12. AdminUsersController (from admin-users.routes.js)
13. AdminSystemController (from admin-system.routes.js)
14. UserManagementController (from user-management.js)
15. AuditController, RecoveryController, StatsController, MaintenanceController, MigrationController

**Week 6** (Other Modules - 10 files):
16. AuthController (from auth/routes/auth.js)
17. UserController (from user/routes/user.js)
18. Remaining controllers

---

## Success Criteria

### Module Complete When:

- ✅ All route files use controllers
- ✅ All controllers <300 lines
- ✅ All route files <200 lines
- ✅ ESLint passes with zero errors
- ✅ Backend starts successfully after Docker restart
- ✅ All 50+ integration tests pass
- ✅ Critical endpoints respond correctly (manual verification)
- ✅ No console errors in Docker logs
- ✅ Zero breaking changes to API contracts

### Phase 2A Complete When:

- ✅ All 28 route files refactored
- ✅ ~20 controller files created
- ✅ 3 oversized files split (gauges-v2, permissions, admin)
- ✅ Controller pattern documented in CLAUDE.md
- ✅ Manual testing checklist completed
- ✅ Git history clean with rollback points

---

## Rollback Strategy

### If Tests Fail After Controller Extraction

```bash
# Option 1: Revert last commit
git revert HEAD

# Option 2: Restore from backup
rm -rf backend/src/modules/gauge/routes
rm -rf backend/src/modules/gauge/controllers
cp -r backend/src/modules.backup/gauge backend/src/modules/

# Option 3: Abandon branch
git checkout development-core
git branch -D refactor/phase-2a-controllers
```

### If Backend Won't Start

```bash
# Check Docker logs
docker logs fireproof-erp-modular-backend-dev --tail 100

# Common issues:
# - Syntax errors → node -c <file>
# - Import errors → Check require() paths
# - Missing modules → Verify controller exports

# Quick fix: Restore last working commit
git reset --hard HEAD~1
docker-compose restart backend
```

---

## Common Issues & Solutions

### Issue 1: ESLint Errors

**Problem**: `'gaugeController' is not defined`

**Solution**:
```javascript
// Add to top of route file
const gaugeController = require('../controllers/GaugeCreationController');
```

### Issue 2: Backend Won't Start

**Problem**: `Cannot find module '../controllers/GaugeCreationController'`

**Solution**:
```bash
# Verify file exists
ls -la backend/src/modules/gauge/controllers/

# Check relative path
cd backend/src/modules/gauge/routes
ls ../controllers/  # Should show GaugeCreationController.js
```

### Issue 3: Integration Tests Fail

**Problem**: `POST /api/gauges/v2/create returns 500`

**Solution**:
```bash
# Check Docker logs for actual error
docker logs fireproof-erp-modular-backend-dev --tail 50

# Common causes:
# - Missing service in controller
# - Incorrect service method call
# - Missing logger import
```

### Issue 4: Routes Not Registering

**Problem**: `Cannot POST /api/gauges/v2/create`

**Solution**:
```javascript
// Verify module index registers new routes
// backend/src/modules/gauge/index.js

router.use('/v2', require('./routes/gauge-creation.routes'));
router.use('/v2', require('./routes/gauge-sets.routes'));
```

---

## Documentation Updates

### Update CLAUDE.md

**Add section**:

```markdown
## Backend Controller Pattern

**All backend routes must use the controller pattern:**

```javascript
// ✅ CORRECT - Controller pattern
const controller = require('../controllers/GaugeController');
router.post('/create', auth, validate, asyncErrorHandler(controller.create));

// ❌ WRONG - Inline handler
router.post('/create', auth, validate, asyncErrorHandler(async (req, res) => {
  // business logic here
}));
```

**Benefits**:
- Testability: Controllers can be unit tested
- Maintainability: Separates routing from business logic
- Industry Standard: Aligns with NestJS, AdonisJS, Laravel
```

---

## Estimated Timeline

| Week | Focus | Files | Tokens | Status |
|------|-------|-------|--------|--------|
| Week 4 | Gauge Module | 10 files | 70K | Pending |
| Week 5 | Admin Module | 8 files | 55K | Pending |
| Week 6 | Other Modules | 10 files | 45K | Pending |
| **Total** | **Phase 2A** | **28 files** | **170K** | - |

---

## Token Breakdown

| Task | Tokens | Details |
|------|--------|---------|
| File splitting | 15,000 | Split 3 oversized files (gauges-v2, permissions, admin) |
| Controller extraction | 102,000 | Extract ~20 controllers (~5K each) |
| Route updates | 28,000 | Update 28 route files to use controllers |
| Testing/validation | 25,000 | ESLint, Docker restarts, integration tests |
| Documentation | 5,000 | CLAUDE.md updates, checklists |
| Git operations | 2,000 | Commits, branch management |
| Manual testing | 3,000 | Smoke testing critical endpoints |
| **Total** | **170,000** | **Phase 2A Total** |

---

**Last Updated**: November 7, 2025
**Status**: Ready for execution after Phase 1.5 completion
**Dependencies**: Phase 1.5.4 (Backend Route Integration Tests) must be complete
