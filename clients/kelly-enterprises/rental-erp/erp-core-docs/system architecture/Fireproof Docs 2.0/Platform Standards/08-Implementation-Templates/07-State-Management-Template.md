# Zustand State Management Template

**Category**: Implementation Templates
**Purpose**: Standard template for creating Zustand store slices
**Last Updated**: 2025-11-07

---

## Overview

This template provides the standard structure for creating Zustand state management slices in the Fire-Proof ERP application. Zustand provides lightweight, flexible state management without the boilerplate of Redux.

**When to Use**:
- Module-level state management
- Shared state across components
- Complex state logic
- Persistent state
- Cross-module communication

**Location Pattern**:
- Global store: `/frontend/src/infrastructure/store/index.ts`
- Module stores: `/frontend/src/modules/{module}/store/`

---

## Basic Store Slice Template

### Module Store Structure

**File**: `/frontend/src/modules/{module}/store/index.ts`

```typescript
import { create } from 'zustand';
import type { Item, ItemFilter } from '../types';

/**
 * Module state interface
 *
 * TODO: Add comprehensive state documentation
 */
interface ModuleState {
  // Data state
  items: Item[];
  selectedItemId: string | null;
  selectedItem: Item | null;

  // UI state
  loading: boolean;
  error: string | null;

  // Filter state
  filters: ItemFilter;
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // Modal state
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;

  // Cache
  cache: {
    items: Record<string, Item>;
    lastFetch: number | null;
  };
}

/**
 * Module actions interface
 *
 * TODO: Add comprehensive action documentation
 */
interface ModuleActions {
  // Data actions
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  updateItem: (itemId: string, updates: Partial<Item>) => void;
  removeItem: (itemId: string) => void;

  // Selection actions
  selectItem: (itemId: string | null) => void;
  setSelectedItem: (item: Item | null) => void;

  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Filter actions
  setFilters: (filters: Partial<ItemFilter>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;

  // Modal actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (itemId: string) => void;
  closeEditModal: () => void;
  openDeleteModal: (itemId: string) => void;
  closeDeleteModal: () => void;

  // Cache actions
  cacheItem: (item: Item) => void;
  getCachedItem: (itemId: string) => Item | undefined;
  invalidateCache: () => void;

  // Reset action
  reset: () => void;
}

/**
 * Combined module store type
 */
export type ModuleStore = ModuleState & ModuleActions;

/**
 * Initial state
 */
const initialState: ModuleState = {
  // Data
  items: [],
  selectedItemId: null,
  selectedItem: null,

  // UI
  loading: false,
  error: null,

  // Filters
  filters: {},
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',

  // Modals
  isCreateModalOpen: false,
  isEditModalOpen: false,
  isDeleteModalOpen: false,

  // Cache
  cache: {
    items: {},
    lastFetch: null
  }
};

/**
 * Module Zustand store
 *
 * TODO: Add store description explaining:
 * - Purpose
 * - Primary use cases
 * - Data flow
 * - Cache strategy
 */
export const useModuleStore = create<ModuleStore>((set, get) => ({
  ...initialState,

  // Data actions
  setItems: (items) =>
    set({
      items,
      cache: {
        ...get().cache,
        lastFetch: Date.now()
      }
    }),

  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
      cache: {
        ...state.cache,
        items: {
          ...state.cache.items,
          [item.id]: item
        }
      }
    })),

  updateItem: (itemId, updates) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
      selectedItem: state.selectedItem?.id === itemId
        ? { ...state.selectedItem, ...updates }
        : state.selectedItem,
      cache: {
        ...state.cache,
        items: {
          ...state.cache.items,
          [itemId]: {
            ...state.cache.items[itemId],
            ...updates
          }
        }
      }
    })),

  removeItem: (itemId) =>
    set((state) => {
      const { [itemId]: removed, ...remainingCache } = state.cache.items;

      return {
        items: state.items.filter((item) => item.id !== itemId),
        selectedItemId: state.selectedItemId === itemId ? null : state.selectedItemId,
        selectedItem: state.selectedItem?.id === itemId ? null : state.selectedItem,
        cache: {
          ...state.cache,
          items: remainingCache
        }
      };
    }),

  // Selection actions
  selectItem: (itemId) =>
    set((state) => ({
      selectedItemId: itemId,
      selectedItem: itemId
        ? state.items.find((item) => item.id === itemId) || state.cache.items[itemId] || null
        : null
    })),

  setSelectedItem: (item) =>
    set({
      selectedItem: item,
      selectedItemId: item?.id || null
    }),

  // UI actions
  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // Filter actions
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    })),

  clearFilters: () =>
    set({
      filters: {},
      searchQuery: ''
    }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

  // Modal actions
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),

  openEditModal: (itemId) =>
    set((state) => ({
      isEditModalOpen: true,
      selectedItemId: itemId,
      selectedItem: state.items.find((item) => item.id === itemId) || state.cache.items[itemId] || null
    })),

  closeEditModal: () =>
    set({
      isEditModalOpen: false,
      selectedItemId: null,
      selectedItem: null
    }),

  openDeleteModal: (itemId) =>
    set((state) => ({
      isDeleteModalOpen: true,
      selectedItemId: itemId,
      selectedItem: state.items.find((item) => item.id === itemId) || state.cache.items[itemId] || null
    })),

  closeDeleteModal: () =>
    set({
      isDeleteModalOpen: false,
      selectedItemId: null,
      selectedItem: null
    }),

  // Cache actions
  cacheItem: (item) =>
    set((state) => ({
      cache: {
        ...state.cache,
        items: {
          ...state.cache.items,
          [item.id]: item
        }
      }
    })),

  getCachedItem: (itemId) => get().cache.items[itemId],

  invalidateCache: () =>
    set({
      cache: {
        items: {},
        lastFetch: null
      }
    }),

  // Reset action
  reset: () => set(initialState)
}));

/**
 * Selector hooks for optimized component re-renders
 */

// Data selectors
export const useItems = () => useModuleStore((state) => state.items);
export const useSelectedItem = () => useModuleStore((state) => state.selectedItem);
export const useItemById = (itemId: string | null) =>
  useModuleStore((state) =>
    itemId ? state.items.find((item) => item.id === itemId) || state.cache.items[itemId] : null
  );

// UI selectors
export const useLoading = () => useModuleStore((state) => state.loading);
export const useError = () => useModuleStore((state) => state.error);

// Filter selectors
export const useFilters = () => useModuleStore((state) => state.filters);
export const useSearchQuery = () => useModuleStore((state) => state.searchQuery);
export const useSorting = () => useModuleStore((state) => ({
  sortBy: state.sortBy,
  sortOrder: state.sortOrder
}));

// Modal selectors
export const useModals = () => useModuleStore((state) => ({
  isCreateModalOpen: state.isCreateModalOpen,
  isEditModalOpen: state.isEditModalOpen,
  isDeleteModalOpen: state.isDeleteModalOpen
}));

// Filtered items selector
export const useFilteredItems = () =>
  useModuleStore((state) => {
    let filtered = [...state.items];

    // Apply search
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (state.filters.status) {
      filtered = filtered.filter((item) => item.status === state.filters.status);
    }
    // TODO: Add more filter conditions

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[state.sortBy as keyof Item];
      const bValue = b[state.sortBy as keyof Item];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return state.sortOrder === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return state.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return filtered;
  });

// Actions selector
export const useModuleActions = () =>
  useModuleStore((state) => ({
    setItems: state.setItems,
    addItem: state.addItem,
    updateItem: state.updateItem,
    removeItem: state.removeItem,
    selectItem: state.selectItem,
    setSelectedItem: state.setSelectedItem,
    setLoading: state.setLoading,
    setError: state.setError,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters,
    setSearchQuery: state.setSearchQuery,
    setSorting: state.setSorting,
    openCreateModal: state.openCreateModal,
    closeCreateModal: state.closeCreateModal,
    openEditModal: state.openEditModal,
    closeEditModal: state.closeEditModal,
    openDeleteModal: state.openDeleteModal,
    closeDeleteModal: state.closeDeleteModal,
    cacheItem: state.cacheItem,
    getCachedItem: state.getCachedItem,
    invalidateCache: state.invalidateCache,
    reset: state.reset
  }));
```

