# Common Patterns

**Version**: 1.0.0
**Last Updated**: 2025-11-07

## Overview

This document contains frequently used patterns and best practices for frontend development in the Fire-Proof ERP Platform. These patterns have been extracted from production code and represent recommended approaches.

## CRUD Patterns

### List View with Filtering and Pagination

```typescript
import { useState, useEffect } from 'react';
import {
  Button,
  FormInput,
  DataTable,
  Pagination,
  LoadingSpinner
} from '../../infrastructure/components';
import type { DataTableColumn } from '../../infrastructure/components';
import { apiClient } from '../../infrastructure/api/client';
import { usePagination } from '../../infrastructure/hooks/usePagination';

function ItemList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useSharedActions();

  const pagination = usePagination({
    moduleDefault: 'ITEM_LIST',
    preserveInUrl: true
  });

  useEffect(() => {
    loadItems();
  }, [pagination.page, pagination.limit, pagination.search]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{items: Item[], total: number}>(
        `/items?page=${pagination.page}&limit=${pagination.limit}&search=${pagination.search}`
      );
      setItems(response.items);
      pagination.setTotal(response.total);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load items',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const columns: DataTableColumn<Item>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <Button size="sm" onClick={() => handleView(item)}>
          View
        </Button>
      )
    }
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-4)'
      }}>
        <FormInput
          placeholder="Search..."
          value={pagination.search}
          onChange={(e) => pagination.setSearch(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <Button variant="primary" onClick={() => navigate('/items/create')}>
          Create Item
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="No items found"
      />

      <Pagination
        currentPage={pagination.page}
        totalPages={Math.ceil(pagination.total / pagination.limit)}
        onPageChange={pagination.setPage}
      />
    </div>
  );
}
```

### Create/Edit Form Pattern

```typescript
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FormSection,
  FormInput,
  FormSelect,
  FormTextarea,
  Button,
  LoadingSpinner
} from '../../infrastructure/components';
import { apiClient } from '../../infrastructure/api/client';

function ItemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { addNotification } = useSharedActions();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    status: 'active'
  });

  useEffect(() => {
    if (isEdit) {
      loadItem();
    }
  }, [id]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const item = await apiClient.get<Item>(`/items/${id}`);
      setFormData({
        name: item.name,
        description: item.description || '',
        category: item.category,
        status: item.status
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load item',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      if (isEdit) {
        await apiClient.put(`/items/${id}`, formData);
        addNotification({
          type: 'success',
          title: 'Item updated',
          message: 'The item has been updated successfully'
        });
      } else {
        await apiClient.post('/items', formData);
        addNotification({
          type: 'success',
          title: 'Item created',
          message: 'The item has been created successfully'
        });
      }

      navigate('/items');
    } catch (error) {
      addNotification({
        type: 'error',
        title: isEdit ? 'Failed to update item' : 'Failed to create item',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '800px' }}>
      <h1>{isEdit ? 'Edit Item' : 'Create Item'}</h1>

      <form onSubmit={handleSubmit}>
        <FormSection title="Basic Information">
          <FormInput
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <FormSelect
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={[
              { value: 'cat1', label: 'Category 1' },
              { value: 'cat2', label: 'Category 2' }
            ]}
            required
          />
          <FormTextarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </FormSection>

        <div style={{
          display: 'flex',
          gap: 'var(--space-3)',
          justifyContent: 'flex-end',
          marginTop: 'var(--space-6)'
        }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/items')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={submitting}
          >
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

### Delete Confirmation Pattern

```typescript
import { useState } from 'react';
import { Modal, Button } from '../../infrastructure/components';
import { apiClient } from '../../infrastructure/api/client';

