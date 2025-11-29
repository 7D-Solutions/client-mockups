// Gauge filtering and sorting hook
import { useMemo } from 'react';
import { useGaugeContext } from '../context';
import { useAuth } from '../../../infrastructure';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { PermissionRules } from '../../../infrastructure/business/permissionRules';
import type { Gauge, GaugeFilters } from '../types';

export const useGaugeFilters = () => {
  const { 
    filters, 
    sortBy, 
    sortOrder, 
    updateFilters, 
    setSort 
  } = useGaugeContext();
  
  const { user } = useAuth();
  // Following the same pattern as Pending QC visibility - admin only
  const isAdmin = PermissionRules.isAdmin(user);

  // Apply filters to gauge list
  const applyFilters = useMemo(() => {
    return (gauges: Gauge[]): Gauge[] => {
      let filtered = gauges;
      
      // Hide Large Equipment and Calibration Standards from non-Admin users
      // Following the same pattern as Pending QC visibility
      if (!isAdmin) {
        filtered = filtered.filter(gauge => 
          gauge.equipment_type !== 'large_equipment' && 
          gauge.equipment_type !== 'calibration_standard'
        );
      }

      // Status filter
      if (filters.status) {
        filtered = filtered.filter(gauge => gauge.status === filters.status);
      }

      // Category filter
      if (filters.category) {
        filtered = filtered.filter(gauge => gauge['equipment_type'] === filters.category);
      }

      // Storage Location filter
      if (filters.storage_location) {
        filtered = filtered.filter(gauge => gauge.storage_location === filters.storage_location);
      }

      // Search filter (name, gauge_id, displayName, notes)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(gauge => 
          gauge.name.toLowerCase().includes(searchTerm) ||
          gauge.gauge_id.toLowerCase().includes(searchTerm) ||
          (gauge.displayName || '').toLowerCase().includes(searchTerm) ||
          (gauge.notes && gauge.notes.toLowerCase().includes(searchTerm))
        );
      }

      // Visibility filter (complete sets only vs all)
      if (filters.visibility === 'complete') {
        // Show only complete sets (non-spare gauges)
        filtered = filtered.filter(gauge => !gauge.is_spare);
      }

      // Ownership type filter
      if (filters.ownershipType) {
        filtered = filtered.filter(gauge => gauge.ownership_type === filters.ownershipType);
      }

      // Manufacturer filter
      if (filters.manufacturer) {
        filtered = filtered.filter(gauge => gauge.manufacturer === filters.manufacturer);
      }

      // Calibration status filter
      if (filters.calibrationStatus) {
        filtered = filtered.filter(gauge => gauge.calibration_status === filters.calibrationStatus);
      }

      // Calibration date range filter
      if (filters.calibrationStartDate || filters.calibrationEndDate) {
        filtered = filtered.filter(gauge => {
          if (!gauge.calibration_due_date) return false;
          
          const dueDate = new Date(gauge.calibration_due_date);
          const startDate = filters.calibrationStartDate ? new Date(filters.calibrationStartDate) : null;
          const endDate = filters.calibrationEndDate ? new Date(filters.calibrationEndDate) : null;
          
          if (startDate && dueDate < startDate) return false;
          if (endDate && dueDate > endDate) return false;
          
          return true;
        });
      }

      // Sealed status filter
      if (filters.sealedStatus) {
        const isSealed = filters.sealedStatus === 'sealed';
        filtered = filtered.filter(gauge => {
          // Handle both number (0/1) and boolean values
          const gaugeSealed = StatusRules.isSealed(gauge);
          return gaugeSealed === isSealed;
        });
      }

      // Equipment type filter
      if (filters.equipment_type) {
        filtered = filtered.filter(gauge => gauge['equipment_type'] === filters.equipment_type);
      }

      return filtered;
    };
  }, [filters, isAdmin]);

  // Apply sorting to gauge list
  const applySorting = useMemo(() => {
    return (gauges: Gauge[]): Gauge[] => {
      const sorted = [...gauges].sort((a, b) => {
        let aValue: unknown = a[sortBy as keyof Gauge];
        let bValue: unknown = b[sortBy as keyof Gauge];

        // Handle nested properties
        if (sortBy === 'holder.name') {
          aValue = a.holder?.name || '';
          bValue = b.holder?.name || '';
        }

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortOrder === 'asc' ? -1 : 1;
        if (bValue == null) return sortOrder === 'asc' ? 1 : -1;

        // String comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortOrder === 'asc' ? comparison : -comparison;
        }

        // Number comparison
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          const comparison = aValue - bValue;
          return sortOrder === 'asc' ? comparison : -comparison;
        }

        // Date comparison
        if (aValue instanceof Date || bValue instanceof Date) {
          const aTime = new Date(aValue).getTime();
          const bTime = new Date(bValue).getTime();
          const comparison = aTime - bTime;
          return sortOrder === 'asc' ? comparison : -comparison;
        }

        // Default string comparison
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      return sorted;
    };
  }, [sortBy, sortOrder]);

  // Combined filter and sort function
  const processGauges = useMemo(() => {
    return (gauges: Gauge[]): Gauge[] => {
      // First, remove duplicates based on gauge ID
      const uniqueGauges = gauges.filter((gauge, index, self) => {
        return index === self.findIndex(g => g.gauge_id === gauge.gauge_id);
      });
      
      const filtered = applyFilters(uniqueGauges);
      const sorted = applySorting(filtered);
      return sorted;
    };
  }, [applyFilters, applySorting]);

  // Filter options for UI
  const getFilterOptions = useMemo(() => {
    return (gauges: Gauge[]) => {
      const statuses = [...new Set(gauges.map(g => g.status))];
      const categories = [...new Set(gauges.map(g => g.equipment_type))];
      const locations = [...new Set(gauges.map(g => g.storage_location))];

      return {
        statuses: statuses.sort(),
        categories: categories.sort(),
        locations: locations.sort(),
      };
    };
  }, []);

  // Clear all filters
  const clearFilters = () => {
    updateFilters({
      status: undefined,
      category: undefined,
      storage_location: undefined,
      search: undefined,
      visibility: undefined,
      ownershipType: undefined,
      manufacturer: undefined,
      calibrationStatus: undefined,
      calibrationStartDate: undefined,
      calibrationEndDate: undefined,
      sealedStatus: undefined,
      equipment_type: undefined,
    });
  };

  // Set individual filter
  const setFilter = (key: keyof GaugeFilters, value: string | boolean | undefined) => {
    updateFilters({ [key]: value });
  };

  // Toggle sort order for same column
  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSort(column, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(column, 'asc');
    }
  };

  return {
    // Current filter/sort state
    filters,
    sortBy,
    sortOrder,
    
    // Processing functions
    processGauges,
    applyFilters,
    applySorting,
    getFilterOptions,
    
    // Actions
    setFilter,
    clearFilters,
    toggleSort,
    updateFilters,
    setSort,
  };
};