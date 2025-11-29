# Backend Gold Standard Implementation Guide

<claude-instructions>
## How to Think About This Implementation

You are implementing a critical security fix that eliminates SQL injection vulnerabilities while standardizing the backend architecture. 

Key mindset:
- **Security First**: The original code has SQL injection vulnerabilities. Your implementation must be secure.
- **Systematic Approach**: Follow the phases in order. Each phase builds on the previous one.
- **Test Everything**: Every step has verification. Don't skip tests.
- **Stop on Failure**: If something fails, fix it before proceeding.

Recommended flags for the entire implementation:
- Use `--seq` for systematic execution
- Use `--validate` before any commits
- Use specific personas as indicated in each phase
- Use `--think` when migrating complex SQL queries

**IMPORTANT**: Read the <claude-instructions> section at the beginning of each phase for specific guidance on how to approach that phase.
</claude-instructions>

## 🚨 CRITICAL INSTRUCTIONS

### Must Do Before Starting
- [ ] Check working directory is `/backend`: `pwd`
- [ ] Verify .env has DB_ variables: `cat .env | grep DB_`
- [ ] Docker containers running: `docker ps | grep backend-dev`
- [ ] No uncommitted changes: `git status`

### Critical Rules
1. **Restart backend after moving files**: `docker-compose restart backend`
2. **Never use original BaseRepository** - has SQL injection vulnerability
3. **Run verification script**: `node scripts/verify-prerequisites.js`

### Quick Recovery
See "Emergency Rollback" section if issues arise.

## Quick Reference

### Common Gotchas
1. **Don't** create new connection pools
2. **Always** check if connection was passed: `const shouldRelease = !conn`
3. **Never** log SQL values, only structure
4. **Update ALL** imports when moving files

### Smoke Tests
```bash
curl http://localhost:8000/api/health        # Expected: {"status":"healthy"}
curl http://localhost:8000/api/audit/recent   # Expected: {"audits":[...]} or {"error":"..."}
curl http://localhost:8000/api/health/db      # Expected: {"connected":true}
```

---

## Phase 0: Prerequisites

<claude-instructions>
For this phase:
- Use `--seq` flag for systematic verification
- Focus on completeness - every prerequisite must be checked
- If any step fails, stop and fix before proceeding
- Double-check file movements and imports
</claude-instructions>

### 0.1 Create Directories
- [ ] Run all mkdir commands:
```bash
mkdir -p src/infrastructure/repositories src/infrastructure/services src/infrastructure/routes src/infrastructure/audit
mkdir -p tests/integration/infrastructure/repositories tests/integration/infrastructure/services
mkdir -p tests/integration/modules/auth/repositories tests/integration/modules/auth/services
mkdir -p tests/integration/modules/user/repositories tests/integration/modules/user/services
mkdir -p tests/integration/modules/admin/repositories tests/integration/modules/admin/services
mkdir -p tests/integration/modules/gauge/repositories tests/integration/modules/gauge/services
mkdir -p tests/security scripts
```

### 0.2 Move Audit Service
- [x] Check file exists: `ls src/modules/gauge/services/auditService.js`
- [x] Move file: `mv src/modules/gauge/services/auditService.js src/infrastructure/audit/auditService.js`
- [x] Restart backend: `docker-compose restart backend && sleep 10`
- [x] Verify running: `docker ps | grep backend-dev`

### 0.3 Update Imports
- [x] Find all imports: 
```bash
grep -r "require.*auditService" src/ tests/ --include="*.js" | grep -v node_modules
```

Update these files:
- [x] `/backend/src/infrastructure/middleware/auditMiddleware.js`
  - Change: `../../modules/gauge/services/auditService` → `../audit/auditService`
- [x] `/backend/src/infrastructure/middleware/errorHandler.js`
  - Change: `../../modules/gauge/services/auditService` → `../audit/auditService`
- [x] `/backend/src/infrastructure/health/audit-health.js`
  - Change: `../../modules/gauge/services/auditService` → `../audit/auditService`
- [x] `/backend/src/modules/gauge/services/gaugeCalibrationService.js`
  - Change: `./auditService` → `../../../infrastructure/audit/auditService`
- [x] `/backend/src/modules/gauge/services/GaugeRejectionService.js`
  - Change: `./auditService` → `../../../infrastructure/audit/auditService`
