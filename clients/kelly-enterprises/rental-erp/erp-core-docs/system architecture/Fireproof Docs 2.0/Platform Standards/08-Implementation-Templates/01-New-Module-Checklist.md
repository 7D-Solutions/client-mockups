# New Module Implementation Checklist

Complete step-by-step guide for creating a new module in the Fire-Proof ERP Platform.

## Overview

This checklist ensures consistent module creation following platform standards. Use this for any new business domain (e.g., inventory, purchasing, sales).

## Prerequisites

- [ ] Module name decided (e.g., `inventory`, `purchasing`)
- [ ] Database tables designed
- [ ] API endpoints planned
- [ ] User permissions identified
- [ ] UI/UX designs reviewed

## Backend Setup

### 1. Module Folder Structure

```bash
backend/src/modules/[MODULE_NAME]/
├── routes/
│   └── [module]Routes.js          # API routes
├── services/
│   ├── [Module]Service.js         # Main business logic
│   └── [Module]ValidationService.js  # Validation logic
├── repositories/
│   └── [Module]Repository.js      # Data access layer
├── mappers/
│   └── [Module]DTOMapper.js       # DTO transformations
├── presenters/
│   └── [Module]Presenter.js       # Display name generation
└── index.js                        # Module exports
```

**Action Items**:
- [ ] Create module directory: `backend/src/modules/[MODULE_NAME]/`
- [ ] Create `routes/`, `services/`, `repositories/` folders
- [ ] Create `index.js` for module exports

### 2. Database Setup

```sql
-- TODO: Replace with actual module tables
CREATE TABLE [module_name] (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- Add module-specific fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    is_deleted TINYINT DEFAULT 0,
    INDEX idx_created_by (created_by),
    INDEX idx_is_deleted (is_deleted),
    FOREIGN KEY (created_by) REFERENCES core_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Action Items**:
- [ ] Create database migration file
- [ ] Add required tables with proper indexes
- [ ] Add foreign key constraints
- [ ] Add audit trail columns (created_at, updated_at, created_by)
- [ ] Test migration locally
- [ ] Document table structure

### 3. Repository Implementation

**File**: `backend/src/modules/[MODULE_NAME]/repositories/[Module]Repository.js`

```javascript
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');
const [Module]DTOMapper = require('../mappers/[Module]DTOMapper');

class [Module]Repository extends BaseRepository {
  constructor() {
    super('[table_name]', 'id'); // TODO: Replace with actual table name
  }

