# Backend Rebuild Master Plan - Fire-Proof ERP

## Overview
This plan addresses critical gaps in the backend implementation following the modular refactoring. Each phase must be completed and verified before proceeding to the next.

**IMPORTANT**: Before implementing any fix, VERIFY the issue exists first. Each phase includes verification steps to confirm the problem before attempting solutions.

## Pre-Phase Verification - Docker & Backend Status

### VERIFY-0: System Running
**Create**: `/backend/scripts/verify-system-running.js`
```javascript
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function verifySystem() {
  console.log('=== System Status Verification ===\n');
  
  // 1. Check Docker containers
  try {
    const { stdout } = await execAsync('docker ps --format "table {{.Names}}\t{{.Status}}"');
    console.log('1. Docker Containers:\n', stdout);
  } catch (error) {
    console.log('1. Docker check failed:', error.message);
  }
  
  // 2. Check backend health
  try {
    const response = await axios.get('http://localhost:8000/api/health');
    console.log('\n2. Backend Health:', response.data.status);
  } catch (error) {
    console.log('\n2. Backend Health: NOT RUNNING or NOT ACCESSIBLE');
  }
  
  // 3. Check database connection
  try {
    const pool = require('../src/infrastructure/database/connection');
    await pool.query('SELECT 1');
    console.log('\n3. Database Connection: OK');
  } catch (error) {
    console.log('\n3. Database Connection: FAILED -', error.message);
  }
  
  // 4. Check which backend directory is active
  console.log('\n4. Backend Location:');
  console.log('   - New modular: /backend/src');
  console.log('   - Legacy: /Fireproof Gauge System/backend');
  console.log('   - Verify docker-compose.yml points to correct backend');
}

verifySystem();
```

**Run Before Each Phase**: `node /backend/scripts/verify-system-running.js`

**If System Not Running**:
```bash
cd "Fireproof Gauge System"
docker-compose up -d
# Wait for services to start
sleep 10
# Verify again
```

---

## Critical Blockers - Must Verify First

### BLOCKER-1: Audit Service Stub
**Verification First**:
```bash
# Check if stub exists
ls -la /backend/src/infrastructure/middleware/auditService-stub.js

# Check what auditMiddleware.js imports
grep -n "auditService" /backend/src/infrastructure/middleware/auditMiddleware.js

# Test if audit logging works
curl -X POST localhost:8000/api/gauges/TEST-001/checkout
# Then check audit_logs table for entry
```

**If Verified**:
- Copy real implementation from `/backend/src/modules/gauge/services/auditService.js`
- Update import in `auditMiddleware.js`

### BLOCKER-2: Missing Database Tables
**Verification First**:
```bash
# Check for missing tables
node -e "
const pool = require('./backend/src/infrastructure/database/connection');
(async () => {
  const [tables] = await pool.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  console.log('password_history exists:', tableNames.includes('password_history'));
  console.log('gauge_transactions exists:', tableNames.includes('gauge_transactions'));
  process.exit(0);
})();"
```

**If Missing**:
- Create and run migrations

### BLOCKER-3: RBAC Disabled
**Verification First**:
```bash
# Check if RBAC is commented out
grep -n "validateRbac" /backend/src/server.js

# Test if permissions are enforced
# Try accessing admin endpoint without proper role
curl -X GET localhost:8000/api/admin/users -H "Authorization: Bearer USER_TOKEN"
```

**If Disabled**:
- Uncomment and fix any validation errors

---

## Phase 1: Critical Production Blockers [P1] ✅ COMPLETED

### P1.0: Pre-Phase System Check ✅
**First Run**: `node /backend/scripts/verify-system-running.js`
- Ensure Docker is running ✅
- Backend is accessible ✅
- Database is connected ✅
- Using correct backend directory ✅

### P1.1: Verify Issues Before Fix ✅
**Create**: `/backend/scripts/verify-phase1-issues.js`
```javascript
// Script to verify all Phase 1 issues exist
const pool = require('../src/infrastructure/database/connection');
const fs = require('fs');

async function verifyIssues() {
  console.log('=== Phase 1 Issue Verification ===\n');
  
  // 1. Check audit stub
  const stubExists = fs.existsSync('./src/infrastructure/middleware/auditService-stub.js');
  console.log('1. Audit stub exists:', stubExists);
  
  // 2. Check missing tables
  const [tables] = await pool.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  console.log('2. password_history exists:', tableNames.includes('password_history'));
  console.log('   gauge_transactions exists:', tableNames.includes('gauge_transactions'));
  
  // 3. Check RBAC
  const serverFile = fs.readFileSync('./src/server.js', 'utf8');
  const rbacDisabled = serverFile.includes('// await validateRbac()');
  console.log('3. RBAC disabled:', rbacDisabled);
  
  process.exit(0);
}

verifyIssues();
```

