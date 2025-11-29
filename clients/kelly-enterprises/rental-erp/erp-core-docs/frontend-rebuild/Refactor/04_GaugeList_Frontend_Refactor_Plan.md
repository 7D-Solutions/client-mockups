# GaugeList.tsx Refactoring Plan

**Status**: High Priority - 762 lines
**Priority**: #4
**Location**: `frontend/src/modules/gauge/pages/GaugeList.tsx`

---

## Problem Analysis

**Massive Component**:
- 762 lines in single component
- Too many responsibilities
- Difficult to understand and maintain
- High cognitive load
- Poor component reusability

**Responsibilities Identified**:
1. State management (filters, pagination, selection)
2. Data fetching and caching
3. Category/tab switching
4. Bulk operations
5. Modal management
6. Table rendering
7. Filter UI
8. Pagination UI

---

## Refactoring Strategy

### Component Hierarchy

```
GaugeList.tsx (762 lines)
├── GaugeList.tsx (main orchestrator - ~150 lines)
├── components/
│   ├── GaugeListHeader.tsx (header with filters - ~120 lines)
│   ├── GaugeListToolbar.tsx (bulk actions, tabs - ~100 lines)
│   ├── GaugeListTable.tsx (table body - ~180 lines)
│   └── GaugeListFooter.tsx (pagination - ~80 lines)
└── hooks/
    ├── useGaugeFilters.ts (filter state - ~80 lines)
    ├── useGaugeSelection.ts (selection state - ~100 lines)
    └── useGaugeTabs.ts (tab/category state - ~60 lines)
```

---

## File 1: useGaugeFilters.ts (Custom Hook)

**Purpose**: Centralize filter state management

```typescript
// frontend/src/modules/gauge/hooks/useGaugeFilters.ts

import { useState, useCallback } from 'react';
import { useGaugeContext } from '../context';

export interface GaugeFilters {
  search?: string;
  status?: string;
  category?: string;
  equipmentType?: string;
  ownershipType?: string;
  ownerId?: number;
}

export function useGaugeFilters(initialFilters: GaugeFilters = {}) {
  const { filters: contextFilters, updateFilters } = useGaugeContext();
  const [localFilters, setLocalFilters] = useState<GaugeFilters>(initialFilters);

  const updateFilter = useCallback((key: keyof GaugeFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    updateFilters(newFilters);
  }, [localFilters, updateFilters]);

  const clearFilters = useCallback(() => {
    setLocalFilters({});
    updateFilters({});
  }, [updateFilters]);

  const resetFilters = useCallback(() => {
    setLocalFilters(initialFilters);
    updateFilters(initialFilters);
  }, [initialFilters, updateFilters]);

  const setMultipleFilters = useCallback((filters: Partial<GaugeFilters>) => {
    const newFilters = { ...localFilters, ...filters };
    setLocalFilters(newFilters);
    updateFilters(newFilters);
  }, [localFilters, updateFilters]);

  return {
    filters: localFilters,
    updateFilter,
    clearFilters,
    resetFilters,
    setMultipleFilters,
    hasActiveFilters: Object.keys(localFilters).length > 0
  };
}
```

**Lines**: ~80

---

## File 2: useGaugeSelection.ts (Custom Hook)

**Purpose**: Handle bulk selection state

```typescript
// frontend/src/modules/gauge/hooks/useGaugeSelection.ts

import { useState, useCallback, useMemo } from 'react';
import type { Gauge } from '../types';

export function useGaugeSelection(gauges: Gauge[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const selectedGauges = useMemo(() => {
    return gauges.filter(g => selectedIds.has(g.system_gauge_id || g.gauge_id));
  }, [gauges, selectedIds]);

  const isSelected = useCallback((gaugeId: string) => {
    return selectedIds.has(gaugeId);
  }, [selectedIds]);

  const toggleSelection = useCallback((gaugeId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(gaugeId)) {
        next.delete(gaugeId);
      } else {
        next.add(gaugeId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = gauges.map(g => g.system_gauge_id || g.gauge_id);
    setSelectedIds(new Set(allIds));
  }, [gauges]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === gauges.length) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [selectedIds.size, gauges.length, selectAll, deselectAll]);

  const enterBulkMode = useCallback(() => {
    setBulkMode(true);
  }, []);

  const exitBulkMode = useCallback(() => {
    setBulkMode(false);
    deselectAll();
  }, [deselectAll]);

  return {
    selectedIds,
    selectedGauges,
    selectedCount: selectedIds.size,
    bulkMode,
    isSelected,
    toggleSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,
    enterBulkMode,
    exitBulkMode,
    isAllSelected: selectedIds.size === gauges.length && gauges.length > 0,
    isPartiallySelected: selectedIds.size > 0 && selectedIds.size < gauges.length
  };
}
```

