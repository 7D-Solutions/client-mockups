# UI Components System

**Version**: 1.0.0
**Last Updated**: 2025-11-07

## Overview

The UI Components System provides a centralized library of production-ready components that **MUST** be used for all frontend development. This system ensures consistency, accessibility, and maintainability across the entire platform.

## Critical Rule

**NEVER create raw HTML elements.** Always use infrastructure components.

## Component Categories

### 1. Button System

#### Primary Button Component

**Location**: `/frontend/src/infrastructure/components/Button.tsx`

**Features**:
- Double-click protection (1-second cooldown, configurable)
- Loading states
- Multiple variants and sizes
- Full accessibility support
- Icon support

**Props**:
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'default' | 'outline' | 'ghost' | 'nav';
  size?: 'compact' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  preventDoubleClick?: boolean;  // Default: true
  doubleClickDelay?: number;     // Default: 1000ms
  active?: boolean;              // For navigation tabs
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
```

**Usage Examples**:
```typescript
import { Button } from '../../infrastructure/components';

// Basic button
<Button onClick={handleSave}>Save</Button>

// Primary action button
<Button variant="primary" onClick={handleSubmit}>Submit</Button>

// Success button with icon
<Button variant="success" icon={<CheckIcon />}>
  Approve
</Button>

// Loading state
<Button loading={isSubmitting}>Submitting...</Button>

// Danger button
<Button variant="danger" onClick={handleDelete}>Delete</Button>

// Disable double-click protection (rare cases)
<Button preventDoubleClick={false} onClick={handleClick}>
  Click Me
</Button>

// Navigation tab button
<Button variant="nav" active={isActive} onClick={handleTabChange}>
  Tab Name
</Button>
```

**Do's**:
- ✅ Use `Button` for all clickable actions
- ✅ Use appropriate variant for semantic meaning
- ✅ Include loading states for async operations
- ✅ Use `preventDoubleClick` for actions that shouldn't repeat
- ✅ Use semantic variants (success, danger, warning)

**Don'ts**:
- ❌ Never create `<button>` elements directly
- ❌ Never use `<a>` tags for actions (use `Button` or `Link`)
- ❌ Never implement custom double-click protection
- ❌ Never use inline onClick handlers that skip Button component

#### Semantic Button Components

**Location**: `/frontend/src/infrastructure/components/SemanticButtons.tsx`

Pre-configured buttons for common actions:
```typescript
import {
  SaveButton,
  CancelButton,
  DeleteButton,
  ApproveButton,
  RejectButton,
  ConfirmButton,
  BackButton,
  CloseButton,
  // ... and more
} from '../../infrastructure/components';

// Usage
<SaveButton onClick={handleSave} />
<CancelButton onClick={handleCancel} />
<DeleteButton onClick={handleDelete} />
```

**Benefits**:
- Consistent styling for common actions
- Pre-configured variants and sizes
- Built-in double-click protection

### 2. Form Components

#### FormInput Component

**Location**: `/frontend/src/infrastructure/components/FormInput.tsx`

**Props**:
```typescript
interface FormInputProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  helperText?: string;
  fieldSize?: 'sm' | 'md' | 'lg';
  required?: boolean;
  type?: string;  // text, email, password, number, etc.
  placeholder?: string;
  disabled?: boolean;
}
```

**Usage Examples**:
```typescript
import { FormInput } from '../../infrastructure/components';

// Basic text input
<FormInput
  label="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// Required field
<FormInput
  label="Username"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  required
/>

// With error
<FormInput
  label="Password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  error={passwordError}
/>

// With helper text
<FormInput
  label="Serial Number"
  value={serialNumber}
  onChange={(e) => setSerialNumber(e.target.value)}
  helperText="Must be unique across all gauges"
/>

// Small size
<FormInput
  label="Code"
  value={code}
  onChange={(e) => setCode(e.target.value)}
  fieldSize="sm"
/>
```

#### FormCheckbox Component

**Location**: `/frontend/src/infrastructure/components/FormCheckbox.tsx`

**Usage Examples**:
```typescript
import { FormCheckbox } from '../../infrastructure/components';

