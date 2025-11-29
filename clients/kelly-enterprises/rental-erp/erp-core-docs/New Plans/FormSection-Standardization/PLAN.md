# FormSection Standardization Plan

**Status**: Phase 1 Complete (HandToolForm)
**Started**: 2025-11-07
**Target Completion**: TBD

## Objective

Standardize all form sections across the platform to use the centralized `FormSection` component, ensuring consistent spacing, styling, and maintainability.

## What is FormSection?

A reusable infrastructure component that provides:
- **Consistent spacing**: `var(--space-6)` (24px) between sections
- **Standardized headers**: Uppercase, primary color, bottom border
- **Flexible content**: Accepts any child elements (grids, inputs, custom layouts)
- **CSS variables**: All styling uses platform tokens

## Implementation Strategy

### Phase 1: Foundation ✅ COMPLETE
1. Create FormSection component
2. Create FormSection.module.css with standard styling
3. Export from infrastructure components index
4. Apply to HandToolForm as proof of concept
5. Create ESLint rule to enforce usage
6. Update CLAUDE.md documentation

### Phase 2: Gauge Creation Forms
Apply FormSection to all gauge creation forms:
- CalibrationStandardForm
- ThreadGaugeForm
- LargeEquipmentForm
- OtherMeasuringDeviceForm (if exists)

### Phase 3: Gauge Management Forms
Apply FormSection to gauge edit/update forms:
- Edit forms for each gauge type
- Calibration forms
- Transfer/checkout forms

### Phase 4: Platform-Wide Rollout
Apply FormSection to all other modules:
- Admin module forms
- User management forms
- Inventory forms
- Any other forms with section headers

### Phase 5: Cleanup & Validation
1. Run platform-wide lint check
2. Fix any violations detected by `prefer-form-section` rule
3. Remove deprecated section styling patterns
4. Update any remaining documentation

## Technical Requirements

### Before Migration
- Read existing form to understand current layout
- Note any custom spacing requirements
- Identify section headers (text-transform: uppercase, border-bottom)

### During Migration
1. Import FormSection: `import { FormSection } from '../../infrastructure/components'`
2. Wrap each section:
   ```tsx
   <FormSection title="Section Title">
     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 'var(--space-4)' }}>
       {/* Form fields */}
     </div>
   </FormSection>
   ```
3. Remove manual section headers
4. Remove custom spacing (let FormSection handle it)
5. Keep internal layout (grids, columns) intact

### After Migration
- Test form in browser (hot reload should work)
- Verify spacing matches design
- Run ESLint to confirm no violations
- Verify no console errors

## ESLint Enforcement

The `infrastructure/prefer-form-section` rule will:
- Detect manual section headers with inline styles
- Report error when: `textTransform: uppercase` + `borderBottom` + `fontWeight: bold`
- Force developers to use FormSection component

## Benefits

1. **Consistency**: All sections look and feel the same
2. **Maintainability**: Single source of truth for section styling
3. **Efficiency**: No need to copy/paste section styles
4. **Enforcement**: ESLint prevents manual styling
5. **Flexibility**: Internal layout remains customizable

## Success Criteria

- [ ] All gauge creation forms use FormSection
- [ ] All gauge management forms use FormSection
- [ ] All platform forms use FormSection
- [ ] Zero ESLint violations for `prefer-form-section`
- [ ] Consistent 24px spacing between all sections
- [ ] No manual section headers remain in codebase

## Notes

- FormSection does NOT dictate internal layout (keep 3-column grids, etc.)
- Only handles section container, title, and spacing
- Uses CSS modules for scoped styling
- All values use CSS variables from tokens.css
