# Component Placement Guidelines

**Created**: Based on Modal Duplicate Cleanup Analysis  
**Purpose**: Prevent future component duplication and establish clear architectural boundaries

## Component Classification Criteria

### Infrastructure Components (`/src/infrastructure/components/`)

**Purpose**: Generic, reusable across ALL modules and applications

**Criteria**:
- No business logic specific to any domain
- Purely presentational or utility-focused
- Used by multiple modules
- No domain-specific data structures

**Examples**:
- `Modal` - Generic modal container
- `Button` - Standard button variations
- `FormInput` - Generic form controls
- `LoadingSpinner` - Generic loading indicator
- `ConfirmModal` - Generic yes/no confirmation

### Module Components (`/src/modules/{module}/components/`)

**Purpose**: Domain-specific business logic components

**Criteria**:
- Contains business logic specific to the module domain
- Uses domain-specific data structures
- Implements module-specific workflows
- May use infrastructure components internally

**Examples**:
- `GaugeModalManager` - Gauge-specific operations
- `QCApprovalsModal` - Gauge quality control workflow
- `UserDetailsModal` - Admin user management
- `AuditLogViewer` - Admin audit functionality

### General Application Components (`/src/components/`)

**Purpose**: Application-level components (not domain-specific, not infrastructure)

**Criteria**: 
- Used across multiple modules but not generic enough for infrastructure
- Contains application-specific logic but not module-specific
- Should be minimal and carefully justified

**Examples** (use sparingly):
- `AppHeader` - Application-wide navigation
- `NotificationCenter` - Application-level notifications
- `ThemeProvider` - Application theming

## Decision Framework

### Step 1: Domain Analysis
**Question**: Is this component specific to one business domain?
- **Yes** → Module component (`/src/modules/{domain}/components/`)
- **No** → Continue to Step 2

### Step 2: Reusability Analysis  
**Question**: Is this component used across multiple modules?
- **No** → Module component (even if generic, keep it local)
- **Yes** → Continue to Step 3

### Step 3: Business Logic Analysis
**Question**: Does this component contain any business logic?
- **Yes** → General application component (`/src/components/`)
- **No** → Infrastructure component (`/src/infrastructure/components/`)

## Validation Methodology

### Before Creating New Components

```bash
# 1. Check if similar component already exists
find . -name "*Modal*.tsx" -type f | grep -v node_modules

# 2. Search for existing functionality
grep -r "similar-functionality" frontend/src --include="*.tsx"

# 3. Verify no duplicates will be created
grep -r "ComponentName" frontend/src --include="*.tsx"
```

### During Development

```bash
# 1. Verify imports follow proper hierarchy
# Module → Infrastructure: ✅ Allowed
# Module → Module: ❌ Not allowed (cross-module)
# Infrastructure → Module: ❌ Not allowed (wrong direction)

# 2. Check for circular dependencies
npm run build
# Should complete without circular dependency warnings
```

## Anti-Patterns to Avoid

### ❌ Cross-Module Imports
```typescript
// BAD: Module importing from another module
import { UserModal } from '../../admin/components/UserModal';
```

### ❌ Infrastructure Importing Module Components
```typescript
// BAD: Infrastructure depending on business logic
import { GaugeModal } from '../../modules/gauge/components/GaugeModal';
```

### ❌ Duplicate Component Names
```typescript
// BAD: Same component in multiple locations
/src/components/TransferModal.tsx
/src/modules/gauge/components/TransferModal.tsx
```

## Best Practices

### ✅ Proper Import Hierarchy
```typescript
// Module component importing infrastructure
import { Modal, Button } from '../../../infrastructure/components';

// Module component importing general application
import { AppNotification } from '../../../components/AppNotification';
```

### ✅ Clear Component Ownership
- Each component should have ONE canonical location
- No duplicate implementations
- Clear responsibility boundaries

### ✅ Consistent Naming
- Infrastructure: Generic names (`Modal`, `Button`, `Card`)
- Module: Domain-prefixed (`GaugeModal`, `UserDetailsModal`)
- Application: App-prefixed (`AppHeader`, `AppNotification`)

## Migration Guidelines

### When Moving Components

1. **Analyze all imports** of the component being moved
2. **Update import paths** in dependent files
3. **Run full test suite** to verify no breakage
4. **Update any documentation** referencing the component
5. **Check for circular dependencies** after move

### When Consolidating Duplicates

1. **Compare functionality** between duplicate versions
2. **Identify the canonical version** using decision framework
3. **Map all dependencies** of each version
4. **Plan migration order** (least-used first)
5. **Validate after each step** with build/test cycle

## Enforcement

### Automated Checks (Recommended)

```bash
# Add to CI/CD pipeline
npm run architecture:validate
npm run lint:imports
npm run test:dependencies
```

### Manual Review Process

- All new components must be reviewed for proper placement
- Import additions should be validated against hierarchy rules
- Regular architecture reviews to identify drift

## Future Considerations

- Consider creating component placement linter rules
- Automated detection of duplicate component patterns
- Regular architectural debt reviews
- Team training on component placement decisions

---

**Reference**: Modal Duplicate Cleanup Analysis (3 Claude instances)  
**Validation**: Proven effective in eliminating 3 duplicate modal components  
**Status**: Active architectural guideline