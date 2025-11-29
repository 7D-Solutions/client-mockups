// Global route monitor for module boundary detection and filter reset
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useGaugeActions } from '../store';

/**
 * RouteMonitor component that detects module boundary crossings
 * and resets module-specific state (filters, etc.) when users navigate
 * away from a module via sidebar.
 *
 * Behavior:
 * - Within module navigation (back button) → State PERSISTS
 * - Cross-module navigation (sidebar) → State RESETS
 */
export const RouteMonitor: React.FC = () => {
  const location = useLocation();
  const previousPathRef = useRef<string | null>(null);
  const gaugeActions = useGaugeActions();

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;

    // Skip check on initial mount
    if (!previousPath) {
      previousPathRef.current = currentPath;
      return;
    }

    // Detect module transitions
    const getModule = (path: string) => {
      if (path.startsWith('/gauges')) return 'gauge';
      if (path.startsWith('/admin')) return 'admin';
      if (path.startsWith('/inventory')) return 'inventory';
      if (path.startsWith('/user')) return 'user';
      return null;
    };

    const previousModule = getModule(previousPath);
    const currentModule = getModule(currentPath);

    // Reset filters when leaving a module
    if (previousModule && previousModule !== currentModule) {
      switch (previousModule) {
        case 'gauge':
          // Clear all gauge filters when leaving gauge module
          gaugeActions.clearGaugeFilters();
          // Also clear DataTable localStorage persistence
          localStorage.removeItem('my-gauges-filters');
          localStorage.removeItem('gauge-list-filters');
          break;
        case 'inventory':
          // Clear DataTable localStorage for inventory pages
          localStorage.removeItem('storage-locations-filters');
          localStorage.removeItem('location-gauges-filters');
          localStorage.removeItem('location-tools-filters');
          localStorage.removeItem('location-parts-filters');
          localStorage.removeItem('inventory-dashboard-filters');
          break;
        // Add other modules here as needed
        // case 'admin':
        //   adminActions.clearAdminFilters();
        //   break;
      }
    }

    // Update previous path for next comparison
    previousPathRef.current = currentPath;
  }, [location.pathname, gaugeActions]);

  // This component doesn't render anything
  return null;
};
