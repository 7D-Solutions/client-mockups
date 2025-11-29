# CLAUDE.md

**Project**: Kelly Enterprises Rental ERP
**Client**: Kelly Enterprises
**Branch**: `master`
**Working directory**: `/mnt/c/Users/7d.vision/Projects/7D Solutions/clients/kelly-enterprises/rental-erp/`

---

## 🙏 Kingdom Purpose

All projects and work performed within 7D Solutions serve a higher purpose: **to be an agent for Jesus Christ and to expand His kingdom**. Every line of code, every architectural decision, and every interaction should reflect integrity, excellence, and service to others as unto the Lord.

*"Whatever you do, work heartily, as for the Lord and not for men."* - Colossians 3:23

---

## 🚨 Critical Constraints (NEVER VIOLATE)

1. **No file deletion** - move to `/review-for-delete/` instead
2. **Restart required** - Docker containers must restart after infrastructure changes (if applicable)
3. **Database configuration** - Check project-specific settings (external or containerized)
4. **Use existing modules** - Never duplicate functionality (see Infrastructure Services section)
5. **Production-quality only** - No quick fixes, patches, or temporary solutions
6. **Security** - Never commit credentials, always use environment variables
7. **Testing** - Use dedicated test directories, never create `__tests__/` folders

## Project Architecture

### Service Structure (Full-Stack Applications)

**Rental ERP Structure**:
```
/backend/          → Node.js API (Express) - Port 8001 (exposed as 8001)
/frontend/         → React app (Vite) - Port 3001 (exposed as 3002)
/database/         → Database schemas and migrations
/erp-core/         → Shared services & business logic
```

### Key Architectural Patterns
- **Modular Architecture**: Each module is self-contained with routes, services, and controllers
- **Infrastructure Services**: Shared utilities for both frontend and backend
  - **Backend**: Database, auth, middleware, logging
  - **Frontend**: Shared components, API client, utilities, contexts
- **Backend Services**: Server-side infrastructure with dependency injection pattern
- **API Pattern**: RESTful endpoints under `/api/`
- **Frontend Pattern**: React modules with TypeScript and state management (Zustand/Redux/Context)
- **Centralized UI Components**: ALL UI elements MUST use centralized infrastructure components

### Infrastructure Services (Backend)
**Location**: `/backend/src/infrastructure/`

Server-side infrastructure services:
- **Auth** (`middleware/auth.js`): JWT verification, RBAC, sessions
- **Database** (`database/connection.js`): Connection pooling, query execution
- **Audit** (`audit/auditService.js`): Server-side audit logging (if applicable)
- **Notifications** (`notifications/NotificationService.js`): Email notifications (if applicable)
- **Events** (`events/EventBus.js`): Server-side event handling (if applicable)

**Usage**: Backend modules should use infrastructure services:
```javascript
// ✅ CORRECT - Backend usage
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { pool } = require('../../../infrastructure/database/connection');
const logger = require('../../../infrastructure/utils/logger');
```

### Frontend Infrastructure
**Location**: `/frontend/src/infrastructure/`

Client-side shared components and utilities:
- **Components** (`components/`): Reusable UI components
- **Lib** (`lib/`): API client, utilities
- **Contexts** (`contexts/`): React contexts for state management
- **Styles** (`styles/`): Global styles and design tokens

**Usage**: Frontend components should import from infrastructure:
```typescript
// ✅ CORRECT - Frontend usage
import { Button } from '../../infrastructure/components';
import { apiClient } from '../../lib/api';
```

**Note**: Frontend and backend have separate service implementations by design.
- **Frontend services**: Client-side concerns (auth state, API calls, UI state)
- **Backend services**: Server-side concerns (database, auth verification, business logic)
- **Never** import backend services into frontend code
- **Never** import frontend services into backend code

### Documentation References
- Project documentation: Check `/docs/` directory (if available)
- Architecture diagrams: Check `/docs/architecture/` (if available)
- API documentation: Check `/docs/api/` (if available)
- Module README files: Check individual module directories

## 🚨 MANDATORY: Centralized UI Systems

