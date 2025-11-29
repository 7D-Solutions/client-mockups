# Kelly Rental Manager - Implementation Roadmap

**Purpose**: Complete step-by-step guide for building this modular application from scratch.
**Use Case**: Template for spinning up new apps using modular architecture pattern.
**Started**: 2024-11-14
**Status**: Backend Complete - Frontend Pending
**Last Updated**: 2024-11-14

---

## Overview

Building a production-ready rental management system using:
- **Modular Architecture** (like Fire-Proof ERP)
- **Centralized UI Kit** (7D Solutions ui-kit)
- **Standalone Backend** (Node.js + Express)
- **Standalone Frontend** (React + Vite)
- **Shared Database** (MySQL on port 3307)

---

## Phase 1: Planning & Architecture ✅ COMPLETED

### Step 1.1: Analyze Requirements
- **Input**: Kelly mockup (`index.html` with SessionStorage)
- **Analysis**:
  - 6 views: Rent Log, Properties, Expenses, Messages, Applications, Transactions
  - 7 data stores: properties, tenants, payments, expenses, messages, applications, transactions
  - Key feature: Bank transaction import with auto-reconciliation

**Output**: Feature list, data model understanding

### Step 1.2: Design Database Schema
- **Approach**: Fully normalized (17 tables, minimal NULLs)
- **Key Decision**: Separate tables for optional 1:1 relationships
  - Properties without mortgages: No row in `rental_mortgages` (not NULL columns)
  - Payments without reconciliation: No row in `rental_payment_reconciliations`
  - Expenses without receipts: No row in `rental_expense_receipts`

**Output**:
- ✅ `/backend/src/modules/rental/DATABASE_SCHEMA.md` (schema documentation)

**File Created**: `DATABASE_SCHEMA.md`
```markdown
# 17 Tables:
1. rental_properties
2. rental_mortgages (optional)
3. rental_tenants
4. rental_lease_documents (optional)
5. rental_payments
6. rental_transactions
7. rental_payment_reconciliations (optional)
8. rental_expenses
9. rental_expense_receipts (optional)
10. rental_messages
11. rental_message_responses (optional)
12. rental_applications
13. rental_application_employment (optional)
14. rental_application_screening (optional)
15. rental_application_decisions (optional)
16. rental_application_documents (optional)
```

### Step 1.3: Create Directory Structure

**Backend Structure**:
```
rental-manager/
├── backend/
│   └── src/
│       ├── modules/
│       │   └── rental/          ← Module directory
│       │       ├── domain/      ← Business logic (future)
│       │       ├── repositories/ ← Database access (future)
│       │       ├── services/    ← Business services (future)
│       │       ├── routes/      ← API endpoints (future)
│       │       ├── mappers/     ← Data transformation (future)
│       │       ├── middleware/  ← Module-specific middleware (future)
│       │       ├── migrations/  ← Database migrations
│       │       │   └── 001_create_rental_tables.sql ✅
│       │       └── DATABASE_SCHEMA.md ✅
│       └── infrastructure/      ← Shared infrastructure (future)
│           ├── database/        ← Connection, pooling
│           ├── middleware/      ← Auth, error handling
│           └── utils/           ← Helpers, logger
└── frontend/
    └── src/
        └── modules/
            └── rental/          ← Frontend module (future)
```

**Commands Run**:
```bash
mkdir -p "/backend/src/modules/rental/migrations"
mkdir -p "/backend/src/infrastructure"
mkdir -p "/frontend/src/modules/rental"
```

---

## Phase 2: Database Setup ✅ COMPLETED

### Step 2.1: Create Migration Files

**Purpose**: SQL scripts to create database schema

**File Created**: `/backend/src/modules/rental/migrations/001_create_rental_tables.sql`

**Content Summary**:
```sql
-- 17 CREATE TABLE statements
-- All tables prefixed with rental_*
-- Full normalization (no NULL columns for optional data)
-- Proper indexes and foreign keys
-- Uses IF NOT EXISTS for idempotent migrations
```

