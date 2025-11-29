# Component Usage Examples

**Version**: 1.0.0
**Last Updated**: 2025-11-07

## Overview

This document provides real-world examples of infrastructure component usage from the Fire-Proof ERP Platform codebase. All examples are production code demonstrating best practices.

## Complete Page Examples

### User Management Page

**Source**: `/frontend/src/modules/admin/pages/UserManagement.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../context';
import { adminService } from '../services/adminService';
import {
  LoadingSpinner,
  Button,
  Modal,
  FormInput,
  Badge,
  Pagination,
  DataTable
} from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { usePagination } from '../../../infrastructure/hooks/usePagination';
import { User, CreateUserData } from '../types';
import {
  AddUserModal,
  UserDetailsModal,
  ResetPasswordModal
} from '../components';

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { createUser, updateUser, deleteUser } = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Use centralized pagination hook
  const pagination = usePagination({
    moduleDefault: 'USER_MANAGEMENT',
    preserveInUrl: true
  });

  useEffect(() => {
    loadUsers();
  }, [pagination.page, pagination.limit, pagination.search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers(
        pagination.page,
        pagination.limit,
        pagination.search
      );
      setUsers(response.users);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: CreateUserData) => {
    await createUser(userData);
    pagination.setPage(1);
    loadUsers();
    setShowCreateModal(false);
  };

  const columns: DataTableColumn<User>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true
    },
    {
      key: 'role',
      label: 'Role',
      render: (user) => <Badge variant="info">{user.role}</Badge>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button
            size="sm"
            onClick={() => setSelectedUser(user)}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteUser(user.id)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-6)'
      }}>
        <h1>User Management</h1>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create User
        </Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <FormInput
          placeholder="Search users..."
          value={pagination.search}
          onChange={(e) => pagination.setSearch(e.target.value)}
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found"
      />

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={Math.ceil(pagination.total / pagination.limit)}
        onPageChange={pagination.setPage}
      />

      {/* Create User Modal */}
      <AddUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUser}
      />

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};
```

### Gauge Creation Form

**Source**: `/frontend/src/modules/gauge/pages/CreateGaugePage.tsx`

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FormSection,
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox,
  Button,
  LoadingSpinner
} from '../../../infrastructure/components';
import { useGaugeActions } from '../../../infrastructure/store';
import { gaugeService } from '../services/gaugeService';

export const CreateGaugePage = () => {
  const navigate = useNavigate();
  const { addNotification } = useSharedActions();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    serialNumber: '',
    manufacturer: '',
    model: '',
    category: '',
    calibrationDate: '',
    nextCalibrationDate: '',
    location: '',
    notes: '',
    isActive: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await gaugeService.createGauge(formData);

      addNotification({
        type: 'success',
        title: 'Gauge created',
        message: 'The gauge has been created successfully'
      });

      navigate('/gauges');
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to create gauge',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '800px' }}>
      <h1>Create Gauge</h1>

      <form onSubmit={handleSubmit}>
        <FormSection title="Basic Information">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--space-4)'
          }}>
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
            <FormInput
              label="Model"
              value={formData.model}
              onChange={(e) => setFormData({
                ...formData,
                model: e.target.value
              })}
              required
            />
            <FormSelect
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({
                ...formData,
                category: e.target.value
              })}
              options={[
                { value: 'pressure', label: 'Pressure' },
                { value: 'temperature', label: 'Temperature' },
                { value: 'flow', label: 'Flow' }
              ]}
              required
            />
          </div>
        </FormSection>

        <FormSection title="Calibration">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--space-4)'
          }}>
            <FormInput
              label="Calibration Date"
              type="date"
              value={formData.calibrationDate}
              onChange={(e) => setFormData({
                ...formData,
                calibrationDate: e.target.value
              })}
            />
            <FormInput
              label="Next Calibration Date"
              type="date"
              value={formData.nextCalibrationDate}
              onChange={(e) => setFormData({
                ...formData,
                nextCalibrationDate: e.target.value
              })}
            />
          </div>
        </FormSection>

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
            helperText="Optional notes about this gauge"
          />
          <FormCheckbox
            label="Active"
            checked={formData.isActive}
            onChange={(e) => setFormData({
              ...formData,
              isActive: e.target.checked
            })}
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
            onClick={() => navigate('/gauges')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={loading}
          >
            Create Gauge
          </Button>
        </div>
      </form>
    </div>
  );
};
```

## Modal Examples

### Confirmation Modal

```typescript
import { useState } from 'react';
import { Modal, Button } from '../../../infrastructure/components';

function DeleteConfirmation() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    // Perform delete
    await deleteItem();
    setShowConfirm(false);
  };

  return (
    <>
      <Button
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
          <p>Are you sure you want to delete this item?</p>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Actions>
          <Button
            variant="secondary"
            onClick={() => setShowConfirm(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
}
```

### Form Modal

```typescript
import { useState } from 'react';
import {
  Modal,
  FormInput,
  FormSection,
  Button
} from '../../../infrastructure/components';

function AddUserModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await onSubmit(formData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add User"
      size="md"
    >
      <Modal.Body>
        <FormSection title="User Information">
          <FormInput
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({
              ...formData,
              name: e.target.value
            })}
            required
          />
          <FormInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({
              ...formData,
              email: e.target.value
            })}
            required
          />
          <FormSelect
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({
              ...formData,
              role: e.target.value
            })}
            options={[
              { value: 'admin', label: 'Administrator' },
              { value: 'user', label: 'User' },
              { value: 'viewer', label: 'Viewer' }
            ]}
            required
          />
        </FormSection>
      </Modal.Body>
      <Modal.Actions>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={loading}
        >
          Add User
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
```

### Multi-Tab Modal

```typescript
import { useState } from 'react';
import { Modal, Button, Tabs, TabsList, TabsTrigger, TabsContent } from '../../../infrastructure/components';

