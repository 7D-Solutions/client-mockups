/**
 * Gauge Display Helper
 *
 * Utility functions for displaying gauge identifiers.
 * Implements computed display logic for thread gauge sets.
 */

import { Gauge } from '../types';

/**
 * Get display ID for a gauge
 *
 * For unpaired gauges or non-thread equipment:
 *   Returns gauge_id (serial number or generated ID)
 *
 * For thread gauges in sets:
 *   Returns set_id with suffix (A/B or GO/NG based on user preference)
 *
 * @param gauge - Gauge object with gauge_id, set_id, and specifications
 * @param useLetter - User preference: true for A/B, false for GO/NG (default: true)
 * @returns Formatted display ID
 */
export function getGaugeDisplayId(gauge: Gauge, useLetter: boolean = true): string {
  // Unpaired or non-thread equipment - return gauge_id directly
  if (!gauge.set_id) {
    return gauge.gauge_id;
  }

  // Thread gauge in a set - add computed suffix
  const isGo = gauge.specifications?.is_go_gauge;

  if (useLetter) {
    // Letter format: SP1001A, SP1001B
    return `${gauge.set_id}${isGo ? 'A' : 'B'}`;
  } else {
    // Word format: SP1001 GO, SP1001 NG
    return `${gauge.set_id} ${isGo ? 'GO' : 'NG'}`;
  }
}

/**
 * Get display format preference from user settings
 * TODO: Integrate with actual user settings/preferences system
 *
 * @returns User preference for display format
 */
export function getDisplayFormatPreference(): 'letter' | 'word' {
  // TODO: Get from user settings
  // For now, default to 'letter'
  return 'letter';
}

/**
 * Format gauge display ID using user preference
 *
 * @param gauge - Gauge object
 * @returns Formatted display ID based on user preference
 */
export function formatGaugeDisplayId(gauge: Gauge): string {
  const preference = getDisplayFormatPreference();
  return getGaugeDisplayId(gauge, preference === 'letter');
}