**Run Verification**: `node /backend/scripts/verify-phase1-issues.js` ✅ Completed

### P1.2: Replace Audit Service Stub ✅
**Verify First**:
- [x] Confirm stub file exists
- [x] Check auditMiddleware imports stub
- [x] Test that audit logging is not working

**Then Fix**:
- [x] Create real implementation at `/backend/src/infrastructure/services/auditService.js`
- [x] Implement audit logging to `audit_logs` table
- [x] Integrate with existing auditMiddleware.js
- [x] Remove stub file after verification

### P1.3: Create Missing Database Tables ✅
**Verify First**:
- [x] Run table check script
- [x] Confirm tables don't exist
- [x] Check if migrations already exist but haven't run

**Then Create**:
**Location**: `/backend/migrations/`
- [x] Create migration for `password_history` table
  ```sql
  CREATE TABLE password_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  ```
- [x] Create migration for `gauge_transactions` table
  ```sql
  CREATE TABLE gauge_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gauge_id INT NOT NULL,
    transaction_type ENUM('checkout', 'return', 'transfer', 'calibration', 'qc_verify') NOT NULL,
    user_id INT NOT NULL,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gauge_id) REFERENCES gauges(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  ```
- [x] Run migrations and verify table creation

### P1.4: Enable RBAC Validation ✅
**Verify First**:
- [x] Check if validateRbac is commented
- [x] Test if permissions are being enforced
- [x] Try unauthorized access to confirm

**Then Fix**:
**Location**: `/backend/src/server.js`
- [x] Uncomment validateRbac() call (line 13)
- [x] Fix any validation errors (created migration 008 for missing permissions)
- [x] Ensure all permissions are properly mapped

### P1.5: Verification Tests ✅
**Create**: `/backend/tests/phase1-verification.js`
```javascript
// Test audit service logs all state changes
// Test password_history table operations
// Test gauge_transactions table operations
// Test RBAC enforcement
// Verify no stub services remain active
```

**Verification Checklist**:
- [x] Audit logs capture all state changes
- [x] Database tables exist with correct schema
- [x] RBAC validates without errors
- [x] No stub services in use
- [x] Docker-based verification completed successfully

---

## Phase 2: Test Coverage Implementation [P2]

### P2.0: Pre-Phase System Check
**First Run**: `node /backend/scripts/verify-system-running.js`

### P2.1: Verify Missing Tests
**Create**: `/backend/scripts/verify-phase2-issues.js`
```javascript
// Script to verify missing test coverage
const fs = require('fs');
const path = require('path');

function checkTestFile(routeFile, testFile) {
  const routeExists = fs.existsSync(routeFile);
  const testExists = fs.existsSync(testFile);
  return { routeExists, testExists };
}

const filesToCheck = [
  {
    route: './src/modules/gauge/routes/gauge-tracking-operations.routes.js',
    test: './tests/modules/gauge/routes/gauge-tracking-operations.routes.test.js'
  },
  {
    route: './src/modules/gauge/routes/gauge-tracking-reports.routes.js',
    test: './tests/modules/gauge/routes/gauge-tracking-reports.routes.test.js'
  },
  // Add all files...
];

console.log('=== Phase 2 Test Coverage Verification ===\n');
filesToCheck.forEach(({route, test}) => {
  const result = checkTestFile(route, test);
  console.log(`Route: ${path.basename(route)}`);
  console.log(`  Exists: ${result.routeExists}, Test exists: ${result.testExists}`);
});
```

**Run Verification**: `node /backend/scripts/verify-phase2-issues.js`

### P2.2: Route Tests
**Verify First**:
- [ ] Confirm route files exist
- [ ] Check that test files don't exist
- [ ] Review route endpoints to test

**Then Create**:
**Location**: `/backend/tests/modules/gauge/routes/`

Create test files for each route module:
- [ ] `gauge-tracking-operations.routes.test.js`
  - Test GET /tracking/:gaugeId
  - Test POST /tracking/:gaugeId/checkout
  - Test POST /tracking/:gaugeId/return
  - Test POST /tracking/:gaugeId/qc-verify
  
- [ ] `gauge-tracking-reports.routes.test.js`
  - Test GET /tracking/dashboard/summary
  - Test GET /tracking/overdue/calibration
  
- [ ] `gauge-tracking-transfers.routes.test.js`
  - Test GET /tracking/transfers
  - Test POST /tracking/transfers
  - Test PUT /tracking/transfers/:transferId/accept
  - Test PUT /tracking/transfers/:transferId/reject
  
- [ ] `gauge-tracking-unseals.routes.test.js`
  - Test GET /tracking/unseal-requests
  - Test POST /tracking/:gaugeId/unseal-request
  - Test PUT /tracking/unseal-requests/:requestId/approve
  - Test PUT /tracking/unseal-requests/:requestId/reject

