# Pagination Standards

**Category**: API Standards
**Purpose**: Centralized pagination configuration and implementation patterns
**Location**: `/backend/src/infrastructure/utils/pagination.js`, `/frontend/src/infrastructure/hooks/usePagination.ts`, `/frontend/src/infrastructure/constants/pagination.ts`
**Last Updated**: 2025-11-07

---

## Overview

Fire-Proof ERP implements comprehensive pagination to ensure consistent data handling, optimal performance, and excellent user experience across all modules. The system uses centralized configuration with frontend/backend synchronization.

**Core Features**:
- 🔧 Centralized configuration (single source of truth)
- 🔄 Frontend/Backend synchronization (identical constants)
- 🎯 Module-specific defaults (4 predefined modules)
- 🔗 URL state preservation (optional)
- 🔍 Integrated search functionality
- ✅ Automatic validation and sanitization
- 📊 Standardized response format

---

## Pagination Constants

### Centralized Configuration

Both frontend and backend share **identical** pagination constants to ensure consistency.

**Backend Location**: `/backend/src/infrastructure/utils/pagination.js`
**Frontend Location**: `/frontend/src/infrastructure/constants/pagination.ts`

```javascript
const PAGINATION_CONSTANTS = {
  // Page size configuration
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,      // Supports dashboard queries needing all gauges
  MIN_PAGE_SIZE: 10,

  // Module-specific defaults (override DEFAULT_PAGE_SIZE)
  MODULE_DEFAULTS: {
    USER_MANAGEMENT: 50,
    GAUGE_INVENTORY: 50,
    AUDIT_LOGS: 50,
    REPORTS: 25
  },

  // Page configuration
  DEFAULT_PAGE: 1,

  // Search configuration
  MIN_SEARCH_LENGTH: 2,     // Minimum characters for search
  SEARCH_DEBOUNCE_MS: 300   // Debounce time for search input
};
```

**Frontend-Only Constants**:

```typescript
// Type-safe page size options for dropdowns
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;
```

### Configuration Principles

1. **Synchronization**: Frontend and backend constants **must** remain synchronized
2. **Module Defaults**: Override global defaults for specific use cases
3. **Generous Limits**: MAX_PAGE_SIZE of 1000 supports dashboard scenarios
4. **User Experience**: Search debounce prevents excessive API calls

---

## Backend Implementation

### Core Utilities

#### `parsePaginationParams(query, moduleName)`

**Purpose**: Parse and validate pagination parameters from Express request

**Parameters**:
- `query` (Object): Express `req.query` object
- `moduleName` (string): Module name for specific defaults (optional)

**Returns**: Validated pagination parameters

```javascript
const { parsePaginationParams } = require('../infrastructure/utils/pagination');

// In route handler
const { page, limit, offset, search } = parsePaginationParams(req.query, 'USER_MANAGEMENT');

// Returns:
// {
//   page: 1,           // Validated page number (minimum 1)
//   limit: 50,         // Validated limit (clamped to MIN/MAX)
//   offset: 0,         // Calculated offset for SQL
//   search: 'john'     // Trimmed search term (empty if < MIN_SEARCH_LENGTH)
// }
```

**Validation Logic**:
- **Page**: Ensures page ≥ 1 (invalid values default to 1)
- **Limit**: Clamps between MIN_PAGE_SIZE (10) and MAX_PAGE_SIZE (1000)
- **Search**: Ignores search terms shorter than MIN_SEARCH_LENGTH (2 chars)
- **Offset**: Automatically calculates `(page - 1) * limit`

#### `buildPaginationResponse(data, total, page, limit)`

**Purpose**: Build standardized pagination response for API endpoints

**Parameters**:
- `data` (Array): Array of data items for current page
- `total` (number): Total count of items matching query
- `page` (number): Current page number
- `limit` (number): Items per page

**Returns**: Standardized response object