**Key Patterns**:
- Auto-increment primary keys: `id INT AUTO_INCREMENT PRIMARY KEY`
- Timestamps on all tables: `created_at`, `updated_at`
- ENUMs for fixed choices: `status ENUM('active', 'sold', 'archived')`
- Foreign keys with cascade rules: `ON DELETE CASCADE` or `ON DELETE RESTRICT`
- Proper indexes: Primary keys, foreign keys, frequently queried columns

**How to Run**:
```bash
mysql -h localhost -P 3307 -u root -p fai_db_sandbox < migrations/001_create_rental_tables.sql
```

### Step 2.2: Create Database Tooling Directory

**New Directory Structure**:
```
rental-manager/
└── database/                    ← NEW: Database tooling root
    ├── README.md                ← Documentation
    ├── dump/                    ← Export tools
    │   ├── generate-db-yaml.bat           ✅
    │   ├── generate-database-yaml.js      ✅
    │   └── generate-restorable-dump.bat   ✅
    └── migrations/              ← Version control (future: move here)
```

**Why Separate `database/` Folder**:
- Central location for all database operations
- Easy to find tooling scripts
- Matches Fire-Proof ERP pattern
- Clear separation: development code vs database management

**Commands Run**:
```bash
mkdir -p "/database/dump"
mkdir -p "/database/migrations"
```

### Step 2.3: Create YAML Schema Generator

**Purpose**: Generate human-readable database schema documentation

**Files Created**:

1. **`database/dump/generate-db-yaml.bat`**
```batch
@echo off
cd /d "%~dp0"
node generate-database-yaml.js
pause
```

2. **`database/dump/generate-database-yaml.js`** (Node.js script)
   - Connects to MySQL database (port 3307)
   - Queries `information_schema` for table structure
   - Filters only `rental_*` tables
   - Exports to YAML format with:
     - Column definitions (type, nullable, defaults)
     - Indexes (primary, unique, foreign keys)
     - Relationships between tables
   - Output: `rental_database_structure_YYYY-MM-DD.yaml`

**Dependencies**:
```json
{
  "mysql2": "^3.0.0"  // Required: npm install mysql2 in backend
}
```

**How to Run**:
```bash
cd database/dump
generate-db-yaml.bat
```

**Output Example**:
```yaml
# Database Structure - Kelly Rental Manager
metadata:
  version: 1.0.0
  timestamp: 2024-11-14T10:30:00.000-06:00

tables:
  - name: rental_properties
    columns:
      - name: id
        type: int
        nullable: false
        primary_key: true
        auto_increment: true
```

### Step 2.4: Create SQL Dump Generator

**Purpose**: Backup rental data (SQL format, restorable)

**File Created**: `database/dump/generate-restorable-dump.bat`

**Features**:
- Auto-detects MySQL installation (Workbench, Server, XAMPP, WAMP, PATH)
- Finds all `rental_*` tables automatically
- Creates timestamped dump file
- Generates restoration report
- Tests database connection before dumping
- Handles errors gracefully

**Key Sections**:
```batch
REM 1. Find mysqldump binary
REM 2. Test database connection
REM 3. Query for rental_* tables
REM 4. Run mysqldump with proper options
REM 5. Generate report with restoration instructions
```

**Mysqldump Options Used**:
```
--single-transaction      # Consistent snapshot
--add-drop-table         # Include DROP statements
--complete-insert        # Full INSERT syntax
--extended-insert        # Bulk inserts
--order-by-primary       # Ordered data
--hex-blob              # Binary data encoding
--lock-tables=false     # Don't lock during dump
```

**How to Run**:
```bash
cd database/dump
generate-restorable-dump.bat
```

**Output Files**:
- `rental_dump_YYYY-MM-DD_HH-MM-SS.sql` - Backup file
- `rental_dump_report_YYYY-MM-DD_HH-MM-SS.log` - Summary report

**How to Restore**:
```bash
mysql -h localhost -P 3307 -u root -p fai_db_sandbox < rental_dump_2024-11-14_10-30-00.sql
```

### Step 2.5: Create Database Documentation

**File Created**: `database/README.md`

