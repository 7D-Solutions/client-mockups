// Gauge module context provider
import { createContext, useContext, ReactNode } from 'react';
import { useGaugeState, useGaugeActions } from '../../../infrastructure/store';
import { eventBus } from '../../../infrastructure/events';
import type { GaugeFilters } from '../types';

// Event data types for gauge events
type GaugeEventData = {
  gaugeId?: string;
  gauge?: unknown;
  user?: string;
  [key: string]: unknown;
};

interface GaugeContextType {
  // State
  selectedGaugeId: string | null;
  filters: Partial<GaugeFilters>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  
  // Actions
  setSelectedGauge: (id: string | null) => void;
  updateFilters: (filters: Partial<GaugeFilters>) => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  
  // Events
  emitGaugeEvent: (event: string, data: GaugeEventData) => void;
}

const GaugeContext = createContext<GaugeContextType | undefined>(undefined);

export const GaugeProvider = ({ children }: { children: ReactNode }) => {
  const gaugeState = useGaugeState();
  const gaugeActions = useGaugeActions();

  const emitGaugeEvent = (event: string, data: GaugeEventData) => {
    eventBus.emit(event, data);
  };

  const value: GaugeContextType = {
    // State from Zustand store
    selectedGaugeId: gaugeState.selectedGaugeId,
    filters: gaugeState.filters,
    sortBy: gaugeState.sortBy,
    sortOrder: gaugeState.sortOrder,
    viewMode: gaugeState.viewMode,

    // Actions from Zustand store
    setSelectedGauge: gaugeActions.setSelectedGauge,
    updateFilters: gaugeActions.updateGaugeFilters,
    setSort: gaugeActions.setGaugeSort,
    setViewMode: gaugeActions.setGaugeViewMode,

    // Event emitter
    emitGaugeEvent,
  };

  return (
    <GaugeContext.Provider value={value}>
      {children}
    </GaugeContext.Provider>
  );
};

export const useGaugeContext = () => {
  const context = useContext(GaugeContext);
  if (context === undefined) {
    throw new Error('useGaugeContext must be used within a GaugeProvider');
  }
  return context;
};