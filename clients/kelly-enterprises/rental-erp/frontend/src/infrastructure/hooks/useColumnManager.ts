import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';
import { userPreferencesService } from '../services/userPreferencesService';

export interface Column {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface UseColumnManagerReturn {
  columns: Column[];
  isEditMode: boolean;
  toggleEditMode: () => void;
  handleDragStart: (e: React.DragEvent<HTMLTableCellElement>, index: number) => void;
  handleDragOver: (e: React.DragEvent<HTMLTableCellElement>, index: number) => void;
  handleDrop: (e: React.DragEvent<HTMLTableCellElement>, index: number) => void;
  handleDragEnd: () => void;
  toggleVisibility: (id: string) => void;
  resetToDefault: () => void;
  getColumnVisibility: (columnId: string) => boolean;
  dragState: {
    draggedIndex: number | null;
    targetIndex: number | null;
  };
}

/**
 * Column management hook for table customization
 *
 * Provides drag-to-reorder and show/hide functionality for table columns
 * with backend API persistence for cross-device synchronization.
 *
 * @param tableId - Unique identifier for the table (used for preference key)
 * @param defaultColumns - Default column configuration
 * @returns Column manager interface
 */
export function useColumnManager(
  tableId: string,
  defaultColumns: Column[]
): UseColumnManagerReturn {
  const [columns, setColumns] = useState<Column[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [pendingVisibility, setPendingVisibility] = useState<Record<string, boolean>>({});

  // Capture the original defaults on mount - THIS is what reset should restore
  // Ensure all columns have a visible property (default to true if not specified)
  const [originalDefaults] = useState<Column[]>(
    defaultColumns.map(col => ({
      ...col,
      visible: col.visible !== undefined ? col.visible : true
    }))
  );

  // Load configuration from user preferences (backend API only)
  useEffect(() => {
    const preferenceKey = `column-config-${tableId}`;
    let isCancelled = false;

    const loadConfig = async () => {
      logger.debug('💾 LOAD: Attempting to load column config from backend API');
      logger.debug('💾 LOAD: Preference key:', preferenceKey);

      try {
        // Load from backend API only (no localStorage)
        const saved = await userPreferencesService.getPreference<Column[]>(preferenceKey, null);

        if (isCancelled) return; // Component unmounted

        if (saved && Array.isArray(saved)) {
          logger.debug('💾 LOAD: Got config from API:', saved.map(c => `${c.id}:${c.visible ? '✓' : '✗'}`).join(', '));

          // Validate: check if saved column IDs match current column IDs
          const savedIds = saved.map(c => c.id).sort();
          const defaultIds = originalDefaults.map(c => c.id).sort();

          logger.debug('💾 LOAD: Saved IDs:', savedIds.join(', '));
          logger.debug('💾 LOAD: Default IDs:', defaultIds.join(', '));

          const idsMatch = savedIds.length === defaultIds.length &&
            savedIds.every((id, index) => id === defaultIds[index]);

          logger.debug('💾 LOAD: IDs match?', idsMatch);

          if (idsMatch) {
            logger.debug('💾 LOAD: ✅ Loading saved configuration from API');
            setColumns(saved);
            return;
          } else {
            logger.debug('💾 LOAD: ❌ ID mismatch - using defaults');
          }
        } else {
          logger.debug('💾 LOAD: No saved config in API - using defaults');
        }
      } catch (error) {
        if (isCancelled) return;
        logger.warn(`💾 LOAD: ❌ Error loading config:`, error);
      }

      // Use defaults if nothing else worked
      if (!isCancelled) {
        logger.debug('💾 LOAD: Setting columns to originalDefaults');
        setColumns(originalDefaults);
      }
    };

    loadConfig();

    return () => {
      isCancelled = true;
    };
  }, [tableId, originalDefaults]);

  // Save configuration to user preferences (backend API only - syncs across devices)
  const saveConfig = useCallback((newColumns: Column[]) => {
    const preferenceKey = `column-config-${tableId}`;
    logger.debug('💾 SAVE: Saving column config to backend API');
    logger.debug('💾 SAVE: Preference key:', preferenceKey);
    logger.debug('💾 SAVE: Config to save:', newColumns.map(c => `${c.id}:${c.visible ? '✓' : '✗'}`).join(', '));

    // Save to backend API only (debounced automatically)
    userPreferencesService.savePreference(preferenceKey, newColumns);
    logger.debug('💾 SAVE: ✅ Queued for save to backend');
  }, [tableId]);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => {
      const newMode = !prev;

      if (!newMode) {
        // Exiting edit mode → apply visibility changes ONLY if there are changes
        if (Object.keys(pendingVisibility).length > 0) {
          const updatedColumns = columns.map(col => ({
            ...col,
            visible: pendingVisibility[col.id] ?? col.visible
          }));

          setColumns(updatedColumns);
          saveConfig(updatedColumns);
        }
        setPendingVisibility({});
      } else {
        // Entering edit mode → capture current visibility state
        const visibilityMap: Record<string, boolean> = {};
        columns.forEach(col => {
          visibilityMap[col.id] = col.visible;
        });
        setPendingVisibility(visibilityMap);
      }

      return newMode;
    });
  }, [columns, pendingVisibility, saveConfig]);

  // Toggle column visibility (apply immediately)
  const toggleVisibility = useCallback(async (id: string) => {
    const currentVisibility = pendingVisibility[id] ?? columns.find(c => c.id === id)?.visible ?? true;
    const newVisibility = !currentVisibility;

    logger.debug('Toggle column visibility', { columnId: id, currentVisibility, newVisibility });

    // Update pending visibility for edit mode display
    setPendingVisibility(prev => ({
      ...prev,
      [id]: newVisibility
    }));

    // Apply immediately to actual columns
    const updatedColumns = columns.map(col =>
      col.id === id ? { ...col, visible: newVisibility } : col
    );

    logger.debug('Updated columns', {
      columns: updatedColumns.map(c => `${c.id}:${c.visible ? 'visible' : 'hidden'}`).join(', ')
    });

    setColumns(updatedColumns);

    // Save immediately without debouncing (visibility changes need instant persistence)
    const preferenceKey = `column-config-${tableId}`;
    await userPreferencesService.savePreference(preferenceKey, updatedColumns, true);
  }, [columns, pendingVisibility, tableId]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent<HTMLTableCellElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLTableCellElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex !== null && draggedIndex !== index) {
      setTargetIndex(index);
    }
  }, [draggedIndex]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLTableCellElement>, index: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setTargetIndex(null);
      return;
    }

    // Reorder columns
    const newColumns = [...columns];
    const [draggedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedColumn);

    logger.debug('Column reordered', {
      oldOrder: columns.map((c, i) => `[${i}]${c.id}`).join(' → '),
      newOrder: newColumns.map((c, i) => `[${i}]${c.id}`).join(' → ')
    });

    setColumns(newColumns);
    saveConfig(newColumns);

    setDraggedIndex(null);
    setTargetIndex(null);
  }, [draggedIndex, columns, saveConfig]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setTargetIndex(null);
  }, []);

  // Reset to defaults
  const resetToDefault = useCallback(async () => {
    logger.debug('Reset columns to default');

    // Force a new array reference to ensure React detects the change
    const resetColumns = originalDefaults.map(col => ({ ...col }));

    setColumns(resetColumns);
    setPendingVisibility({});

    // Save immediately without debouncing
    const preferenceKey = `column-config-${tableId}`;

    // Clear any pending debounced saves first (they have stale data)
    userPreferencesService.clearAllPending();

    // Now save the reset
    await userPreferencesService.savePreference(preferenceKey, resetColumns, true);

    logger.debug('Reset columns complete');
  }, [originalDefaults, tableId]);

  // Get the current visibility state (pending if in edit mode, actual otherwise)
  const getColumnVisibility = useCallback((columnId: string) => {
    const pendingValue = pendingVisibility[columnId];
    const columnValue = columns.find(c => c.id === columnId)?.visible;
    const result = isEditMode
      ? (pendingValue ?? columnValue ?? true)
      : (columnValue ?? true);

    return result;
  }, [isEditMode, pendingVisibility, columns]);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      // Flush any pending saves when component unmounts
      userPreferencesService.flushPendingSaves();
    };
  }, []);

  // CRITICAL FIX: Use useRef to maintain stable object reference
  // React re-renders when props change by reference equality
  // DataTable's useEffect depends on columnManager.resetToDefault
  // Returning new object every render triggers infinite loop
  const returnValueRef = useRef<UseColumnManagerReturn>({
    columns,
    isEditMode,
    toggleEditMode,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    toggleVisibility,
    resetToDefault,
    getColumnVisibility,
    dragState: {
      draggedIndex,
      targetIndex
    }
  });

  // Update all properties including callbacks to avoid stale closures
  // This is safe because DataTable will be updated to not depend on callback refs in useEffect
  returnValueRef.current.columns = columns;
  returnValueRef.current.isEditMode = isEditMode;
  returnValueRef.current.toggleEditMode = toggleEditMode;
  returnValueRef.current.handleDragStart = handleDragStart;
  returnValueRef.current.handleDragOver = handleDragOver;
  returnValueRef.current.handleDrop = handleDrop;
  returnValueRef.current.handleDragEnd = handleDragEnd;
  returnValueRef.current.toggleVisibility = toggleVisibility;
  returnValueRef.current.resetToDefault = resetToDefault;
  returnValueRef.current.getColumnVisibility = getColumnVisibility;
  returnValueRef.current.dragState.draggedIndex = draggedIndex;
  returnValueRef.current.dragState.targetIndex = targetIndex;

  return returnValueRef.current;
}
