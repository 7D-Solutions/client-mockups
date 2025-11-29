# ESLint Business Logic Enforcement Rules

**Category**: Code Quality Standards
**Purpose**: Enforce usage of centralized business rule classes
**Severity**: Error
**Last Updated**: 2025-11-07

---

## Overview

Fire-Proof ERP enforces business logic centralization through ESLint rules. All business logic must use centralized rule classes instead of inline comparisons or string manipulation.

**Why This Matters**:
- **Consistency**: Same logic everywhere
- **Maintainability**: Change business rules in one place
- **Type Safety**: Centralized methods with proper types
- **Testing**: Test business logic independently
- **Documentation**: Business rules self-documented in rule classes

---

## Business Rule Classes

### Location
`/frontend/src/infrastructure/business/`

### Available Classes
1. **StatusRules** - Equipment and calibration status logic
2. **EquipmentRules** - Equipment type and ownership logic
3. **TextFormatRules** - Text formatting and display logic
4. **PermissionRules** - User permissions and role logic

---

## StatusRules Enforcement

### Status Comparison Rules

#### ❌ Direct Comparisons (Forbidden)
```javascript
// WRONG - Direct status comparison
if (gauge.status === 'checked_out') {
  // ...
}

if (gauge.status === 'available') {
  // ...
}

if (gauge.status === 'out_of_service') {
  // ...
}
```

#### ✅ StatusRules Methods (Required)
```javascript
// CORRECT - Use StatusRules
import { StatusRules } from '../../infrastructure/business/StatusRules';

if (StatusRules.isCheckedOut(gauge.status)) {
  // ...
}

if (StatusRules.isAvailable(gauge.status)) {
  // ...
}

if (StatusRules.isOutOfService(gauge.status)) {
  // ...
}
```

### Available StatusRules Methods

```typescript
// Status checks
StatusRules.isCheckedOut(status)
StatusRules.isAvailable(status)
StatusRules.isOutOfService(status)
StatusRules.isPendingQC(status)
StatusRules.isInMaintenance(status)

// Calibration status
StatusRules.isCalibrationExpired(calibrationStatus)
StatusRules.isCalibrationDueSoon(calibrationStatus)

// Badge variants (for UI display)
StatusRules.getStatusBadgeVariant(status)
StatusRules.getCalibrationBadgeVariant(calibrationStatus)

// Sealing status
StatusRules.isSealed(gauge)
StatusRules.hasPendingUnsealRequest(gauge)
```

### Calibration Status Rules

#### ❌ Wrong
```javascript
if (gauge.calibration_status === 'Expired') { /* ... */ }
if (gauge.calibration_status === 'Due Soon') { /* ... */ }

// Badge variant ternary
const variant = gauge.calibration_status === 'Expired' ? 'danger' : 'success';
```

#### ✅ Correct
```javascript
if (StatusRules.isCalibrationExpired(gauge.calibration_status)) { /* ... */ }
if (StatusRules.isCalibrationDueSoon(gauge.calibration_status)) { /* ... */ }

// Badge variant
const variant = StatusRules.getCalibrationBadgeVariant(gauge.calibration_status);
```

### Sealing Status Rules

#### ❌ Wrong
```javascript
if (gauge.is_sealed === 1 || gauge.is_sealed === true) { /* ... */ }
if (gauge.has_pending_unseal_request === 1 || gauge.has_pending_unseal_request === true) { /* ... */ }
```

#### ✅ Correct
```javascript
if (StatusRules.isSealed(gauge)) { /* ... */ }
if (StatusRules.hasPendingUnsealRequest(gauge)) { /* ... */ }
```

---

## EquipmentRules Enforcement

### Display Name Formatting

#### ❌ Wrong
```javascript
// Direct string replacement
const displayName = equipmentType.replace(/_/g, ' ');
```

#### ✅ Correct
```javascript
import { EquipmentRules } from '../../infrastructure/business/EquipmentRules';

const displayName = EquipmentRules.getDisplayName(equipmentType);
```

### Equipment Type Checks

#### ❌ Wrong
```javascript
// Direct equipment_type comparison
if (gauge.equipment_type === 'fire_extinguisher') {
  // ...
}
```

#### ✅ Correct
```javascript
// Use EquipmentRules business methods
if (EquipmentRules.isFireExtinguisher(gauge.equipment_type)) {
  // ...
}
```

### Ownership Type Checks

#### ❌ Wrong
```javascript
// Direct ownership_type check
if (gauge.ownership_type === 'employee') {
  // Can be checked out
}
```