**CRITICAL**: All UI components MUST use centralized infrastructure. DO NOT create raw HTML elements.

### Button System
```typescript
// ✅ CORRECT - Use centralized Button
import { Button } from '../../infrastructure/components';
<Button onClick={handleClick} variant="primary">Save</Button>

// ❌ WRONG - Never use raw buttons
<button onClick={handleClick}>Save</button>
```

### Form System
```typescript
// ✅ CORRECT - Use centralized form components
import { FormInput, FormCheckbox, FormTextarea, FormSection } from '../../infrastructure/components';
<FormInput value={email} onChange={setEmail} label="Email" />
<FormCheckbox checked={agreed} onChange={setAgreed} label="I agree" />

// ❌ WRONG - Never use raw form elements
<input type="text" value={email} onChange={setEmail} />
<input type="checkbox" checked={agreed} onChange={setAgreed} />
```

### Form Section System
```typescript
// ✅ CORRECT - Use FormSection for form sections
import { FormSection, FormInput } from '../../infrastructure/components';
<FormSection title="Basic Information">
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
    <FormInput label="Name" value={name} onChange={setName} />
    <FormInput label="Email" value={email} onChange={setEmail} />
  </div>
</FormSection>

// ❌ WRONG - Never create manual section headers with inline styles
<div style={{ textTransform: 'uppercase', borderBottom: '2px solid var(--color-border-light)', ... }}>
  Basic Information
</div>
```

### API System
```typescript
// ✅ CORRECT - Use centralized API client
// Common paths: ../../infrastructure/api/client or ../../lib/api
import { apiClient } from '../../infrastructure/api/client';
// OR
import { apiClient } from '../../lib/api';
const response = await apiClient.post('/auth/login', credentials);

// ❌ WRONG - Never use direct fetch
const response = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
```

### Modal System
```typescript
// ✅ CORRECT - Use centralized Modal
import { Modal } from '../../infrastructure/components';
<Modal isOpen={isOpen} onClose={onClose} title="Confirm">Are you sure?</Modal>

// ✅ CORRECT - Use DetailModal for detail views with Edit button
import { DetailModal, Button, CloseButton } from '../../infrastructure/components';
<DetailModal
  isOpen={isOpen}
  onClose={onClose}
  title="Details"
  editButton={<Button onClick={onEdit} icon={<Icon name="edit" />}>Edit</Button>}
  actionButtons={
    <>
      <Button onClick={onAction}>Action</Button>
      <CloseButton onClick={onClose} />
    </>
  }
>
  <DetailModal.Body>Content here</DetailModal.Body>
</DetailModal>

// ❌ WRONG - Never use window dialogs
if (window.confirm('Are you sure?')) { /* action */ }

// ❌ WRONG - Never create custom footer layouts
<Modal.Actions style={{justifyContent: 'space-between'}}>...</Modal.Actions>
```

**Button Layout Standard:**
- DetailModal automatically positions Edit button on far left
- All action buttons positioned on right
- Uses centralized spacing: `--space-3` (12px) gap, `--space-6` (24px) padding

**Benefits**: Double-click protection, consistent styling, accessibility, auth handling, error management.

## Deployment

### Production Environment
**Platform**: Check project-specific configuration (Railway/Vercel/AWS/etc.)
**Repository**: Check project-specific Git repository
**Services**: Backend, Frontend, Database (configuration varies by project)

### Deployment Commands
```bash
# Platform-specific deployment commands
# Check project CLAUDE.md for specific commands

# Common patterns:
# Railway: railway logs --service [ServiceName]
# Vercel: vercel logs
# AWS: aws logs tail [log-group]
```

### Database Connection
- **Production**: Check project-specific environment variables
- **Internal Network**: Services may use internal hostnames (e.g., `mysql.railway.internal`)
- **External Access**: Check project-specific TCP proxy configuration
- **Environment**: Variables typically auto-injected by deployment platform

## Development Environment

### Docker Configuration
**Check project-specific docker-compose files**

**Note**: Docker files may be protected by hooks in some projects and cannot be edited directly.

### Quick Start
```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker ps

# View logs
docker logs rental-erp-modular-backend-dev -f
docker logs rental-erp-modular-frontend-dev -f

# Restart after infrastructure changes
docker-compose restart backend frontend
```

