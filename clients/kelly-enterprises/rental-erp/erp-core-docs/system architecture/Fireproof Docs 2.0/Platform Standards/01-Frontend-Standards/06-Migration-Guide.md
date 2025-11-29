# Migration Guide

**Version**: 1.0.0
**Last Updated**: 2025-11-07

## Overview

This guide provides step-by-step instructions for migrating legacy code to use the Fire-Proof ERP Platform frontend standards. Follow these patterns to ensure compliance with infrastructure component usage.

## Migration Checklist

Before starting migration:
- [ ] Read [UI Components System](./01-UI-Components-System.md)
- [ ] Review [Component Usage Examples](./05-Component-Usage-Examples.md)
- [ ] Understand [State Management](./02-State-Management.md) patterns
- [ ] Run architecture validation: `npm run architecture:validate`

## Common Migrations

### 1. Button Migration

#### Legacy Code (Raw HTML)
```typescript
// ❌ WRONG - Raw button element
<button
  onClick={handleSave}
  className="btn btn-primary"
  disabled={loading}
>
  {loading ? 'Saving...' : 'Save'}
</button>
```

#### Migrated Code (Infrastructure Component)
```typescript
// ✅ CORRECT - Infrastructure Button component
import { Button } from '../../infrastructure/components';

<Button
  variant="primary"
  onClick={handleSave}
  loading={loading}
>
  Save
</Button>
```

**Benefits**:
- Automatic double-click protection
- Consistent styling
- Built-in loading states
- Accessibility improvements

### 2. Form Input Migration

#### Legacy Code
```typescript
// ❌ WRONG - Raw input elements
<div className="form-group">
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className={error ? 'form-control error' : 'form-control'}
    required
  />
  {error && <span className="error-text">{error}</span>}
</div>
```

#### Migrated Code
```typescript
// ✅ CORRECT - Infrastructure FormInput component
import { FormInput } from '../../infrastructure/components';

<FormInput
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={error}
  required
/>
```

**Benefits**:
- Consistent validation styling
- Built-in error display
- Standardized spacing
- Accessibility labels

### 3. Form Section Migration

#### Legacy Code
```typescript
// ❌ WRONG - Manual section headers
<div className="form-section">
  <div style={{
    textTransform: 'uppercase',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '2px solid #e5e7eb'
  }}>
    Basic Information
  </div>
  <input type="text" ... />
  <input type="text" ... />
</div>
```

#### Migrated Code
```typescript
// ✅ CORRECT - Infrastructure FormSection component
import { FormSection, FormInput } from '../../infrastructure/components';

<FormSection title="Basic Information">
  <FormInput label="Name" value={name} onChange={setName} />
  <FormInput label="Email" value={email} onChange={setEmail} />
</FormSection>
```

**Benefits**:
- Consistent section styling
- Centralized styling management
- Reduced code duplication

### 4. Modal Migration

#### Legacy Code
```typescript
// ❌ WRONG - window.confirm() or custom modal
if (window.confirm('Are you sure you want to delete this item?')) {
  handleDelete();
}

// Or custom modal implementation
{showModal && (
  <div className="modal-backdrop">
    <div className="modal">
      <div className="modal-header">
        <h2>Confirm</h2>
        <button onClick={() => setShowModal(false)}>×</button>
      </div>
      <div className="modal-body">
        Are you sure?
      </div>
      <div className="modal-footer">
        <button onClick={() => setShowModal(false)}>Cancel</button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  </div>
)}
```

#### Migrated Code
```typescript
// ✅ CORRECT - Infrastructure Modal component
import { Modal, Button } from '../../infrastructure/components';

const [showModal, setShowModal] = useState(false);

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirm Deletion"
  size="sm"
>
  <Modal.Body>
    Are you sure you want to delete this item?
  </Modal.Body>
  <Modal.Actions>
    <Button variant="secondary" onClick={() => setShowModal(false)}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleDelete}>
      Delete
    </Button>
  </Modal.Actions>
</Modal>
```

**Benefits**:
- Consistent modal behavior
- Focus management
- Keyboard navigation
- Backdrop handling
- Z-index management

### 5. API Call Migration

#### Legacy Code
```typescript
// ❌ WRONG - Direct fetch calls
const response = await fetch('/api/gauges/v2', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

if (!response.ok) {
  throw new Error('Failed to fetch');
}

const data = await response.json();
```

