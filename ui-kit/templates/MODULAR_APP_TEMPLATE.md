# Modular Application Template

**Purpose**: Reusable template for building production-ready modular applications
**Pattern**: 7D Solutions Modular Architecture
**Version**: 1.0
**Created**: 2024-11-14

---

## Architecture Overview

This template provides a complete structure for building modular applications using:
- **Centralized UI Kit** (7D Solutions ui-kit)
- **Modular Backend** (Node.js + Express)
- **Modular Frontend** (React + Vite)
- **Shared Database** (MySQL)
- **Standalone Deployment**

---

## Directory Structure Template

```
[app-name]/
├── README.md                           # App documentation
├── IMPLEMENTATION_ROADMAP.md           # Build progress tracker
├── .env.example                        # Environment template
├── .gitignore                          # Git ignore rules
│
├── database/                           # Database management
│   ├── README.md                       # Database documentation
│   ├── migrations/                     # SQL migration files
│   │   ├── 001_create_initial_tables.sql
│   │   └── 002_add_feature_tables.sql
│   └── dump/                          # Export tools
│       ├── generate-db-yaml.bat       # YAML schema generator
│       ├── generate-database-yaml.js
│       └── generate-restorable-dump.bat
│
├── backend/                           # Backend API
│   ├── package.json
│   ├── .env
│   └── src/
│       ├── server.js                  # Entry point
│       ├── infrastructure/            # Shared infrastructure
│       │   ├── database/
│       │   │   └── connection.js     # MySQL pool
│       │   ├── middleware/
│       │   │   ├── auth.js           # Authentication
│       │   │   ├── errorHandler.js   # Error handling
│       │   │   └── validation.js     # Request validation
│       │   └── utils/
│       │       ├── logger.js         # Winston logger
│       │       └── helpers.js        # Utilities
│       └── modules/
│           └── [module-name]/        # Business module
│               ├── domain/           # Business entities
│               ├── repositories/     # Database access
│               ├── services/         # Business logic
│               ├── routes/           # API endpoints
│               ├── mappers/          # Data transformation
│               └── middleware/       # Module middleware
│
└── frontend/                         # Frontend UI
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx                  # Entry point
        ├── App.tsx                   # Root component
        ├── infrastructure/           # Shared UI infrastructure
        │   ├── api/
        │   │   └── client.ts        # Axios config
        │   ├── auth/
        │   │   └── AuthContext.tsx  # Auth provider
        │   └── router/
        │       └── routes.tsx       # Route config
        └── modules/
            └── [module-name]/       # Business module
                ├── components/      # React components
                ├── pages/          # Page components
                ├── context/        # Module state
                ├── services/       # API calls
                ├── types/          # TypeScript types
                ├── navigation.ts   # Route registration
                └── index.tsx       # Module entry
```

---

## Phase-by-Phase Implementation Guide

### Phase 1: Planning & Architecture

#### Step 1.1: Analyze Requirements
- [ ] Review mockup/wireframes
- [ ] List all features and views
- [ ] Identify data entities
- [ ] Document user workflows

**Output**: Requirements document

#### Step 1.2: Design Database Schema
- [ ] List all tables needed
- [ ] Define relationships (1:1, 1:many, many:many)
- [ ] Apply normalization (avoid NULLs for optional data)
- [ ] Design indexes and foreign keys
- [ ] Document schema in markdown

**Output**: `backend/src/modules/[module]/DATABASE_SCHEMA.md`

**Normalization Pattern**:
```markdown
# For optional 1:1 relationships, use separate tables:
- Core table: users
- Optional table: user_profiles (only if profile exists)
- NO NULL columns in users table for profile data

# Pattern:
rental_properties (33 properties)
  ├─ rental_mortgages (only 23 have mortgages - separate table)
  └─ rental_tenants (only 23 occupied - no vacant property rows)
```

#### Step 1.3: Create Directory Structure
```bash
mkdir -p [app-name]/{database/{migrations,dump},backend/src/{infrastructure,modules},frontend/src/modules}
cd [app-name]
```

**Files to Create**:
- [ ] `README.md` - App overview
- [ ] `IMPLEMENTATION_ROADMAP.md` - Copy this template
- [ ] `.gitignore` - Standard Node.js gitignore

---

### Phase 2: Database Setup

#### Step 2.1: Create Migration Files

