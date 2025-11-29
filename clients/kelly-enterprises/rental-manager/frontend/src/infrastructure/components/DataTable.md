# DataTable Component

**Standardized table component with column management, filtering, sorting, and pagination**

## Overview

The `DataTable` component is the platform's centralized solution for all table-based interfaces. It provides consistent UX, column customization, filtering, sorting, and pagination out of the box.

## Key Features

- ✅ **Column Management**: Drag-and-drop reordering, show/hide columns, reset to defaults
- ✅ **Filtering**: Per-column filtering with customizable filter functions
- ✅ **Sorting**: Click-to-sort with custom sort functions
- ✅ **Pagination**: Built-in pagination with configurable items per page
- ✅ **Persistence**: Column preferences saved to localStorage
- ✅ **Custom Rendering**: Custom render functions for any column
- ✅ **Responsive**: Works across all screen sizes
- ✅ **Accessible**: Keyboard navigation and screen reader support

## Basic Usage

```tsx
import { DataTable, DataTableColumn } from '../../infrastructure/components';

const columns: DataTableColumn[] = [
  { id: 'id', label: 'ID', visible: true, locked: true },
  { id: 'name', label: 'Name', visible: true },
  { id: 'status', label: 'Status', visible: true, align: 'center' }
];

function MyPage() {
  const [data, setData] = useState([]);

  return (
    <DataTable
      tableId="my-unique-table"
      columns={columns}
      data={data}
      onRowClick={(row) => console.log('Clicked:', row)}
    />
  );
}
```

## Column Configuration

### Basic Column Properties

```tsx
interface DataTableColumn {
  id: string;              // Unique column identifier (supports dot notation for nested properties)
  label: string;           // Display label in header
  visible: boolean;        // Initial visibility
  locked?: boolean;        // Prevent hiding/reordering (typically for ID column)
  align?: 'left' | 'center' | 'right';  // Text alignment
  filterable?: boolean;    // Enable/disable filtering (default: true)
  sortable?: boolean;      // Enable/disable sorting (default: true)

  // Advanced customization
  render?: (value: any, row: any) => React.ReactNode;
  sortFn?: (a: any, b: any, direction: 'asc' | 'desc') => number;
  filterFn?: (value: any, filterValue: string, row: any) => boolean;
}
```

## Advanced Examples

### Custom Cell Rendering

```tsx
const columns: DataTableColumn[] = [
  {
    id: 'status',
    label: 'Status',
    visible: true,
    render: (value, row) => (
      <Badge variant={value === 'active' ? 'success' : 'warning'}>
        {value}
      </Badge>
    )
  },
  {
    id: 'location',
    label: 'Location',
    visible: true,
    render: (value, row) => (
      <span
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/location/${value}`);
        }}
        style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
      >
        {value}
      </span>
    )
  }
];
```

### Custom Sorting

```tsx
const columns: DataTableColumn[] = [
  {
    id: 'quantity',
    label: 'Quantity',
    visible: true,
    sortFn: (a, b, direction) => {
      const aQty = a.quantity || 0;
      const bQty = b.quantity || 0;
      return direction === 'asc' ? aQty - bQty : bQty - aQty;
    }
  },
  {
    id: 'date',
    label: 'Date',
    visible: true,
    sortFn: (a, b, direction) => {
      const aDate = new Date(a.date).getTime();
      const bDate = new Date(b.date).getTime();
      return direction === 'asc' ? aDate - bDate : bDate - aDate;
    }
  }
];
```

### Custom Filtering

```tsx
const columns: DataTableColumn[] = [
  {
    id: 'date',
    label: 'Last Moved',
    visible: true,
    render: (value) => value ? new Date(value).toLocaleDateString() : '-',
    filterFn: (value, filterValue, row) => {
      if (!value) return false;
      const dateStr = new Date(value).toLocaleDateString().toLowerCase();
      return dateStr.includes(filterValue.toLowerCase());
    }
  },
  {
    id: 'tags',
    label: 'Tags',
    visible: true,
    filterFn: (value, filterValue, row) => {
      // Filter array of tags
      const tags = Array.isArray(value) ? value : [];
      return tags.some(tag =>
        tag.toLowerCase().includes(filterValue.toLowerCase())
      );
    }
  }
];
```

### Nested Properties (Dot Notation)

```tsx
const columns: DataTableColumn[] = [
  { id: 'user.name', label: 'User Name', visible: true },
  { id: 'location.building', label: 'Building', visible: true },
  { id: 'metadata.created_by', label: 'Created By', visible: true }
];

const data = [
  {
    id: 1,
    user: { name: 'John Doe' },
    location: { building: 'Building A' },
    metadata: { created_by: 'admin' }
  }
];
```

## Props Reference

### DataTableProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tableId` | `string` | *required* | Unique identifier for localStorage persistence |
| `columns` | `DataTableColumn[]` | *required* | Column definitions |
| `data` | `T[]` | *required* | Array of data objects |
| `onRowClick` | `(row: T) => void` | `undefined` | Row click handler |
| `itemsPerPage` | `number` | `50` | Number of items per page |
| `isLoading` | `boolean` | `false` | Show loading state |
| `emptyMessage` | `string` | `'No items found'` | Message when data is empty |
| `showPagination` | `boolean` | `true` | Show/hide pagination controls |
| `className` | `string` | `''` | Additional CSS class for table |
| `containerStyle` | `CSSProperties` | `{}` | Custom styles for container |

## Migration Guide

