# Spacing Standardization Guide

**Status**: ✅ Implemented and Enforced
**Last Updated**: 2025-11-07 (Form layout patterns added)
**Applies To**: All frontend components (modals, containers, forms)

---

## Overview

This project enforces **consistent spacing** across the entire Fire-Proof ERP platform using **CSS custom properties** (`--space-*` variables).

**Goals Achieved**:
- ✅ Platform-wide 16px (space-4) standard for modal containers
- ✅ ESLint enforcement prevents hardcoded spacing
- ✅ Consistent padding/margin across 14+ modals
- ✅ Single source of truth for spacing values

---

## Spacing Scale

Use these CSS variables for **all** spacing (padding, margin, gap):

| Variable | Value | Usage |
|----------|-------|-------|
| `var(--space-0)` | 2px | Minimal spacing, tight layouts |
| `var(--space-1)` | 4px | Very small gaps, inline spacing |
| `var(--space-2)` | 8px | Small spacing, list items |
| `var(--space-3)` | 12px | Medium-small spacing |
| `var(--space-4)` | 16px | **Standard container padding** (modals, cards, boxes) |
| `var(--space-5)` | 20px | Medium spacing |
| `var(--space-6)` | 24px | Large spacing, section gaps |
| `var(--space-7)` | 32px | Extra large spacing |
| `var(--space-8)` | 48px | Very large spacing, page sections |
| `var(--space-9)` | 64px | Maximum spacing, hero sections |

---

## Standard Patterns

### Modal Container Padding

**Standard**: `var(--space-4)` (16px)

```tsx
// ✅ CORRECT
<div style={{
  padding: 'var(--space-4)',
  backgroundColor: 'var(--color-info-light-bg)',
  borderRadius: 'var(--radius-md)'
}}>
  Content here
</div>

// ❌ WRONG - Hardcoded
<div style={{
  padding: '16px',  // ESLint error
  backgroundColor: 'var(--color-info-light-bg)'
}}>
  Content here
</div>

// ❌ WRONG - Inconsistent
<div style={{
  padding: 'var(--space-3)',  // Too small for containers
  backgroundColor: 'var(--color-info-light-bg)'
}}>
  Content here
</div>
```

### Modal.Body (Infrastructure)

Modal.Body has **symmetric padding** by default:

```tsx
// ✅ CORRECT - Uses Modal.Body default padding
<Modal.Body>
  <div>Content with proper padding</div>
</Modal.Body>

// ✅ CORRECT - Custom content needs custom padding
<div style={{
  padding: 'var(--space-4)',
  backgroundColor: 'var(--color-warning-light)'
}}>
  Custom styled content
</div>
```

### Error/Warning Boxes

**Standard**: `var(--space-4)` padding

```tsx
// ✅ CORRECT
{error && (
  <div style={{
    backgroundColor: 'var(--color-danger-light-bg)',
    border: '1px solid var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)'
  }}>
    {error}
  </div>
)}

// ❌ WRONG - Inconsistent padding
{error && (
  <div style={{
    padding: 'var(--space-3)',  // Too small
    marginBottom: 'var(--space-4)'
  }}>
    {error}
  </div>
)}
```

### Info Cards & Notices

**Standard**: `var(--space-4)` padding

```tsx
// ✅ CORRECT
<div style={{
  backgroundColor: 'var(--color-info-light-bg)',
  padding: 'var(--space-4)',
  borderRadius: 'var(--radius-md)',
  marginBottom: 'var(--space-4)'
}}>
  <p>Information message</p>
</div>
```

### Interactive Elements (Radio Buttons, Checkboxes)

**Standard**: `var(--space-4)` padding for containers

```tsx
// ✅ CORRECT
<div
  onClick={handleSelect}
  style={{
    padding: 'var(--space-4)',
    border: '2px solid var(--color-border-default)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer'
  }}
>
  <div>Option content</div>
</div>
```

---

## ESLint Enforcement

### The Rule