**Sections**:
1. **Directory Structure** - What goes where
2. **Tools** - How to use each script
3. **Database Configuration** - Connection details
4. **Requirements** - Dependencies needed
5. **Migration Workflow** - Step-by-step process
6. **Rental Database Schema** - Table overview
7. **Normalization Strategy** - Design decisions
8. **Troubleshooting** - Common issues
9. **Best Practices** - Recommended workflows
10. **Integration** - How backend connects

**Key Information**:
```markdown
## Connection Details
Host: localhost (127.0.0.1)
Port: 3307
User: root
Database: fai_db_sandbox
Filter: rental_* tables only
```

---

## Phase 3: Backend Module Structure (PENDING)

### Step 3.1: Create Infrastructure Layer

**Directory**: `/backend/src/infrastructure/`

**Planned Structure**:
```
infrastructure/
├── database/
│   ├── connection.js           # MySQL connection pool
│   └── migrations.js           # Migration runner
├── middleware/
│   ├── auth.js                # JWT authentication
│   ├── errorHandler.js        # Global error handling
│   └── validation.js          # Request validation
└── utils/
    ├── logger.js              # Winston logger
    └── helpers.js             # Common utilities
```

**Key Files to Create**:

1. **`infrastructure/database/connection.js`**
```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'host.docker.internal',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'fai_db_sandbox',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = { pool };
```

2. **`infrastructure/middleware/auth.js`**
```javascript
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
```

### Step 3.2: Create Rental Module Backend

**Directory**: `/backend/src/modules/rental/`

**Planned Structure**:
```
rental/
├── domain/                    # Business logic
│   ├── Property.js
│   ├── Tenant.js
│   ├── Payment.js
│   └── Transaction.js
├── repositories/              # Database access
│   ├── PropertyRepository.js
│   ├── TenantRepository.js
│   ├── PaymentRepository.js
│   └── TransactionRepository.js
├── services/                  # Business services
│   ├── PropertyService.js
│   ├── TenantService.js
│   ├── PaymentService.js
│   ├── TransactionService.js
│   └── ReconciliationService.js
├── routes/                    # API endpoints
│   ├── index.js              # Route aggregator
│   ├── properties.routes.js
│   ├── tenants.routes.js
│   ├── payments.routes.js
│   └── transactions.routes.js
├── mappers/                   # Data transformation
│   ├── PropertyMapper.js
│   └── TenantMapper.js
└── middleware/                # Module-specific
    └── validation.js
```

**Pattern to Follow** (from Fire-Proof ERP):
- **Repository Pattern**: Database access layer
- **Service Pattern**: Business logic layer
- **Route Aggregation**: Single entry point (`routes/index.js`)
- **Dependency Injection**: Services receive repositories
- **Error Handling**: Try-catch with proper HTTP status codes

### Step 3.3: Create API Routes

**Example**: `routes/properties.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const PropertyService = require('../services/PropertyService');

// GET /api/rental/properties
router.get('/', authenticateToken, async (req, res) => {
  try {
    const properties = await PropertyService.getAll();
    res.json({ success: true, data: properties });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/rental/properties
router.post('/', authenticateToken, async (req, res) => {
  try {
    const property = await PropertyService.create(req.body);
    res.status(201).json({ success: true, data: property });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

**Route Aggregator**: `routes/index.js`
```javascript
const express = require('express');
const router = express.Router();

const propertiesRoutes = require('./properties.routes');
const tenantsRoutes = require('./tenants.routes');
const paymentsRoutes = require('./payments.routes');
const transactionsRoutes = require('./transactions.routes');

