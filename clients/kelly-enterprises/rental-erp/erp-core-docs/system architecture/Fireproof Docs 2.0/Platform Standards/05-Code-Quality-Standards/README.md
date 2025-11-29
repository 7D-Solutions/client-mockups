# Code Quality Standards

**Fire-Proof ERP Platform - Code Quality Guidelines and Standards**

## Table of Contents
1. [File Size Guidelines](#file-size-guidelines)
2. [Naming Conventions](#naming-conventions)
3. [Import and Module Patterns](#import-and-module-patterns)
4. [Documentation Requirements](#documentation-requirements)
5. [ESLint Configuration](#eslint-configuration)
6. [Quality Commands](#quality-commands)

---

## File Size Guidelines

### Function Guidelines

**Target Limits**:
- **Ideal**: 10-20 lines per function
- **Maximum**: 200 lines per function
- **Rationale**: Smaller functions are easier to test, debug, and understand

**Best Practices**:
```javascript
// ✅ GOOD - Single responsibility, concise
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ❌ BAD - Too long, multiple responsibilities
function processUserRegistration(userData) {
  // 100+ lines of validation, database operations, email sending, etc.
  // Should be broken into smaller functions
}
```

**Refactoring Strategy**:
- Extract validation logic into separate functions
- Move business logic to service layer
- Use helper functions for complex operations
- Apply the Single Responsibility Principle

### File and Class Guidelines

**Target Limits**:
- **Target**: 200-300 lines per file
- **Absolute Maximum**: 500 lines per file
- **Production Blocker**: Files exceeding 500 lines must be refactored before merge

**Refactoring Triggers**:
- **>300 lines**: Refactor immediately
  - Extract specialized classes
  - Create separate repository files
  - Move helper functions to utilities

- **>500 lines**: Production blocker
  - Mandatory refactoring required
  - Cannot be merged until addressed

**Example Structure**:
```
// ✅ GOOD - Modular structure
backend/src/modules/gauge/
  ├── services/
  │   ├── gaugeService.js (250 lines)
  │   └── calibrationService.js (180 lines)
  ├── repositories/
  │   ├── GaugeRepository.js (220 lines)
  │   └── CalibrationRepository.js (150 lines)
  └── validators/
      └── gaugeValidator.js (100 lines)

// ❌ BAD - Monolithic file
backend/src/modules/gauge/
  └── gaugeService.js (1200 lines) ← Production blocker!
```

**Benefits of Size Limits**:
- Improved readability and maintainability
- Easier code reviews
- Better test coverage
- Reduced cognitive load
- Faster debugging
- Simplified git merge conflicts

---

## Naming Conventions

### File Naming

**Frontend (TypeScript/React)**:
```
PascalCase for components:
  - Button.tsx
  - FormInput.tsx
  - GaugeListPage.tsx

camelCase for utilities:
  - apiClient.ts
  - dateHelpers.ts
  - authService.ts

kebab-case for tests:
  - gauge-creation.spec.ts
  - auth-flow.test.ts
```

**Backend (JavaScript/Node.js)**:
```
camelCase for services and utilities:
  - gaugeService.js
  - authMiddleware.js
  - dbConnection.js

PascalCase for classes:
  - GaugeRepository.js
  - UserModel.js
  - ValidationError.js

kebab-case for tests:
  - gauge-checkout-workflow.real-db.test.js
  - auth-endpoints.test.js
```

### Variable and Function Naming

**Variables**:
```javascript
// ✅ GOOD - Descriptive, camelCase
const userId = req.params.id;
const isAuthenticated = checkAuth(token);
const gaugeList = await fetchGauges();

// ❌ BAD - Abbreviations, unclear meaning
const uid = req.params.id;
const auth = checkAuth(token);
const list = await fetchGauges();
```

**Functions**:
```javascript
// ✅ GOOD - Verb-based, descriptive
function validateUserCredentials(email, password) { }
function fetchGaugeById(gaugeId) { }
function calculateCalibrationDueDate(lastCalibration) { }

// ❌ BAD - Noun-based, unclear
function credentials(email, password) { }
function gauge(id) { }
function date(cal) { }
```

**Constants**:
```javascript
// ✅ GOOD - UPPER_SNAKE_CASE for true constants
const MAX_LOGIN_ATTEMPTS = 5;
const API_BASE_URL = process.env.API_URL;
const CALIBRATION_WARNING_DAYS = 30;

// ✅ GOOD - camelCase for configuration objects
const databaseConfig = {
  host: 'localhost',
  port: 3307
};
```

### Class Naming

**PascalCase for Classes**:
```javascript
// ✅ GOOD
class GaugeRepository { }
class UserService { }
class ValidationError extends Error { }

// ❌ BAD
class gaugeRepository { }
class user_service { }
class validationerror { }
```

---

## Import and Module Patterns

### Frontend Import Patterns

**Use ERP Core for Shared Services**:
```typescript
// ✅ CORRECT - Frontend imports from ERP core
import { getAuthHeaders, isAuthenticated } from '../../erp-core/src/core/auth/authService.ts';
import { apiClient } from '../../erp-core/src/core/data/apiClient.ts';
import { navigationService } from '../../erp-core/src/core/navigation/navigationService.ts';

// ❌ WRONG - Don't duplicate ERP core functionality
const customAuthUtil = () => { /* custom auth */ };
```

**Use Infrastructure Components**:
```typescript
// ✅ CORRECT - Use centralized infrastructure
import { Button, FormInput, Modal } from '@infrastructure/components';

// ❌ WRONG - Don't use raw HTML elements
<button onClick={handleClick}>Submit</button>
<input type="text" value={email} onChange={handleChange} />
```

**Import Order Convention**:
```typescript
// 1. External dependencies
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// 2. Infrastructure/shared components
import { Button, FormInput, DataTable } from '@infrastructure/components';

// 3. ERP core services
import { apiClient } from '../../erp-core/src/core/data/apiClient';
import { getAuthHeaders } from '../../erp-core/src/core/auth/authService';

// 4. Module-specific imports
import { useGaugeStore } from '../store/gaugeStore';
import { GaugeValidator } from '../utils/validators';

// 5. Types
import type { Gauge, GaugeFormData } from '../types';

// 6. Styles (last)
import styles from './GaugeList.module.css';
```

### Backend Import Patterns

**Use Backend Infrastructure Services**:
```javascript
// ✅ CORRECT - Backend imports from infrastructure
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { pool } = require('../../../infrastructure/database/connection');
const auditService = require('../../../infrastructure/audit/auditService');
const logger = require('../../../infrastructure/utils/logger');

// ❌ WRONG - Don't create duplicate infrastructure
const customAuth = require('./my-custom-auth');
const myDbConnection = require('./my-db-connection');
```

**Import Order Convention**:
```javascript
// 1. Node.js built-ins
const path = require('path');
const fs = require('fs');

// 2. External dependencies
const express = require('express');
const mysql = require('mysql2/promise');

// 3. Infrastructure services
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { pool } = require('../../../infrastructure/database/connection');

// 4. Module-specific imports
const GaugeRepository = require('../repositories/GaugeRepository');
const { validateGaugeData } = require('../validators/gaugeValidator');

// 5. Types/constants (if applicable)
const { GAUGE_STATUSES } = require('../constants');
```

### Path Usage

**Always Use Absolute Paths**:
```javascript
// ✅ CORRECT - Absolute paths
const config = require('/backend/src/config/database.js');
import { Button } from '@infrastructure/components/Button';

// ❌ WRONG - Relative paths (use only when necessary)
const config = require('../../../../config/database.js');
import { Button } from '../../../infrastructure/components/Button';
```

**Path Aliases Configuration** (tsconfig.json):
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@infrastructure/*": ["src/infrastructure/*"],
      "@modules/*": ["src/modules/*"],
      "@core/*": ["../erp-core/src/core/*"]
    }
  }
}
```

---

## Documentation Requirements

### JSDoc/TSDoc Standards

**Function Documentation**:
```typescript
/**
 * Validates gauge data before creation or update
 *
 * @param {GaugeFormData} data - The gauge data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {ValidationResult} Validation result with errors if any
 * @throws {ValidationError} If critical validation fails
 *
 * @example
 * const result = validateGaugeData(formData, false);
 * if (!result.isValid) {
 *   console.error(result.errors);
 * }
 */
function validateGaugeData(data: GaugeFormData, isUpdate: boolean): ValidationResult {
  // Implementation
}
```

**Class Documentation**:
```typescript
/**
 * Repository for gauge data operations
 *
 * Handles all database interactions for gauge management including:
 * - CRUD operations
 * - Checkout/return workflows
 * - Transfer history tracking
 * - Calibration management
 *
 * @class GaugeRepository
 * @extends BaseRepository
 */
class GaugeRepository extends BaseRepository {
  /**
   * Creates a new gauge repository instance
   *
   * @param {mysql.Pool} [connection] - Optional database connection pool
   */
  constructor(connection?: mysql.Pool) {
    super(connection);
  }

  /**
   * Retrieves a gauge by its unique gauge ID
   *
   * @param {string} gaugeId - The unique gauge identifier
   * @returns {Promise<Gauge|null>} The gauge object or null if not found
   */
  async getGaugeByGaugeId(gaugeId: string): Promise<Gauge | null> {
    // Implementation
  }
}
```

**Complex Algorithm Documentation**:
```typescript
/**
 * Calculates the next calibration due date based on gauge type and history
 *
 * Algorithm:
 * 1. Determine calibration interval from gauge category
 * 2. Check for custom calibration schedule
 * 3. Apply business rules for special cases (sealed gauges, etc.)
 * 4. Calculate due date with warning threshold
 *
 * @param {Gauge} gauge - The gauge to calculate for
 * @param {CalibrationHistory[]} history - Past calibration records
 * @returns {CalibrationSchedule} Calculated schedule with due date and warning date
 */
function calculateCalibrationSchedule(
  gauge: Gauge,
  history: CalibrationHistory[]
): CalibrationSchedule {
  // Complex calculation logic
}
```

### Inline Comment Guidelines

**When to Comment**:
```typescript
// ✅ GOOD - Explain WHY, not WHAT
// Using transaction to ensure atomicity between gauge update and checkout record
await connection.beginTransaction();

// Check calibration status first to prevent checkout of expired gauges
if (gauge.calibration_status === 'Expired') {
  throw new ValidationError('Cannot checkout expired gauge');
}

// ❌ BAD - Stating the obvious
// Increment counter by 1
counter++;

// Set user to active
user.is_active = true;
```

**TODO Comments**:
```typescript
// ✅ GOOD - Actionable, with context
// TODO: Add retry logic for database timeouts (ticket #1234)
// FIXME: Race condition possible here - needs transaction isolation (reported by QA)
// HACK: Temporary workaround until API v3 is available - remove after Q2 2025

// ❌ BAD - Vague, no context
// TODO: fix this
// FIXME: broken
```

### README Requirements

**Module README Template**:
```markdown
# Module Name

## Overview
Brief description of the module's purpose and responsibilities.

## Architecture
- Key components
- Data flow
- External dependencies

## API Endpoints (if applicable)
- `GET /api/resource` - Description
- `POST /api/resource` - Description

## Database Schema (if applicable)
Tables used and relationships

## Usage Examples
```typescript
// Code example
```

## Testing
How to run tests for this module

## Dependencies
- Internal dependencies
- External packages

## Configuration
Environment variables or config required
```

---

## ESLint Configuration

### Custom Infrastructure Rules

**Enforce Infrastructure Component Usage**:
```javascript
// Rule: prefer-infrastructure-components
// ✅ CORRECT
import { Modal } from '@infrastructure/components';
<Modal isOpen={isOpen} onClose={onClose}>Content</Modal>

// ❌ WRONG - Triggers lint error
<div className="modal-overlay">
  <div className="modal-content">Content</div>
</div>
```

**Prevent Hardcoded Colors**:
```javascript
// Rule: no-hardcoded-colors
// ✅ CORRECT
const styles = {
  color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-bg-secondary)'
};

// ❌ WRONG - Triggers lint warning
const styles = {
  color: '#333333',
  backgroundColor: 'rgb(255, 0, 0)'
};
```

**Prevent Hardcoded Spacing**:
```javascript
// Rule: no-hardcoded-spacing
// ✅ CORRECT
const styles = {
  padding: 'var(--space-4)',
  margin: 'var(--space-2)'
};

// ❌ WRONG - Triggers lint warning
const styles = {
  padding: '16px',
  margin: '8px'
};
```

**Enforce FormSection Usage**:
```javascript
// Rule: prefer-form-section
// ✅ CORRECT
import { FormSection } from '@infrastructure/components';
<FormSection title="Basic Information">
  <FormInput label="Name" />
</FormSection>

// ❌ WRONG - Triggers lint error
<div style={{ textTransform: 'uppercase', borderBottom: '2px solid', fontWeight: 'bold' }}>
  Basic Information
</div>
```

**Enforce DataTable resetKey**:
```javascript
// Rule: require-datatable-resetkey
// ✅ CORRECT
<DataTable
  data={gauges}
  columns={columns}
  resetKey={location.pathname}
/>

// ❌ WRONG - Triggers lint error
<DataTable
  data={gauges}
  columns={columns}
/>
```

**Business Logic Enforcement**:
```javascript
// Rule: Use business rules instead of direct comparisons
// ✅ CORRECT
import { StatusRules } from '@infrastructure/business/StatusRules';
if (StatusRules.isCheckedOut(gauge)) { }

// ❌ WRONG - Triggers lint error
if (gauge.status === 'checked_out') { }
```

### Running ESLint

**Commands**:
```bash
# Frontend linting
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues

# Architecture validation
npm run architecture:validate     # Validate architecture rules
npm run architecture:report       # Generate usage report
npm run governance:all           # Full governance checks

# Full validation
npm run validate:all     # Lint + architecture + styles
```

---

## Quality Commands

### Frontend Quality Checks

**Available Commands** (from `frontend/package.json`):
```bash
# Code Quality
npm run lint                      # ESLint check
npm run lint:fix                  # ESLint auto-fix
npm run quality:check             # Quality metrics
npm run quality:regression        # Quality regression detection
npm run quality:all               # All quality checks

# Architecture
npm run architecture:validate     # Validate architectural rules
npm run architecture:validate:ci  # Strict validation for CI
npm run architecture:report       # Infrastructure usage report

# Governance
npm run governance:dashboard      # Governance dashboard
npm run governance:all            # All governance checks

# Style Analysis
npm run docs:styles               # Generate style documentation
npm run css:monitor               # CSS bundle monitoring
npm run css:find-duplicates       # Find duplicate styles

# Comprehensive Validation
npm run validate:all              # Lint + architecture + modals
```

### Backend Quality Checks

**Available Commands** (from `backend/package.json`):
```bash
# Verification
npm run verify:backend            # Full backend verification
npm run verify:backend:fast       # Skip performance tests
npm run verify:backend:verbose    # Verbose output

# Code Quality
npm run lint                      # Linting (placeholder - implement ESLint)
npm run format                    # Code formatting (placeholder - implement Prettier)

# Security
npm run security:audit            # npm audit for vulnerabilities

# API Documentation
npm run spec:lint                 # Lint OpenAPI spec
npm run spec:validate             # Validate OpenAPI spec
npm run spec:bundle               # Bundle OpenAPI spec
```

### Continuous Integration

**Pre-commit Checks**:
```bash
# Frontend
npm run validate:all

# Backend
npm run ci:pre-commit
```

**CI Pipeline Checks**:
```bash
# Full test suite
npm run test:coverage
npm run verify:backend
npm run architecture:validate:ci
```

---

## Quality Metrics

### Code Quality Indicators

**Green Zone** (Target):
- File size: <300 lines
- Function size: <50 lines
- Cyclomatic complexity: <10
- Test coverage: >80%
- No critical ESLint errors
- All architectural rules passing

**Yellow Zone** (Warning):
- File size: 300-500 lines
- Function size: 50-100 lines
- Cyclomatic complexity: 10-15
- Test coverage: 60-80%
- Minor ESLint warnings
- Some architectural violations

**Red Zone** (Action Required):
- File size: >500 lines (production blocker)
- Function size: >100 lines
- Cyclomatic complexity: >15
- Test coverage: <60%
- Critical ESLint errors
- Major architectural violations

### Quality Gate Enforcement

**Mandatory Before Merge**:
1. All ESLint errors resolved
2. Files under 500 lines
3. Test coverage >80% for new code
4. No critical architectural violations
5. All tests passing
6. Code review approved

**Automated Checks**:
- Pre-commit hooks run lint and basic tests
- CI pipeline runs full quality checks
- Pull requests blocked if quality gates fail
- Architecture validation on every commit

---

## Best Practices Summary

### DO:
✅ Keep functions under 50 lines when possible
✅ Keep files under 300 lines
✅ Use descriptive variable and function names
✅ Import from infrastructure and ERP core
✅ Document complex algorithms
✅ Use ESLint and fix all errors
✅ Run quality checks before committing
✅ Follow naming conventions consistently
✅ Use absolute paths with aliases

### DON'T:
❌ Create files >500 lines (production blocker)
❌ Use abbreviations in variable names
❌ Duplicate infrastructure functionality
❌ Use raw HTML elements instead of components
❌ Hardcode colors or spacing values
❌ Skip documentation for complex code
❌ Ignore ESLint warnings
❌ Commit code without running quality checks
❌ Use relative paths excessively

---

**Last Updated**: 2025-11-07
**Version**: 1.0
**Maintained By**: Development Team
