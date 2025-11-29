# Column Management System - Platform-Wide Implementation Plan

## Overview
Implement a reusable, customizable column management system across all data tables in the ERP platform. This system allows users to show/hide columns and reorder them via drag-and-drop, with preferences persisted per table.

## ✅ Design Approved
**Mockup**: `location-hierarchy-inline-edit.html`

### Key Features
- **Edit Mode Toggle**: "Customize Columns" button activates edit mode
- **Checkboxes Above Headers**: Show/hide controls appear above column headers
- **Drag-to-Reorder**: Direct column header dragging with visual feedback
- **Deferred Visibility**: Columns stay visible during editing, hide on "Done Editing"
- **Auto-Spacing**: Remaining columns automatically expand to fill width
- **Persistence**: Column order and visibility saved per table via localStorage

---

## Phase 1: Infrastructure Components

### 1.1 Create `ColumnManager` Component
**File**: `frontend/src/infrastructure/components/ColumnManager.tsx`

**Purpose**: Reusable component that wraps table headers with column management functionality

**Props**:
```typescript
interface ColumnManagerProps {
  columns: ColumnConfig[];
  onColumnOrderChange: (newOrder: ColumnConfig[]) => void;
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  tableId: string; // Unique identifier for localStorage
  children: React.ReactNode;
}

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Cannot be reordered or hidden
  align?: 'left' | 'center' | 'right';
}
```

**Features**:
- Manages drag-and-drop state
- Renders checkboxes above headers in edit mode
- Handles column reordering logic
- Applies visibility changes on "Done Editing"
- Provides visual feedback during dragging

### 1.2 Create `useColumnManager` Hook
**File**: `frontend/src/infrastructure/hooks/useColumnManager.ts`

**Purpose**: Encapsulates column management state and persistence logic

**API**:
```typescript
interface UseColumnManagerReturn {
  columns: ColumnConfig[];
  isEditMode: boolean;
  toggleEditMode: () => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  toggleColumnVisibility: (columnId: string) => void;
  applyVisibilityChanges: () => void;
  resetToDefault: () => void;
}

function useColumnManager(
  tableId: string,
  defaultColumns: ColumnConfig[]
): UseColumnManagerReturn;
```

**Features**:
- Manages column order and visibility state
- Handles localStorage persistence (key: `column-config-${tableId}`)
- Provides undo/reset functionality
- Validates column configurations

### 1.3 Create Column Management Styles
**File**: `frontend/src/infrastructure/components/ColumnManager.module.css`

**Key Styles**:
- Edit mode button (normal and active states)
- Checkbox overlays above headers
- Drag indicators and hover effects
- Drop position indicators (left/right borders)
- Smooth transitions for visibility changes

---

## Phase 2: Table Identification & Prioritization

### High Priority Tables (Location Hierarchy Implementation)

#### 2.1 Inventory Dashboard
**File**: `frontend/src/modules/inventory/pages/InventoryDashboard.tsx`
**Columns**: Item ID*, Item Name, Type, Facility, Building, Zone, Location, Quantity, Last Moved
**Locked**: Item ID (always first, always visible)
**Priority**: HIGH - Primary inventory view

#### 2.2 Gauge List
**File**: `frontend/src/modules/gauge/pages/GaugeList.tsx`
**Columns**: Gauge ID*, Name, Type, Status, Facility, Building, Zone, Location, Last Calibration
**Locked**: Gauge ID
**Priority**: HIGH - Main gauge management view

#### 2.3 Set Details Page
**File**: `frontend/src/modules/gauge/pages/SetDetailsPage.tsx`
**Columns**: Item ID*, Name, Type, Status, Facility, Building, Zone, Location
**Locked**: Item ID
**Priority**: HIGH - Set member viewing

#### 2.4 Storage Locations Page
**File**: `frontend/src/modules/inventory/pages/StorageLocationsPage.tsx`
**Columns**: Location Code*, Facility, Building, Zone, Capacity, Current Items, Status
**Locked**: Location Code
**Priority**: MEDIUM - Location management