- [x] `/backend/src/modules/gauge/services/gaugeService.js`
  - Change: `./auditService` → `../../../infrastructure/audit/auditService`
- [x] Update any test files found by grep

### 0.4 Get Database Tables
- [x] Create `/backend/scripts/get-all-tables.js`:
```javascript
require('dotenv').config();
if (!process.env.DB_HOST) {
  console.error('❌ Missing DB environment variables');
  process.exit(1);
}
const { pool } = require('../src/infrastructure/database/connection');

async function getAllTables() {
  const conn = await pool.getConnection();
  try {
    const [tables] = await conn.execute(
      'SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = "BASE TABLE"'
    );
    console.log('static ALLOWED_TABLES = new Set([');
    tables.forEach(row => console.log(`  '${row.TABLE_NAME}',`));
    console.log(']);');
  } finally {
    conn.release();
    await pool.end();
  }
}
getAllTables();
```
- [x] Run: `node scripts/get-all-tables.js`
- [x] Copy the ALLOWED_TABLES output shown in console
- [x] Save for Phase 1 step 1.1

### 0.5 Create Verification Script
- [x] Create `/backend/scripts/verify-prerequisites.js`:
```javascript
const fs = require('fs');
const path = require('path');

// Check directories
const dirs = [
  'src/infrastructure/repositories',
  'src/infrastructure/services',
  'src/infrastructure/audit',
  'tests/security'
];

let pass = true;
dirs.forEach(dir => {
  if (!fs.existsSync(path.join(__dirname, '..', dir))) {
    console.log(`❌ Missing: ${dir}`);
    pass = false;
  }
});

// Check audit service moved
if (!fs.existsSync(path.join(__dirname, '../src/infrastructure/audit/auditService.js'))) {
  console.log('❌ Audit service not moved');
  pass = false;
}

// Check no circular deps
const checkFiles = [
  'src/infrastructure/middleware/auditMiddleware.js',
  'src/infrastructure/middleware/errorHandler.js'
];

checkFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('modules/gauge/services/auditService')) {
      console.log(`❌ Circular dependency in ${file}`);
      pass = false;
    }
  }
});

console.log(pass ? '✅ Ready!' : '❌ Fix issues above');
process.exit(pass ? 0 : 1);
```
- [x] Run: `node scripts/verify-prerequisites.js`
- [x] All checks must pass

### 0.6 Smoke Test
- [x] Test system health: `curl http://localhost:8000/api/health`
  - Expected: `{"status":"healthy"}` or similar success response

---

## Phase 1: Base Infrastructure

<claude-instructions>
For this phase:
- Use `--persona-security` when implementing BaseRepository
- Use `--validate` flag to ensure no SQL injection vulnerabilities
- Test thoroughly - security is critical here
- If tests fail, do not proceed to Phase 2
</claude-instructions>

### 1.1 Create BaseRepository
- [x] Copy secure BaseRepository from `/erp-core-docs/backend-rebuild/Plans/secure-base-repository.md`
- [x] Create `/backend/src/infrastructure/repositories/BaseRepository.js`
- [x] Update ALLOWED_TABLES with output from step 0.4
- [x] Verify no string interpolation: `grep -n "\${" src/infrastructure/repositories/BaseRepository.js`

### 1.2 Test BaseRepository Security
- [x] Create `/backend/tests/security/BaseRepository.security.test.js`:
```javascript
const BaseRepository = require('../../src/infrastructure/repositories/BaseRepository');

describe('BaseRepository Security', () => {
  test('rejects non-whitelisted tables', () => {
    expect(() => new BaseRepository('evil_table'))
      .toThrow('not in the allowed list');
  });
  
  test('rejects SQL injection', () => {
    const repo = new BaseRepository('core_users');
    expect(() => repo.validateIdentifier('SELECT * FROM'))
      .toThrow('Invalid identifier');
  });
});
```
- [x] Run: `npm test -- tests/security/BaseRepository.security.test.js`