**Lines**: ~100

---

## File 3: useGaugeTabs.ts (Custom Hook)

**Purpose**: Handle category/tab state

```typescript
// frontend/src/modules/gauge/hooks/useGaugeTabs.ts

import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export type GaugeCategory = 'all' | 'thread' | 'large' | 'company' | 'employee';

export function useGaugeTabs(defaultCategory: GaugeCategory = 'all') {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = (searchParams.get('tab') as GaugeCategory) || defaultCategory;

  const [activeCategory, setActiveCategory] = useState<GaugeCategory>(tabFromUrl);

  const changeCategory = useCallback((category: GaugeCategory) => {
    setActiveCategory(category);

    // Update URL
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.set('tab', category);
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  }, [navigate, location]);

  const getCategoryFilters = useCallback((category: GaugeCategory) => {
    switch (category) {
      case 'thread':
        return { equipment_type: 'thread_gauge' };
      case 'large':
        return { equipment_type: 'large_equipment' };
      case 'company':
        return { equipment_type: 'hand_tool', ownership_type: 'company' };
      case 'employee':
        return { equipment_type: 'hand_tool', ownership_type: 'employee' };
      default:
        return {};
    }
  }, []);

  return {
    activeCategory,
    changeCategory,
    categoryFilters: getCategoryFilters(activeCategory)
  };
}
```

**Lines**: ~60

---

## File 4: GaugeListHeader.tsx (Component)

**Purpose**: Search, filters, and action buttons

```typescript
// frontend/src/modules/gauge/pages/GaugeList/components/GaugeListHeader.tsx

import { SearchInput, Button, Icon } from '../../../../infrastructure';
import { GaugeFilters } from '../../../components';
import type { GaugeFilters as GaugeFiltersType } from '../../../hooks/useGaugeFilters';

interface GaugeListHeaderProps {
  filters: GaugeFiltersType;
  onFilterChange: (key: keyof GaugeFiltersType, value: any) => void;
  onClearFilters: () => void;
  onCreateNew: () => void;
  onBulkModeToggle: () => void;
  bulkMode: boolean;
  hasActiveFilters: boolean;
}

export function GaugeListHeader({
  filters,
  onFilterChange,
  onClearFilters,
  onCreateNew,
  onBulkModeToggle,
  bulkMode,
  hasActiveFilters
}: GaugeListHeaderProps) {
  return (
    <div className="gauge-list-header">
      {/* Search */}
      <SearchInput
        value={filters.search || ''}
        onChange={(value) => onFilterChange('search', value)}
        placeholder="Search gauges..."
      />

      {/* Filters */}
      <GaugeFilters
        filters={filters}
        onChange={onFilterChange}
      />

      {/* Actions */}
      <div className="header-actions">
        {hasActiveFilters && (
          <Button
            variant="secondary"
            onClick={onClearFilters}
          >
            Clear Filters
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={onBulkModeToggle}
        >
          <Icon name={bulkMode ? 'check-square' : 'square'} />
          {bulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
        </Button>

        <Button
          variant="primary"
          onClick={onCreateNew}
        >
          <Icon name="plus" />
          Create Gauge
        </Button>
      </div>
    </div>
  );
}
```

**Lines**: ~120

---

## File 5: GaugeListToolbar.tsx (Component)

**Purpose**: Category tabs and bulk actions

