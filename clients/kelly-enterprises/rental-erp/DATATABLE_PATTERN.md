# DataTable Usage Pattern

**Required Pattern for All DataTable Usages**

## 1. Imports
```tsx
import { DataTable, useColumnManager } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
```

## 2. Define Columns (before component render)
```tsx
const columns: DataTableColumn[] = [
  {
    id: 'column1',
    label: 'COLUMN 1',
    visible: true,
    locked: false,
    align: 'left',
    render: (value, row) => <span>{value}</span>
  },
  // ... more columns
];
```

## 3. Create Column Manager (after columns definition)
```tsx
const columnManager = useColumnManager('unique-table-id', columns);
```

## 4. Use DataTable Component
```tsx
<DataTable
  tableId="unique-table-id"          // Must match columnManager id
  columns={columns}                   // Original column definitions (with render functions)
  columnManager={columnManager}       // Column manager instance (required)
  data={yourData}
  // ... other props
/>
```

## Key Points
- ✅ **columns** = original definitions WITH render functions
- ✅ **columnManager** = state manager (visibility, order)
- ✅ **tableId** must match the id used in useColumnManager
- ✅ DataTable uses columns for render functions, columnManager for state
- ❌ Never pass columnManager.columns to DataTable (loses render functions)

## Working Example (GaugeList.tsx:243-644)
```tsx
// Step 1: Imports (line 8)
import { DataTable, useColumnManager } from '../../../infrastructure';
import type { DataTableColumn } from '../../../infrastructure';

// Step 2: Define columns with useMemo (line 243)
const columns: DataTableColumn[] = useMemo(() => [
  {
    id: 'displayId',
    label: 'GAUGE ID',
    locked: true,
    render: (value) => <span>{value || '-'}</span>
  },
  // ... more columns
], [dependencies]);

// Step 3: Create column manager (line 460)
const columnManager = useColumnManager('gauge-list', columns);

// Step 4: Use DataTable (line 630)
<DataTable
  tableId="gauge-list"
  columns={columns}
  columnManager={columnManager}
  data={groupedGauges}
  onRowClick={handleRowClick}
  // ... other props
/>
```

## Result
- Single columnManager instance per table
- No duplicate API calls
- Column persistence works across pages and devices
- All functionality preserved (render functions, filters, sorting)