function DeleteButton({ item, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { addNotification } = useSharedActions();

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await apiClient.delete(`/items/${item.id}`);

      addNotification({
        type: 'success',
        title: 'Item deleted',
        message: `${item.name} has been deleted`
      });

      setShowConfirm(false);
      onDelete();
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to delete item',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="danger"
        onClick={() => setShowConfirm(true)}
      >
        Delete
      </Button>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <Modal.Body>
          <p>Are you sure you want to delete <strong>{item.name}</strong>?</p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Actions>
          <Button
            variant="secondary"
            onClick={() => setShowConfirm(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
          >
            Delete
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
}
```

## Multi-Step Form Pattern

```typescript
import { useState } from 'react';
import {
  FormSection,
  FormInput,
  Button
} from '../../infrastructure/components';
import { useGaugeActions } from '../../infrastructure/store';

function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const { updateGaugeFormData, resetGaugeForm } = useGaugeActions();
  const [formData, setFormData] = useState({
    // Step 1
    equipmentType: '',
    category: '',
    // Step 2
    serialNumber: '',
    manufacturer: '',
    // Step 3
    location: '',
    notes: ''
  });

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      await apiClient.post('/gauges', formData);
      resetGaugeForm();
      navigate('/gauges');
    } catch (error) {
      console.error('Failed to create gauge', error);
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '600px' }}>
      {/* Progress indicator */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-6)'
      }}>
        {[0, 1, 2].map((step) => (
          <div
            key={step}
            style={{
              flex: 1,
              height: '4px',
              backgroundColor: step <= currentStep
                ? 'var(--color-primary)'
                : 'var(--color-border)',
              borderRadius: 'var(--radius-sm)'
            }}
          />
        ))}
      </div>

      {/* Step 1: Equipment Type */}
      {currentStep === 0 && (
        <FormSection title="Select Equipment Type">
          <FormSelect
            label="Equipment Type"
            value={formData.equipmentType}
            onChange={(e) => setFormData({
              ...formData,
              equipmentType: e.target.value
            })}
            options={[
              { value: 'pressure', label: 'Pressure Gauge' },
              { value: 'temperature', label: 'Temperature Gauge' }
            ]}
            required
          />
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!formData.equipmentType}
          >
            Continue
          </Button>
        </FormSection>
      )}

      {/* Step 2: Details */}
      {currentStep === 1 && (
        <FormSection title="Gauge Details">
          <FormInput
            label="Serial Number"
            value={formData.serialNumber}
            onChange={(e) => setFormData({
              ...formData,
              serialNumber: e.target.value
            })}
            required
          />
          <FormInput
            label="Manufacturer"
            value={formData.manufacturer}
            onChange={(e) => setFormData({
              ...formData,
              manufacturer: e.target.value
            })}
            required
          />
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!formData.serialNumber || !formData.manufacturer}
            >
              Continue
            </Button>
          </div>
        </FormSection>
      )}

      {/* Step 3: Location */}
      {currentStep === 2 && (
        <FormSection title="Location & Notes">
          <FormInput
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({
              ...formData,
              location: e.target.value
            })}
          />
          <FormTextarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({
              ...formData,
              notes: e.target.value
            })}
            rows={4}
          />
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Create Gauge
            </Button>
          </div>
        </FormSection>
      )}
    </div>
  );
}
```

## Loading State Patterns

### Component-Level Loading

```typescript
function ItemDetails({ id }) {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Item>(`/items/${id}`);
      setItem(data);
    } catch (error) {
      console.error('Failed to load item', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!item) return <div>Item not found</div>;

  return (
    <div>
      <h1>{item.name}</h1>
      {/* Item details */}
    </div>
  );
}
```

### Action-Level Loading

```typescript
function SaveButton() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.post('/items', formData);
      addNotification({
        type: 'success',
        title: 'Item saved'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to save'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      variant="primary"
      onClick={handleSave}
      loading={saving}
    >
      Save
    </Button>
  );
}
```

### Global Loading State

```typescript
import { useSharedState, useSharedActions } from '../../infrastructure/store';

function GlobalOperations() {
  const { loading } = useSharedState();
  const { setLoading } = useSharedActions();

  const performOperation = async () => {
    try {
      setLoading('operation-key', true);
      await apiClient.post('/operation');
    } finally {
      setLoading('operation-key', false);
    }
  };

  const isOperationRunning = loading['operation-key'];

  return (
    <Button
      onClick={performOperation}
      loading={isOperationRunning}
    >
      Perform Operation
    </Button>
  );
}
```

## Error Handling Patterns

### API Error Handling with Notifications

```typescript
import { apiClient, APIError } from '../../infrastructure/api/client';
import { useSharedActions } from '../../infrastructure/store';

