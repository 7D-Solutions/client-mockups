# Actionable Steps for Backend Implementation

## 🚨 CRITICAL INSTRUCTIONS - READ FIRST

### Docker Container Restarts
**ALWAYS restart the backend container after moving files that are imported by running services:**
```bash
docker-compose restart backend
# Wait 10 seconds for full startup
sleep 10
# Verify it's running
docker ps | grep backend-dev
```
**Why**: Node.js caches module locations. Without restart, the backend will look for files in old locations.

### Environment Variables
**ALWAYS verify database environment variables before running any database scripts:**
```bash
# Check .env file exists
cat .env | grep DB_
# Should show: DB_HOST, DB_USER, DB_PASS, DB_NAME
```
**Why**: Scripts will fail with confusing errors if database connection isn't configured.

### File Backups
**ALWAYS backup files before moving or modifying them:**
```bash
cp src/important-file.js backups/important-file.js.backup
```
**Why**: Enables quick recovery if something goes wrong.

### Prerequisite Verification
**ALWAYS run the verification script before starting implementation:**
```bash
node scripts/verify-prerequisites.js
```
**Why**: Catches missing directories, circular dependencies, and configuration issues early.

### Security Warning
**NEVER use the original BaseRepository implementation** - it has a critical SQL injection vulnerability. Only use the secure version from `secure-base-repository.md`.

### If Something Goes Wrong
**Quick recovery steps are in the "Emergency Rollback Procedure" section**. Don't panic - everything can be rolled back.

### Pre-flight Checklist
Before starting implementation, verify:
- [ ] Created backups directory: `ls backups/`
- [ ] Database environment variables set: `cat .env | grep DB_`
- [ ] Docker containers running: `docker ps | grep backend-dev`
- [ ] Working directory is `/backend`: `pwd`
- [ ] No uncommitted changes: `git status`

## Overview
This document provides concrete, executable steps that Claude Code can implement based on the security review findings. Each step includes exact commands and file paths.

## ⚠️ Critical Updates Made
Based on review feedback, this document now includes:
1. **Docker Restart Requirements** - Backend must restart after moving files
2. **File Existence Checks** - Scripts verify files exist before operations
3. **Environment Variable Validation** - Database scripts check configuration
4. **Rollback Procedures** - Clear steps to recover from issues
5. **Performance Monitoring** - Connection pool status checks

## Phase 0: Prerequisites (MUST COMPLETE FIRST)

### Step 1: Create Directory Structure
```bash
# Execute from backend directory
mkdir -p src/infrastructure/repositories
mkdir -p src/infrastructure/services  
mkdir -p src/infrastructure/routes
mkdir -p src/infrastructure/audit
mkdir -p tests/integration/infrastructure/repositories
mkdir -p tests/integration/infrastructure/services
mkdir -p tests/integration/modules/auth/repositories
mkdir -p tests/integration/modules/auth/services
mkdir -p tests/integration/modules/user/repositories
mkdir -p tests/integration/modules/user/services
mkdir -p tests/integration/modules/admin/repositories
mkdir -p tests/integration/modules/admin/services
mkdir -p tests/integration/modules/gauge/repositories
mkdir -p tests/integration/modules/gauge/services
mkdir -p tests/security
mkdir -p scripts
mkdir -p backups
```

### Step 2: Safely Move Audit Service to Infrastructure
```bash
# First, create a backup
if [ -f "src/modules/gauge/services/auditService.js" ]; then
  cp src/modules/gauge/services/auditService.js backups/auditService.js.backup
  echo "✅ Backup created: backups/auditService.js.backup"
  
  # Now move the file
  mv src/modules/gauge/services/auditService.js src/infrastructure/audit/auditService.js
  echo "✅ Moved auditService.js to infrastructure/audit/"
  
  # CRITICAL: Restart Docker containers
  echo "⚠️  IMPORTANT: Restarting backend container..."
  docker-compose restart backend
  echo "✅ Backend restarted. Wait 10 seconds for it to fully start..."
  sleep 10
  
  # Verify backend is running
  docker ps | grep backend-dev && echo "✅ Backend is running" || echo "❌ Backend failed to start!"
else
  echo "❌ ERROR: auditService.js not found at expected location!"
  echo "Check if it exists elsewhere:"
  find src -name "auditService.js" -type f
  exit 1
fi
```

### Step 3: Update Audit Service Imports

First, find ALL files that import auditService:
```bash
# Comprehensive scan for all auditService imports
echo "Scanning for all auditService imports..."
grep -r "require.*auditService" src/ tests/ --include="*.js" | grep -v node_modules
# Also check for ES6 imports
grep -r "import.*auditService" src/ tests/ --include="*.js" | grep -v node_modules
```