```javascript
const { buildPaginationResponse } = require('../infrastructure/utils/pagination');

const response = buildPaginationResponse(
  result.users,    // Array of users
  result.total,    // Total count from COUNT(*) query
  page,            // Current page
  limit            // Items per page
);

// Returns:
// {
//   data: [...],           // Array of items
//   pagination: {
//     page: 1,
//     limit: 50,
//     total: 237,
//     totalPages: 5,
//     hasNext: true,
//     hasPrev: false
//   }
// }
```

**Response Fields**:
- `data`: Array of items for current page
- `pagination.page`: Current page number
- `pagination.limit`: Items per page
- `pagination.total`: Total items matching query
- `pagination.totalPages`: Calculated total pages (Math.ceil(total / limit))
- `pagination.hasNext`: Boolean indicating more pages available
- `pagination.hasPrev`: Boolean indicating previous pages exist

#### `addPaginationToQuery(baseQuery, limit, offset)`

**Purpose**: Add pagination clause to SQL query

**Parameters**:
- `baseQuery` (string): Base SQL query without pagination
- `limit` (number): Items per page
- `offset` (number): Offset for pagination

**Returns**: Query string with LIMIT and OFFSET

```javascript
const { addPaginationToQuery } = require('../infrastructure/utils/pagination');

const baseQuery = 'SELECT * FROM users WHERE active = 1 ORDER BY name';
const paginatedQuery = addPaginationToQuery(baseQuery, 50, 0);

// Returns: "SELECT * FROM users WHERE active = 1 ORDER BY name LIMIT 50 OFFSET 0"
```

#### `buildCountQuery(baseQuery)`

**Purpose**: Build COUNT query from base SELECT query

**Parameters**:
- `baseQuery` (string): Base SQL query

**Returns**: Count query string

```javascript
const { buildCountQuery } = require('../infrastructure/utils/pagination');

const baseQuery = `
  SELECT u.*, r.role_name
  FROM users u
  LEFT JOIN roles r ON u.role_id = r.id
  WHERE u.active = 1
  ORDER BY u.name
`;

const countQuery = buildCountQuery(baseQuery);

// Returns: "SELECT COUNT(*) as total FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.active = 1"
// Note: ORDER BY is removed (not needed for count)
```

**Behavior**:
- Removes `ORDER BY` clause (not needed for counting)
- Replaces `SELECT ... FROM` with `SELECT COUNT(*) as total FROM`
- Preserves JOINs and WHERE conditions

#### `validatePaginationMiddleware`

**Purpose**: Express middleware for pagination parameter validation

**Usage**: Apply as middleware before route handlers

```javascript
const { validatePaginationMiddleware } = require('../infrastructure/utils/pagination');

router.get('/users',
  authenticateToken,
  requireAdmin,
  validatePaginationMiddleware,  // Validation middleware
  asyncErrorHandler(async (req, res) => {
    // Pagination params guaranteed valid here
  })
);
```

**Validation**:
- **Page**: Must be positive integer
- **Limit**: Must be between MIN_PAGE_SIZE and MAX_PAGE_SIZE
- **Error Response** (400):
```json
{
  "success": false,
  "error": "Invalid page number. Must be a positive integer."
}
```

### Implementation Pattern

**Complete Route Example**:

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncErrorHandler } = require('../middleware/errorHandler');
const {
  parsePaginationParams,
  buildPaginationResponse,
  validatePaginationMiddleware
} = require('../infrastructure/utils/pagination');

// Get all users with pagination
router.get('/users',
  authenticateToken,
  requireAdmin,
  validatePaginationMiddleware,
  asyncErrorHandler(async (req, res) => {
    // 1. Parse pagination parameters with module-specific default
    const { page, limit, offset, search } = parsePaginationParams(
      req.query,
      'USER_MANAGEMENT'
    );

    // 2. Extract sort parameters
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder || 'asc';

    // 3. Query data from service/repository
    const result = await adminService.getAllUsers(
      page,
      limit,
      search,
      sortBy,
      sortOrder
    );

    // 4. Build standardized response
    const response = buildPaginationResponse(
      result.users,
      result.total,
      page,
      limit
    );

    // 5. Return response
    res.json({
      success: true,
      ...response
    });
  })
);

