# Backend Module Development Guide v1.1

<claude-instructions>
## How to Think About Module Development

When implementing a new module using this guide:
- Use `--persona-backend` for repository and service implementation
- Use `--persona-architect` when designing module structure
- Use `--validate` to ensure security compliance
- Use `--seq` for systematic implementation

Remember: This guide enforces secure patterns. Never deviate from these patterns.
</claude-instructions>

## Overview
This guide explains how to add new modules to the backend following the established gold standard patterns. These patterns ensure security, maintainability, and consistency across the codebase.

### Example Module Names
- **inventory**: For inventory management (`InventoryRepository`, `inventoryService`)
- **reports**: For reporting system (`ReportsRepository`, `reportsService`)
- **notifications**: For notification system (`NotificationsRepository`, `notificationsService`)

### Naming Conventions
- **Folders/Routes**: lowercase (e.g., `inventory`, `reports`)
- **Class Names**: PascalCase (e.g., `InventoryRepository`, `InventoryService`)
- **Instance/File Names**: camelCase (e.g., `inventoryService.js`, `inventoryRoutes.js`)
- **Database Tables**: snake_case (e.g., `inventory_items`, `user_reports`)

## Core Principles

### Repository Pattern
- **ALL** database queries must be in repository classes
- **NO** SQL in routes or services
- Repositories extend `BaseRepository` for security and consistency

### Service Layer Pattern
- Services contain business logic
- Services use repositories for data access
- Services extend `BaseService` for transaction support

### Security First
- Table names are whitelisted in `BaseRepository`
- All identifiers are validated
- Parameterized queries only (no string interpolation)

---

## Step-by-Step Guide to Add a New Module

### 1. Create Module Structure

```bash
# From backend directory
# Replace [modulename] with your module name in lowercase (e.g., inventory, reports)
mkdir -p src/modules/[modulename]/repositories
mkdir -p src/modules/[modulename]/services
mkdir -p src/modules/[modulename]/routes
mkdir -p tests/integration/modules/[modulename]/repositories
mkdir -p tests/integration/modules/[modulename]/services
```

**Example for inventory module:**
```bash
mkdir -p src/modules/inventory/repositories
mkdir -p src/modules/inventory/services
mkdir -p src/modules/inventory/routes
mkdir -p tests/integration/modules/inventory/repositories
mkdir -p tests/integration/modules/inventory/services
```

### 2. Create Repository

Create `/backend/src/modules/[modulename]/repositories/[ModuleName]Repository.js`:

```javascript
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');

class [ModuleName]Repository extends BaseRepository {
  constructor() {
    // Specify your table name and primary key
    super('[table_name]', '[primary_key_column]');
  }

  // Add module-specific queries as methods
  async findByStatus(status, conn) {
    // Note: ${this.tableName} is safe here because BaseRepository validates it
    const query = `
      SELECT * FROM \`${this.tableName}\` 
      WHERE status = ? AND is_deleted = 0
    `;
    return this.executeQuery(query, [status], conn);
  }

  // Complex queries with joins
  async findWithRelations(id, conn) {
    const query = `
      SELECT m.*, r.name as related_name
      FROM \`${this.tableName}\` m
      LEFT JOIN related_table r ON m.related_id = r.id
      WHERE m.${this.primaryKey} = ? AND m.is_deleted = 0
    `;
    const results = await this.executeQuery(query, [id], conn);
    return results[0] || null;
  }
}

module.exports = [ModuleName]Repository;
```

**Example for InventoryRepository:**
```javascript
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');

class InventoryRepository extends BaseRepository {
  constructor() {
    super('inventory_items', 'item_id');
  }

  async findByCategory(category, conn) {
    const query = `
      SELECT * FROM \`${this.tableName}\` 
      WHERE category = ? AND is_deleted = 0
      ORDER BY item_name
    `;
    return this.executeQuery(query, [category], conn);
  }

  async findLowStock(threshold = 10, conn) {
    const query = `
      SELECT * FROM \`${this.tableName}\` 
      WHERE quantity <= ? AND is_deleted = 0
      ORDER BY quantity ASC
    `;
    return this.executeQuery(query, [threshold], conn);
  }
}

module.exports = InventoryRepository;
```

### 3. Create Service

Create `/backend/src/modules/[modulename]/services/[moduleName]Service.js`:

```javascript
const BaseService = require('../../../infrastructure/services/BaseService');
const [ModuleName]Repository = require('../repositories/[ModuleName]Repository');

