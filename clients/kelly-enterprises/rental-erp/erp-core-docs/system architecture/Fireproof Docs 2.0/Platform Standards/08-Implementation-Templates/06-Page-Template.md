# React Page Component Template

**Category**: Implementation Templates
**Purpose**: Standard template for creating new page components
**Last Updated**: 2025-11-07

---

## Overview

This template provides the standard structure for creating new page components in the Fire-Proof ERP application. Pages are top-level route components that typically include data fetching, state management, multiple child components, and user interactions.

**When to Use**:
- Creating new route/page components
- Building module dashboard pages
- Implementing list/detail pages
- Creating management pages

**Location Pattern**:
- Module pages: `/frontend/src/modules/{module}/pages/`

---

## Basic Page Template

**File**: `PageName.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Button,
  LoadingSpinner,
  Modal,
  FormInput,
  Badge,
  Pagination,
  DataTable,
  Alert
} from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useLogger } from '../../../infrastructure/utils/logger';
import { usePagination } from '../../../infrastructure/hooks/usePagination';
import { useAuth } from '../../../infrastructure/auth';
import { moduleService } from '../services/moduleService';
import { useModuleContext } from '../context';
import type { Item, CreateItemData } from '../types';
import { CreateItemModal, EditItemModal, DetailModal } from '../components';
import styles from './PageName.module.css';

/**
 * PageName - TODO: Brief page description
 *
 * TODO: Detailed page description explaining:
 * - Primary purpose
 * - User capabilities
 * - Data displayed
 * - Key workflows
 *
 * @route /module/page-name
 */
export const PageName: React.FC = () => {
  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Auth context
  const { user: currentUser } = useAuth();

  // Module context
  const { updateItem, deleteItem } = useModuleContext();

  // Logger
  const logger = useLogger('PageName');

  // Local state - Data
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  // Local state - UI
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters and sorting
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination hook
  const pagination = usePagination({
    moduleDefault: 'PAGE_NAME',
    preserveInUrl: true
  });

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle URL action parameter for direct modal opening
  useEffect(() => {
    const action = searchParams.get('action');
    const itemId = searchParams.get('id');

    if (action === 'create') {
      setShowCreateModal(true);
      // Remove action parameter
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    } else if (action === 'edit' && itemId) {
      // Load item and show edit modal
      loadItemAndEdit(itemId);
      searchParams.delete('action');
      searchParams.delete('id');
      setSearchParams(searchParams, { replace: true });
    } else if (action === 'view' && itemId) {
      // Load item and show detail modal
      loadItemAndView(itemId);
      searchParams.delete('action');
      searchParams.delete('id');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Load data when filters change
  useEffect(() => {
    loadItems();
  }, [pagination.page, pagination.limit, pagination.search, sortBy, sortDirection]);

  /**
   * Load items from API
   */
  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Loading items', {
        page: pagination.page,
        limit: pagination.limit,
        search: pagination.search,
        sortBy,
        sortDirection
      });

      const response = await moduleService.getItems(
        pagination.page,
        pagination.limit,
        pagination.search,
        sortBy,
        sortDirection
      );

      setItems(response.items);
      setTotalItems(response.total);

      logger.info('Items loaded successfully', {
        count: response.items.length,
        total: response.total
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load items';
      logger.errorWithStack('Failed to load items', err instanceof Error ? err : new Error(errorMessage));
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load item and show edit modal
   */
  const loadItemAndEdit = async (itemId: string) => {
    try {
      const item = await moduleService.getItem(itemId);
      setSelectedItem(item);
      setShowEditModal(true);
    } catch (err) {
      logger.errorWithStack('Failed to load item for editing', err instanceof Error ? err : new Error(String(err)));
    }
  };

  /**
   * Load item and show detail modal
   */
  const loadItemAndView = async (itemId: string) => {
    try {
      const item = await moduleService.getItem(itemId);
      setSelectedItem(item);
      setShowDetailModal(true);
    } catch (err) {
      logger.errorWithStack('Failed to load item details', err instanceof Error ? err : new Error(String(err)));
    }
  };

  /**
   * Handle sort column toggle
   */
  const handleSortToggle = (column: 'name' | 'created_at') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  /**
   * Handle create item
   */
  const handleCreateItem = async (itemData: CreateItemData) => {
    try {
      logger.info('Creating item', { itemData });

      await moduleService.createItem(itemData);

      // Reset to first page and reload
      pagination.setPage(1);
      await loadItems();

      setShowCreateModal(false);

      logger.info('Item created successfully');

    } catch (err) {
      logger.errorWithStack('Failed to create item', err instanceof Error ? err : new Error(String(err)));
      throw err; // Re-throw to let modal handle the error
    }
  };

  /**
   * Handle update item
   */
  const handleUpdateItem = async (itemId: string, itemData: Partial<Item>) => {
    try {
      logger.info('Updating item', { itemId, itemData });

      await updateItem(itemId, itemData);

      // Reload items
      await loadItems();

      setShowEditModal(false);
      setSelectedItem(null);

      logger.info('Item updated successfully');

    } catch (err) {
      logger.errorWithStack('Failed to update item', err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  /**
   * Handle delete item
   */
  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      logger.info('Deleting item', { itemId });

      await deleteItem(itemId);

      // Reload items
      await loadItems();

      logger.info('Item deleted successfully');

    } catch (err) {
      logger.errorWithStack('Failed to delete item', err instanceof Error ? err : new Error(String(err)));
    }
  };

  /**
   * Handle view item details
   */
  const handleViewItem = (item: Item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  // DataTable columns configuration
  const columns: DataTableColumn<Item>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: false,
      width: '100px'
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (item) => (
        <span
          className={styles.clickableName}
          onClick={() => handleViewItem(item)}
        >
          {item.name}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (item) => (
        <Badge variant={item.status === 'active' ? 'success' : 'default'}>
          {item.status}
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (item) => new Date(item.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (item) => (
        <div className={styles.actionButtons}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedItem(item);
              setShowEditModal(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteItem(item.id)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  // Loading state
  if (loading && items.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error && items.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <Alert type="error" title="Error Loading Data">
          {error}
        </Alert>
        <Button onClick={loadItems} variant="primary">
          Retry
        </Button>
      </div>
    );
  }

  // Main render
  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Page Name</h1>
          <p className={styles.subtitle}>
            Manage and view items
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
          >
            Create New Item
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <FormInput
            type="search"
            placeholder="Search items..."
            value={searchInput}
            onChange={(value) => {
              setSearchInput(value);
              // Debounce search - set pagination search after delay
              const timeoutId = setTimeout(() => {
                pagination.setSearch(value);
                pagination.setPage(1); // Reset to first page on search
              }, 300);

              return () => clearTimeout(timeoutId);
            }}
          />
        </div>

        <div className={styles.filterControls}>
          {/* TODO: Add filter controls as needed */}
        </div>
      </div>

      {/* Data Table */}
      <div className={styles.tableContainer}>
        {items.length === 0 ? (
          <Alert type="info" title="No Items">
            No items found. Create your first item to get started.
          </Alert>
        ) : (
          <DataTable
            columns={columns}
            data={items}
            resetKey={`${pagination.page}-${pagination.limit}-${pagination.search}`}
          />
        )}
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className={styles.paginationContainer}>
          <Pagination
            currentPage={pagination.page}
            totalPages={Math.ceil(totalItems / pagination.limit)}
            pageSize={pagination.limit}
            totalItems={totalItems}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setLimit}
          />
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateItemModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateItem}
        />
      )}

      {showEditModal && selectedItem && (
        <EditItemModal
          isOpen={showEditModal}
          item={selectedItem}
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
          }}
          onUpdate={handleUpdateItem}
        />
      )}

      {showDetailModal && selectedItem && (
        <DetailModal
          isOpen={showDetailModal}
          item={selectedItem}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
};
```

