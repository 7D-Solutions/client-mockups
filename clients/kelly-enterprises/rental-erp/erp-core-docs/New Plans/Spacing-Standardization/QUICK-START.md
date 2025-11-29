# Quick Start Guide - Spacing Standardization

**Time to First Implementation**: 15 minutes

## Step 1: Create Spacing Config (5 minutes)

Create file: `/frontend/src/infrastructure/config/spacing.ts`

```typescript
/**
 * Centralized spacing configuration for Fire-Proof ERP platform
 *
 * This file defines standard spacing patterns for all components.
 * All values reference CSS design tokens from /frontend/src/styles/tokens.css
 *
 * Usage:
 *   import { SPACING_CONFIG } from '../config/spacing';
 *   <div style={{ padding: SPACING_CONFIG.modal.bodyPadding }}>
 */

export const SPACING_CONFIG = {
  /**
   * Modal component spacing
   */
  modal: {
    // Header padding: 16px vertical, 24px horizontal
    headerPadding: 'var(--space-4) var(--space-6)',

    // Body padding: 16px vertical, 24px horizontal
    bodyPadding: 'var(--space-4) var(--space-6)',

    // Actions (footer) padding: 0 top, 24px horizontal, 16px bottom
    actionsPadding: '0 var(--space-6) var(--space-4)',

    // Gap between action buttons: 12px
    buttonGap: 'var(--space-3)',

    // Standard modal widths
    sizes: {
      sm: '384px',   // Simple confirmations, alerts
      md: '448px',   // Standard forms (DEFAULT)
      lg: '672px',   // Complex forms, detailed content
      xl: '896px',   // Multi-column layouts, rich content
    },
  },

  /**
   * Form component spacing
   */
  form: {
    // Bottom margin for inputs: 16px
    inputBottomMargin: 'var(--space-4)',

    // Internal input padding: 8px vertical, 12px horizontal
    inputPadding: 'var(--space-2) var(--space-3)',

    // Label bottom margin: 4px
    labelBottomMargin: 'var(--space-1)',

    // Hint text top margin: 4px
    hintTopMargin: 'var(--space-1)',

    // Hint text bottom margin: 16px
    hintBottomMargin: 'var(--space-4)',

    // Error message top margin: 4px
    errorTopMargin: 'var(--space-1)',
  },

  /**
   * Button component spacing
   */
  button: {
    // Padding by size
    padding: {
      compact: 'var(--space-1) var(--space-2)',   // 4px 8px
      sm: 'var(--space-1) var(--space-3)',        // 4px 12px
      md: 'var(--space-2) var(--space-4)',        // 8px 16px
      lg: 'var(--space-3) var(--space-6)',        // 12px 24px
      xl: 'var(--space-4) var(--space-8)',        // 16px 32px
    },

    // Gap between icon and text: 8px
    iconTextGap: 'var(--space-2)',
  },

  /**
   * Page layout spacing
   */
  page: {
    // Container padding: 24px
    containerPadding: 'var(--space-6)',

    // Gap between sections: 32px
    sectionGap: 'var(--space-8)',

    // Card internal padding: 16px
    cardPadding: 'var(--space-4)',

    // Header bottom margin: 24px
    headerBottomMargin: 'var(--space-6)',
  },
} as const;

/**
 * Type exports for TypeScript safety
 */
export type ModalSize = keyof typeof SPACING_CONFIG.modal.sizes;
export type ButtonSize = keyof typeof SPACING_CONFIG.button.padding;

/**
 * Helper function to get modal size value
 */
export const getModalSize = (size: ModalSize = 'md'): string => {
  return SPACING_CONFIG.modal.sizes[size];
};

/**
 * Helper function to get button padding
 */
export const getButtonPadding = (size: ButtonSize = 'md'): string => {
  return SPACING_CONFIG.button.padding[size];
};
```

**Save and commit**:
```bash
git add frontend/src/infrastructure/config/spacing.ts
git commit -m "feat: Add centralized spacing configuration"
```

---

## Step 2: Test the Config (2 minutes)

Verify it compiles:
```bash
cd frontend
npm run build
```

If no errors, proceed to Step 3.

---

## Step 3: Refactor Modal Component (8 minutes)

Edit: `/frontend/src/infrastructure/components/Modal.tsx`

### Change 1: Add Import (Line 12)
```typescript
import { SPACING_CONFIG } from '../config/spacing';
```

### Change 2: Replace Hardcoded Sizes (Line 121)
**Find**:
```typescript
maxWidth: size === 'sm' ? '384px' : size === 'md' ? '448px' : size === 'lg' ? '672px' : '896px',
```

**Replace with**:
```typescript
maxWidth: SPACING_CONFIG.modal.sizes[size],
```

### Change 3: Fix Body Padding (Line 254)
**Find**:
```typescript
padding: padding ? 'var(--space-2) var(--space-6) var(--space-4) var(--space-6)' : 0
```

**Replace with**:
```typescript
padding: padding ? SPACING_CONFIG.modal.bodyPadding : 0
```

**Save and commit**:
```bash
git add frontend/src/infrastructure/components/Modal.tsx
git commit -m "refactor: Update Modal to use centralized spacing config"
```

---

## Step 4: Test Everything (5 minutes)

1. **Restart frontend**:
```bash
docker-compose restart frontend
```

2. **Test modals**:
   - Open AddUserModal at http://localhost:3001/admin/users
   - Click "Add User"
   - Verify spacing looks correct
   - Check Step 1 (md) and Step 2 (xl) sizes

3. **Visual checks**:
   - Header to body spacing: ~16px
   - Action button gaps: ~12px
   - Modal widths match expected sizes

If all looks good, **you've successfully implemented Phase 1!** 🎉

---

## Next Steps

Continue with Phase 2 in the full `IMPLEMENTATION-PLAN.md`:
- Phase 2: Form Components
- Phase 3: Button Component
- Phase 4: Modal Migration

Update `PROGRESS.md` as you complete each phase.

---

## Troubleshooting

### Build Errors
- Check spacing.ts for syntax errors
- Verify all imports are correct
- Run `npm run lint` to catch issues

### Visual Regressions
- Compare before/after screenshots
- Check browser console for errors
- Verify CSS tokens exist in tokens.css

### TypeScript Errors
- Check type exports in spacing.ts
- Verify ModalSize type is imported correctly
- Run `npm run type-check`

---

## Need Help?

Refer to the full `IMPLEMENTATION-PLAN.md` for:
- Detailed explanations
- Rollback procedures
- Complete file reference
- Testing strategies