```typescript
// frontend/src/modules/gauge/pages/GaugeList/components/GaugeListToolbar.tsx

import { Button, Badge } from '../../../../infrastructure';
import type { GaugeCategory } from '../../../hooks/useGaugeTabs';

interface GaugeListToolbarProps {
  activeCategory: GaugeCategory;
  onCategoryChange: (category: GaugeCategory) => void;
  categoryCounts: Record<GaugeCategory, number>;
  bulkMode: boolean;
  selectedCount: number;
  onBulkAction: (action: string) => void;
}

export function GaugeListToolbar({
  activeCategory,
  onCategoryChange,
  categoryCounts,
  bulkMode,
  selectedCount,
  onBulkAction
}: GaugeListToolbarProps) {
  const categories: { key: GaugeCategory; label: string }[] = [
    { key: 'all', label: 'All Gauges' },
    { key: 'thread', label: 'Thread' },
    { key: 'large', label: 'Large Equipment' },
    { key: 'company', label: 'Company Tools' },
    { key: 'employee', label: 'Employee Tools' }
  ];

  return (
    <div className="gauge-list-toolbar">
      {/* Category Tabs */}
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat.key}
            className={activeCategory === cat.key ? 'active' : ''}
            onClick={() => onCategoryChange(cat.key)}
          >
            {cat.label}
            <Badge>{categoryCounts[cat.key] || 0}</Badge>
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {bulkMode && selectedCount > 0 && (
        <div className="bulk-actions">
          <span>{selectedCount} selected</span>
          <Button onClick={() => onBulkAction('status')}>Update Status</Button>
          <Button onClick={() => onBulkAction('category')}>Change Category</Button>
          <Button onClick={() => onBulkAction('delete')} variant="danger">Delete</Button>
        </div>
      )}
    </div>
  );
}
```

**Lines**: ~100

---

## File 6: GaugeListTable.tsx (Component)

**Purpose**: Render gauge table rows

```typescript
// frontend/src/modules/gauge/pages/GaugeList/components/GaugeListTable.tsx

import { GaugeRow } from '../../../components';
import { LoadingSpinner } from '../../../../infrastructure';
import type { Gauge } from '../../../types';

interface GaugeListTableProps {
  gauges: Gauge[];
  isLoading: boolean;
  bulkMode: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (gaugeId: string) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onGaugeClick: (gauge: Gauge) => void;
  onAction: (action: string, gauge: Gauge) => void;
}

export function GaugeListTable({
  gauges,
  isLoading,
  bulkMode,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  isAllSelected,
  isPartiallySelected,
  onGaugeClick,
  onAction
}: GaugeListTableProps) {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (gauges.length === 0) {
    return (
      <div className="empty-state">
        <p>No gauges found</p>
      </div>
    );
  }

  return (
    <div className="gauge-table">
      <table>
        <thead>
          <tr>
            {bulkMode && (
              <th>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  indeterminate={isPartiallySelected}
                  onChange={onSelectAll}
                />
              </th>
            )}
            <th>ID</th>
            <th>Description</th>
            <th>Status</th>
            <th>Category</th>
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {gauges.map(gauge => (
            <GaugeRow
              key={gauge.id}
              gauge={gauge}
              bulkMode={bulkMode}
              isSelected={selectedIds.has(gauge.system_gauge_id || gauge.gauge_id)}
              onToggleSelection={() => onToggleSelection(gauge.system_gauge_id || gauge.gauge_id)}
              onClick={() => onGaugeClick(gauge)}
              onAction={(action) => onAction(action, gauge)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Lines**: ~180

---

## File 7: GaugeListFooter.tsx (Component)

**Purpose**: Pagination controls

```typescript
// frontend/src/modules/gauge/pages/GaugeList/components/GaugeListFooter.tsx

import { Pagination } from '../../../components';