ESLint will **warn** when you use hardcoded spacing:

```tsx
// ❌ ESLint Warning
<div style={{ padding: '16px' }}>
// Warning: Use CSS spacing variables (var(--space-*)) instead of hardcoded spacing.
// For 16px, use var(--space-4)
```

### How to Fix

Replace hardcoded values with CSS variables:

```tsx
// Before (ESLint warning)
<div style={{ padding: '16px', margin: '8px 12px' }}>

// After (ESLint passes)
<div style={{ padding: 'var(--space-4)', margin: 'var(--space-2) var(--space-3)' }}>
```

### Exceptions

Infrastructure components (`src/infrastructure/components/`) are **exempt** from this rule to allow core implementation flexibility.

---

## Migration Examples

### Before (Inconsistent)

```tsx
// Multiple inconsistent spacing values
<div style={{ padding: '12px' }}>           // space-3
  <div style={{ padding: '16px' }}>         // space-4
    <div style={{ padding: '8px 16px' }}>   // mixed
      Content
    </div>
  </div>
</div>
```

### After (Consistent)

```tsx
// Standardized to space-4 for containers
<div style={{ padding: 'var(--space-4)' }}>
  <div style={{ padding: 'var(--space-4)' }}>
    <div style={{ padding: 'var(--space-2) var(--space-4)' }}>
      Content
    </div>
  </div>
</div>
```

---

## Quick Reference

### Common Patterns

| Element Type | Padding | Margin Bottom |
|--------------|---------|---------------|
| Modal container boxes | `var(--space-4)` | `var(--space-4)` |
| Error/Warning alerts | `var(--space-4)` | `var(--space-4)` |
| Info cards | `var(--space-4)` | `var(--space-4)` |
| Step indicators | `var(--space-4)` | N/A |
| Radio/Checkbox containers | `var(--space-4)` | N/A |
| Form field spacing | N/A | `var(--space-4)` |
| Section dividers | N/A | `var(--space-6)` |

### When to Use Each Size

- **space-1, space-2**: Inline spacing, icon gaps, small elements
- **space-3**: ~~Old standard~~ (deprecated for containers)
- **space-4**: **Standard for all containers** (modals, cards, boxes)
- **space-5, space-6**: Section gaps, large spacing between groups
- **space-7+**: Page-level spacing, hero sections

---

## Form Layout Patterns

### Form Components Handle Their Own Spacing

**Critical Principle:** Infrastructure components (FormSection, FormInput, FormTextarea) have built-in spacing via CSS modules. **DO NOT** add flex/gap containers around them.

### Component Built-In Spacing

| Component | Built-In Spacing | Purpose |
|-----------|------------------|---------|
| FormSection | `margin-bottom: var(--space-6)` (24px) | Spacing between sections |
| FormInput | `margin-bottom: 1rem` (16px) | Spacing between fields |
| FormTextarea | `margin-bottom: 1rem` (16px) | Spacing between fields |
| FormSelect | `margin-bottom: 1rem` (16px) | Spacing between fields |
| FormCheckbox | `margin-bottom: 1rem` (16px) | Spacing between fields |

### ✅ CORRECT - Let Components Handle Spacing

```tsx
// Plain wrapper with NO styling - components handle their own spacing
return (
  <div>
    <FormSection title="Basic Information">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
        <FormInput label="Name" value={name} onChange={setName} />
        <FormInput label="Email" value={email} onChange={setEmail} />
        <FormSelect label="Type" value={type} onChange={setType}>...</FormSelect>
      </div>
    </FormSection>

    <FormSection title="Details">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
        <FormInput label="Description" value={desc} onChange={setDesc} />
        <div style={{ gridColumn: 'span 3' }}>
          <FormTextarea label="Notes" value={notes} onChange={setNotes} />
        </div>
      </div>
    </FormSection>
  </div>
);
```

**Result:**
- 24px between sections (from FormSection.margin-bottom)
- 16px between fields (from FormInput/FormTextarea.margin-bottom)
- 16px horizontal gap between grid columns (from columnGap)