<FormCheckbox
  label="I agree to the terms"
  checked={agreed}
  onChange={(e) => setAgreed(e.target.checked)}
/>

<FormCheckbox
  label="Active"
  checked={isActive}
  onChange={(e) => setIsActive(e.target.checked)}
  disabled={!canModify}
/>
```

#### FormTextarea Component

**Location**: `/frontend/src/infrastructure/components/FormTextarea.tsx`

**Usage Examples**:
```typescript
import { FormTextarea } from '../../infrastructure/components';

<FormTextarea
  label="Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={4}
/>

<FormTextarea
  label="Notes"
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  error={notesError}
  helperText="Optional notes about this item"
/>
```

#### FormSelect Component

**Location**: `/frontend/src/infrastructure/components/FormSelect.tsx`

**Usage Examples**:
```typescript
import { FormSelect } from '../../infrastructure/components';

<FormSelect
  label="Status"
  value={status}
  onChange={(e) => setStatus(e.target.value)}
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' }
  ]}
/>
```

#### FormSection Component

**Location**: `/frontend/src/infrastructure/components/FormSection.tsx`

**Purpose**: Creates consistent form sections with standardized headers.

**Props**:
```typescript
interface FormSectionProps {
  title: string;
  children: ReactNode;
}
```

**Usage Examples**:
```typescript
import { FormSection, FormInput } from '../../infrastructure/components';

<FormSection title="Basic Information">
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
    <FormInput label="Name" value={name} onChange={setName} />
    <FormInput label="Email" value={email} onChange={setEmail} />
    <FormInput label="Phone" value={phone} onChange={setPhone} />
  </div>
</FormSection>

<FormSection title="Address Details">
  <FormInput label="Street" value={street} onChange={setStreet} />
  <FormInput label="City" value={city} onChange={setCity} />
</FormSection>
```

**CSS Styling** (`FormSection.module.css`):
```css
.section {
  margin-bottom: var(--space-6);
}

.title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 2px solid var(--color-border-light);
}
```

**Do's**:
- ✅ Use `FormSection` for all form groupings
- ✅ Use consistent grid layouts within sections
- ✅ Use CSS variables for spacing

**Don'ts**:
- ❌ Never create manual section headers with inline styles
- ❌ Never use raw `<div>` with custom header styling
- ❌ Never bypass FormSection for form organization

### 3. Modal System

#### Modal Component

**Location**: `/frontend/src/infrastructure/components/Modal.tsx`

**Features**:
- Portal-based rendering
- Focus trapping
- Keyboard navigation (ESC to close)
- Backdrop click handling
- Z-index management for stacking
- Composition components (Header, Body, Actions, Tabs)

**Props**:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  className?: string;
  preventClosing?: boolean;
  noScroll?: boolean;
}
```

**Usage Examples**:
```typescript
import { Modal, Button } from '../../infrastructure/components';

// Basic modal
<Modal isOpen={isOpen} onClose={handleClose} title="Confirm Action">
  <Modal.Body>
    <p>Are you sure you want to proceed?</p>
  </Modal.Body>
  <Modal.Actions>
    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
    <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
  </Modal.Actions>
</Modal>

// Complex modal with tabs
<Modal isOpen={isOpen} onClose={handleClose} size="lg">
  <Modal.Header title="User Details" subtitle="Manage user information" />
  <Modal.Tabs>
    {/* Tab content */}
  </Modal.Tabs>
  <Modal.Body scrollable>
    {/* Form content */}
  </Modal.Body>
  <Modal.Actions alignment="right">
    <Button onClick={handleClose}>Cancel</Button>
    <Button variant="primary" onClick={handleSave}>Save</Button>
  </Modal.Actions>
</Modal>

// Prevent closing (for critical operations)
<Modal
  isOpen={isProcessing}
  onClose={handleClose}
  preventClosing={true}
  title="Processing..."
>
  <Modal.Body>
    <LoadingSpinner />
    <p>Please wait while we process your request...</p>
  </Modal.Body>
</Modal>
```