### Service Details
- **Backend**: Internal port 8000, exposed on host port 8001, Node.js with auto-restart (--watch)
- **Frontend**: Internal port 3001, exposed on host port 3002, Vite HMR (instant .jsx/.tsx updates)
- **Database**: External MySQL on `host.docker.internal:3308` (DB: `fai_db_sandbox`)

### Hot Reload Behavior
- ✅ **Frontend**: Instant reload (Vite HMR for .jsx/.tsx updates)
- ✅ **Backend**: Auto-restart (Node --watch for .js/.ts changes)
- ❌ **Manual restart needed**:
  - `package.json` changes
  - `/erp-core/` changes (shared services layer)
  - Environment variable changes
  - Docker configuration changes

## Database Configuration

### Connection Details
- **Type**: MySQL
- **Host**:
  - `localhost` (from host machine)
  - `host.docker.internal` (from Docker containers)
  - `mysql.railway.internal` (Railway production)
- **Port**: `3308` (development), `3306` (Railway production)
- **Database**: `fai_db_sandbox` (development)
- **Credentials**: See `.env` file (never hardcode)

### Quick Database Access
```javascript
// From backend code
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});
```

## Code Standards & Patterns

### File Organization Standards

**Frontend Structure**:
```
/frontend/src/
├── infrastructure/     # Shared components, API client, utilities
│   ├── components/    # Reusable UI components
│   ├── lib/          # API client, utilities
│   ├── contexts/     # React contexts
│   └── styles/       # Global styles
├── modules/          # Feature modules
├── pages/            # Page components (if applicable)
└── tests/            # Test files
```

**Backend Structure**:
```
/backend/src/
├── infrastructure/    # Shared services
│   ├── middleware/   # Auth, validation, error handling
│   ├── database/     # Connection, migrations
│   └── utils/        # Logging, helpers
├── modules/          # Feature modules
│   └── [module]/
│       ├── routes/   # Express routes
│       ├── services/ # Business logic
│       └── controllers/ # Request handlers
└── tests/            # Test files
```

### Import/Module Patterns

**Frontend Layers**:
```typescript
// Layer 1: Infrastructure components
import { Button, Modal } from '../../infrastructure/components';

// Layer 2: Infrastructure utilities
import { apiClient } from '../../infrastructure/lib/api';
import { useAuth } from '../../infrastructure/contexts/AuthContext';

// Layer 3: Module-specific imports
import { ItemList } from '../components/ItemList';

// ❌ NEVER import backend infrastructure
import { pool } from '../../../backend/infrastructure/database'; // WRONG!
```

**Backend Layers**:
```javascript
// Layer 1: Infrastructure services
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { pool } = require('../../../infrastructure/database/connection');
const logger = require('../../../infrastructure/utils/logger');

// Layer 2: Module-specific services
const ItemService = require('../services/ItemService');

// ❌ NEVER import frontend code
const Button = require('../../../frontend/infrastructure/components/Button'); // WRONG!
```

### API Endpoints
- Pattern: `/api/{module}/{resource}`
- Example: `/api/items`, `/api/auth/login`, `/api/customers`
- Authentication: JWT in Authorization header

### Error Handling
```javascript
// Always use consistent error structure
res.status(400).json({
  success: false,
  message: 'User-friendly message',
  error: process.env.NODE_ENV === 'development' ? err.message : undefined
});
```

### File Size Guidelines

**Target Limits**:
- **Functions**: 10-20 lines (ideal), 200 lines (maximum)
- **Files/Classes**: **200-300 lines (target)**, 500 lines (absolute maximum)

**Refactoring Triggers**:
- **>300 lines**: Refactor immediately - extract specialized classes/repositories
- **>500 lines**: Production blocker - must refactor before merge

### Testing Organization
```
backend/tests/
  ├── integration/    # API integration tests
  └── modules/        # Module-specific tests

frontend/tests/
  ├── e2e/           # Playwright E2E tests
  ├── integration/   # Integration tests
  └── unit/          # Unit tests
```