router.use('/properties', propertiesRoutes);
router.use('/tenants', tenantsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/transactions', transactionsRoutes);

module.exports = router;
```

### Step 3.4: Create Main Server Entry Point

**File**: `/backend/src/server.js`
```javascript
const express = require('express');
const cors = require('cors');
const rentalRoutes = require('./modules/rental/routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/rental', rentalRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Kelly Rental Manager API running on port ${PORT}`);
});
```

**Package.json**:
```json
{
  "name": "kelly-rental-manager-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "mysql2": "^3.0.0",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

---

## Phase 4: Frontend Module Structure (PENDING)

### Step 4.1: Link to 7D Solutions UI Kit

**UI Kit Location**: `C:\Users\7d.vision\Projects\7D Solutions\ui-kit`

**UI Kit Contents**:
```
ui-kit/
├── css/
│   ├── tokens.css           # Design tokens (colors, spacing, typography)
│   ├── reset.css            # CSS reset
│   └── components.css       # 28 UI components (2,877 lines)
└── js/
    └── mockup-core.js       # MockupStore, ModalManager, Toast, etc.
```

**Integration Method**: Link CSS/JS files in frontend HTML/React

**For Static HTML** (if using):
```html
<link rel="stylesheet" href="../../../ui-kit/css/tokens.css">
<link rel="stylesheet" href="../../../ui-kit/css/reset.css">
<link rel="stylesheet" href="../../../ui-kit/css/components.css">
<script src="../../../ui-kit/js/mockup-core.js"></script>
```

**For React** (if using Vite):
```javascript
// Import CSS in main.tsx or App.tsx
import '../../../ui-kit/css/tokens.css';
import '../../../ui-kit/css/reset.css';
import '../../../ui-kit/css/components.css';
```

### Step 4.2: Create Frontend Module Structure

**Directory**: `/frontend/src/modules/rental/`

**Planned Structure**:
```
rental/
├── components/               # React components
│   ├── PropertyCard.tsx
│   ├── TenantList.tsx
│   ├── PaymentForm.tsx
│   └── TransactionImport.tsx
├── pages/                    # Page components
│   ├── RentLog.tsx
│   ├── Properties.tsx
│   ├── Expenses.tsx
│   ├── Messages.tsx
│   ├── Applications.tsx
│   └── Transactions.tsx
├── context/                  # React context/state
│   └── RentalContext.tsx
├── services/                 # API calls
│   └── rentalApi.ts
├── types/                    # TypeScript types
│   └── rental.types.ts
├── navigation.ts             # Route registration
└── index.tsx                 # Module entry point
```

**Pattern to Follow** (from Fire-Proof ERP):
- **React + TypeScript**
- **Zustand or Context for state**
- **React Router for navigation**
- **Axios for API calls**
- **UI Kit components for all UI elements**

### Step 4.3: Convert Kelly Mockup to React

**Current**: Single HTML file (5,313 lines) with SessionStorage
**Target**: React components with API integration

**Migration Strategy**:
1. Extract each "view" into a React page component
2. Convert MockupStore calls to API calls
3. Replace inline JavaScript with proper event handlers
4. Use UI Kit components instead of raw HTML
5. Add TypeScript types for data structures

**Example Conversion**:

**Before** (Kelly Mockup):
```javascript
const propertiesStore = new MockupStore('kelly-properties');
function addProperty(data) {
  propertiesStore.add(data);
  renderPropertiesTable();
}
```

**After** (React):
```typescript
import { useState, useEffect } from 'react';
import { rentalApi } from '../services/rentalApi';
import { Property } from '../types/rental.types';

export function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    const data = await rentalApi.getProperties();
    setProperties(data);
  }

  async function addProperty(property: Property) {
    const newProperty = await rentalApi.createProperty(property);
    setProperties([...properties, newProperty]);
  }

  return (
    <div className="properties-page">
      {/* UI Kit components here */}
    </div>
  );
}
```

### Step 4.4: Create API Service Layer

**File**: `/frontend/src/modules/rental/services/rentalApi.ts`
```typescript
import axios from 'axios';
import { Property, Tenant, Payment } from '../types/rental.types';