---

## Page Styles Template

**File**: `PageName.module.css`

```css
/* Page container */
.container {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-6);
  max-width: 1400px;
  margin: 0 auto;
}

/* Header section */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border-light);
}

.headerContent {
  flex: 1;
}

.title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2) 0;
}

.subtitle {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  margin: 0;
}

.headerActions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

/* Filters section */
.filters {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.searchBar {
  flex: 1;
  max-width: 400px;
}

.filterControls {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

/* Table section */
.tableContainer {
  background: var(--color-background-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.clickableName {
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: none;
}

.clickableName:hover {
  text-decoration: underline;
}

.actionButtons {
  display: flex;
  gap: var(--space-2);
}

/* Pagination section */
.paginationContainer {
  display: flex;
  justify-content: center;
  padding-top: var(--space-4);
}

/* Loading and error states */
.loadingContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.errorContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-8);
}

/* Responsive design */
@media (max-width: 1024px) {
  .container {
    padding: var(--space-4);
  }
}

@media (max-width: 768px) {
  .container {
    padding: var(--space-3);
    gap: var(--space-4);
  }

  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .headerActions {
    width: 100%;
    justify-content: flex-start;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .searchBar {
    max-width: 100%;
  }

  .actionButtons {
    flex-direction: column;
    width: 100%;
  }
}
```

