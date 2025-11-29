# Pagination Gold Standard for Fire-Proof ERP

**Created**: 2025-10-19 16:57:21
**Last Updated**: 2025-10-19 17:03:39
**Purpose**: Establish consistent pagination patterns across the entire platform

**Status**: ✅ **ACTIVE** - All pagination has been standardized across backend and frontend

## ✅ Core Principles

1. **Single Source of Truth**: All pagination logic uses shared utilities
2. **Consistency**: Backend and frontend use matching pagination structure
3. **Type Safety**: Well-defined interfaces for pagination data
4. **Performance**: Efficient queries with proper indexing
5. **User Experience**: Smooth, predictable pagination behavior

---

## 🔧 Backend Implementation

### 1. Standard Response Structure

All paginated endpoints MUST return this structure:

```javascript
{
  data: [...],           // Array of items
  pagination: {
    page: 1,             // Current page (1-indexed)
    limit: 50,           // Items per page
    total: 200,          // Total count of all items
    totalPages: 4,       // Calculated: Math.ceil(total / limit)
    hasNext: true,       // Has next page
    hasPrev: false       // Has previous page
  }
}
```

### 2. Centralized Utility Usage

**File**: `/backend/src/infrastructure/utils/pagination.js`

```javascript
const { parsePaginationParams, buildPaginationResponse } = require('../../../infrastructure/utils/pagination');

// In route handler:
const { page, limit, offset } = parsePaginationParams(req.query, 'MODULE_NAME');

// After getting data:
const response = buildPaginationResponse(data, total, page, limit);
res.json(response);
```

### 3. Repository Pattern

**GOLD STANDARD**: Use `executeQuery` for pagination queries

```javascript
async searchItems(filters = {}, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;

  try {
    // Build main query
    let query = 'SELECT * FROM items WHERE is_deleted = 0';
    const params = [];

    // Apply filters...
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    // Add pagination
    query += ' ORDER BY created_at DESC';
    if (filters.limit) {
      const limitValue = this.validateIntegerParameter(filters.limit, 'limit', 1, 1000);
      query += ` LIMIT ${limitValue}`;

      if (filters.offset !== undefined) {
        const offsetValue = this.validateIntegerParameter(filters.offset, 'offset', 0, Number.MAX_SAFE_INTEGER);
        query += ` OFFSET ${offsetValue}`;
      }
    }

    // Execute main query
    const items = await this.executeQuery(query, params, connection);

    // Build count query (mirror filters, exclude pagination)
    let countQuery = 'SELECT COUNT(*) as total FROM items WHERE is_deleted = 0';
    const countParams = [];

    // Apply SAME filters as main query
    if (filters.status) {
      countQuery += ' AND status = ?';
      countParams.push(filters.status);
    }

    // Execute count query
    const countResult = await this.executeQuery(countQuery, countParams, connection);
    const total = countResult[0]?.total || 0;  // ✅ CRITICAL: executeQuery returns rows directly

    // Apply DTO transformation
    const transformedItems = items.map(item => this.transformToDTO(item));

    return { items: transformedItems, total };
  } catch (error) {
    logger.error('Failed to search items:', error);
    throw error;
  } finally {
    if (shouldRelease) connection.release();
  }
}
```

### 4. Critical Patterns

#### ✅ DO: Use executeQuery

```javascript
const countResult = await this.executeQuery(countQuery, countParams, connection);
const total = countResult[0]?.total || 0;  // ✅ Returns rows directly
```

#### ✅ DO: Use connection.query with destructuring

```javascript
const [countResult] = await connection.query(countQuery, params);
const total = countResult[0]?.total || 0;  // ✅ Destructured rows
```

#### ❌ DON'T: Mix patterns

```javascript
const countResult = await this.executeQuery(...);
const total = countResult[0]?.[0]?.total || 0;  // ❌ WRONG: Double indexing
```

---

## 🎨 Frontend Implementation

### 1. Centralized Hook