interface GaugeListFooterProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function GaugeListFooter({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange
}: GaugeListFooterProps) {
  return (
    <div className="gauge-list-footer">
      <div className="results-info">
        Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      <div className="page-size-selector">
        <label>Per page:</label>
        <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
}
```

**Lines**: ~80

---

## File 8: GaugeList.tsx (Refactored Main Component)

**Purpose**: Orchestrate all sub-components

```typescript
// frontend/src/modules/gauge/pages/GaugeList.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGauges } from '../hooks/useGauges';
import { useGaugeFilters } from '../hooks/useGaugeFilters';
import { useGaugeSelection } from '../hooks/useGaugeSelection';
import { useGaugeTabs } from '../hooks/useGaugeTabs';
import { usePagination } from '../../../infrastructure/hooks/usePagination';
import { GaugeModalManager } from '../components';
import {
  GaugeListHeader,
  GaugeListToolbar,
  GaugeListTable,
  GaugeListFooter
} from './components';

export function GaugeList() {
  const navigate = useNavigate();
  const [selectedGauge, setSelectedGauge] = useState(null);
  const [modalType, setModalType] = useState(null);

  // Custom hooks for state management
  const { activeCategory, changeCategory, categoryFilters } = useGaugeTabs();
  const { filters, updateFilter, clearFilters, hasActiveFilters, setMultipleFilters } = useGaugeFilters();
  const pagination = usePagination({ moduleDefault: 'GAUGE_INVENTORY', preserveInUrl: true });

  // Combine filters
  const combinedFilters = {
    ...filters,
    ...categoryFilters,
    page: pagination.page,
    limit: pagination.limit
  };

  // Data fetching
  const { data, isLoading, refetch } = useGauges(combinedFilters);
  const gauges = data?.data || [];
  const paginationInfo = data?.pagination || { total: 0, totalPages: 0 };

  // Selection state
  const selection = useGaugeSelection(gauges);

  // Event handlers
  const handleCreateNew = () => {
    setModalType('create');
  };

  const handleGaugeClick = (gauge) => {
    navigate(`/gauges/${gauge.system_gauge_id}`);
  };

  const handleAction = (action, gauge) => {
    setSelectedGauge(gauge);
    setModalType(action);
  };

  const handleBulkAction = (action) => {
    setModalType(`bulk-${action}`);
  };

  const handleModalClose = () => {
    setModalType(null);
    setSelectedGauge(null);
    refetch();
  };

  return (
    <div className="gauge-list-page">
      <GaugeListHeader
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        onCreateNew={handleCreateNew}
        onBulkModeToggle={selection.bulkMode ? selection.exitBulkMode : selection.enterBulkMode}
        bulkMode={selection.bulkMode}
        hasActiveFilters={hasActiveFilters}
      />

      <GaugeListToolbar
        activeCategory={activeCategory}
        onCategoryChange={changeCategory}
        categoryCounts={{}}
        bulkMode={selection.bulkMode}
        selectedCount={selection.selectedCount}
        onBulkAction={handleBulkAction}
      />

      <GaugeListTable
        gauges={gauges}
        isLoading={isLoading}
        bulkMode={selection.bulkMode}
        selectedIds={selection.selectedIds}
        onToggleSelection={selection.toggleSelection}
        onSelectAll={selection.toggleSelectAll}
        isAllSelected={selection.isAllSelected}
        isPartiallySelected={selection.isPartiallySelected}
        onGaugeClick={handleGaugeClick}
        onAction={handleAction}
      />

      <GaugeListFooter
        currentPage={pagination.page}
        totalPages={paginationInfo.totalPages}
        totalItems={paginationInfo.total}
        pageSize={pagination.limit}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setLimit}
      />

      <GaugeModalManager
        isOpen={!!modalType}
        modalType={modalType}
        gauge={selectedGauge}
        onClose={handleModalClose}
      />
    </div>
  );
}
```

**Lines**: ~150

---

## Implementation Steps

### Step 1: Extract Custom Hooks
1. Create `useGaugeFilters.ts`
2. Create `useGaugeSelection.ts`
3. Create `useGaugeTabs.ts`
4. Test hooks independently

### Step 2: Create Sub-Components
1. Create `GaugeListHeader.tsx`
2. Create `GaugeListToolbar.tsx`
3. Create `GaugeListTable.tsx`
4. Create `GaugeListFooter.tsx`
5. Test components in isolation

### Step 3: Refactor Main Component
1. Update `GaugeList.tsx` to use hooks and sub-components
2. Remove inline logic
3. Test integrated component

---

## Benefits

### Before
- ❌ 762 lines in single file
- ❌ Mixed concerns
- ❌ Hard to understand
- ❌ Poor reusability

### After
- ✅ 150 lines in main component
- ✅ Clear separation of concerns
- ✅ Easy to understand
- ✅ Reusable hooks and components

---

## Acceptance Criteria

- ✅ Main component < 200 lines
- ✅ All functionality preserved
- ✅ Custom hooks tested
- ✅ Sub-components tested
- ✅ No prop drilling issues
- ✅ Performance maintained

---

**Status**: Ready for implementation
**Impact**: High - improves frontend maintainability
**Risk**: Medium - requires careful state management