### 1.3 Create BaseService
- [x] Create `/backend/src/infrastructure/services/BaseService.js`:
```javascript
const { pool } = require('../database/connection');
const logger = require('../utils/logger');

class BaseService {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.auditService = options.auditService || null;
  }

  async executeInTransaction(operation, auditData = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await operation(connection);
      
      if (auditData && this.auditService) {
        await this.auditService.logAction({
          ...auditData,
          details: { ...auditData.details, result }
        }, connection);
      }
      
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error(`Transaction failed: ${error.message}`);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = BaseService;
```

### 1.4 Test Everything
- [x] Run security tests: `npm test -- tests/security/`
- [x] Verify no circular deps: `grep -r "modules/gauge/services/auditService" src/infrastructure/`
- [x] Test audit loads: `node -e "require('./src/infrastructure/audit/auditService')"`

---

## Phase 2: First Module (Auth) - Proof of Concept

<claude-instructions>
For this phase:
- Use `--persona-backend` for repository and service work
- This is your proof of concept - take extra care
- Test each step before moving to the next
- If this module works, the pattern is proven for others
- Use `--think` if you encounter complex SQL migrations
</claude-instructions>

### 2.1 Create AuthRepository
- [x] Create `/backend/src/modules/auth/repositories/AuthRepository.js`
- [x] Extend BaseRepository
- [x] Move SQL from authService.js to repository methods
- [x] Test the repository

### 2.2 Update AuthService
- [x] Inject AuthRepository
- [x] Replace all SQL with repository calls
- [x] Add transaction support
- [x] Test service works

### 2.3 Clean Auth Routes
- [x] Remove all SQL from auth routes
- [x] Use service methods only
- [x] Test all endpoints

### 2.4 Verify Auth Module
- [x] No SQL in routes: `grep -r "pool.execute" src/modules/auth/routes/`
- [x] No SQL in service: `grep -r "pool.execute" src/modules/auth/services/`
- [x] All tests pass: `npm test -- tests/integration/modules/auth/`

---

## Phase 3: Remaining Modules (Following Auth Pattern)

<claude-instructions>
For this phase:
- Use the Auth module as your template - follow the exact same pattern
- Use `--persona-backend` for all repository and service work
- Test each module completely before moving to the next
- The Gauge module is the most complex - take extra care with it
</claude-instructions>

### 3.1 User Module
- [ ] Create `/backend/src/modules/user/repositories/UserRepository.js`
- [ ] Extend BaseRepository
- [ ] Move SQL from user routes/services to repository methods
- [ ] Update UserService to inject UserRepository
- [ ] Clean user routes - remove all SQL
- [ ] Test: `npm test -- tests/integration/modules/user/`
- [ ] Verify no SQL: `grep -r "pool.execute" src/modules/user/`

### 3.2 Admin Module
- [ ] Create `/backend/src/modules/admin/repositories/AdminRepository.js`
- [ ] Extend BaseRepository
- [ ] Move SQL from admin routes/services to repository methods
- [ ] Update AdminService to inject AdminRepository
- [ ] Clean admin routes - remove all SQL
- [ ] Test: `npm test -- tests/integration/modules/admin/`
- [ ] Verify no SQL: `grep -r "pool.execute" src/modules/admin/`

### 3.3 Gauge Module (Most Complex)
- [ ] Create `/backend/src/modules/gauge/repositories/GaugeRepository.js`
- [ ] Extend BaseRepository
- [ ] Move SQL from gauges-v2.js routes (20+ queries) to repository
- [ ] Update gaugeService.js to use GaugeRepository
- [ ] Update gaugeCalibrationService.js to use repository pattern
- [ ] Update other gauge services as needed
- [ ] Clean ALL gauge routes - remove all SQL
- [ ] Test: `npm test -- tests/integration/modules/gauge/`
- [ ] Verify no SQL: `grep -r "pool.execute" src/modules/gauge/`

---

## Phase 4: Service Registry Integration

<claude-instructions>
For this phase:
- Only start this after ALL modules are refactored
- Be careful with the registration order - some services depend on others
- Test cross-module communication thoroughly
</claude-instructions>

### 4.1 Update Service Registry
- [ ] Edit `/backend/src/bootstrap/registerServices.js`
- [ ] Add registrations:
```javascript
serviceRegistry.register('AuthService', new AuthService(new AuthRepository()));
serviceRegistry.register('UserService', new UserService(new UserRepository()));
serviceRegistry.register('AdminService', new AdminService(new AdminRepository()));
serviceRegistry.register('GaugeService', new GaugeService(new GaugeRepository()));
```
- [ ] Update any services that need other services injected