const API_BASE = process.env.VITE_API_URL || 'http://localhost:8000/api/rental';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const rentalApi = {
  // Properties
  getProperties: () => api.get<Property[]>('/properties').then(r => r.data),
  createProperty: (data: Property) => api.post<Property>('/properties', data).then(r => r.data),

  // Tenants
  getTenants: () => api.get<Tenant[]>('/tenants').then(r => r.data),
  createTenant: (data: Tenant) => api.post<Tenant>('/tenants', data).then(r => r.data),

  // Payments
  getPayments: () => api.get<Payment[]>('/payments').then(r => r.data),
  createPayment: (data: Payment) => api.post<Payment>('/payments', data).then(r => r.data),
};
```

### Step 4.5: Setup React Project

**Package.json**:
```json
{
  "name": "kelly-rental-manager-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

## Phase 5: Integration & Testing (PENDING)

### Step 5.1: Run Migrations
```bash
mysql -h localhost -P 3307 -u root -p fai_db_sandbox < backend/src/modules/rental/migrations/001_create_rental_tables.sql
```

### Step 5.2: Verify Database
```bash
cd database/dump
generate-db-yaml.bat
# Review YAML output to confirm 17 tables created
```

### Step 5.3: Start Backend
```bash
cd backend
npm install
npm run dev
# Should start on port 8000
```

### Step 5.4: Start Frontend
```bash
cd frontend
npm install
npm run dev
# Should start on port 3001
```

### Step 5.5: Test API Endpoints
```bash
# Test properties endpoint
curl http://localhost:8000/api/rental/properties

# Test with auth token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/rental/properties
```

---

## Template: New App Checklist

**Use this checklist when spinning up a new modular app:**

### 1. Planning Phase
- [ ] Analyze requirements (mockup, features, data model)
- [ ] Design database schema (normalized, document tables)
- [ ] Create directory structure (backend/frontend/database)

### 2. Database Phase
- [ ] Create `database/` folder with `dump/` and `migrations/` subfolders
- [ ] Write migration SQL files (`001_create_tables.sql`)
- [ ] Copy `generate-db-yaml.bat` and `.js` from template
- [ ] Copy `generate-restorable-dump.bat` from template
- [ ] Write `database/README.md` with connection details
- [ ] Run migration to create tables
- [ ] Verify with YAML generator

### 3. Backend Phase
- [ ] Create `/backend/src/infrastructure/` (database, middleware, utils)
- [ ] Create `/backend/src/modules/[module-name]/` structure
- [ ] Write repositories (database access)
- [ ] Write services (business logic)
- [ ] Write routes (API endpoints)
- [ ] Create route aggregator (`routes/index.js`)
- [ ] Create server entry point (`server.js`)
- [ ] Write `package.json` with dependencies
- [ ] Test API endpoints

### 4. Frontend Phase
- [ ] Link to 7D Solutions ui-kit (CSS + JS)
- [ ] Create `/frontend/src/modules/[module-name]/` structure
- [ ] Write types (TypeScript interfaces)
- [ ] Write API service layer (`services/api.ts`)
- [ ] Write React components (use ui-kit components)
- [ ] Write page components
- [ ] Setup routing
- [ ] Write `package.json` with dependencies
- [ ] Test UI in browser

### 5. Integration Phase
- [ ] Run migrations
- [ ] Start backend (port 8000)
- [ ] Start frontend (port 3001)
- [ ] Test full workflow (create, read, update, delete)
- [ ] Generate database dump (backup)
- [ ] Document any custom patterns in README

---

## Key Patterns & Decisions

### Database
- **Normalization**: Separate tables for optional 1:1 relationships (no NULLs)
- **Naming**: All tables prefixed with module name (`rental_*`)
- **Timestamps**: Every table has `created_at`, `updated_at`
- **Foreign Keys**: Explicit CASCADE or RESTRICT rules

### Backend
- **Repository Pattern**: Separate database access from business logic
- **Service Pattern**: Business logic in services, not routes
- **Route Aggregation**: Single entry point per module
- **Error Handling**: Try-catch with proper HTTP status codes
- **Authentication**: JWT tokens via middleware

### Frontend
- **UI Kit**: ALWAYS use centralized components (never raw HTML)
- **API Service**: Centralized API calls with auth token injection
- **State Management**: Zustand or React Context
- **TypeScript**: Strong typing for all data structures
- **Modular**: One feature = one module folder

### Tooling
- **YAML Generator**: Quick schema reference
- **SQL Dump**: Backup before migrations
- **Documentation**: README in every major folder
- **Version Control**: Migrations numbered sequentially

---

## Progress Tracker

| Phase | Status | Completion Date |
|-------|--------|-----------------|
| 1. Planning & Architecture | ✅ COMPLETED | 2024-11-14 |
| 2. Database Setup | ✅ COMPLETED | 2024-11-14 |
| 3. Backend Infrastructure | ✅ COMPLETED | 2024-11-14 |
| 4. Backend Property Module | ✅ COMPLETED | 2024-11-14 |
| 5. Backend Tenant Module | ✅ COMPLETED | 2024-11-14 |
| 6. Backend Payment Module | ✅ COMPLETED | 2024-11-14 |
| 7. Backend Expense Module | ⏳ PENDING | - |
| 8. Backend Transaction Module | ⏳ PENDING | - |
| 9. Backend Message Module | ⏳ PENDING | - |
| 10. Backend Application Module | ⏳ PENDING | - |
| 11. Frontend Module | ⏳ PENDING | - |
| 12. Integration & Testing | ⏳ PENDING | - |

---

## Backend Implementation Details (Phases 3-6) ✅ COMPLETED

### Phase 3: Backend Infrastructure - COMPLETED 2024-11-14

#### Created Files:

**package.json** (`/backend/package.json`):
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0"
  }
}
```

**connection.js** (`/backend/src/infrastructure/database/connection.js` - 35 lines):
- MySQL connection pool (10 connections)
- Environment-based configuration
- Auto-connect with health check on startup
- Connection details logged

**auth.js** (`/backend/src/infrastructure/middleware/auth.js` - 50 lines):
- `authenticateToken(req, res, next)` - JWT authentication middleware
- `optionalAuth(req, res, next)` - Optional authentication (allows anonymous)
- Consistent error responses

**errorHandler.js** (`/backend/src/infrastructure/middleware/errorHandler.js` - 70 lines):
- `asyncErrorHandler(fn)` - Wraps async routes for automatic error catching
- `globalErrorHandler(err, req, res, next)` - Consistent JSON error responses
- MySQL-specific error handling (ER_DUP_ENTRY, ER_NO_REFERENCED_ROW_2, etc.)
- Development vs production error details

**logger.js** (`/backend/src/infrastructure/utils/logger.js` - 50 lines):
- Timestamped logging (info, error, warn, debug)
- Environment-aware (debug only in development)
- Structured logging format

**server.js** (`/backend/src/server.js` - 65 lines):
- Express app with CORS configuration
- Health check endpoint: `GET /health`
- Request logging (development only)
- Route mounting: `/api/rental`
- 404 handler
- Global error handler
- Process-level error handlers (uncaughtException, unhandledRejection)

**.env** (`/backend/.env`):
```bash
PORT=8001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASS=fireproof_root_sandbox
DB_NAME=fai_db_sandbox
JWT_SECRET=kelly_rental_dev_secret_change_in_production
JWT_EXPIRY=24h
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

