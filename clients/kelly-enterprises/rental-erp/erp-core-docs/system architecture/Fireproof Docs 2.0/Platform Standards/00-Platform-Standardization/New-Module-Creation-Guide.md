# New Module Creation Guide for Fire-Proof ERP

**Purpose**: A step-by-step guide for developers building compliant, production-quality modules in Fire-Proof ERP.

**Last Updated**: 2025-11-07

---

## Table of Contents

1. [What HAS Been Standardized](#1-what-has-been-standardized)
2. [Module Architecture Patterns](#2-module-architecture-patterns)
3. [Common Tasks Reference](#3-common-tasks-reference)
4. [Module Creation Checklist](#4-module-creation-checklist)
5. [Validation & Quality Assurance](#5-validation--quality-assurance)

---

## 1. What HAS Been Standardized

### Frontend Infrastructure Components (74 Components)

**Location**: `/frontend/src/infrastructure/components/`

**Rule**: NEVER create raw HTML elements. ALWAYS use these centralized components.

#### Button Components
```typescript
// Import statement
import { Button } from '../../infrastructure/components';

// Available button components
Button                    // Base button with double-click protection
ActionButton             // Quick action button
InlineActions            // Action button group
TableCheckoutButton      // Specialized checkout action
TableCheckinButton       // Specialized checkin action
TableTransferButton      // Specialized transfer action
TableViewButton          // Specialized view action
```

#### Semantic Button Components
```typescript
// Import statement
import { SaveButton, CancelButton, DeleteButton } from '../../infrastructure/components';

// Available semantic buttons (use these instead of generic Button when possible)
CloseButton              // For closing modals/dialogs
CancelButton             // For canceling operations
BackButton               // For navigation back
SaveButton               // For save operations
SubmitButton             // For form submission
ContinueButton           // For multi-step workflows
CheckoutButton           // For checkout operations
DoneButton               // For completion actions
ConfirmButton            // For confirmations
AcceptButton             // For accepting items
ApproveButton            // For approvals
DeleteButton             // For deletions
RemoveButton             // For removing items
RejectButton             // For rejections
DeclineButton            // For declining items
ResetButton              // For reset operations
ClearButton              // For clearing forms
RetryButton              // For retry operations
ResetPasswordButton      // For password resets
```

#### Form Components
```typescript
// Import statement
import { FormInput, FormSelect, FormTextarea, FormCheckbox } from '../../infrastructure/components';

// Available form components
FormInput                // Text input with label
FormSelect               // Select dropdown with label
FormTextarea             // Textarea with label
FormCheckbox             // Checkbox with label
FormRadio                // Radio button with label
SearchableSelect         // Searchable dropdown
FileInput                // File upload input
StorageLocationSelect    // Location picker
FormSection              // Section container with title
```

#### Modal Components
```typescript
// Import statement
import { Modal, RejectModal, PasswordModal } from '../../infrastructure/components';

// Available modal components
Modal                    // Base modal component
RejectModal              // Rejection workflow modal
PasswordModal            // Password entry modal
ChangePasswordModal      // Password change modal
ModalManager             // Modal orchestration
```

#### Data Display Components
```typescript
// Import statement
import { DataTable, Badge, Tag, Alert } from '../../infrastructure/components';

// Available display components
DataTable                // Full-featured data table
DateRangePicker          // Date range selector
Pagination               // Pagination controls
Breadcrumb               // Navigation breadcrumbs
Badge                    // Status badges
Tag                      // Inline tags
Alert                    // Alert messages
GaugeTypeBadge           // Gauge-specific badge
GaugeStatusBadge         // Status-specific badge
```

#### Layout Components
```typescript
// Import statement
import { Card, CardHeader, CardTitle, CardContent } from '../../infrastructure/components';

// Available layout components
Card                     // Card container
CardHeader               // Card header
CardTitle                // Card title
CardContent              // Card content area
Tabs                     // Tab container
TabsList                 // Tab list
TabsTrigger              // Tab trigger
TabsContent              // Tab content area
```

#### Typography Components
```typescript
// Import statement
import { DetailRow, SectionHeader, InfoCard } from '../../infrastructure/components';

// Available typography components
DetailRow                // Label-value row
SectionHeader            // Section header
InfoCard                 // Information card
LocationDisplay          // Location display
```

#### UI Elements
```typescript
// Import statement
import { LoadingSpinner, Icon, ErrorBoundary } from '../../infrastructure/components';

// Available UI elements
LoadingSpinner           // Loading indicator
LoadingOverlay           // Full-screen loading
Icon                     // FontAwesome icons
ErrorBoundary            // Error boundary wrapper
FontAwesomeCheck         // Font setup check
```

#### Layout & Navigation
```typescript
// Import statement
import { MainLayout, Sidebar, UserMenu } from '../../infrastructure/components';

// Available layout components
MainLayout               // Main app layout
LoginScreen              // Login page
UserMenu                 // User menu dropdown
Sidebar                  // Navigation sidebar
RouteMonitor             // Route monitoring
```

#### Notifications
```typescript
// Import statement
import { useToast, ToastContainer, ConnectedToastContainer } from '../../infrastructure/components';

// Available notification components
useToast                 // Toast hook for notifications
ToastContainer           // Toast container
ConnectedToastContainer  // Connected toast container
```

### Backend Infrastructure Services

**Location**: `/backend/src/infrastructure/`

**Rule**: ALWAYS use infrastructure services. NEVER create duplicate functionality.

#### Repositories (25 Repositories)
```javascript
// Base Repository (MUST extend this)
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');

// Usage example
class MyRepository extends BaseRepository {
  constructor() {
    super('my_table_name', 'id');
  }

  // Add custom methods here
}
```

**Available Repository Methods**:
- `findById(id)` - Get single record by ID
- `findAll(filters, options)` - Get multiple records
- `create(data)` - Create new record
- `update(id, data)` - Update existing record
- `delete(id)` - Delete record
- `executeQuery(sql, params, connection)` - Execute custom query

#### Middleware (13 Middleware Components)
```javascript
// Authentication
const { authenticateToken } = require('../../../infrastructure/middleware/auth');

// Permission checking
const checkPermission = require('../../../infrastructure/middleware/checkPermission');

// Error handling
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');

// Audit logging
const auditMiddleware = require('../../../infrastructure/middleware/auditMiddleware');

// Available middleware
auth                     // JWT authentication
checkPermission          // Permission enforcement
permissionEnforcement    // Advanced permission checks
errorHandler             // Error handling wrapper
asyncErrorHandler        // Async error wrapper
auditMiddleware          // Audit logging
rateLimiter              // Rate limiting
securityHeaders          // Security headers
sessionManager           // Session management
strictFieldValidator     // Field validation
pathValidation           // Path validation
etag                     // ETag support
idempotency              // Idempotency support
upload                   // File upload handling
```

#### Utilities (12 Utility Modules)
```javascript
// Logging
const logger = require('../../../infrastructure/utils/logger');

// Pagination
const pagination = require('../../../infrastructure/utils/pagination');

// Audit service
const auditService = require('../../../infrastructure/audit/auditService');

// Available utilities
logger                   // Structured logging
pagination               // Pagination helpers
auditService             // Audit trail service
circuitBreaker           // Circuit breaker pattern
dataSanitizer            // Data sanitization
dateFormatter            // Date formatting
errorClassifier          // Error classification
gracefulDegradation      // Degradation handling
performanceMonitor       // Performance monitoring
redisClient              // Redis client
retryHandler             // Retry logic
sealStatusConverter      // Status conversion
passwordValidator        // Password validation
```

#### Database
```javascript
// Database connection pool
const { pool } = require('../../../infrastructure/database/connection');

// Usage
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  // ... your queries
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

---

## 2. Module Architecture Patterns

### Backend Architecture: Routes → Controllers → Services → Repositories

**Reference Module**: `/backend/src/modules/inventory/`

#### Directory Structure
```
backend/src/modules/your-module/
├── routes/
│   └── your-module.routes.js         # Express routes
├── controllers/
│   └── yourModuleController.js       # Request handlers
├── services/
│   └── YourModuleService.js          # Business logic
└── repositories/
    └── YourModuleRepository.js       # Database access
```

#### 1. Repository Layer (Database Access)

**File**: `repositories/YourModuleRepository.js`

```javascript
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

/**
 * YourModuleRepository
 *
 * Handles CRUD operations for your_table_name table
 * Provides data access methods with proper error handling
 */
class YourModuleRepository extends BaseRepository {
  constructor() {
    super('your_table_name', 'id');
  }

  /**
   * Get items by custom criteria
   * @param {Object} filters - Filter criteria
   * @param {Object} connection - Optional database connection
   * @returns {Promise<Array>} List of items
   */
  async getItemsByCustomCriteria(filters, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        SELECT yt.*, u.username as created_by_username
        FROM your_table_name yt
        LEFT JOIN core_users u ON yt.created_by = u.id
        WHERE yt.status = ?
        ORDER BY yt.created_at DESC
      `;

      const params = [filters.status];
      const results = await this.executeQuery(sql, params, conn);

      return results;
    } catch (error) {
      logger.error('Failed to get items by criteria:', {
        error: error.message,
        filters
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Create new item with validation
   * @param {Object} data - Item data
   * @param {Object} connection - Optional database connection
   * @returns {Promise<number>} The ID of created item
   */
  async createItem(data, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        INSERT INTO your_table_name (
          name,
          description,
          status,
          created_by,
          created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `;

      const params = [
        data.name,
        data.description,
        data.status || 'active',
        data.created_by
      ];

      const result = await this.executeQuery(sql, params, conn);

      logger.info('Item created:', {
        itemId: result.insertId,
        name: data.name
      });

      return result.insertId;
    } catch (error) {
      logger.error('Failed to create item:', {
        error: error.message,
        data
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }
}

module.exports = YourModuleRepository;
```

#### 2. Service Layer (Business Logic)

**File**: `services/YourModuleService.js`

```javascript
const db = require('../../../infrastructure/database/connection');
const YourModuleRepository = require('../repositories/YourModuleRepository');
const logger = require('../../../infrastructure/utils/logger');

/**
 * YourModuleService
 *
 * Implements business logic for your module
 * Handles transactions and coordinates repository calls
 */
class YourModuleService {
  constructor() {
    this.yourModuleRepo = new YourModuleRepository();
  }

  /**
   * Create a new item with transaction support
   *
   * @param {Object} itemData - Item data
   * @param {string} itemData.name - Item name
   * @param {string} itemData.description - Item description
   * @param {number} itemData.createdBy - User ID creating the item
   * @returns {Promise<Object>} Creation result
   */
  async createItem(itemData) {
    const connection = await db.pool.getConnection();

    try {
      await connection.beginTransaction();

      logger.info('Starting item creation transaction:', {
        name: itemData.name
      });

      // Validate input
      if (!itemData.name) {
        throw new Error('Item name is required');
      }

      // Create the item
      const itemId = await this.yourModuleRepo.createItem(
        {
          name: itemData.name,
          description: itemData.description,
          status: 'active',
          created_by: itemData.createdBy
        },
        connection
      );

      // Additional business logic here
      // - Create related records
      // - Send notifications
      // - Update related tables

      await connection.commit();

      logger.info('Item creation transaction completed:', {
        itemId,
        name: itemData.name
      });

      return {
        success: true,
        itemId,
        message: `Item ${itemData.name} created successfully`
      };
    } catch (error) {
      await connection.rollback();

      logger.error('Item creation transaction failed (rolled back):', {
        error: error.message,
        stack: error.stack,
        itemData
      });

      throw new Error(`Failed to create item: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get item by ID
   * @param {number} itemId - Item ID
   * @returns {Promise<Object|null>} Item data or null
   */
  async getItemById(itemId) {
    try {
      return await this.yourModuleRepo.findById(itemId);
    } catch (error) {
      logger.error('Failed to get item:', {
        error: error.message,
        itemId
      });
      throw error;
    }
  }

  /**
   * Get items by status with filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of items
   */
  async getItemsByStatus(filters) {
    try {
      return await this.yourModuleRepo.getItemsByCustomCriteria(filters);
    } catch (error) {
      logger.error('Failed to get items by status:', {
        error: error.message,
        filters
      });
      throw error;
    }
  }
}

module.exports = YourModuleService;
```

#### 3. Controller Layer (Request Handlers)

**File**: `controllers/yourModuleController.js`

```javascript
const YourModuleService = require('../services/YourModuleService');
const logger = require('../../../infrastructure/utils/logger');

const yourModuleService = new YourModuleService();

/**
 * POST /api/your-module
 * Create a new item
 */
const createItem = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Input validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: name'
      });
    }

    // Call service
    const result = await yourModuleService.createItem({
      name,
      description,
      createdBy: req.user.id
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error('Failed to create item:', {
      error: error.message,
      user: req.user?.id,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Failed to create item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/your-module/:id
 * Get item by ID
 */
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await yourModuleService.getItemById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Item with ID ${id} not found`
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    logger.error('Failed to get item:', {
      error: error.message,
      params: req.params
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/your-module
 * Get items with optional filters
 */
const getItems = async (req, res) => {
  try {
    const { status, limit, offset } = req.query;

    const filters = {
      status: status || 'active'
    };

    const items = await yourModuleService.getItemsByStatus(filters);

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      }
    });
  } catch (error) {
    logger.error('Failed to get items:', {
      error: error.message,
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createItem,
  getItemById,
  getItems
};
```

#### 4. Routes Layer (Express Routes)

**File**: `routes/your-module.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const yourModuleController = require('../controllers/yourModuleController');

/**
 * POST /api/your-module
 * Create a new item
 *
 * Body:
 * - name: string (required)
 * - description: string (optional)
 * Note: Authentication handled by global middleware in app.js
 */
router.post('/',
  asyncErrorHandler(yourModuleController.createItem)
);

/**
 * GET /api/your-module/:id
 * Get item by ID
 * Note: Authentication handled by global middleware in app.js
 */
router.get('/:id',
  asyncErrorHandler(yourModuleController.getItemById)
);

/**
 * GET /api/your-module
 * Get items with optional filters
 *
 * Query params:
 * - status: string (optional, default: 'active')
 * - limit: number (optional, default: 50)
 * - offset: number (optional, default: 0)
 * Note: Authentication handled by global middleware in app.js
 */
router.get('/',
  asyncErrorHandler(yourModuleController.getItems)
);

module.exports = router;
```

### Frontend Architecture: Pages → Components → Services → Types

**Reference Module**: `/frontend/src/modules/inventory/`

#### Directory Structure
```
frontend/src/modules/your-module/
├── pages/
│   ├── index.ts                      # Page exports
│   ├── YourModuleListPage.tsx       # List page
│   └── YourModuleDetailPage.tsx     # Detail page
├── components/
│   ├── index.ts                      # Component exports
│   ├── YourModuleForm.tsx           # Form component
│   └── YourModuleCard.tsx           # Card component
├── services/
│   ├── index.ts                      # Service exports
│   └── yourModuleService.ts         # API service
├── types/
│   └── index.ts                      # TypeScript types
├── routes.tsx                         # React Router routes
├── navigation.ts                      # Navigation config
├── permissions.ts                     # Permission constants
└── index.ts                          # Module exports
```

#### 1. Types Layer (TypeScript Definitions)

**File**: `types/index.ts`

```typescript
// API Response type
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Entity types
export interface YourItem {
  id: number;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  created_by: number;
  created_by_username?: string;
  updated_at?: string;
}

// Request types
export interface CreateItemRequest {
  name: string;
  description?: string;
}

export interface UpdateItemRequest {
  name?: string;
  description?: string;
  status?: string;
}

// Filter types
export interface ItemFilters {
  status?: string;
  limit?: number;
  offset?: number;
}
```

#### 2. Service Layer (API Integration)

**File**: `services/yourModuleService.ts`

```typescript
// ✅ CORRECT - Use apiClient instead of fetch
import { apiClient } from '../../../infrastructure/api/client';
import type {
  ApiResponse,
  YourItem,
  CreateItemRequest,
  UpdateItemRequest,
  ItemFilters
} from '../types';

export class YourModuleService {

  /**
   * Create a new item
   */
  async createItem(request: CreateItemRequest): Promise<ApiResponse<{ itemId: number }>> {
    return apiClient.post<ApiResponse<{ itemId: number }>>('/your-module', {
      name: request.name,
      description: request.description
    });
  }

  /**
   * Get item by ID
   */
  async getItemById(itemId: number): Promise<ApiResponse<YourItem>> {
    return apiClient.get<ApiResponse<YourItem>>(`/your-module/${itemId}`);
  }

  /**
   * Get items with filters
   */
  async getItems(filters?: ItemFilters): Promise<ApiResponse<{
    items: YourItem[];
    total: number;
  }>> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
    }

    const queryString = params.toString();
    return apiClient.get<ApiResponse<any>>(
      `/your-module${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Update item
   */
  async updateItem(
    itemId: number,
    request: UpdateItemRequest
  ): Promise<ApiResponse<void>> {
    return apiClient.put<ApiResponse<void>>(`/your-module/${itemId}`, request);
  }

  /**
   * Delete item
   */
  async deleteItem(itemId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/your-module/${itemId}`);
  }
}

// Singleton instance
export const yourModuleService = new YourModuleService();
```

#### 3. Component Layer (Reusable Components)

**File**: `components/YourModuleForm.tsx`

```typescript
// ✅ CORRECT - Use infrastructure components
import { useState } from 'react';
import {
  FormSection,
  FormInput,
  FormTextarea,
  SaveButton,
  CancelButton
} from '../../../infrastructure/components';
import type { YourItem, CreateItemRequest } from '../types';

interface YourModuleFormProps {
  initialData?: YourItem;
  onSubmit: (data: CreateItemRequest) => Promise<void>;
  onCancel: () => void;
}

export function YourModuleForm({ initialData, onSubmit, onCancel }: YourModuleFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({ name, description });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormSection title="Basic Information">
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <FormInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Enter item name"
          />

          <FormTextarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter item description (optional)"
            rows={4}
          />
        </div>
      </FormSection>

      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
        <CancelButton onClick={onCancel} disabled={isLoading} />
        <SaveButton type="submit" disabled={isLoading} />
      </div>
    </form>
  );
}
```

#### 4. Page Layer (Route Components)

**File**: `pages/YourModuleListPage.tsx`

```typescript
// ✅ CORRECT - Use all infrastructure components
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataTable,
  DataTableColumn,
  Badge,
  Button,
  Modal,
  useToast,
  LoadingSpinner
} from '../../../infrastructure/components';
import { usePermissions } from '../../../infrastructure/auth/usePermissions';
import { yourModuleService } from '../services/yourModuleService';
import { YourModuleForm } from '../components/YourModuleForm';
import { YOUR_MODULE_PERMISSIONS } from '../permissions';
import type { YourItem, CreateItemRequest } from '../types';

export function YourModuleListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = usePermissions();

  const [items, setItems] = useState<YourItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canView = hasPermission(YOUR_MODULE_PERMISSIONS.VIEW);
  const canCreate = hasPermission(YOUR_MODULE_PERMISSIONS.CREATE);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await yourModuleService.getItems({ status: 'active' });
      if (response.success && response.data) {
        setItems(response.data.items);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      toast.error('Load Error', 'Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: CreateItemRequest) => {
    try {
      const response = await yourModuleService.createItem(data);
      if (response.success) {
        toast.success('Success', 'Item created successfully');
        setShowCreateModal(false);
        fetchItems();
      }
    } catch (error) {
      console.error('Failed to create item:', error);
      toast.error('Creation Error', 'Failed to create item');
    }
  };

  const handleRowClick = (item: YourItem) => {
    navigate(`/your-module/${item.id}`);
  };

  // Column definitions
  const columns: DataTableColumn[] = [
    {
      id: 'id',
      label: 'ID',
      visible: true,
      locked: true,
      align: 'center',
      render: (item: YourItem) => <span style={{ fontWeight: 500 }}>{item.id}</span>
    },
    {
      id: 'name',
      label: 'NAME',
      visible: true,
      locked: false,
      align: 'left',
      render: (item: YourItem) => item.name
    },
    {
      id: 'description',
      label: 'DESCRIPTION',
      visible: true,
      locked: false,
      align: 'left',
      render: (item: YourItem) => item.description || '-'
    },
    {
      id: 'status',
      label: 'STATUS',
      visible: true,
      locked: false,
      align: 'center',
      render: (item: YourItem) => (
        <Badge variant={item.status === 'active' ? 'success' : 'warning'}>
          {item.status}
        </Badge>
      )
    },
    {
      id: 'created_by',
      label: 'CREATED BY',
      visible: true,
      locked: false,
      align: 'left',
      render: (item: YourItem) => item.created_by_username || '-'
    }
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!canView) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ margin: 0 }}>Your Module Items</h1>
        {canCreate && (
          <Button onClick={() => setShowCreateModal(true)} variant="primary">
            Create New Item
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={items}
        onRowClick={handleRowClick}
        emptyMessage="No items found"
      />

      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Item"
          size="large"
        >
          <YourModuleForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
```

#### 5. Module Configuration Files

**File**: `routes.tsx`

```typescript
import { Route } from 'react-router-dom';
import { YourModuleListPage } from './pages/YourModuleListPage';
import { YourModuleDetailPage } from './pages/YourModuleDetailPage';

export const yourModuleRoutes = (
  <>
    <Route path="/your-module" element={<YourModuleListPage />} />
    <Route path="/your-module/:id" element={<YourModuleDetailPage />} />
  </>
);
```

**File**: `permissions.ts`

```typescript
export const YOUR_MODULE_PERMISSIONS = {
  VIEW: 'your_module.view',
  CREATE: 'your_module.create',
  EDIT: 'your_module.edit',
  DELETE: 'your_module.delete'
} as const;
```

**File**: `navigation.ts`

```typescript
import type { NavigationItem } from '../../infrastructure/types';

export const yourModuleNavigation: NavigationItem = {
  label: 'Your Module',
  path: '/your-module',
  icon: 'box', // FontAwesome icon name
  permission: 'your_module.view'
};
```

---

## 3. Common Tasks Reference

### Creating a List Page

#### ✅ CORRECT
```typescript
import { DataTable, DataTableColumn, Badge } from '../../infrastructure/components';

const columns: DataTableColumn[] = [
  {
    id: 'id',
    label: 'ID',
    visible: true,
    locked: true,
    align: 'center',
    render: (item) => <span>{item.id}</span>
  },
  {
    id: 'status',
    label: 'STATUS',
    visible: true,
    locked: false,
    align: 'center',
    render: (item) => <Badge variant="success">{item.status}</Badge>
  }
];

<DataTable columns={columns} data={items} onRowClick={handleRowClick} />
```

#### ❌ WRONG
```typescript
// Never create raw HTML tables
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
  <thead>
    <tr>
      <th>ID</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {items.map(item => (
      <tr key={item.id}>
        <td>{item.id}</td>
        <td>{item.status}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### Making API Calls

#### ✅ CORRECT
```typescript
import { apiClient } from '../../infrastructure/api/client';

// GET request
const response = await apiClient.get('/your-module');

// POST request
const response = await apiClient.post('/your-module', {
  name: 'New Item',
  description: 'Description here'
});

// PUT request
const response = await apiClient.put('/your-module/123', {
  name: 'Updated Name'
});

// DELETE request
const response = await apiClient.delete('/your-module/123');
```

#### ❌ WRONG
```typescript
// Never use direct fetch
const response = await fetch('/api/your-module', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ name: 'New Item' })
});
```

### Creating Forms

#### ✅ CORRECT
```typescript
import { FormSection, FormInput, FormSelect, FormTextarea, SaveButton, CancelButton } from '../../infrastructure/components';

<form onSubmit={handleSubmit}>
  <FormSection title="Basic Information">
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <FormInput
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <FormSelect
        label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ]}
      />

      <FormTextarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
      />
    </div>
  </FormSection>

  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
    <CancelButton onClick={onCancel} />
    <SaveButton type="submit" />
  </div>
</form>
```

#### ❌ WRONG
```typescript
// Never create raw form elements
<form onSubmit={handleSubmit}>
  <div>
    <label>Name</label>
    <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
  </div>

  <div>
    <label>Status</label>
    <select value={status} onChange={(e) => setStatus(e.target.value)}>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  </div>

  <div>
    <label>Description</label>
    <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
  </div>

  <button type="button" onClick={onCancel}>Cancel</button>
  <button type="submit">Save</button>
</form>
```

### Using Buttons

#### ✅ CORRECT
```typescript
import { Button, SaveButton, DeleteButton, CancelButton } from '../../infrastructure/components';

// Generic button
<Button onClick={handleClick} variant="primary">Click Me</Button>

// Semantic buttons (preferred)
<SaveButton onClick={handleSave} disabled={isLoading} />
<CancelButton onClick={handleCancel} />
<DeleteButton onClick={handleDelete} />
```

#### ❌ WRONG
```typescript
// Never create raw buttons
<button onClick={handleClick}>Click Me</button>
<button type="submit">Save</button>
<button onClick={handleCancel}>Cancel</button>
```

### Creating Modals

#### ✅ CORRECT
```typescript
import { Modal, Button } from '../../infrastructure/components';

const [showModal, setShowModal] = useState(false);

<Button onClick={() => setShowModal(true)}>Open Modal</Button>

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirm Action"
  size="medium"
>
  <p>Are you sure you want to perform this action?</p>
  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
    <Button onClick={() => setShowModal(false)} variant="secondary">
      Cancel
    </Button>
    <Button onClick={handleConfirm} variant="primary">
      Confirm
    </Button>
  </div>
</Modal>
```

#### ❌ WRONG
```typescript
// Never use window dialogs
if (window.confirm('Are you sure?')) {
  handleConfirm();
}

// Never use window.alert
window.alert('Action completed');
```

### Showing Notifications

#### ✅ CORRECT
```typescript
import { useToast } from '../../infrastructure/components';

const toast = useToast();

// Success notification
toast.success('Success', 'Item created successfully');

// Error notification
toast.error('Error', 'Failed to create item');

// Info notification
toast.info('Info', 'Processing in progress');

// Warning notification
toast.warning('Warning', 'This action cannot be undone');
```

#### ❌ WRONG
```typescript
// Never use window.alert
window.alert('Item created successfully');

// Never use console.log for user notifications
console.log('Item created successfully');
```

### Backend Logging

#### ✅ CORRECT
```javascript
const logger = require('../../../infrastructure/utils/logger');

// Info logging
logger.info('Item created successfully:', {
  itemId: 123,
  name: 'Item Name'
});

// Error logging
logger.error('Failed to create item:', {
  error: error.message,
  stack: error.stack,
  data: itemData
});

// Warning logging
logger.warn('Item creation took longer than expected:', {
  duration: 5000,
  itemId: 123
});
```

#### ❌ WRONG
```javascript
// Never use console.log
console.log('Item created successfully');

// Never use console.error
console.error('Failed to create item:', error);
```

### Database Transactions

#### ✅ CORRECT
```javascript
const db = require('../../../infrastructure/database/connection');
const logger = require('../../../infrastructure/utils/logger');

async createItem(itemData) {
  const connection = await db.pool.getConnection();

  try {
    await connection.beginTransaction();

    logger.info('Starting transaction');

    // Your database operations here
    const result = await this.repository.create(itemData, connection);

    await connection.commit();

    logger.info('Transaction completed successfully');

    return result;
  } catch (error) {
    await connection.rollback();

    logger.error('Transaction failed (rolled back):', {
      error: error.message
    });

    throw error;
  } finally {
    connection.release();
  }
}
```

#### ❌ WRONG
```javascript
// Never forget to release connections
async createItem(itemData) {
  const connection = await db.pool.getConnection();

  try {
    const result = await this.repository.create(itemData, connection);
    return result;
  } catch (error) {
    throw error;
  }
  // Missing connection.release() - MEMORY LEAK!
}

// Never skip transaction handling
async createItem(itemData) {
  const connection = await db.pool.getConnection();

  // No beginTransaction
  const result = await this.repository.create(itemData, connection);
  // No commit or rollback

  connection.release();
  return result;
}
```

---

## 4. Module Creation Checklist

Use this checklist when creating a new module from scratch.

### Backend Setup

- [ ] **Create module folder structure**
  ```
  backend/src/modules/your-module/
  ├── routes/
  ├── controllers/
  ├── services/
  └── repositories/
  ```

- [ ] **Create Repository (extend BaseRepository)**
  - [ ] Import `BaseRepository` from infrastructure
  - [ ] Call `super(tableName, primaryKey)` in constructor
  - [ ] Add custom query methods
  - [ ] Use `logger` for error logging
  - [ ] Handle connections properly (release in finally block)

- [ ] **Create Service (business logic)**
  - [ ] Import repository and infrastructure utilities
  - [ ] Use transactions for multi-step operations
  - [ ] Use `logger` for operation tracking
  - [ ] Implement proper error handling with rollback

- [ ] **Create Controller (request handlers)**
  - [ ] Import service and logger
  - [ ] Validate input parameters
  - [ ] Return consistent JSON responses
  - [ ] Use proper HTTP status codes (200, 201, 400, 404, 500)
  - [ ] Include error details only in development mode

- [ ] **Create Routes (Express routing)**
  - [ ] Import `asyncErrorHandler` from infrastructure
  - [ ] Wrap all controller methods with `asyncErrorHandler`
  - [ ] Document each route with comments
  - [ ] Add proper HTTP methods (GET, POST, PUT, DELETE)

- [ ] **Register routes in main app**
  - [ ] Add route import in `backend/src/app.js`
  - [ ] Mount routes under `/api/your-module`

- [ ] **Update BaseRepository whitelist**
  - [ ] Add table name to `ALLOWED_TABLES` in `BaseRepository.js`

### Frontend Setup

- [ ] **Create module folder structure**
  ```
  frontend/src/modules/your-module/
  ├── pages/
  ├── components/
  ├── services/
  ├── types/
  ├── routes.tsx
  ├── navigation.ts
  ├── permissions.ts
  └── index.ts
  ```

- [ ] **Create TypeScript types** (`types/index.ts`)
  - [ ] Define entity interfaces
  - [ ] Define request/response types
  - [ ] Define filter types
  - [ ] Export all types

- [ ] **Create Service class** (`services/yourModuleService.ts`)
  - [ ] Import `apiClient` from infrastructure
  - [ ] Create service class with methods
  - [ ] Export singleton instance
  - [ ] Never use direct `fetch()` calls

- [ ] **Create Components** (`components/`)
  - [ ] Import components from infrastructure (never raw HTML)
  - [ ] Use `FormSection` for form sections
  - [ ] Use semantic buttons (SaveButton, CancelButton, etc.)
  - [ ] Export components in `index.ts`

- [ ] **Create Pages** (`pages/`)
  - [ ] Import infrastructure components
  - [ ] Use `DataTable` for list pages
  - [ ] Use `useToast` for notifications
  - [ ] Use `usePermissions` for access control
  - [ ] Export pages in `index.ts`

- [ ] **Create Routes** (`routes.tsx`)
  - [ ] Import pages
  - [ ] Define React Router routes
  - [ ] Export route configuration

- [ ] **Create Permissions** (`permissions.ts`)
  - [ ] Define permission constants (VIEW, CREATE, EDIT, DELETE)
  - [ ] Export as const object

- [ ] **Create Navigation** (`navigation.ts`)
  - [ ] Define navigation item
  - [ ] Include label, path, icon, permission
  - [ ] Export navigation config

- [ ] **Register module in app**
  - [ ] Import module routes in `frontend/src/App.tsx`
  - [ ] Import navigation config
  - [ ] Add to sidebar navigation

### Quality Assurance

- [ ] **Run validation script**
  ```bash
  node sandbox-tools/scripts/validate-platform-standards.js
  ```

- [ ] **Verify no violations**
  - [ ] Zero `direct_fetch` violations
  - [ ] Zero `raw_html` violations (Button, DataTable, form elements)
  - [ ] Zero `console_log` violations in backend

- [ ] **Code quality checks**
  - [ ] All files under 300 lines (hard limit)
  - [ ] Functions under 200 lines
  - [ ] No hardcoded credentials or API keys
  - [ ] Proper error handling throughout
  - [ ] Consistent naming conventions

- [ ] **Testing**
  - [ ] Test all API endpoints
  - [ ] Test form validation
  - [ ] Test error scenarios
  - [ ] Test permission enforcement
  - [ ] Test UI components

---

## 5. Validation & Quality Assurance

### Running the Validation Script

**Command**:
```bash
node sandbox-tools/scripts/validate-platform-standards.js
```

**Location**: Run from project root directory

**Output**: `sandbox-tools/scripts/validation-results.json`

### Understanding Results

The validation script checks for three types of violations:

#### 1. Direct Fetch Violations (Severity: CRITICAL)

**What it is**: Using `fetch()` directly instead of `apiClient`

**Example violation**:
```typescript
// ❌ WRONG
const response = await fetch('/api/gauges/v2/suggest-id', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**How to fix**:
```typescript
// ✅ CORRECT
import { apiClient } from '../../infrastructure/api/client';
const response = await apiClient.get('/gauges/v2/suggest-id');
```

**Why it matters**:
- `apiClient` handles authentication automatically
- Provides consistent error handling
- Includes double-click protection
- Supports request/response interceptors

#### 2. Console Log Violations (Severity: MEDIUM)

**What it is**: Using `console.log()` or `console.error()` instead of `logger`

**Example violation**:
```javascript
// ❌ WRONG
console.log('Item created:', itemId);
console.error('Failed to create item:', error);
```

**How to fix**:
```javascript
// ✅ CORRECT
const logger = require('../../../infrastructure/utils/logger');
logger.info('Item created:', { itemId });
logger.error('Failed to create item:', { error: error.message });
```

**Why it matters**:
- Structured logging for better debugging
- Proper log levels (info, warn, error)
- Centralized logging configuration
- Production-ready logging

#### 3. Raw HTML Violations (Severity: HIGH)

**What it is**: Creating raw HTML elements instead of using infrastructure components

**Example violations**:

**Buttons**:
```typescript
// ❌ WRONG
<button onClick={handleSave}>Save</button>

// ✅ CORRECT
import { SaveButton } from '../../infrastructure/components';
<SaveButton onClick={handleSave} />
```

**Forms**:
```typescript
// ❌ WRONG
<input type="text" value={name} onChange={handleChange} />

// ✅ CORRECT
import { FormInput } from '../../infrastructure/components';
<FormInput value={name} onChange={handleChange} label="Name" />
```

**Tables**:
```typescript
// ❌ WRONG
<table>
  <tr><td>Data</td></tr>
</table>

// ✅ CORRECT
import { DataTable } from '../../infrastructure/components';
<DataTable columns={columns} data={data} />
```

**Why it matters**:
- Consistent UI/UX across the application
- Built-in accessibility features
- Double-click protection on buttons
- Consistent styling and behavior

### Common Violation Fixes

#### Fix: Direct Fetch → apiClient

**Before**:
```typescript
const response = await fetch('/api/your-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
const result = await response.json();
```

**After**:
```typescript
import { apiClient } from '../../infrastructure/api/client';
const result = await apiClient.post('/your-endpoint', data);
```

#### Fix: console.log → logger

**Before**:
```javascript
console.log('Starting operation');
console.error('Operation failed:', error);
```

**After**:
```javascript
const logger = require('../../../infrastructure/utils/logger');
logger.info('Starting operation');
logger.error('Operation failed:', { error: error.message, stack: error.stack });
```

#### Fix: Raw Button → Infrastructure Button

**Before**:
```typescript
<button onClick={handleClick} disabled={isLoading}>
  Save Changes
</button>
```

**After**:
```typescript
import { SaveButton } from '../../infrastructure/components';
<SaveButton onClick={handleClick} disabled={isLoading} />
```

### Zero Violations Target

**Goal**: All modules should have ZERO violations before merging to main.

**Pre-commit checklist**:
1. Run validation script
2. Fix all CRITICAL violations immediately
3. Fix all HIGH violations before commit
4. Fix MEDIUM violations before PR review

---

## Quick Reference Card

### Frontend Imports

```typescript
// Infrastructure components (ALWAYS use these)
import {
  // Buttons
  Button, SaveButton, CancelButton, DeleteButton,

  // Forms
  FormInput, FormSelect, FormTextarea, FormCheckbox, FormSection,

  // Data Display
  DataTable, Badge, Tag, Alert,

  // Layout
  Card, Modal, Tabs,

  // Notifications
  useToast,

  // Loading
  LoadingSpinner, LoadingOverlay
} from '../../infrastructure/components';

// API client (ALWAYS use this)
import { apiClient } from '../../infrastructure/api/client';

// Permissions
import { usePermissions } from '../../infrastructure/auth/usePermissions';
```

### Backend Imports

```javascript
// Base repository (ALWAYS extend this)
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');

// Middleware
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const { authenticateToken } = require('../../../infrastructure/middleware/auth');

// Utilities
const logger = require('../../../infrastructure/utils/logger');
const { pool } = require('../../../infrastructure/database/connection');
```

### File Size Limits

- **Functions**: 10-20 lines (ideal), 200 lines (maximum)
- **Files/Classes**: 200-300 lines (target), **500 lines (absolute maximum)**

**Action Required**:
- >300 lines: Refactor immediately
- >500 lines: Production blocker - must refactor before merge

---

## Need Help?

1. **Check existing modules**: Look at `/backend/src/modules/inventory/` and `/frontend/src/modules/inventory/` for examples
2. **Review validation results**: `sandbox-tools/scripts/validation-results.json`
3. **Run validation**: `node sandbox-tools/scripts/validate-platform-standards.js`
4. **Check infrastructure exports**: `/frontend/src/infrastructure/components/index.ts`

---

**Last Updated**: 2025-11-07
**Validation Script**: `sandbox-tools/scripts/validate-platform-standards.js`
**Current Compliance**: 73 violations pending (6 critical, 17 medium, 50 high)
