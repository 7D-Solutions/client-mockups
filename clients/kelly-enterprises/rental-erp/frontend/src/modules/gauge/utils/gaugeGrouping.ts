/**
 * Gauge grouping utilities
 * Shared logic for grouping gauges by set_id for consistent counting
 */

import { StatusRules } from '../../../infrastructure/business/statusRules';

interface Gauge {
  gauge_id: string;
  set_id?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Groups gauges by set_id and returns count of display items (sets + unpaired)
 * This matches the QCApprovalsModal display logic where:
 * - Gauges with same set_id = 1 item (the set)
 * - Gauges without set_id = 1 item each (spare/unpaired)
 */
export function getGroupedGaugeCount(gauges: Gauge[] | undefined): number {
  if (!gauges || gauges.length === 0) {
    return 0;
  }

  // Filter for pending QC if status field exists
  const pendingGauges = gauges.filter(g => !g.status || StatusRules.isPendingQC(g) || g.status === 'pending_qc');

  // Deduplicate
  const uniqueGauges = pendingGauges.filter((gauge, index, self) => {
    return index === self.findIndex(g => g.gauge_id === gauge.gauge_id);
  });

  // Group by set_id
  const groupedGauges = uniqueGauges.reduce((acc, gauge) => {
    if (gauge.set_id) {
      const setId = gauge.set_id;
      if (!acc.sets[setId]) {
        acc.sets[setId] = [];
      }
      acc.sets[setId].push(gauge);
    } else {
      acc.unpaired.push(gauge);
    }
    return acc;
  }, { sets: {} as Record<string, Gauge[]>, unpaired: [] as Gauge[] });

  // Count: number of sets + number of unpaired items
  const setCount = Object.keys(groupedGauges.sets).length;
  const unpairedCount = groupedGauges.unpaired.length;

  return setCount + unpairedCount;
}

/**
 * Groups gauges for display (used by modal)
 */
export function groupGaugesForDisplay(gauges: Gauge[] | undefined) {
  if (!gauges || gauges.length === 0) {
    return [];
  }

  // Filter for pending QC
  const pendingGauges = gauges.filter(g => StatusRules.isPendingQC(g));
  
  // Deduplicate
  const uniqueGauges = pendingGauges.filter((gauge, index, self) => {
    return index === self.findIndex(g => g.gauge_id === gauge.gauge_id);
  });

  // Group by set_id
  const groupedGauges = uniqueGauges.reduce((acc, gauge) => {
    if (gauge.set_id) {
      const setId = gauge.set_id;
      if (!acc.sets[setId]) {
        acc.sets[setId] = [];
      }
      acc.sets[setId].push(gauge);
    } else {
      acc.unpaired.push(gauge);
    }
    return acc;
  }, { sets: {} as Record<string, Gauge[]>, unpaired: [] as Gauge[] });

  // Create display items array
  return [
    ...Object.entries(groupedGauges.sets).map(([setId, gaugeList]) => {
      // Use first gauge as base, but aggregate critical properties
      const baseGauge = gaugeList[0];

      // Aggregate critical properties (most restrictive wins)
      // Note: is_sealed can be 0/1 (number) or boolean, so explicit check needed
      const isSealed = gaugeList.some(g => g.is_sealed === 1 || g.is_sealed === true);
      const hasPendingUnsealRequest = gaugeList.some(g => g.has_pending_unseal_request === 1 || g.has_pending_unseal_request === true);

      // Calibration: use earliest due date (most urgent)
      const calibrationDates = gaugeList
        .map(g => g.calibration_due_date)
        .filter(d => d)
        .sort();
      const earliestCalibrationDate = calibrationDates[0];

      // Calibration status: Expired > Due Soon > Current
      const statusPriority = { 'Expired': 3, 'Due Soon': 2, 'Current': 1 } as const;
      const worstCalibrationStatus = gaugeList.reduce((worst: any, g: any) => {
        if (!g.calibration_status) return worst;
        if (!worst) return g.calibration_status;
        return statusPriority[g.calibration_status as keyof typeof statusPriority] > statusPriority[worst as keyof typeof statusPriority] ? g.calibration_status : worst;
      }, null);

      return {
        _isSet: true,
        _setId: setId,
        _gauges: gaugeList,
        ...baseGauge,
        is_sealed: isSealed,
        has_pending_unseal_request: hasPendingUnsealRequest,
        calibration_due_date: earliestCalibrationDate || baseGauge.calibration_due_date,
        calibration_status: worstCalibrationStatus || baseGauge.calibration_status,
        gauge_id: setId,
        name: baseGauge.name
      };
    }),
    ...groupedGauges.unpaired
  ].sort((a, b) => {
    const aId = (a.gauge_id || '').toUpperCase();
    const bId = (b.gauge_id || '').toUpperCase();
    return aId.localeCompare(bId);
  });
}