#### 2.5 Spare Inventory Page
**File**: `frontend/src/modules/gauge/pages/SpareInventoryPage.tsx`
**Columns**: Spare ID*, Name, Type, Facility, Building, Zone, Location, Quantity
**Locked**: Spare ID
**Priority**: MEDIUM - Spare parts tracking

### Additional Tables (Lower Priority)

#### 2.6 Admin User Management
**File**: `frontend/src/modules/admin/pages/UserManagement.tsx`
**Columns**: User ID*, Name, Email, Role, Department, Status, Last Login
**Priority**: LOW

#### 2.7 Audit Log
**File**: TBD - May not exist yet
**Columns**: Timestamp*, User, Action, Module, Details
**Priority**: LOW

---

## Phase 3: Implementation Strategy

### Step 1: Build Infrastructure (Week 1)
1. Create `ColumnManager` component with all drag-drop logic
2. Create `useColumnManager` hook with localStorage persistence
3. Create CSS module with all styles from mockup
4. Write unit tests for hook logic
5. Create Storybook stories for component variations

### Step 2: Implement High Priority Tables (Week 2)

#### Implementation Pattern (Per Table):
1. **Import Infrastructure**:
   ```typescript
   import { ColumnManager } from '../../../infrastructure/components';
   import { useColumnManager } from '../../../infrastructure/hooks';
   ```

2. **Define Column Configuration**:
   ```typescript
   const defaultColumns: ColumnConfig[] = [
     { id: 'itemId', label: 'Item ID', visible: true, locked: true, align: 'center' },
     { id: 'name', label: 'Item Name', visible: true, align: 'left' },
     { id: 'type', label: 'Type', visible: true, align: 'center' },
     // ... rest of columns
   ];
   ```

3. **Initialize Hook**:
   ```typescript
   const {
     columns,
     isEditMode,
     toggleEditMode,
     reorderColumns,
     toggleColumnVisibility,
     applyVisibilityChanges
   } = useColumnManager('inventory-dashboard', defaultColumns);
   ```

4. **Wrap Table Headers**:
   ```typescript
   <ColumnManager
     columns={columns}
     onColumnOrderChange={reorderColumns}
     onColumnVisibilityChange={toggleColumnVisibility}
     isEditMode={isEditMode}
     onToggleEditMode={toggleEditMode}
     tableId="inventory-dashboard"
   >
     <thead>
       <tr>
         {columns.filter(c => c.visible).map(col => (
           <th key={col.id} className={col.align}>
             {col.label}
           </th>
         ))}
       </tr>
     </thead>
   </ColumnManager>
   ```

5. **Apply Column Order to Body**:
   ```typescript
   <tbody>
     {data.map(row => (
       <tr key={row.id}>
         {columns.filter(c => c.visible).map(col => (
           <td key={col.id} className={col.align}>
             {row[col.id]}
           </td>
         ))}
       </tr>
     ))}
   </tbody>
   ```

#### Rollout Order:
1. **InventoryDashboard** - Test complete flow with location hierarchy
2. **GaugeList** - Validate consistency across modules
3. **SetDetailsPage** - Ensure nested table support
4. **StorageLocationsPage** - Complete location-related tables
5. **SpareInventoryPage** - Final high-priority implementation

### Step 3: Testing & Validation (Week 3)
1. **Unit Tests**: Hook logic, column reordering, visibility toggling
2. **Integration Tests**: localStorage persistence, state management
3. **E2E Tests**: User workflows across all tables
4. **Cross-Browser**: Chrome, Firefox, Safari, Edge
5. **Performance**: Measure render time with 100+ rows
6. **Accessibility**: Keyboard navigation, screen reader support

### Step 4: Documentation & Rollout (Week 3-4)
1. Update component documentation in Storybook
2. Create developer guide for adding column management to new tables
3. Create user guide with screenshots and GIFs
4. Gradual rollout to production (table by table)
5. Monitor user feedback and analytics

---

## Phase 4: Advanced Features (Future)