#### ✅ Correct
```javascript
if (EquipmentRules.canBeCheckedOut(gauge)) {
  // ...
}
```

---

## TextFormatRules Enforcement

### Underscore to Space Formatting

#### ❌ Wrong
```javascript
// Direct replace for underscores
const formatted = text.replace(/_/g, ' ');
```

#### ✅ Correct
```javascript
import { TextFormatRules } from '../../infrastructure/business/TextFormatRules';

const formatted = TextFormatRules.formatUnderscoreToSpace(text);
```

### Sentence Case Formatting

#### ❌ Wrong
```javascript
// Manual sentence case
const formatted = text.charAt(0).toUpperCase() + text.slice(1).replace(/_/g, ' ');
```

#### ✅ Correct
```javascript
const formatted = TextFormatRules.formatToSentenceCase(text);
```

### Title Case Formatting

#### ❌ Wrong
```javascript
// Manual title case
const formatted = text.replace(/\b\w/g, c => c.toUpperCase());
```

#### ✅ Correct
```javascript
const formatted = TextFormatRules.formatToTitleCase(text);
```

### Setting Key Formatting

#### ❌ Wrong
```javascript
// Manual setting key formatting
const formatted = settingKey.split('_').map(word =>
  word.charAt(0).toUpperCase() + word.slice(1)
).join(' ');
```

#### ✅ Correct
```javascript
const formatted = TextFormatRules.formatSettingKey(settingKey);
```

### Action Text Formatting

#### ❌ Wrong
```javascript
// Manual action text formatting
const formatted = action.charAt(0).toUpperCase() + action.slice(1);
```

#### ✅ Correct
```javascript
const formatted = TextFormatRules.formatActionText(action);
```

---

## PermissionRules Enforcement

### Admin Role Checks

#### ❌ Wrong
```javascript
// Direct role comparison
if (user.role === 'admin') { /* ... */ }
if (user.role === 'super_admin') { /* ... */ }

// Manual role checking
const isAdmin = userRoles.some(role => role === 'admin' || role === 'super_admin');
```

#### ✅ Correct
```javascript
import { PermissionRules } from '../../infrastructure/business/PermissionRules';

if (PermissionRules.isAdmin(user)) { /* ... */ }

// For role arrays
if (PermissionRules.hasAdminRole(userRoles)) { /* ... */ }
```

### Permission Checks

#### ❌ Wrong
```javascript
// Direct permission includes
if (permissions.includes('gauge.manage')) { /* ... */ }
if (permissions.includes('calibration.manage')) { /* ... */ }
```

#### ✅ Correct
```javascript
if (PermissionRules.canManageGauges(permissions)) { /* ... */ }
if (PermissionRules.canManageCalibration(permissions)) { /* ... */ }
```

---

## ESLint Configuration

### Rule Severity
All business logic rules are configured as **ERROR** level, meaning:
- Build will fail if violated
- Must be fixed before code can be committed
- No exceptions in production code

### Exemptions
Business logic rules are disabled in:
- `/frontend/src/infrastructure/business/**/*` - The rule classes themselves
- Test files - For testing edge cases
- Storybook files - For component demonstrations

### Configuration Location
`/frontend/eslint.config.js` lines 387-462

---

## Complete ESLint Rule Reference

### Custom Infrastructure Rules (Error Level)
```javascript
'infrastructure/prefer-infrastructure-components': 'error'
'infrastructure/no-hardcoded-colors': 'warn'
'infrastructure/no-hardcoded-spacing': 'warn'
'infrastructure/prefer-form-section': 'error'
'infrastructure/require-datatable-resetkey': 'error'
'infrastructure/require-location-with-datatable': 'error'
```

### Business Logic Rules (Error Level - via no-restricted-syntax)
All enforced through `no-restricted-syntax` with specific AST selectors:

**StatusRules Enforcement**:
- `status === 'checked_out'` → `StatusRules.isCheckedOut()`
- `status === 'available'` → `StatusRules.isAvailable()`
- `status === 'out_of_service'` → `StatusRules.isOutOfService()`
- `status === 'pending_qc'` → `StatusRules.isPendingQC()`
- `status === 'maintenance'` → `StatusRules.isInMaintenance()`
- `calibration_status === 'Expired'` → `StatusRules.isCalibrationExpired()`
- `calibration_status === 'Due Soon'` → `StatusRules.isCalibrationDueSoon()`
- Ternaries for badge variants → `StatusRules.getStatusBadgeVariant()`
- Sealing checks → `StatusRules.isSealed()`, `StatusRules.hasPendingUnsealRequest()`

