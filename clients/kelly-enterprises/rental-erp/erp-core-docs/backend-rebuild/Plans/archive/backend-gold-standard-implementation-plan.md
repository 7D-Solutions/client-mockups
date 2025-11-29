# Backend Gold Standard Implementation Plan

## Implementation Instructions for Claude Code

<claude-instructions>
When implementing this plan:
- Use `--persona-backend` for all backend architectural work
- Use `--persona-architect` when making cross-module decisions
- Use `--seq` flag for analyzing existing patterns before changes
- Use `--validate` flag before any database schema changes
- Always run tests after each implementation step
- Commit after each major section completion with descriptive messages
</claude-instructions>

## Overview

This plan transforms the backend to follow gold standard patterns found in the infrastructure layer, specifically:
- Error handling from `errorHandler.js`
- Repository pattern from `GaugesRepo.js`
- Service pattern from `GaugeCalibrationService.js`
- Audit integration from `auditMiddleware.js`

---

## Phase 1: Repository Layer Standardization

### Step 1.1: Create Base Repository Class
**File**: `/backend/src/infrastructure/repositories/BaseRepository.js`

```javascript
const { pool } = require('../database/connection');
const logger = require('../utils/logger');

class BaseRepository {
  constructor(tableName, primaryKey = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  async findById(id, conn) {
    const connection = conn || await pool.getConnection();
    const shouldRelease = !conn;
    
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ? AND is_deleted = 0`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      logger.error(`Failed to find ${this.tableName} by ID:`, error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  async create(data, conn) {
    const connection = conn || await pool.getConnection();
    const shouldRelease = !conn;
    
    try {
      if (!conn) await connection.beginTransaction();
      
      const columns = Object.keys(data);
      const placeholders = columns.map(() => '?').join(',');
      const values = columns.map(col => data[col]);
      
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} (${columns.join(',')}) VALUES (${placeholders})`,
        values
      );
      
      if (!conn) await connection.commit();
      return { id: result.insertId, ...data };
      
    } catch (error) {
      if (!conn) await connection.rollback();
      logger.error(`Failed to create ${this.tableName}:`, error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  async update(id, data, conn) {
    const connection = conn || await pool.getConnection();
    const shouldRelease = !conn;
    
    try {
      if (!conn) await connection.beginTransaction();
      
      const columns = Object.keys(data);
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = [...columns.map(col => data[col]), id];
      
      await connection.execute(
        `UPDATE ${this.tableName} SET ${setClause}, updated_at = NOW() WHERE ${this.primaryKey} = ?`,
        values
      );
      
      if (!conn) await connection.commit();
      return { id, ...data };
      
    } catch (error) {
      if (!conn) await connection.rollback();
      logger.error(`Failed to update ${this.tableName}:`, error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  async softDelete(id, conn) {
    return this.update(id, { is_deleted: 1 }, conn);
  }
}

module.exports = BaseRepository;
```

### Step 1.2: Create Auth Repository
**File**: `/backend/src/modules/auth/repositories/AuthRepository.js`

1. Create the repository file extending BaseRepository
2. Move all SQL queries from `authService.js` to this repository
3. Implement methods:
   - `findUserByEmail(email, conn)`
   - `recordLoginAttempt(attemptData, conn)`
   - `updateFailedLoginCount(userId, count, conn)`
   - `setAccountLockout(userId, lockedUntil, conn)`
   - `getRecentFailedAttempts(email, minutes, conn)`

### Step 1.2.1: Test Auth Repository
**File**: `/backend/tests/integration/modules/auth/repositories/AuthRepository.test.js`

```javascript
describe('AuthRepository', () => {
  let authRepo;
  let connection;

  beforeEach(async () => {
    authRepo = new AuthRepository();
    connection = await pool.getConnection();
    await connection.beginTransaction();
  });

  afterEach(async () => {
    await connection.rollback();
    connection.release();
  });

  describe('findUserByEmail', () => {
    it('should find user with roles', async () => {
      // Test implementation
    });

    it('should return null for non-existent user', async () => {
      // Test implementation
    });

    it('should handle connection reuse', async () => {
      // Test with passed connection
    });
  });

  describe('recordLoginAttempt', () => {
    it('should record successful login', async () => {
      // Test implementation
    });

    it('should record failed login with reason', async () => {
      // Test implementation
    });
  });

  describe('transaction support', () => {
    it('should rollback on error', async () => {
      // Test transaction rollback
    });
  });
});
```

### Step 1.3: Create User Repository
**File**: `/backend/src/modules/user/repositories/UserRepository.js`

1. Extend BaseRepository
2. Implement methods:
   - `findAllActive(conn)`
   - `findWithRoles(userId, conn)`
   - `updateLastLogin(userId, conn)`
   - `findByDepartment(department, conn)`

### Step 1.3.1: Test User Repository
**File**: `/backend/tests/integration/repositories/UserRepository.test.js`
- Test all methods with and without connection
- Test transaction scenarios
- Test error handling

### Step 1.4: Update Admin Repository
**File**: `/backend/src/modules/admin/repositories/AdminRepository.js`

1. Create repository following the pattern
2. Move SQL from admin routes
3. Implement transaction support for all methods

### Step 1.4.1: Test Admin Repository
**File**: `/backend/tests/integration/repositories/AdminRepository.test.js`
- Test CRUD operations
- Test complex queries
- Test transaction handling

---

## Phase 2: Service Layer Standardization

### Step 2.1: Create Base Service Class
**File**: `/backend/src/infrastructure/services/BaseService.js`

```javascript
const { pool } = require('../database/connection');
const logger = require('../utils/logger');
const auditService = require('../../modules/gauge/services/auditService');

class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  async executeInTransaction(operation, auditData = null) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const result = await operation(connection);
      
      if (auditData) {
        await auditService.logAction({
          ...auditData,
          details: { ...auditData.details, result }
        }, connection);
      }
      
      await connection.commit();
      return result;
      
    } catch (error) {
      await connection.rollback();
      logger.error(`Transaction failed in ${this.constructor.name}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = BaseService;
```

### Step 2.2: Refactor AuthService
**Actions**:
1. Extend BaseService
2. Inject AuthRepository
3. Refactor all methods to use repository
4. Add audit trail for all auth operations
5. Ensure transaction support throughout

**Key Methods to Refactor**:
- `authenticateUser()` - Add audit logging
- `recordLoginAttempt()` - Use repository
- `checkAccountLockout()` - Add transaction support
- `resetPassword()` - Add audit trail

### Step 2.2.1: Test Refactored AuthService
**File**: `/backend/tests/integration/services/AuthService.test.js`

```javascript
describe('AuthService', () => {
  let authService;
  let authRepo;

  beforeEach(() => {
    authRepo = new AuthRepository();
    authService = new AuthService(authRepo);
  });

  describe('authenticateUser', () => {
    it('should authenticate valid user and create audit log', async () => {
      // Test successful auth with audit
    });

    it('should handle failed login and increment counter', async () => {
      // Test failed auth with lockout
    });

    it('should rollback transaction on audit failure', async () => {
      // Test transaction rollback
    });
  });
});
```

### Step 2.3: Update All Services
**For each service in the system**:
1. Extend BaseService
2. Inject appropriate repository
3. Remove direct SQL queries
4. Add transaction support
5. Integrate audit logging

### Step 2.3.1: Test Each Updated Service
**File Pattern**: `/backend/tests/integration/services/[Name]Service.test.js`
- Test service methods with mocked repository
- Test transaction handling
- Test audit integration
- Test error scenarios

---

## Phase 3: Route Layer Cleanup

### Step 3.1: Create Route Factory
**File**: `/backend/src/infrastructure/routes/routeFactory.js`

```javascript
const { asyncErrorHandler } = require('../middleware/errorHandler');
const { auditStateChanges, AUDIT_LEVELS } = require('../middleware/auditMiddleware');
const { validationResult } = require('express-validator');

function createRoute(options) {
  const {
    method = 'get',
    middleware = [],
    validators = [],
    auditLevel = null,
    handler
  } = options;

  const middlewareStack = [
    ...validators,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      next();
    },
    ...middleware
  ];

  if (auditLevel && ['post', 'put', 'patch', 'delete'].includes(method)) {
    middlewareStack.push(auditStateChanges(auditLevel));
  }

  middlewareStack.push(asyncErrorHandler(handler));

  return middlewareStack;
}

module.exports = { createRoute };
```

### Step 3.2: Refactor Routes
**For each route file**:

1. Remove ALL direct database queries
2. Use service methods only
3. Apply consistent error handling
4. Add proper validation
5. Include audit middleware

**Example transformation**:
```javascript
// BEFORE
router.get('/users', authenticateToken, async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM core_users');
  res.json({ data: rows });
});

