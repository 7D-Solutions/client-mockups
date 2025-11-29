// DataTable - Standardized table component with column management, filtering, sorting, and pagination
import { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Pagination } from './Pagination';
import { DateRangePicker, type DateRange } from './DateRangePicker';
import { useColumnManager, type Column, type UseColumnManagerReturn } from '../hooks';
import { logger } from '../utils/logger';
import styles from '../hooks/useColumnManager.module.css';

export interface DataTableColumn<T = unknown> extends Column {
  /** Custom render function for cell content */
  render?: (value: unknown, row: T) => React.ReactNode;
  /** Enable filtering for this column */
  filterable?: boolean;
  /** Filter type: 'text' (default) or 'date' for calendar picker */
  filterType?: 'text' | 'date';
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Custom sort function */
  sortFn?: (a: T, b: T, direction: 'asc' | 'desc') => number;
  /** Custom filter function for text filters */
  filterFn?: (value: unknown, filterValue: string, row: T) => boolean;
  /** Custom date filter function */
  dateFilterFn?: (value: unknown, range: DateRange, row: T) => boolean;
}

export interface DataTableProps<T = unknown> {
  /** Unique identifier for localStorage persistence */
  tableId: string;
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Data array */
  data: T[];
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Items per page (default: 50) */
  itemsPerPage?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Show pagination (default: true) */
  showPagination?: boolean;
  /** Hide bottom pagination/count info (useful for hierarchical tables) */
  hideBottomInfo?: boolean;
  /** Additional CSS class for table */
  className?: string;
  /** Custom styles for table container */
  containerStyle?: React.CSSProperties;
  /**
   * Optional key for forcing table remount and filter reset
   * Filters automatically reset on page navigation (component unmount)
   * Use this prop only if you need explicit filter clearing without unmounting
   */
  resetKey?: string | number;
  /** Custom content to render on the left side of pagination row */
  leftControls?: React.ReactNode;
  /** Disable built-in column controls (for external control) */
  disableColumnControls?: boolean;
  /** External edit mode state (for external column control) */
  externalEditMode?: boolean;
  /** Callback to receive DataTable's reset function reference */
  onResetColumns?: (resetFn: () => void) => void;
  /** Column manager instance (required - create with useColumnManager hook) */
  columnManager: UseColumnManagerReturn;
}

