# Backend Gold Standard - Actionable Checklist for Claude Code

This is a simplified, actionable checklist extracted from the main implementation plan. Each item is a concrete task that Claude Code can execute.

## Important Notes
- **Working Directory**: This checklist assumes you're in `/backend/` directory
- All paths are absolute from project root
- Test files follow the module structure: `/backend/tests/integration/modules/{module}/{layer}/{file}.test.js`
- Use `npm test --` with double dash to pass file paths to Jest
- The backend uses Jest with real database configuration
- Tests run twice (mock and real database) - both should pass

## Phase 1: Repository Layer - CREATE FILES

### 1.1 BaseRepository
- [ ] CREATE: `/backend/src/infrastructure/repositories/BaseRepository.js`
- [ ] COPY: Code from plan (complete class provided)
- [ ] VERIFY: File created successfully with no syntax errors

### 1.2 AuthRepository
- [ ] CREATE: `/backend/src/modules/auth/repositories/AuthRepository.js`
- [ ] READ: `/backend/src/modules/auth/services/authService.js`
- [ ] SEARCH: Find all SQL queries using `grep -n "pool.execute\|pool.query" src/modules/auth/services/authService.js`
- [ ] EXTRACT: Move each SQL query to a method in AuthRepository
- [ ] IMPLEMENT: Methods listed in plan (findUserByEmail, recordLoginAttempt, etc.)
- [ ] CREATE: `/backend/tests/integration/modules/auth/repositories/AuthRepository.test.js`
- [ ] RUN: `npm test -- tests/integration/modules/auth/repositories/AuthRepository.test.js`

### 1.3 UserRepository
- [ ] CREATE: `/backend/src/modules/user/repositories/UserRepository.js`
- [ ] SEARCH: Find all SQL queries in user module using `grep -r "pool.execute\|pool.query" src/modules/user/`
- [ ] IMPLEMENT: Repository methods for each SQL query found
- [ ] CREATE: `/backend/tests/integration/modules/user/repositories/UserRepository.test.js`
- [ ] RUN: `npm test -- tests/integration/modules/user/repositories/UserRepository.test.js`

### 1.4 AdminRepository
- [ ] CREATE: `/backend/src/modules/admin/repositories/AdminRepository.js`
- [ ] SEARCH: Find all SQL queries in admin routes using `grep -r "pool.execute\|pool.query" src/modules/admin/`
- [ ] IMPLEMENT: Repository methods
- [ ] CREATE: `/backend/tests/integration/modules/admin/repositories/AdminRepository.test.js`
- [ ] RUN: `npm test -- tests/integration/modules/admin/repositories/AdminRepository.test.js`

## Phase 2: Service Layer - REFACTOR FILES

### 2.1 BaseService
- [ ] CREATE: `/backend/src/infrastructure/services/BaseService.js`
- [ ] COPY: Code from plan (complete class provided)

### 2.2 Refactor AuthService
- [ ] EDIT: `/backend/src/modules/auth/services/authService.js`
- [ ] ADD: `extends BaseService` to class
- [ ] ADD: Constructor that injects AuthRepository
- [ ] REPLACE: Each `pool.execute` with repository method call
- [ ] ADD: Audit logging to each method using `auditService.logAction()`
- [ ] WRAP: Multi-step operations in `executeInTransaction()`
- [ ] CREATE: `/backend/tests/integration/modules/auth/services/AuthService.test.js`
- [ ] RUN: `npm test -- tests/integration/modules/auth/services/AuthService.test.js`

### 2.3 Refactor All Services
For each service file in the system:
- [ ] FIND: All service files using `find src/modules -name "*Service.js" -type f`
- [ ] For each service:
  - [ ] EXTEND: BaseService
  - [ ] INJECT: Appropriate repository
  - [ ] REMOVE: All `pool.execute` calls
  - [ ] ADD: Transaction support
  - [ ] ADD: Audit logging
  - [ ] CREATE: Test file
  - [ ] RUN: Tests

## Phase 3: Routes - REMOVE SQL

### 3.1 Create Route Factory
- [ ] CREATE: `/backend/src/infrastructure/routes/routeFactory.js`
- [ ] COPY: Code from plan (complete function provided)

### 3.2 Clean Each Route File
- [ ] FIND: All route files using `find src/modules -name "*.routes.js" -o -path "*/routes/*.js"`
- [ ] For each route file:
  - [ ] SEARCH: `pool.execute` or `pool.query` 
  - [ ] REPLACE: Direct SQL with service method calls
  - [ ] WRAP: Route handlers with `createRoute()`
  - [ ] ADD: Validation using express-validator
  - [ ] ADD: `auditStateChanges()` middleware to POST/PUT/DELETE routes
  - [ ] CREATE: Test file
  - [ ] RUN: Route tests

## Phase 4: Service Registry

### 4.1 Register Services
- [ ] EDIT: `/backend/src/bootstrap/registerServices.js`
- [ ] ADD: Registration for each service:
  ```javascript
  serviceRegistry.register('AuthService', require('../modules/auth/services/authService'));
  serviceRegistry.register('UserService', require('../modules/user/services/userService')); // After creating it
  serviceRegistry.register('AdminService', require('../modules/admin/services/adminService')); // After creating it
  // etc...
  ```

### 4.2 Update Cross-Module Calls
- [ ] SEARCH: Direct service imports between modules
- [ ] REPLACE: Direct imports with `serviceRegistry.get('ServiceName')`
- [ ] UPDATE: Tests to mock service registry
- [ ] RUN: Integration tests

## Phase 5: Final Validation

### 5.1 Verify No SQL in Wrong Places
- [ ] RUN: `grep -r "pool.execute\|pool.query" src/modules --include="*.routes.js"`
  - Should return ZERO results
- [ ] RUN: `grep -r "pool.execute\|pool.query" src/modules --include="*Service.js"`
  - Should return ZERO results

### 5.2 Run All Tests
- [ ] RUN: `npm test`
- [ ] FIX: Any failing tests
- [ ] RUN: `npm run lint`

### 5.3 Test Transactions
- [ ] CREATE: Test script to verify transaction rollback
- [ ] TEST: Force an error in a multi-step operation
- [ ] VERIFY: All changes rolled back

## Commands to Run After Each Phase

```bash
# After Phase 1 - Test all new repository files
npm test -- tests/integration/modules/*/repositories/

# After Phase 2 - Test all service files
npm test -- tests/integration/modules/*/services/

# After Phase 3 - Test all route files
npm test -- tests/integration/modules/*/routes/

# After Phase 4 - Run all integration tests
npm run test:integration

# Final - Run complete test suite
npm test
npm run lint
npm run test:coverage
```

## Quick Verification Commands

```bash
# Find SQL in routes (should be empty)
grep -r "pool.execute\|pool.query" src/modules --include="*.routes.js"

# Find SQL in services (should be empty)
grep -r "pool.execute\|pool.query" src/modules --include="*Service.js"

# Find services not using repositories
find src/modules -name "*Service.js" -type f -exec grep -L "Repository" {} \;

# Check for missing transaction support
find src/modules -name "*Service.js" -type f -exec grep -L "executeInTransaction\|beginTransaction" {} \;

# Find routes without error handling
find src/modules -name "*.routes.js" -o -path "*/routes/*.js" | xargs grep -L "asyncErrorHandler\|createRoute"
```

## DO NOT SKIP
- Creating test files after each implementation
- Running tests after each file change
- Adding transaction support to ALL write operations
- Adding audit trails to ALL state changes