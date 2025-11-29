# Styling Architecture

**Version**: 1.0.0
**Last Updated**: 2025-11-07

## Overview

The Fire-Proof ERP Platform uses **CSS Modules** for component styling with a centralized design system based on CSS custom properties (variables). This architecture ensures consistent styling, prevents style conflicts, and maintains scalability.

## Core Principles

### 1. Centralized Styling
**All styling is centralized in infrastructure components.** Modules should not create custom CSS for common UI elements.

### 2. CSS Modules
Each component has its own CSS module file that:
- Scopes styles locally to prevent conflicts
- Uses descriptive class names
- References global CSS variables
- Follows consistent naming conventions

### 3. Design Tokens
Global design tokens (CSS variables) define:
- Colors
- Spacing
- Typography
- Shadows
- Border radius
- Transitions

## File Structure

```
/frontend/src/infrastructure/components/
├── Button.tsx
├── Button.module.css           # Button styles
├── FormInput.tsx
├── FormInput.module.css        # FormInput styles
├── FormSection.tsx
├── FormSection.module.css      # FormSection styles
├── Modal.tsx
└── Modal.module.css            # Modal styles (if exists)
```

## CSS Modules Pattern

### Component-Specific Styles

Each component imports its own CSS module:

```typescript
// Button.tsx
import styles from './Button.module.css';

export const Button = ({ variant, size, children, ...props }) => {
  const classes = `${styles.button} ${styles[variant]} ${styles[size]}`;

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};
```

### CSS Module Structure

```css
/* Button.module.css */

/* Base button styles */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-weight: 500;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* Size variants using shared component size system */
.compact {
  padding: var(--component-size-compact-padding-y) var(--component-size-compact-padding-x);
  font-size: var(--component-size-compact-font-size);
  min-height: var(--component-size-compact-min-height);
}

.medium {
  padding: var(--component-size-md-padding-y) var(--component-size-md-padding-x);
  font-size: var(--component-size-md-font-size);
  min-height: var(--component-size-md-min-height);
}

/* Color variants */
.primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.danger {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}
```

## Design Tokens (CSS Variables)

### Color System

```css
/* Primary colors */
--color-primary: #3b82f6;           /* Blue 500 */
--color-primary-light: #93c5fd;     /* Blue 300 */
--color-primary-dark: #1e40af;      /* Blue 800 */

/* Semantic colors */
--color-success: #10b981;           /* Green 500 */
--color-warning: #f59e0b;           /* Amber 500 */
--color-danger: #ef4444;            /* Red 500 */
--color-info: #3b82f6;              /* Blue 500 */

/* Text colors */
--color-text-primary: #1f2937;      /* Gray 800 */
--color-text-secondary: #6b7280;    /* Gray 500 */
--color-text-muted: #9ca3af;        /* Gray 400 */
--color-text-inverse: #ffffff;      /* White */

/* Background colors */
--color-bg-primary: #ffffff;        /* White */
--color-bg-secondary: #f9fafb;      /* Gray 50 */

/* Border colors */
--color-border-light: #e5e7eb;      /* Gray 200 */
--color-border: #d1d5db;            /* Gray 300 */
```

### Spacing System

```css
/* Spacing scale (based on 4px) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

### Typography System

```css
/* Font sizes */
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */

/* Font weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line heights */
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

### Component Size System

```css
/* Compact size (for dense layouts) */
--component-size-compact-padding-x: var(--space-2);
--component-size-compact-padding-y: var(--space-1);
--component-size-compact-font-size: var(--font-size-xs);
--component-size-compact-min-height: 24px;
--component-size-compact-line-height: 1;

/* Small size */
--component-size-sm-padding-x: var(--space-3);
--component-size-sm-padding-y: var(--space-2);
--component-size-sm-font-size: var(--font-size-sm);
--component-size-sm-min-height: 32px;

/* Medium size (default) */
--component-size-md-padding-x: var(--space-4);
--component-size-md-padding-y: var(--space-2);
--component-size-md-font-size: var(--font-size-base);
--component-size-md-min-height: 40px;

/* Large size */
--component-size-lg-padding-x: var(--space-5);
--component-size-lg-padding-y: var(--space-3);
--component-size-lg-font-size: var(--font-size-lg);
--component-size-lg-min-height: 48px;
```

### Shadows and Effects

```css
/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);

/* Border radius */
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */

/* Transitions */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
```

## Component Styling Examples

### Button Component

```css
/* Button.module.css */

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-weight: 500;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.button:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-bg-primary),
              0 0 0 4px currentColor;
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Size variants */
.compact {
  padding: var(--component-size-compact-padding-y)
           var(--component-size-compact-padding-x);
  font-size: var(--component-size-compact-font-size);
  min-height: var(--component-size-compact-min-height);
}

.medium {
  padding: var(--component-size-md-padding-y)
           var(--component-size-md-padding-x);
  font-size: var(--component-size-md-font-size);
  min-height: var(--component-size-md-min-height);
}

/* Color variants */
.primary {
  background-color: var(--color-primary);
  background-image: linear-gradient(135deg,
    var(--color-primary) 0%,
    var(--color-primary-dark) 100%);
  color: var(--color-text-inverse);
}

.primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.danger {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}
```

### FormSection Component

```css
/* FormSection.module.css */

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

### FormInput Component

```css
/* FormInput.module.css */

.container {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.required {
  color: var(--color-danger);
}

.input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  transition: border-color var(--transition-base);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.inputError {
  border-color: var(--color-danger);
}

.error {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}

.helperText {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
```

## Layout Patterns

### Grid Layouts

Use CSS Grid with CSS variables:

```tsx
<FormSection title="Basic Information">
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    columnGap: 'var(--space-4)',
    rowGap: 'var(--space-4)'
  }}>
    <FormInput label="Name" value={name} onChange={setName} />
    <FormInput label="Email" value={email} onChange={setEmail} />
    <FormInput label="Phone" value={phone} onChange={setPhone} />
  </div>
