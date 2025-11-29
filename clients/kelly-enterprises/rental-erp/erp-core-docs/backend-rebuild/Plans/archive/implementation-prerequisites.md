# Backend Implementation Prerequisites

## Overview
This document outlines all prerequisites that must be completed BEFORE starting the backend gold standard implementation. These steps ensure a smooth implementation without critical failures.

## Phase 0: Critical Prerequisites

### 1. Directory Structure Creation

Create all required directories before implementation:

```bash
# From backend directory
mkdir -p src/infrastructure/repositories
mkdir -p src/infrastructure/services  
mkdir -p src/infrastructure/routes
mkdir -p tests/integration/modules/auth/repositories
mkdir -p tests/integration/modules/auth/services
mkdir -p tests/integration/modules/user/repositories
mkdir -p tests/integration/modules/user/services
mkdir -p tests/integration/modules/admin/repositories
mkdir -p tests/integration/modules/admin/services
mkdir -p tests/integration/modules/gauge/repositories
mkdir -p tests/integration/modules/gauge/services
```

### 2. Database Schema Verification

#### 2.1 Verify Table Structure
```sql
-- Check which tables have soft delete support
SELECT DISTINCT table_name 
FROM information_schema.columns 
WHERE column_name = 'is_deleted' 
AND table_schema = 'fai_db_sandbox'
ORDER BY table_name;

-- Check which tables have updated_at
SELECT DISTINCT table_name 
FROM information_schema.columns 
WHERE column_name = 'updated_at' 
AND table_schema = 'fai_db_sandbox'
ORDER BY table_name;

-- Check which tables have created_at
SELECT DISTINCT table_name 
FROM information_schema.columns 
WHERE column_name = 'created_at' 
AND table_schema = 'fai_db_sandbox'
ORDER BY table_name;
```

#### 2.2 Document Table Schemas
Create a schema documentation file listing:
- Which tables support soft delete
- Which tables have timestamp columns
- Primary key names for each table
- Any tables with non-standard structures

### 3. Update Table Whitelist

Edit the secure BaseRepository to include all production tables:

```javascript
// In secure-base-repository.md, update ALLOWED_TABLES to include:
static ALLOWED_TABLES = new Set([
  // Get complete list by running:
  // SELECT table_name FROM information_schema.tables 
  // WHERE table_schema = 'fai_db_sandbox'
  // ORDER BY table_name;
]);
```

### 4. Resolve Circular Dependencies

#### Option A: Move Audit Service to Infrastructure
```bash
# Move audit service to prevent circular dependency
mkdir -p src/infrastructure/audit
mv src/modules/gauge/services/auditService.js src/infrastructure/audit/
# Update all imports accordingly
```

#### Option B: Use Dependency Injection
```javascript
// In BaseService, make audit optional
class BaseService {
  constructor(repository, auditService = null) {
    this.repository = repository;
    this.auditService = auditService;
  }
  
  async executeInTransaction(operation, auditData = null) {
    // Only audit if service is provided
    if (auditData && this.auditService) {
      await this.auditService.logAction(auditData, connection);
    }
  }
}
```

### 5. Install Missing Dependencies

Verify all required packages are installed:

```bash
# Check if express-validator is installed
npm list express-validator

# If not installed:
npm install express-validator

# Verify other critical dependencies
npm list mysql2
npm list jsonwebtoken
npm list bcrypt
```

### 6. Create Test Database Setup

#### 6.1 Test Database Configuration
Ensure test database matches production schema:

```javascript
// Create test-db-setup.js
const { pool } = require('./src/infrastructure/database/connection');

async function verifyTestDatabase() {
  try {
    // Test connection
    const connection = await pool.getConnection();
    console.log('✓ Database connection successful');
    
    // Verify critical tables exist
    const [tables] = await connection.execute(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = DATABASE()`
    );
    
    console.log(`✓ Found ${tables.length} tables`);
    connection.release();
    
  } catch (error) {
    console.error('✗ Database verification failed:', error.message);
    process.exit(1);
  }
}

verifyTestDatabase();
```

### 7. Create Security Test Suite

Create foundation security tests before implementation:

```javascript
// tests/security/sql-injection.test.js
describe('SQL Injection Prevention', () => {
  // Test malicious table names
  // Test malicious column names
  // Test malicious values
  // Test command injection attempts
});

// tests/security/connection-management.test.js  
describe('Connection Pool Security', () => {
  // Test connection exhaustion
  // Test timeout handling
  // Test concurrent access
});
```

### 8. Backup Current State

Before making changes:

```bash
# Create backup branch
git checkout -b backup/pre-gold-standard-implementation
git add .
git commit -m "Backup: State before gold standard implementation"
git push origin backup/pre-gold-standard-implementation

# Return to working branch
git checkout development-core
```

### 9. Create Implementation Tracking

Create a tracking document:

```markdown
# Implementation Progress Tracker

## Phase 1: Repository Layer
- [ ] BaseRepository created and tested
- [ ] AuthRepository created and tested
- [ ] UserRepository created and tested
- [ ] AdminRepository created and tested
- [ ] All security tests passing

## Phase 2: Service Layer
- [ ] BaseService created and tested
- [ ] AuthService refactored and tested
- [ ] UserService refactored and tested
- [ ] AdminService refactored and tested
- [ ] Cross-module dependencies resolved

[etc...]
```

### 10. Verify Development Environment

```bash
# Ensure Docker containers are running
docker ps

# Check backend logs for any errors
docker logs fireproof-erp-modular-backend-dev --tail 50

# Verify you can run tests
npm test -- --version

# Check current directory
pwd
# Should output: /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/backend
```

## Implementation Order (Revised)

After completing prerequisites:

1. **Implement Secure BaseRepository** (use secure-base-repository.md)
2. **Create Comprehensive Tests** for BaseRepository
3. **Implement BaseService** with proper dependency injection  
4. **Create Auth Module** (repository → service → routes)
5. **Verify Auth Module** completely before proceeding
6. **Implement Remaining Modules** one at a time
7. **Update Service Registry** after all services exist
8. **Run Full Test Suite**
9. **Performance Testing**
10. **Documentation Update**

## Validation Checklist

Before starting implementation, verify:

- [ ] All directories created
- [ ] Database schema documented
- [ ] Table whitelist updated
- [ ] Circular dependencies resolved
- [ ] Dependencies installed
- [ ] Test database verified
- [ ] Security tests created
- [ ] Current state backed up
- [ ] Tracking document created
- [ ] Development environment verified

## Critical Reminders

1. **DO NOT** start implementation until ALL prerequisites are complete
2. **DO NOT** use the original BaseRepository with SQL injection vulnerability
3. **DO NOT** assume all tables have the same structure
4. **ALWAYS** test each component before moving to the next
5. **ALWAYS** verify no regression after each phase

## Next Steps

1. Complete all prerequisites in this document
2. Use `secure-base-repository.md` for BaseRepository implementation
3. Follow the revised implementation order
4. Track progress meticulously
5. Test continuously