function DataLoader() {
  const { addNotification } = useSharedActions();

  const loadData = async () => {
    try {
      const data = await apiClient.get('/data');
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        // Handle specific status codes
        if (error.status === 404) {
          addNotification({
            type: 'warning',
            title: 'Data not found',
            message: 'The requested data could not be found'
          });
        } else if (error.status === 403) {
          addNotification({
            type: 'error',
            title: 'Access denied',
            message: 'You do not have permission to access this data'
          });
        } else {
          addNotification({
            type: 'error',
            title: 'Failed to load data',
            message: error.message
          });
        }
      } else {
        addNotification({
          type: 'error',
          title: 'Unexpected error',
          message: 'An unexpected error occurred'
        });
      }
      throw error;
    }
  };

  return null;
}
```

### Form Validation Pattern

```typescript
function ValidatedForm() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await apiClient.post('/auth/login', formData);
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => {
          setFormData({ ...formData, email: e.target.value });
          setErrors({ ...errors, email: '' }); // Clear error on change
        }}
        error={errors.email}
        required
      />
      <FormInput
        label="Password"
        type="password"
        value={formData.password}
        onChange={(e) => {
          setFormData({ ...formData, password: e.target.value });
          setErrors({ ...errors, password: '' });
        }}
        error={errors.password}
        required
      />
      <Button type="submit" variant="primary">
        Login
      </Button>
    </form>
  );
}
```

## Tab Navigation Pattern

```typescript
import { useState } from 'react';
import { Button } from '../../infrastructure/components';

function TabbedContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'history'>('overview');

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        padding: 'var(--space-2)',
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--space-6)'
      }}>
        <Button
          variant="nav"
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Button>
        <Button
          variant="nav"
          active={activeTab === 'details'}
          onClick={() => setActiveTab('details')}
        >
          Details
        </Button>
        <Button
          variant="nav"
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          History
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'details' && <DetailsTab />}
      {activeTab === 'history' && <HistoryTab />}
    </div>
  );
}
```

## Search and Filter Pattern

```typescript
import { useState, useEffect, useMemo } from 'react';
import { FormInput, FormSelect } from '../../infrastructure/components';

function FilteredList() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !debouncedSearch ||
        item.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = !category || item.category === category;
      const matchesStatus = !status || item.status === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, debouncedSearch, category, status]);

  return (
    <div>
      {/* Filters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-4)'
      }}>
        <FormInput
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FormSelect
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[
            { value: '', label: 'All Categories' },
            { value: 'cat1', label: 'Category 1' },
            { value: 'cat2', label: 'Category 2' }
          ]}
        />
        <FormSelect
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]}
        />
      </div>

      {/* Filtered Results */}
      <div>
        {filteredItems.length === 0 ? (
          <p>No items found</p>
        ) : (
          filteredItems.map(item => (
            <div key={item.id}>{item.name}</div>
          ))
        )}
      </div>
    </div>
  );
}
```

## DataTable Column Persistence Pattern

### Overview

The DataTable component uses the `useColumnManager` hook to provide column customization (reordering, visibility toggling) with backend API persistence across devices and sessions.

### Pattern Architecture

**Single Source of Truth**: Each DataTable requires ONE `columnManager` instance created by the parent component using `useColumnManager` hook.

**Why External Management?**
- Eliminates duplicate API calls
- Prevents infinite render loops
- Ensures consistent state across component lifecycle
- Enables cross-device synchronization via backend API

### Implementation Pattern

```typescript
// 1. Import hook
import { useColumnManager } from '../../../infrastructure/hooks';
import type { DataTableColumn } from '../../../infrastructure/components';

// 2. Define columns with render functions
const columns: DataTableColumn[] = [
  {
    id: 'id',
    label: 'ID',
    visible: true,
    locked: true,  // Prevents reordering/hiding
    align: 'left',
    render: (value) => (
      <span style={{ fontWeight: '600' }}>{value}</span>
    )
  },
  {
    id: 'name',
    label: 'NAME',
    visible: true,
    align: 'left'
  },
  {
    id: 'status',
    label: 'STATUS',
    visible: true,
    align: 'center',
    render: (value) => (
      <Badge variant={value === 'active' ? 'success' : 'secondary'}>
        {value}
      </Badge>
    )
  },
  {
    id: 'actions',
    label: 'ACTIONS',
    visible: true,
    align: 'center',
    sortable: false,
    filterable: false,
    render: (_, row) => (
      <Button size="sm" onClick={() => handleEdit(row)}>
        Edit
      </Button>
    )
  }
];