</FormSection>
```

### Flexbox Layouts

```tsx
<div style={{
  display: 'flex',
  gap: 'var(--space-3)',
  alignItems: 'center',
  justifyContent: 'space-between'
}}>
  <h2 style={{ margin: 0 }}>Page Title</h2>
  <Button variant="primary">Action</Button>
</div>
```

### Spacing

```tsx
// Vertical spacing
<div style={{ marginBottom: 'var(--space-6)' }}>
  <h2>Section Title</h2>
</div>

// Horizontal spacing
<div style={{
  display: 'flex',
  gap: 'var(--space-4)'
}}>
  <Button>Cancel</Button>
  <Button variant="primary">Save</Button>
</div>
```

## Responsive Design

### Breakpoint System

```css
/* Mobile first approach */
@media (min-width: 640px) {  /* sm */
  /* Tablet styles */
}

@media (min-width: 768px) {  /* md */
  /* Desktop styles */
}

@media (min-width: 1024px) { /* lg */
  /* Large desktop styles */
}

@media (min-width: 1280px) { /* xl */
  /* Extra large desktop styles */
}
```

### Responsive Grid Example

```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 'var(--space-4)'
}}>
  {/* Grid items auto-adjust based on available space */}
</div>
```

## Best Practices

### 1. Use CSS Variables

```css
/* ✅ Correct: Use CSS variables */
.button {
  padding: var(--space-3);
  color: var(--color-primary);
  border-radius: var(--radius-md);
}

/* ❌ Wrong: Hardcoded values */
.button {
  padding: 12px;
  color: #3b82f6;
  border-radius: 8px;
}
```

### 2. Component-Scoped Styles

```css
/* ✅ Correct: Scoped class names */
.button {
  /* Styles scoped to Button component */
}

/* ❌ Wrong: Global class names */
.btn {
  /* Could conflict with other components */
}
```

### 3. Consistent Naming

```css
/* ✅ Correct: Descriptive, consistent naming */
.button { }
.buttonPrimary { }
.buttonDisabled { }

/* ❌ Wrong: Inconsistent naming */
.btn { }
.btn-primary { }
.disabled-btn { }
```

### 4. Use Composition

```typescript
// ✅ Correct: Compose classes
const classes = `${styles.button} ${styles[variant]} ${styles[size]}`;

// ❌ Wrong: Conditional inline styles
style={{
  backgroundColor: variant === 'primary' ? '#3b82f6' : '#6c757d'
}}
```

### 5. Avoid Inline Styles for Common Patterns

```tsx
{/* ✅ Correct: Use CSS variables for layout */}
<div style={{ display: 'flex', gap: 'var(--space-4)' }}>

{/* ❌ Wrong: Hardcoded inline styles */}
<div style={{ display: 'flex', gap: '16px' }}>
```

### 6. Use FormSection for Sections

```tsx
{/* ✅ Correct: Use FormSection component */}
<FormSection title="Basic Information">
  <FormInput ... />
</FormSection>

{/* ❌ Wrong: Manual section styling */}
<div style={{
  textTransform: 'uppercase',
  borderBottom: '2px solid var(--color-border-light)',
  marginBottom: '12px'
}}>
  Basic Information
</div>
```

## Common Patterns

### Card Layout

```tsx
<div style={{
  backgroundColor: 'var(--color-bg-primary)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-6)',
  boxShadow: 'var(--shadow-md)'
}}>
  {/* Card content */}
</div>
```

### Form Layout

```tsx
<form>
  <FormSection title="Personal Information">
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 'var(--space-4)'
    }}>
      <FormInput label="First Name" ... />
      <FormInput label="Last Name" ... />
    </div>
  </FormSection>

  <FormSection title="Contact Details">
    <FormInput label="Email" ... />
    <FormInput label="Phone" ... />
  </FormSection>

  <div style={{
    display: 'flex',
    gap: 'var(--space-3)',
    justifyContent: 'flex-end',
    marginTop: 'var(--space-6)'
  }}>
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Save</Button>
  </div>
</form>
```

### Action Bar

```tsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--space-4)',
  backgroundColor: 'var(--color-bg-secondary)',
  borderRadius: 'var(--radius-md)',
  marginBottom: 'var(--space-6)'
}}>
  <h2 style={{ margin: 0 }}>Page Title</h2>
  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
    <Button variant="outline">Filter</Button>
    <Button variant="primary">Create</Button>
  </div>
</div>
```

## Module-Specific Styles

Modules can have their own CSS modules for page-specific layouts:

```
/frontend/src/modules/admin/pages/
├── UserManagement.tsx
└── UserManagement.module.css
```

```css
/* UserManagement.module.css */

.container {
  padding: var(--space-6);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}

.tableContainer {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-md);
}
```

## Common Mistakes

### ❌ Wrong: Hardcoded Values

```css
.button {
  padding: 12px 16px;
  color: #3b82f6;
  border-radius: 8px;
  margin-bottom: 24px;
}
```

### ✅ Correct: CSS Variables

```css
.button {
  padding: var(--space-3) var(--space-4);
  color: var(--color-primary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-6);
}
```

### ❌ Wrong: Global Styles

```css
/* Global.css */
button {
  /* Affects ALL buttons, including third-party components */
}
```

### ✅ Correct: Component Styles

```css
/* Button.module.css */
.button {
  /* Only affects Button component */
}
```

## Related Documentation
- [UI Components System](./01-UI-Components-System.md)
- [Component Usage Examples](./05-Component-Usage-Examples.md)
- [Migration Guide](./06-Migration-Guide.md)
