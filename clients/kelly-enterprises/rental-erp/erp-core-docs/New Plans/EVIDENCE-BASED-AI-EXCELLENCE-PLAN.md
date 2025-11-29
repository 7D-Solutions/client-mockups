# Evidence-Based AI Excellence Plan - Fire-Proof ERP

**Date**: November 7, 2025
**Codebase**: 74,964 lines (382 files)
**Current Health**: 72/100
**Target Health**: 90/100
**Total Effort**: 290,000 tokens (18 weeks)
**Philosophy**: AI-optimized quality without waste

---

## Executive Summary

This plan represents the **evidence-based middle ground** between minimal pragmatism (165K tokens) and gold-standard perfectionism (843K tokens). Every investment is justified by agent analysis, industry benchmarks, and actual codebase evidence.

### What Makes This "AI Excellence"

**Optimizes for AI Strengths**:
- ✅ Comprehensive test coverage (AI refactors confidently)
- ✅ Complete type safety (AI has full type information)
- ✅ Essential observability (AI knows where problems are)
- ✅ Clean separation of concerns (AI navigates easily)

**Skips AI-Irrelevant Work**:
- ❌ Controller extraction (extra indirection)
- ❌ Excessive file splitting (AI reads large files fine)
- ❌ Documentation overhead (AI reads code directly)
- ❌ Enterprise monitoring (inappropriate for <10 users)

### Key Metrics

| Metric | Current | Target | Investment |
|--------|---------|--------|------------|
| Health Score | 72/100 | 90/100 | 290K tokens |
| Frontend Tests | 0% | 60% | 50K tokens |
| Backend Tests | 58.7% | 75% | 20K tokens |
| Security Score | 75/100 | 95/100 | 40K tokens |
| Files >800 lines | 4 | 0 | 30K tokens |
| Critical `any` types | 222 | 122 | 40K tokens |

---

## Plan Comparison

| Plan | Tokens | Timeline | Health | Philosophy |
|------|--------|----------|--------|------------|
| Emergency | 47K | 4 weeks | 78/100 | Critical fixes only |
| Pragmatic | 165K | 12 weeks | 85/100 | Cost-efficient |
| **AI Excellence** | **290K** | **18 weeks** | **90/100** | **Evidence-based quality** |
| Original "AI Excellence" | 680K | 30 weeks | 90/100 | Over-invested |
| Gold Standard | 843K | 42 weeks | 95/100 | Perfectionism |

**Why 290K is Right**:
- Invests MORE than pragmatic in testing, security, observability
- Saves 390K tokens vs original by skipping waste (controllers, visual tests, enterprise monitoring)
- Achieves 90/100 health (vs 95/100 diminishing returns)
- 18 weeks vs 42 weeks timeline

---

## Phase Breakdown

### Phase 0: Infrastructure Setup (10K tokens, Week 1)

**Why Critical**: Foundation for all subsequent work

#### 0.1 Package Dependencies (3K tokens)
```bash
# Security
npm install csurf helmet express-rate-limit

# Validation
npm install joi

# Caching
npm install redis ioredis

# Testing
npm install --save-dev @testing-library/user-event msw
```

#### 0.2 Environment Configuration (2K tokens)
```bash
# .env additions
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

CSRF_SECRET=generate-random-secret
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

NODE_ENV=development
```