module.exports = router;
```

### Service Layer Pattern

**Service Method Example**:

```javascript
class AdminService {
  async getAllUsers(page, limit, search, sortBy, sortOrder) {
    const { addPaginationToQuery, buildCountQuery } = require('../infrastructure/utils/pagination');

    // Build base query
    let baseQuery = `
      SELECT u.*, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;

    const queryParams = [];

    // Add search condition
    if (search) {
      baseQuery += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Add sorting
    baseQuery += ` ORDER BY u.${sortBy} ${sortOrder}`;

    // Get total count
    const countQuery = buildCountQuery(baseQuery);
    const [countResult] = await pool.query(countQuery, queryParams);
    const total = countResult[0].total;

    // Get paginated data
    const offset = (page - 1) * limit;
    const paginatedQuery = addPaginationToQuery(baseQuery, limit, offset);
    const [users] = await pool.query(paginatedQuery, queryParams);

    return {
      users,
      total
    };
  }
}
```

---

## Frontend Implementation

### usePagination Hook

**Location**: `/frontend/src/infrastructure/hooks/usePagination.ts`

**Purpose**: Centralized React hook for consistent pagination across frontend modules

**Features**:
- 🔗 URL synchronization (optional)
- 🎯 Module-specific defaults
- 🔍 Search integration
- ✅ Automatic validation
- 📊 Query parameter generation

#### Hook API

```typescript
interface UsePaginationOptions {
  moduleDefault?: keyof typeof PAGINATION_CONSTANTS.MODULE_DEFAULTS;
  preserveInUrl?: boolean;  // Default: true
}

interface PaginationResult {
  page: number;
  limit: number;
  search: string;
  offset: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  resetPagination: () => void;
  queryParams: URLSearchParams;  // Ready for API calls
}

function usePagination(options?: UsePaginationOptions): PaginationResult
```

#### Basic Usage

```typescript
import { usePagination } from '../../infrastructure/hooks/usePagination';

export const UserManagementPage: React.FC = () => {
  // Initialize pagination with module defaults
  const pagination = usePagination({
    moduleDefault: 'USER_MANAGEMENT',  // Uses 50 items per page
    preserveInUrl: true                 // Syncs with URL (default)
  });

  // Fetch data using pagination state
  const { data, isLoading } = useQuery({
    queryKey: ['users', pagination.page, pagination.limit, pagination.search],
    queryFn: async () => {
      const response = await apiClient.get(
        `/admin/users?${pagination.queryParams.toString()}`
      );
      return response.data;
    }
  });

  return (
    <div>
      <SearchInput
        value={pagination.search}
        onChange={pagination.setSearch}
      />

      <DataTable
        data={data?.data || []}
        pagination={data?.pagination}
        onPageChange={pagination.setPage}
        onLimitChange={pagination.setLimit}
      />
    </div>
  );
};
```

#### URL Synchronization

When `preserveInUrl: true` (default), pagination state syncs with URL:

**URL Format**:
```
/admin/users?page=2&limit=100&search=john
```

**Behavior**:
- URL parameters initialize pagination state on page load
- State changes update URL (with `replace: true` to avoid history spam)
- Default values are **not** included in URL (cleaner URLs)
- Browser back/forward buttons work correctly
- Bookmarkable and shareable URLs

**URL Params**:
- `page`: Only included if not default page (1)
- `limit`: Only included if different from module default
- `search`: Only included if non-empty

#### Validation and Auto-Correction

```typescript
const pagination = usePagination();

// These are automatically validated and corrected:
pagination.setPage(-5);        // Corrected to: 1 (minimum)
pagination.setPage(0);         // Corrected to: 1 (minimum)
pagination.setLimit(5);        // Corrected to: 10 (MIN_PAGE_SIZE)
pagination.setLimit(5000);     // Corrected to: 1000 (MAX_PAGE_SIZE)
pagination.setSearch('  hi '); // Trimmed to: 'hi'
```

**Auto-Reset Behavior**:
- Changing `limit` resets `page` to 1
- Changing `search` resets `page` to 1
- This prevents showing empty pages after filter changes

#### Query Parameter Generation

The hook provides ready-to-use `URLSearchParams` for API calls:

```typescript
const pagination = usePagination();

// pagination.queryParams is a URLSearchParams object
console.log(pagination.queryParams.toString());
// Output: "page=1&limit=50&search=john"

// Use directly in fetch/axios
const response = await fetch(`/api/users?${pagination.queryParams}`);

// Or with apiClient
const response = await apiClient.get(`/api/users?${pagination.queryParams.toString()}`);
```

**Behavior**:
- Always includes `page` and `limit` (required by backend)
- Only includes `search` if ≥ MIN_SEARCH_LENGTH (2 characters)
- Automatically URL-encodes parameters

#### Complete Page Example

```typescript
import React from 'react';
import { usePagination } from '../../infrastructure/hooks/usePagination';
import { DataTable, SearchInput, Pagination } from '../../infrastructure/components';
import { apiClient } from '../../infrastructure/api/client';
import { useQuery } from '@tanstack/react-query';

export const UserManagementPage: React.FC = () => {
  const pagination = usePagination({
    moduleDefault: 'USER_MANAGEMENT',
    preserveInUrl: true
  });

  // Fetch data with React Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', pagination.page, pagination.limit, pagination.search],
    queryFn: async () => {
      const response = await apiClient.get(
        `/admin/users?${pagination.queryParams.toString()}`
      );
      return response.data;
    },
    keepPreviousData: true  // Smooth transitions between pages
  });

  // Handle errors
  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>User Management</h1>

        <SearchInput
          value={pagination.search}
          onChange={pagination.setSearch}
          placeholder="Search users..."
          debounceMs={PAGINATION_CONSTANTS.SEARCH_DEBOUNCE_MS}
        />
      </div>

      <DataTable
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
      />

      <Pagination
        currentPage={pagination.page}
        totalPages={data?.pagination.totalPages || 1}
        pageSize={pagination.limit}
        totalItems={data?.pagination.total || 0}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setLimit}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        hasNext={data?.pagination.hasNext}
        hasPrev={data?.pagination.hasPrev}
      />
    </div>
  );
};
```

---

## Response Format

### Standardized API Response

All paginated endpoints return consistent response format:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 237,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `data` | array | Array of items for current page |
| `pagination.page` | number | Current page number (1-indexed) |
| `pagination.limit` | number | Items per page |
| `pagination.total` | number | Total items matching query |
| `pagination.totalPages` | number | Total pages available |
| `pagination.hasNext` | boolean | More pages available |
| `pagination.hasPrev` | boolean | Previous pages exist |

### Error Responses

**Invalid Pagination Parameters** (400):

```json
{
  "success": false,
  "error": "Invalid page number. Must be a positive integer."
}
```

```json
{
  "success": false,
  "error": "Invalid limit. Must be between 10 and 1000."
}
```

**Empty Results** (200):

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## Module-Specific Defaults

### Configuration

Four predefined modules with custom defaults:

```javascript
MODULE_DEFAULTS: {
  USER_MANAGEMENT: 50,    // Standard page size for users
  GAUGE_INVENTORY: 50,    // Reduced from 100 per user request
  AUDIT_LOGS: 50,         // Standard audit log pagination
  REPORTS: 25             // Smaller pages for report summaries
}
```

### Usage Patterns

**Backend**:
```javascript
// Uses USER_MANAGEMENT default (50 items per page)
const { page, limit, offset, search } = parsePaginationParams(req.query, 'USER_MANAGEMENT');
```

**Frontend**:
```typescript
// Uses REPORTS default (25 items per page)
const pagination = usePagination({ moduleDefault: 'REPORTS' });
```

**Without Module Default**:
```javascript
// Uses global DEFAULT_PAGE_SIZE (50 items per page)
const { page, limit, offset, search } = parsePaginationParams(req.query);
```

### Adding New Module Defaults

**Step 1**: Add to both backend and frontend constants

```javascript
// backend/src/infrastructure/utils/pagination.js
MODULE_DEFAULTS: {
  USER_MANAGEMENT: 50,
  GAUGE_INVENTORY: 50,
  AUDIT_LOGS: 50,
  REPORTS: 25,
  NOTIFICATIONS: 100  // New module default
}
```

```typescript
// frontend/src/infrastructure/constants/pagination.ts
MODULE_DEFAULTS: {
  USER_MANAGEMENT: 50,
  GAUGE_INVENTORY: 50,
  AUDIT_LOGS: 50,
  REPORTS: 25,
  NOTIFICATIONS: 100  // Must match backend
}
```

**Step 2**: Use in implementation

```javascript
// Backend route
const { page, limit, offset } = parsePaginationParams(req.query, 'NOTIFICATIONS');
```

```typescript
// Frontend component
const pagination = usePagination({ moduleDefault: 'NOTIFICATIONS' });
```

---

## Search Integration

### Backend Search

```javascript
router.get('/users', asyncErrorHandler(async (req, res) => {
  const { page, limit, offset, search } = parsePaginationParams(req.query, 'USER_MANAGEMENT');

  // Build query with search
  let query = 'SELECT * FROM users WHERE 1=1';
  const params = [];

  if (search) {
    // search is already validated (length >= MIN_SEARCH_LENGTH)
    query += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY name LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [users] = await pool.query(query, params);

  // ... build response
}));
```

**Search Behavior**:
- Only searches if term ≥ MIN_SEARCH_LENGTH (2 characters)
- Automatically trimmed
- Backend applies case-insensitive LIKE search
- Frontend debounces input (300ms)

### Frontend Search

```typescript
const pagination = usePagination({ moduleDefault: 'USER_MANAGEMENT' });

// Search input with debouncing
<SearchInput
  value={pagination.search}
  onChange={pagination.setSearch}
  placeholder="Search users..."
  debounceMs={PAGINATION_CONSTANTS.SEARCH_DEBOUNCE_MS}  // 300ms
/>
```

**Search Features**:
- Automatic debouncing (300ms default)
- Resets page to 1 when search changes
- Updates URL if preserveInUrl is enabled
- Minimum 2 characters before triggering search

---

## Best Practices

### 1. Always Use Centralized Configuration

```javascript
// ❌ BAD - Hardcoded pagination
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 50;

// ✅ GOOD - Centralized configuration
const { page, limit, offset, search } = parsePaginationParams(req.query);
```

### 2. Use Module-Specific Defaults

```javascript
// ❌ BAD - Generic default for all modules
const { page, limit } = parsePaginationParams(req.query);

// ✅ GOOD - Module-specific default
const { page, limit } = parsePaginationParams(req.query, 'USER_MANAGEMENT');
```

### 3. Always Validate Parameters

```javascript
// ✅ GOOD - Use validation middleware
router.get('/users',
  authenticateToken,
  validatePaginationMiddleware,  // Validates before handler
  asyncErrorHandler(async (req, res) => {
    // Parameters guaranteed valid here
  })
);
```

### 4. Use Standardized Response Format

```javascript
// ❌ BAD - Custom response format
res.json({
  items: users,
  currentPage: page,
  itemsPerPage: limit
});

// ✅ GOOD - Standardized format
const response = buildPaginationResponse(users, total, page, limit);
res.json({ success: true, ...response });
```

### 5. Frontend: Enable URL Preservation

```typescript
// ✅ GOOD - Enable URL preservation (default)
const pagination = usePagination({
  moduleDefault: 'USER_MANAGEMENT',
  preserveInUrl: true  // Bookmarkable, shareable URLs
});

// ⚠️ USE SPARINGLY - Disable for modals/popups
const modalPagination = usePagination({
  preserveInUrl: false  // Modal state shouldn't affect URL
});
```

### 6. Backend: Use Prepared Statements

```javascript
// ✅ GOOD - Prepared statements prevent SQL injection
const query = 'SELECT * FROM users WHERE name LIKE ? LIMIT ? OFFSET ?';
const params = [`%${search}%`, limit, offset];
const [users] = await pool.query(query, params);

// ❌ BAD - String concatenation (SQL injection risk)
const query = `SELECT * FROM users WHERE name LIKE '%${search}%' LIMIT ${limit} OFFSET ${offset}`;
```

### 7. Frontend: Use React Query for Caching

```typescript
// ✅ GOOD - React Query caching and state management
const { data, isLoading } = useQuery({
  queryKey: ['users', pagination.page, pagination.limit, pagination.search],
  queryFn: async () => {
    const response = await apiClient.get(`/admin/users?${pagination.queryParams}`);
    return response.data;
  },
  keepPreviousData: true  // Smooth page transitions
});
```

### 8. Consistent Sort Parameters

```javascript
// ✅ GOOD - Consistent sort parameter handling
const sortBy = req.query.sortBy || 'created_at';
const sortOrder = req.query.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

// Whitelist allowed sort columns
const allowedSortColumns = ['name', 'email', 'created_at', 'role'];
const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
```

---

## Advanced Patterns

### Server-Side Pagination with Joins

```javascript
class UserRepository {
  async getPaginatedUsers(page, limit, search, sortBy, sortOrder) {
    const { addPaginationToQuery, buildCountQuery } = require('../infrastructure/utils/pagination');

    // Base query with joins
    let baseQuery = `
      SELECT
        u.id,
        u.name,
        u.email,
        r.role_name,
        COUNT(al.id) as audit_count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN audit_logs al ON al.user_id = u.id
      WHERE u.deleted_at IS NULL
    `;

    const params = [];

    // Add search filter
    if (search) {
      baseQuery += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add GROUP BY for aggregates
    baseQuery += ` GROUP BY u.id, u.name, u.email, r.role_name`;

    // Add sorting
    baseQuery += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Get total count (before pagination)
    const countQuery = buildCountQuery(baseQuery);
    const [countResult] = await this.pool.query(countQuery, params);
    const total = countResult[0].total;

    // Add pagination
    const offset = (page - 1) * limit;
    const paginatedQuery = addPaginationToQuery(baseQuery, limit, offset);

    // Execute paginated query
    const [users] = await this.pool.query(paginatedQuery, params);

    return { users, total };
  }
}
```

### Cursor-Based Pagination (Alternative)

For very large datasets or real-time data, consider cursor-based pagination:

```javascript
// Cursor-based pagination (not using centralized utilities)
router.get('/audit-logs/cursor', asyncErrorHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const cursor = req.query.cursor; // Last seen ID

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (cursor) {
    query += ' AND id > ?';
    params.push(cursor);
  }

  query += ' ORDER BY id ASC LIMIT ?';
  params.push(limit + 1); // Fetch one extra to check for more

  const [logs] = await pool.query(query, params);

  const hasMore = logs.length > limit;
  const data = hasMore ? logs.slice(0, limit) : logs;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  res.json({
    success: true,
    data,
    cursor: nextCursor,
    hasMore
  });
}));
```

### Infinite Scroll Frontend

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export const InfiniteScrollList: React.FC = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['items-infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get(`/api/items?page=${pageParam}&limit=50`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNext
        ? lastPage.pagination.page + 1
        : undefined;
    }
  });

  // Intersection Observer for auto-loading
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useCallback((node: HTMLDivElement) => {
    if (isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });

    if (node) observerRef.current.observe(node);
  }, [isFetchingNextPage, fetchNextPage, hasNextPage]);

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.data.map((item: any) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ))}

      {hasNextPage && (
        <div ref={loadMoreRef}>
          {isFetchingNextPage ? 'Loading more...' : 'Load more'}
        </div>
      )}
    </div>
  );
};
```

---

## Troubleshooting

### Issue: Pagination State Not Persisting in URL

**Problem**: URL doesn't update when pagination changes

**Solutions**:
1. Ensure `preserveInUrl: true` in hook options
2. Check React Router is properly configured
3. Verify `useNavigate` and `useLocation` hooks are available

```typescript
// ✅ Correct usage
const pagination = usePagination({
  preserveInUrl: true  // Default, but explicit is clearer
});
```

### Issue: Page Shows No Results After Search

**Problem**: Showing page 5 with only 2 pages of search results

**Cause**: Page number not reset when search changes

**Solution**: Hook automatically resets page to 1 when search changes

```typescript
// Hook handles this automatically:
pagination.setSearch('new search'); // Automatically resets page to 1
```

### Issue: Frontend and Backend Pagination Mismatch

**Problem**: Frontend expects 50 items but backend returns different count

**Cause**: Frontend/backend constants out of sync

**Solution**: Ensure constants are synchronized

```javascript
// Backend: backend/src/infrastructure/utils/pagination.js
MODULE_DEFAULTS: {
  USER_MANAGEMENT: 50
}