**Known files to update:**
1. `/backend/src/infrastructure/middleware/auditMiddleware.js`
   - FIND: `require('../../modules/gauge/services/auditService')`
   - REPLACE: `require('../audit/auditService')`

2. `/backend/src/infrastructure/middleware/errorHandler.js`
   - FIND: `const auditService = require('../../modules/gauge/services/auditService');`
   - REPLACE: `const auditService = require('../audit/auditService');`

3. `/backend/src/infrastructure/health/audit-health.js`
   - FIND: `require('../../modules/gauge/services/auditService')`
   - REPLACE: `require('../audit/auditService')`

4. `/backend/src/modules/gauge/services/gaugeCalibrationService.js`
   - FIND: `const auditService = require('./auditService');`
   - REPLACE: `const auditService = require('../../../infrastructure/audit/auditService');`

5. `/backend/src/modules/gauge/services/GaugeRejectionService.js`
   - FIND: `const auditService = require('./auditService');`
   - REPLACE: `const auditService = require('../../../infrastructure/audit/auditService');`

6. `/backend/src/modules/gauge/services/gaugeService.js`
   - FIND: `const auditService = require('./auditService');`
   - REPLACE: `const auditService = require('../../../infrastructure/audit/auditService');`

7. Check and update test files:
   ```bash
   # Find test files importing auditService
   grep -r "require.*auditService" tests/ --include="*.js"
   # Update paths in test files to use infrastructure path
   ```

### Step 4: Complete Table Whitelist
1. Create a script to get all tables:
   ```javascript
   // File: /backend/scripts/get-all-tables.js
   require('dotenv').config();

   // Verify environment variables
   if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS) {
     console.error('❌ Database environment variables not set!');
     console.error('Required: DB_HOST, DB_USER, DB_PASS, DB_NAME');
     console.error('Check your .env file in the backend directory');
     process.exit(1);
   }

   const { pool } = require('../src/infrastructure/database/connection');

   async function getAllTables() {
     let connection;
     try {
       // Test connection first
       connection = await pool.getConnection();
       console.log('✅ Database connection successful\n');
       
       const [tables] = await connection.execute(`
         SELECT TABLE_NAME 
         FROM information_schema.tables 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME
       `);
       
       console.log(`Found ${tables.length} tables in database.\n`);
       console.log('// Add these to ALLOWED_TABLES in BaseRepository:');
       console.log('static ALLOWED_TABLES = new Set([');
       tables.forEach(row => {
         console.log(`  '${row.TABLE_NAME}',`);
       });
       console.log(']);');
       
       // Also save to file for reference
       const fs = require('fs');
       const tableList = tables.map(row => row.TABLE_NAME).join('\n');
       fs.writeFileSync('scripts/all-tables.txt', tableList);
       console.log('\n✅ Table list also saved to scripts/all-tables.txt');
       
     } catch (error) {
       console.error('❌ Error:', error.message);
       if (error.code === 'ECONNREFUSED') {
         console.error('Cannot connect to database. Check if MySQL is running on port 3307');
       }
       process.exit(1);
     } finally {
       if (connection) connection.release();
       await pool.end(); // Close pool for script
     }
   }

   getAllTables();
   ```

2. Run the script:
   ```bash
   node scripts/get-all-tables.js
   ```

3. Update the ALLOWED_TABLES in secure BaseRepository with the output

### Step 5: Verify Prerequisites
Create verification script:
```javascript
// File: /backend/scripts/verify-prerequisites.js
const fs = require('fs');
const path = require('path');

const requiredDirs = [
  'src/infrastructure/repositories',
  'src/infrastructure/services',
  'src/infrastructure/routes',
  'src/infrastructure/audit',
  'tests/integration/infrastructure/repositories',
  'tests/integration/infrastructure/services',
  'tests/security'
];

console.log('Checking prerequisites...\n');

// Check directories
let dirsOk = true;
requiredDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${dir}`);
  } else {
    console.log(`❌ ${dir} - MISSING`);
    dirsOk = false;
  }
});

// Check audit service moved
const auditPath = path.join(__dirname, '../src/infrastructure/audit/auditService.js');
if (fs.existsSync(auditPath)) {
  console.log('\n✅ Audit service moved to infrastructure');
} else {
  console.log('\n❌ Audit service NOT moved to infrastructure');
  dirsOk = false;
}

// Check for circular dependencies
console.log('\nChecking for circular dependencies...');
const files = [
  'src/infrastructure/middleware/auditMiddleware.js',
  'src/infrastructure/middleware/errorHandler.js',
  'src/infrastructure/health/audit-health.js'
];