#### 0.3 TypeScript Configuration (3K tokens)
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@modules/*": ["./src/modules/*"]
    }
  }
}
```

#### 0.4 Database Migration Infrastructure (2K tokens)
```javascript
// backend/migrations/runner.js
const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../src/infrastructure/database/connection');

async function runMigrations() {
  // Create migrations table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Read and execute migrations in order
  const migrationFiles = await fs.readdir(__dirname);
  // Implementation...
}

module.exports = { runMigrations };
```

**Deliverables**:
- All dependencies installed and working
- Environment variables configured
- TypeScript strict mode enabled
- Migration infrastructure ready

---

### Phase 1: Security Gold Standard (40K tokens, Week 1-2)

**Why Comprehensive**: With quality focus, fix ALL security issues now

#### 1.1 Password Logging Removal (500 tokens)
```javascript
// backend/src/infrastructure/database/connection.js:45
// BEFORE
console.log('Database config:', { host, port, user, password, database });

// AFTER
console.log('Database config:', { host, port, user, database });
// NEVER log password
```

**Audit entire codebase**:
```bash
grep -r "password" backend/src/ | grep -i "log\|console"
```

#### 1.2 CSRF Protection with Comprehensive Tests (6K tokens)
```javascript
// backend/src/infrastructure/middleware/csrf.js
const csrf = require('csurf');
const csrfProtection = csrf({
  cookie: true,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production'
});

module.exports = { csrfProtection };
```

**Frontend integration**:
```typescript
// frontend/src/infrastructure/api/client.ts
import { apiClient } from './apiClient';

// Add CSRF token interceptor
apiClient.interceptors.request.use(async (config) => {
  const csrfToken = getCsrfToken(); // From cookie
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

**Test suite** (3K tokens):
```javascript
// backend/tests/integration/csrf.test.js
describe('CSRF Protection', () => {
  test('Rejects POST without CSRF token', async () => {
    const res = await request(app)
      .post('/api/gauges/v2/create')
      .send({ name: 'Test' })
      .expect(403);

    expect(res.body.error).toContain('CSRF');
  });

  test('Accepts POST with valid CSRF token', async () => {
    const token = await getCsrfToken();
    const res = await request(app)
      .post('/api/gauges/v2/create')
      .set('X-CSRF-Token', token)
      .send({ name: 'Test' })
      .expect(201);
  });
});
```

#### 1.3 Joi Validation for ALL Endpoints (15K tokens)
```javascript
// backend/src/infrastructure/validation/schemas/gaugeSchemas.js
const Joi = require('joi');

const createGaugeSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  serialNumber: Joi.string().pattern(/^[A-Z0-9-]+$/).required(),
  type: Joi.string().valid('ID', 'OD', 'Thread', 'Height').required(),
  size: Joi.number().positive().required(),
  manufacturer: Joi.string().max(100).optional(),
  // ... all fields with proper validation
});

module.exports = { createGaugeSchema };
```

**Validation middleware**:
```javascript
// backend/src/infrastructure/middleware/validate.js
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    req.body = value; // Use validated/sanitized data
    next();
  };
};
```

**Apply to all endpoints** (15K covers 50+ endpoints):
- Gauge creation, update, deletion
- User management
- Admin operations
- Inventory operations
- Authentication endpoints

#### 1.4 Rate Limiting with Redis (5K tokens)
```javascript
// backend/src/infrastructure/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

const apiLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Stricter for auth endpoints
  message: 'Too many authentication attempts'
});

module.exports = { apiLimiter, authLimiter };
```

#### 1.5 Security Headers + Full CSP (3K tokens)
```javascript
// backend/src/infrastructure/middleware/securityHeaders.js
const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

module.exports = { securityHeaders };
```

#### 1.6 Security Audit Logging (5K tokens)
```javascript
// backend/src/infrastructure/audit/securityAuditService.js
class SecurityAuditService {
  async logSecurityEvent(event) {
    const entry = {
      timestamp: new Date(),
      event_type: event.type, // 'auth_failure', 'csrf_violation', 'rate_limit'
      user_id: event.userId,
      ip_address: event.ip,
      user_agent: event.userAgent,
      details: event.details,
      severity: event.severity // 'low', 'medium', 'high', 'critical'
    };

    await pool.query(
      'INSERT INTO security_audit_log SET ?',
      entry
    );

    if (entry.severity === 'critical') {
      await this.alertAdmins(entry);
    }
  }
}
```

#### 1.7 Penetration Testing Suite (6K tokens)
```javascript
// backend/tests/security/penetration.test.js
describe('Security Penetration Tests', () => {
  describe('SQL Injection', () => {
    test('Rejects SQL injection in gauge search', async () => {
      const malicious = "'; DROP TABLE gauges; --";
      const res = await request(app)
        .get(`/api/gauges/v2/search?name=${malicious}`)
        .expect(200);

      // Should NOT execute SQL injection
      expect(res.body.success).toBe(true);
      // Verify gauges table still exists
      const gauges = await pool.query('SELECT COUNT(*) FROM gauges');
      expect(gauges[0]['COUNT(*)']).toBeGreaterThan(0);
    });
  });

  describe('XSS Prevention', () => {
    test('Sanitizes XSS in gauge name', async () => {
      const xss = '<script>alert("XSS")</script>';
      const res = await request(app)
        .post('/api/gauges/v2/create')
        .send({ name: xss, /* other fields */ })
        .expect(201);

      expect(res.body.data.name).not.toContain('<script>');
    });
  });

  describe('Authentication Bypass', () => {
    test('Cannot access admin routes without admin role', async () => {
      const userToken = await getTokenForRole('user');
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // Additional tests: CSRF bypass, rate limit bypass, session hijacking
});
```

**Deliverables**:
- Zero password logging
- CSRF protection on all state-changing endpoints
- Joi validation on 50+ endpoints
- Rate limiting active (Redis-backed)
- Security headers + CSP configured
- Security audit logging operational
- Penetration test suite passing

---

### Phase 1.5: Test Safety Net (50K tokens, Week 2-5)

**Why Critical**: Tests BEFORE refactoring prevent breaking changes

**Philosophy**: Focus on critical paths and realistic coverage, not exhaustive testing

#### 1.5.1 Frontend Critical Path Tests (15K tokens)

**Infrastructure Components** (5K tokens):
```typescript
// frontend/tests/unit/infrastructure/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../../src/infrastructure/components/Button';

describe('Button Component', () => {
  test('Prevents double-click submission', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Submit</Button>);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button); // Second click should be ignored

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('Shows loading state during async operation', async () => {
    const slowClick = () => new Promise(resolve => setTimeout(resolve, 1000));
    render(<Button onClick={slowClick}>Submit</Button>);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

**Core Pages** (7K tokens):
```typescript
// frontend/tests/integration/gauge/GaugeList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { GaugeList } from '../../../src/modules/gauge/pages/GaugeList';
import { server } from '../../mocks/server';

describe('GaugeList Page', () => {
  test('Displays gauges from API', async () => {
    render(<GaugeList />);

    await waitFor(() => {
      expect(screen.getByText('Gauge A')).toBeInTheDocument();
      expect(screen.getByText('Gauge B')).toBeInTheDocument();
    });
  });

  test('Handles API errors gracefully', async () => {
    server.use(gaugeErrorHandler);
    render(<GaugeList />);

    await waitFor(() => {
      expect(screen.getByText(/error loading gauges/i)).toBeInTheDocument();
    });
  });

  test('Filters gauges by search', async () => {
    render(<GaugeList />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Gauge A' } });

    await waitFor(() => {
      expect(screen.getByText('Gauge A')).toBeInTheDocument();
      expect(screen.queryByText('Gauge B')).not.toBeInTheDocument();
    });
  });
});
```

**API Client** (3K tokens):
```typescript
// frontend/tests/unit/infrastructure/apiClient.test.ts
import { apiClient } from '../../../src/infrastructure/api/client';
import { server } from '../../mocks/server';

describe('API Client', () => {
  test('Adds auth headers automatically', async () => {
    localStorage.setItem('token', 'test-token');

    const request = await apiClient.get('/api/gauges/v2');
    expect(request.config.headers.Authorization).toBe('Bearer test-token');
  });

  test('Refreshes token on 401', async () => {
    // Test token refresh logic
  });

  test('Handles network errors', async () => {
    server.use(networkErrorHandler);

    await expect(apiClient.get('/api/gauges/v2')).rejects.toThrow();
  });
});
```

#### 1.5.2 Backend Route Tests (20K tokens)

**All Gauge Routes** (8K tokens):
```javascript
// backend/tests/integration/gauge/gauges-v2.test.js
describe('Gauge V2 API', () => {
  describe('POST /api/gauges/v2/create', () => {
    test('Creates gauge with valid data', async () => {
      const gaugeData = {
        name: 'Test Gauge',
        serialNumber: 'TG-001',
        type: 'ID',
        size: 1.5
      };

      const res = await request(app)
        .post('/api/gauges/v2/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(gaugeData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });

    test('Rejects invalid gauge type', async () => {
      const invalidData = {
        name: 'Test',
        serialNumber: 'TG-001',
        type: 'INVALID',
        size: 1.5
      };

      const res = await request(app)
        .post('/api/gauges/v2/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(res.body.errors).toBeDefined();
    });

    test('Requires authentication', async () => {
      await request(app)
        .post('/api/gauges/v2/create')
        .send({})
        .expect(401);
    });
  });

  // 17 endpoints × ~15 tests each = comprehensive coverage
});
```

**Admin Routes** (6K tokens):
```javascript
// backend/tests/integration/admin/users.test.js
describe('Admin User Management API', () => {
  test('Creates user with valid data', async () => {
    // Test implementation
  });

  test('Enforces RBAC for admin routes', async () => {
    const userToken = await getTokenForRole('user');
    await request(app)
      .post('/api/admin/users/create')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  // All admin endpoints tested
});
```

**Inventory Routes** (6K tokens):
```javascript
// backend/tests/integration/inventory/locations.test.js
describe('Inventory Location API', () => {
  test('Creates storage location', async () => {
    // Test implementation
  });

  test('Updates location capacity', async () => {
    // Test implementation
  });

  // All inventory endpoints tested
});
```

#### 1.5.3 Repository Tests (10K tokens)

**Critical CRUD Operations**:
```javascript
// backend/tests/modules/gauge/repositories/GaugeRepository.test.js
describe('GaugeRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new GaugeRepository();
  });

  describe('create', () => {
    test('Inserts gauge and returns ID', async () => {
      const gaugeData = { name: 'Test', /* ... */ };
      const id = await repository.create(gaugeData);

      expect(id).toBeGreaterThan(0);

      const gauge = await repository.findById(id);
      expect(gauge.name).toBe('Test');
    });

    test('Throws on duplicate serial number', async () => {
      await repository.create({ serialNumber: 'DUPLICATE' });
      await expect(
        repository.create({ serialNumber: 'DUPLICATE' })
      ).rejects.toThrow(/duplicate/i);
    });
  });

  describe('update', () => {
    test('Updates gauge fields', async () => {
      const id = await repository.create({ name: 'Original' });
      await repository.update(id, { name: 'Updated' });

      const gauge = await repository.findById(id);
      expect(gauge.name).toBe('Updated');
    });
  });

  // Test all repository methods
});
```

#### 1.5.4 Integration Tests (5K tokens)

**Critical User Workflows**:
```javascript
// backend/tests/integration/workflows/gauge-lifecycle.test.js
describe('Gauge Lifecycle Workflow', () => {
  test('Complete gauge lifecycle: create → checkout → return → calibrate', async () => {
    // 1. Create gauge
    const createRes = await request(app)
      .post('/api/gauges/v2/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(gaugeData);

    const gaugeId = createRes.body.data.id;

    // 2. Checkout gauge
    await request(app)
      .post(`/api/gauges/v2/${gaugeId}/checkout`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    // 3. Return gauge
    await request(app)
      .post(`/api/gauges/v2/${gaugeId}/return`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    // 4. Send for calibration
    await request(app)
      .post(`/api/gauges/v2/${gaugeId}/calibrate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Verify final state
    const finalState = await request(app)
      .get(`/api/gauges/v2/${gaugeId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(finalState.body.data.status).toBe('calibration');
  });
});
```

**Coverage Validation**:
```bash
# Run coverage report
npm run test:coverage

# Frontend target: 60% (realistic from 0%)
# Backend target: 75% (from 58.7%)
```

**Deliverables**:
- Frontend: 60% coverage (infrastructure, critical pages, API client)
- Backend: 75% coverage (all routes, repositories, workflows)
- Integration tests for critical user journeys
- Tests protect 4-7 files scheduled for refactoring

---

### Phase 2A: Evidence-Based File Organization (30K tokens, Week 6-8)

**Why 4-7 Files**: Agent analysis identified actual "worst files" based on size, complexity, churn rate

**Files to Split** (evidence-based):

#### 2A.1 gauges-v2.js (1,087 lines) → 4 files (8K tokens)

**Evidence**:
- 17 REST endpoints in single file
- 25 commits in 3 months (highest churn)
- Mixed responsibilities: validation, business logic, error handling

**Split Strategy**:
```
gauges-v2.js (1,087 lines) →
  ├─ gauge-creation.routes.js (~300 lines)
  ├─ gauge-sets.routes.js (~300 lines)
  ├─ gauge-spares.routes.js (~250 lines)
  └─ gauge-management.routes.js (~237 lines)
```

**After Split**:
```javascript
// backend/src/modules/gauge/routes/gauge-creation.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { validate } = require('../../../infrastructure/middleware/validate');
const { createGaugeSchema } = require('../../../infrastructure/validation/schemas/gaugeSchemas');
const GaugeCreationService = require('../services/GaugeCreationService');

// POST /api/gauges/v2/create
router.post('/create',
  authenticateToken,
  validate(createGaugeSchema),
  async (req, res) => {
    const service = new GaugeCreationService();
    const gauge = await service.createGauge(req.body, req.user.id);
    res.status(201).json({ success: true, data: gauge });
  }
);

// Additional creation-related endpoints
module.exports = router;
```

**Keep inline handlers** - AI agents confirmed service layer provides sufficient separation.

#### 2A.2 AdminRepository.js (965 lines, 99 methods) → 4 repositories (10K tokens)

**Evidence**:
- 99 methods in single class (god class anti-pattern)
- Mixed concerns: users, roles, permissions, audit

**Split Strategy**:
```
AdminRepository.js (965 lines, 99 methods) →
  ├─ UserRepository.js (~250 lines, 25 methods)
  ├─ RoleRepository.js (~200 lines, 20 methods)
  ├─ PermissionRepository.js (~280 lines, 28 methods)
  └─ AuditRepository.js (~235 lines, 26 methods)
```

**After Split**:
```javascript
// backend/src/modules/admin/repositories/UserRepository.js
class UserRepository {
  async create(userData) {
    const result = await pool.query('INSERT INTO users SET ?', userData);
    return result.insertId;
  }

  async findById(id) {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return users[0];
  }

  async findByUsername(username) {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return users[0];
  }

  async update(id, userData) {
    await pool.query('UPDATE users SET ? WHERE id = ?', [userData, id]);
  }

  async delete(id) {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
  }

  // User-specific methods only (~25 total)
}

module.exports = UserRepository;
```

#### 2A.3 CertificateService.js (953 lines, 58 methods) → 3 services (8K tokens)

**Evidence**:
- File I/O + business logic + external service integration
- Tight coupling between certificate operations and Dropbox storage

**Split Strategy**:
```
CertificateService.js (953 lines, 58 methods) →
  ├─ CertificateUploadService.js (~320 lines)
  ├─ CertificateStorageService.js (~315 lines) // Dropbox integration
  └─ CertificateNamingService.js (~318 lines)
```

#### 2A.4 GaugeSetService.js (815 lines, 54 methods) → 3 services (7K tokens)

**Evidence**:
- Complex gauge set lifecycle management
- 54 methods managing set operations

**Split Strategy**:
```
GaugeSetService.js (815 lines, 54 methods) →
  ├─ GaugeSetCreationService.js (~270 lines)
  ├─ GaugeSetPairingService.js (~275 lines)
  └─ GaugeSetLifecycleService.js (~270 lines)
```

#### 2A.5-2A.7 Optional Borderline Files (7K tokens)

**If resources allow**:
- GaugeCheckoutService.js (738 lines) → Monitor, split if crosses 800
- permissions.js (655 lines) → Acceptable for now
- GaugeModalManager.tsx (1,218 lines) → Frontend, lower priority

**Refactoring Process** (CRITICAL - CLAUDE.md requirements):
1. Read file completely
2. Create new split files
3. Update imports/exports
4. Run ESLint validation
5. **Restart Docker containers** (MANDATORY for backend changes)
6. Run Phase 1.5 tests for this module
7. Manual API smoke test
8. Git commit

**Deliverables**:
- 4 critical files split (gauges-v2, AdminRepository, CertificateService, GaugeSetService)
- 0 files >800 lines
- All Phase 1.5 tests still passing
- Docker containers restarted and verified

---

### Phase 2B: Strategic Refactoring (30K tokens, Week 9-11)

**Why Reduced**: Focus on real problems, skip perfectionism

#### 2B.1 React Error Boundaries (10K tokens)

**Implementation**:
```typescript
// frontend/src/infrastructure/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error tracking service
    console.error('Error boundary caught:', error, errorInfo);

    // Send to backend audit log
    fetch('/api/frontend-errors', {
      method: 'POST',
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <p>We've been notified and are looking into it.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Apply to all modules**:
```typescript
// frontend/src/modules/gauge/routes.tsx
import { ErrorBoundary } from '../../infrastructure/components/ErrorBoundary';

export const gaugeRoutes = [
  {
    path: '/gauges',
    element: (
      <ErrorBoundary>
        <GaugeList />
      </ErrorBoundary>
    )
  }
];
```

#### 2B.2 Modal Abstraction (5K tokens)

**Consolidate modal patterns**:
```typescript
// frontend/src/infrastructure/components/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  size?: 'small' | 'medium' | 'large';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'medium'
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content modal-${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-footer">{actions}</div>}
      </div>
    </div>
  );
};
```

#### 2B.3 Targeted Duplication Elimination (10K tokens)

**Focus on high-impact duplication only**:
- Gauge status formatting (used 15+ places)
- Date formatting utilities (used 20+ places)
- Permission checking logic (used 10+ places)

**Example**:
```typescript
// frontend/src/infrastructure/utils/gaugeFormatters.ts
export const formatGaugeStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'available': 'Available',
    'checked_out': 'Checked Out',
    'calibration': 'In Calibration',
    'maintenance': 'In Maintenance',
    'retired': 'Retired'
  };
  return statusMap[status] || status;
};

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'available': 'green',
    'checked_out': 'blue',
    'calibration': 'orange',
    'maintenance': 'yellow',
    'retired': 'gray'
  };
  return colorMap[status] || 'gray';
};
```

#### 2B.4 Design System Foundation (5K tokens)

**Basic CSS tokens**:
```css
/* frontend/src/infrastructure/styles/tokens.css */
:root {
  /* Colors */
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Typography */
  --font-family: system-ui, -apple-system, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
}
```

**Deliverables**:
- Error boundaries on all module routes
- Centralized Modal component (replaces 16 window.confirm)
- High-impact duplication eliminated
- Basic design tokens defined

---

### Phase 2.5: UI Excellence (17K tokens, Week 12)

#### 2.5.1 Replace window.confirm with Modal (9K tokens)

**Find all instances**:
```bash
grep -r "window.confirm" frontend/src/
# Expected: 16 instances
```

**Replace pattern**:
```typescript
// BEFORE
if (window.confirm('Are you sure you want to delete this gauge?')) {
  await deleteGauge(id);
}

// AFTER
import { useConfirmModal } from '../../infrastructure/hooks/useConfirmModal';

const { ConfirmModal, confirm } = useConfirmModal();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Delete Gauge',
    message: 'Are you sure you want to delete this gauge?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger'
  });

  if (confirmed) {
    await deleteGauge(id);
  }
};