class [ModuleName]Service extends BaseService {
  constructor() {
    const repository = new [ModuleName]Repository();
    const auditService = require('../../../infrastructure/audit/auditService');
    super(repository, { auditService });
  }

  // Simple operations can use repository directly
  async getById(id) {
    return this.repository.findById(id);
  }

  // Complex operations use transactions
  async createWithAudit(data, userId) {
    return this.executeInTransaction(async (conn) => {
      // Create the record
      const result = await this.repository.create(data, conn);
      
      // Additional operations in same transaction
      // await this.otherRepository.update(..., conn);
      
      return result;
    }, {
      action: 'CREATE_[MODULE]', // e.g., 'CREATE_INVENTORY_ITEM'
      userId,
      details: { data }
    });
  }

  // Business logic goes in services
  async processComplexOperation(id, updates) {
    const record = await this.repository.findById(id);
    
    // Business rules
    if (record.status === 'locked') {
      throw new Error('Cannot update locked record');
    }
    
    // Calculate derived fields
    updates.processed_at = new Date();
    updates.processed_by = 'system';
    
    return this.executeInTransaction(async (conn) => {
      return await this.repository.update(id, updates, conn);
    });
  }
}

// Export as singleton instance
module.exports = new [ModuleName]Service();
```

**Important Service Pattern Notes:**
1. Services are exported as **singleton instances** (note the `new` keyword)
2. This ensures one service instance is shared across the application
3. The ServiceRegistry will use this same instance, not create a new one

### 4. Create Routes

Create `/backend/src/modules/[modulename]/routes/[modulename].routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../infrastructure/middleware/authMiddleware');
const { body, param, validationResult } = require('express-validator');
const [moduleName]Service = require('../services/[moduleName]Service');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET single record
router.get('/:id',
  authenticateToken,
  param('id').isInt().withMessage('ID must be an integer'),
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await [moduleName]Service.getById(req.params.id);
      if (!result) {
        return res.status(404).json({ message: '[ModuleName] not found' });
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST create new record
router.post('/',
  authenticateToken,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('status').isIn(['active', 'inactive']).withMessage('Invalid status')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await [moduleName]Service.createWithAudit(
        req.body,
        req.user.userId
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PUT update record
router.put('/:id',
  authenticateToken,
  param('id').isInt(),
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await [moduleName]Service.processComplexOperation(
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
```

### 5. Register Routes

Add to `/backend/src/app.js` or main route file:

```javascript
// Import the routes
const [moduleName]Routes = require('./modules/[modulename]/routes/[modulename].routes');

// Register the routes
app.use('/api/[modulename]', [moduleName]Routes);
```

### 6. Register Service

Add to `/backend/src/bootstrap/registerServices.js`:

```javascript
const serviceRegistry = require('../infrastructure/services/ServiceRegistry');
const [moduleName]Service = require('../modules/[modulename]/services/[moduleName]Service');

// In the registerServices function
// Note: We're registering the already-instantiated service singleton
serviceRegistry.register('[ModuleName]Service', [moduleName]Service);
```

**Example for inventory:**
```javascript
const inventoryService = require('../modules/inventory/services/inventoryService');

// In registerServices function
serviceRegistry.register('InventoryService', inventoryService);
```

### 7. Update Database Whitelist

If using a new table, add it to `BaseRepository` whitelist:

```javascript
// In /backend/src/infrastructure/repositories/BaseRepository.js
static ALLOWED_TABLES = new Set([
  // ... existing tables ...
  '[new_table_name]',
]);
```

### 8. Create Tests

#### Repository Test
Create `/backend/tests/integration/modules/[modulename]/repositories/[ModuleName]Repository.test.js`:

```javascript
const [ModuleName]Repository = require('../../../../../src/modules/[modulename]/repositories/[ModuleName]Repository');
const { pool } = require('../../../../../src/infrastructure/database/connection');

describe('[ModuleName]Repository', () => {
  let repo;
  let connection;

  beforeAll(() => {
    repo = new [ModuleName]Repository();
  });

  beforeEach(async () => {
    connection = await pool.getConnection();
    await connection.beginTransaction();
  });

  afterEach(async () => {
    await connection.rollback();
    connection.release();
  });

  test('should create a new record', async () => {
    const data = { name: 'Test', status: 'active' };
    const result = await repo.create(data, connection);
    
    expect(result).toHaveProperty('id');
    expect(result.name).toBe('Test');
  });

  test('should find by status', async () => {
    const results = await repo.findByStatus('active', connection);
    expect(Array.isArray(results)).toBe(true);
  });
});
```

#### Service Test
Create `/backend/tests/integration/modules/[modulename]/services/[ModuleName]Service.test.js`:

```javascript
const [ModuleName]Service = require('../../../../../src/modules/[modulename]/services/[moduleName]Service');

describe('[ModuleName]Service', () => {
  test('should enforce business rules', async () => {
    // Mock the repository
    const mockRecord = { id: 1, status: 'locked' };
    jest.spyOn([ModuleName]Service.repository, 'findById')
      .mockResolvedValue(mockRecord);

    // Test business rule
    await expect(
      [ModuleName]Service.processComplexOperation(1, { name: 'New' })
    ).rejects.toThrow('Cannot update locked record');
  });
});
```

#### Security Test (REQUIRED)
Create `/backend/tests/security/[modulename]/[ModuleName]Repository.security.test.js`:

```javascript
const [ModuleName]Repository = require('../../../src/modules/[modulename]/repositories/[ModuleName]Repository');

describe('[ModuleName]Repository Security', () => {
  let repo;
  
  beforeAll(() => {
    repo = new [ModuleName]Repository();
  });
  
  test('should prevent SQL injection in pagination', async () => {
    const maliciousLimit = "10; DROP TABLE users; --";
    const maliciousOffset = "0 UNION SELECT * FROM passwords";
    
    // If using findPaginated, it should sanitize inputs
    if (typeof repo.findPaginated === 'function') {
      const result = await repo.findPaginated({}, 1, maliciousLimit);
      // Should not throw and should use safe defaults
      expect(Array.isArray(result)).toBe(true);
    }
  });
  
  test('should use parameterized queries for custom methods', () => {
    // Check that no methods use template literals for values
    const methodNames = Object.getOwnPropertyNames(repo.constructor.prototype);
    
    methodNames.forEach(method => {
      if (typeof repo[method] === 'function' && method !== 'constructor') {
        const methodString = repo[method].toString();
        
        // Check for dangerous patterns
        expect(methodString).not.toMatch(/LIMIT\s*\$\{/i);
        expect(methodString).not.toMatch(/OFFSET\s*\$\{/i);
        expect(methodString).not.toMatch(/WHERE.*\$\{/i);
      }
    });
  });
});
```

---

## Checklist for New Modules

- [ ] Create directory structure
- [ ] Create repository extending BaseRepository
- [ ] Create service extending BaseService
- [ ] Create routes with validation
- [ ] Register routes in app
- [ ] Register service in ServiceRegistry
- [ ] Add table to BaseRepository whitelist
- [ ] Create repository tests
- [ ] Create service tests
- [ ] Create security tests (REQUIRED)
- [ ] Verify no SQL in routes: `grep -r "pool.execute" src/modules/[modulename]/routes/`
- [ ] Verify no SQL in services: `grep -r "pool.execute" src/modules/[modulename]/services/`
- [ ] Verify no template literal SQL injection: `grep -r "LIMIT.*\${" src/modules/[modulename]/`
- [ ] Check test coverage: `npm test -- --coverage src/modules/[modulename]/`
- [ ] Ensure coverage > 80%: Review coverage/lcov-report/index.html
- [ ] Run all tests: `npm test -- tests/integration/modules/[modulename]/`

---

## Common Patterns

### Transaction with Multiple Operations
```javascript
async complexOperation(data) {
  return this.executeInTransaction(async (conn) => {
    // All operations use the same connection
    const record = await this.repository.create(data, conn);
    await this.relatedRepository.update(record.id, updates, conn);
    await this.auditService.logAction(auditData, conn);
    
    return record;
  });
}
```

### Cross-Module Communication
```javascript
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

class MyService extends BaseService {
  async needsOtherService(id) {
    const otherService = serviceRegistry.get('OtherService');
    const otherData = await otherService.getData(id);
    
    // Use the data
  }
}
```

### Pagination Pattern

**🚨 CRITICAL SECURITY WARNING**: Always use parameterized queries for LIMIT/OFFSET!

```javascript
async findPaginated(page = 1, limit = 10, filters = {}, conn) {
  // SECURITY: Validate and sanitize pagination inputs
  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 10), 100); // Max 100 records
  const safePage = Math.max(1, parseInt(page) || 1);
  const offset = (safePage - 1) * safeLimit;
  
  let whereClause = 'WHERE is_deleted = 0';
  const params = [];
  
  if (filters.status) {
    whereClause += ' AND status = ?';
    params.push(filters.status);
  }
  
  const countQuery = `SELECT COUNT(*) as total FROM \`${this.tableName}\` ${whereClause}`;
  const dataQuery = `
    SELECT * FROM \`${this.tableName}\` 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  // CRITICAL: LIMIT and OFFSET must be parameterized
  const [countResult] = await this.executeQuery(countQuery, params, conn);
  const data = await this.executeQuery(dataQuery, [...params, safeLimit, offset], conn);
  
  return {
    data,
    total: countResult.total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(countResult.total / safeLimit)
  };
}
```

**❌ NEVER DO THIS (SQL Injection Vulnerability):**
```javascript
// VULNERABLE - DO NOT USE
const query = `SELECT * FROM table LIMIT ${limit} OFFSET ${offset}`;
```

**✅ ALWAYS DO THIS (Secure):**
```javascript
// SECURE - Use parameterized queries
const query = `SELECT * FROM table LIMIT ? OFFSET ?`;
const results = await this.executeQuery(query, [limit, offset], conn);
```

---

## Security Reminders

### Critical SQL Injection Prevention Rules

1. **NEVER** put SQL queries in routes or services - only in repositories
2. **ALWAYS** use parameterized queries (? placeholders) for ALL values including:
   - WHERE clause values
   - LIMIT and OFFSET values (⚠️ CRITICAL)
   - ORDER BY values (use whitelisted column names)
3. **NEVER** use string interpolation or template literals for values:
   ```javascript
   // ❌ VULNERABLE - NEVER DO THIS
   const query = `SELECT * FROM users LIMIT ${limit} OFFSET ${offset}`;
   
   // ✅ SECURE - ALWAYS DO THIS
   const query = `SELECT * FROM users LIMIT ? OFFSET ?`;
   await executeQuery(query, [limit, offset]);
   ```
4. **ALWAYS** validate and sanitize input:
   - Parse integers: `parseInt(value)`
   - Set maximum limits: `Math.min(limit, 100)`
   - Validate ranges: `Math.max(1, page)`
5. **ALWAYS** use transactions for multi-step operations
6. **NEVER** create new database connection pools
7. **ALWAYS** validate ORDER BY columns against a whitelist:
   ```javascript
   const ALLOWED_ORDER_COLUMNS = ['created_at', 'name', 'status'];
   if (!ALLOWED_ORDER_COLUMNS.includes(orderBy)) {
     orderBy = 'created_at'; // Default safe value
   }
   ```

### Additional Security Patterns

8. **ALWAYS** validate JSON input structure:
   ```javascript
   // In routes, validate nested objects
   body('address.street').isString().trim(),
   body('address.zipCode').matches(/^\d{5}(-\d{4})?$/)
   ```

9. **NEVER** expose internal error details:
   ```javascript
   // ❌ BAD - Exposes internal details
   catch (error) {
     res.status(500).json({ error: error.stack });
   }
   
   // ✅ GOOD - Safe error handling
   catch (error) {
     logger.error('Operation failed:', error);
     res.status(500).json({ 
       error: 'Internal server error',
       requestId: req.id 
     });
   }
   ```

10. **ALWAYS** use prepared statements for IN clauses:
    ```javascript
    // ✅ SECURE - Dynamic IN clause
    const placeholders = ids.map(() => '?').join(',');
    const query = `SELECT * FROM users WHERE id IN (${placeholders})`;
    await executeQuery(query, ids);
    ```

### MySQL2 Clarification
**IMPORTANT**: MySQL2 DOES support parameterized queries for LIMIT/OFFSET. Any comment saying otherwise is incorrect and dangerous. Always use parameterized queries.

---

## Troubleshooting

### Common Issues When Creating Modules

#### "Table not in allowed list" Error
Add your table to the `ALLOWED_TABLES` Set in BaseRepository:
```javascript
static ALLOWED_TABLES = new Set([
  'core_users',
  'gauges',
  'inventory_items',  // Add your new table here
  // ... other tables
]);
```

#### Service Not Found in Registry
Ensure you:
1. Export service as singleton: `module.exports = new MyService();`
2. Import the instance in registerServices.js
3. Register with correct name: `serviceRegistry.register('MyService', myService);`

#### "Cannot read property 'create' of undefined"
This means the repository wasn't properly initialized:
1. Check repository is imported correctly in service
2. Ensure `super()` is called in service constructor
3. Verify repository extends BaseRepository

#### Connection Pool Exhaustion
Symptoms: Timeouts, "too many connections" errors
Solutions:
1. Always release connections in finally blocks
2. Use connection parameter in repository methods
3. Check for missing `conn.release()` calls
4. Monitor with: `SELECT COUNT(*) FROM information_schema.processlist WHERE db = 'your_db';`

#### Transaction Rollback Issues
Common mistakes:
1. Using different connections in same transaction
2. Not passing `conn` parameter through all calls
3. Catching errors without re-throwing them

#### Module Import Errors
1. Check file paths are correct (use relative paths)
2. Ensure consistent naming (camelCase vs PascalCase)
3. Verify all directories were created
4. Check for circular dependencies

#### Tests Failing with "Connection Already Released"
1. Don't release connections in repository methods when conn is passed
2. Use pattern: `const shouldRelease = !conn;`
3. Only release if you created the connection

---

## Complete Example: Adding an Inventory Module

Here's a step-by-step example of adding a complete inventory module:

### Step 1: Create Structure
```bash
cd backend
mkdir -p src/modules/inventory/repositories src/modules/inventory/services src/modules/inventory/routes
mkdir -p tests/integration/modules/inventory/repositories tests/integration/modules/inventory/services
```

### Step 2: Create Repository
File: `/backend/src/modules/inventory/repositories/InventoryRepository.js`
```javascript
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');

class InventoryRepository extends BaseRepository {
  constructor() {
    super('inventory_items', 'item_id');
  }

  async findLowStock(threshold = 10, conn) {
    const query = `
      SELECT * FROM \`${this.tableName}\` 
      WHERE quantity <= ? AND is_deleted = 0
      ORDER BY quantity ASC
    `;
    return this.executeQuery(query, [threshold], conn);
  }
}

module.exports = InventoryRepository;
```

### Step 3: Create Service  
File: `/backend/src/modules/inventory/services/inventoryService.js`
```javascript
const BaseService = require('../../../infrastructure/services/BaseService');
const InventoryRepository = require('../repositories/InventoryRepository');

class InventoryService extends BaseService {
  constructor() {
    const repository = new InventoryRepository();
    const auditService = require('../../../infrastructure/audit/auditService');
    super(repository, { auditService });
  }

  async addItem(itemData, userId) {
    return this.executeInTransaction(async (conn) => {
      const result = await this.repository.create(itemData, conn);
      return result;
    }, {
      action: 'CREATE_INVENTORY_ITEM',
      userId,
      details: { itemData }
    });
  }

  async getLowStockItems(threshold) {
    return this.repository.findLowStock(threshold);
  }
}

module.exports = new InventoryService();
```

### Step 4: Create Routes
File: `/backend/src/modules/inventory/routes/inventory.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../infrastructure/middleware/authMiddleware');
const inventoryService = require('../services/inventoryService');

router.get('/low-stock', authenticateToken, async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    const items = await inventoryService.getLowStockItems(threshold);
    res.json(items);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await inventoryService.addItem(req.body, req.user.userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Step 5: Register Everything
In `/backend/src/app.js`:
```javascript
const inventoryRoutes = require('./modules/inventory/routes/inventory.routes');
app.use('/api/inventory', inventoryRoutes);
```

In `/backend/src/bootstrap/registerServices.js`:
```javascript
const inventoryService = require('../modules/inventory/services/inventoryService');
serviceRegistry.register('InventoryService', inventoryService);
```

In `/backend/src/infrastructure/repositories/BaseRepository.js`:
```javascript
static ALLOWED_TABLES = new Set([
  // ... existing tables ...
  'inventory_items',
]);
```

---

## Version History
- v1.0 - Initial gold standard patterns documentation
- v1.1 - CRITICAL SECURITY UPDATE: Added LIMIT/OFFSET injection prevention, mandatory security tests, test coverage requirements