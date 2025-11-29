# Code Quality and Testing Standards - Executive Summary

**Fire-Proof ERP Platform**

This document provides a high-level overview of the code quality and testing standards established for the Fire-Proof ERP platform.

## Code Quality Standards Summary

### File Size Guidelines

**Critical Limits**:
- **Functions**: 10-20 lines (ideal), 200 lines (maximum)
- **Files/Classes**: 200-300 lines (target), **500 lines (absolute maximum - production blocker)**

**Refactoring Triggers**:
- Files >300 lines: Refactor immediately
- Files >500 lines: **Production blocker** - must refactor before merge

**Benefits**: Improved readability, easier reviews, better test coverage, faster debugging

### Naming Conventions

**Frontend (TypeScript/React)**:
- Components: `PascalCase` (Button.tsx, GaugeListPage.tsx)
- Utilities: `camelCase` (apiClient.ts, authService.ts)
- Tests: `kebab-case` (gauge-creation.spec.ts)

**Backend (JavaScript/Node.js)**:
- Services/utilities: `camelCase` (gaugeService.js, authMiddleware.js)
- Classes: `PascalCase` (GaugeRepository.js, ValidationError.js)
- Tests: `kebab-case` (gauge-checkout-workflow.real-db.test.js)

### Import Patterns

**Frontend - Use ERP Core**:
```typescript
// ✅ CORRECT
import { getAuthHeaders } from '../../erp-core/src/core/auth/authService.ts';
import { apiClient } from '../../erp-core/src/core/data/apiClient.ts';
import { Button, Modal } from '@infrastructure/components';
```

**Backend - Use Infrastructure Services**:
```javascript
// ✅ CORRECT
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { pool } = require('../../../infrastructure/database/connection');
const logger = require('../../../infrastructure/utils/logger');
```

### ESLint Custom Rules

**Infrastructure Enforcement**:
- `prefer-infrastructure-components`: Use centralized components instead of raw HTML
- `no-hardcoded-colors`: Use CSS custom properties (var(--color-*))
- `no-hardcoded-spacing`: Use CSS spacing variables (var(--space-*))
- `prefer-form-section`: Use FormSection component for form sections
- `require-datatable-resetkey`: Enforce resetKey prop on DataTable components

**Business Logic Enforcement**:
- Use `StatusRules`, `EquipmentRules`, `PermissionRules` instead of direct comparisons
- Use `TextFormatRules` instead of manual string formatting
- Prevents hardcoded business logic in components

### Quality Commands

**Frontend**:
```bash
npm run lint                      # ESLint check
npm run quality:all               # All quality checks
npm run architecture:validate     # Architectural rules validation
npm run validate:all              # Comprehensive validation
```

**Backend**:
```bash
npm run verify:backend            # Full backend verification
npm run lint                      # Linting
npm run security:audit            # Security audit
```

---

## Testing Standards Summary

### Test Organization

**Why No `__tests__/` Folders?**
- Clear separation by test type (unit, integration, e2e)
- Better discoverability - all tests in one place
- Simplified test configuration
- Cleaner source directories
- Easier CI/CD configuration

**Backend Structure**:
```
backend/tests/
├── integration/        # API, database, service integration tests
├── modules/           # Module-specific tests (follows module structure)
├── unit/              # Pure unit tests
├── e2e/               # End-to-end workflow tests
├── security/          # Security-specific tests
└── performance/       # Performance tests
```

**Frontend Structure**:
```
frontend/tests/
├── e2e/               # Playwright E2E tests (Page Objects + specs)
├── integration/       # Integration tests
├── unit/              # Unit tests
└── eslint/            # ESLint rule tests
```

### Testing Patterns

**Backend - Integration Test Pattern** (Real Database):
```javascript
// Transaction-based isolation
beforeEach(async () => {
  await connection.beginTransaction();
  // Create unique test data with timestamps
});

afterEach(async () => {
  await connection.rollback(); // Automatic cleanup
});

test('should checkout available gauge successfully', async () => {
  // Verify initial state
  // Perform action
  // Verify state changes
  // Verify database records
});
```

**Frontend - E2E Test Pattern** (Playwright):
```typescript
// Page Object Model
export class CreateGaugePage {
  async selectEquipmentType(type: string) { }
  async fillForm(data: GaugeData) { }
  async expectSuccess() { }
}

// Test specification
test('should create gauge successfully', async ({ page }) => {
  await createGaugePage.selectEquipmentType('Thread Gauge');
  await createGaugePage.fillForm(TEST_DATA);
  await createGaugePage.submit();
  await createGaugePage.expectSuccess();
});
```

### Coverage Requirements

**Minimum Thresholds**:
- Unit Tests: ≥80% line coverage
- Integration Tests: ≥70% branch coverage
- E2E Tests: All critical user paths
- Overall: ≥75% project coverage

