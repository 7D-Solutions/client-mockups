# Frontend Architecture Implementation Plan

**MANDATORY**: Read this entire document before starting any implementation. Use `--think` flag for complex decisions.

## 🚨 Implementation Instructions

**SuperClaude Directives**:
- `--think` - Use for architectural decisions and complex refactoring
- `--validate` - Run after each phase completion
- `--persona-analyzer` - Activate for investigation phases
- `--persona-refactorer` - Activate for quality improvement phases
- `--seq` - Use for multi-step analysis
- `--uc` - Use when working with large files

**Quality Gates**: Each phase must pass validation before proceeding to next phase.

## Phase 0: Pre-Implementation Verification
**REQUIRED**: Execute these commands before ANY implementation

```bash
# Verify current state matches our analysis
cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/frontend/src

# Check modal quality
find . -name "*Modal*.tsx" -type f | wc -l  # Should be 18

# Check CSS migration status
find . -name "*.module.css" -type f -not -path "./infrastructure/*" | wc -l  # Should be 3

# Verify React Query usage
grep -l "useQuery\|useMutation" $(find . -name "*.tsx" -type f) | wc -l  # Should be >10
```

## Phase 1: Quick Wins - Infrastructure Compliance

### 1.1 Fix Raw HTML Input
**Target**: `frontend/src/modules/admin/components/EditGaugeModal.tsx`
**Issue**: Line 235 contains raw `<input>` element
**Action**: Replace with `FormInput` component

```typescript
// Before: <input type="text" ...>
// After: <FormInput label="..." name="..." .../>
```

**Validation**: `grep -c '<input\|<select\|<textarea' EditGaugeModal.tsx` should return 0

### 1.2 Complete User State Implementation
**Target**: `frontend/src/store/index.ts`
**Issue**: Empty placeholder functions (lines 495-513)
**Action**: 
1. Read the file to find empty functions
2. Implement state updates in `setProfile` and `updatePreferences`
3. Add localStorage persistence

**Implementation**:
```typescript
// Find and replace empty functions with:
setProfile: (profile: UserProfile) => 
  set((state) => ({ 
    user: { ...state.user, profile } 
  })),

updatePreferences: (preferences: Partial<UserPreferences>) =>
  set((state) => ({
    user: { 
      ...state.user, 
      preferences: { ...state.user.preferences, ...preferences }
    }
  }))
```

**Validation**: `grep -A2 "setProfile\|updatePreferences" store/index.ts` should show implemented functions

## Phase 2: Modal Quality Enhancement

**Instructions**: Use `--persona-refactorer --think` for this phase

### 2.1 Infrastructure Component Enhancement
**Target**: `frontend/src/infrastructure/components/Modal.tsx`
**Goal**: Add layout props to eliminate inline styles

```typescript
// Add props to Modal.Body:
interface ModalBodyProps {
  layout?: 'flex' | 'grid' | 'block';
  gap?: 'small' | 'medium' | 'large';
  padding?: 'small' | 'medium' | 'large';
  spacing?: 'compact' | 'normal' | 'relaxed';
}
```

### 2.2 High-Priority Modal Refactoring
**Targets** (in order):
1. `GaugeModalManager.tsx` - 43 inline styles
2. `ReviewModal.tsx` - 35 inline styles
3. `UserDetailsModal.tsx` - 27 inline styles

**Rules**:
- Remove ALL visual styles (colors, borders, shadows, fonts)
- Keep ONLY layout styles (display, flex, gap, margin, padding, position)
- Use infrastructure components for visual styling

**Validation Script**:
```bash
# Check remaining inline styles
for file in GaugeModalManager.tsx ReviewModal.tsx UserDetailsModal.tsx; do
  echo "$file: $(grep -c 'style={{' $file) inline styles"
done
```

## Phase 3: API Investigation & Mapping

**Instructions**: Use `--persona-analyzer --seq` for comprehensive analysis

### 3.1 Create API Mapping Document
**Action**: Create comprehensive API mapping by analyzing code