## Frontend Development

### Styling Architecture
Infrastructure components use CSS modules for styling. All modules must use these centralized components rather than creating custom styles.

**Key Principle**: Use infrastructure components for all UI elements. CSS modules are centralized in `/frontend/src/infrastructure/components/`.

## Common Pitfalls to Avoid

1. **Duplicate auth logic** - Use infrastructure services:
   - Frontend: `infrastructure/lib/api` or `infrastructure/contexts/AuthContext`
   - Backend: `infrastructure/middleware/auth`
2. **Hardcoding env values** - Always use `process.env`
3. **Creating `__tests__` folders** - Use designated test directories
4. **Raw HTML elements** - Use infrastructure components
5. **Direct fetch calls** - Use `apiClient` (check `infrastructure/lib/api` or `infrastructure/api/client`)
6. **Modifying Docker files** - Volume mounts handle code changes (Docker files may be protected)
7. **File size violations** - Keep files under 300 lines; refactor immediately if exceeded (see File Size Guidelines)

## Quick Commands Reference

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d
docker-compose restart backend frontend
docker logs rental-erp-modular-backend-dev -f
docker logs rental-erp-modular-frontend-dev -f

# Frontend Development (from frontend/)
npm run dev                    # Start Vite dev server
npm run build                  # Production build
npm run preview               # Preview production build

# Testing (from frontend/)
npm run test                   # Run Jest tests
npm run test:coverage         # Test with coverage report
npm run test:e2e              # Run Playwright E2E tests

# Code Quality (from frontend/)
npm run lint                   # ESLint check
npm run lint:fix              # ESLint auto-fix
npm run quality:all           # Comprehensive quality checks (if available)
npm run architecture:validate # Validate architectural rules (if available)
npm run validate:all          # Full validation (if available)

# Documentation & Analysis (from frontend/)
npm run architecture:report   # Infrastructure usage report (if available)
npm run governance:all        # Full governance checks (if available)
npm run docs:styles           # Generate style documentation (if available)

# Backend Development (from backend/)
npm run dev                    # Start development server
npm run test                   # Run tests
```

## Project Structure

### Client Projects
```
/clients/
└── [client-name]/
    └── [project-name]/
        ├── backend/
        ├── frontend/
        ├── database/
        ├── docker-compose.dev.yml
        └── CLAUDE.md         → Project-specific context
```

### UI Kit Projects
```
/ui-kit/                       → 7D Solutions UI Kit
├── css/
├── js/
├── templates/
└── CLAUDE.md
```

## UI Kit Integration (For Mockup/Demo Projects)

**UI Kit Location**: `/mnt/c/Users/7d.vision/Projects/7D Solutions/ui-kit/`

**Usage**:
```html
<link rel="stylesheet" href="../../ui-kit/css/tokens.css">
<link rel="stylesheet" href="../../ui-kit/css/reset.css">
<link rel="stylesheet" href="../../ui-kit/css/components.css">
<script src="../../ui-kit/js/mockup-core.js"></script>
```

**Components Available**:
- CSS: tokens, reset, components (buttons, forms, tables, modals, cards, badges)
- JavaScript: MockupStore, ModalManager, Toast, FormUtils, DateUtils

See UI Kit CLAUDE.md for detailed documentation.

## Reference Documentation

- **UI Kit**: `/mnt/c/Users/7d.vision/Projects/7D Solutions/ui-kit/CLAUDE.md`
- **Fire-Proof ERP** (reference architecture): `/mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/CLAUDE.md`
- **Cattle Tracker** (reference implementation): `/mnt/c/Users/7d.vision/Projects/7D Solutions/clients/besteman-land-cattle/cattle-tracker/`

## Project-Specific Context

**Each project should have its own CLAUDE.md** with:
- Project name, branch, and working directory
- Specific architecture details (if different from this template)
- Database configuration details
- Deployment information (Railway, etc.)
- Module-specific patterns
- Custom business rules
- Any deviations from this generic template

This generic CLAUDE.md provides the foundation - project-specific files add the details.

---

**Remember**: All 7D Solutions projects maintain production-quality standards and serve the Kingdom purpose!