---

## Advanced Store Patterns

### Store with Persistence

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useModuleStore = create<ModuleStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions...
    }),
    {
      name: 'module-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),

      // Selective persistence
      partialize: (state) => ({
        filters: state.filters,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
        // Don't persist items, loading, error
      })
    }
  )
);
```

### Store with Immer (Immutable Updates)

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useModuleStore = create<ModuleStore>()(
  immer((set) => ({
    ...initialState,

    // With immer, you can mutate state directly
    updateItem: (itemId, updates) =>
      set((state) => {
        const item = state.items.find((i) => i.id === itemId);
        if (item) {
          Object.assign(item, updates);
        }

        if (state.selectedItem?.id === itemId) {
          Object.assign(state.selectedItem, updates);
        }
      }),

    addItem: (item) =>
      set((state) => {
        state.items.push(item);
        state.cache.items[item.id] = item;
      })
  }))
);
```

### Store with Devtools

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useModuleStore = create<ModuleStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Actions with named updates for devtools
      setItems: (items) =>
        set({ items }, false, 'setItems'),

      addItem: (item) =>
        set(
          (state) => ({ items: [...state.items, item] }),
          false,
          'addItem'
        )
    }),
    {
      name: 'ModuleStore',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);
```

### Store with Async Actions

```typescript
import { create } from 'zustand';
import { apiClient } from '../../../infrastructure/api/client';
import type { Item } from '../types';