**README.md** (`/backend/README.md`):
- Quick start guide
- Architecture overview
- API endpoint documentation
- Environment variable reference
- Troubleshooting guide

### Phase 4: Backend Property Module - COMPLETED 2024-11-14

#### PropertyRepository.js (220 lines)

**Methods**:
- `findAll()` - Get all properties with mortgage data (LEFT JOIN)
- `findById(id)` - Get property with full mortgage details
- `findByStatus(status)` - Filter by status (active/sold/archived)
- `create(data)` - Create new property
- `update(id, data)` - Dynamic field updates
- `delete(id)` - Soft delete (set status='archived')
- `hardDelete(id)` - Permanent deletion (use with caution)
- `getStats()` - Aggregate statistics (total properties, investment, etc.)

**SQL Patterns Used**:
- LEFT JOIN for optional relationships (mortgages)
- Dynamic UPDATE queries (only update provided fields)
- Parameterized queries (SQL injection prevention)

#### PropertyService.js (210 lines)

**Methods**:
- `getAllProperties()` - Get all properties
- `getPropertyById(id)` - Get property (throws 404 if not found)
- `getPropertiesByStatus(status)` - Filter by status with validation
- `createProperty(data)` - Create with comprehensive validation
- `updateProperty(id, data)` - Update with validation
- `deleteProperty(id)` - Soft delete
- `getPropertyStats()` - Statistics
- `_validatePropertyData(data, requireAll)` - Private validation method