// Frontend: frontend/src/infrastructure/constants/pagination.ts
MODULE_DEFAULTS: {
  USER_MANAGEMENT: 50  // Must match backend
}
```

### Issue: SQL Performance Degradation with High Offsets

**Problem**: Queries slow down on high page numbers (page 100+)

**Cause**: `OFFSET` clause scans and discards rows

**Solutions**:

1. **Add Indexes**:
```sql
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_created_at ON users(created_at);
```

2. **Use Keyset Pagination** (Cursor-Based):
```javascript
// Instead of OFFSET, use last seen ID
const query = `
  SELECT * FROM users
  WHERE id > ?
  ORDER BY id ASC
  LIMIT ?
`;
```

3. **Limit Maximum Pages**:
```javascript
const MAX_PAGE = 100;
const validPage = Math.min(page, MAX_PAGE);
```

### Issue: Empty Page After Deleting Items

**Problem**: Viewing last page with 1 item, delete it, page is now empty

**Solution**: Backend should redirect to last available page

```javascript
router.delete('/users/:id', asyncErrorHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);

  // Get updated total count
  const total = await userService.getTotalUsers();
  const totalPages = Math.ceil(total / limit);

  // If current page exceeds total pages, return last page
  const safePage = Math.min(page, Math.max(1, totalPages));

  res.json({
    success: true,
    message: 'User deleted',
    redirectToPage: safePage !== page ? safePage : null
  });
}));
```

### Issue: Search Triggers Too Many API Calls

**Problem**: API called on every keystroke

**Solution**: Frontend hook includes automatic debouncing

```typescript
// SearchInput component should respect debounceMs
<SearchInput
  value={pagination.search}
  onChange={pagination.setSearch}
  debounceMs={PAGINATION_CONSTANTS.SEARCH_DEBOUNCE_MS}  // 300ms