**EquipmentRules Enforcement**:
- `.replace(/_/g, ' ')` → `EquipmentRules.getDisplayName()`
- `equipment_type === ...` → `EquipmentRules` business methods
- `ownership_type === 'employee'` → `EquipmentRules.canBeCheckedOut()`

**TextFormatRules Enforcement**:
- `.replace(/_/g, ' ')` → `TextFormatRules.formatUnderscoreToSpace()`
- Manual sentence case → `TextFormatRules.formatToSentenceCase()`
- `.replace(/\b\w/g, ...)` → `TextFormatRules.formatToTitleCase()`
- `split('_').map().join()` → `TextFormatRules.formatSettingKey()`
- `charAt(0).toUpperCase()` patterns → `TextFormatRules.formatActionText()`

**PermissionRules Enforcement**:
- `user.role === 'admin'` → `PermissionRules.isAdmin()`
- `user.role === 'super_admin'` → `PermissionRules.isAdmin()`
- `userRoles.some(...)` → `PermissionRules.hasAdminRole()`
- `permissions.includes('gauge.manage')` → `PermissionRules.canManageGauges()`
- `permissions.includes('calibration.manage')` → `PermissionRules.canManageCalibration()`

---

## Running ESLint

### Manual Validation
```bash
# Frontend directory
npm run lint

# With auto-fix
npm run lint:fix

# Full quality check
npm run quality:all
```

### CI/CD Integration
ESLint runs automatically in:
- Pre-commit hooks (future)
- Pull request validation
- Build pipeline
- Quality gate enforcement

---

## Migration Guide

### Step 1: Identify Violations
```bash
npm run lint
```

### Step 2: Auto-Fix Where Possible
```bash
npm run lint:fix
```

### Step 3: Manual Fixes
For complex patterns, manual refactoring required:
1. Import appropriate business rule class
2. Replace inline logic with rule method
3. Remove manual string manipulation
4. Test functionality

### Step 4: Verify
```bash
npm run lint         # No errors
npm test             # All tests pass
npm run quality:all  # Full quality check
```

---

## Benefits

### Consistency
- Same business logic everywhere
- No duplicate implementation
- Predictable behavior

### Maintainability
- Change logic in one place
- Affects all usages automatically
- Easy to find and update

### Type Safety
- TypeScript types on all methods
- IDE autocomplete
- Compile-time error detection

### Testing
- Test business logic independently
- Mock rule classes in tests
- Confidence in logic correctness

### Documentation
- Business rules self-documented
- Clear method names
- Single source of truth

---

## Common Violations and Fixes

### 1. Status Badge Variants
❌ **Before**:
```javascript
const variant = gauge.status === 'checked_out' ? 'warning' :
                gauge.status === 'available' ? 'success' :
                gauge.status === 'out_of_service' ? 'danger' : 'default';
```

✅ **After**:
```javascript
const variant = StatusRules.getStatusBadgeVariant(gauge.status);
```

### 2. Equipment Display Names
❌ **Before**:
```javascript
const displayName = gauge.equipment_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
```

✅ **After**:
```javascript
const displayName = EquipmentRules.getDisplayName(gauge.equipment_type);
```

### 3. Permission Checks
❌ **Before**:
```javascript
const canManage = user.permissions.includes('gauge.manage') ||
                  user.role === 'admin' ||
                  user.role === 'super_admin';
```

✅ **After**:
```javascript
const canManage = PermissionRules.canManageGauges(user.permissions) ||
                  PermissionRules.isAdmin(user);
```

### 4. Text Formatting
❌ **Before**:
```javascript
const formatted = settingKey.split('_')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(' ');
```

✅ **After**:
```javascript
const formatted = TextFormatRules.formatSettingKey(settingKey);
```

---

## Reference: Business Rule Class Locations

```
frontend/src/infrastructure/business/
├── StatusRules.ts          # Status and calibration logic
├── EquipmentRules.ts       # Equipment type and ownership logic
├── TextFormatRules.ts      # Text formatting logic
└── PermissionRules.ts      # Permission and role logic
```

Each class includes:
- Complete TypeScript types
- JSDoc documentation
- Comprehensive test coverage
- Usage examples

---

## Questions or Issues?

**ESLint Errors**: Check this guide for correct pattern
**New Business Logic**: Add to appropriate rule class, don't inline
**Exemptions**: Discuss with Architecture Team first

**Remember**: Business logic centralization is not optional. It's enforced by ESLint to maintain code quality and consistency across the platform.