### 4.2 Update Cross-Module Dependencies
- [ ] Find cross-module imports: `grep -r "require.*modules.*Service" src/`
- [ ] Replace direct imports with: `serviceRegistry.get('ServiceName')`
- [ ] Test cross-module communication
- [ ] Verify all services load correctly on startup

---

## Phase 5: Final Validation

<claude-instructions>
For this phase:
- Be thorough - this is your final quality check
- Run ALL tests, not just new ones
- Document any issues found for future reference
</claude-instructions>

### 5.1 Code Verification
- [ ] Zero SQL in routes: `grep -r "pool.execute\|pool.query" src/modules --include="*.routes.js"`
  - Expected: No results
- [ ] Zero SQL in services: `grep -r "pool.execute\|pool.query" src/modules --include="*Service.js"`
  - Expected: No results
- [ ] All repositories extend BaseRepository: `grep -r "extends BaseRepository" src/`
  - Expected: One result per module

### 5.2 Testing
- [ ] Run full test suite: `npm test`
  - Expected: All tests pass
- [ ] Run security tests: `npm test -- tests/security/`
  - Expected: All pass
- [ ] Check test coverage: `npm run test:coverage`
  - Expected: >80% coverage

### 5.3 Performance & Security
- [ ] Test connection pool usage under load
- [ ] Verify no SQL injection vulnerabilities
- [ ] Check for connection leaks
- [ ] Monitor memory usage

---

## Phase 6: Cleanup & Documentation

<claude-instructions>
For this phase:
- This is about polish and future-proofing
- Update documentation to help future developers
- Remove any temporary code or comments
</claude-instructions>

### 6.1 Code Cleanup
- [ ] Remove any deprecated code marked for deletion
- [ ] Remove unnecessary comments
- [ ] Ensure consistent code style
- [ ] Update JSDoc comments

### 6.2 Documentation
- [ ] Update API documentation with new patterns
- [ ] Create developer guide for repository pattern
- [ ] Document the gold standard patterns
- [ ] Update README with architecture changes

### 6.3 Monitoring
- [ ] Add connection pool monitoring
- [ ] Add query performance tracking
- [ ] Set up alerts for connection exhaustion
- [ ] Create dashboard for system health

---

## Quick Reference

### Common Gotchas
1. **Don't** create new connection pools
2. **Always** check if connection was passed: `const shouldRelease = !conn`
3. **Never** log SQL values, only structure
4. **Update ALL** imports when moving files

### Smoke Tests
```bash
curl http://localhost:8000/api/health        # Expected: {"status":"healthy"}
curl http://localhost:8000/api/audit/recent   # Expected: {"audits":[...]} or {"error":"..."}
curl http://localhost:8000/api/health/db      # Expected: {"connected":true}
```

### Emergency Rollback
```bash
# Quick rollback (before commit)
git checkout -- .
git clean -fd
docker-compose restart backend

# After commit
git reset --hard PREVIOUS_COMMIT
docker-compose down && docker-compose up -d
```

---

## Progress Tracking

### Phase 0: Prerequisites ✅ COMPLETED
- [x] Directories created
- [x] Audit service moved
- [x] All imports updated
- [x] Tables retrieved
- [x] Verification passing
- [x] Smoke tests passing

### Phase 1: Base Infrastructure ✅ COMPLETED
- [x] BaseRepository created
- [x] Security tests passing
- [x] BaseService created
- [x] No circular dependencies

### Phase 2: Auth Module (Proof of Concept) ✅ COMPLETED
- [x] AuthRepository created
- [x] AuthService updated
- [x] Routes cleaned
- [x] All tests passing

### Phase 3: Remaining Modules
- [ ] User module completed
- [ ] Admin module completed
- [ ] Gauge module completed
- [ ] All modules tested

### Phase 4: Service Registry
- [ ] Services registered
- [ ] Cross-module dependencies updated
- [ ] Integration tested

### Phase 5: Final Validation
- [ ] Zero SQL outside repositories
- [ ] All tests passing
- [ ] Security validated
- [ ] Performance tested

### Phase 6: Cleanup & Documentation
- [ ] Code cleaned
- [ ] Documentation updated
- [ ] Monitoring added