/>
```

---

## Migration Guide

### From Custom Pagination

**Before**:
```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 50;
const offset = (page - 1) * limit;

const [users] = await pool.query(
  'SELECT * FROM users LIMIT ? OFFSET ?',
  [limit, offset]
);

res.json({
  users,
  page,
  limit,
  total
});
```

**After**:
```javascript
const { parsePaginationParams, buildPaginationResponse } = require('../infrastructure/utils/pagination');

const { page, limit, offset } = parsePaginationParams(req.query, 'USER_MANAGEMENT');

const result = await userService.getUsers(page, limit);

const response = buildPaginationResponse(
  result.users,
  result.total,
  page,
  limit
);

res.json({ success: true, ...response });
```

---

## Testing

### Backend Unit Tests

```javascript
const {
  parsePaginationParams,
  buildPaginationResponse,
  buildCountQuery
} = require('../infrastructure/utils/pagination');

describe('Pagination Utilities', () => {
  describe('parsePaginationParams', () => {
    it('should use default values for empty query', () => {
      const result = parsePaginationParams({});
      expect(result).toEqual({
        page: 1,
        limit: 50,
        offset: 0,
        search: ''
      });
    });

    it('should use module-specific defaults', () => {
      const result = parsePaginationParams({}, 'REPORTS');
      expect(result.limit).toBe(25);
    });

    it('should validate and clamp page number', () => {
      const result = parsePaginationParams({ page: '-5' });
      expect(result.page).toBe(1);
    });

    it('should validate and clamp limit', () => {
      const result = parsePaginationParams({ limit: '5000' });
      expect(result.limit).toBe(1000);
    });

    it('should ignore short search terms', () => {
      const result = parsePaginationParams({ search: 'a' });
      expect(result.search).toBe('');
    });

    it('should accept valid search terms', () => {
      const result = parsePaginationParams({ search: 'john' });
      expect(result.search).toBe('john');
    });
  });

  describe('buildPaginationResponse', () => {
    it('should build correct response', () => {
      const response = buildPaginationResponse([1, 2, 3], 237, 1, 50);
      expect(response).toEqual({
        data: [1, 2, 3],
        pagination: {
          page: 1,
          limit: 50,
          total: 237,
          totalPages: 5,
          hasNext: true,
          hasPrev: false
        }
      });
    });
  });

  describe('buildCountQuery', () => {
    it('should convert SELECT to COUNT', () => {
      const baseQuery = 'SELECT * FROM users WHERE active = 1 ORDER BY name';
      const countQuery = buildCountQuery(baseQuery);
      expect(countQuery).toBe('SELECT COUNT(*) as total FROM users WHERE active = 1');
    });
  });
});
```

### Frontend Hook Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  it('should initialize with defaults', () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(50);
    expect(result.current.search).toBe('');
    expect(result.current.offset).toBe(0);
  });

  it('should use module-specific defaults', () => {
    const { result } = renderHook(() =>
      usePagination({ moduleDefault: 'REPORTS' })
    );

    expect(result.current.limit).toBe(25);
  });

  it('should update page correctly', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.page).toBe(3);
    expect(result.current.offset).toBe(100); // (3 - 1) * 50
  });

  it('should reset page when limit changes', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPage(5);
      result.current.setLimit(100);
    });

    expect(result.current.page).toBe(1); // Reset to 1
    expect(result.current.limit).toBe(100);
  });

  it('should generate correct query params', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPage(2);
      result.current.setSearch('john');
    });

    const params = result.current.queryParams.toString();
    expect(params).toBe('page=2&limit=50&search=john');
  });
});
```