### 4.1 Column Grouping
- Group related columns (e.g., Location Hierarchy)
- Show/hide entire groups with one click
- Visual separators between groups

### 4.2 Column Resizing
- Drag column borders to resize
- Double-click to auto-fit content
- Persist custom widths

### 4.3 Column Presets
- Save named column configurations
- Quick switch between presets (e.g., "Compact View", "Full Details")
- Share presets with team members

### 4.4 Conditional Columns
- Show columns based on user role/permissions
- Dynamic columns based on data availability
- Feature flags for experimental columns

---

## Technical Considerations

### Performance
- **Virtualization**: For tables with 500+ rows, implement react-window or react-virtuoso
- **Memoization**: Use React.memo and useMemo to prevent unnecessary re-renders
- **Debouncing**: Debounce drag events to reduce calculation overhead
- **Lazy Rendering**: Only render visible columns

### Accessibility
- **ARIA Labels**: Proper labels for drag handles and checkboxes
- **Keyboard Navigation**: Tab, Enter, Space, Arrow keys for all interactions
- **Screen Readers**: Announce drag operations and column changes
- **Focus Management**: Maintain focus during column reordering

### Browser Compatibility
- **HTML5 Drag API**: Supported in all modern browsers
- **Fallback**: Touch events for mobile devices
- **Polyfills**: None required for target browsers (Chrome 90+, Firefox 88+, Safari 14+)

### Data Migration
- **Version Checking**: Validate stored column configs against current schema
- **Graceful Degradation**: Fall back to defaults if stored config is invalid
- **Migration Path**: Update stored configs when column definitions change

---

## Success Criteria

### User Experience
- ✅ Users can hide/show any non-locked column
- ✅ Users can reorder columns via drag-and-drop
- ✅ Column preferences persist across sessions
- ✅ Changes apply smoothly without page refresh
- ✅ Column spacing adjusts automatically

### Technical
- ✅ Zero performance impact on tables <100 rows
- ✅ <50ms drag response time
- ✅ <200ms column hide/show transition
- ✅ 100% keyboard accessibility
- ✅ Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

### Code Quality
- ✅ Reusable components with <5 lines to integrate
- ✅ 90%+ test coverage on hook logic
- ✅ No prop drilling (use context if needed)
- ✅ TypeScript strict mode compliance
- ✅ ESLint/Prettier formatting

---

## Risk Assessment

### High Risk
- **State Management Complexity**: Mitigated by dedicated hook
- **Drag-Drop Reliability**: Extensive testing across browsers
- **Performance with Large Tables**: Implement virtualization

### Medium Risk
- **localStorage Conflicts**: Use namespaced keys per table
- **Column Definition Changes**: Version stored configs
- **Mobile Touch Support**: Test touch events separately

### Low Risk
- **User Adoption**: Familiar pattern from Excel/Sheets
- **Maintenance Burden**: Well-documented, reusable components

---

## Timeline

| Week | Phase | Tasks | Deliverable |
|------|-------|-------|-------------|
| 1 | Infrastructure | Component, Hook, Styles, Tests | Reusable column management system |
| 2 | High Priority | Implement 5 main tables | Column management in key views |
| 3 | Testing | Unit, integration, E2E tests | Validated implementation |
| 3-4 | Rollout | Documentation, gradual deploy | Production-ready feature |

**Total Duration**: 3-4 weeks (1 developer full-time)

---

## Next Steps

1. ✅ Get stakeholder approval on implementation plan
2. Create GitHub epic with linked issues for each task
3. Set up project board with sprint planning
4. Begin Phase 1: Infrastructure development
5. Schedule design review before Phase 2 rollout

---

## References

- **Mockup**: `/erp-core-docs/design-mockups/location-hierarchy-inline-edit.html`
- **Design Discussion**: Current conversation
- **Related Docs**:
  - `/erp-core-docs/design-mockups/location-hierarchy-best-practices.md`
  - `/erp-core-docs/system architecture/Fireproof Docs 2.0/`