**Location**: `database/migrations/001_create_[module]_tables.sql`

**Template**:
```sql
-- Migration: Create [Module] Tables
-- Version: 001
-- Date: YYYY-MM-DD
-- Description: Initial schema

-- Table 1: Core entity
CREATE TABLE IF NOT EXISTS [module]_[entity] (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: Optional relationship (separate to avoid NULLs)
CREATE TABLE IF NOT EXISTS [module]_[entity]_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    [entity]_id INT NOT NULL UNIQUE,
    details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY ([entity]_id) REFERENCES [module]_[entity](id) ON DELETE CASCADE,
    INDEX idx_entity ([entity]_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Patterns**:
- Prefix all tables with `[module]_`
- Use `IF NOT EXISTS` for idempotency
- Always include `created_at`, `updated_at`
- Use ENUMs for fixed choices
- Proper CASCADE rules on foreign keys
- Index frequently queried columns

**Run Migration**:
```bash
mysql -h localhost -P 3307 -u root -p [database] < database/migrations/001_create_[module]_tables.sql
```

#### Step 2.2: Create Database Tooling

**Files to Copy from Template**:

1. **`database/dump/generate-db-yaml.bat`**
   - Source: `/ui-kit/templates/database-tools/generate-db-yaml.bat`
   - Update: Database name, table prefix filter

2. **`database/dump/generate-database-yaml.js`**
   - Source: `/ui-kit/templates/database-tools/generate-database-yaml.js`
   - Update: Database name, table prefix filter, metadata

3. **`database/dump/generate-restorable-dump.bat`**
   - Source: `/ui-kit/templates/database-tools/generate-restorable-dump.bat`
   - Update: Database name, table prefix filter

4. **`database/README.md`**
   - Source: `/ui-kit/templates/database-tools/README.md`
   - Update: Connection details, table list

**Configuration Variables to Update**:
```javascript
// In generate-database-yaml.js
const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3307,                        // Your MySQL port
  user: 'root',
  password: 'your_password',         // UPDATE THIS
  database: 'your_database'          // UPDATE THIS
};

// Table filter
WHERE table_name LIKE '[module]_%'   // UPDATE THIS
```

```batch
REM In .bat files
set "DATABASE=your_database"         REM UPDATE THIS
set "PASSWORD=your_password"         REM UPDATE THIS
```

#### Step 2.3: Verify Database Setup
```bash
cd database/dump
generate-db-yaml.bat
# Review YAML output to confirm tables created correctly
```

---

### Phase 3: Backend Infrastructure

#### Step 3.1: Create Package.json

**File**: `backend/package.json`
```json
{
  "name": "[app-name]-backend",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "mysql2": "^3.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

#### Step 3.2: Create Database Connection

**File**: `backend/src/infrastructure/database/connection.js`
```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'host.docker.internal',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = { pool };
```

#### Step 3.3: Create Authentication Middleware

**File**: `backend/src/infrastructure/middleware/auth.js`
```javascript
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    }
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
```

#### Step 3.4: Create Error Handler

**File**: `backend/src/infrastructure/middleware/errorHandler.js`
```javascript
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function globalErrorHandler(err, req, res, next) {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = { asyncErrorHandler, globalErrorHandler };
```

#### Step 3.5: Create Server Entry Point

**File**: `backend/src/server.js`
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { globalErrorHandler } = require('./infrastructure/middleware/errorHandler');
const [module]Routes = require('./modules/[module]/routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Module routes
app.use('/api/[module]', [module]Routes);

// Error handler (must be last)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`[App Name] API running on port ${PORT}`);
});
```

#### Step 3.6: Create Environment Template

**File**: `backend/.env.example`
```bash
# Database
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASS=your_password_here
DB_NAME=your_database_here

# Server
PORT=8000
NODE_ENV=development

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=24h
```

---

### Phase 4: Backend Module

#### Step 4.1: Create Repository Pattern

**File**: `backend/src/modules/[module]/repositories/[Entity]Repository.js`
```javascript
const { pool } = require('../../../infrastructure/database/connection');

class [Entity]Repository {
  async findAll() {
    const [rows] = await pool.execute(
      'SELECT * FROM [module]_[entity] ORDER BY created_at DESC'
    );
    return rows;
  }

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM [module]_[entity] WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  async create(data) {
    const [result] = await pool.execute(
      'INSERT INTO [module]_[entity] (name, status) VALUES (?, ?)',
      [data.name, data.status || 'active']
    );
    return this.findById(result.insertId);
  }