### P2.3: Service Tests
**Location**: `/backend/tests/modules/gauge/services/`
- [ ] Create `OperationsService.test.js`
- [ ] Create `ReportsService.test.js`
- [ ] Create `TransfersService.test.js`
- [ ] Create `UnsealsService.test.js`

### P2.4: Verification
**Create**: `/backend/tests/phase2-verification.js`
- [ ] Run full test suite
- [ ] Verify minimum 80% code coverage
- [ ] Generate coverage report
- [ ] All tests must pass

**Verification Checklist**:
- [ ] All route files have test coverage
- [ ] All service files have test coverage
- [ ] Coverage report shows >80%
- [ ] No failing tests

---

## Phase 3: Complete TODO Implementations [P3]

### P3.0: Pre-Phase System Check
**First Run**: `node /backend/scripts/verify-system-running.js`

### P3.1: Verify TODOs
**Create**: `/backend/scripts/verify-phase3-todos.js`
```javascript
// Script to find and verify TODOs
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Phase 3 TODO Verification ===\n');

// Find all TODOs in the codebase
const todoFiles = [
  './src/modules/admin/services/adminService.js',
  './src/infrastructure/utils/passwordValidator.js',
  './src/modules/gauge/services/GaugeTrackingService.js'
];

todoFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const todoMatches = content.match(/TODO.*$/gm) || [];
    console.log(`\nFile: ${file}`);
    console.log(`TODOs found: ${todoMatches.length}`);
    todoMatches.forEach((todo, i) => {
      console.log(`  ${i+1}. ${todo.trim()}`);
    });
  }
});
```

**Run Verification**: `node /backend/scripts/verify-phase3-todos.js`

### P3.2: Fix Admin Service Context
**Verify First**:
- [ ] Check for hardcoded userId TODOs
- [ ] Count instances (should be 3)
- [ ] Understand current implementation

**Then Fix**:
**Location**: `/backend/src/modules/admin/services/adminService.js`
- [ ] Replace hardcoded userId with actual user context (3 instances)
- [ ] Implement proper user context injection
- [ ] Update all admin endpoints to use context

### P3.3: Implement Password History
**Location**: `/backend/src/infrastructure/utils/passwordValidator.js`
- [ ] Implement checkPasswordHistory function
- [ ] Integrate with password_history table
- [ ] Add configuration for history count (default: 5)

### P3.4: Complete QC Verification
**Location**: `/backend/src/modules/gauge/services/GaugeTrackingService.js`
- [ ] Complete qcVerifyGauge method (line 174)
- [ ] Create transaction record in gauge_transactions
- [ ] Update gauge status properly
- [ ] Handle QC failure scenarios

### P3.5: Implement Assignment History
**Location**: `/backend/src/modules/gauge/services/GaugeTrackingService.js`
- [ ] Complete getGaugeHistory method
- [ ] Query gauge_transactions table
- [ ] Format history response
- [ ] Include all transaction types

### P3.6: Verification
**Create**: `/backend/tests/phase3-verification.js`
- [ ] Test admin context usage
- [ ] Test password history validation
- [ ] Test complete QC workflow
- [ ] Test assignment history retrieval

**Verification Checklist**:
- [ ] No TODOs remain in critical paths
- [ ] All features fully functional
- [ ] Integration tests pass

---

## Phase 4: Performance & Security Hardening [P4]

### P4.0: Pre-Phase System Check
**First Run**: `node /backend/scripts/verify-system-running.js`

### P4.1: Database Performance
**Location**: `/backend/migrations/add-performance-indexes.sql`
- [ ] Add index on gauges.status
- [ ] Add index on gauges.calibration_due_date
- [ ] Add composite index on gauge_active_checkouts(gauge_id, checked_out_to)
- [ ] Add index on audit_logs.created_at

### P4.2: Implement Caching
**Location**: `/backend/src/infrastructure/cache/`
- [ ] Configure Redis client (already exists)
- [ ] Implement caching for gauge lookups
- [ ] Cache user permissions
- [ ] Add cache invalidation logic

### P4.3: Security Hardening
**Location**: Various
- [ ] Review session configuration
- [ ] Adjust API rate limits for production
- [ ] Implement secure session storage
- [ ] Add session expiration handling

### P4.4: Circuit Breaker Tuning
**Location**: `/backend/src/infrastructure/utils/circuitBreaker.js`
- [ ] Configure thresholds per service
- [ ] Add monitoring for circuit state
- [ ] Test circuit breaker behavior

### P4.5: Verification
**Create**: `/backend/tests/phase4-verification.js`
- [ ] Load test critical endpoints
- [ ] Verify response times < 200ms
- [ ] Test cache hit rates > 80%
- [ ] Security audit scan passes

**Verification Checklist**:
- [ ] Performance targets met
- [ ] Security scan clean
- [ ] Rate limiting effective
- [ ] Caching operational

