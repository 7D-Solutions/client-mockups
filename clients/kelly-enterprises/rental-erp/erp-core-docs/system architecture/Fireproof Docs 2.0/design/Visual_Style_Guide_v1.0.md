# Visual Style Guide v1.0

**Version:** 1.0  
**Date:** 2025-09-15  
**Purpose:** Infrastructure component usage patterns and examples for the Fireproof Gauge System

## ⚠️ CRITICAL: DO NOT IMPLEMENT CSS DIRECTLY

**This document provides usage patterns for infrastructure components only. All visual styling must use pre-built infrastructure components. Direct CSS implementation is prohibited.**

---

## Table of Contents
1. [Infrastructure Component Import Patterns](#1-infrastructure-component-import-patterns)
2. [Layout Components](#2-layout-components)
3. [Interactive Components](#3-interactive-components)
4. [Form Components](#4-form-components)
5. [Status & Feedback Components](#5-status--feedback-components)
6. [Modal Components](#6-modal-components)
7. [Card Components](#7-card-components)
8. [Component Composition Patterns](#8-component-composition-patterns)

---

## 1. Infrastructure Component Import Patterns

All components must be imported from the infrastructure components library:

```jsx
import { 
  Button, 
  Modal, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox,
  Badge,
  Tag,
  LoadingSpinner,
  MainLayout,
  Icon
} from '../../infrastructure/components';
```

---

## 2. Layout Components

### Main Application Layout
```jsx
import { MainLayout } from '../../infrastructure/components';

function App() {
  return (
    <MainLayout>
      {/* All page content goes here */}
      <div>Your application content</div>
    </MainLayout>
  );
}
```

### Page Structure with Cards
```jsx
import { Card, CardHeader, CardTitle, CardContent } from '../../infrastructure/components';

function DashboardPage() {
  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <Card>
        <CardHeader>
          <CardTitle>Gauge Management</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Page content */}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 3. Interactive Components

### Button Variants and Usage

```jsx
import { Button, Icon } from '../../infrastructure/components';

function ActionButtons() {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      {/* Primary Action */}
      <Button variant="primary" size="md">
        <Icon name="save" /> Save Changes
      </Button>
      
      {/* Success Action */}
      <Button variant="success" size="md">
        <Icon name="check-circle" /> Check In
      </Button>
      
      {/* Warning Action */}
      <Button variant="warning" size="md" disabled>
        <Icon name="clock" /> Pending
      </Button>
      
      {/* Danger Action */}
      <Button variant="danger" size="md">
        <Icon name="trash" /> Delete
      </Button>
      
      {/* Secondary/Cancel */}
      <Button variant="secondary" size="md">
        <Icon name="times" /> Cancel
      </Button>
    </div>
  );
}
```

### Button Sizes
```jsx
import { Button } from '../../infrastructure/components';

function ButtonSizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <Button variant="primary" size="xs">Extra Small</Button>
      <Button variant="primary" size="sm">Small</Button>
      <Button variant="primary" size="md">Medium</Button>
      <Button variant="primary" size="lg">Large</Button>
      <Button variant="primary" size="xl">Extra Large</Button>
    </div>
  );
}
```

### Loading States
```jsx
import { Button } from '../../infrastructure/components';

function LoadingButton({ isLoading }) {
  return (
    <Button 
      variant="primary" 
      size="md" 
      loading={isLoading}
      disabled={isLoading}
    >
      {isLoading ? 'Processing...' : 'Submit'}
    </Button>
  );
}
```

---

## 4. Form Components

### Standard Form Layout
```jsx
import { FormInput, FormSelect, FormTextarea, FormCheckbox } from '../../infrastructure/components';

function StandardForm() {
  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <FormInput
        label="Gauge ID"
        placeholder="Enter gauge ID"
        required
      />
      
      <FormSelect
        label="Location"
        options={[
          { value: '', label: 'Select location' },
          { value: 'shop-a', label: 'Shop A' },
          { value: 'shop-b', label: 'Shop B' }
        ]}
      />
      
      <FormTextarea
        label="Notes"
        placeholder="Add any notes..."
        rows={3}
      />
      
      <FormCheckbox
        label="Requires calibration"
        checked={false}
      />
    </form>
  );
}
```

### Form with Validation States
```jsx
import { FormInput } from '../../infrastructure/components';

function FormValidation() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Success state */}
      <FormInput
        label="Valid Field"
        value="Valid value"
        state="success"
      />
      
      {/* Error state */}
      <FormInput
        label="Invalid Field"
        value="Invalid value"
        state="error"
        error="This field contains an error"
      />
      
      {/* Warning state */}
      <FormInput
        label="Warning Field"
        value="Warning value"
        state="warning"
      />
    </div>
  );
}
```

---

## 5. Status & Feedback Components

### Status Tags
```jsx
import { Tag } from '../../infrastructure/components';

function StatusIndicators() {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
      <Tag variant="success">Available</Tag>
      <Tag variant="warning">Due Soon</Tag>
      <Tag variant="danger">Overdue</Tag>
      <Tag variant="info">Calibrating</Tag>
      <Tag variant="secondary">Inactive</Tag>
    </div>
  );
}
```

### Badge Usage
```jsx
import { Badge } from '../../infrastructure/components';