interface ModuleStore extends ModuleState {
  // Async actions
  fetchItems: () => Promise<void>;
  createItem: (data: CreateItemData) => Promise<Item>;
  updateItemAsync: (itemId: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
}

export const useModuleStore = create<ModuleStore>((set, get) => ({
  ...initialState,

  fetchItems: async () => {
    set({ loading: true, error: null });

    try {
      const response = await apiClient.get<Item[]>('/api/items');

      set({
        items: response.data,
        loading: false,
        cache: {
          ...get().cache,
          lastFetch: Date.now()
        }
      });

    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch items'
      });
    }
  },

  createItem: async (data) => {
    set({ loading: true, error: null });

    try {
      const response = await apiClient.post<Item>('/api/items', data);
      const newItem = response.data;

      set((state) => ({
        items: [...state.items, newItem],
        loading: false,
        cache: {
          ...state.cache,
          items: {
            ...state.cache.items,
            [newItem.id]: newItem
          }
        }
      }));

      return newItem;

    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create item'
      });
      throw error;
    }
  },

  updateItemAsync: async (itemId, updates) => {
    set({ loading: true, error: null });

    try {
      const response = await apiClient.patch<Item>(`/api/items/${itemId}`, updates);
      const updatedItem = response.data;

      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId ? updatedItem : item
        ),
        selectedItem: state.selectedItem?.id === itemId ? updatedItem : state.selectedItem,
        loading: false,
        cache: {
          ...state.cache,
          items: {
            ...state.cache.items,
            [itemId]: updatedItem
          }
        }
      }));

    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update item'
      });
      throw error;
    }
  },

  deleteItem: async (itemId) => {
    set({ loading: true, error: null });

    try {
      await apiClient.delete(`/api/items/${itemId}`);

      set((state) => {
        const { [itemId]: removed, ...remainingCache } = state.cache.items;

        return {
          items: state.items.filter((item) => item.id !== itemId),
          selectedItemId: state.selectedItemId === itemId ? null : state.selectedItemId,
          selectedItem: state.selectedItem?.id === itemId ? null : state.selectedItem,
          loading: false,
          cache: {
            ...state.cache,
            items: remainingCache
          }
        };
      });

    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to delete item'
      });
      throw error;
    }
  }
}));
```

---

## Usage in Components

### Basic Usage

```typescript
import React, { useEffect } from 'react';
import { useModuleStore, useItems, useLoading, useModuleActions } from '../store';

