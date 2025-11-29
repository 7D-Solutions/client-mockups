# Column Management - Simple Implementation Plan

## Overview
Add show/hide and drag-to-reorder columns to all data tables. That's it.

## What We're Building

**One Hook** + **One CSS File** = Column Management Everywhere

```typescript
// Usage in any table (3 lines):
const columnManager = useColumnManager('inventory-dashboard', DEFAULT_COLUMNS);

// Then just render with columnManager.columns
```

---

## Phase 1: Build The Hook

### File: `frontend/src/infrastructure/hooks/useColumnManager.ts`
**Size**: ~200 lines total

#### What It Does:
1. Load column config from localStorage
2. Handle drag-and-drop reordering
3. Handle show/hide checkboxes
4. Save changes back to localStorage
5. Provide reset to defaults

#### Interface:
```typescript
interface Column {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean;  // Can't move or hide
  align?: 'left' | 'center' | 'right';
}

function useColumnManager(tableId: string, defaultColumns: Column[]) {
  return {
    columns: Column[];              // Current column order/visibility
    isEditMode: boolean;            // Is user editing?
    toggleEditMode: () => void;     // Enter/exit edit mode
    handleDragStart: (e, index) => void;
    handleDragOver: (e, index) => void;
    handleDrop: (e, index) => void;
    toggleVisibility: (id) => void;
    resetToDefault: () => void;
  };
}
```

#### Implementation Details:
- **localStorage key**: `column-config-${tableId}`
- **Validation**: If saved config doesn't match current columns, use defaults
- **Error handling**: If localStorage fails, just use defaults
- **Mobile**: Desktop only for MVP (no touch events)

---

## Phase 2: Add CSS

### File: `frontend/src/infrastructure/hooks/useColumnManager.module.css`
**Size**: ~150 lines total

Copy styles directly from `APPROVED-MOCKUP.html`:
- Edit button styles
- Checkbox overlay positioning
- Drag visual feedback
- Table layout (auto spacing)
- Transitions

---

## Phase 3: Implement in Tables

### Pattern (Same for every table):

#### 1. Define columns (~5 lines):
```typescript
const DEFAULT_COLUMNS: Column[] = [
  { id: 'itemId', label: 'Item ID', visible: true, locked: true, align: 'center' },
  { id: 'name', label: 'Item Name', visible: true, align: 'left' },
  { id: 'facility', label: 'Facility', visible: true, align: 'center' },
  // ...
];
```

#### 2. Use hook (~3 lines):
```typescript
const columnManager = useColumnManager('inventory-dashboard', DEFAULT_COLUMNS);
```

#### 3. Add edit button (~5 lines):
```tsx
<Button onClick={columnManager.toggleEditMode}>
  {columnManager.isEditMode ? 'Done Editing' : 'Customize Columns'}
</Button>
```

#### 4. Update table headers (~15 lines):
```tsx
<thead className={columnManager.isEditMode ? 'edit-mode' : ''}>
  <tr>
    {columnManager.columns.filter(c => c.visible).map((col, idx) => (
      <th
        key={col.id}
        className={col.align}
        draggable={columnManager.isEditMode && !col.locked}
        onDragStart={(e) => columnManager.handleDragStart(e, idx)}
        onDragOver={(e) => columnManager.handleDragOver(e, idx)}
        onDrop={(e) => columnManager.handleDrop(e, idx)}
      >
        {columnManager.isEditMode && !col.locked && (
          <div className="header-checkbox">
            <input
              type="checkbox"
              checked={col.visible}
              onChange={() => columnManager.toggleVisibility(col.id)}
            />
          </div>
        )}
        {col.label}
      </th>
    ))}
  </tr>
</thead>
```

#### 5. Update table body (~5 lines):
```tsx
<tbody>
  {data.map(row => (
    <tr key={row.id}>
      {columnManager.columns.filter(c => c.visible).map(col => (
        <td key={col.id} className={col.align}>
          {row[col.id]}
        </td>
      ))}
    </tr>
  ))}
</tbody>
```

**Total per table**: ~30 lines

---

## Phase 4: Test

### E2E Tests Only
Test in each actual table:
1. Click "Customize Columns"
2. Uncheck a column
3. Click "Done Editing" - column should be hidden
4. Refresh page - column should stay hidden
5. Drag column header left/right - order should change
6. Refresh page - order should stay changed
7. Test in different table - configs should be independent

**Total**: ~20 lines per table × 5 tables = ~100 lines

---

## Implementation Order

### 1. InventoryDashboard (First)
- Build and test hook here
- Validate design works in real context
- Fix any issues discovered

### 2. GaugeList (Second)
- Prove hook is reusable
- Validate different column configurations

### 3. Remaining Tables (Batch)
- SetDetailsPage
- StorageLocationsPage
- SpareInventoryPage

---

## What We're NOT Building

❌ ColumnManager wrapper component
❌ Separate component file
❌ Storybook stories
❌ Unit tests for hook internals
❌ Integration test layer
❌ Column grouping
❌ Column resizing
❌ Column presets
❌ Mobile touch support
❌ localStorage migration system
❌ Column config versioning

---

## Total Scope

### New Code:
```
useColumnManager.ts         200 lines
useColumnManager.module.css 150 lines
InventoryDashboard.tsx       30 lines (changes)
GaugeList.tsx                30 lines (changes)
SetDetailsPage.tsx           30 lines (changes)
StorageLocationsPage.tsx     30 lines (changes)
SpareInventoryPage.tsx       30 lines (changes)
E2E tests                   100 lines
────────────────────────────────────
Total:                      600 lines
```

### Modified Files:
- 5 table pages
- 1 new hook file
- 1 new CSS file
- 1 test file

---

## Error Handling (Simple)

```typescript
// Load config
try {
  const saved = localStorage.getItem(`column-config-${tableId}`);
  const config = JSON.parse(saved);
  // Validate: do saved column IDs match current?
  if (isValid(config, defaultColumns)) {
    return config;
  }
} catch (e) {
  // Any error → use defaults
}
return defaultColumns;
```

**Strategy**: When in doubt, use defaults. User can reconfigure in seconds.

---

## Config Conflict Resolution (Simple)

When column definitions change:
```typescript
// Old saved: ['id', 'name', 'facility']
// New default: ['id', 'name', 'plant', 'zone']

// Strategy: If IDs don't match, discard saved config
if (!arraysMatch(savedIds, defaultIds)) {
  return defaultColumns;
}
```

**Strategy**: Strict match only. Any mismatch = reset. Simple.

---

## Success Criteria

✅ User can hide/show any non-locked column
✅ User can drag to reorder any non-locked column
✅ Preferences persist across sessions per table
✅ Works in Chrome, Firefox, Safari, Edge
✅ No console errors or warnings
✅ <30 lines of code to add to new table

---

## Done Is Better Than Perfect

- Start with one table (Inventory Dashboard)
- Get it working and deployed
- Copy pattern to other tables
- Ship it

No ceremonies. No abstractions. Just ship.

---

## File Locations

```
frontend/src/
└── infrastructure/
    └── hooks/
        ├── useColumnManager.ts
        ├── useColumnManager.module.css
        └── index.ts (add export)
```

---

## Next Action

Start with `useColumnManager.ts` - implement the hook with the approved mockup logic translated to React.
