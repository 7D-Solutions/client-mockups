// Hook for gauge categorization
import { useMemo } from 'react';
import type { Gauge } from '../types';
import { categorizeGauges, deriveOwnershipType, deriveGaugeType } from '../utils/categorization';

export function useGaugeCategorization(gauges: Gauge[]) {
  const processedGauges = useMemo(() => {
    // Process gauges to ensure they have ownership_type and derived type
    return gauges.map(gauge => ({
      ...gauge,
      ownership_type: gauge.ownership_type || deriveOwnershipType(gauge),
      derived_type: deriveGaugeType(gauge) // Use derived_type for internal logic
    }));
  }, [gauges]);
  
  const categorized = useMemo(() => {
    return categorizeGauges(processedGauges);
  }, [processedGauges]);
  
  return {
    gauges: processedGauges,
    categorized
  };
}