  async update(id, data) {
    await pool.execute(
      'UPDATE [module]_[entity] SET name = ?, status = ? WHERE id = ?',
      [data.name, data.status, id]
    );
    return this.findById(id);
  }

  async delete(id) {
    await pool.execute(
      'DELETE FROM [module]_[entity] WHERE id = ?',
      [id]
    );
    return true;
  }
}

module.exports = new [Entity]Repository();
```

#### Step 4.2: Create Service Pattern

**File**: `backend/src/modules/[module]/services/[Entity]Service.js`
```javascript
const [Entity]Repository = require('../repositories/[Entity]Repository');

class [Entity]Service {
  async getAll() {
    return await [Entity]Repository.findAll();
  }

  async getById(id) {
    const entity = await [Entity]Repository.findById(id);
    if (!entity) {
      throw new Error('[Entity] not found');
    }
    return entity;
  }

  async create(data) {
    // Validation logic here
    if (!data.name) {
      throw new Error('Name is required');
    }
    return await [Entity]Repository.create(data);
  }

  async update(id, data) {
    await this.getById(id); // Check exists
    return await [Entity]Repository.update(id, data);
  }

  async delete(id) {
    await this.getById(id); // Check exists
    return await [Entity]Repository.delete(id);
  }
}

module.exports = new [Entity]Service();
```

#### Step 4.3: Create Routes

**File**: `backend/src/modules/[module]/routes/[entity].routes.js`
```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const [Entity]Service = require('../services/[Entity]Service');

// GET /api/[module]/[entity]
router.get('/', authenticateToken, asyncErrorHandler(async (req, res) => {
  const entities = await [Entity]Service.getAll();
  res.json({ success: true, data: entities });
}));

// GET /api/[module]/[entity]/:id
router.get('/:id', authenticateToken, asyncErrorHandler(async (req, res) => {
  const entity = await [Entity]Service.getById(req.params.id);
  res.json({ success: true, data: entity });
}));

// POST /api/[module]/[entity]
router.post('/', authenticateToken, asyncErrorHandler(async (req, res) => {
  const entity = await [Entity]Service.create(req.body);
  res.status(201).json({ success: true, data: entity });
}));

// PUT /api/[module]/[entity]/:id
router.put('/:id', authenticateToken, asyncErrorHandler(async (req, res) => {
  const entity = await [Entity]Service.update(req.params.id, req.body);
  res.json({ success: true, data: entity });
}));

// DELETE /api/[module]/[entity]/:id
router.delete('/:id', authenticateToken, asyncErrorHandler(async (req, res) => {
  await [Entity]Service.delete(req.params.id);
  res.json({ success: true, message: '[Entity] deleted' });
}));

module.exports = router;
```

#### Step 4.4: Create Route Aggregator

**File**: `backend/src/modules/[module]/routes/index.js`
```javascript
const express = require('express');
const router = express.Router();

const [entity]Routes = require('./[entity].routes');
// Import other route files

router.use('/[entity]', [entity]Routes);
// Mount other routes