export const ItemList: React.FC = () => {
  // Using selectors (optimized)
  const items = useItems();
  const loading = useLoading();
  const { setItems, openCreateModal } = useModuleActions();

  // Or access everything (less optimized)
  const store = useModuleStore();

  useEffect(() => {
    // Load items
    loadItems();
  }, []);

  const loadItems = async () => {
    // Load and set items
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <Button onClick={openCreateModal}>Create Item</Button>
      {items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};
```

### With Async Actions

```typescript
import React, { useEffect } from 'react';
import { useModuleStore } from '../store';
import { LoadingSpinner, Button } from '../../../infrastructure/components';

export const ItemList: React.FC = () => {
  const {
    items,
    loading,
    error,
    fetchItems,
    deleteItem,
    openCreateModal
  } = useModuleStore();

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (itemId: string) => {
    try {
      await deleteItem(itemId);
      // Automatically updates store
    } catch (error) {
      // Error already set in store
      console.error('Delete failed');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <Alert type="error">{error}</Alert>;
  }

  return (
    <div>
      <Button onClick={openCreateModal}>Create</Button>
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.name}</span>
          <Button onClick={() => handleDelete(item.id)}>Delete</Button>
        </div>
      ))}
    </div>
  );
};
```

---

## Best Practices

### 1. Use Selectors

```typescript
// ❌ BAD - Component re-renders on any state change
const { items, loading, error, filters, modals } = useModuleStore();

// ✅ GOOD - Component only re-renders when items change
const items = useItems();
```

### 2. Group Related Actions

```typescript
// ✅ GOOD - Logically grouped actions
const useModuleActions = () =>
  useModuleStore((state) => ({
    // Data mutations
    setItems: state.setItems,
    addItem: state.addItem,
    updateItem: state.updateItem,

    // UI actions
    openCreateModal: state.openCreateModal,
    closeCreateModal: state.closeCreateModal
  }));
```

### 3. Cache Strategy

```typescript
// ✅ GOOD - Smart caching
cacheItem: (item) =>
  set((state) => ({
    cache: {
      ...state.cache,
      items: {
        ...state.cache.items,
        [item.id]: item
      },
      lastFetch: Date.now()
    }
  })),

// Check cache freshness
const isCacheFresh = () => {
  const { cache } = get();
  if (!cache.lastFetch) return false;

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  return Date.now() - cache.lastFetch < CACHE_TTL;
};
```

### 4. Reset State on Unmount

```typescript
useEffect(() => {
  return () => {
    // Reset store when component unmounts (optional)
    useModuleStore.getState().reset();
  };
}, []);
```

---

## Checklist

- [ ] State interface defined with types
- [ ] Actions interface defined
- [ ] Initial state configured
- [ ] All CRUD actions implemented
- [ ] Selector hooks created for optimization
- [ ] Cache strategy implemented
- [ ] Loading/error states handled
- [ ] Modal states managed
- [ ] Filter/sort logic implemented
- [ ] Reset action included
- [ ] Async actions (if needed) implemented
- [ ] Persistence (if needed) configured

---

## Reference

### Related Documentation

- [State Management](../01-Frontend-Standards/02-State-Management.md)
- [Component Template](./05-Component-Template.md)
- [Page Template](./06-Page-Template.md)

### Zustand Documentation

- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Zustand Middleware](https://github.com/pmndrs/zustand#middleware)

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
