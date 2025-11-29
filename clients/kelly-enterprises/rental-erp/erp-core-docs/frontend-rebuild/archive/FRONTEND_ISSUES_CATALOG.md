# Frontend Issues Catalog - Fire-Proof ERP Sandbox

**Date**: 2025-09-09  
**Scope**: Comprehensive issues discovered during gauge module development and styling fixes

---

## 1. CSS Architecture Issues

### 1.1 Multiple Conflicting CSS Files
- **Issue**: 12+ CSS files with overlapping concerns and no clear hierarchy
- **Files Found**: `index.css`, `gauge.css`, `components.css`, `design-tokens.css`, `main.css`, `styles.css`, `utilities.css`, `layout.css`, `summary.css`, `styles-legacy-backup.css`, `user-dashboard.css`, `login.css`
- **Impact**: Style conflicts, requiring `!important` overrides, unpredictable styling behavior

### 1.2 Inconsistent Styling Systems
- **Issue**: Three different styling approaches used simultaneously
  - Tailwind CSS utility classes
  - Legacy CSS classes
  - Module-specific CSS classes
- **Impact**: Conflicting styles, maintenance complexity, debugging difficulty

### 1.3 Poor CSS Specificity Management
- **Issue**: No clear specificity strategy, resulting in cascade conflicts
- **Examples**: `.tab-btn` vs `.category-tab` vs `.thread-tab` for same functionality
- **Impact**: Forced use of `!important` declarations throughout codebase

### 1.4 Duplicate Style Definitions
- **Issue**: Same functionality styled differently across files
- **Examples**: Button styles redefined in multiple files with different names
- **Impact**: Code bloat, inconsistent UI, maintenance overhead

---

## 2. Component Architecture Issues

### 2.1 Inconsistent Button Component Usage
- **Issue**: Multiple button implementations for same use cases
- **Examples**: 
  - Main category tabs: Custom Tailwind classes
  - Sub-navigation tabs: Different custom classes  
  - Action buttons: Legacy CSS classes
- **Impact**: UI inconsistency, maintenance complexity

### 2.2 Modal Component Hierarchy Problems
- **Issue**: Z-index conflicts between nested modals
- **Specific**: `UnsealConfirmModal` (z-index: 1050) rendered behind `UnsealRequestsModal` (z-index: 9999)
- **Impact**: User interface broken, modals not visible

### 2.3 State Management Inconsistencies
- **Issue**: React Query cache interference between components
- **Specific**: Tab switching affecting unrelated query results
- **Impact**: Incorrect data display, user confusion

---

## 3. Data Contract Issues

### 3.1 Frontend-Backend Schema Mismatches
- **Issue**: Frontend expects different data structure than backend provides
- **Examples**:
  - Frontend: `status === 'pending_approval'` vs Backend: `status === 'pending'`
  - Frontend: `gauge?.name` vs Backend: `gauge_name`
  - Frontend: `user?.name` vs Backend: `requester_name`
- **Impact**: Runtime errors, "Unknown" data displayed

### 3.2 Type Definition Inaccuracies
- **Issue**: TypeScript interfaces don't match actual API responses
- **Examples**: Nested objects expected but flat fields returned
- **Impact**: Type safety compromised, runtime errors

---

## 4. Development Environment Issues

### 4.1 Container Build vs Dev Mode Confusion
- **Issue**: Production builds served instead of dev mode with hot reload
- **Cause**: Wrong Docker Compose file usage
- **Impact**: Changes not visible, debugging difficult

### 4.2 CSS Hot Reload Problems
- **Issue**: CSS changes not reflected without container restart
- **Cause**: Multiple CSS files, caching issues, conflicting imports
- **Impact**: Slow development cycle, debugging complexity

---

## 5. User Interface Issues

### 5.1 Inconsistent Visual Design
- **Issue**: No unified design system or style guide
- **Examples**:
  - Different button shapes, colors, and sizes throughout app
  - Inconsistent typography scales
  - Mixed border radius values (4px, 8px, 12px, 20px)
- **Impact**: Unprofessional appearance, poor user experience

### 5.2 Accessibility Concerns
- **Issue**: No consistent focus management or keyboard navigation
- **Examples**: Modal focus traps not implemented properly
- **Impact**: Poor accessibility, potential compliance issues

### 5.3 Responsive Design Inconsistencies
- **Issue**: Mixed responsive strategies
- **Examples**: Some components use CSS Grid, others Flexbox, others Tailwind responsive classes
- **Impact**: Inconsistent mobile experience