**Validation Rules**:
- Address: Required, non-empty
- Type: Must be one of 6 valid types (Single Family, Multi-Family Duplex, etc.)
- Purchase price: Required, > 0
- Purchase date: Required
- Bedrooms: 0-99
- Bathrooms: 0-99
- Square feet: >= 0
- Status: active/sold/archived

#### properties.routes.js (90 lines)

**Endpoints** (all require JWT):
- `GET /api/rental/properties` - List all (with optional ?status= filter)
- `GET /api/rental/properties/stats` - Statistics
- `GET /api/rental/properties/:id` - Get single property
- `POST /api/rental/properties` - Create property
- `PUT /api/rental/properties/:id` - Update property
- `DELETE /api/rental/properties/:id` - Delete property (soft delete)

### Phase 5: Backend Tenant Module - COMPLETED 2024-11-14

#### TenantRepository.js (150 lines)

**Methods**:
- `findAll()` - Get all tenants with property information (INNER JOIN)
- `findById(id)` - Get tenant with property details
- `findByPropertyId(propertyId)` - Get tenants for a specific property
- `create(data)` - Create new tenant
- `update(id, data)` - Dynamic field updates
- `delete(id)` - Soft delete (set status='inactive')

#### TenantService.js (250 lines)

**Methods**:
- `getAllTenants()` - Get all tenants
- `getTenantById(id)` - Get tenant (throws 404 if not found)
- `getTenantsByPropertyId(propertyId)` - Get tenants for property (verifies property exists)
- `createTenant(data)` - Create with validation + property verification
- `updateTenant(id, data)` - Update with validation
- `deleteTenant(id)` - Soft delete
- `_validateTenantData(data, requireAll)` - Private validation method

