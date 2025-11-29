# DataTable Page Template

Standard layout pattern for all DataTable-based pages in the application.

## Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Page Title (e.g., "All Users", "All Gauges")               │
├─────────────────────────────────────────────────────────────┤
│ [+ Add Button] [Action Buttons...]     [⚙ Columns Button]  │
├─────────────────────────────────────────────────────────────┤
│ [🔍 Search Input] [Clear Search]     [Column Filters...]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              DataTable Content                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│              Pagination (if needed)                         │
└─────────────────────────────────────────────────────────────┘
```

## Code Template

```tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingSpinner, Button, DataTable, Icon } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { useLogger } from '../../../infrastructure/utils/logger';

export const YourPage: React.FC = () => {
  const location = useLocation();
  const logger = useLogger('YourPage');

  // State
  const [data, setData] = useState<YourType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await yourService.getAll();
      setData(response);
    } catch (error) {
      logger.errorWithStack('Failed to load data', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo(0, 0);
    loadData();
  }, [loadData]);

  // Column definitions
  const columns: DataTableColumn[] = useMemo(() => {
    return [
      {
        id: 'name',
        label: 'NAME',
        visible: true,
        locked: true,
        align: 'left',
        render: (value, row: YourType) => (
          <div>{value}</div>
        )
      },
      {
        id: 'actions',
        filterable: false,
        label: 'ACTIONS',
        visible: true,
        align: 'center',
        sortable: false,
        render: (_, row: YourType) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="info">
              Action
            </Button>
          </div>
        )
      }
    ];
  }, []);

  // Column manager for table customization
  const columnManager = useColumnManager('your-page-id', columns);

  // Reference to DataTable's reset function
  const dataTableResetRef = useRef<(() => void) | null>(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: '100%', margin: '0' }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        {/* Page Title */}
        <div style={{
          padding: 'var(--space-2) var(--space-4)',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 'var(--font-size-xl)',
            fontWeight: '600'
          }}>
            All Items
          </h2>
        </div>

        {/* Action Buttons Row */}
        <div style={{
          padding: 'var(--space-2) var(--space-4) 0 var(--space-4)',
          backgroundColor: 'var(--color-gray-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Left side - Primary actions */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <Button
              onClick={() => setShowAddModal(true)}
              variant="primary"
              icon={<Icon name="plus" />}
              size="sm"
            >
              Add New
            </Button>

            {/* Optional: Additional action buttons with counts/badges */}
          </div>

          {/* Right side - Column controls */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {!columnManager.isEditMode ? (
              <Button
                onClick={() => columnManager.toggleEditMode()}
                variant="secondary"
                icon={<Icon name="cog" />}
                size="sm"
                preventDoubleClick={false}
              >
                Columns
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => columnManager.toggleEditMode()}
                  variant="primary"
                  icon={<Icon name="check" />}
                  size="sm"
                  preventDoubleClick={false}
                >
                  Done
                </Button>
                <Button
                  onClick={() => {
                    if (dataTableResetRef.current) {
                      dataTableResetRef.current();
                    }
                  }}
                  variant="secondary"
                  size="sm"
                  preventDoubleClick={false}
                >
                  Reset Columns
                </Button>
              </>
            )}
          </div>
        </div>

        {/* DataTable with search in leftControls */}
        <DataTable
          tableId="your-page-id"
          columns={columns}
          data={data}
          columnManager={columnManager}
          onRowClick={(row: YourType) => {
            // Handle row click
          }}
          itemsPerPage={50}
          disablePagination={true}
          disableColumnControls={true}
          externalEditMode={columnManager.isEditMode}
          onResetColumns={(resetFn) => {
            dataTableResetRef.current = resetFn;
          }}
          leftControls={
            <>
              <FormInput
                type="text"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                icon={<Icon name="search" />}
                size="sm"
                style={{ width: '400px', marginBottom: 0, marginTop: 0 }}
              />

              {searchInput && (
                <Button
                  onClick={() => setSearchInput('')}
                  variant="secondary"
                  size="sm"
                >
                  Clear Search
                </Button>
              )}
            </>
          }
          emptyMessage="No items found"
          resetKey={location.pathname}
        />

        {/* Optional: Pagination for server-side pagination */}
      </div>

      {/* Modals */}
    </div>
  );
};
```

## Key Components

### 1. Page Structure
- **Outer container**: `padding: 'var(--space-4)'`, `maxWidth: '100%'`, `margin: '0'`
- **Card container**: White background, rounded corners, border

### 2. Page Title Section
- **Padding**: `'var(--space-2) var(--space-4)'`
- **Title format**: "All [Items]" (e.g., "All Users", "All Gauges")
- **Typography**: `fontSize: 'var(--font-size-xl)'`, `fontWeight: '600'`

### 3. Action Buttons Row
- **Background**: `'var(--color-gray-50)'`
- **Layout**: Flexbox with `justifyContent: 'space-between'`
- **Left side**: Primary actions (Add button, status buttons)
- **Right side**: Column management controls

### 4. Column Management Pattern
```tsx
const columnManager = useColumnManager('unique-table-id', columns);
const dataTableResetRef = useRef<(() => void) | null>(null);

// In action buttons row:
{!columnManager.isEditMode ? (
  <Button onClick={() => columnManager.toggleEditMode()}>Columns</Button>
) : (
  <>
    <Button onClick={() => columnManager.toggleEditMode()}>Done</Button>
    <Button onClick={() => dataTableResetRef.current?.()}>Reset Columns</Button>
  </>
)}

// In DataTable props:
externalEditMode={columnManager.isEditMode}
onResetColumns={(resetFn) => { dataTableResetRef.current = resetFn; }}
```

### 5. Search Pattern
- **Location**: Inside DataTable's `leftControls` prop
- **Width**: `400px`
- **Icon**: Search icon
- **Clear button**: Show when search input has value

### 6. DataTable Configuration
```tsx
<DataTable
  tableId="unique-id"
  columns={columns}
  data={data}
  columnManager={columnManager}
  disablePagination={true}          // If using external pagination
  disableColumnControls={true}       // Using external controls
  externalEditMode={columnManager.isEditMode}
  onResetColumns={(resetFn) => { dataTableResetRef.current = resetFn; }}
  leftControls={<>Search components</>}
  resetKey={location.pathname}
/>
```

## Important Notes

### Logger in useCallback Dependencies
**Do NOT include `logger` in useCallback dependency arrays** as it creates infinite loops:

```tsx
// ❌ WRONG - Creates infinite loop
const loadData = useCallback(async () => {
  logger.errorWithStack('Error', error);
}, [logger]);

// ✅ CORRECT - Suppress ESLint warning
const loadData = useCallback(async () => {
  logger.errorWithStack('Error', error);
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

### Column Definitions
- Always wrap columns in `useMemo` to prevent recreation
- Include dependencies that affect column rendering (callbacks, state)
- Use `locked: true` for columns that shouldn't be hidden

### Table ID
- Use unique, descriptive IDs (e.g., 'user-management', 'gauge-list')
- Same ID used for columnManager and DataTable
- Persists column preferences per table

## Examples
- **User Management**: `/frontend/src/modules/admin/pages/UserManagement.tsx`
- **Gauge List**: `/frontend/src/modules/gauge/pages/GaugeList.tsx`
- **My Gauges**: `/frontend/src/modules/gauge/pages/MyGauges.tsx`