---

## Advanced Page Patterns

### Detail Page

```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingSpinner, Button, Alert, Card } from '../../../infrastructure/components';
import { useLogger } from '../../../infrastructure/utils/logger';
import { moduleService } from '../services/moduleService';
import type { Item } from '../types';
import styles from './ItemDetailPage.module.css';

export const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const logger = useLogger('ItemDetailPage');

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/module/items');
      return;
    }

    loadItem(id);
  }, [id]);

  const loadItem = async (itemId: string) => {
    try {
      setLoading(true);
      setError(null);

      const data = await moduleService.getItem(itemId);
      setItem(data);

      logger.info('Item loaded', { itemId });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load item';
      logger.errorWithStack('Failed to load item', err instanceof Error ? err : new Error(errorMessage));
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !item) {
    return (
      <div className={styles.errorContainer}>
        <Alert type="error" title="Error">
          {error || 'Item not found'}
        </Alert>
        <Button onClick={() => navigate('/module/items')}>
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="secondary" onClick={() => navigate('/module/items')}>
          ← Back
        </Button>
        <h1>{item.name}</h1>
      </div>

      <Card>
        <CardContent>
          {/* Item details */}
          <div className={styles.detailGrid}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>ID:</span>
              <span className={styles.detailValue}>{item.id}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status:</span>
              <span className={styles.detailValue}>{item.status}</span>
            </div>
            {/* More details */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## Best Practices

### 1. Use Centralized Pagination Hook

```typescript
// ✅ GOOD - Centralized pagination
const pagination = usePagination({
  moduleDefault: 'PAGE_NAME',
  preserveInUrl: true
});

// Access: pagination.page, pagination.limit, pagination.search
// Setters: pagination.setPage(), pagination.setLimit(), pagination.setSearch()
```

### 2. Handle URL Parameters

```typescript
// ✅ GOOD - URL parameter handling
useEffect(() => {
  const action = searchParams.get('action');
  if (action === 'create') {
    setShowCreateModal(true);
    searchParams.delete('action');
    setSearchParams(searchParams, { replace: true });
  }
}, [searchParams]);
```

### 3. Proper Error Handling

```typescript
// ✅ GOOD - Comprehensive error handling
try {
  await moduleService.createItem(data);
  pagination.setPage(1);
  await loadItems();
  setShowCreateModal(false);
} catch (err) {
  logger.errorWithStack('Failed to create item', err instanceof Error ? err : new Error(String(err)));
  throw err; // Re-throw for modal to handle
}
```

### 4. Loading States

```typescript
// ✅ GOOD - Proper loading state
if (loading && items.length === 0) {
  return <LoadingSpinner />;
}
```

---

## Checklist

- [ ] Page component created with proper naming
- [ ] Router hooks imported and used
- [ ] Auth context accessed
- [ ] Logger configured
- [ ] Pagination hook integrated
- [ ] Data loading implemented
- [ ] Error handling added
- [ ] Loading states handled
- [ ] URL parameters handled
- [ ] DataTable configured
- [ ] Modals implemented
- [ ] CSS Module created
- [ ] Responsive design implemented
- [ ] Accessibility attributes added

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