export function DataTable<T = unknown>({
  tableId,
  columns,
  data,
  onRowClick,
  itemsPerPage = 50,
  isLoading = false,
  emptyMessage = 'No items found',
  showPagination = true,
  hideBottomInfo = false,
  className = '',
  containerStyle = {},
  resetKey,
  leftControls,
  disableColumnControls = false,
  externalEditMode = false,
  onResetColumns,
  columnManager
}: DataTableProps<T>) {
  // Load persisted filters from localStorage on mount
  const getPersistedFilters = () => {
    try {
      const stored = localStorage.getItem(`${tableId}-filters`);
      if (!stored) {
        return { columnFilters: {}, dateRangeFilters: {} };
      }

      const parsed = JSON.parse(stored);

      // Convert date strings back to Date objects
      const dateRangeFilters: {[key: string]: DateRange} = {};
      if (parsed.dateRangeFilters) {
        Object.keys(parsed.dateRangeFilters).forEach(key => {
          const range = parsed.dateRangeFilters[key];
          dateRangeFilters[key] = {
            start: range.start ? new Date(range.start) : null,
            end: range.end ? new Date(range.end) : null
          };
        });
      }

      return {
        columnFilters: parsed.columnFilters || {},
        dateRangeFilters
      };
    } catch {
      return { columnFilters: {}, dateRangeFilters: {} };
    }
  };

  const persistedFilters = getPersistedFilters();
  const [columnFilters, setColumnFilters] = useState<{[key: string]: {value: string, mode: string}}>(persistedFilters.columnFilters);
  const [dateRangeFilters, setDateRangeFilters] = useState<{[key: string]: DateRange}>(persistedFilters.dateRangeFilters);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Determine effective edit mode (external or internal)
  const isEditMode = disableColumnControls ? externalEditMode : columnManager.isEditMode;

  // Expose reset function to external controls via callback
  // Use useRef to avoid depending on callback reference (which changes on every render)
  const resetCallbackRef = useRef(onResetColumns);
  resetCallbackRef.current = onResetColumns;

  useEffect(() => {
    if (resetCallbackRef.current) {
      logger.debug('DataTable: Passing resetToDefault function to parent');
      // Pass DataTable's reset function to parent via callback
      resetCallbackRef.current(() => columnManager.resetToDefault());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    const filtersToSave = {
      columnFilters,
      dateRangeFilters
    };
    localStorage.setItem(`${tableId}-filters`, JSON.stringify(filtersToSave));
  }, [columnFilters, dateRangeFilters, tableId]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [columnFilters, dateRangeFilters]);

  // Reset filters when resetKey changes (optional explicit reset)
  useEffect(() => {
    if (resetKey !== undefined) {
      setColumnFilters({});
      setDateRangeFilters({});
      setCurrentPage(1);
      // Clear persisted filters from localStorage
      localStorage.removeItem(`${tableId}-filters`);
    }
  }, [resetKey, tableId]);

  // Handle column sort
  const handleSort = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (!column?.sortable && column?.sortable !== undefined) return;

    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  // Handle column filter
  const handleColumnFilter = (columnId: string, value: string, mode: string = 'contains') => {
    setColumnFilters(prev => ({
      ...prev,
      [columnId]: { value, mode }
    }));
  };

  // Handle date range filter
  const handleDateRangeFilter = (columnId: string, range: DateRange) => {
    setDateRangeFilters(prev => ({
      ...prev,
      [columnId]: range
    }));
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setColumnFilters({});
    setDateRangeFilters({});
    localStorage.removeItem(`${tableId}-filters`);
  };

  // Check if any filters are active
  const hasActiveFilters = Object.keys(columnFilters).some(key => columnFilters[key]?.value) ||
    Object.keys(dateRangeFilters).some(key => dateRangeFilters[key]?.start || dateRangeFilters[key]?.end);

  // Get cell value from row based on column id
  const getCellValue = <R extends T>(row: R, columnId: string): unknown => {
    // Support dot notation for nested properties (e.g., 'location.name')
    const keys = columnId.split('.');
    let value: unknown = row;
    for (const key of keys) {
      value = (value as Record<string, unknown>)?.[key];
      if (value === undefined) break;
    }
    return value;
  };

  // Apply column filters
  const filteredData = data.filter(row => {
    // Check text filters
    const passesTextFilters = Object.entries(columnFilters).every(([columnId, filter]) => {
      if (!filter.value) return true;

      const column = columns.find(c => c.id === columnId);

      // Use custom filter function if provided
      if (column?.filterFn) {
        return column.filterFn(getCellValue(row, columnId), filter.value, row);
      }

      // Default string-based filtering
      const cellValue = String(getCellValue(row, columnId) || '').toLowerCase();
      const filterValue = filter.value.toLowerCase();

      switch(filter.mode) {
        case 'contains':
          return cellValue.includes(filterValue);
        case 'startsWith':
          return cellValue.startsWith(filterValue);
        case 'equals':
          return cellValue === filterValue;
        case 'notContains':
          return !cellValue.includes(filterValue);
        default:
          return true;
      }
    });

    // Check date range filters
    const passesDateFilters = Object.entries(dateRangeFilters).every(([columnId, range]) => {
      if (!range.start && !range.end) return true;

      const column = columns.find(c => c.id === columnId);
      const cellValue = getCellValue(row, columnId);

      // Use custom date filter function if provided
      if (column?.dateFilterFn) {
        return column.dateFilterFn(cellValue, range, row);
      }

      // Default date range filtering
      // Try to parse the value as a date
      let date: Date | null = null;
      if (cellValue instanceof Date) {
        date = cellValue;
      } else if (typeof cellValue === 'string' && cellValue) {
        date = new Date(cellValue);
      }

      if (!date || isNaN(date.getTime())) return false;

      // Check if date is within range
      if (range.start && date < range.start) return false;
      if (range.end && date > range.end) return false;

      return true;
    });

    return passesTextFilters && passesDateFilters;
  });

  // Sort data
  const sortedData = sortColumn
    ? [...filteredData].sort((a, b) => {
        const column = columns.find(c => c.id === sortColumn);

        // Use custom sort function if provided
        if (column?.sortFn) {
          return column.sortFn(a, b, sortDirection);
        }

        // Default sorting
        const aVal = getCellValue(a, sortColumn);
        const bVal = getCellValue(b, sortColumn);

        // Handle numbers
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Handle dates
        if (aVal instanceof Date && bVal instanceof Date) {
          return sortDirection === 'asc'
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime();
        }

        // String comparison
        const comparison = String(aVal || '').localeCompare(String(bVal || ''));
        return sortDirection === 'asc' ? comparison : -comparison;
      })
    : filteredData;

  // Paginate the results
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Render cell content
  const renderCell = <R extends T>(column: DataTableColumn<R>, row: R): React.ReactNode => {
    const value = getCellValue(row, column.id);

    // Use custom render function if provided
    if (column.render) {
      return column.render(value, row);
    }

    // Default rendering
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    // Format dates
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    return String(value);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Pagination and Controls Row */}
      {showPagination && (
        <div style={{
          paddingLeft: 'var(--space-4)',
          paddingRight: 'var(--space-4)',
          paddingTop: leftControls ? 'var(--space-2)' : '0',
          paddingBottom: isEditMode ? '35px' : 'var(--space-2)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-gray-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          overflow: 'visible'
        }}>
          {/* Left: Search and controls */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {leftControls}

            {!columnManager.isEditMode && hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClearAllFilters();
                }}
                title="Clear all active filters"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Right: Column controls and pagination */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
            {/* Column controls on top */}
            {!disableColumnControls && (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button
                  variant={columnManager.isEditMode ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    columnManager.toggleEditMode();
                  }}
                  title={columnManager.isEditMode ? 'Done editing columns' : 'Customize columns'}
                >
                  {columnManager.isEditMode ? '✓ Done' : '⚙️ Columns'}
                </Button>

                {columnManager.isEditMode && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      columnManager.resetToDefault();
                    }}
                    title="Reset columns to default"
                  >
                    Reset Columns
                  </Button>
                )}
              </div>
            )}

            {/* Pagination below */}
            {sortedData.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={sortedData.length}
                itemsPerPage={itemsPerPage}
              />
            )}
          </div>
        </div>
      )}

      {/* Table Section */}
      <div style={{ padding: '0', position: 'relative' }}>
        <div style={{
          overflowX: 'auto',
          paddingTop: isEditMode ? '50px' : '0',
          marginTop: isEditMode ? '-50px' : '0'
        }}>
          <table className={`${styles.columnManagedTable} ${isEditMode ? styles.editMode : ''} ${className}`}>
            <thead>
              {/* Column Headers */}
              <tr>
                {columnManager.columns.filter(col => isEditMode || col.visible).map((col, idx) => {
                  const column = columns.find(c => c.id === col.id);
                  const isSortable = column?.sortable !== false; // Sortable by default

                  return (
                    <th
                      key={col.id}
                      data-column={col.id}
                      className={`${styles.columnHeader} ${col.locked ? styles.locked : styles.draggable} ${styles[col.align || 'left']} ${columnManager.dragState.draggedIndex === idx ? styles.dragging : ''} ${columnManager.dragState.targetIndex === idx ? styles.dropTarget : ''}`}
                      style={{
                        cursor: col.locked ? 'default' : (isEditMode ? 'move' : 'pointer'),
                        userSelect: 'none',
                        padding: 'var(--space-2) var(--space-3)',
                        textAlign: col.align || 'left'
                      }}
                      onClick={() => !isEditMode && isSortable && handleSort(col.id)}
                      draggable={isEditMode && !col.locked}
                      onDragStart={(e) => !col.locked && columnManager.handleDragStart(e, idx)}
                      onDragOver={(e) => !col.locked && columnManager.handleDragOver(e, idx)}
                      onDrop={(e) => !col.locked && columnManager.handleDrop(e, idx)}
                      onDragEnd={columnManager.handleDragEnd}
                    >
                      {isEditMode && !col.locked && (
                        <div className={styles.headerCheckbox}>
                          <input
                            type="checkbox"
                            checked={columnManager.getColumnVisibility(col.id)}
                            onChange={() => columnManager.toggleVisibility(col.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label className={styles.headerCheckboxLabel}>👁️</label>
                        </div>
                      )}
                      {col.label} {!isEditMode && isSortable && sortColumn === col.id && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                  );
                })}
              </tr>

              {/* Filter Row */}
              {!isEditMode && (
                <tr style={{ backgroundColor: 'var(--color-gray-50)' }}>
                  {columnManager.columns.filter(col => col.visible).map(col => {
                    const column = columns.find(c => c.id === col.id);
                    const isFilterable = column?.filterable !== false; // Filterable by default
                    const filterType = column?.filterType || 'text';

                    return (
                      <th key={col.id} style={{ padding: 'var(--space-2)' }}>
                        {isFilterable && filterType === 'text' && (
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={columnFilters[col.id]?.value || ''}
                            onChange={(e) => handleColumnFilter(col.id, e.target.value, 'contains')}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px'
                            }}
                          />
                        )}
                        {isFilterable && filterType === 'date' && (
                          <DateRangePicker
                            value={dateRangeFilters[col.id] || { start: null, end: null }}
                            onChange={(range) => handleDateRangeFilter(col.id, range)}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              )}
            </thead>

            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnManager.columns.filter(c => isEditMode || c.visible).length}
                    style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-gray-500)' }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr
                    key={index}
                    onClick={() => onRowClick?.(row)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {columnManager.columns.filter(col => isEditMode || col.visible).map(col => {
                      const column = columns.find(c => c.id === col.id);
                      return (
                        <td
                          key={col.id}
                          data-column={col.id}
                          className={styles[col.align || 'left']}
                          style={{ textAlign: col.align || 'left' }}
                        >
                          {renderCell(column!, row)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        {showPagination && !hideBottomInfo && sortedData.length > 0 && (
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--color-gray-50)'
          }}>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
              Showing {sortedData.length} item{sortedData.length !== 1 ? 's' : ''}
              {sortedData.length !== data.length && ` (filtered from ${data.length})`}
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={sortedData.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