let depsOk = true;
files.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('modules/gauge/services/auditService')) {
      console.log(`❌ ${file} - Still has circular dependency`);
      depsOk = false;
    } else {
      console.log(`✅ ${file} - No circular dependency`);
    }
  }
});

// Check database connection pool
console.log('\nChecking database connection pool...');
const { pool } = require('../src/infrastructure/database/connection');

// Check pool status
if (pool && pool.pool) {
  console.log('Connection pool status:', {
    total: pool.pool.config.connectionLimit,
    active: pool.pool._allConnections.length,
    free: pool.pool._freeConnections.length,
    queued: pool.pool._connectionQueue.length
  });
  
  // Warn if pool is under pressure
  if (pool.pool._freeConnections.length < 2) {
    console.log('⚠️  Warning: Connection pool has few free connections');
  }
} else {
  console.log('⚠️  Could not check pool status');
}

if (dirsOk && depsOk) {
  console.log('\n✅ All prerequisites met! Ready to proceed with implementation.');
} else {
  console.log('\n❌ Prerequisites not met. Fix issues above before proceeding.');
  process.exit(1);
}
```

Run verification:
```bash
node scripts/verify-prerequisites.js
```

## Phase 1: Implement Secure BaseRepository

### Step 1: Create BaseRepository
1. CREATE: `/backend/src/infrastructure/repositories/BaseRepository.js`
2. Copy ENTIRE content from `/erp-core-docs/backend-rebuild/Plans/secure-base-repository.md` (lines 44-522)
3. Update ALLOWED_TABLES with output from get-all-tables.js script

### Step 2: Create BaseRepository Tests
CREATE: `/backend/tests/security/BaseRepository.security.test.js`
```javascript
const BaseRepository = require('../../src/infrastructure/repositories/BaseRepository');
const { pool } = require('../../src/infrastructure/database/connection');

describe('BaseRepository Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    test('should reject non-whitelisted tables', () => {
      expect(() => new BaseRepository('evil_table'))
        .toThrow('Table \'evil_table\' is not in the allowed list');
    });

    test('should reject SQL injection in table names', () => {
      expect(() => new BaseRepository('users; DROP TABLE users;--'))
        .toThrow('Table \'users; DROP TABLE users;--\' is not in the allowed list');
    });

    test('should reject SQL injection in identifiers', () => {
      const repo = new BaseRepository('core_users');
      expect(() => repo.validateIdentifier('id; DROP TABLE users'))
        .toThrow('Invalid identifier');
    });

    test('should reject SQL keywords as identifiers', () => {
      const repo = new BaseRepository('core_users');
      expect(() => repo.validateIdentifier('SELECT'))
        .toThrow('Identifier cannot be SQL keyword');
    });

    test('should prevent column name injection', () => {
      const repo = new BaseRepository('core_users');
      expect(() => repo.validateColumns(['id', 'name); DROP TABLE users;--']))
        .toThrow('Invalid identifier');
    });
  });

  describe('Connection Pool Security', () => {
    test('should timeout if pool exhausted', async () => {
      // This test requires careful setup to not break other tests
      const connections = [];
      try {
        // Get pool size from config
        const poolSize = pool.pool.config.connectionLimit || 10;
        
        // Exhaust pool
        for (let i = 0; i < poolSize; i++) {
          connections.push(await pool.getConnection());
        }
        
        // Try to get another connection - should timeout
        const repo = new BaseRepository('core_users');
        await expect(repo.getConnectionWithTimeout(1000))
          .rejects.toThrow('Connection pool timeout');
          
      } finally {
        // Always cleanup
        connections.forEach(conn => conn.release());
      }
    });
  });

  describe('Query Validation', () => {
    test('should reject dangerous operations in executeQuery', async () => {
      const repo = new BaseRepository('core_users');
      
      await expect(repo.executeQuery('DROP TABLE users'))
        .rejects.toThrow('Query contains prohibited operation');
        
      await expect(repo.executeQuery('ALTER TABLE users ADD COLUMN evil TEXT'))
        .rejects.toThrow('Query contains prohibited operation');
        
      await expect(repo.executeQuery('TRUNCATE users'))
        .rejects.toThrow('Query contains prohibited operation');
    });
  });
});
```

Run tests:
```bash
npm test -- tests/security/BaseRepository.security.test.js
```

### Step 3: Create Integration Tests
CREATE: `/backend/tests/integration/infrastructure/repositories/BaseRepository.test.js`
```javascript
const BaseRepository = require('../../../../src/infrastructure/repositories/BaseRepository');
const { pool } = require('../../../../src/infrastructure/database/connection');