---

## Performance Considerations

### Database Indexing

Ensure proper indexes for paginated queries:

```sql
-- Essential indexes for pagination
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_active_name ON users(active, name);

-- Composite indexes for filtered pagination
CREATE INDEX idx_users_role_name ON users(role_id, name);
CREATE INDEX idx_gauges_status_created ON gauges(status, created_at);
```

### Query Optimization

```javascript
// ✅ GOOD - Efficient count query
const countQuery = `
  SELECT COUNT(*) as total
  FROM users
  WHERE active = 1
`;

// ❌ BAD - Counting with SELECT *
const countQuery = `
  SELECT COUNT(*)
  FROM (
    SELECT * FROM users WHERE active = 1
  ) as subquery
`;
```

### Frontend Optimization

```typescript
// Use React Query for caching
const { data } = useQuery({
  queryKey: ['users', pagination.page, pagination.limit, pagination.search],
  queryFn: fetchUsers,
  keepPreviousData: true,     // Smooth transitions
  staleTime: 30000,            // Cache for 30 seconds
  cacheTime: 300000            // Keep in memory for 5 minutes
});
```

---

## Reference

### Files

- `/backend/src/infrastructure/utils/pagination.js` (164 lines) - Backend utilities
- `/frontend/src/infrastructure/hooks/usePagination.ts` (176 lines) - Frontend hook
- `/frontend/src/infrastructure/constants/pagination.ts` (31 lines) - Frontend constants

### Dependencies

- **Backend**: Node.js, Express, MySQL2
- **Frontend**: React, React Router, TypeScript

### Related Documentation

- [API Standards](./README.md)
- [Backend Standards](../02-Backend-Standards/README.md)
- [Frontend Hooks](../03-Frontend-Standards/03-Hook-Standards.md)
- [DataTable Component](../03-Frontend-Standards/02-Component-Library.md#datatable)

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
**Status**: Production Standard