**File**: `/frontend/src/infrastructure/hooks/usePagination.ts`

```typescript
import { usePagination } from '@/infrastructure/hooks/usePagination';

// In component:
const pagination = usePagination({
  moduleDefault: 'GAUGE_INVENTORY',  // Uses module-specific default
  preserveInUrl: true                // Sync with URL params
});

// Usage:
pagination.page       // Current page
pagination.limit      // Items per page
pagination.setPage(2) // Change page
pagination.setLimit(100) // Change limit
```

### 2. API Response Interface

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### 3. Component Pattern

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['items', filters],
  queryFn: () => itemService.getAll(filters)
});

const items = data?.data || [];
const paginationInfo = data?.pagination || { total: 0, totalPages: 0 };

return (
  <>
    {items.map(item => <ItemRow key={item.id} item={item} />)}

    {paginationInfo.total > 0 && (
      <Pagination
        currentPage={pagination.page}
        totalPages={paginationInfo.totalPages}
        totalItems={paginationInfo.total}
        itemsPerPage={pagination.limit}
        onPageChange={handlePageChange}
      />
    )}
  </>
);
```

### 4. Pagination Component

**File**: `/frontend/src/infrastructure/components/Pagination.tsx`

**GOLD STANDARD** shared pagination component used across all modules:
- Page number buttons with ellipsis (max 7 visible)
- Previous/Next navigation (« and »)
- "Showing X-Y of Z items" display
- **Light background styling**: Custom inline styles for visibility on white cards
- Responsive design with proper spacing
- Active page highlighted with primary variant (blue)
- Inactive pages with clear contrast (dark text, light border)

**Import**: `import { Pagination } from '@/infrastructure/components';`

### 5. Dual Placement Pattern (Top & Bottom)

**GOLD STANDARD**: For enterprise admin interfaces with ≥50 items per page, pagination appears at BOTH top and bottom.

**Why Dual Placement?**
- **Reduces scrolling**: Users can navigate without scrolling to bottom on long pages
- **Enterprise UX best practice**: Recommended for data tables >30 rows
- **Power user efficiency**: Internal users do frequent queries and know what they're looking for
- **Immediate access**: Users can switch pages based on first few rows without viewing entire page

**Implementation Pattern**:

```typescript
<CardContent style={{ padding: 0 }}>
  {/* Pagination - Top */}
  {totalPages > 1 && (
    <Pagination
      currentPage={pagination.page}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      totalItems={totalItems}
      itemsPerPage={pagination.limit}
    />
  )}

  {/* Main content (table, list, etc.) */}
  <table>...</table>

  {/* Pagination - Bottom */}
  {totalPages > 1 && (
    <Pagination
      currentPage={pagination.page}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      totalItems={totalItems}
      itemsPerPage={pagination.limit}
    />
  )}
