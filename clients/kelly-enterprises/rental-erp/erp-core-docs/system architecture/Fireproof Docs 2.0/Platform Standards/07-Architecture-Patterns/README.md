# Architecture Patterns

**Fire-Proof ERP Platform - System Architecture Documentation**

## Table of Contents

1. [Overview](#overview)
2. [Modular Architecture](#modular-architecture)
3. [Service Separation (Frontend/Backend)](#service-separation-frontendbackend)
4. [ERP Core Design](#erp-core-design)
5. [Development Environment](#development-environment)
6. [Deployment Architecture](#deployment-architecture)
7. [Critical Architectural Constraints](#critical-architectural-constraints)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Fire-Proof ERP Platform employs a **modular monolith** architecture with clear separation of concerns:

- **Frontend**: React 18 + TypeScript + Vite (Port 3001)
- **Backend**: Node.js 18 + Express (Port 8000)
- **ERP Core**: Shared frontend services and utilities
- **Database**: External MySQL 8.0 (Port 3307)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Fire-Proof ERP Platform                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │   Frontend   │────────▶│   Backend    │                    │
│  │  React/Vite  │  HTTP   │   Express    │                    │
│  │  Port 3001   │◀────────│  Port 8000   │                    │
│  └──────┬───────┘         └──────┬───────┘                    │
│         │                         │                             │
│         │ uses                    │ uses                        │
│         ▼                         ▼                             │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │  ERP Core    │         │ Infrastructure│                    │
│  │  Services    │         │   Services    │                    │
│  │  (Frontend)  │         │   (Backend)   │                    │
│  └──────────────┘         └──────┬───────┘                    │
│                                   │                             │
│                                   │ connects to                 │
│                                   ▼                             │
│                           ┌──────────────┐                     │
│                           │    MySQL     │                     │
│                           │  Port 3307   │                     │
│                           │  (External)  │                     │
│                           └──────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Modularity First**: Self-contained modules with clear boundaries
2. **Service Separation**: Frontend and backend services are completely separate
3. **Centralized Infrastructure**: Shared UI components and backend infrastructure
4. **Production Quality**: No temporary solutions or quick fixes
5. **Security by Default**: Environment variables, httpOnly cookies, RBAC

---

## Modular Architecture

### Module Structure

Each module is **self-contained** with its own responsibilities and boundaries:

```
/frontend/src/modules/
├── admin/          # Administrative functions (users, roles, permissions)
├── gauge/          # Gauge tracking and calibration
├── inventory/      # Storage locations and inventory
├── system/         # System-wide features
└── user/           # User-facing features

/backend/src/modules/
├── admin/          # Admin API endpoints
├── auth/           # Authentication services
├── audit/          # Audit logging
├── gauge/          # Gauge business logic
└── inventory/      # Inventory management
```

### Module Anatomy (Example: Gauge Module)

#### Frontend Module Structure
```
frontend/src/modules/gauge/
├── components/                 # UI components
│   ├── creation/              # Gauge creation workflow
│   │   ├── CreateGaugeWorkflow.tsx
│   │   ├── forms/             # Type-specific forms
│   │   │   ├── CalibrationStandardForm.tsx
│   │   │   ├── HandToolForm.tsx
│   │   │   ├── LargeEquipmentForm.tsx
│   │   │   └── ThreadGaugeForm.tsx
│   │   └── GaugeIdInput.tsx
│   ├── AddGaugeWizard.tsx
│   ├── CheckinModal.tsx
│   ├── CheckoutModal.tsx
│   └── GaugeModalManager.tsx
├── context/                    # Module state management
│   └── index.tsx              # Zustand store for gauge state
├── hooks/                      # Custom React hooks
│   ├── useGauges.ts
│   ├── useGaugeOperations.ts
│   └── useAdminAlerts.ts
├── pages/                      # Route-level components
│   ├── GaugeList.tsx
│   ├── MyGauges.tsx
│   └── CreateGaugePage.tsx
├── types/                      # TypeScript definitions
│   └── index.ts
└── utils/                      # Module utilities
```

#### Backend Module Structure
```
backend/src/modules/gauge/
├── domain/                     # Business logic
│   ├── entities/              # Domain entities
│   └── validators/            # Business rules
├── mappers/                    # Data transformation
├── middleware/                 # Module-specific middleware
├── migrations/                 # Database migrations
├── presenters/                 # Response formatting
├── repositories/               # Data access layer
│   ├── GaugeRepository.js
│   └── CalibrationRepository.js
├── routes/                     # API endpoints
│   └── gaugeRoutes.js
└── services/                   # Business services
    └── GaugeService.js
```

### Module Boundaries

**Principles**:
- Each module manages its own state (Zustand stores on frontend)
- Modules communicate via well-defined APIs
- Shared functionality goes into infrastructure (backend) or ERP core (frontend)
- No direct module-to-module dependencies

**Inter-Module Communication**:
```typescript
// ✅ CORRECT - Frontend modules use API endpoints
import { apiClient } from '../../../infrastructure/api/client';
const response = await apiClient.get('/gauge/list');

// ❌ WRONG - No direct imports between modules
import { fetchGauges } from '../../gauge/utils'; // Never do this
```

### Module Responsibilities

| Module | Frontend Responsibilities | Backend Responsibilities |
|--------|--------------------------|--------------------------|
| **admin** | User/role/permission UI, Facility management | User CRUD, RBAC logic, Audit queries |
| **gauge** | Gauge workflows, Calibration tracking | Gauge business logic, Validation, Calibration scheduling |
| **inventory** | Storage location UI, Inventory views | Location management, Stock tracking |
| **auth** | Login forms, Session management (client) | JWT verification, Session management (server) |
| **audit** | Audit log viewing | Audit event capture, Compliance reporting |

---

## Service Separation (Frontend/Backend)

### Why Separate Services?

The platform maintains **completely separate** frontend and backend service implementations:

1. **Security**: Sensitive operations (JWT verification, database access) stay server-side
2. **Performance**: Frontend services optimized for browser, backend for server operations
3. **Scalability**: Independent deployment and scaling strategies
4. **Clarity**: Clear separation prevents confusion about where logic belongs

### Frontend Services (ERP Core)

**Location**: `/erp-core/src/core/`

**Purpose**: Client-side utilities for React components

```typescript
// Frontend authentication example
import { getAuthHeaders, isAuthenticated } from '../../erp-core/src/core/auth/authService';
import { apiClient } from '../../erp-core/src/core/data/apiClient';

// Session-based auth with httpOnly cookies
const headers = getAuthHeaders(); // { credentials: 'include' }
const authenticated = isAuthenticated(); // Checks sessionStorage

// API calls automatically include auth cookies
const response = await apiClient.get('/gauge/list');
```

**Frontend Services**:
- **Auth**: `authService.ts` - Session storage, login helpers, auth headers
- **Data**: `apiClient.ts` - HTTP client with interceptors, caching, error handling
- **Navigation**: Frontend routing, breadcrumbs, navigation state
- **Notifications**: Toast notifications, frontend alerts

### Backend Services (Infrastructure)

**Location**: `/backend/src/infrastructure/`

**Purpose**: Server-side operations requiring database or privileged access

```javascript
// Backend authentication example
const { authenticateToken, requireAdmin } = require('../../../infrastructure/middleware/auth');
const { pool } = require('../../../infrastructure/database/connection');
const auditService = require('../../../infrastructure/audit/auditService');

// JWT verification and RBAC
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  // req.user populated by authenticateToken middleware
  const [users] = await pool.execute('SELECT * FROM core_users');
  await auditService.log('admin.users.view', req.user.id);
  res.json({ success: true, data: users });
});
```

**Backend Services**:
- **Auth**: JWT verification, RBAC, session management, permission checks
- **Database**: Connection pooling, query execution, transaction management
- **Audit**: Server-side event logging, compliance tracking
- **Notifications**: Email notifications, webhook dispatching
- **Events**: Server-side event bus for inter-module communication

### Communication Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    Request Flow                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend Component                                             │
│  ┌────────────────────────────────────────────────┐            │
│  │ import { apiClient } from 'erp-core/data'      │            │
│  │ const data = await apiClient.get('/gauge/list')│            │
│  └────────────┬───────────────────────────────────┘            │
│               │                                                 │
│               │ HTTP Request (with httpOnly cookie)             │
│               ▼                                                 │
│  Backend Middleware                                             │
│  ┌────────────────────────────────────────────────┐            │
│  │ authenticateToken middleware                   │            │
│  │ - Verify JWT from cookie                       │            │
│  │ - Load user from database                      │            │
│  │ - Attach req.user with permissions             │            │
│  └────────────┬───────────────────────────────────┘            │
│               │                                                 │
│               ▼                                                 │
│  Backend Route Handler                                          │
│  ┌────────────────────────────────────────────────┐            │
│  │ - Access req.user (authenticated user)         │            │
│  │ - Query database via infrastructure/database   │            │
│  │ - Log via infrastructure/audit                 │            │
│  │ - Return JSON response                         │            │
│  └────────────┬───────────────────────────────────┘            │
│               │                                                 │
│               │ HTTP Response (JSON data)                       │
│               ▼                                                 │
│  Frontend Component (Receives Data)                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### When to Use Which Services

| Scenario | Use | Example |
|----------|-----|---------|
| Making API calls | Frontend: `apiClient` | `apiClient.post('/auth/login', credentials)` |
| Checking if logged in | Frontend: `isAuthenticated()` | `if (isAuthenticated()) { ... }` |
| Verifying JWT | Backend: `authenticateToken` | `router.get('/data', authenticateToken, ...)` |
| Database queries | Backend: `pool.execute()` | `pool.execute('SELECT * FROM users')` |
| Logging audit events | Backend: `auditService.log()` | `auditService.log('user.login', userId)` |
| Toast notifications | Frontend: `useToast()` | `toast.success('Saved successfully')` |
| Email notifications | Backend: `NotificationService` | `NotificationService.sendEmail(...)` |

---

## ERP Core Design

### Purpose

ERP Core is a **frontend-focused** shared services layer that provides:

1. **Reusable Frontend Utilities**: Authentication helpers, API client, navigation
2. **Consistency**: Single source of truth for frontend patterns
3. **Avoiding Duplication**: Shared code across all frontend modules

**Key Point**: ERP Core is NOT a backend service layer. Backend has its own infrastructure services.

### Directory Structure

```
/erp-core/src/core/
├── auth/
│   ├── authService.ts          # Session management, auth headers
│   ├── constants.ts            # Auth constants
│   ├── types.ts                # TypeScript definitions
│   └── __tests__/              # Auth service tests
├── data/
│   ├── apiClient.ts            # Axios-based HTTP client
│   ├── cache.ts                # Frontend caching
│   ├── eventBus.ts             # Frontend event system
│   └── __tests__/              # Data service tests
├── navigation/
│   ├── components/             # Navigation components
│   ├── hooks/                  # Navigation hooks
│   └── NavigationService.ts    # Routing utilities
└── notifications/
    └── NotificationService.ts  # Toast notifications
```

### Integration with Frontend Modules

```typescript
// Typical frontend module imports
import {
  getAuthHeaders,
  isAuthenticated,
  getCurrentUser
} from '../../erp-core/src/core/auth/authService';

import { apiClient } from '../../erp-core/src/core/data/apiClient';
import { useToast } from '../../erp-core/src/core/notifications';

// Usage in component
export function GaugeList() {
  const toast = useToast();
  const user = getCurrentUser();

  const fetchGauges = async () => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    try {
      const response = await apiClient.get('/gauge/list');
      toast.success('Gauges loaded successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to load gauges');
    }
  };
}
```

### Authentication Flow (Session-Based)

```
┌─────────────────────────────────────────────────────────────────┐
│              Session-Based Authentication Flow                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User Login                                                  │
│     ┌────────────────────────────────────────────┐             │
│     │ apiClient.post('/auth/login', credentials) │             │
│     │ { withCredentials: true }                  │             │
│     └──────────────┬─────────────────────────────┘             │
│                    │                                            │
│  2. Server Response                                             │
│     ┌──────────────▼─────────────────────────────┐             │
│     │ Set-Cookie: authToken=jwt_token            │             │
│     │ { httpOnly: true, secure: true }           │             │
│     │ Response: { user: {...} }                  │             │
│     └──────────────┬─────────────────────────────┘             │
│                    │                                            │
│  3. Frontend Storage                                            │
│     ┌──────────────▼─────────────────────────────┐             │
│     │ sessionStorage.setItem('user', userData)   │             │
│     │ (Token stored in httpOnly cookie by browser)│            │
│     └──────────────┬─────────────────────────────┘             │
│                    │                                            │
│  4. Subsequent Requests                                         │
│     ┌──────────────▼─────────────────────────────┐             │
│     │ Browser automatically includes authToken   │             │
│     │ cookie with every request                  │             │
│     └──────────────┬─────────────────────────────┘             │
│                    │                                            │
│  5. Backend Verification                                        │
│     ┌──────────────▼─────────────────────────────┐             │
│     │ authenticateToken middleware               │             │
│     │ - Extract JWT from req.cookies.authToken   │             │
│     │ - Verify signature                         │             │
│     │ - Query database for user permissions      │             │
│     │ - Attach req.user to request               │             │
│     └────────────────────────────────────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Security Benefits**:
- **httpOnly cookies**: Prevents XSS attacks from stealing tokens
- **SameSite attribute**: Protects against CSRF attacks
- **Secure flag**: Ensures HTTPS transmission in production
- **Database validation**: Every request validates user still exists and is active

---

## Development Environment

### Docker Compose Architecture

**File**: `docker-compose.dev.yml`

```yaml
services:
  backend:
    build: ./backend
    container_name: fireproof-erp-modular-backend-dev
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=development
      - DB_HOST=host.docker.internal  # Special Docker hostname
      - DB_PORT=3307
    volumes:
      - ./backend:/app               # Live code sync
      - /app/node_modules            # Persist dependencies
    command: node --watch src/server.js  # Auto-restart on changes

  frontend:
    image: node:18-alpine
    container_name: fireproof-erp-modular-frontend-dev
    working_dir: /app
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app              # Live code sync
      - /app/node_modules            # Persist dependencies
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
```

### Service Configuration

| Service | Port | Technology | Auto-Reload | Restart Required |
|---------|------|------------|-------------|------------------|
| **Frontend** | 3001 | Vite + React | ✅ HMR (instant) | Never |
| **Backend** | 8000 | Express + Node | ✅ `--watch` flag | For package.json, erp-core changes |
| **Database** | 3307 | MySQL 8.0 | N/A (external) | Never |

### Hot Reload Behavior

**Frontend (Instant via HMR)**:
```
Edit .tsx/.jsx file → Vite HMR → Browser updates in ~50ms
```

**Backend (Auto-Restart)**:
```
Edit .js file → Node --watch detects change → Server restarts → ~500ms
```

**Manual Restart Required**:
```bash
# When these change, restart containers:
- package.json (dependency changes)
- /erp-core/ files (shared services)
- .env variables
- Docker configuration

# Restart command:
docker-compose restart backend frontend
```

### Volume Mount Strategy

**Purpose**: Enable live code changes without rebuilding containers

```yaml
volumes:
  - ./backend:/app           # Host directory → Container directory
  - /app/node_modules        # Anonymous volume (persists dependencies)
```

**How it works**:
1. Host code directory mounted into container at `/app`
2. Changes on host immediately reflected in container
3. `node_modules` excluded to prevent conflict with container's installed packages
4. Node's `--watch` or Vite's HMR detects changes and reloads

### Database Connection

**External MySQL** (not containerized):
- **From Host**: `localhost:3307`
- **From Container**: `host.docker.internal:3307`

**Why External?**:
1. **Persistence**: Data survives container rebuilds
2. **Performance**: Native MySQL performance
3. **Tooling**: Direct access via MySQL Workbench, CLI
4. **Stability**: Database isn't affected by application restarts

```javascript
// Backend database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'host.docker.internal',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});
```

### Quick Start Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Check service status
docker ps

# View logs (follow mode)
docker logs fireproof-erp-modular-backend-dev -f
docker logs fireproof-erp-modular-frontend-dev -f

# Restart after erp-core changes
docker-compose restart backend frontend

# Stop all services
docker-compose down

# Rebuild containers (after Dockerfile changes)
docker-compose up -d --build
```

---

## Deployment Architecture

### Railway Production Environment

**Platform**: Railway.app
**Repository**: `https://github.com/7D-Manufacturing/Fire-Proof-ERP-Sandbox`
**Branch**: `production-v1`

```
┌─────────────────────────────────────────────────────────────────┐
│                   Railway Deployment                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │   Frontend   │────────▶│   Backend    │                    │
│  │   (Nginx)    │  Proxy  │  (Node.js)   │                    │
│  │              │         │              │                    │
│  └──────────────┘         └──────┬───────┘                    │
│                                   │                             │
│                                   │                             │
│                                   ▼                             │
│                           ┌──────────────┐                     │
│                           │    MySQL     │                     │
│                           │   Database   │                     │
│                           │  (Railway)   │                     │
│                           └──────────────┘                     │
│                                                                 │
│  Internal Network: mysql.railway.internal:3306                 │
│  External Access:  switchback.proxy.rlwy.net:43662            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Service Configuration

| Service | Role | Technology | Deployment |
|---------|------|------------|------------|
| **Frontend** | Static serving | Nginx | Auto-deploy from `production-v1` |
| **Backend** | API server | Node.js 18 | Auto-deploy from `production-v1` |
| **Database** | Data storage | MySQL 8.0 | Managed Railway service |

### Database Connection Differences

**Development** (Docker):
```javascript
DB_HOST=host.docker.internal
DB_PORT=3307
```

**Production** (Railway):
```javascript
// Internal network (service-to-service)
DB_HOST=mysql.railway.internal
DB_PORT=3306

// External access (via TCP proxy)
DB_HOST=switchback.proxy.rlwy.net
DB_PORT=43662
```

**Auto-Injection**: Railway automatically injects service references as environment variables.

### Environment Variable Management

**Development** (`.env` files):
```bash
# backend/.env
DB_HOST=host.docker.internal
DB_PORT=3307
DB_USER=root
DB_PASS=fireproof_root_sandbox
JWT_SECRET=your-secret-key-here
```

**Production** (Railway dashboard):
- Variables set via Railway UI or CLI
- Automatically injected into service containers
- Support for service references (e.g., `${{MySQL.DATABASE_URL}}`)

### Deployment Commands

```bash
# View production logs
railway logs --service Backend
railway logs --service Frontend

# Trigger manual redeployment
railway up --service Backend
railway up --service Frontend

# Check environment variables
railway variables --service Backend

# Link to Railway project (first time)
railway link

# Deploy from local
railway up
```

### Production vs Development Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| **Frontend** | Vite dev server (3001) | Nginx static serving |
| **Backend** | `node --watch` (8000) | `node src/server.js` (production mode) |
| **Database** | External MySQL (3307) | Railway MySQL (internal network) |
| **Hot Reload** | ✅ HMR + auto-restart | ❌ Requires redeployment |
| **Environment** | `docker-compose.dev.yml` | Railway configuration |
| **Deployment** | Local Docker | Git push → Auto-deploy |
| **Scaling** | Single instance | Railway horizontal scaling |

---

## Critical Architectural Constraints

### 1. No File Deletion

**Rule**: Never delete files directly. Move to `/review-for-delete/` instead.

**Rationale**:
- Prevents accidental loss of critical code
- Allows review before permanent deletion
- Provides rollback capability
- Maintains audit trail

```bash
# ✅ CORRECT
mv obsolete-file.js /review-for-delete/

# ❌ WRONG
rm obsolete-file.js
```

### 2. Restart Required for ERP Core Changes

**Rule**: Docker containers must restart after changes to `/erp-core/`

**Rationale**:
- ERP core is imported during module initialization
- Node.js caches require() statements
- Changes won't propagate without restart

```bash
# After editing /erp-core/ files:
docker-compose restart backend frontend
```

### 3. External Database

**Rule**: Database runs externally, not in Docker container

**Rationale**:
- **Data Persistence**: Survives container rebuilds
- **Performance**: Native MySQL performance
- **Accessibility**: Direct access for management tools
- **Backup**: Easier backup/restore procedures
- **Development Speed**: No container rebuild for schema changes

### 4. Use Existing Modules

**Rule**: Never duplicate functionality. Check existing modules first.

**Rationale**:
- Prevents code duplication
- Maintains consistency
- Reduces maintenance burden
- Leverages tested code

**Before Creating New Code**:
```bash
# Search for existing implementations
grep -r "similar_function" frontend/src/
grep -r "similar_api" backend/src/

# Check infrastructure
ls frontend/src/infrastructure/components/
ls backend/src/infrastructure/
```

### 5. Production Quality Only

**Rule**: No quick fixes, patches, or temporary solutions

**Rationale**:
- Technical debt accumulates rapidly
- "Temporary" solutions become permanent
- Difficult to maintain and debug
- Violates architectural principles

**Examples**:

```typescript
// ❌ WRONG - Quick fix
const data = JSON.parse(localStorage.getItem('data') || '{}');

// ✅ CORRECT - Proper implementation
import { apiClient } from '../../infrastructure/api/client';
const { data } = await apiClient.get('/data');
```

### 6. Security Constraints

**Rules**:
- ✅ Never commit credentials
- ✅ Always use environment variables
- ✅ Use httpOnly cookies for sessions
- ✅ Implement RBAC for all endpoints
- ✅ Validate all inputs

**Examples**:

```javascript
// ❌ WRONG - Hardcoded credentials
const dbPassword = 'fireproof_root_sandbox';

// ✅ CORRECT - Environment variables
const dbPassword = process.env.DB_PASS;

// ❌ WRONG - No authentication
router.get('/admin/users', async (req, res) => { ... });

// ✅ CORRECT - Authenticated and authorized
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => { ... });
```

### 7. Testing Requirements

**Rule**: Use dedicated test directories, never `__tests__/` in modules

**Structure**:
```
backend/tests/
├── integration/          # API integration tests
└── modules/              # Module-specific tests
    └── gauge/            # Mirrors module structure

frontend/tests/
├── e2e/                  # Playwright E2E tests
├── integration/          # Integration tests
└── unit/                 # Unit tests
```

**Rationale**:
- Clear separation of concerns
- Easier to run test suites independently
- Avoids polluting module directories
- Consistent test organization

---

## Troubleshooting

### Frontend Changes Not Reflecting

**Symptoms**: Code changes don't appear in browser

**Solutions**:
```bash
# 1. Check Vite dev server is running
docker logs fireproof-erp-modular-frontend-dev

# 2. Hard refresh browser
Ctrl + Shift + R (Chrome/Firefox)

# 3. Clear browser cache and restart container
docker-compose restart frontend

# 4. Rebuild container (if Vite config changed)
docker-compose up -d --build frontend
```

### Backend Changes Not Reflecting

**Symptoms**: API returns old responses

**Solutions**:
```bash
# 1. Check Node --watch is active
docker logs fireproof-erp-modular-backend-dev
# Should see: "Watching for file changes..."

# 2. If ERP core changed, restart manually
docker-compose restart backend

# 3. Check for syntax errors preventing restart
docker logs fireproof-erp-modular-backend-dev | grep -i error

# 4. Rebuild if package.json changed
docker-compose up -d --build backend
```

### Database Connection Issues

**Symptoms**: "ECONNREFUSED" or "Cannot connect to database"

**Solutions**:
```bash
# 1. Verify MySQL is running on host
mysql -h localhost -P 3307 -u root -p

# 2. Check environment variables
docker exec fireproof-erp-modular-backend-dev env | grep DB_

# 3. Verify host.docker.internal resolves
docker exec fireproof-erp-modular-backend-dev ping host.docker.internal

# 4. Check MySQL configuration
# Ensure MySQL is listening on 0.0.0.0:3307, not just localhost
```

### Authentication Issues

**Symptoms**: 401 Unauthorized errors

**Frontend Debugging**:
```javascript
// Check session storage
console.log(sessionStorage.getItem('user'));

// Verify authenticated state
import { isAuthenticated, getCurrentUser } from 'erp-core/auth';
console.log('Authenticated:', isAuthenticated());
console.log('User:', getCurrentUser());

// Check cookies
console.log(document.cookie); // Should include authToken
```

**Backend Debugging**:
```javascript
// Add logging to auth middleware
console.log('Cookies:', req.cookies);
console.log('Auth header:', req.headers.authorization);

// Verify JWT secret matches
console.log('JWT_SECRET:', process.env.JWT_SECRET?.substring(0, 10) + '...');
```

### Module Import Errors

**Symptoms**: "Cannot find module" or TypeScript errors

**Solutions**:
```bash
# 1. Verify path is correct (use absolute imports)
# ✅ CORRECT
import { Button } from '../../infrastructure/components';

# ❌ WRONG
import { Button } from '../../../frontend/src/infrastructure/components';

# 2. Clear node_modules and reinstall
docker-compose down
docker volume prune
docker-compose up -d --build

# 3. Check TypeScript paths in tsconfig.json
```

### Deployment Issues (Railway)

**Symptoms**: Production deploy fails or behaves differently

**Solutions**:
```bash
# 1. Check build logs
railway logs --service Backend

# 2. Verify environment variables match
railway variables --service Backend

# 3. Test database connection
railway run --service Backend node -e "require('./src/infrastructure/database/connection').testConnection()"

# 4. Compare NODE_ENV
# Development: NODE_ENV=development
# Production: NODE_ENV=production

# 5. Check for missing dependencies in package.json
```

### Performance Issues

**Symptoms**: Slow response times or high resource usage

**Investigation**:
```bash
# 1. Check container resource usage
docker stats

# 2. Profile database queries
# Enable MySQL slow query log

# 3. Check for N+1 queries
# Review backend logs for repeated similar queries

# 4. Monitor memory usage
docker exec fireproof-erp-modular-backend-dev node -e "console.log(process.memoryUsage())"
```

---

## Summary

The Fire-Proof ERP Platform architecture is built on:

1. **Modular Design**: Self-contained modules with clear boundaries
2. **Service Separation**: Distinct frontend (ERP Core) and backend (Infrastructure) services
3. **Development Efficiency**: Docker-based development with hot reload
4. **Production Reliability**: Railway deployment with managed database
5. **Security First**: httpOnly cookies, RBAC, environment variables
6. **Quality Standards**: No shortcuts, production-quality code only

**Key Takeaway**: Understanding the separation between frontend services (ERP Core) and backend infrastructure is critical. Never duplicate functionality across layers.

---

**Related Documentation**:
- [Centralized UI Components](../06-Component-Standards/)
- [API Standards](../03-API-Standards/)
- [Security Standards](../05-Security-Standards/)
- [Database Design](../../Database/)