**Composition Components**:
```typescript
// Modal.Header
<Modal.Header
  title="Title"
  subtitle="Subtitle"
  actions={<Button>Action</Button>}
  onClose={handleClose}
/>

// Modal.Body
<Modal.Body padding={true} scrollable={true}>
  {children}
</Modal.Body>

// Modal.Actions
<Modal.Actions alignment="right" spacing="md">
  <Button>Cancel</Button>
  <Button variant="primary">Confirm</Button>
</Modal.Actions>

// Modal.Tabs
<Modal.Tabs>
  {/* Tab components */}
</Modal.Tabs>
```

**Do's**:
- ✅ Use `Modal` for all confirmations and dialogs
- ✅ Use composition components for consistent structure
- ✅ Always provide `onClose` handler
- ✅ Use appropriate size for content

**Don'ts**:
- ❌ Never use `window.confirm()` or `window.alert()`
- ❌ Never create custom modal implementations
- ❌ Never allow backdrop clicks to close critical modals

### 4. Data Display Components

#### DataTable Component

**Location**: `/frontend/src/infrastructure/components/DataTable.tsx`

**Features**:
- **Column Customization**: Drag-to-reorder, show/hide columns with backend API persistence
- **Sortable & Filterable**: Built-in column sorting and filtering
- **Row Interaction**: Click handlers with custom actions
- **Custom Cell Rendering**: Flexible render functions for complex content
- **Loading & Empty States**: Built-in state handling
- **Responsive Design**: Mobile-friendly layouts
- **External Controls**: Support for custom action button layouts
- **Search Integration**: Built-in search bar via `leftControls`

**Basic Usage**:
```typescript
import { DataTable } from '../../infrastructure/components';
import { useColumnManager } from '../../infrastructure/hooks';
import type { DataTableColumn } from '../../infrastructure/components';

const columns: DataTableColumn[] = [
  {
    id: 'name',
    label: 'NAME',
    visible: true,
    locked: true,  // Cannot be hidden or reordered
    align: 'left',
    sortable: true
  },
  {
    id: 'email',
    label: 'EMAIL',
    visible: true,
    align: 'left'
  },
  {
    id: 'role',
    label: 'ROLE',
    visible: true,
    align: 'center',
    render: (value) => <Badge>{value}</Badge>
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

// Create column manager for persistence
const columnManager = useColumnManager('user-table', columns);

<DataTable
  tableId="user-table"
  columns={columns}
  data={users}
  columnManager={columnManager}
  onRowClick={handleRowClick}
  itemsPerPage={50}
  emptyMessage="No users found"
/>
```

**With External Controls** (Standard Pattern):
```typescript
import { useRef } from 'react';

const dataTableResetRef = useRef<(() => void) | null>(null);
const columnManager = useColumnManager('my-table', columns);

return (
  <>
    {/* Action Buttons Row */}
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Button onClick={() => setShowAddModal(true)}>Add New</Button>

      {/* Column Controls */}
      {!columnManager.isEditMode ? (
        <Button onClick={() => columnManager.toggleEditMode()}>
          Columns
        </Button>
      ) : (
        <>
          <Button onClick={() => columnManager.toggleEditMode()}>Done</Button>
          <Button onClick={() => dataTableResetRef.current?.()}>
            Reset Columns
          </Button>
        </>
      )}
    </div>

    <DataTable
      tableId="my-table"
      columns={columns}
      data={data}
      columnManager={columnManager}
      disableColumnControls={true}
      externalEditMode={columnManager.isEditMode}
      onResetColumns={(resetFn) => { dataTableResetRef.current = resetFn; }}
      itemsPerPage={50}
    />
  </>
);
```

**Key Props**:
- `tableId` - Unique identifier for persistence (required)
- `columns` - Column definitions with render functions (required)
- `data` - Array of data objects (required)
- `columnManager` - Column state manager from `useColumnManager` (required)
- `onRowClick` - Row click handler
- `itemsPerPage` - Items per page (default: 50)
- `disableColumnControls` - Hide built-in column controls (for external controls)
- `externalEditMode` - Sync edit mode with external buttons
- `onResetColumns` - Callback to capture reset function
- `leftControls` - Custom controls in filter bar (e.g., search input)
- `emptyMessage` - Message when no data
- `resetKey` - Key to reset internal state (e.g., `location.pathname`)