---

## Phase 5: Observability & Documentation [P5]

### P5.0: Pre-Phase System Check
**First Run**: `node /backend/scripts/verify-system-running.js`

### P5.1: Enhanced Health Checks
**Location**: `/backend/src/infrastructure/health/`
- [ ] Implement database health check
- [ ] Add Redis health check
- [ ] Create dependency health matrix
- [ ] Add health check documentation

### P5.2: Metrics & Monitoring
**Location**: `/backend/src/infrastructure/observability/`
- [ ] Complete business metrics collection
- [ ] Add custom gauge tracking metrics
- [ ] Implement metric aggregation
- [ ] Add request correlation IDs

### P5.3: API Documentation
**Location**: `/backend/docs/`
- [ ] Update OpenAPI specification
- [ ] Document all new endpoints
- [ ] Add request/response schemas
- [ ] Create API versioning strategy

### P5.4: Developer Documentation
**Location**: `/backend/docs/DEVELOPER_GUIDE.md`
- [ ] Document module structure
- [ ] Explain repository pattern
- [ ] Add testing guidelines
- [ ] Include troubleshooting guide

### P5.5: Verification
**Create**: `/backend/tests/phase5-verification.js`
- [ ] Test all health endpoints
- [ ] Verify metrics accuracy
- [ ] Validate OpenAPI spec
- [ ] Check documentation completeness

**Verification Checklist**:
- [ ] Health checks comprehensive
- [ ] Metrics collecting properly
- [ ] API fully documented
- [ ] Developer guide complete

---

## Phase 6: Cleanup & Migration [P6]

### P6.0: Pre-Phase System Check
**First Run**: `node /backend/scripts/verify-system-running.js`

### P6.1: Remove Legacy Code
- [ ] Archive `/Fireproof Gauge System/backend/`
- [ ] Remove duplicate route handlers
- [ ] Clean up temporary endpoints
- [ ] Remove commented code

### P6.2: Database Cleanup
**Location**: `/backend/migrations/cleanup-legacy.sql`
- [ ] Remove unused tables
- [ ] Clean orphaned records
- [ ] Optimize table structures
- [ ] Update foreign key constraints

### P6.3: File Organization
- [ ] Process `/review-for-delete/` directory
- [ ] Organize test files properly
- [ ] Remove duplicate configurations
- [ ] Update all import paths

### P6.4: Final System Verification
**Create**: `/backend/tests/phase6-verification.js`
- [ ] Full system integration test
- [ ] Performance benchmark
- [ ] Security final scan
- [ ] Generate completion report

**Verification Checklist**:
- [ ] No legacy code remains
- [ ] All tests pass
- [ ] Performance meets targets
- [ ] Security scan clean
- [ ] System fully functional

---

## Execution Instructions

### Phase Execution
To execute a specific phase or sub-phase:
```
"Execute Phase P1.1 from BACKEND_REBUILD_MASTER_PLAN.md"
"Execute all of Phase P2 from BACKEND_REBUILD_MASTER_PLAN.md"
```

### Verification Commands
```bash
# After each phase
node /backend/tests/phase[N]-verification.js

# Quick health check
curl localhost:8000/api/health

# Test specific functionality
npm test -- --testPathPattern="gauge-tracking"
```

### Phase Dependencies
- P1 must complete before any other phase
- P2 can run parallel with P3 after P1
- P4-P6 require P1-P3 complete

### Success Criteria
System is production-ready when:
- All phases complete
- All verification checklists pass
- No critical errors in logs
- Performance targets met
- Security scan clean

---

## Quick Reference - File Locations

### Critical Files
- Audit Stub: `/backend/src/infrastructure/middleware/auditService-stub.js`
- Server Config: `/backend/src/server.js`
- RBAC Middleware: `/backend/src/infrastructure/middleware/rbacMiddleware.js`

### New Route Files (Need Tests)
- `/backend/src/modules/gauge/routes/gauge-tracking-operations.routes.js`
- `/backend/src/modules/gauge/routes/gauge-tracking-reports.routes.js`
- `/backend/src/modules/gauge/routes/gauge-tracking-transfers.routes.js`
- `/backend/src/modules/gauge/routes/gauge-tracking-unseals.routes.js`

### New Service Files (Need Tests)
- `/backend/src/modules/gauge/services/OperationsService.js`
- `/backend/src/modules/gauge/services/ReportsService.js`
- `/backend/src/modules/gauge/services/TransfersService.js`
- `/backend/src/modules/gauge/services/UnsealsService.js`

### Files with TODOs
- `/backend/src/modules/admin/services/adminService.js` (3 TODOs)
- `/backend/src/infrastructure/utils/passwordValidator.js` (1 TODO)
- `/backend/src/modules/gauge/services/GaugeTrackingService.js` (2 TODOs)