// Render
<>
  <button onClick={handleDelete}>Delete</button>
  <ConfirmModal />
</>
```

#### 2.5.2 Basic ARIA Labels (3K tokens)

**Add to forms**:
```typescript
// frontend/src/modules/admin/components/UserForm.tsx
<form aria-label="User management form">
  <FormInput
    label="Username"
    name="username"
    value={username}
    onChange={setUsername}
    aria-required="true"
    aria-invalid={errors.username ? "true" : "false"}
    aria-describedby={errors.username ? "username-error" : undefined}
  />
  {errors.username && (
    <span id="username-error" role="alert">
      {errors.username}
    </span>
  )}
</form>
```

**Add to interactive elements**:
- All buttons have descriptive labels
- All form inputs have labels
- All images have alt text
- All icons have aria-label

#### 2.5.3 Server-Side Pagination (5K tokens)

**Backend implementation**:
```javascript
// backend/src/modules/gauge/routes/gauges-v2.routes.js
router.get('/list', authenticateToken, async (req, res) => {
  const { page = 1, limit = 50, sortBy = 'created_at', order = 'DESC' } = req.query;

  const offset = (page - 1) * limit;

  const [gauges] = await pool.query(
    `SELECT * FROM gauges
     ORDER BY ${sortBy} ${order}
     LIMIT ? OFFSET ?`,
    [parseInt(limit), offset]
  );

  const [countResult] = await pool.query('SELECT COUNT(*) as total FROM gauges');
  const total = countResult[0].total;

  res.json({
    success: true,
    data: gauges,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});
```

**Frontend implementation**:
```typescript
// frontend/src/modules/gauge/pages/GaugeList.tsx
const [page, setPage] = useState(1);
const [limit] = useState(50);

const { data, loading } = useQuery({
  queryKey: ['gauges', page, limit],
  queryFn: () => apiClient.get(`/api/gauges/v2/list?page=${page}&limit=${limit}`)
});

return (
  <div>
    <GaugeTable gauges={data?.data} />
    <Pagination
      currentPage={page}
      totalPages={data?.pagination.totalPages}
      onPageChange={setPage}
    />
  </div>
);
```

**Deliverables**:
- Zero window.confirm violations (16 replaced with Modal)
- Basic ARIA labels on all forms and interactive elements
- Server-side pagination on large tables (gauges, inventory)

---

### Phase 3: Realistic Test Coverage (70K tokens, Week 13-16)

**Philosophy**: 60%/75% is sweet spot, 80%+ is diminishing returns

#### 3.1 Frontend Testing: 0% → 60% (50K tokens)

**Unit Tests for Infrastructure** (15K tokens):
```typescript
// All infrastructure components tested
// - Button, FormInput, FormCheckbox, FormTextarea
// - Modal, ErrorBoundary
// - API client, auth service
// - Utility functions
```

**Integration Tests for Critical Workflows** (20K tokens):
```typescript
// frontend/tests/integration/gauge-workflow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../../src/App';

describe('Gauge Management Workflow', () => {
  test('User can create, search, and view gauge', async () => {
    render(<App />);

    // Login
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/gauge list/i)).toBeInTheDocument();
    });

    // Create gauge
    fireEvent.click(screen.getByRole('button', { name: /create gauge/i }));
    // ... fill form
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/gauge created/i)).toBeInTheDocument();
    });

    // Search for created gauge
    // ... verify it appears
  });
});
```

**E2E Tests for Critical Paths** (15K tokens):
```typescript
// frontend/tests/e2e/admin-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('Admin can manage users', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'admin123');
  await page.click('button:has-text("Login")');

  await expect(page).toHaveURL('/dashboard');

  await page.click('a:has-text("Admin")');
  await page.click('a:has-text("Users")');

  await page.click('button:has-text("Create User")');
  await page.fill('[name="username"]', 'newuser');
  await page.fill('[name="email"]', 'newuser@example.com');
  await page.click('button:has-text("Submit")');

  await expect(page.getByText('User created successfully')).toBeVisible();
});
```

**Coverage Breakdown**:
- Infrastructure components: 80%
- Core pages (GaugeList, LocationDetail, UserManagement): 70%
- Secondary pages: 50%
- Utilities: 60%
- Overall: 60% average

#### 3.2 Backend Testing: 58.7% → 75% (20K tokens)

**Additional Route Coverage** (8K tokens):
- Complete all endpoints not covered in Phase 1.5
- Focus on error paths (400s, 500s)
- Authentication/authorization edge cases

**Service Layer Testing** (7K tokens):
```javascript
// backend/tests/modules/gauge/services/GaugeCreationService.test.js
describe('GaugeCreationService', () => {
  let service;

  beforeEach(() => {
    service = new GaugeCreationService();
  });

  test('Creates gauge with valid data', async () => {
    const gauge = await service.createGauge(validData, userId);
    expect(gauge.id).toBeDefined();
  });

  test('Validates duplicate serial number', async () => {
    await service.createGauge({ serialNumber: 'DUP-001' }, userId);
    await expect(
      service.createGauge({ serialNumber: 'DUP-001' }, userId)
    ).rejects.toThrow(/duplicate/i);
  });

  test('Audits gauge creation', async () => {
    await service.createGauge(validData, userId);

    const auditLogs = await pool.query(
      'SELECT * FROM audit_log WHERE entity_type = ? AND action = ?',
      ['gauge', 'create']
    );

    expect(auditLogs.length).toBeGreaterThan(0);
  });
});
```

**Middleware Testing** (5K tokens):
```javascript
// backend/tests/infrastructure/middleware/auth.test.js
describe('Authentication Middleware', () => {
  test('Accepts valid JWT token', async () => {
    const token = generateValidToken();
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });

  test('Rejects expired token', async () => {
    const expiredToken = generateExpiredToken();
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

**Coverage Breakdown**:
- Routes: 80%
- Services: 75%
- Repositories: 80%
- Middleware: 70%
- Utilities: 65%
- Overall: 75% average

**Deliverables**:
- Frontend coverage: 0% → 60%
- Backend coverage: 58.7% → 75%
- E2E tests for critical workflows
- CI/CD integration for automated testing

---

### Phase 4: Pragmatic Type Safety (40K tokens, Week 17-18)

**Philosophy**: Fix critical/high-risk `any` types, defer low-risk

#### 4.1 Critical Type Fixes (15K tokens)

**API Response Types**:
```typescript
// frontend/src/types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Gauge {
  id: number;
  name: string;
  serialNumber: string;
  type: 'ID' | 'OD' | 'Thread' | 'Height';
  size: number;
  manufacturer?: string;
  status: 'available' | 'checked_out' | 'calibration' | 'maintenance' | 'retired';
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Replace critical `any` types**:
```typescript
// BEFORE
const handleSubmit = async (data: any) => {
  const response: any = await apiClient.post('/api/gauges/v2/create', data);
  return response.data;
};

// AFTER
const handleSubmit = async (data: CreateGaugeRequest): Promise<Gauge> => {
  const response = await apiClient.post<ApiResponse<Gauge>>(
    '/api/gauges/v2/create',
    data
  );
  return response.data.data;
};
```

#### 4.2 High-Priority Type Fixes (15K tokens)

**Event Handlers**:
```typescript
// BEFORE
const handleChange = (e: any) => {
  setValue(e.target.value);
};

// AFTER
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};
```

**Component Props**:
```typescript
// BEFORE
interface GaugeListProps {
  gauges: any[];
  onSelect: any;
}

// AFTER
interface GaugeListProps {
  gauges: Gauge[];
  onSelect: (gauge: Gauge) => void;
}
```

#### 4.3 Type Utilities (5K tokens)

**Generic Helpers**:
```typescript
// frontend/src/types/utils.ts
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<ApiResponse<T>>;

export type FormErrors<T> = Partial<Record<keyof T, string>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

#### 4.4 Strict Mode Enforcement (5K tokens)

**Update tsconfig.json** (already done in Phase 0)

**Fix strict mode violations**:
```typescript
// Fix non-null assertions
// BEFORE
const user = users.find(u => u.id === id)!;

// AFTER
const user = users.find(u => u.id === id);
if (!user) throw new Error('User not found');

// Fix optional chaining
// BEFORE
const name = user.profile.name;

// AFTER
const name = user?.profile?.name ?? 'Unknown';
```

**Deliverables**:
- 100 critical/high-risk `any` types fixed (from 222 total)
- API response types defined
- Component prop types complete
- Type utilities for common patterns
- 122 low-risk `any` types deferred to future phase

---

### Phase 5: Essential Observability (12K tokens, Week 18)

**Philosophy**: Debuggability over enterprise monitoring

#### 5.1 Structured Logging (6K tokens)

**Winston Logger Setup**:
```javascript
// backend/src/infrastructure/logging/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'fire-proof-erp' },
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/combined.log')
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

**Request Logging Middleware**:
```javascript
// backend/src/infrastructure/middleware/requestLogger.js
const logger = require('../logging/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      ip: req.ip
    });

    if (duration > 1000) {
      logger.warn('Slow Request', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`
      });
    }
  });

  next();
};

module.exports = requestLogger;
```

#### 5.2 Basic Error Tracking (3K tokens)

**Centralized Error Handler**:
```javascript
// backend/src/infrastructure/middleware/errorHandler.js
const logger = require('../logging/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Application Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    body: req.body
  });

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
```

**Frontend Error Tracking**:
```typescript
// frontend/src/infrastructure/api/errorReporter.ts
export const reportError = async (error: Error, context?: Record<string, any>) => {
  try {
    await fetch('/api/frontend-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        context
      })
    });
  } catch (e) {
    // Fail silently - don't break app if error reporting fails
    console.error('Failed to report error:', e);
  }
};
```

#### 5.3 Critical Alerting (3K tokens)

**Railway Log-Based Alerts**:
```javascript
// backend/src/infrastructure/alerts/alertService.js
const logger = require('../logging/logger');
const { sendEmail } = require('../notifications/NotificationService');

class AlertService {
  async alertCriticalError(error, context) {
    logger.error('CRITICAL ERROR', { error, context });

    if (process.env.NODE_ENV === 'production') {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `[CRITICAL] Fire-Proof ERP Error: ${error.message}`,
        body: `
          Error: ${error.message}
          Stack: ${error.stack}
          Context: ${JSON.stringify(context, null, 2)}
          Time: ${new Date().toISOString()}
        `
      });
    }
  }

  async alertDatabaseFailure(error) {
    await this.alertCriticalError(error, { type: 'database_failure' });
  }

  async alertAuthenticationFailure(userId, reason) {
    logger.warn('Authentication Failure', { userId, reason });

    // Track failed attempts
    const failedAttempts = await this.getFailedAttempts(userId);

    if (failedAttempts > 5) {
      await this.alertCriticalError(
        new Error('Multiple authentication failures'),
        { userId, attempts: failedAttempts }
      );
    }
  }
}

module.exports = new AlertService();
```

**Deliverables**:
- Winston structured logging (JSON format)
- Request/response logging middleware
- Centralized error handler
- Frontend error reporting
- Critical alerting via email (Railway logs + NotificationService)
- **NO Sentry, RUM, Lighthouse CI, APM** (inappropriate for <10 users)

---

### Deployment Automation (11K tokens, Week 18)

**Philosophy**: Pragmatic automation, not enterprise DevOps

#### Basic CI/CD (5K tokens)

**GitHub Actions Workflow**:
```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [production-v1]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci

      - name: Run backend tests
        run: cd backend && npm test

      - name: Run frontend tests
        run: cd frontend && npm test

      - name: Check test coverage
        run: |
          cd backend && npm run test:coverage
          cd ../frontend && npm run test:coverage

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

#### Migration Procedures (3K tokens)

**Migration Workflow**:
```javascript
// backend/scripts/migrate.js
const { runMigrations } = require('../migrations/runner');

async function migrate() {
  console.log('Running database migrations...');

  try {
    await runMigrations();
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
```

**Railway deployment hook**:
```json
// package.json
{
  "scripts": {
    "railway:build": "npm run build",
    "railway:deploy": "node backend/scripts/migrate.js && npm start"
  }
}
```

#### Rollback Automation (3K tokens)

**Railway rollback script**:
```bash
#!/bin/bash
# scripts/rollback.sh

echo "Rolling back to previous deployment..."

# Get previous deployment ID from Railway
PREVIOUS_DEPLOYMENT=$(railway deployments list --json | jq -r '.[1].id')

# Rollback
railway rollback $PREVIOUS_DEPLOYMENT

echo "Rollback complete. Verifying..."
railway logs --tail 50
```

**Database rollback**:
```javascript
// backend/scripts/rollback-migration.js
async function rollbackMigration(migrationName) {
  // Execute rollback SQL
  await pool.query(
    'DELETE FROM migrations WHERE name = ?',
    [migrationName]
  );

  // Execute DOWN migration if exists
  const rollbackSQL = await fs.readFile(
    `migrations/${migrationName}.down.sql`,
    'utf-8'
  );

  await pool.query(rollbackSQL);
}
```

**Deliverables**:
- GitHub Actions CI/CD pipeline
- Automated testing before deploy
- Migration automation
- Rollback procedures (Railway + database)
- **NO blue-green deployment, feature flags initially** (add if needed)

---

## Success Criteria

### Week 1 (After Phase 0-1)
- [ ] All dependencies installed (csurf, helmet, joi, redis, msw)
- [ ] TypeScript strict mode enabled
- [ ] Zero password logging in code
- [ ] CSRF middleware active on all state-changing endpoints
- [ ] Joi validation on 50+ endpoints
- [ ] Rate limiting operational (Redis-backed)
- [ ] Security headers + CSP configured
- [ ] Penetration test suite passing

### Week 5 (After Phase 1.5)
- [ ] Frontend test coverage: 0% → 60%
- [ ] Backend test coverage: 58.7% → 75%
- [ ] All infrastructure components tested
- [ ] Critical user workflows have E2E tests
- [ ] Integration tests for gauge lifecycle
- [ ] All tests passing (baseline for refactoring)

### Week 8 (After Phase 2A)
- [ ] 4 critical files split (gauges-v2, AdminRepository, CertificateService, GaugeSetService)
- [ ] Zero files >800 lines
- [ ] All Phase 1.5 tests still passing
- [ ] Docker containers restarted and verified
- [ ] Git commits for each file split

### Week 11 (After Phase 2B-2.5)
- [ ] Error boundaries on all module routes
- [ ] Zero window.confirm violations (16 replaced)
- [ ] Basic ARIA labels on all forms
- [ ] Server-side pagination on large tables
- [ ] High-impact duplication eliminated
- [ ] All tests still passing

### Week 16 (After Phase 3)
- [ ] Frontend coverage: 60% (realistic from 0% baseline)
- [ ] Backend coverage: 75% (industry standard)
- [ ] E2E tests for critical workflows
- [ ] CI/CD pipeline operational
- [ ] Test suite runs in <5 minutes

### Week 18 (After Phase 4-5 + Deployment)
- [ ] 100 critical/high-risk `any` types fixed
- [ ] API response types defined
- [ ] Structured logging operational (Winston)
- [ ] Error tracking active (frontend + backend)
- [ ] Critical alerting configured (Railway logs + email)
- [ ] GitHub Actions CI/CD pipeline
- [ ] Migration automation working
- [ ] Rollback procedures documented and tested

### Final Health Score
- [ ] Overall health: 72/100 → 90/100
- [ ] Security score: 75/100 → 95/100
- [ ] Test coverage: Frontend 60%, Backend 75%
- [ ] Zero critical security vulnerabilities
- [ ] Zero files >800 lines
- [ ] Production-ready observability

---

## Implementation Guidelines

### Daily Workflow

1. **Start of day**: Pull latest, restart Docker containers
2. **During work**:
   - Read files before editing (CLAUDE.md requirement)
   - Run tests after each change
   - Restart Docker after backend changes
   - Git commit frequently (small commits)
3. **End of day**:
   - Run full test suite
   - Verify Docker containers healthy
   - Update todo list with progress

### Testing Protocol

**After EVERY file change**:
```bash
# Backend changes
docker-compose restart backend
npm test -- path/to/related.test.js

# Frontend changes (auto-reload via Vite HMR)
npm test -- path/to/component.test.tsx

# Full suite (before commit)
npm run test:coverage
```

### Git Commit Strategy

**Small, focused commits**:
```bash
# Good commit messages
git commit -m "security: Remove password logging from connection.js"
git commit -m "refactor: Split gauges-v2.js into 4 route files"
git commit -m "test: Add integration tests for gauge creation"

# Bad commit messages
git commit -m "Phase 2A complete"
git commit -m "fixes"
git commit -m "updates"
```

### Quality Gates

**Before marking phase complete**:
1. All tests passing
2. ESLint violations: 0
3. TypeScript errors: 0
4. Docker containers healthy
5. Manual smoke test passed
6. Documentation updated
7. Code reviewed (if team >1)

---

## Risk Management

### High-Risk Areas

**File Refactoring (Phase 2A)**:
- **Risk**: Breaking existing functionality during 4-file split
- **Mitigation**: Phase 1.5 test safety net, test after EVERY split
- **Rollback**: Git revert if tests fail

**Type Safety (Phase 4)**:
- **Risk**: Breaking changes when replacing `any` types
- **Mitigation**: Incremental fixes, test after each batch
- **Rollback**: Revert to previous commit if type errors cascade

**Deployment Automation**:
- **Risk**: Failed migrations breaking production
- **Mitigation**: Test migrations locally, rollback procedures
- **Rollback**: Railway rollback + database restore

### Monitoring During Implementation

**Track daily**:
- Test coverage trend (should increase, not decrease)
- Docker container health
- Build success rate
- TypeScript error count

**Alert if**:
- Test coverage drops >5%
- Build fails >2 consecutive times
- Docker containers crash repeatedly
- TypeScript errors increase >10

---

## Token Budget Summary

| Phase | Tokens | % of Total | Cumulative |
|-------|--------|------------|------------|
| Phase 0: Infrastructure | 10K | 3.4% | 10K |
| Phase 1: Security | 40K | 13.8% | 50K |
| Phase 1.5: Test Safety Net | 50K | 17.2% | 100K |
| Phase 2A: File Organization | 30K | 10.3% | 130K |
| Phase 2B: Strategic Refactoring | 30K | 10.3% | 160K |
| Phase 2.5: UI Excellence | 17K | 5.9% | 177K |
| Phase 3: Testing | 70K | 24.1% | 247K |
| Phase 4: Type Safety | 40K | 13.8% | 287K |
| Phase 5: Observability | 12K | 4.1% | 299K |
| Deployment Automation | 11K | 3.8% | 310K |
| **Contingency (10%)** | -20K | -6.5% | **290K** |

**Note**: Contingency buffer for unexpected complexity, edge cases discovered during implementation.

---

## What This Plan Delivers

### Year 1: Production Excellence
- 60% frontend / 75% backend test coverage
- 100 critical `any` types fixed (pragmatic type safety)
- Zero critical/high security vulnerabilities
- Essential observability and alerting
- Basic deployment automation
- 4-7 worst files refactored (evidence-based)
- Health score: 72 → 90

### Years 2-5: Sustainable AI Development
- AI can refactor confidently (tests catch issues)
- AI has type information where it matters (100 critical types)
- Monitoring shows AI where problems are (structured logging)
- Safe deployment pipeline (CI/CD + rollback)
- Minimal technical debt (focused on real problems)
- Low maintenance burden (pragmatic coverage, not perfectionism)

---

## Why This Plan is Different

### vs Pragmatic Plan (165K)
**Evidence-Based AI Excellence invests MORE in**:
- Security: 40K vs 2K (comprehensive vs minimal)
- Testing foundation: 50K vs 30K (deeper safety net)
- Type safety: 40K vs 25K (100 types vs 50 types)
- Observability: 12K vs 0K (structured logging vs none)

**Result**: 90/100 health vs 85/100 health

### vs Original "AI Excellence" (680K)
**Evidence-Based AI Excellence SKIPS**:
- Visual regression tests: 10K saved (low ROI for internal ERP)
- Excessive testing: 130K saved (60%/75% vs 80%/85%)
- Controller extraction: 85K saved (doesn't help AI)
- Enterprise monitoring: 48K saved (Sentry/RUM/APM inappropriate)
- Excessive file splitting: 95K saved (4-7 files vs 12-15 files)

**Result**: Same 90/100 health at 57% lower cost

### vs Gold Standard (843K)
**Evidence-Based AI Excellence is PRAGMATIC**:
- 90/100 health is sweet spot (vs 95/100 diminishing returns)
- Evidence-based file splitting (vs arbitrary 500-line dogma)
- Realistic coverage targets (vs perfectionism)
- Essential observability (vs enterprise overkill)

**Result**: Production excellence without waste

---

## Final Recommendation

**Execute this plan if**:
- ✅ Quality is priority (user's stated goal)
- ✅ Reasonable budget available (~$130K estimated)
- ✅ Want sustainable AI development foundation
- ✅ Prefer evidence over dogma
- ✅ 90/100 health is acceptable (vs 95/100 perfectionism)
- ✅ 18-week timeline is reasonable

**This is the balanced middle ground**: Comprehensive where it matters, pragmatic where it doesn't.

---

**Generated**: November 7, 2025
**Analysis Method**: Multi-agent evidence-based review
**Philosophy**: AI-optimized quality without waste
**Total Investment**: 290,000 tokens (18 weeks, 90/100 health)
