# Testing Standards

**Fire-Proof ERP Platform - Comprehensive Testing Guidelines and Patterns**

## Table of Contents
1. [Test Organization Structure](#test-organization-structure)
2. [Testing Patterns and Best Practices](#testing-patterns-and-best-practices)
3. [Coverage Requirements](#coverage-requirements)
4. [Test Data Management](#test-data-management)
5. [Testing Commands Reference](#testing-commands-reference)
6. [Real-World Examples](#real-world-examples)

---

## Test Organization Structure

### Why No `__tests__/` Folders?

**Rationale**: The Fire-Proof ERP platform uses **dedicated test directories** at the project root level instead of co-located `__tests__/` folders for several reasons:

1. **Clear Separation**: Tests are organized by type (unit, integration, e2e) rather than mixed with source code
2. **Better Discoverability**: All tests in one place makes it easier to run specific test suites
3. **Simplified Test Configuration**: Single test configuration per test type
4. **Cleaner Source Directory**: Source code directories remain focused on implementation
5. **Consistent CI/CD**: Easier to configure different test suites in CI pipelines

### Backend Test Organization

**Directory Structure**:
```
backend/tests/
├── integration/               # Integration tests (API, database, services)
│   ├── auth/
│   │   ├── auth-endpoints.real-db.test.js
│   │   └── auth-flow.real-db.test.js
│   ├── gauge/
│   │   ├── gauge-checkout-workflow.real-db.test.js
│   │   └── gauge-pairing.test.js
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── connection.test.js
│   │   ├── middleware/
│   │   │   ├── auth.test.js
│   │   │   └── checkPermission.real.test.js
│   │   └── health/
│   │       └── health.real.test.js
│   └── endpoint-remediation/
│       └── phase1-new-endpoints.test.js
│
├── modules/                   # Module-specific tests (follows module structure)
│   └── gauge/
│       ├── services/
│       │   └── gaugeService.test.js
│       └── repositories/
│           └── GaugeRepository.test.js
│
├── unit/                      # Pure unit tests
│   ├── validators/
│   └── utilities/
│
├── e2e/                       # End-to-end tests
│   └── workflows/
│
├── security/                  # Security-specific tests
│   └── vulnerability-scanning/
│
├── performance/               # Performance tests
│   └── load-testing/
│
├── archive/                   # Deprecated/old tests
│
├── env-setup.js              # Test environment configuration
├── global-setup.js           # Jest global setup
└── global-teardown.js        # Jest global teardown
```

**Naming Conventions**:
- `*.test.js` - Standard tests
- `*.real-db.test.js` - Tests that use real database
- `*.integration.test.js` - Integration tests
- `*.spec.js` - Specification/behavior tests

### Frontend Test Organization

**Directory Structure**:
```
frontend/tests/
├── e2e/                       # Playwright E2E tests
│   ├── fixtures/
│   │   └── test-fixtures.ts   # Test data fixtures
│   ├── pages/                 # Page Object Models
│   │   ├── LoginPage.ts
│   │   ├── CreateGaugePage.ts
│   │   └── GaugeListPage.ts
│   ├── specs/                 # Test specifications
│   │   ├── authentication.spec.ts
│   │   ├── gauge-creation.spec.ts
│   │   └── gauge-list.spec.ts
│   ├── utils/
│   │   └── test-helpers.ts    # Test utility functions
│   └── README.md
│
├── integration/               # Integration tests
│   ├── erp-core-integration.test.tsx
│   ├── gauge/
│   │   └── gaugeService.integration.test.ts
│   └── module-communication.test.ts
│
├── unit/                      # Unit tests
│   ├── components/
│   ├── services/
│   └── utils/
│
└── eslint/                    # ESLint rule tests
    └── permission-patterns-test.tsx
```

---

## Testing Patterns and Best Practices

### Backend Testing Patterns

#### Integration Test Pattern (Real Database)

**Example**: Gauge Checkout Workflow Test

```javascript
const mysql = require('mysql2/promise');
const GaugeRepository = require('../../../src/modules/gauge/repositories/GaugeRepository');

// Mock external services to avoid side effects
jest.mock('../../../src/infrastructure/audit/auditService', () => ({
  logAction: jest.fn(() => Promise.resolve())
}));

describe('Gauge Checkout/Return Workflow - Real Database Integration', () => {
  let connection;
  let gaugeRepository;
  let testGauge;
  let testUser;

  // Setup: Connect to real database
  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: 'fireproof_root_sandbox',
      database: 'fai_db_sandbox'
    });

    gaugeRepository = new GaugeRepository();
  });

  // Cleanup: Close database connection
  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
  });

  // Per-test setup: Create test data in transaction
  beforeEach(async () => {
    await connection.beginTransaction();

    // Generate unique test data using timestamps
    const timestamp = Date.now().toString().slice(-6);
    const testGaugeId = `CHK-${timestamp}`;
    const testEmail = `checkout-test-${timestamp}@example.com`;

    // Clean up existing test data
    await connection.execute('DELETE FROM gauge_active_checkouts WHERE gauge_id IN (SELECT id FROM gauges WHERE gauge_id LIKE "CHK-%")');
    await connection.execute('DELETE FROM gauges WHERE gauge_id LIKE "CHK-%"');

    // Create test user
    const [userResult] = await connection.execute(`
      INSERT INTO core_users (email, password_hash, name, is_active, is_deleted, created_at)
      VALUES (?, ?, 'Test User', 1, 0, UTC_TIMESTAMP())
    `, [testEmail, 'hashed_password']);

    // Create test gauge
    const [gaugeResult] = await connection.execute(`
      INSERT INTO gauges (gauge_id, name, equipment_type, status, is_active, created_by, created_at)
      VALUES (?, ?, ?, ?, 1, ?, UTC_TIMESTAMP())
    `, [testGaugeId, 'Test Gauge', 'thread_gauge', 'available', userResult.insertId]);

    testGauge = {
      id: gaugeResult.insertId,
      gauge_id: testGaugeId
    };

    testUser = {
      id: userResult.insertId,
      email: testEmail
    };
  });

  // Per-test cleanup: Rollback transaction
  afterEach(async () => {
    await connection.rollback();
  });

  describe('Checkout Workflow', () => {
    test('should checkout available gauge successfully', async () => {
      // Verify initial state
      const gauge = await gaugeRepository.getGaugeByGaugeId(testGauge.gauge_id, connection);
      expect(gauge).not.toBeNull();
      expect(gauge.status).toBe('available');

      // Perform checkout
      const result = await gaugeRepository.checkoutGauge(testGauge.id, testUser.id, connection);
      expect(result.success).toBe(true);

      // Verify state changes
      const [updatedGauges] = await connection.execute(
        'SELECT status FROM gauges WHERE id = ?',
        [testGauge.id]
      );
      expect(updatedGauges[0].status).toBe('checked_out');

      // Verify checkout record created
      const [checkouts] = await connection.execute(
        'SELECT * FROM gauge_active_checkouts WHERE gauge_id = ? AND checked_out_to = ?',
        [testGauge.id, testUser.id]
      );
      expect(checkouts.length).toBe(1);
    });

    test('should prevent checkout of already checked out gauge', async () => {
      // First checkout
      await gaugeRepository.checkoutGauge(testGauge.id, testUser.id, connection);

      // Create second user
      const [userResult] = await connection.execute(`
        INSERT INTO core_users (email, password_hash, name, is_active, is_deleted, created_at)
        VALUES (?, ?, 'Second User', 1, 0, UTC_TIMESTAMP())
      `, [`second-user-${Date.now()}@example.com`, 'hashed_password']);

      // Attempt second checkout should fail
      await expect(
        gaugeRepository.checkoutGauge(testGauge.id, userResult.insertId, connection)
      ).rejects.toThrow();
    });
  });

  describe('Complete Checkout/Return Cycle', () => {
    test('should complete full checkout -> return cycle', async () => {
      // Initial: available
      const initial = await gaugeRepository.getGaugeByGaugeId(testGauge.gauge_id, connection);
      expect(initial.status).toBe('available');

      // Checkout
      const checkoutResult = await gaugeRepository.checkoutGauge(testGauge.id, testUser.id, connection);
      expect(checkoutResult.success).toBe(true);

      // Verify checked out
      const checkedOut = await gaugeRepository.getGaugeByGaugeId(testGauge.gauge_id, connection);
      expect(checkedOut.status).toBe('checked_out');

      // Return
      const returnResult = await gaugeRepository.returnGauge(testGauge.id, testUser.id, connection);
      expect(returnResult.success).toBe(true);

      // Verify available again
      const returned = await gaugeRepository.getGaugeByGaugeId(testGauge.gauge_id, connection);
      expect(returned.status).toBe('available');
    });
  });
});
```

**Key Patterns**:
1. **Transaction-based isolation**: Each test runs in a transaction that's rolled back
2. **Unique test data**: Use timestamps to avoid conflicts
3. **Thorough cleanup**: Clean up test data before creating new data
4. **Mock external services**: Avoid side effects (email, audit logs, etc.)
5. **Comprehensive assertions**: Verify state changes, database records, and side effects

#### Unit Test Pattern

```javascript
describe('GaugeValidator', () => {
  describe('validateGaugeData', () => {
    test('should accept valid gauge data', () => {
      const validData = {
        name: 'Thread Plug Gauge',
        equipment_type: 'thread_gauge',
        serial_number: 'SN-12345',
        category_id: 31
      };

      const result = GaugeValidator.validateGaugeData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject missing required fields', () => {
      const invalidData = {
        name: 'Thread Plug Gauge'
        // Missing equipment_type, serial_number
      };

      const result = GaugeValidator.validateGaugeData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('equipment_type is required');
      expect(result.errors).toContain('serial_number is required');
    });

    test('should validate serial number format', () => {
      const invalidData = {
        name: 'Test Gauge',
        equipment_type: 'thread_gauge',
        serial_number: '123', // Too short
        category_id: 31
      };

      const result = GaugeValidator.validateGaugeData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid serial number format');
    });
  });
});
```

### Frontend Testing Patterns

#### E2E Test Pattern (Playwright)

**Page Object Model**:
```typescript
// pages/CreateGaugePage.ts
export class CreateGaugePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/gauges/create');
  }

  async selectEquipmentType(type: string) {
    await this.page.click(`[data-testid="equipment-type-${type}"]`);
  }

  async clickNext() {
    await this.page.click('[data-testid="next-button"]');
  }

  async fillThreadGaugeForm(data: ThreadGaugeData) {
    await this.page.fill('[data-testid="thread-size"]', data.thread_size);
    await this.page.fill('[data-testid="thread-class"]', data.thread_class);
    await this.page.fill('[data-testid="go-serial-number"]', data.go_serial_number);

    if (data.nogo_serial_number) {
      await this.page.fill('[data-testid="nogo-serial-number"]', data.nogo_serial_number);
    }
  }

  async expectSuccess() {
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible();
  }

  async expectValidationError(field: string, message: string) {
    const error = this.page.locator(`[data-testid="${field}-error"]`);
    await expect(error).toBeVisible();
    await expect(error).toContainText(message);
  }
}
```

**Test Specification**:
```typescript
// specs/gauge-creation.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { CreateGaugePage } from '../pages/CreateGaugePage';
import { THREAD_GAUGE_DATA } from '../fixtures/test-fixtures';
import { setupTest, cleanupTest, waitForToast } from '../utils/test-helpers';

test.describe('Gauge Creation', () => {
  let loginPage: LoginPage;
  let createGaugePage: CreateGaugePage;

  test.beforeEach(async ({ page }) => {
    await setupTest(page);
    loginPage = new LoginPage(page);
    createGaugePage = new CreateGaugePage(page);

    // Login as admin
    await loginPage.goto();
    await loginPage.loginAsAdmin();
    await createGaugePage.goto();
  });

  test.afterEach(async ({ page }) => {
    await cleanupTest(page);
  });

  test('should create standard thread gauge with GO and NO GO', async ({ page }) => {
    await createGaugePage.createThreadGauge(THREAD_GAUGE_DATA.standard);

    await createGaugePage.expectSuccess();
    await waitForToast(page, 'Gauge created successfully', 'success');
  });

  test('should validate required thread gauge fields', async ({ page }) => {
    await createGaugePage.selectEquipmentType('Thread Gauge');
    await createGaugePage.clickNext();

    await createGaugePage.selectCategory('Standard');
    await createGaugePage.clickNext();

    // Try to proceed without filling form
    await createGaugePage.clickNext();

    // Should show validation errors
    await createGaugePage.expectValidationError('thread-size', 'Thread size is required');
    await createGaugePage.expectValidationError('thread-class', 'Thread class is required');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/gauges/v2', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ success: false, message: 'Internal server error' })
      });
    });

    await createGaugePage.createThreadGauge(THREAD_GAUGE_DATA.standard);

    // Should show error toast
    await waitForToast(page, 'Failed to create gauge', 'error');
  });
});
```

**Test Fixtures**:
```typescript
// fixtures/test-fixtures.ts
export const THREAD_GAUGE_DATA = {
  standard: {
    equipment_type: 'thread_gauge',
    category: 'Standard',
    thread_size: '.250-20',
    thread_class: '2A',
    go_nogo: 'both',
    go_serial_number: 'GO-STD-001',
    nogo_serial_number: 'NOGO-STD-001',
    is_sealed: true
  },
  metric: {
    equipment_type: 'thread_gauge',
    category: 'Metric',
    thread_size: 'M6x1.0',
    thread_class: '6H',
    go_nogo: 'go_only',
    go_serial_number: 'GO-MET-001',
    is_sealed: true
  }
};
```

**Test Helpers**:
```typescript
// utils/test-helpers.ts
export async function setupTest(page: Page) {
  // Clear local storage
  await page.evaluate(() => localStorage.clear());

  // Set up test environment
  await page.goto('/');
}

export async function cleanupTest(page: Page) {
  // Clean up any test data
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

export async function waitForToast(
  page: Page,
  message: string,
  type: 'success' | 'error' | 'warning',
  options = { timeout: 5000 }
) {
  const toast = page.locator(`[data-testid="toast-${type}"]`);
  await expect(toast).toBeVisible(options);
  await expect(toast).toContainText(message);
}
```

#### Integration Test Pattern

```typescript
// integration/gauge/gaugeService.integration.test.ts
import { GaugeService } from '../../../src/modules/gauge/services/gaugeService';
import { apiClient } from '../../../src/infrastructure/api/client';

describe('GaugeService Integration', () => {
  let gaugeService: GaugeService;

  beforeEach(() => {
    gaugeService = new GaugeService();
  });

  test('should fetch gauges from API', async () => {
    const gauges = await gaugeService.getGauges();

    expect(Array.isArray(gauges)).toBe(true);
    expect(gauges.length).toBeGreaterThan(0);

    // Verify structure
    const gauge = gauges[0];
    expect(gauge).toHaveProperty('id');
    expect(gauge).toHaveProperty('gauge_id');
    expect(gauge).toHaveProperty('name');
    expect(gauge).toHaveProperty('equipment_type');
  });

  test('should create gauge via API', async () => {
    const newGauge = {
      name: 'Test Gauge',
      equipment_type: 'thread_gauge',
      serial_number: `TEST-${Date.now()}`,
      category_id: 31
    };

    const created = await gaugeService.createGauge(newGauge);

    expect(created).toHaveProperty('id');
    expect(created.name).toBe(newGauge.name);
    expect(created.equipment_type).toBe(newGauge.equipment_type);
  });
});
```

---

## Coverage Requirements

### Coverage Thresholds

**Minimum Coverage Requirements**:
- **Unit Tests**: ≥80% line coverage
- **Integration Tests**: ≥70% branch coverage
- **E2E Tests**: All critical user paths covered
- **Overall**: ≥75% project coverage

**Coverage by Component Type**:

| Component Type | Unit | Integration | E2E | Total Target |
|----------------|------|-------------|-----|--------------|
| Services       | 90%  | 80%         | N/A | 85%          |
| Repositories   | 85%  | 90%         | N/A | 87%          |
| API Routes     | 70%  | 90%         | 80% | 80%          |
| Components     | 80%  | 70%         | 90% | 80%          |
| Utilities      | 95%  | N/A         | N/A | 95%          |
| Validators     | 95%  | 80%         | N/A | 87%          |

### Coverage Reporting

**Generate Coverage Reports**:
```bash
# Backend
npm run test:coverage

# Frontend
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

**Coverage Report Structure**:
```
coverage/
├── lcov-report/
│   ├── index.html          # Main coverage report
│   ├── modules/            # Module-specific coverage
│   └── infrastructure/     # Infrastructure coverage
├── lcov.info               # LCOV format
└── coverage-summary.json   # JSON summary
```

### Coverage Quality Gates

**CI/CD Pipeline Checks**:
- Fail build if coverage drops below threshold
- Require coverage for all new code
- Block merge if critical paths uncovered
- Generate coverage trends report

**Exceptions**:
- Generated code (excluded from coverage)
- Mock/stub files (excluded from coverage)
- Configuration files (excluded from coverage)

---

## Test Data Management

### Test Data Strategy

**Principles**:
1. **Isolation**: Each test creates its own data
2. **Cleanup**: Tests clean up after themselves
3. **Uniqueness**: Use timestamps/UUIDs to avoid conflicts
4. **Realism**: Test data resembles production data
5. **Maintainability**: Centralized fixtures for common data

### Creating Test Data

**Backend Pattern** (Transaction-based):
```javascript
beforeEach(async () => {
  await connection.beginTransaction();

  // Create unique test data
  const timestamp = Date.now().toString().slice(-6);
  const testEmail = `test-${timestamp}@example.com`;

  // Insert test data
  const [userResult] = await connection.execute(`
    INSERT INTO core_users (email, password_hash, name, is_active, is_deleted, created_at)
    VALUES (?, ?, 'Test User', 1, 0, UTC_TIMESTAMP())
  `, [testEmail, 'hashed_password']);

  testUserId = userResult.insertId;
});

afterEach(async () => {
  await connection.rollback(); // Automatic cleanup
});
```

**Frontend Pattern** (Fixtures):
```typescript
// fixtures/test-fixtures.ts
export function createTestGauge(overrides = {}) {
  return {
    gauge_id: `TEST-${Date.now()}`,
    name: 'Test Gauge',
    equipment_type: 'thread_gauge',
    serial_number: `SN-${Date.now()}`,
    status: 'available',
    ...overrides
  };
}

// Usage in tests
const gauge = createTestGauge({ status: 'checked_out' });
```

### Cleanup Strategies

**Database Cleanup** (Real DB Tests):
```javascript
// Clean up specific test data
beforeEach(async () => {
  await connection.execute('DELETE FROM gauges WHERE gauge_id LIKE "TEST-%"');
  await connection.execute('DELETE FROM core_users WHERE email LIKE "test-%"');
});

// Or use transactions for automatic rollback
beforeEach(async () => {
  await connection.beginTransaction();
});

afterEach(async () => {
  await connection.rollback();
});
```

**Frontend Cleanup**:
```typescript
afterEach(async ({ page }) => {
  // Clear storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Reset API mocks
  await page.unroute('**/*');
});
```

### Test Data Factories

**Factory Pattern**:
```typescript
// test/factories/GaugeFactory.ts
export class GaugeFactory {
  static create(overrides: Partial<Gauge> = {}): Gauge {
    return {
      id: Math.floor(Math.random() * 10000),
      gauge_id: `GAUGE-${Date.now()}`,
      name: 'Test Gauge',
      equipment_type: 'thread_gauge',
      serial_number: `SN-${Date.now()}`,
      status: 'available',
      category_id: 31,
      is_active: true,
      is_deleted: false,
      created_at: new Date().toISOString(),
      ...overrides
    };
  }

  static createMany(count: number, overrides: Partial<Gauge> = {}): Gauge[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

// Usage
const gauge = GaugeFactory.create({ status: 'checked_out' });
const gauges = GaugeFactory.createMany(10);
```

---

## Testing Commands Reference

### Backend Testing Commands

```bash
# Run all tests
npm test
npm run test:watch                    # Watch mode

# Test by type
npm run test:unit                     # Unit tests only
npm run test:integration              # Integration tests only
npm run test:e2e                      # E2E tests only
npm run test:security                 # Security tests only
npm run test:performance              # Performance tests only

# Database tests
npm run test:real-db                  # Real database tests
npm run test:real-db:watch            # Real DB tests in watch mode
npm run test:mock                     # Mock database tests

# Coverage
npm run test:coverage                 # Generate coverage report

# Enhanced testing
npm run test:enhanced                 # Enhanced test suite
npm run test:enhanced:watch           # Enhanced tests in watch mode
npm run test:enhanced:coverage        # Enhanced coverage report
npm run test:enhanced:performance     # Enhanced performance monitoring

# Health checks
npm run test:health                   # All health checks
npm run test:health:basic             # Basic health check
npm run test:health:docker            # Docker integration check
npm run test:health:full              # Full comprehensive suite

# Verbose output
npm run test:verbose                  # Verbose test output
npm run test:perf-report             # Performance reporting
```

### Frontend Testing Commands

```bash
# Unit/Integration tests (Jest)
npm test                              # Run Jest tests
npm run test:watch                    # Jest watch mode
npm run test:coverage                 # Jest coverage report

# E2E tests (Playwright)
npm run test:e2e                      # Run Playwright tests
npx playwright test                   # Run all E2E tests
npx playwright test --headed          # Run with browser visible
npx playwright test --debug           # Debug mode
npx playwright test --ui              # UI mode

# Specific test files
npx playwright test specs/gauge-creation.spec.ts
npx playwright test specs/authentication.spec.ts

# Generate test report
npx playwright show-report
```

### CI/CD Testing Commands

```bash
# Backend CI
npm run ci:test                       # Full CI test suite
npm run ci:pre-commit                 # Pre-commit checks (lint + unit tests)
npm run verify:backend                # Full backend verification
npm run verify:backend:fast           # Skip performance tests

# Frontend CI
npm run validate:all                  # Lint + architecture + tests
npm run quality:all                   # All quality checks
```

---

## Real-World Examples

### Complete Integration Test Example

**File**: `backend/tests/integration/gauge/gauge-checkout-workflow.real-db.test.js`

See the full example in the repository for:
- Transaction-based test isolation
- Unique test data generation
- Comprehensive workflow testing
- Error scenario testing
- Data integrity validation
- Concurrent operation testing

**Key Takeaways**:
1. Each test is completely isolated via transactions
2. Test data uses timestamps for uniqueness
3. All database state changes are verified
4. Error cases are thoroughly tested
5. Cleanup is automatic via rollback

### Complete E2E Test Example

**File**: `frontend/tests/e2e/specs/gauge-creation.spec.ts`

See the full example in the repository for:
- Page Object Model pattern
- Multi-step wizard testing
- Form validation testing
- Error handling testing
- API mocking
- Toast notification verification

**Key Takeaways**:
1. Page objects encapsulate UI interactions
2. Tests are descriptive and readable
3. Data fixtures provide reusable test data
4. Error scenarios are mocked and tested
5. User experience is validated end-to-end

---

## Testing Best Practices

### DO:
✅ Write tests before or alongside implementation (TDD)
✅ Use descriptive test names that explain the scenario
✅ Keep tests independent and isolated
✅ Use Page Object Model for E2E tests
✅ Mock external services in unit/integration tests
✅ Use transactions for database test isolation
✅ Generate unique test data with timestamps
✅ Test both happy path and error scenarios
✅ Verify state changes and side effects
✅ Clean up test data automatically
✅ Aim for >80% coverage
✅ Run tests before committing

### DON'T:
❌ Create `__tests__/` folders (use designated test directories)
❌ Share test data between tests
❌ Leave test data in database after tests
❌ Skip cleanup in afterEach/afterAll
❌ Test implementation details instead of behavior
❌ Write overly complex test setup
❌ Ignore failing tests
❌ Mock everything (use real integrations when appropriate)
❌ Write tests that depend on execution order
❌ Hardcode test data without uniqueness
❌ Skip edge cases and error scenarios

---

## Test Quality Checklist

Before marking a test as complete, verify:

- [ ] Test name clearly describes the scenario
- [ ] Test is isolated and independent
- [ ] Test data is unique and doesn't conflict
- [ ] Cleanup is automatic (transactions or afterEach)
- [ ] Both success and failure cases are tested
- [ ] Assertions verify expected state changes
- [ ] External services are properly mocked
- [ ] Test is deterministic (no random failures)
- [ ] Test runs in reasonable time (<5s for unit, <30s for integration)
- [ ] Test follows project conventions and patterns

---

**Last Updated**: 2025-11-07
**Version**: 1.0
**Maintained By**: QA Team & Development Team