module.exports = router;
```

---

### Phase 5: Frontend Setup

#### Step 5.1: Create Package.json

**File**: `frontend/package.json`
```json
{
  "name": "[app-name]-frontend",
  "version": "1.0.0",
  "type": "module",
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

#### Step 5.2: Link UI Kit

**File**: `frontend/src/main.tsx`
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import 7D Solutions UI Kit
import '../../../ui-kit/css/tokens.css';
import '../../../ui-kit/css/reset.css';
import '../../../ui-kit/css/components.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**CRITICAL**: Always use UI Kit components, never raw HTML!

#### Step 5.3: Create API Service

**File**: `frontend/src/modules/[module]/services/api.ts`
```typescript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/[module]';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Inject auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const [module]Api = {
  getEntities: () => api.get('/[entity]').then(r => r.data.data),
  getEntity: (id: number) => api.get(`/[entity]/${id}`).then(r => r.data.data),
  createEntity: (data: any) => api.post('/[entity]', data).then(r => r.data.data),
  updateEntity: (id: number, data: any) => api.put(`/[entity]/${id}`, data).then(r => r.data.data),
  deleteEntity: (id: number) => api.delete(`/[entity]/${id}`).then(r => r.data),
};
```

#### Step 5.4: Create TypeScript Types

**File**: `frontend/src/modules/[module]/types/[module].types.ts`
```typescript
export interface [Entity] {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Create[Entity]Data {
  name: string;
  status?: 'active' | 'inactive';
}

export interface Update[Entity]Data {
  name?: string;
  status?: 'active' | 'inactive';
}
```

#### Step 5.5: Create React Component

**File**: `frontend/src/modules/[module]/pages/[Entity]List.tsx`
```typescript
import { useState, useEffect } from 'react';
import { [module]Api } from '../services/api';
import { [Entity] } from '../types/[module].types';

export function [Entity]List() {
  const [entities, setEntities] = useState<[Entity][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntities();
  }, []);

  async function loadEntities() {
    try {
      const data = await [module]Api.getEntities();
      setEntities(data);
    } catch (error) {
      console.error('Failed to load entities:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="[entity]-list">
      <h1>[Entity] List</h1>
      {/* Use UI Kit components here */}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {entities.map(entity => (
            <tr key={entity.id}>
              <td>{entity.id}</td>
              <td>{entity.name}</td>
              <td>{entity.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Reference Implementation

**Example**: Kelly Rental Manager
**Location**: `/7D Solutions/clients/kelly-enterprises/rental-manager/`

This is a complete reference implementation following this template:
- 17 database tables (fully normalized)
- Backend module with repositories, services, routes
- Frontend module with React components
- Database tooling (YAML generator, SQL dumps)
- Complete documentation

**Review this for examples of:**
- Complex relationships (properties → mortgages → tenants → payments)
- Optional 1:1 relationships (separate tables, no NULLs)
- Transaction reconciliation logic
- Bank import functionality
- Multi-view React application

---

## Template Checklist

Use this when creating a new app:

### Setup Phase
- [ ] Create directory structure
- [ ] Copy this template as `IMPLEMENTATION_ROADMAP.md`
- [ ] Create `README.md` with app overview
- [ ] Create `.gitignore`

### Database Phase
- [ ] Design schema (document in markdown)
- [ ] Create migration files
- [ ] Copy database tooling from `/ui-kit/templates/database-tools/`
- [ ] Update connection details in tools
- [ ] Run migrations
- [ ] Verify with YAML generator

### Backend Phase
- [ ] Create `package.json`
- [ ] Copy infrastructure files from template
- [ ] Create database connection
- [ ] Create module structure (repositories, services, routes)
- [ ] Create server entry point
- [ ] Create `.env.example`
- [ ] Test API endpoints

### Frontend Phase
- [ ] Create `package.json`
- [ ] Link UI Kit CSS/JS
- [ ] Create module structure (types, services, components)
- [ ] Create API service layer
- [ ] Create React components (use UI Kit components only!)
- [ ] Setup routing
- [ ] Test UI

### Documentation Phase
- [ ] Update `IMPLEMENTATION_ROADMAP.md` with progress
- [ ] Document custom patterns in `README.md`
- [ ] Document API endpoints
- [ ] Create `.env.example` with all variables

---

## Key Principles

### Database
1. **Normalize**: Separate tables for optional 1:1 relationships (no NULLs)
2. **Prefix**: All tables use `[module]_` prefix
3. **Timestamps**: Every table has `created_at`, `updated_at`
4. **Indexes**: Index all foreign keys and frequently queried columns

### Backend
1. **Layers**: Repository → Service → Route (never skip layers)
2. **Error Handling**: Try-catch with proper HTTP status codes
3. **Authentication**: JWT via middleware
4. **Validation**: Check inputs in services, not routes

### Frontend
1. **UI Kit Only**: NEVER use raw HTML elements (use UI Kit components)
2. **API Layer**: Centralized API calls with auth injection
3. **Types**: Strong TypeScript typing
4. **State**: Zustand or Context (not prop drilling)

### Tooling
1. **YAML Generator**: Quick schema reference
2. **SQL Dumps**: Backup before migrations
3. **Documentation**: README in major folders
4. **Version Control**: Sequential migration numbering

---

**Last Updated**: 2024-11-14
**Template Version**: 1.0
**Maintained By**: 7D Solutions