// 3. Create column manager (must be unique per table)
const columnManager = useColumnManager('unique-table-id', columns);

// 4. Pass to DataTable
<DataTable
  tableId="unique-table-id"
  columns={columns}           // Original definitions with render functions
  columnManager={columnManager}  // State manager
  data={data}
  onRowClick={handleRowClick}
  itemsPerPage={50}
/>
```

### External Column Controls Pattern

For pages with custom action button layouts (standard pattern), use external column controls instead of DataTable's built-in controls:

```typescript
import React, { useRef } from 'react';

const MyPage: React.FC = () => {
  // Column manager
  const columnManager = useColumnManager('my-table', columns);

  // Reference to DataTable's reset function
  const dataTableResetRef = useRef<(() => void) | null>(null);

  return (
    <div>
      {/* Action Buttons Row */}
      <div style={{
        padding: 'var(--space-2) var(--space-4) 0 var(--space-4)',
        backgroundColor: 'var(--color-gray-50)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Left side - Primary actions */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="primary"
            icon={<Icon name="plus" />}
            size="sm"
          >
            Add New
          </Button>
        </div>

        {/* Right side - Column controls */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {!columnManager.isEditMode ? (
            <Button
              onClick={() => columnManager.toggleEditMode()}
              variant="secondary"
              icon={<Icon name="cog" />}
              size="sm"
              preventDoubleClick={false}
            >
              Columns
            </Button>
          ) : (
            <>
              <Button
                onClick={() => columnManager.toggleEditMode()}
                variant="primary"
                icon={<Icon name="check" />}
                size="sm"
                preventDoubleClick={false}
              >
                Done
              </Button>
              <Button
                onClick={() => {
                  if (dataTableResetRef.current) {
                    dataTableResetRef.current();
                  }
                }}
                variant="secondary"
                size="sm"
                preventDoubleClick={false}
              >
                Reset Columns
              </Button>
            </>
          )}
        </div>
      </div>

      {/* DataTable with external controls */}
      <DataTable
        tableId="my-table"
        columns={columns}
        data={data}
        columnManager={columnManager}
        disableColumnControls={true}        // Hide internal controls
        externalEditMode={columnManager.isEditMode}  // Sync with external buttons
        onResetColumns={(resetFn) => {      // Capture reset function
          dataTableResetRef.current = resetFn;
        }}
        onRowClick={handleRowClick}
        itemsPerPage={50}
      />
    </div>
  );
};
```

**Key Configuration:**
- `disableColumnControls={true}` - Hides DataTable's built-in column controls
- `externalEditMode={columnManager.isEditMode}` - Syncs edit mode with external buttons
- `onResetColumns={(resetFn) => {...}}` - Captures DataTable's reset function for external button

**External Button Pattern:**
- **Not editing**: Show "Columns" button (with cog icon)
- **Editing**: Show "Done" + "Reset Columns" buttons
- Use `preventDoubleClick={false}` for responsive UI feedback

**Examples:**
- User Management: `/frontend/src/modules/admin/pages/UserManagement.tsx`
- Gauge List: `/frontend/src/modules/gauge/pages/GaugeList.tsx`


### Key Points

**Table ID Requirements**:
- Must be unique across the entire application
- Used for persistence key generation
- Format: `module-component-table` (e.g., `gauge-list`, `user-management`)

**Column Definitions**:
- Define outside component or use `useMemo` if dynamic
- Include render functions for custom cell content
- Locked columns cannot be reordered or hidden

**Column Manager**:
- Created with `useColumnManager` hook
- Returns memoized object (prevents re-renders)
- Manages: visibility, order, edit mode, drag-drop

**Persistence**:
- Automatic save via backend API (1-second debounce)
- Syncs across devices for same user
- Survives: page refresh, logout/login, navigation
- Stored format: JSON (without render functions)

### Column Manager API

```typescript
interface UseColumnManagerReturn {
  // State
  columns: Column[];              // Current column configuration
  isEditMode: boolean;           // Edit mode active?
  dragState: {                   // Drag-drop state
    draggedIndex: number | null;
    targetIndex: number | null;
  };

  // Actions
  toggleEditMode: () => void;                    // Enter/exit edit mode
  toggleVisibility: (columnId: string) => void;  // Show/hide column
  resetToDefault: () => void;                    // Reset to defaults
  getColumnVisibility: (columnId: string) => boolean;

  // Drag-drop handlers
  handleDragStart: (e: DragEvent, index: number) => void;
  handleDragOver: (e: DragEvent, index: number) => void;
  handleDrop: (e: DragEvent, index: number) => void;
  handleDragEnd: () => void;
}
```

### Multiple DataTables in One Component

When a component has multiple DataTable instances (e.g., tabs, sections), create separate managers:

```typescript
// Location detail page with 3 tables
const gaugeColumns: DataTableColumn[] = [/* gauge columns */];
const toolColumns: DataTableColumn[] = [/* tool columns */];
const partColumns: DataTableColumn[] = [/* part columns */];

// Create separate managers with unique IDs
const gaugeColumnManager = useColumnManager('location-gauges', gaugeColumns);
const toolColumnManager = useColumnManager('location-tools', toolColumns);
const partColumnManager = useColumnManager('location-parts', partColumns);

return (
  <>
    <DataTable
      tableId="location-gauges"
      columns={gaugeColumns}
      columnManager={gaugeColumnManager}
      data={gauges}
    />

    <DataTable
      tableId="location-tools"
      columns={toolColumns}
      columnManager={toolColumnManager}
      data={tools}
    />

    <DataTable
      tableId="location-parts"
      columns={partColumns}
      columnManager={partColumnManager}
      data={parts}
    />
  </>
);
```

### Common Issues

**Issue**: Infinite render loop

**Cause**: Column array recreated on every render
```typescript
// ❌ WRONG - Creates new array on every render
function MyComponent() {
  const columns = [/* columns */];  // NEW array each render
  const columnManager = useColumnManager('table-id', columns);
}
```

**Solution**: Define outside component or memoize
```typescript
// ✅ CORRECT - Stable reference
const columns: DataTableColumn[] = [/* columns */];

function MyComponent() {
  const columnManager = useColumnManager('table-id', columns);
}

// OR use useMemo if columns depend on props/state
function MyComponent({ userRole }) {
  const columns = useMemo(() => [
    /* columns filtered by userRole */
  ], [userRole]);

  const columnManager = useColumnManager('table-id', columns);
}
```

**Issue**: Action buttons disappear

**Cause**: Passing `columnManager.columns` instead of original `columns`
```typescript
// ❌ WRONG - columnManager.columns lose render functions (JSON deserialized)
<DataTable
  columns={columnManager.columns}  // No render functions!
  columnManager={columnManager}
/>
```

**Solution**: Pass original columns array
```typescript
// ✅ CORRECT - Original columns with render functions
<DataTable
  columns={columns}  // Full definitions with render functions
  columnManager={columnManager}  // Visibility/order state
/>
```

**Issue**: Columns not persisting

**Checklist**:
1. ✅ Unique table ID across application?
2. ✅ `columnManager` prop passed to DataTable?
3. ✅ `tableId` prop matches hook's table ID?
4. ✅ User authenticated? (Persistence requires auth)
5. ✅ Check browser console for API errors

### Testing Checklist

Before deploying DataTable changes:

- [ ] Column visibility toggles work
- [ ] Column reordering via drag-drop works
- [ ] Reset to default restores original order/visibility
- [ ] Refresh page → columns persist
- [ ] Navigate away and back → columns persist
- [ ] Logout/login → columns persist
- [ ] Different device → columns sync
- [ ] Console shows no duplicate API calls
- [ ] Console shows no infinite render logs
- [ ] Action buttons with render functions work

### Performance

**Backend API Calls**:
- Debounced: 1 second delay on changes
- Single save per table per change (not per column)
- Load: Once on mount, cached thereafter

**Render Performance**:
- `columnManager` object memoized (stable reference)
- Column state updates trigger minimal re-renders
- Drag-drop uses native HTML5 API (no library overhead)

**Token/Size**:
- Stored JSON excludes render functions (~50-200 bytes per table)
- User preferences table: indexed on `user_id` + `preference_key`

## Related Documentation
- [UI Components System](./01-UI-Components-System.md)
- [Component Usage Examples](./05-Component-Usage-Examples.md)
- [State Management](./02-State-Management.md)
- [Migration Guide](./06-Migration-Guide.md)