describe('BaseRepository Integration Tests', () => {
  let testRepo;
  let connection;
  
  beforeAll(async () => {
    // Use a safe test table
    testRepo = new BaseRepository('core_users', 'user_id');
  });
  
  beforeEach(async () => {
    connection = await pool.getConnection();
    await connection.beginTransaction();
  });
  
  afterEach(async () => {
    await connection.rollback();
    connection.release();
  });
  
  describe('Schema Detection', () => {
    test('should load table schema correctly', async () => {
      await testRepo.loadTableSchema(connection);
      
      expect(testRepo.tableSchema).toBeDefined();
      expect(testRepo.tableSchema.columns).toBeDefined();
      expect(Object.keys(testRepo.tableSchema.columns).length).toBeGreaterThan(0);
    });
    
    test('should detect soft delete support', async () => {
      await testRepo.loadTableSchema(connection);
      
      // core_users should have is_deleted
      expect(testRepo.tableSchema.hasIsDeleted).toBe(true);
    });
  });
  
  describe('CRUD Operations', () => {
    test('should handle findById with connection reuse', async () => {
      const result = await testRepo.findById(1, connection);
      // Result may be null if no user with ID 1
      expect(result === null || typeof result === 'object').toBe(true);
    });
    
    test('should filter out invalid columns in create', async () => {
      const data = {
        username: 'test_user',
        email: 'test@example.com',
        invalid_column: 'should be ignored',
        password_hash: 'hash'
      };
      
      // This should not throw even with invalid column
      // Note: Will fail if username already exists due to unique constraint
      try {
        await testRepo.create(data, connection);
      } catch (error) {
        // Expected if username exists
        expect(error.message).toMatch(/Duplicate entry|ER_DUP_ENTRY/);
      }
    });
  });
  
  describe('Transaction Support', () => {
    test('should not commit when connection provided', async () => {
      // When connection is provided, caller manages transaction
      const data = { username: 'tx_test', email: 'tx@test.com' };
      
      try {
        await testRepo.create(data, connection);
        // Don't commit - let it rollback in afterEach
      } catch (error) {
        // Ignore duplicate errors
      }
      
      // Verify not committed by checking in new connection
      const checkConn = await pool.getConnection();
      const [rows] = await checkConn.execute(
        'SELECT * FROM core_users WHERE username = ?',
        ['tx_test']
      );
      checkConn.release();
      
      expect(rows.length).toBe(0); // Should not exist
    });
  });
});
```

Run integration tests:
```bash
npm test -- tests/integration/infrastructure/repositories/BaseRepository.test.js
```

## Phase 2: Create BaseService

### Step 1: Create BaseService with Proper DI
CREATE: `/backend/src/infrastructure/services/BaseService.js`
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
      
      // Only audit if service is provided and audit data exists
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
      logger.error(`Transaction failed in ${this.constructor.name}:`, {
        error: error.message,
        stack: error.stack,
        auditData: auditData ? { action: auditData.action } : null
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  async withConnection(operation) {
    const connection = await pool.getConnection();
    try {
      return await operation(connection);
    } finally {
      connection.release();
    }
  }
}

module.exports = BaseService;
```

### Step 2: Create BaseService Tests
CREATE: `/backend/tests/integration/infrastructure/services/BaseService.test.js`
```javascript
const BaseService = require('../../../../src/infrastructure/services/BaseService');
const BaseRepository = require('../../../../src/infrastructure/repositories/BaseRepository');

describe('BaseService Integration Tests', () => {
  let mockRepo;
  let service;
  let mockAuditService;
  
  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn()
    };
    
    mockAuditService = {
      logAction: jest.fn()
    };
    
    service = new BaseService(mockRepo, { auditService: mockAuditService });
  });
  
  describe('Transaction Management', () => {
    test('should commit on success', async () => {
      mockRepo.create.mockResolvedValue({ id: 1, name: 'test' });
      
      const result = await service.executeInTransaction(async (conn) => {
        return await mockRepo.create({ name: 'test' }, conn);
      });
      
      expect(result).toEqual({ id: 1, name: 'test' });
      expect(mockRepo.create).toHaveBeenCalled();
    });
    
    test('should rollback on error', async () => {
      mockRepo.create.mockRejectedValue(new Error('DB Error'));
      
      await expect(
        service.executeInTransaction(async (conn) => {
          return await mockRepo.create({ name: 'test' }, conn);
        })
      ).rejects.toThrow('DB Error');
    });
    
    test('should log audit when provided', async () => {
      mockRepo.update.mockResolvedValue({ id: 1, status: 'active' });
      
      await service.executeInTransaction(
        async (conn) => {
          return await mockRepo.update(1, { status: 'active' }, conn);
        },
        {
          action: 'UPDATE_STATUS',
          userId: 123,
          details: { gaugeId: 1 }
        }
      );
      
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_STATUS',
          userId: 123
        }),
        expect.any(Object) // connection
      );
    });
  });
});
```

