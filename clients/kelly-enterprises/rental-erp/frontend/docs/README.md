# Frontend Documentation

Developer guides and references for the Fire-Proof ERP frontend application.

## Design System Documentation

### Spacing & Layout

**[SPACING-GUIDE.md](./SPACING-GUIDE.md)** - Complete spacing standardization guide
- CSS spacing variables reference (`--space-*`)
- Standard spacing patterns for components
- Modal container standards (16px padding)
- Form field spacing conventions
- Component size system
- ESLint enforcement rules
- Before/After examples

**Quick Reference - Standard Spacing Values:**
```css
--space-1:  4px   (minimal spacing)
--space-2:  8px   (small spacing, button icon gaps)
--space-3:  12px  (medium-small)
--space-4:  16px  (STANDARD - modals, cards, containers)
--space-6:  24px  (large spacing, section gaps)
--space-8:  32px  (very large spacing, page sections)
```

**Key Principle:** Use CSS spacing variables (`var(--space-*)`) for ALL spacing instead of hardcoded values.

### Design Tokens

**[TOKENS-REFERENCE.css](./TOKENS-REFERENCE.css)** - Complete CSS variables reference
- Spacing scale (base 4px system)
- Color palette and semantic colors
- Typography scale and font definitions
- Component sizing system
- Border radius values
- Shadow definitions
- Table system standards

**Active Implementation:** `/frontend/src/styles/tokens.css`

## Getting Started

1. **Spacing Standards:** Read [SPACING-GUIDE.md](./SPACING-GUIDE.md) before creating new components
2. **Design Tokens:** Reference [TOKENS-REFERENCE.css](./TOKENS-REFERENCE.css) for available CSS variables
3. **ESLint Compliance:** The `no-hardcoded-spacing` rule enforces spacing standards automatically

## Component Standards

### Modal Containers
```tsx
<div style={{
  padding: 'var(--space-4)',
  backgroundColor: 'var(--color-info-light-bg)',
  borderRadius: 'var(--radius-md)'
}}>
```

### Form Fields
- Container margin-bottom: `var(--space-4)` (16px)
- Label margin-bottom: `0.25rem` (4px)

### Form Sections
Use `FormSection` to organize form fields into logical groups with consistent styling:

```tsx
import { FormSection } from '../../infrastructure/components';

<FormSection title="Basic Information">
  <FormInput label="Name" value={name} onChange={setName} />
  <FormInput label="Email" value={email} onChange={setEmail} />
</FormSection>
```

**Benefits:**
- Consistent section spacing (`var(--space-6)` margin-bottom)
- Standardized title styling (uppercase, primary color, bordered)
- ESLint enforced via `prefer-form-section` rule

**Never do this:**
```tsx
{/* ❌ Manual section headers with inline styling */}
<div style={{
  textTransform: 'uppercase',
  borderBottom: '2px solid #ccc',
  fontWeight: 'bold'
}}>
  Basic Information
</div>
```

### Form Structure Best Practices

**CRITICAL:** Let infrastructure components handle their own spacing through CSS modules.

**✅ CORRECT Pattern** - Plain wrappers, components handle spacing:
```tsx
// HandToolForm.tsx (reference implementation)
return (
  <div>  {/* Plain wrapper - NO styling */}
    <FormSection title="Basic Information">  {/* Has margin-bottom: var(--space-6) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
        <FormInput label="Name" value={name} onChange={setName} />  {/* Has margin-bottom: 1rem */}
        <FormSelect label="Type" value={type} onChange={setType}>...</FormSelect>
        <FormTextarea label="Notes" value={notes} onChange={setNotes} />
      </div>
    </FormSection>
  </div>
);
```

**❌ INCORRECT Pattern** - Flex containers with gap properties cause double spacing:
```tsx
// DO NOT DO THIS - Causes double spacing
return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>  {/* ❌ Gap doubles FormSection spacing */}
    <FormSection title="Basic Information">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>  {/* ❌ Gap doubles FormInput spacing */}
        <FormInput label="Name" value={name} onChange={setName} />
        <FormTextarea label="Notes" value={notes} onChange={setNotes} />
      </div>
    </FormSection>
  </div>
);
```

**Why This Matters:**
- FormSection has `margin-bottom: var(--space-6)` (24px) built-in
- FormInput/FormTextarea have `margin-bottom: 1rem` (16px) built-in
- Adding `gap` to flex containers doubles the spacing on top of component spacing
- Result: 48px between sections instead of 24px, 32px between fields instead of 16px

**Grid Column Spacing:**
```tsx
// ✅ Grid gaps are ONLY for horizontal (column) spacing
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
  <FormInput />
  <FormInput />
  <FormInput />
</div>

// ✅ Full-width elements in grids must span all columns
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
  <FormInput />
  <FormInput />
  <FormInput />
  <div style={{ gridColumn: 'span 3' }}>
    <FormTextarea />  {/* Spans full width */}
  </div>
</div>
```

**Reference Implementation:** `/frontend/src/modules/gauge/components/creation/forms/HandToolForm.tsx`

### Buttons
- Icon-to-text gap: `var(--space-2)` (8px)
- Use component size system for padding

### Cards
- Compact variant: `var(--space-3)` padding
- Default variant: `var(--space-6)` padding
- Spacious variant: `var(--space-8)` padding

## Architecture

### Module Structure
```
/frontend/
├── docs/                    # Developer documentation (you are here)
├── src/
│   ├── infrastructure/      # Core components and utilities
│   │   ├── components/      # Centralized UI components
│   │   └── styles/          # Global styles and tokens
│   └── modules/             # Feature modules (gauge, admin, inventory)
```

### Centralized Components

**CRITICAL:** All UI elements MUST use centralized infrastructure components:
- `Button` - Never use raw `<button>` elements
- `FormInput`, `FormCheckbox`, `FormTextarea` - Never use raw form elements
- `FormSection` - Never use manual section headers with inline styling
- `Modal` - Never use `window.confirm()` or `window.alert()`
- Use `apiClient` - Never use direct `fetch()` calls

**Benefits:**
- Double-click protection
- Consistent styling
- Built-in accessibility
- Centralized auth handling
- Error management

## Contributing

When adding new components:

1. ✅ Use spacing variables from `tokens.css`
2. ✅ Follow established spacing patterns
3. ✅ Use centralized infrastructure components
4. ✅ Run ESLint before committing
5. ✅ Keep files under 300 lines (refactor if exceeded)

## Additional Resources

- **Main Docs:** `/erp-core-docs/system architecture/Fireproof Docs 2.0/`
- **Design System:** `Fireproof Docs 2.0/design/Design_System_v2.0.md`
- **Visual Style Guide:** `Fireproof Docs 2.0/design/Visual_Style_Guide_v1.0.md`

---

**Last Updated:** 2025-11-07 (Form spacing best practices added)
**Version:** 1.1
**Status:** Active and Enforced
