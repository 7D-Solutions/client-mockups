# Module Creation Blueprint

**Category**: Implementation Templates
**Purpose**: Copy-paste system for building new modules in <30 minutes with accuracy
**Pattern**: Routes → Controllers → Services → Repositories (inventory-style)
**Last Updated**: 2025-11-07

---

## 🚀 Quick Start (60 Seconds)

Copy-paste this into terminal to create complete module structure:

```bash
# Replace MODULE_NAME with your module (e.g., purchasing, hr, maintenance)
MODULE_NAME="purchasing"

cd backend/src/modules
mkdir -p ${MODULE_NAME}/{controllers,services,repositories,routes,__tests__/integration}

# Create files with templates
touch ${MODULE_NAME}/controllers/${MODULE_NAME}Controller.js
touch ${MODULE_NAME}/services/${MODULE_NAME^}Service.js
touch ${MODULE_NAME}/repositories/${MODULE_NAME^}Repository.js
touch ${MODULE_NAME}/routes/${MODULE_NAME}.routes.js
touch ${MODULE_NAME}/routes/index.js
touch ${MODULE_NAME}/__tests__/integration/${MODULE_NAME}.test.js

echo "✅ Module structure created at: backend/src/modules/${MODULE_NAME}"
```

Now follow the templates below to fill in each file.

---

## 📁 Module Structure (Gold Standard)

```
backend/src/modules/[module-name]/
├── controllers/           # Request/response handlers
│   └── [module]Controller.js
├── services/             # Business logic
│   └── [Module]Service.js
├── repositories/         # Data access
│   └── [Module]Repository.js
├── routes/               # Route definitions
│   ├── index.js         # Main router (mounts sub-routes)
│   └── [resource].routes.js
└── __tests__/
    └── integration/      # Integration tests
        └── [module].test.js
```

**Naming Conventions**:
- **Controllers**: `camelCase` - `purchasingController.js`
- **Services**: `PascalCase` - `PurchasingService.js`
- **Repositories**: `PascalCase` - `PurchasingRepository.js`
- **Routes**: `kebab-case` - `purchasing-orders.routes.js`

---

## 📝 File Templates (Copy-Paste Ready)

### 1. Repository Template

**File**: `repositories/[Module]Repository.js`