Run tests:
```bash
npm test -- tests/integration/infrastructure/services/BaseService.test.js
```

## Emergency Rollback Procedure

If you encounter issues during implementation:

### Quick Rollback (if not committed):
```bash
# Save any work you want to keep
git stash push -m "Saving backend implementation work"

# Revert all changes
git checkout -- .

# Restore audit service if moved
if [ -f "backups/auditService.js.backup" ]; then
  mv src/infrastructure/audit/auditService.js src/modules/gauge/services/auditService.js
  echo "✅ Restored auditService.js to original location"
fi

# Restart containers to clear any cached imports
docker-compose restart backend
```

### Rollback After Commit:
```bash
# Find the commit before changes
git log --oneline -10

# Reset to previous commit (replace COMMIT_HASH with actual hash)
git reset --hard COMMIT_HASH

# Restore audit service from backup if needed
if [ -f "backups/auditService.js.backup" ]; then
  cp backups/auditService.js.backup src/modules/gauge/services/auditService.js
fi

# Force restart containers
docker-compose down
docker-compose up -d
```

### If Backend Won't Start:
```bash
# Check logs
docker logs fireproof-erp-modular-backend-dev --tail 100

# Common issues:
# 1. Missing audit service - restore from backup
# 2. Import errors - check all updated imports
# 3. Database connection - verify .env settings

# Emergency recovery
cp backups/auditService.js.backup src/modules/gauge/services/auditService.js
docker-compose restart backend
```

## Common Gotchas to Avoid

### 1. Connection Pool Management
**DON'T** create new pools in repositories - always use the existing pool from `infrastructure/database/connection`.

### 2. Transaction Handling
**ALWAYS** check if a connection was passed in:
```javascript
const connection = conn || await pool.getConnection();
const shouldRelease = !conn; // Only release if we created it
```

### 3. Error Logging
**NEVER** log actual SQL values (security risk). Only log structure:
```javascript
// BAD: logger.error('Query failed', { values: [userId, password] });
// GOOD: logger.error('Query failed', { query: 'UPDATE users...', error: err.message });
```

### 4. Testing Scenarios
**TEST** with both empty and full databases - behavior can differ significantly.

### 5. Import Updates
**UPDATE** ALL imports when moving files. One missed import = broken system.

## Quick Smoke Tests

After each major step, verify the system still works:

```bash
# Test basic health
curl http://localhost:8000/api/health

# Test audit endpoints (after moving auditService)
curl http://localhost:8000/api/audit/recent

# Test database connection
curl http://localhost:8000/api/health/db

# If you have test data, test a real endpoint
curl http://localhost:8000/api/gauges/v2 -H "Authorization: Bearer YOUR_TOKEN"
```

## Validation Commands

After completing Phase 0 and Phase 1:

```bash
# Verify no circular dependencies remain
grep -r "modules/gauge/services/auditService" src/infrastructure/

# Verify all directories exist
ls -la src/infrastructure/repositories/
ls -la src/infrastructure/audit/

# Run all security tests
npm test -- tests/security/

# Run all infrastructure tests
npm test -- tests/integration/infrastructure/

# Check that BaseRepository is secure
grep -n "INSERT INTO.*\${" src/infrastructure/repositories/BaseRepository.js
# Should return NOTHING

# Verify audit service is accessible
node -e "require('./src/infrastructure/audit/auditService'); console.log('✅ Audit service loads correctly');"
```

## Next Steps

Only after ALL above steps are complete and tests pass:

1. Implement AuthRepository extending BaseRepository
2. Create comprehensive tests for AuthRepository
3. Update AuthService to use AuthRepository
4. Continue with remaining phases

## Critical Reminders

1. **DO NOT SKIP** the prerequisite verification
2. **DO NOT PROCEED** if any tests fail
3. **DO NOT USE** the original BaseRepository with SQL injection
4. **ALWAYS RUN** security tests after each repository creation
5. **ALWAYS UPDATE** imports when moving files
6. **ALWAYS RESTART** Docker containers after moving files that are imported by running services
7. **ALWAYS BACKUP** critical files before moving them
8. **ALWAYS VERIFY** environment variables are set before running database scripts