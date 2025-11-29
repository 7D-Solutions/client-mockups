# Integration Test Template

Backend API integration testing with real database transactions.

## Template

```javascript
const request = require('supertest');
const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

/**
 * TODO: Replace [Module] with actual module name (e.g., Gauge, User, Inventory)
 * Integration tests for [Module] API endpoints
 * Uses real database with transaction rollback for isolation
 */

// Create minimal Express app for testing
const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // TODO: Mount your router
  const [module]Router = require('../../../src/modules/[MODULE_NAME]/routes/[module]Routes');
  app.use('/api/[module]', [module]Router);

  app.use((err, req, res, next) => {
    console.error('Test error:', err);
    res.status(500).json({ error: err.message });
  });

  return app;
};

describe('[Module] API - Integration Tests', () => {
  let connection;
  let authToken;
  let testUserId;
  let app;

  beforeAll(async () => {
    app = createTestApp();

    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: 'fireproof_root_sandbox',
      database: 'fai_db_sandbox'
    });

    // Get test user for authentication
    const [users] = await connection.execute(`
      SELECT u.id, u.email
      FROM core_users u
      WHERE u.is_active = 1 AND u.is_deleted = 0
      LIMIT 1
    `);

    if (users.length > 0) {
      testUserId = users[0].id;
      authToken = jwt.sign(
        { user_id: testUserId, email: users[0].email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    }
  });

  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
  });

  beforeEach(async () => {
    // Start transaction before each test
    await connection.beginTransaction();
  });

  afterEach(async () => {
    // Rollback transaction after each test (cleanup)
    await connection.rollback();
  });

  describe('GET /api/[module]', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/[module]')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('should list items with pagination', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/[module]')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
    });

    test('should support pagination parameters', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/[module]?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    test('should validate pagination parameters', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/[module]?page=0&limit=200')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(422);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/[module]/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/[module]/1')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('should get item by ID', async () => {
      if (!authToken) return;

      // TODO: Create test item first
      const [testItems] = await connection.execute(
        'SELECT id FROM [table_name] WHERE is_deleted = 0 LIMIT 1'
      );

      if (testItems.length === 0) return;

      const response = await request(app)
        .get(`/api/[module]/${testItems[0].id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testItems[0].id);
    });

    test('should return 404 for non-existent item', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/[module]/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/[module]', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/[module]')
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('should create item with valid data', async () => {
      if (!authToken) return;

      // TODO: Customize test data
      const testData = {
        name: 'Test Item',
        category: 'Standard'
        // Add required fields
      };

      const response = await request(app)
        .post('/api/[module]')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(testData.name);

      // Verify in database
      const [created] = await connection.execute(
        'SELECT * FROM [table_name] WHERE id = ?',
        [response.body.data.id]
      );

      expect(created.length).toBe(1);
      expect(created[0].name).toBe(testData.name);
    });

    test('should validate required fields', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/[module]')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Empty data
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors || response.body.message).toBeDefined();
    });

    test('should validate field formats', async () => {
      if (!authToken) return;

      // TODO: Test invalid field formats
      const invalidData = {
        name: '', // Empty name
        quantity: 'not-a-number' // Invalid type
      };

      const response = await request(app)
        .post('/api/[module]')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(422);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PATCH /api/[module]/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/[module]/1')
        .send({ name: 'Updated' })
        .expect(401);
    });

    test('should update item with valid data', async () => {
      if (!authToken) return;

      // Create test item first
      const [createResult] = await connection.execute(
        `INSERT INTO [table_name] (name, created_by) VALUES (?, ?)`,
        ['Original Name', testUserId]
      );

      const itemId = createResult.insertId;
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .patch(`/api/[module]/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');

      // Verify in database
      const [updated] = await connection.execute(
        'SELECT name FROM [table_name] WHERE id = ?',
        [itemId]
      );

      expect(updated[0].name).toBe('Updated Name');
    });

    test('should return 404 for non-existent item', async () => {
      if (!authToken) return;

      const response = await request(app)
        .patch('/api/[module]/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/[module]/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/[module]/1')
        .expect(401);
    });

    test('should soft delete item', async () => {
      if (!authToken) return;

      // Create test item
      const [createResult] = await connection.execute(
        `INSERT INTO [table_name] (name, created_by) VALUES (?, ?)`,
        ['To Delete', testUserId]
      );

      const itemId = createResult.insertId;

      const response = await request(app)
        .delete(`/api/[module]/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify soft delete in database
      const [deleted] = await connection.execute(
        'SELECT is_deleted FROM [table_name] WHERE id = ?',
        [itemId]
      );

      expect(deleted[0].is_deleted).toBe(1);
    });
  });

  describe('Database Integration', () => {
    test('should verify table exists', async () => {
      const [result] = await connection.execute(
        'SELECT COUNT(*) as count FROM [table_name]'
      );

      expect(result[0].count).toBeGreaterThanOrEqual(0);
    });

    test('should verify table structure', async () => {
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = 'fai_db_sandbox' AND TABLE_NAME = '[table_name]'`
      );

      const columnNames = columns.map(c => c.COLUMN_NAME);
      const requiredColumns = ['id', 'name', 'created_at', 'is_deleted'];

      requiredColumns.forEach(col => {
        expect(columnNames).toContain(col);
      });
    });
  });
});
```

## Working Example (from gauge tests)

```javascript
describe('GET /api/gauges', () => {
  test('should list gauges with pagination', async () => {
    const response = await request(app)
      .get('/api/gauges')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination).toBeDefined();
  });

  test('should support status filter', async () => {
    const response = await request(app)
      .get('/api/gauges?status=available')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    response.body.data.forEach(gauge => {
      expect(gauge.status).toBe('available');
    });
  });
});
```

## TODO Checklist

- [ ] Replace `[Module]`, `[module]`, `[table_name]`
- [ ] Create test data fixtures
- [ ] Test all CRUD operations
- [ ] Test validation rules
- [ ] Test authentication/authorization
- [ ] Test edge cases
- [ ] Achieve ≥70% coverage
- [ ] Verify database state after operations

## Best Practices

- ✅ Use transactions for test isolation
- ✅ Rollback after each test
- ✅ Use real database (not mocks)
- ✅ Test happy path and error cases
- ✅ Verify database state
- ✅ Clean up test data
- ✅ Test authentication and authorization
- ✅ Use descriptive test names