---

## 6. Code Organization Issues

### 6.1 No Clear Folder Structure
- **Issue**: Files scattered across multiple directories without clear purpose
- **Examples**: CSS files in `/styles/`, `/styles/modules/`, `/src/`, component-level
- **Impact**: Hard to locate files, unclear dependencies

### 6.2 Inconsistent Naming Conventions
- **Issue**: Multiple naming patterns used simultaneously
- **Examples**:
  - `kebab-case` CSS classes
  - `camelCase` React props
  - `snake_case` API fields
  - `PascalCase` component names
- **Impact**: Developer confusion, maintenance difficulty

### 6.3 Lack of Component Reusability
- **Issue**: Similar functionality implemented multiple times
- **Examples**: Different modal implementations, button components, form inputs
- **Impact**: Code duplication, maintenance overhead

---

## 7. Performance Issues

### 7.1 CSS Bundle Size
- **Issue**: Multiple CSS files loaded, many with unused styles
- **Impact**: Larger bundle size, slower page loads

### 7.2 React Query Cache Pollution
- **Issue**: Inefficient query keys causing unnecessary refetches
- **Examples**: Tab changes invalidating unrelated queries
- **Impact**: Poor performance, unnecessary network requests

---

## 8. Testing Issues

### 8.1 No Consistent Testing Strategy
- **Issue**: Test files scattered, no clear testing patterns
- **Structure Found**: 
  - `/tests/` directories exist but inconsistent usage
  - No `__tests__/` folders (explicitly avoided per CLAUDE.md)
- **Impact**: Low test coverage, brittle code

### 8.2 Hard to Test Components
- **Issue**: Components tightly coupled to specific styling and state
- **Impact**: Unit testing difficult, integration testing required

---

## 9. Documentation Issues

### 9.1 No Style Guide Documentation
- **Issue**: No documented design system or component usage guidelines
- **Impact**: Developers create inconsistent implementations

### 9.2 Unclear Component APIs
- **Issue**: Component props and usage not documented
- **Impact**: Developer confusion, incorrect usage

---

## 10. Build System Issues

### 10.1 Complex Docker Setup
- **Issue**: Multiple Docker Compose files with unclear purposes
- **Files**: `docker-compose.yml`, `docker-compose.override.yml`, `docker-compose.dev.yml`
- **Impact**: Confusion about which to use, environment inconsistencies

### 10.2 CSS Processing Pipeline Unclear
- **Issue**: Unclear how CSS files are processed and in what order
- **Impact**: Unpredictable style application, debugging difficulty

---

## Severity Assessment

**Critical (Blocks Development)**:
- Issues 1.1, 1.2, 2.2, 3.1, 4.1

**High (Impacts Quality)**:
- Issues 1.3, 1.4, 2.1, 3.2, 5.1, 6.1, 6.2

**Medium (Technical Debt)**:
- Issues 2.3, 4.2, 5.2, 5.3, 6.3, 7.1, 7.2

**Low (Process Improvement)**:
- Issues 8.1, 8.2, 9.1, 9.2, 10.1, 10.2

---

## Recommendation Priority

1. **Establish CSS Architecture** (Issues 1.1-1.4)
2. **Create Component Design System** (Issues 2.1, 5.1)
3. **Fix Data Contracts** (Issues 3.1, 3.2)
4. **Streamline Development Environment** (Issues 4.1, 4.2)
5. **Improve Code Organization** (Issues 6.1, 6.2)

---

## Issues Discovered During Session

### Button Styling Inconsistency
- **Root Cause**: `gauge.css` file contained `.category-tab` and `.thread-tab` styles that conflicted with new `.tab-btn` and `.subtab-btn` classes
- **Resolution**: Added `!important` overrides to ensure consistent styling
- **Files Modified**: `index.css`, `gauge.css`, `GaugeInventory.tsx`, `ThreadSubNavigation.tsx`

### Thread Gauge Count Display
- **Issue**: Count showed 0 initially, then changed to 85 after tab click
- **Root Cause**: Thread gauge count calculated from filtered data that wasn't loaded until tab selected
- **Resolution**: Added separate query to fetch thread gauge count independently

### Modal Z-Index Problems
- **Issue**: Confirm modal appeared behind main modal
- **Resolution**: Increased z-index from 1050 to 10000

### Frontend-Backend Data Mismatches
- **Issue**: Frontend expected nested objects (`gauge?.name`) but backend returned flat fields (`gauge_name`)
- **Resolution**: Updated all field references to match backend response structure