// AFTER
router.get('/users', ...createRoute({
  middleware: [authenticateToken],
  handler: async (req, res) => {
    const users = await userService.getAllActive();
    res.json({ data: addHATEOAS(users, req) });
  }
}));
```

### Step 3.2.1: Test Refactored Routes
**File Pattern**: `/backend/tests/integration/modules/[module]/routes/[route].test.js`

```javascript
describe('User Routes', () => {
  let app;
  let userService;

  beforeEach(() => {
    userService = {
      getAllActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    };
    
    // Mock service registry
    serviceRegistry.get.mockImplementation((name) => {
      if (name === 'UserService') return userService;
    });
    
    app = createTestApp();
  });

  describe('GET /api/users', () => {
    it('should return users with HATEOAS links', async () => {
      userService.getAllActive.mockResolvedValue([/* test data */]);
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer valid-token');
        
      expect(response.status).toBe(200);
      expect(response.body.data[0]._links).toBeDefined();
    });

    it('should handle service errors gracefully', async () => {
      userService.getAllActive.mockRejectedValue(new Error('DB Error'));
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer valid-token');
        
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/users', () => {
    it('should create user with audit log', async () => {
      // Test creation with audit middleware
    });

    it('should validate input', async () => {
      // Test validation
    });
  });
});
```

---

## Phase 4: Service Registry Integration

### Step 4.1: Register All Services
**File**: `/backend/src/bootstrap/registerServices.js`

Add registration for:
- AuthService
- UserService
- AdminService
- All other services following the pattern

### Step 4.2: Update Service Dependencies
1. Modify services to use ServiceRegistry for cross-module communication
2. Remove direct imports between modules
3. Update tests to mock ServiceRegistry

### Step 4.2.1: Test Service Registry Integration
**File**: `/backend/tests/integration/bootstrap/serviceRegistry.test.js`

```javascript
describe('Service Registry Integration', () => {
  it('should register all required services', async () => {
    await registerServices();
    
    expect(serviceRegistry.has('AuthService')).toBe(true);
    expect(serviceRegistry.has('UserService')).toBe(true);
    expect(serviceRegistry.has('GaugeService')).toBe(true);
  });

  it('should handle cross-module service calls', async () => {
    const gaugeService = serviceRegistry.get('GaugeService');
    const authService = serviceRegistry.get('AuthService');
    
    // Test cross-module communication
  });

  it('should throw error for unregistered services', () => {
    expect(() => serviceRegistry.get('NonExistentService'))
      .toThrow('Service \'NonExistentService\' not found');
  });
});
```

---

## Phase 5: Testing & Validation

### Step 5.1: Create Integration Tests
**For each refactored component**:
1. Test transaction rollback scenarios
2. Test audit trail creation
3. Test error handling
4. Test connection management

### Step 5.2: Create Repository Tests
**File Pattern**: `/backend/tests/integration/modules/[module]/repositories/[Name]Repository.test.js`

Test:
- Connection management
- Transaction support
- Error scenarios
- Data integrity

### Step 5.3: Update Existing Tests
1. Update mocks to use repositories
2. Fix broken imports
3. Add transaction setup/teardown

---

## Implementation Order

### Priority 1: Foundation (Must Complete First)
1. Create BaseRepository and BaseService
2. Implement AuthRepository and refactor AuthService
3. Add comprehensive tests for auth module

### Priority 2: Core Modules (Complete After Foundation)
1. Create UserRepository and refactor UserService
2. Create AdminRepository and refactor AdminService
3. Update all routes in these modules

### Priority 3: Remaining Modules (Complete After Core)
1. Apply patterns to all remaining modules
2. Complete service registry integration
3. Comprehensive testing

### Priority 4: Polish & Documentation (Final Phase)
1. Performance optimization
2. Documentation updates
3. Final integration testing

---

## Testing Requirements Per Phase

### Phase 1 Testing Checklist
After implementing each repository:
- [ ] Run repository integration tests
- [ ] Verify transaction handling
- [ ] Test connection management
- [ ] Ensure no connection leaks

### Phase 2 Testing Checklist
After refactoring each service:
- [ ] Run service unit tests with mocked repositories
- [ ] Test audit trail creation
- [ ] Verify transaction rollback scenarios
- [ ] Run integration tests

### Phase 3 Testing Checklist
After updating routes:
- [ ] Run route integration tests
- [ ] Test validation and error responses
- [ ] Verify audit middleware triggers
- [ ] Test HATEOAS link generation

### Phase 4 Testing Checklist
After service registry integration:
- [ ] Test service registration
- [ ] Verify cross-module communication
- [ ] Run full integration test suite
- [ ] Performance testing

## Validation Checklist

After each phase, verify:
- [ ] No SQL queries in routes
- [ ] All services use repositories
- [ ] Transaction support in all write operations
- [ ] Audit trail for state changes
- [ ] Consistent error handling
- [ ] Tests pass
- [ ] No regression in functionality

---

## Critical Rules

1. **NEVER** put SQL in routes or services
2. **ALWAYS** use transactions for multi-step operations
3. **ALWAYS** release database connections
4. **ALWAYS** log errors with context
5. **ALWAYS** audit state changes
6. **NEVER** skip tests after changes

---

## Success Metrics

- Zero SQL queries outside repositories
- 100% transaction coverage for write operations
- All state changes audited
- Consistent patterns across all modules
- No connection leaks
- All tests passing