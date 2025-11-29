# FormSection Standardization

**Created**: 2025-11-07
**Status**: Phase 1 Complete

## Overview

This plan tracks the rollout of the `FormSection` infrastructure component across all forms in the platform. The goal is to ensure consistent section spacing, styling, and maintainability.

## Quick Links

- **[PLAN.md](./PLAN.md)** - Detailed implementation plan with strategy and technical requirements
- **[TRACKER.md](./TRACKER.md)** - Progress tracker showing completion status for all forms

## What's Been Done

✅ **Phase 1 Complete**:
- FormSection component created and exported
- Applied to HandToolForm (5 sections, 3-column grids)
- ESLint rule `infrastructure/prefer-form-section` enforces usage
- CLAUDE.md updated with documentation

## What It Looks Like

```tsx
<FormSection title="Basic Information">
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
    <FormInput label="Name" value={name} onChange={setName} />
    <FormInput label="Email" value={email} onChange={setEmail} />
  </div>
</FormSection>
```

## Key Benefits

- ✅ Consistent 24px spacing between sections
- ✅ Standardized section header styling
- ✅ Single source of truth for section design
- ✅ ESLint enforcement prevents manual styling
- ✅ Flexible internal layout (grids, columns remain customizable)

## Next Steps

1. Test HandToolForm in browser
2. Apply to CalibrationStandardForm
3. Continue through Phase 2 (gauge creation forms)
4. Expand to all platform forms

## Reference Implementation

**File**: `/frontend/src/modules/gauge/components/creation/forms/HandToolForm.tsx`

This form serves as the reference for how to properly use FormSection with 3-column grid layouts.