**By Component Type**:
- Services: 85%
- Repositories: 87%
- API Routes: 80%
- Components: 80%
- Utilities: 95%
- Validators: 87%

### Test Data Management

**Principles**:
1. **Isolation**: Each test creates its own data
2. **Cleanup**: Automatic cleanup via transactions or afterEach
3. **Uniqueness**: Use timestamps/UUIDs to avoid conflicts
4. **Realism**: Test data resembles production data
5. **Maintainability**: Centralized fixtures

**Backend Pattern**:
```javascript
const timestamp = Date.now().toString().slice(-6);
const testEmail = `test-${timestamp}@example.com`;
// Creates unique, non-conflicting test data
```

**Frontend Pattern**:
```typescript
export function createTestGauge(overrides = {}) {
  return {
    gauge_id: `TEST-${Date.now()}`,
    name: 'Test Gauge',
    ...overrides
  };
}
```

### Testing Commands

**Backend**:
```bash
npm test                          # All tests
npm run test:integration          # Integration tests
npm run test:real-db              # Real database tests
npm run test:coverage             # Coverage report
```

**Frontend**:
```bash
npm test                          # Jest tests
npm run test:e2e                  # Playwright E2E tests
npm run test:coverage             # Coverage report
npx playwright test --ui          # Playwright UI mode
```

---

## Key Examples

### Real-World Integration Test

**File**: `backend/tests/integration/gauge/gauge-checkout-workflow.real-db.test.js`

**Features**:
- Transaction-based isolation (each test in separate transaction)
- Unique test data generation using timestamps
- Comprehensive workflow testing (checkout → verify → return → verify)
- Error scenario testing (double checkout, non-existent gauge, etc.)
- Concurrent operation testing (data integrity under load)

**Lines**: 440 lines - demonstrates comprehensive test coverage

### Real-World E2E Test

**File**: `frontend/tests/e2e/specs/gauge-creation.spec.ts`

**Features**:
- Page Object Model pattern
- Multi-step wizard testing (equipment type → category → form → review)
- Form validation testing (required fields, format validation)
- Error handling testing (API errors, network timeouts)
- User experience validation (loading states, toast notifications)

**Lines**: 543 lines - demonstrates thorough E2E coverage

---

## Quality Gates

### Pre-Merge Checklist

**Mandatory Before Merge**:
1. ✅ All ESLint errors resolved
2. ✅ Files under 500 lines (production blocker if exceeded)
3. ✅ Test coverage >80% for new code
4. ✅ No critical architectural violations
5. ✅ All tests passing
6. ✅ Code review approved

### Automated Enforcement

**Pre-commit Hooks**:
- Run lint and basic tests
- Prevent commits with critical errors

**CI Pipeline**:
- Full quality checks
- Architecture validation
- Comprehensive test suite
- Coverage reporting
- Block merge if quality gates fail

---

## Common Pitfalls to Avoid

### Code Quality

❌ **Don't**:
- Create files >500 lines (production blocker)
- Use abbreviations in variable names
- Duplicate infrastructure functionality
- Use raw HTML elements instead of components
- Hardcode colors or spacing values
- Ignore ESLint warnings

✅ **Do**:
- Keep functions under 50 lines
- Keep files under 300 lines
- Use descriptive names
- Import from infrastructure and ERP core
- Document complex algorithms
- Run quality checks before committing

### Testing

❌ **Don't**:
- Create `__tests__/` folders
- Share test data between tests
- Leave test data in database
- Skip cleanup
- Test implementation details
- Write tests that depend on execution order

✅ **Do**:
- Use designated test directories
- Isolate tests with transactions
- Generate unique test data
- Clean up automatically
- Test behavior, not implementation
- Make tests independent

---

## Quick Reference

### File Size Limits
- Functions: 10-20 lines (ideal), 200 max
- Files: 200-300 lines (target), **500 absolute max (blocker)**

### Coverage Targets
- Unit: ≥80%
- Integration: ≥70%
- Overall: ≥75%

### Test Organization
- Backend: `backend/tests/{integration,modules,unit,e2e,security,performance}`
- Frontend: `frontend/tests/{e2e,integration,unit}`

### Quality Commands
- Frontend: `npm run validate:all`
- Backend: `npm run verify:backend`

### Testing Commands
- Backend: `npm run test:coverage`
- Frontend: `npm run test:e2e`

---

**Documentation Location**:
- Code Quality Standards: `/Platform Standards/05-Code-Quality-Standards/README.md`
- Testing Standards: `/Platform Standards/06-Testing-Standards/README.md`

**Last Updated**: 2025-11-07
**Version**: 1.0
**Maintained By**: Development Team & QA Team