```javascript
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const { getPool } = require('../../../infrastructure/database/connection');

/**
 * [Module] Repository
 *
 * Handles all database operations for [module] domain.
 *
 * TODO: Add JSDoc for all public methods
 * TODO: Define ALLOWED_UPDATE_FIELDS for security
 */
class [Module]Repository extends BaseRepository {
  constructor() {
    super(
      '[table_name]',        // TODO: Replace with actual table name
      '[primary_key_column]' // TODO: Replace with primary key (e.g., 'id', 'item_id')
    );
    this.pool = getPool();
  }

  /**
   * Get all [resources] with pagination and search
   *
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {string} search - Search term (optional)
   * @param {string} sortBy - Sort column (default: 'created_at')
   * @param {string} sortOrder - Sort direction (default: 'DESC')
   * @returns {Promise<{data: Array, total: number}>}
   */
  async getAll(page, limit, search = '', sortBy = 'created_at', sortOrder = 'DESC') {
    const offset = (page - 1) * limit;

    // TODO: Customize base query with actual columns and joins
    let baseQuery = `
      SELECT
        t.*
      FROM ${this.tableName} t
      WHERE 1=1
    `;

    const queryParams = [];

    // Add search condition
    if (search) {
      // TODO: Customize search columns
      baseQuery += ` AND (t.name LIKE ? OR t.description LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Get total count
    const countQuery = baseQuery.replace(/SELECT[\s\S]+?FROM/i, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await this.pool.query(countQuery, queryParams);
    const total = countResult[0].total;

    // Add sorting and pagination
    baseQuery += ` ORDER BY t.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [data] = await this.pool.query(baseQuery, queryParams);

    return { data, total };
  }

  /**
   * Get single [resource] by ID
   *
   * @param {number} id - Resource ID
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ?`;
    const [rows] = await this.pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Create new [resource]
   *
   * @param {Object} data - Resource data
   * @returns {Promise<Object>}
   */
  async create(data) {
    // TODO: Validate required fields
    const requiredFields = ['name']; // TODO: Update required fields
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const result = await super.create(data);
    return this.getById(result.insertId);
  }

  /**
   * Update [resource]
   *
   * @param {number} id - Resource ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   */
  async update(id, updates) {
    // TODO: Define allowed update fields for security
    const ALLOWED_UPDATE_FIELDS = [
      'name',
      'description',
      'status'
      // TODO: Add allowed fields
    ];

    const filteredUpdates = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    await super.update(id, filteredUpdates);
    return this.getById(id);
  }

  /**
   * Delete [resource]
   *
   * @param {number} id - Resource ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE ${this.idColumn} = ?`;
    const [result] = await this.pool.query(query, [id]);
    return result.affectedRows > 0;
  }

  // TODO: Add domain-specific methods below
  // Example:
  // async getByStatus(status) { ... }
  // async searchByCategory(categoryId) { ... }
}

module.exports = [Module]Repository;
```

---

### 2. Service Template

**File**: `services/[Module]Service.js`

```javascript
const [Module]Repository = require('../repositories/[Module]Repository');
const logger = require('../../../infrastructure/utils/logger');
const auditService = require('../../../infrastructure/audit/auditService');

/**
 * [Module] Service
 *
 * Business logic for [module] domain.
 *
 * TODO: Add JSDoc for all public methods
 * TODO: Add business validation rules
 * TODO: Integrate audit logging for sensitive operations
 */
class [Module]Service {
  constructor(repository = null) {
    this.repository = repository || new [Module]Repository();
  }

  /**
   * Get all [resources] with pagination
   *
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {string} search - Search term
   * @param {string} sortBy - Sort column
   * @param {string} sortOrder - Sort direction
   * @returns {Promise<{data: Array, total: number}>}
   */
  async getAll(page, limit, search, sortBy, sortOrder) {
    try {
      return await this.repository.getAll(page, limit, search, sortBy, sortOrder);
    } catch (error) {
      logger.error(`Failed to get [resources]:`, {
        error: error.message,
        page,
        limit,
        search
      });
      throw new Error(`Failed to retrieve [resources]: ${error.message}`);
    }
  }

  /**
   * Get [resource] by ID
   *
   * @param {number} id - Resource ID
   * @returns {Promise<Object>}
   */
  async getById(id) {
    try {
      const resource = await this.repository.getById(id);

      if (!resource) {
        throw new Error(`[Resource] not found with ID: ${id}`);
      }

      return resource;
    } catch (error) {
      logger.error(`Failed to get [resource] by ID:`, {
        error: error.message,
        id
      });
      throw error;
    }
  }

  /**
   * Create new [resource]
   *
   * @param {Object} data - Resource data
   * @param {number} createdBy - User ID creating the resource
   * @returns {Promise<Object>}
   */
  async create(data, createdBy) {
    try {
      // TODO: Add business validation
      // Example: await this.validateBusinessRules(data);

      // Add audit metadata
      const resourceData = {
        ...data,
        created_by: createdBy,
        created_at: new Date()
      };

      const result = await this.repository.create(resourceData);

      // TODO: Add audit logging for sensitive operations
      // await auditService.log(
      //   'CREATE',
      //   '[module]',
      //   result.id,
      //   resourceData,
      //   createdBy
      // );

      logger.info(`[Resource] created successfully`, {
        id: result.id,
        createdBy
      });

      return result;
    } catch (error) {
      logger.error(`Failed to create [resource]:`, {
        error: error.message,
        data,
        createdBy
      });
      throw new Error(`Failed to create [resource]: ${error.message}`);
    }
  }

  /**
   * Update [resource]
   *
   * @param {number} id - Resource ID
   * @param {Object} updates - Fields to update
   * @param {number} updatedBy - User ID making the update
   * @returns {Promise<Object>}
   */
  async update(id, updates, updatedBy) {
    try {
      // Verify resource exists
      await this.getById(id);

      // TODO: Add business validation
      // Example: await this.validateBusinessRules(updates);

      // Add audit metadata
      const updateData = {
        ...updates,
        updated_by: updatedBy,
        updated_at: new Date()
      };

      const result = await this.repository.update(id, updateData);

      // TODO: Add audit logging for sensitive operations
      // await auditService.log(
      //   'UPDATE',
      //   '[module]',
      //   id,
      //   updateData,
      //   updatedBy
      // );

      logger.info(`[Resource] updated successfully`, {
        id,
        updatedBy
      });

      return result;
    } catch (error) {
      logger.error(`Failed to update [resource]:`, {
        error: error.message,
        id,
        updates,
        updatedBy
      });
      throw error;
    }
  }

  /**
   * Delete [resource]
   *
   * @param {number} id - Resource ID
   * @param {number} deletedBy - User ID deleting the resource
   * @returns {Promise<boolean>}
   */
  async delete(id, deletedBy) {
    try {
      // Verify resource exists
      await this.getById(id);

      // TODO: Add business rules for deletion
      // Example: await this.checkDeletionRules(id);

      const success = await this.repository.delete(id);

      if (success) {
        // TODO: Add audit logging
        // await auditService.log(
        //   'DELETE',
        //   '[module]',
        //   id,
        //   {},
        //   deletedBy
        // );

        logger.info(`[Resource] deleted successfully`, {
          id,
          deletedBy
        });
      }

      return success;
    } catch (error) {
      logger.error(`Failed to delete [resource]:`, {
        error: error.message,
        id,
        deletedBy
      });
      throw error;
    }
  }

  // TODO: Add domain-specific business logic methods below
  // Examples:
  // async validateBusinessRules(data) { ... }
  // async calculateTotals(id) { ... }
  // async processWorkflow(id, action) { ... }
}

module.exports = [Module]Service;
```

---

### 3. Controller Template

**File**: `controllers/[module]Controller.js`

```javascript
const [Module]Service = require('../services/[Module]Service');
const logger = require('../../../infrastructure/utils/logger');

const service = new [Module]Service();

/**
 * GET /api/[module]
 * Get all [resources] with pagination
 */
const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const result = await service.getAll(
      parseInt(page),
      parseInt(limit),
      search,
      sortBy,
      sortOrder
    );

    // Build pagination response
    const totalPages = Math.ceil(result.total / limit);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Failed to get [resources]:', {
      error: error.message,
      user: req.user?.id,
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve [resources]',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/[module]/:id
 * Get single [resource] by ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID'
      });
    }

    const resource = await service.getById(parseInt(id));

    res.status(200).json({
      success: true,
      data: resource
    });
  } catch (error) {
    // Check if resource not found
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    logger.error('Failed to get [resource] by ID:', {
      error: error.message,
      user: req.user?.id,
      params: req.params
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve [resource]',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/[module]
 * Create new [resource]
 */
const create = async (req, res) => {
  try {
    // TODO: Add request validation
    const requiredFields = ['name']; // TODO: Update required fields
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const resource = await service.create(req.body, req.user.id);

    res.status(201).json({
      success: true,
      message: '[Resource] created successfully',
      data: resource
    });
  } catch (error) {
    // Check for duplicate/conflict errors
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    logger.error('Failed to create [resource]:', {
      error: error.message,
      user: req.user?.id,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Failed to create [resource]',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * PUT /api/[module]/:id
 * Update [resource]
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID'
      });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No update data provided'
      });
    }

    const resource = await service.update(parseInt(id), req.body, req.user.id);

    res.status(200).json({
      success: true,
      message: '[Resource] updated successfully',
      data: resource
    });
  } catch (error) {
    // Check if resource not found
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    logger.error('Failed to update [resource]:', {
      error: error.message,
      user: req.user?.id,
      params: req.params,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update [resource]',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * DELETE /api/[module]/:id
 * Delete [resource]
 */
const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID'
      });
    }

    const success = await service.delete(parseInt(id), req.user.id);

    if (success) {
      res.status(200).json({
        success: true,
        message: '[Resource] deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete [resource]'
      });
    }
  } catch (error) {
    // Check if resource not found
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    logger.error('Failed to delete [resource]:', {
      error: error.message,
      user: req.user?.id,
      params: req.params
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete [resource]',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// TODO: Add domain-specific controller methods below

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteResource
};
```

---

### 4. Routes Template

**File**: `routes/[module].routes.js`

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const { apiRateLimiter } = require('../../../infrastructure/middleware/rateLimiter');
const controller = require('../controllers/[module]Controller');

// TODO: Apply appropriate rate limiting
// Options: apiRateLimiter, strictRateLimiter, heavyRateLimiter, uploadRateLimiter

/**
 * GET /api/[module]
 * Get all [resources] with pagination
 *
 * TODO: Set appropriate authentication and authorization
 * Options: authenticateToken, requireRole(['admin']), requireAdmin, requireOperator
 */
router.get('/',
  authenticateToken,           // TODO: Adjust auth requirements
  apiRateLimiter,             // TODO: Adjust rate limiting
  asyncErrorHandler(controller.getAll)
);

/**
 * GET /api/[module]/:id
 * Get single [resource] by ID
 */
router.get('/:id',
  authenticateToken,
  apiRateLimiter,
  asyncErrorHandler(controller.getById)
);

/**
 * POST /api/[module]
 * Create new [resource]
 */
router.post('/',
  authenticateToken,
  requireRole(['admin', 'manager']), // TODO: Adjust role requirements
  apiRateLimiter,
  asyncErrorHandler(controller.create)
);

/**
 * PUT /api/[module]/:id
 * Update [resource]
 */
router.put('/:id',
  authenticateToken,
  requireRole(['admin', 'manager']),
  apiRateLimiter,
  asyncErrorHandler(controller.update)
);

/**
 * DELETE /api/[module]/:id
 * Delete [resource]
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['admin']),      // TODO: Restrict deletion appropriately
  apiRateLimiter,
  asyncErrorHandler(controller.delete)
);

// TODO: Add domain-specific routes below
// Examples:
// router.post('/:id/approve', authenticateToken, requireManager, asyncErrorHandler(controller.approve));
// router.get('/:id/history', authenticateToken, apiRateLimiter, asyncErrorHandler(controller.getHistory));

module.exports = router;
```

**File**: `routes/index.js`

```javascript
const express = require('express');
const router = express.Router();

// Import sub-routes
const [module]Routes = require('./[module].routes');

// Mount routes
router.use('/', [module]Routes);

// TODO: Add additional sub-routes as needed
// Example:
// const [module]ReportsRoutes = require('./[module]-reports.routes');
// router.use('/reports', [module]ReportsRoutes);

module.exports = router;
```

---

### 5. Integration Test Template

**File**: `__tests__/integration/[module].test.js`

```javascript
const request = require('supertest');
const app = require('../../../app');
const { getPool } = require('../../../infrastructure/database/connection');

describe('[Module] Integration Tests', () => {
  let authToken;
  let testUserId;
  let testResourceId;

  beforeAll(async () => {
    // TODO: Setup test user with appropriate role
    // Login and get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test_admin',
        password: 'test_password'
      });

    authToken = loginRes.body.token;
    testUserId = loginRes.body.user.id;
  });

  afterAll(async () => {
    // TODO: Cleanup test data
    const pool = getPool();
    if (testResourceId) {
      await pool.query('DELETE FROM [table_name] WHERE id = ?', [testResourceId]);
    }
    await pool.end();
  });

  describe('POST /api/[module]', () => {
    it('should create new [resource]', async () => {
      const newResource = {
        // TODO: Add required fields
        name: 'Test Resource',
        description: 'Test description'
      };

      const res = await request(app)
        .post('/api/[module]')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newResource);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(newResource.name);

      testResourceId = res.body.data.id;
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/[module]')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/[module]', () => {
    it('should get all [resources] with pagination', async () => {
      const res = await request(app)
        .get('/api/[module]')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 50 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('total');
    });
  });

  describe('GET /api/[module]/:id', () => {
    it('should get [resource] by ID', async () => {
      const res = await request(app)
        .get(`/api/[module]/${testResourceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testResourceId);
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app)
        .get('/api/[module]/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/[module]/:id', () => {
    it('should update [resource]', async () => {
      const updates = {
        // TODO: Add fields to update
        name: 'Updated Resource Name'
      };

      const res = await request(app)
        .put(`/api/[module]/${testResourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updates.name);
    });
  });

  describe('DELETE /api/[module]/:id', () => {
    it('should delete [resource]', async () => {
      const res = await request(app)
        .delete(`/api/[module]/${testResourceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // TODO: Add domain-specific test cases below
});
```

---

## ⚡ 30-Minute Implementation Checklist

Follow this exact sequence to build a production-ready module:

### Phase 1: Structure (5 minutes)

- [ ] **1.1** Run folder creation script (above) with your module name
- [ ] **1.2** Create database table (if needed) with migration
- [ ] **1.3** Verify folder structure matches gold standard

### Phase 2: Repository (7 minutes)

- [ ] **2.1** Copy repository template → replace `[Module]`, `[table_name]`, `[primary_key_column]`
- [ ] **2.2** Update `ALLOWED_UPDATE_FIELDS` with actual column names
- [ ] **2.3** Customize search query columns in `getAll()`
- [ ] **2.4** Add domain-specific query methods (optional)
- [ ] **2.5** Test repository methods work with database

### Phase 3: Service (7 minutes)

- [ ] **3.1** Copy service template → replace `[Module]`
- [ ] **3.2** Add business validation rules in `create()` and `update()`
- [ ] **3.3** Enable audit logging for sensitive operations (uncomment TODOs)
- [ ] **3.4** Add domain-specific business logic methods (if needed)
- [ ] **3.5** Test service methods work correctly

### Phase 4: Controller (5 minutes)

- [ ] **4.1** Copy controller template → replace `[module]`, `[Module]`, `[resources]`, `[resource]`
- [ ] **4.2** Update required fields validation in `create()`
- [ ] **4.3** Customize error messages
- [ ] **4.4** Add domain-specific endpoints (optional)

### Phase 5: Routes (3 minutes)

- [ ] **5.1** Copy routes templates (both files) → replace `[module]`
- [ ] **5.2** Set appropriate authentication requirements
- [ ] **5.3** Set appropriate authorization roles (admin, manager, operator)
- [ ] **5.4** Choose correct rate limiter (api, strict, heavy, upload)
- [ ] **5.5** Add domain-specific routes if needed

### Phase 6: Integration (3 minutes)

- [ ] **6.1** Mount module routes in `backend/src/app.js`:
  ```javascript
  const [module]Routes = require('./modules/[module]/routes');
  app.use('/api/[module]', [module]Routes);
  ```
- [ ] **6.2** Restart backend: `docker-compose restart backend`
- [ ] **6.3** Test endpoint: `curl http://localhost:8000/api/[module]`

### Phase 7: Testing (Optional but Recommended)

- [ ] **7.1** Copy test template → replace `[Module]`, `[module]`, `[table_name]`
- [ ] **7.2** Update test data with real fields
- [ ] **7.3** Run tests: `npm test -- [module].test.js`
- [ ] **7.4** Ensure all tests pass

---

## 🔗 Infrastructure Integration Checklist

Your module should integrate with these systems:

### ✅ Required Integrations

- [ ] **Authentication** (`authenticateToken`)
  - Applied to all protected routes
  - User context available via `req.user`

- [ ] **Authorization** (`requireRole`, `requireAdmin`, `requireOperator`)
  - Role-based access control on sensitive operations
  - Minimum principle of least privilege

- [ ] **Error Handling** (`asyncErrorHandler`)
  - All controller methods wrapped
  - Consistent error response format

- [ ] **Logging** (`logger.info`, `logger.error`)
  - All operations logged with context
  - Errors logged with stack traces in development

- [ ] **Rate Limiting** (`apiRateLimiter`, `strictRateLimiter`, etc.)
  - All routes protected against abuse
  - Appropriate limits for operation type

### ⚙️ Recommended Integrations

- [ ] **Pagination** (`parsePaginationParams`, `buildPaginationResponse`)
  - List endpoints return paginated responses
  - Consistent pagination format

- [ ] **Audit Logging** (`auditService.log`)
  - Sensitive operations logged to audit trail
  - CREATE, UPDATE, DELETE actions tracked

- [ ] **Validation** (`express-validator` or manual)
  - Input validation on all endpoints
  - Clear validation error messages

- [ ] **Observability** (`observabilityManager`)
  - Business metrics tracked (optional)
  - Performance monitoring (optional)

---

## 🎯 Quality Standards Checklist

Before marking your module "complete":

### Code Quality

- [ ] All files <500 lines (ideally <300)
- [ ] All TODO comments resolved
- [ ] All functions have JSDoc comments
- [ ] No hardcoded values (use config/constants)
- [ ] No console.log (use logger)
- [ ] No raw SQL strings (use prepared statements)

### Security

- [ ] `ALLOWED_UPDATE_FIELDS` defined in repository
- [ ] Authentication required on all protected endpoints
- [ ] Authorization enforced for sensitive operations
- [ ] Input validation on all user inputs
- [ ] SQL injection prevented (prepared statements)
- [ ] Audit logging for sensitive operations

### Functionality

- [ ] All CRUD operations work correctly
- [ ] Pagination works on list endpoints
- [ ] Search functionality works (if applicable)
- [ ] Error handling covers all edge cases
- [ ] Success messages are clear and actionable

### Testing

- [ ] Integration tests written and passing
- [ ] Manual testing completed via Postman/curl
- [ ] Edge cases tested (invalid IDs, missing fields, etc.)
- [ ] Authorization tested (correct roles only)

---

## 📚 Related Documentation

- [Repository Pattern](../02-Backend-Standards/03-Repository-Pattern.md)
- [Service Layer Standards](../02-Backend-Standards/02-Service-Layer.md)
- [API Route Standards](../04-API-Standards/README.md)
- [Rate Limiting Standards](../04-API-Standards/Rate-Limiting-Standards.md)
- [Pagination Standards](../04-API-Standards/Pagination-Standards.md)
- [Audit Logging Standards](../02-Backend-Standards/01-Audit-Logging.md)

---

## 🚀 Quick Reference

**Module Creation Time**: ~30 minutes for full CRUD module

**What You Get**:
- ✅ Complete CRUD API with pagination
- ✅ Authentication and authorization
- ✅ Rate limiting and error handling
- ✅ Audit logging and observability hooks
- ✅ Integration tests
- ✅ Production-ready code

**Copy-paste this entire checklist and mark items as you complete them!**

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
**Status**: Production Standard