</CardContent>
```

**Critical Details**:
- Both paginations use IDENTICAL props for consistency
- Both render INSIDE `CardContent` for consistent white background
- Both have clear comments: `{/* Pagination - Top */}` and `{/* Pagination - Bottom */}`
- Both check same condition: `{totalPages > 1 &&`

**Examples**:
- UserManagement: `/frontend/src/modules/admin/pages/UserManagement.tsx:177-185, 281-289`
- GaugeList: `/frontend/src/modules/gauge/pages/GaugeList.tsx:765-774, 804-813`

---

## 📐 Module-Specific Defaults

Defined in both frontend and backend for consistency:
- **Frontend**: `/frontend/src/infrastructure/constants/pagination.ts`
- **Backend**: `/backend/src/infrastructure/utils/pagination.js`

```javascript
MODULE_DEFAULTS: {
  USER_MANAGEMENT: 50,
  GAUGE_INVENTORY: 50,  // Default page size for gauge inventory
  AUDIT_LOGS: 50,
  REPORTS: 25,
}
```

To add a new module:
1. Add to `MODULE_DEFAULTS` object
2. Use in `parsePaginationParams(req.query, 'YOUR_MODULE')`
3. Frontend uses matching constant

---

## 🧪 Testing Checklist

For each paginated endpoint:

- [ ] Returns standard pagination structure
- [ ] Total count matches actual data
- [ ] Page navigation works correctly
- [ ] Limit changes apply properly
- [ ] Filters don't break pagination
- [ ] Empty results handled gracefully
- [ ] SQL injection protection validated
- [ ] Performance tested with large datasets
- [ ] **Dual pagination**: Both top and bottom present for pages ≥50 items
- [ ] **Consistent placement**: Both inside CardContent on white background
- [ ] **Identical props**: Top and bottom use same props and styling

---

## 🔍 Common Issues & Solutions

### Issue: Total count returns 0 but items exist

**Cause**: Incorrect array indexing in count query result

**Solution**:
```javascript
// ✅ CORRECT
const total = countResult[0]?.total || 0;  // executeQuery returns rows

// ❌ WRONG
const total = countResult[0]?.[0]?.total || 0;  // Double indexing
```

### Issue: Pagination resets when changing filters

**Cause**: Not resetting page to 1 when filters change

**Solution**:
```typescript
const handleFilterChange = (newFilters) => {
  updateFilters(newFilters);
  pagination.setPage(1);  // ✅ Reset to first page
};
```

### Issue: Pagination buttons blend into white background

**Cause**: Outline variant designed for dark backgrounds with white/transparent styling

**Solution**: Add inline styles to pagination buttons for light backgrounds
```typescript
const paginationButtonStyle = {
  backgroundColor: '#ffffff',
  color: '#374151',
  border: '1px solid #d1d5db',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
};

<Button
  variant="outline"
  size="sm"
  style={paginationButtonStyle}  // ✅ Override for visibility
>
  1
</Button>
```

### Issue: Count query doesn't match main query

**Cause**: Filters applied differently between queries

**Solution**: Extract filter logic into reusable function or ensure exact duplication

---

## 📊 Performance Guidelines

1. **Index COUNT queries**: Ensure `WHERE` clause columns are indexed
2. **Cache counts**: For static/slow-changing data
3. **Limit total pages**: Cap at reasonable maximum (e.g., 1000 pages)
4. **Use cursor-based**: For infinite scroll or real-time data

---

## 🚀 Migration Checklist

To standardize an existing endpoint:

1. [ ] Backend: Update repository to use `buildPaginationResponse`
2. [ ] Backend: Fix count query extraction pattern
3. [ ] Frontend: Update to use `usePagination` hook
4. [ ] Frontend: Update component to use standard `Pagination` component
5. [ ] Frontend: Implement dual placement (top and bottom) for ≥50 items/page
6. [ ] Frontend: Ensure both paginations inside CardContent with identical props
7. [ ] Test: Verify total count accuracy
8. [ ] Test: Verify page navigation (both top and bottom)
9. [ ] Test: Verify consistent styling between top and bottom pagination
10. [ ] Document: Update API documentation

---

## 📚 References

### Core Infrastructure
- **Backend Utility**: `/backend/src/infrastructure/utils/pagination.js`
- **Frontend Hook**: `/frontend/src/infrastructure/hooks/usePagination.ts`
- **Frontend Constants**: `/frontend/src/infrastructure/constants/pagination.ts`
- **Pagination Component**: `/frontend/src/infrastructure/components/Pagination.tsx` (GOLD STANDARD)

### Implementation Examples
- **Backend**: AdminRepository.js (lines 12-87), GaugeRepository.js (lines 555-677)
- **Frontend Dual Placement**:
  - UserManagement: `/frontend/src/modules/admin/pages/UserManagement.tsx:177-185, 281-289`
  - GaugeList: `/frontend/src/modules/gauge/pages/GaugeList.tsx:765-774, 804-813`

### Research & Best Practices
- Enterprise data tables: Dual pagination for >30 rows per page
- UX best practice: Top placement reduces scrolling for power users
- Material Design: Bottom placement standard, top placement for efficiency