#### Migrated Code
```typescript
// ✅ CORRECT - Infrastructure API client
import { apiClient } from '../../infrastructure/api/client';

try {
  const data = await apiClient.get<Gauge[]>('/gauges/v2');
  // Handle data
} catch (error) {
  // Error handling (401 handled automatically)
  console.error('Failed to fetch gauges:', error);
}
```

**Benefits**:
- Automatic authentication (httpOnly cookies)
- Consistent error handling
- 401 redirect handling
- Type safety

### 6. Form Checkbox Migration

#### Legacy Code
```typescript
// ❌ WRONG - Raw checkbox
<div className="checkbox-group">
  <label>
    <input
      type="checkbox"
      checked={isActive}
      onChange={(e) => setIsActive(e.target.checked)}
    />
    <span>Active</span>
  </label>
</div>
```

#### Migrated Code
```typescript
// ✅ CORRECT - Infrastructure FormCheckbox
import { FormCheckbox } from '../../infrastructure/components';

<FormCheckbox
  label="Active"
  checked={isActive}
  onChange={(e) => setIsActive(e.target.checked)}
/>
```

### 7. Form Textarea Migration

#### Legacy Code
```typescript
// ❌ WRONG - Raw textarea
<div className="form-group">
  <label htmlFor="notes">Notes</label>
  <textarea
    id="notes"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    rows={4}
    className="form-control"
  />
</div>
```

#### Migrated Code
```typescript
// ✅ CORRECT - Infrastructure FormTextarea
import { FormTextarea } from '../../infrastructure/components';

<FormTextarea
  label="Notes"
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  rows={4}
/>
```

### 8. State Management Migration

#### Legacy Code (useState)
```typescript
// ❌ SUBOPTIMAL - Component-local state for shared data
function GaugeList() {
  const [selectedGaugeId, setSelectedGaugeId] = useState(null);
  const [filters, setFilters] = useState({});

  return (
    <div>
      {/* Component using local state */}
    </div>
  );
}
```

#### Migrated Code (Zustand Store)
```typescript
// ✅ CORRECT - Centralized state management
import { useGaugeState, useGaugeActions } from '../../infrastructure/store';

function GaugeList() {
  const { selectedGaugeId, filters } = useGaugeState();
  const { setSelectedGauge, updateGaugeFilters } = useGaugeActions();

  return (
    <div>
      {/* Component using centralized state */}
    </div>
  );
}
```

**Benefits**:
- Shared state across components
- Persistent state across navigation
- Better performance with selectors
- Organized state structure

### 9. Auth Service Migration

#### Legacy Code
```typescript
// ❌ WRONG - Custom auth logic
const isLoggedIn = () => {
  return !!localStorage.getItem('token');
};

const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};
```

#### Migrated Code
```typescript
// ✅ CORRECT - ERP Core auth service
import {
  isAuthenticated,
  getCurrentUser
} from '../../erp-core/src/core/auth/authService';

// Check authentication
if (isAuthenticated()) {
  // User is logged in
}

// Get current user
const user = getCurrentUser();
```

**Benefits**:
- Consistent auth checks
- httpOnly cookie management
- Automatic session handling
- Security improvements

## Step-by-Step Migration Process

### Step 1: Identify Components to Migrate

Run architecture validation:
```bash
npm run architecture:validate
```

Review the output for violations:
- Raw `<button>` usage
- Raw form elements
- Direct `fetch()` calls
- `window.confirm()` usage

### Step 2: Import Infrastructure Components

Add infrastructure component imports:
```typescript
import {
  Button,
  FormInput,
  FormCheckbox,
  FormTextarea,
  FormSection,
  Modal
} from '../../infrastructure/components';
```

### Step 3: Replace Raw Elements

Systematically replace each raw element with its infrastructure equivalent:

1. Replace all `<button>` with `<Button>`
2. Replace all `<input>` with `<FormInput>`
3. Replace all `<textarea>` with `<FormTextarea>`
4. Replace all `<input type="checkbox">` with `<FormCheckbox>`
5. Replace manual section headers with `<FormSection>`
6. Replace `window.confirm()` with `<Modal>`

### Step 4: Update API Calls

Replace all `fetch()` calls:
```typescript
// Before
const response = await fetch('/api/endpoint');

// After
import { apiClient } from '../../infrastructure/api/client';
const response = await apiClient.get('/endpoint');
```

### Step 5: Migrate State Management

For shared state, move to Zustand store:
```typescript
// Before
const [data, setData] = useState(null);

// After
const { data } = useGaugeState();
const { updateData } = useGaugeActions();
```