**Validation Rules**:
- Property ID: Required, must exist
- Name: Required, non-empty
- Email: Required, valid format (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Phone: Valid format if provided (regex: `/^[\d\s\-\(\)\+]+$/`)
- Lease start: Required
- Lease end: Required, must be after lease start
- Monthly rent: Required, > 0
- Security deposit: >= 0
- Status: active/inactive

#### tenants.routes.js (80 lines)

**Endpoints** (all require JWT):
- `GET /api/rental/tenants` - List all (with optional ?property_id= filter)
- `GET /api/rental/tenants/:id` - Get single tenant
- `POST /api/rental/tenants` - Create tenant
- `PUT /api/rental/tenants/:id` - Update tenant
- `DELETE /api/rental/tenants/:id` - Delete tenant (soft delete)

### Phase 6: Backend Payment Module - COMPLETED 2024-11-14

#### PaymentRepository.js (240 lines)

**Methods**:
- `findAll()` - Get all payments with tenant/property information (INNER JOINS)
- `findById(id)` - Get payment with full details
- `findByPropertyId(propertyId, options)` - Get payments for property (with year filter, limit)
- `findByTenantId(tenantId)` - Get payments for tenant
- `create(data)` - Record new payment
- `update(id, data)` - Dynamic field updates
- `delete(id)` - Delete payment
- `getPropertyStats(propertyId, year)` - Payment statistics for property (COUNT, SUM, AVG, MIN, MAX)
- `getMonthlyTotals(propertyId, year)` - Monthly payment breakdown (GROUP BY MONTH)

**SQL Patterns Used**:
- Multiple INNER JOINs (payments → tenants → properties)
- Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
- GROUP BY with date functions (MONTH, YEAR)
- Optional filtering (property_id, year, limit)

#### PaymentService.js (250 lines)

**Methods**:
- `getAllPayments(filters)` - Get payments with filtering (property_id, tenant_id, year, limit)
- `getPaymentById(id)` - Get payment (throws 404 if not found)
- `getPropertyPaymentStats(propertyId, year)` - Statistics for property (verifies property exists)
- `getMonthlyTotals(options)` - Monthly totals (optional property_id, year defaults to current)
- `createPayment(data)` - Create with validation + verification (property exists, tenant exists, tenant belongs to property)
- `updatePayment(id, data)` - Update with validation
- `deletePayment(id)` - Delete payment
- `_validatePaymentData(data, requireAll)` - Private validation method

**Validation Rules**:
- Property ID: Required, must exist
- Tenant ID: Required, must exist, must belong to specified property
- Payment date: Required, valid date, not in future
- Amount: Required, > 0
- Payment method: Required, one of 6 valid methods (cash, check, bank_transfer, credit_card, debit_card, online)

**Business Logic**:
- Verifies tenant belongs to property before creating payment
- Prevents future-dated payments
- Supports flexible filtering by property, tenant, year

#### payments.routes.js (120 lines)

**Endpoints** (all require JWT):
- `GET /api/rental/payments` - List all (filters: ?property_id=, ?tenant_id=, ?year=, ?limit=)
- `GET /api/rental/payments/stats/property/:propertyId` - Property payment stats (requires ?year=)
- `GET /api/rental/payments/monthly-totals` - Monthly totals (optional ?property_id=, ?year=)
- `GET /api/rental/payments/:id` - Get single payment
- `POST /api/rental/payments` - Create payment
- `PUT /api/rental/payments/:id` - Update payment
- `DELETE /api/rental/payments/:id` - Delete payment

---

## Code Quality Metrics

### File Sizes (All Under 300 Lines ✅)

| File | Lines | Status |
|------|-------|--------|
| PropertyRepository.js | 220 | ✅ |
| TenantRepository.js | 150 | ✅ |
| PaymentRepository.js | 240 | ✅ |
| PropertyService.js | 210 | ✅ |
| TenantService.js | 250 | ✅ |
| PaymentService.js | 250 | ✅ |
| properties.routes.js | 90 | ✅ |
| tenants.routes.js | 80 | ✅ |
| payments.routes.js | 120 | ✅ |
| connection.js | 35 | ✅ |
| auth.js | 50 | ✅ |
| errorHandler.js | 70 | ✅ |
| logger.js | 50 | ✅ |
| server.js | 65 | ✅ |

**Total Backend Code**: ~1,680 lines across 14 files
**Average File Size**: 120 lines
**Maximum File Size**: 250 lines (well under 300-line limit)

### Patterns Implemented

- ✅ 3-layer architecture (Routes → Services → Repositories)
- ✅ Repository pattern (data access abstraction)
- ✅ Service pattern (business logic layer)
- ✅ Middleware pattern (cross-cutting concerns)
- ✅ Singleton pattern (repositories and services)
- ✅ Error handling pattern (consistent responses)
- ✅ Validation pattern (service-layer validation)
- ✅ Async error wrapper (automatic error catching)

---

## API Endpoints Summary

**Total**: 20 endpoints (19 require authentication, 1 public)

**Properties** (6 endpoints):
- GET /api/rental/properties
- GET /api/rental/properties/stats
- GET /api/rental/properties/:id
- POST /api/rental/properties
- PUT /api/rental/properties/:id
- DELETE /api/rental/properties/:id

**Tenants** (5 endpoints):
- GET /api/rental/tenants
- GET /api/rental/tenants/:id
- POST /api/rental/tenants
- PUT /api/rental/tenants/:id
- DELETE /api/rental/tenants/:id

**Payments** (8 endpoints):
- GET /api/rental/payments
- GET /api/rental/payments/stats/property/:propertyId
- GET /api/rental/payments/monthly-totals
- GET /api/rental/payments/:id
- POST /api/rental/payments
- PUT /api/rental/payments/:id
- DELETE /api/rental/payments/:id

**System** (1 endpoint):
- GET /health (no auth required)

---

## Server Status

**Running**: ✅ http://localhost:8001
**Database**: ✅ Connected to fai_db_sandbox on port 3307
**Environment**: Development (nodemon auto-reload)
**Health Check**: ✅ Responding

**Startup Logs**:
```
[2025-11-14T13:40:50.976Z] INFO: Kelly Rental Manager API started
[2025-11-14T13:40:50.977Z] INFO: Port: 8001
[2025-11-14T13:40:50.977Z] INFO: Environment: development
[2025-11-14T13:40:50.977Z] INFO: CORS Origins: http://localhost:3000, http://localhost:3001
✅ Database connected successfully
   Host: localhost:3307
   Database: fai_db_sandbox
```

---

**Last Updated**: 2024-11-14
**Next Step**: Create Expense Module (Phase 7) or Frontend Module (Phase 11)