function BadgeExamples() {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <Badge variant="primary">New</Badge>
      <Badge variant="success">42</Badge>
      <Badge variant="warning">Pending</Badge>
      <Badge variant="danger">Critical</Badge>
    </div>
  );
}
```

### Loading States
```jsx
import { LoadingSpinner } from '../../infrastructure/components';

function LoadingExamples() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Inline loading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <LoadingSpinner size="sm" />
        <span>Loading...</span>
      </div>
      
      {/* Full loading overlay */}
      <div style={{ position: 'relative', padding: 'var(--space-8)' }}>
        <LoadingSpinner overlay />
        <div>Content being loaded...</div>
      </div>
    </div>
  );
}
```

---

## 6. Modal Components

### Basic Modal Pattern
```jsx
import { Modal, Button } from '../../infrastructure/components';

function BasicModal({ isOpen, onClose }) {
  return (
    <Modal 
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Gauge Information"
      size="md"
    >
      {/* Modal content */}
      <div style={{ padding: 'var(--space-4)' }}>
        <p>Modal content goes here</p>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 'var(--space-2)',
          marginTop: 'var(--space-4)'
        }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary">
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

### Modal with Form
```jsx
import { Modal, FormInput, FormSelect, Button } from '../../infrastructure/components';

function FormModal({ isOpen, onClose }) {
  return (
    <Modal 
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Gauge"
      size="lg"
    >
      <form style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormInput
            label="Gauge ID"
            placeholder="Enter unique gauge ID"
            required
          />
          
          <FormSelect
            label="Location"
            options={[
              { value: '', label: 'Select location' },
              { value: 'shop-a', label: 'Shop A' },
              { value: 'shop-b', label: 'Shop B' }
            ]}
            required
          />
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: 'var(--space-2)',
            marginTop: 'var(--space-6)'
          }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Gauge
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
```

### Modal Size Variations
```jsx
import { Modal } from '../../infrastructure/components';

// Small modal for confirmations
<Modal size="sm" title="Confirm Action">
  <p>Are you sure you want to delete this gauge?</p>
</Modal>

// Medium modal (default) for forms
<Modal size="md" title="Edit Gauge">
  {/* Standard form content */}
</Modal>

// Large modal for complex forms
<Modal size="lg" title="Advanced Settings">
  {/* Complex form content */}
</Modal>

// Extra large modal for detailed views
<Modal size="xl" title="Gauge Details">
  {/* Detailed content */}
</Modal>
```

---

## 7. Card Components

### Basic Card Usage
```jsx
import { Card, CardHeader, CardTitle, CardContent } from '../../infrastructure/components';

function BasicCard() {
  return (
    <Card size="default">
      <CardHeader>
        <CardTitle>Gauge Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Card content goes here</p>
      </CardContent>
    </Card>
  );
}
```

### Summary Cards Pattern
```jsx
import { Card, CardHeader, CardTitle, CardContent, Icon } from '../../infrastructure/components';

function SummaryCards({ stats }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 'var(--space-4)'
    }}>
      <Card size="compact">
        <CardContent>
          <div style={{ textAlign: 'center' }}>
            <Icon name="check-circle" size="lg" color="success" />
            <h3 style={{ margin: 'var(--space-2) 0', color: 'var(--color-primary)' }}>
              Current
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'bold' }}>
                {stats.current}
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                gauges
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card size="compact">
        <CardContent>
          <div style={{ textAlign: 'center' }}>
            <Icon name="clock" size="lg" color="warning" />
            <h3 style={{ margin: 'var(--space-2) 0', color: 'var(--color-primary)' }}>
              Due Soon
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'bold' }}>
                {stats.dueSoon}
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                gauges
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Interactive Card Pattern
```jsx
import { Card, CardContent, Button } from '../../infrastructure/components';

function InteractiveCard({ gauge, onEdit, onCheckout }) {
  return (
    <Card 
      size="default"
      style={{ 
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <CardContent>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: '0 0 var(--space-1)', color: 'var(--color-primary)' }}>
              {gauge.id}
            </h4>
            <p style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--font-size-sm)' }}>
              {gauge.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Icon name="map-marker" size="sm" />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>{gauge.location}</span>
              <Tag variant="success">Available</Tag>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            <Button variant="info" size="sm" onClick={() => onEdit(gauge)}>
              <Icon name="edit" /> Edit
            </Button>
            <Button variant="primary" size="sm" onClick={() => onCheckout(gauge)}>
              <Icon name="sign-out" /> Checkout
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 8. Component Composition Patterns

### Dashboard Layout Pattern
```jsx
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  FormInput, 
  FormSelect,
  Tag,
  LoadingSpinner
} from '../../infrastructure/components';

function DashboardLayout({ stats, gauges, isLoading }) {
  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)'
      }}>
        <SummaryCards stats={stats} />
      </div>
      
      {/* Main Content Card */}
      <Card size="default">
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <CardTitle>Gauge Inventory</CardTitle>
            <Button variant="primary">
              <Icon name="plus" /> Add New Gauge
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)'
          }}>
            <FormInput
              placeholder="Search gauges..."
              icon="search"
            />
            <FormSelect
              options={[
                { value: '', label: 'All Locations' },
                { value: 'shop-a', label: 'Shop A' },
                { value: 'shop-b', label: 'Shop B' }
              ]}
            />
            <FormSelect
              options={[
                { value: '', label: 'All Status' },
                { value: 'available', label: 'Available' },
                { value: 'checked-out', label: 'Checked Out' }
              ]}
            />
          </div>
          
          {/* Content */}
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {gauges.map(gauge => (
                <InteractiveCard 
                  key={gauge.id} 
                  gauge={gauge} 
                  onEdit={handleEdit}
                  onCheckout={handleCheckout}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Responsive Grid Pattern
```jsx
import { Card, CardContent } from '../../infrastructure/components';

function ResponsiveGrid({ items }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: 'var(--space-4)',
      padding: 'var(--space-4)'
    }}>
      {items.map(item => (
        <Card key={item.id} size="default">
          <CardContent>
            {/* Item content */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## Design Token Reference

### Spacing
- `var(--space-1)` - 0.25rem (4px)
- `var(--space-2)` - 0.5rem (8px)
- `var(--space-3)` - 0.75rem (12px)
- `var(--space-4)` - 1rem (16px)
- `var(--space-6)` - 1.5rem (24px)
- `var(--space-8)` - 2rem (32px)

### Colors
- `var(--color-primary)` - Primary brand color
- `var(--color-success)` - Success/positive actions
- `var(--color-warning)` - Warning/caution states
- `var(--color-danger)` - Error/danger states
- `var(--color-info)` - Information/neutral actions

### Typography
- `var(--font-size-sm)` - Small text
- `var(--font-size-base)` - Default text
- `var(--font-size-lg)` - Large text
- `var(--font-size-xl)` - Extra large text
- `var(--font-size-2xl)` - Heading text
- `var(--font-size-3xl)` - Large numbers/display

### Shadows
- `var(--shadow-sm)` - Subtle elevation
- `var(--shadow-md)` - Standard elevation
- `var(--shadow-lg)` - Prominent elevation
- `var(--shadow-xl)` - Maximum elevation

---

## Migration Guidelines

When migrating existing className-based components to infrastructure components:

1. **Identify the Component Pattern**: Match existing visual patterns to infrastructure components
2. **Replace className with Component Props**: Use variant, size, and state props instead of CSS classes
3. **Import Infrastructure Components**: Always import from `../../infrastructure/components`
4. **Use Design Tokens**: Replace hardcoded values with CSS custom properties
5. **Test All Variants**: Ensure all component states work correctly

### Example Migration

**Before (Prohibited):**
```jsx
<button className="save-btn primary large">
  <i className="fas fa-save"></i> Save
</button>
```

**After (Correct):**
```jsx
import { Button, Icon } from '../../infrastructure/components';

<Button variant="primary" size="lg">
  <Icon name="save" /> Save
</Button>
```

---

*For component implementation details, refer to infrastructure component specifications.*