function UserDetailsModal({ user, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <Modal.Header
        title={user.name}
        subtitle={user.email}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          {/* User details content */}
        </TabsContent>

        <TabsContent value="permissions">
          {/* Permissions content */}
        </TabsContent>

        <TabsContent value="activity">
          {/* Activity content */}
        </TabsContent>
      </Tabs>

      <Modal.Actions>
        <Button onClick={onClose}>Close</Button>
      </Modal.Actions>
    </Modal>
  );
}
```

## Form Examples

### Simple Form

```typescript
function SimpleForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <FormInput
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" variant="primary">
        Login
      </Button>
    </form>
  );
}
```

### Multi-Section Form

```typescript
function ComplexForm() {
  const [formData, setFormData] = useState({
    // Basic info
    name: '',
    email: '',
    phone: '',
    // Address
    street: '',
    city: '',
    state: '',
    zip: '',
    // Preferences
    newsletter: false,
    notifications: true
  });

  return (
    <form onSubmit={handleSubmit}>
      <FormSection title="Basic Information">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-4)'
        }}>
          <FormInput
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <FormInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <FormInput
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </FormSection>

      <FormSection title="Address">
        <FormInput
          label="Street"
          value={formData.street}
          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
        />
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: 'var(--space-4)'
        }}>
          <FormInput
            label="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <FormInput
            label="State"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          />
          <FormInput
            label="ZIP"
            value={formData.zip}
            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
          />
        </div>
      </FormSection>

      <FormSection title="Preferences">
        <FormCheckbox
          label="Subscribe to newsletter"
          checked={formData.newsletter}
          onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
        />
        <FormCheckbox
          label="Enable notifications"
          checked={formData.notifications}
          onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
        />
      </FormSection>

      <div style={{
        display: 'flex',
        gap: 'var(--space-3)',
        justifyContent: 'flex-end',
        marginTop: 'var(--space-6)'
      }}>
        <Button variant="secondary" type="button">Cancel</Button>
        <Button variant="primary" type="submit">Save</Button>
      </div>
    </form>
  );
}
```

## Data Table Examples

### Basic Data Table

```typescript
import { DataTable } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';

function UserList() {
  const columns: DataTableColumn<User>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role' }
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      loading={loading}
      emptyMessage="No users found"
    />
  );
}
```

### Data Table with Custom Rendering

```typescript
const columns: DataTableColumn<Gauge>[] = [
  {
    key: 'serialNumber',
    label: 'Serial Number',
    sortable: true
  },
  {
    key: 'status',
    label: 'Status',
    render: (gauge) => (
      <Badge variant={gauge.status === 'active' ? 'success' : 'warning'}>
        {gauge.status}
      </Badge>
    )
  },
  {
    key: 'calibrationDue',
    label: 'Calibration Due',
    render: (gauge) => {
      const dueDate = new Date(gauge.nextCalibrationDate);
      const isOverdue = dueDate < new Date();
      return (
        <span style={{ color: isOverdue ? 'var(--color-danger)' : 'inherit' }}>
          {dueDate.toLocaleDateString()}
        </span>
      );
    }
  },
  {
    key: 'actions',
    label: 'Actions',
    render: (gauge) => (
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button size="sm" onClick={() => handleView(gauge)}>View</Button>
        <Button size="sm" variant="primary" onClick={() => handleEdit(gauge)}>Edit</Button>
      </div>
    )
  }
];
```

## Button Examples

### Button Variants

```typescript
<div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
  <Button variant="primary">Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="success">Success</Button>
  <Button variant="warning">Warning</Button>
  <Button variant="danger">Danger</Button>
  <Button variant="info">Info</Button>
  <Button variant="outline">Outline</Button>
  <Button variant="ghost">Ghost</Button>
</div>
```

### Button Sizes

```typescript
<div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
  <Button size="compact">Compact</Button>
  <Button size="xs">Extra Small</Button>
  <Button size="sm">Small</Button>
  <Button size="md">Medium</Button>
  <Button size="lg">Large</Button>
  <Button size="xl">Extra Large</Button>
</div>
```

### Buttons with Icons

```typescript
import { PlusIcon, TrashIcon, EditIcon } from '@heroicons/react/24/outline';

<div style={{ display: 'flex', gap: 'var(--space-3)' }}>
  <Button icon={<PlusIcon />} variant="primary">
    Add Item
  </Button>
  <Button icon={<EditIcon />} variant="secondary">
    Edit
  </Button>
  <Button icon={<TrashIcon />} variant="danger">
    Delete
  </Button>
</div>
```

### Loading State

```typescript
function SaveButton() {
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveData();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="primary"
      onClick={handleSave}
      loading={loading}
    >
      Save Changes
    </Button>
  );
}
```

## Navigation Examples

### Breadcrumb Navigation

```typescript
import { Breadcrumb } from '../../../infrastructure/components';

<Breadcrumb
  items={[
    { label: 'Home', path: '/' },
    { label: 'Gauges', path: '/gauges' },
    { label: 'Create Gauge' }
  ]}
/>
```

### Tab Navigation

```typescript
import { Button } from '../../../infrastructure/components';

function TabNavigation() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-2)',
      padding: 'var(--space-2)',
      backgroundColor: 'var(--color-bg-secondary)',
      borderRadius: 'var(--radius-lg)'
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
  );
}
```

## Related Documentation
- [UI Components System](./01-UI-Components-System.md)
- [State Management](./02-State-Management.md)
- [Styling Architecture](./03-Styling-Architecture.md)
- [Migration Guide](./06-Migration-Guide.md)