**For detailed column customization patterns, see**: [Common Patterns - DataTable Column Persistence](./07-Common-Patterns.md#datatable-column-persistence-pattern)

#### Badge Component

**Location**: `/frontend/src/infrastructure/components/Badge.tsx`

**Usage Examples**:
```typescript
import { Badge } from '../../infrastructure/components';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Inactive</Badge>
```

#### Alert Component

**Location**: `/frontend/src/infrastructure/components/Alert.tsx`

**Usage Examples**:
```typescript
import { Alert } from '../../infrastructure/components';

<Alert type="info">Information message</Alert>
<Alert type="success">Operation successful!</Alert>
<Alert type="warning">Warning message</Alert>
<Alert type="error">Error occurred</Alert>
```

### 5. Navigation Components

#### Breadcrumb Component

**Location**: `/frontend/src/infrastructure/components/Breadcrumb.tsx`

**Usage Examples**:
```typescript
import { Breadcrumb } from '../../infrastructure/components';

<Breadcrumb
  items={[
    { label: 'Home', path: '/' },
    { label: 'Users', path: '/users' },
    { label: 'Edit User' }
  ]}
/>
```

### 6. Loading Components

#### LoadingSpinner Component

**Location**: `/frontend/src/infrastructure/components/LoadingSpinner.tsx`

**Usage Examples**:
```typescript
import { LoadingSpinner, LoadingOverlay } from '../../infrastructure/components';

// Inline spinner
<LoadingSpinner />

// Full-page overlay
<LoadingOverlay visible={isLoading} />
```

## Component Index

**Location**: `/frontend/src/infrastructure/components/index.ts`

All components are exported from the centralized index file:
```typescript
export { Button } from './Button';
export { Modal } from './Modal';
export { FormInput } from './FormInput';
export { FormCheckbox } from './FormCheckbox';
export { FormTextarea } from './FormTextarea';
export { FormSection } from './FormSection';
export { DataTable } from './DataTable';
// ... and many more
```

## Import Pattern

**Always import from the index**:
```typescript
import {
  Button,
  Modal,
  FormInput,
  FormCheckbox,
  DataTable,
  LoadingSpinner
} from '../../infrastructure/components';
```

## Common Mistakes

### ❌ Wrong: Creating Raw Elements
```typescript
<button onClick={handleClick}>Click me</button>
<input type="text" value={name} onChange={e => setName(e.target.value)} />
<textarea value={notes} onChange={e => setNotes(e.target.value)} />
```

### ✅ Correct: Using Infrastructure Components
```typescript
<Button onClick={handleClick}>Click me</Button>
<FormInput value={name} onChange={e => setName(e.target.value)} />
<FormTextarea value={notes} onChange={e => setNotes(e.target.value)} />
```

### ❌ Wrong: Custom Modal Implementation
```typescript
{showModal && (
  <div className="modal-backdrop">
    <div className="modal">
      {content}
    </div>
  </div>
)}
```

### ✅ Correct: Using Modal Component
```typescript
<Modal isOpen={showModal} onClose={handleClose}>
  <Modal.Body>{content}</Modal.Body>
</Modal>
```

### ❌ Wrong: Window Dialogs
```typescript
if (window.confirm('Are you sure?')) {
  handleDelete();
}
```

### ✅ Correct: Modal Component
```typescript
<Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)}>
  <Modal.Body>Are you sure?</Modal.Body>
  <Modal.Actions>
    <Button onClick={() => setShowConfirm(false)}>Cancel</Button>
    <Button variant="danger" onClick={handleDelete}>Delete</Button>
  </Modal.Actions>
</Modal>
```

## Real-World Examples

See actual usage in:
- `/frontend/src/modules/admin/pages/UserManagement.tsx`
- `/frontend/src/modules/gauge/pages/GaugeList.tsx`
- `/frontend/src/modules/inventory/pages/StorageLocationsPage.tsx`

## Related Documentation
- [State Management](./02-State-Management.md)
- [Styling Architecture](./03-Styling-Architecture.md)
- [Component Usage Examples](./05-Component-Usage-Examples.md)