### ❌ INCORRECT - Flex Containers with Gap (Double Spacing)

```tsx
// DO NOT DO THIS - Causes double spacing
return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
    <FormSection title="Basic Information">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <FormInput label="Name" value={name} onChange={setName} />
        <FormTextarea label="Notes" value={notes} onChange={setNotes} />
      </div>
    </FormSection>
  </div>
);
```

**Problem:**
- Outer gap (24px) + FormSection.margin-bottom (24px) = **48px between sections** ❌
- Inner gap (16px) + FormInput.margin-bottom (16px) = **32px between fields** ❌

### Grid Column Spacing

**Grid gaps are ONLY for horizontal (column) spacing:**

```tsx
// ✅ CORRECT - columnGap for horizontal spacing only
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  columnGap: 'var(--space-4)'  // Horizontal spacing between columns
}}>
  <FormInput />
  <FormInput />
  <FormInput />
</div>

// ❌ WRONG - rowGap causes double vertical spacing
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  columnGap: 'var(--space-4)',
  rowGap: 'var(--space-4)'  // ❌ Doubles FormInput.margin-bottom
}}>
  <FormInput />
  <FormInput />
  <FormInput />
</div>

// ❌ WRONG - gap shorthand includes both column and row
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 'var(--space-4)'  // ❌ Applies to both columns AND rows
}}>
  <FormInput />
  <FormInput />
  <FormInput />
</div>
```

### Full-Width Elements in Grids

```tsx
// ✅ CORRECT - Span full width for textareas in 3-column grids
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
  <FormInput label="Field 1" />
  <FormInput label="Field 2" />
  <FormInput label="Field 3" />

  <div style={{ gridColumn: 'span 3' }}>
    <FormTextarea label="Notes" rows={3} />
  </div>
</div>
```

### Reference Implementation

See `/frontend/src/modules/gauge/components/creation/forms/HandToolForm.tsx` for the standardized pattern.

---

## Implementation Status

### ✅ Completed

- Modal.Body symmetric padding fix
- 14 modals standardized to space-4
- ESLint rule enforcement active
- Build/lint verification passed

### Files Updated

**Infrastructure:**
- Modal.tsx
- ChangePasswordModal.tsx
- PasswordModal.tsx
- RejectModal.tsx

**Admin Module:**
- AddUserModal.tsx
- PermissionManagementModal.tsx
- ResetPasswordModal.tsx
- UserDetailsModal.tsx

**Gauge Module:**
- ReviewModal.tsx
- TransferModal.tsx
- ReplaceGaugeModal.tsx
- OutOfServiceReviewModal.tsx
- UnsealConfirmModal.tsx
- UnpairSetModal.tsx

**Inventory Module:**
- BulkAddLocationsModal.tsx

---

## FAQ

### Why var(--space-4) for containers?

16px provides optimal readability and touch target sizing. It's the platform standard.

### Can I use space-3 for containers?

No. Use `var(--space-4)` for all container padding. ESLint will warn about hardcoded values, but won't prevent space-3 usage (yet).

### What about asymmetric padding?

Use space values for each side:
```tsx
padding: 'var(--space-2) var(--space-4)'  // 8px vertical, 16px horizontal
```

### How do I check my spacing?

Run ESLint:
```bash
npm run lint
```

Warnings will show hardcoded spacing that should be converted to CSS variables.

---

## Next Steps

1. **Review remaining modals** - Verify all 26-27 modals follow standards
2. **Add size enforcement** - Consider ESLint rule for modal sizes (sm/md/lg/xl)
3. **Expand to other components** - Apply spacing standards to pages, forms, cards

---

## Resources

- **CSS Variables**: `/frontend/src/index.css` (root spacing definitions)
- **ESLint Config**: `/frontend/eslint.config.js` (no-hardcoded-spacing rule)
- **Modal Component**: `/frontend/src/infrastructure/components/Modal.tsx`