### Before (Manual Implementation)

```tsx
function OldInventoryPage() {
  const [columns, setColumns] = useState([...]);
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ column: null, direction: 'asc' });
  const [page, setPage] = useState(1);

  // 200+ lines of filter logic, sort logic, pagination logic...

  return (
    <table>
      <thead>
        {/* Manual column headers, checkboxes, drag/drop... */}
      </thead>
      <tbody>
        {/* Manual rendering, filtering, sorting... */}
      </tbody>
    </table>
  );
}
```

### After (DataTable Component)

```tsx
import { DataTable, DataTableColumn, Badge } from '../../infrastructure/components';

function NewInventoryPage() {
  const [items, setItems] = useState([]);

  const columns: DataTableColumn[] = [
    { id: 'id', label: 'ITEM ID', visible: true, locked: true, align: 'center' },
    { id: 'name', label: 'ITEM NAME', visible: true, align: 'left' },
    {
      id: 'type',
      label: 'TYPE',
      visible: true,
      align: 'center',
      render: (value) => (
        <Badge variant={value === 'gauge' ? 'info' : 'secondary'}>
          {value}
        </Badge>
      )
    },
    { id: 'location', label: 'LOCATION', visible: true, align: 'center' },
    { id: 'quantity', label: 'QUANTITY', visible: true, align: 'center' }
  ];

  return (
    <DataTable
      tableId="inventory-dashboard"
      columns={columns}
      data={items}
      onRowClick={(item) => navigate(`/item/${item.id}`)}
    />
  );
}
```

## Filter Management

### Automatic Filter Persistence

**Filters automatically persist across navigation** using localStorage. When you apply filters and navigate away, those filters remain active when you return to the page.

This provides a seamless user experience:

```tsx
// User on Inventory page with filters applied
// → Clicks on a filtered item to view details
// → Navigates to detail page
// → Clicks back to return to Inventory page
// → Filters are still active ✅
```

**Storage Key**: Filters are stored in localStorage using the pattern `{tableId}-filters`, which includes both text filters and date range filters.

### Clear Filters Button

A "Clear Filters" button automatically appears next to "Customize Columns" when any filters are active. This button:
- Clears all active text filters
- Clears all active date range filters
- Removes persisted filters from localStorage
- Resets the table to show all data

```tsx
// User clicks "Clear Filters" button
// → All filters immediately clear
// → localStorage entry is removed
// → Table shows all unfiltered data
```

### Programmatic Filter Reset (Optional)

If you need to reset filters programmatically (rare), use the `resetKey` prop:

```tsx
function MyPage() {
  const [resetCounter, setResetCounter] = useState(0);

  const handleResetFilters = () => {
    setResetCounter(prev => prev + 1); // Increment to trigger reset
  };

  return (
    <>
      <button onClick={handleResetFilters}>Reset Everything</button>
      <DataTable
        tableId="my-table"
        columns={columns}
        data={data}
        resetKey={resetCounter} // Change this value to reset filters
      />
    </>
  );
}
```

**Note**: Most pages don't need `resetKey` - the built-in "Clear Filters" button handles user-initiated resets.

## Best Practices

### 1. Unique Table IDs
Each table instance needs a unique `tableId` for localStorage persistence:
```tsx
<DataTable tableId="inventory-dashboard" ... />
<DataTable tableId="gauge-list" ... />
<DataTable tableId="storage-locations" ... />
```

### 2. Lock Important Columns
Always lock ID columns to prevent accidental hiding:
```tsx
{ id: 'id', label: 'ID', visible: true, locked: true }
```

### 3. Provide Custom Renderers
Use custom renderers for complex data types:
```tsx
{
  id: 'status',
  label: 'Status',
  visible: true,
  render: (value, row) => <StatusBadge status={value} />
}
```

### 4. Optimize Filter Functions
Keep filter functions simple for performance:
```tsx
filterFn: (value, filterValue) => {
  return String(value).toLowerCase().includes(filterValue.toLowerCase());
}
```

### 5. Handle Click Events Properly
Stop propagation for nested interactive elements:
```tsx
render: (value, row) => (
  <button onClick={(e) => {
    e.stopPropagation(); // Prevent row click
    handleAction(row);
  }}>
    Action
  </button>
)
```

## Performance Considerations

- **Large Datasets**: DataTable handles filtering and sorting client-side. For datasets >1000 rows, consider server-side pagination.
- **Custom Render Functions**: Keep render functions pure and avoid heavy computations.
- **Filter Functions**: Avoid expensive operations in filter functions as they run on every keystroke.

## Styling

DataTable uses the existing `useColumnManager.module.css` for consistent styling across the platform. All spacing uses CSS variables:

- `var(--space-2)`, `var(--space-3)`, `var(--space-4)` - Consistent padding
- `var(--color-border)` - Border colors
- `var(--color-gray-50)` - Background colors
- `var(--color-primary)` - Interactive elements

## Accessibility

- ✅ Keyboard navigation for all interactive elements
- ✅ ARIA labels for screen readers
- ✅ Focus indicators for column headers and controls
- ✅ Semantic HTML structure

## Future Enhancements

- [ ] Server-side pagination support
- [ ] Export to CSV/Excel
- [ ] Column width resizing
- [ ] Row selection (checkboxes)
- [ ] Bulk actions
- [ ] Advanced filter UI (dropdowns, date pickers)
- [ ] Column groups/nested headers
- [ ] Virtual scrolling for very large datasets