  /**
   * UNIVERSAL REPOSITORY IMPLEMENTATION - Primary Key
   */
  async findByPrimaryKey(id, connection = null) {
    try {
      return await this.get[ModuleName]ById(id, connection);
    } catch (error) {
      logger.error('[Module]Repository.findByPrimaryKey failed:', {
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get [module item] by ID
   * TODO: Implement actual query logic
   */
  async get[ModuleName]ById(id, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const items = await this.executeQuery(
        `SELECT * FROM [table_name] WHERE id = ? AND is_deleted = 0`,
        [id],
        connection
      );

      if (items.length === 0) return null;

      return [Module]DTOMapper.transformToDTO(items[0]);
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Create new [module item]
   * TODO: Customize fields for your module
   */
  async create[ModuleName](data, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      const dbData = [Module]DTOMapper.transformFromDTO(data);

      const res = await this.executeQuery(
        `INSERT INTO [table_name] (/* TODO: Add fields */)
         VALUES (/* TODO: Add placeholders */)`,
        [/* TODO: Add values */],
        connection
      );

      if (shouldCommit) await connection.commit();

      const created = { id: res.insertId, ...dbData };
      return [Module]DTOMapper.transformToDTO(created);
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to create [module item]:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update [module item]
   * TODO: Customize update logic
   */
  async update[ModuleName](id, updates, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      const dbUpdates = [Module]DTOMapper.transformFromDTO(updates);
      const result = await this.update(id, dbUpdates, connection);

      if (shouldCommit) await connection.commit();

      return [Module]DTOMapper.transformToDTO(result);
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to update [module item]:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = [Module]Repository;
```

**Action Items**:
- [ ] Replace `[Module]` with actual module name
- [ ] Replace `[table_name]` with actual table name
- [ ] Implement custom query methods
- [ ] Add proper error handling
- [ ] Add JSDoc documentation

### 4. Service Implementation

**File**: `backend/src/modules/[MODULE_NAME]/services/[Module]Service.js`

```javascript
const BaseService = require('../../../infrastructure/services/BaseService');
const auditService = require('../../../infrastructure/audit/auditService');
const logger = require('../../../infrastructure/utils/logger');

/**
 * [Module]Service - TODO: Describe service responsibility
 */
class [Module]Service extends BaseService {
  constructor([module]Repository, options = {}) {
    super([module]Repository, options);
    this.auditService = auditService;
  }

  /**
   * Private helper: Log audit action
   */
  async _logAuditAction(action, recordId, userId, details = {}) {
    await this.auditService.logAction({
      module: '[module_name]', // TODO: Replace with module name
      action,
      tableName: '[table_name]', // TODO: Replace with table name
      recordId,
      userId: userId || null,
      ipAddress: details.ipAddress || '127.0.0.1',
      ...details
    });
  }

  /**
   * Create new [module item]
   * TODO: Add validation and business logic
   */
  async create[ModuleName](data, userId) {
    // Validate required fields
    if (!data.required_field) { // TODO: Add actual validation
      throw new Error('Required field is missing');
    }

    // Create item
    const item = await this.repository.create[ModuleName]({
      ...data,
      created_by: userId
    });

    // Log creation
    await this._logAuditAction('[module]_created', item.id, userId, {
      details: {
        // TODO: Add relevant audit details
      }
    });

    return item;
  }

  /**
   * Update existing [module item]
   * TODO: Add update logic and validation
   */
  async update[ModuleName](id, updates, userId = null) {
    const oldItem = await this.repository.get[ModuleName]ById(id);
    if (!oldItem) {
      throw new Error('[Module item] not found');
    }

    const item = await this.repository.update[ModuleName](id, updates);

    await this.auditService.logAction({
      module: '[module_name]',
      action: '[module]_updated',
      tableName: '[table_name]',
      recordId: id,
      userId,
      ipAddress: '127.0.0.1',
      oldValues: oldItem,
      newValues: updates
    });

    return item;
  }

  /**
   * Delete [module item] (soft delete)
   * TODO: Add deletion logic
   */
  async delete[ModuleName](id, userId = null) {
    const result = await this.repository.softDelete(id);
    await this._logAuditAction('[module]_deleted', id, userId);
    return result;
  }

  /**
   * Get [module item] by ID
   */
  async get[ModuleName]ById(id) {
    return await this.repository.get[ModuleName]ById(id);
  }
}

module.exports = [Module]Service;
```

**Action Items**:
- [ ] Replace `[Module]` with actual module name
- [ ] Implement business logic methods
- [ ] Add validation logic
- [ ] Add audit trail integration
- [ ] Add transaction management where needed
- [ ] Keep file under 300 lines

### 5. API Routes Implementation

**File**: `backend/src/modules/[MODULE_NAME]/routes/[module]Routes.js`

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../../../infrastructure/middleware/auth');
const [Module]Repository = require('../repositories/[Module]Repository');
const [Module]Service = require('../services/[Module]Service');

// Initialize service
const [module]Repository = new [Module]Repository();
const [module]Service = new [Module]Service([module]Repository);

/**
 * @route GET /api/[module]
 * @desc Get all [module items] with pagination
 * @access Private
 * TODO: Add query parameter validation
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    // TODO: Implement list logic with pagination
    const items = await [module]Service.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: items.length
      }
    });
  } catch (error) {
    logger.error('[Module] list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch [module items]',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/[module]/:id
 * @desc Get [module item] by ID
 * @access Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await [module]Service.get[ModuleName]ById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: '[Module item] not found'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    logger.error('[Module] get error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch [module item]',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/[module]
 * @desc Create new [module item]
 * @access Private - Requires operator role
 * TODO: Add request validation
 */
router.post('/', authenticateToken, requireRole('operator'), async (req, res) => {
  try {
    const userId = req.user.user_id;
    const item = await [module]Service.create[ModuleName](req.body, userId);

    res.status(201).json({
      success: true,
      message: '[Module item] created successfully',
      data: item
    });
  } catch (error) {
    logger.error('[Module] create error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route PATCH /api/[module]/:id
 * @desc Update [module item]
 * @access Private - Requires operator role
 * TODO: Add update validation
 */
router.patch('/:id', authenticateToken, requireRole('operator'), async (req, res) => {
  try {
    const userId = req.user.user_id;
    const item = await [module]Service.update[ModuleName](
      req.params.id,
      req.body,
      userId
    );

    res.json({
      success: true,
      message: '[Module item] updated successfully',
      data: item
    });
  } catch (error) {
    logger.error('[Module] update error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route DELETE /api/[module]/:id
 * @desc Delete [module item] (soft delete)
 * @access Private - Requires admin role
 */
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.user.user_id;
    await [module]Service.delete[ModuleName](req.params.id, userId);

    res.json({
      success: true,
      message: '[Module item] deleted successfully'
    });
  } catch (error) {
    logger.error('[Module] delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete [module item]',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
```

**Action Items**:
- [ ] Replace `[module]` with actual module name
- [ ] Add request validation middleware
- [ ] Add proper error handling
- [ ] Add JSDoc for all routes
- [ ] Test all endpoints with Postman

### 6. Register Routes

**File**: `backend/src/app.js`

```javascript
// TODO: Add after existing route imports
const [module]Routes = require('./modules/[MODULE_NAME]/routes/[module]Routes');

// TODO: Add after existing route registrations
app.use('/api/[module]', [module]Routes);
```

**Action Items**:
- [ ] Add route import
- [ ] Register route with Express app
- [ ] Restart backend container
- [ ] Test endpoint access

## Frontend Setup

### 1. Frontend Module Structure

```bash
frontend/src/modules/[MODULE_NAME]/
├── pages/
│   ├── [Module]Dashboard.tsx      # Main page
│   ├── [Module]List.tsx           # List view
│   └── [Module]Detail.tsx         # Detail view
├── components/
│   ├── [Module]Form.tsx           # Create/edit form
│   └── [Module]Card.tsx           # Display card
├── context/
│   └── index.tsx                   # Module context
├── services/
│   └── [module]Service.ts         # API client
├── types/
│   └── index.ts                    # TypeScript types
└── index.ts                        # Module exports
```

**Action Items**:
- [ ] Create module directory: `frontend/src/modules/[MODULE_NAME]/`
- [ ] Create subdirectories (pages, components, context, services, types)
- [ ] Create `index.ts` for module exports

### 2. TypeScript Types

**File**: `frontend/src/modules/[MODULE_NAME]/types/index.ts`

```typescript
// TODO: Define module-specific types
export interface [ModuleName] {
  id: string;
  // TODO: Add module fields
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  isDeleted: boolean;
}

export interface Create[ModuleName]Data {
  // TODO: Add creation fields
}

export interface Update[ModuleName]Data {
  // TODO: Add update fields (all optional)
}
```

**Action Items**:
- [ ] Define all module types
- [ ] Export types from index.ts
- [ ] Document type fields

### 3. API Service

**File**: `frontend/src/modules/[MODULE_NAME]/services/[module]Service.ts`

```typescript
import { apiClient } from '../../../infrastructure/api/client';
import type { [ModuleName], Create[ModuleName]Data, Update[ModuleName]Data } from '../types';

export const [module]Service = {
  // Get all items
  async getAll(params?: { page?: number; limit?: number; search?: string }) {
    const response = await apiClient.get('/[module]', { params });
    return response.data;
  },

  // Get item by ID
  async getById(id: string): Promise<[ModuleName]> {
    const response = await apiClient.get(`/[module]/${id}`);
    return response.data.data;
  },

  // Create new item
  async create(data: Create[ModuleName]Data): Promise<[ModuleName]> {
    const response = await apiClient.post('/[module]', data);
    return response.data.data;
  },

  // Update item
  async update(id: string, data: Update[ModuleName]Data): Promise<[ModuleName]> {
    const response = await apiClient.patch(`/[module]/${id}`, data);
    return response.data.data;
  },

  // Delete item
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/[module]/${id}`);
  }
};
```

**Action Items**:
- [ ] Implement all API methods
- [ ] Add error handling
- [ ] Add TypeScript types

### 4. Page Component

**File**: `frontend/src/modules/[MODULE_NAME]/pages/[Module]List.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { [module]Service } from '../services/[module]Service';
import { LoadingSpinner, Button, DataTable } from '../../../infrastructure/components';
import type { [ModuleName] } from '../types';

export const [Module]List: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<[ModuleName][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await [module]Service.getAll();
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <h1>[Module] Management</h1>
        <Button onClick={() => navigate('/[module]/create')}>
          Add New [Module Item]
        </Button>
      </div>

      <DataTable
        tableId="[module]-list"
        columns={[
          // TODO: Define columns
        ]}
        data={items}
        onRowClick={(item) => navigate(`/[module]/${item.id}`)}
        emptyMessage="No items found"
      />
    </div>
  );
};
```

**Action Items**:
- [ ] Customize page layout
- [ ] Add DataTable columns
- [ ] Add search/filter functionality
- [ ] Add pagination
- [ ] Test page rendering

### 5. Register Routes

**File**: `frontend/src/App.tsx`

```typescript
// TODO: Add import
import { [Module]List, [Module]Detail } from './modules/[MODULE_NAME]';

// TODO: Add routes
<Route path="/[module]" element={<[Module]List />} />
<Route path="/[module]/:id" element={<[Module]Detail />} />
```

**Action Items**:
- [ ] Add route imports
- [ ] Register routes in App.tsx
- [ ] Add navigation menu item
- [ ] Test navigation

## Testing Setup

### 1. Integration Tests

**File**: `backend/tests/integration/modules/[MODULE_NAME]/[module].test.js`

```javascript
const request = require('supertest');
const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

// TODO: See Integration Test Template for complete example
```

**Action Items**:
- [ ] Create test file
- [ ] Write CRUD tests
- [ ] Add validation tests
- [ ] Add authentication tests
- [ ] Achieve ≥70% coverage

### 2. E2E Tests

**File**: `frontend/tests/e2e/specs/[module].spec.ts`

```typescript
import { test, expect } from '@playwright/test';

// TODO: See E2E Test Template for complete example
```

**Action Items**:
- [ ] Create test file
- [ ] Write user workflow tests
- [ ] Add form validation tests
- [ ] Test all user roles

## Documentation

### 1. Module README

**File**: `backend/src/modules/[MODULE_NAME]/README.md`

```markdown
# [Module Name] Module

## Overview
[Brief description of module purpose]

## Features
- Feature 1
- Feature 2

## API Endpoints
- `GET /api/[module]` - List items
- `GET /api/[module]/:id` - Get item
- `POST /api/[module]` - Create item
- `PATCH /api/[module]/:id` - Update item
- `DELETE /api/[module]/:id` - Delete item

## Database Tables
- `[table_name]` - Main table

## Dependencies
- Infrastructure services
- Other modules
```

**Action Items**:
- [ ] Create module README
- [ ] Document API endpoints
- [ ] Document database schema
- [ ] Add usage examples

## Code Review Checklist

### Architecture
- [ ] Follows modular architecture patterns
- [ ] Uses infrastructure services (no duplication)
- [ ] Implements proper separation of concerns
- [ ] Files under 300 lines (hard limit: 500)

### Security
- [ ] No hardcoded credentials
- [ ] Authentication on all routes
- [ ] Proper role-based access control
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention

### Quality
- [ ] JSDoc/TypeDoc documentation
- [ ] Error handling on all paths
- [ ] Audit trail integration
- [ ] Transaction management
- [ ] Consistent naming conventions

### Testing
- [ ] Integration tests written
- [ ] E2E tests written
- [ ] ≥80% unit test coverage
- [ ] ≥70% integration test coverage
- [ ] All tests passing

### Frontend
- [ ] Uses infrastructure components only
- [ ] No raw HTML elements
- [ ] Uses apiClient (no direct fetch)
- [ ] TypeScript types defined
- [ ] CSS modules for styles

### Performance
- [ ] Database queries optimized
- [ ] Proper indexing
- [ ] Pagination implemented
- [ ] No N+1 query problems

## Common Pitfalls

### Backend
- ❌ Duplicating auth logic instead of using infrastructure
- ❌ Hardcoding database config instead of env variables
- ❌ Skipping transaction management for multi-step operations
- ❌ Creating files >300 lines instead of extracting classes

### Frontend
- ❌ Using raw `<button>` instead of `<Button>` component
- ❌ Using direct `fetch()` instead of `apiClient`
- ❌ Creating inline styles instead of CSS modules
- ❌ Duplicating API logic in components instead of services

### Testing
- ❌ Creating `__tests__/` folders instead of using test directories
- ❌ Not using transactions in tests (causes data pollution)
- ❌ Hardcoding test data instead of using fixtures
- ❌ Skipping cleanup in afterEach

## Success Criteria

Module is complete when:
- ✅ All backend endpoints working
- ✅ All frontend pages rendering
- ✅ Tests passing with required coverage
- ✅ Documentation complete
- ✅ Code review approved
- ✅ No security vulnerabilities
- ✅ Performance acceptable
- ✅ Production deployment successful