**Steps**:
1. Read `frontend/src/services/gaugeService.ts`
2. Extract all API endpoints with grep: `grep -n "apiClient\." gaugeService.ts`
3. Read backend route files to check V2 availability
4. Create `/erp-core-docs/system architecture/Reviews/API_MAPPING_SPIKE.md` with findings

**Document Template**:
```markdown
# API Mapping Spike Results

## Current Frontend Usage
| Line | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| [Extract from gaugeService.ts] |

## Backend V2 Availability
| Operation | V1 | V2 | Tracking | Notes |
|-----------|----|----|----------|-------|
| [Check backend routes] |

## Migration Blockers
[List operations only available in tracking API]
```

### 3.2 Backend Route Analysis Commands
```bash
# Find all V2 routes
grep -n "router\." backend/src/modules/gauge/routes/gauges-v2.js

# Find tracking operations
grep -n "router\." backend/src/modules/gauge/routes/gauge-tracking-operations.routes.js

# Compare with V1 routes
grep -n "router\." backend/src/modules/gauge/routes/gauges.routes.js
```

## Phase 4: ERP Core Integration

**Instructions**: Use `--validate` after each integration

### 4.1 Auth Service Integration
**Target**: `frontend/src/infrastructure/api/client.ts`
**Action**: Replace local auth implementation with ERP core imports

```typescript
// Remove local implementations of:
// - getAuthHeaders()
// - isAuthenticated()
// - refreshToken()

// Replace with:
import { getAuthHeaders, isAuthenticated, refreshToken } from '../../../erp-core/src/core/auth/authService';
```

**Validation**: All API calls should continue working with ERP core auth

### 4.2 Update Import Paths
**Action**: Find and update all auth imports

**Commands**:
```bash
# Find files importing auth functions from api/client
grep -r "import.*getAuthHeaders\|isAuthenticated\|refreshToken.*from.*api/client" frontend/src

# For each file found, update the import to:
# import { getAuthHeaders, isAuthenticated } from '../../../erp-core/src/core/auth/authService';
```

**Validation**: 
```bash
# Verify no more local auth imports
grep -r "from.*api/client.*auth" frontend/src | wc -l  # Should be 0
```

## Phase 5: CSS Migration (Low Priority)

**Target Files**:
1. `frontend/src/pages/ButtonTest.tsx` + `.module.css`
2. `frontend/src/pages/CSSTest.tsx` + `.module.css`
3. `frontend/src/pages/ComponentShowcase.tsx` + `.module.css`

**Action**: Convert to infrastructure components and delete CSS files

## Phase 6: Documentation & Cleanup

### 6.1 Archive Migration Files
**Action**: Move old documentation files to archive

**Commands**:
```bash
# Create archive directory if it doesn't exist
mkdir -p /erp-core-docs/frontend-rebuild/archived/

# Find and move migration files
find frontend -name "CSS_MIGRATION_*.md" -o -name "PHASE*_*.md" | while read file; do
  mv "$file" /erp-core-docs/frontend-rebuild/archived/
done
```

### 6.2 Create Architecture Documentation
**Output**: `frontend/ARCHITECTURE.md`

**Required Sections**:
- Module boundaries and communication patterns
- Infrastructure component usage guidelines
- API standardization decisions
- Performance considerations

## Validation Checkpoints

After each phase, run:
```bash
# Lint check
npm run lint

# Type check
npm run typecheck

# Test suite
npm test

# Build verification
npm run build
```

## Success Criteria

- [ ] Zero raw HTML inputs in modals
- [ ] All modals use infrastructure components
- [ ] User state management fully implemented
- [ ] ERP Core auth integrated
- [ ] API mapping document complete
- [ ] CSS migration complete (test files)
- [ ] All validation checks pass

## Implementation Notes

**DO NOT**:
- Skip validation steps
- Make assumptions about API availability
- Create new CSS files
- Implement features not in this plan

**ALWAYS**:
- Read the file before modifying
- Use infrastructure components
- Validate after changes
- Follow existing patterns

**When Blocked**:
- Document the blocker in implementation notes
- Move to next task
- Return to blocked items after investigation