### Step 6: Test and Validate

1. Test all functionality manually
2. Run architecture validation: `npm run architecture:validate`
3. Run type checking: `npm run type-check`
4. Run linting: `npm run lint`
5. Verify no console errors
6. Check for proper double-click protection
7. Verify 401 redirect behavior

## Large-Scale Migration Example

### Before Migration

```typescript
// Legacy UserManagement component
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const loadUsers = async () => {
    const response = await fetch('/api/admin/users');
    const data = await response.json();
    setUsers(data);
  };

  const handleDelete = async () => {
    await fetch(`/api/admin/users/${userToDelete}`, {
      method: 'DELETE'
    });
    setShowDeleteConfirm(false);
    loadUsers();
  };

  return (
    <div>
      <h1>User Management</h1>
      <button onClick={() => navigate('/users/create')}>
        Create User
      </button>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <button onClick={() => {
                  setUserToDelete(user.id);
                  setShowDeleteConfirm(true);
                }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showDeleteConfirm && (
        <div className="modal">
          <p>Are you sure?</p>
          <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
          <button onClick={handleDelete}>Delete</button>
        </div>
      )}
    </div>
  );
}
```

### After Migration

```typescript
// Migrated UserManagement component
import {
  Button,
  Modal,
  DataTable,
  LoadingSpinner
} from '../../infrastructure/components';
import type { DataTableColumn } from '../../infrastructure/components';
import { apiClient } from '../../infrastructure/api/client';
import { useAdminState, useAdminActions } from '../../infrastructure/store';

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const { addNotification } = useSharedActions();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<User[]>('/admin/users');
      setUsers(data);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load users',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await apiClient.delete(`/admin/users/${userToDelete}`);
      addNotification({
        type: 'success',
        title: 'User deleted',
        message: 'The user has been deleted successfully'
      });
      setShowDeleteConfirm(false);
      loadUsers();
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to delete user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const columns: DataTableColumn<User>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'actions',
      label: 'Actions',
      render: (user) => (
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            setUserToDelete(user.id);
            setShowDeleteConfirm(true);
          }}
        >
          Delete
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
        alignItems: 'center',
        marginBottom: 'var(--space-6)'
      }}>
        <h1>User Management</h1>
        <Button
          variant="primary"
          onClick={() => navigate('/users/create')}
        >
          Create User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found"
      />

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <Modal.Body>
          Are you sure you want to delete this user?
        </Modal.Body>
        <Modal.Actions>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Actions>
      </Modal>
    </div>
  );
}
```

## Migration Testing Checklist

After migration, verify:
- [ ] All buttons use `Button` component
- [ ] All form inputs use infrastructure components
- [ ] All modals use `Modal` component
- [ ] All API calls use `apiClient`
- [ ] Double-click protection works on buttons
- [ ] Loading states display correctly
- [ ] Error messages appear properly
- [ ] 401 redirects to login
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Architecture validation passes
- [ ] ESLint passes

## Common Issues and Solutions

### Issue 1: Missing Component Imports

**Error**: `Button is not defined`

**Solution**: Import from infrastructure components
```typescript
import { Button } from '../../infrastructure/components';
```

### Issue 2: Type Errors with apiClient

**Error**: `Type 'unknown' is not assignable to type 'User[]'`

**Solution**: Add type parameter
```typescript
const users = await apiClient.get<User[]>('/admin/users');
```

### Issue 3: Form Section Styling

**Error**: Section headers don't match design

**Solution**: Use `FormSection` component
```typescript
<FormSection title="Basic Information">
  {/* Form fields */}
</FormSection>
```

### Issue 4: Modal Not Closing

**Error**: Modal stays open after action

**Solution**: Call `onClose` after async operations
```typescript
await apiClient.post('/endpoint', data);
onClose(); // Close modal after success
```

## Getting Help

If you encounter issues during migration:

1. Review [Component Usage Examples](./05-Component-Usage-Examples.md)
2. Check [UI Components System](./01-UI-Components-System.md) for component props
3. Run `npm run architecture:report` for infrastructure usage analysis
4. Review actual usage in `/frontend/src/modules/` directories
5. Consult [CLAUDE.md](../../../../../CLAUDE.md) for project-specific constraints

## Related Documentation
- [UI Components System](./01-UI-Components-System.md)
- [Component Usage Examples](./05-Component-Usage-Examples.md)
- [State Management](./02-State-Management.md)
- [ERP Core Integration](./04-ERP-Core-Integration.md)
