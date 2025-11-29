/**
 * Shared Form Constants for Gauge Module
 *
 * Centralized constants used across gauge creation forms to ensure consistency
 * and provide a single source of truth for business rules.
 */

/**
 * Ownership types available across all equipment types
 * Used by: HandToolForm, LargeEquipmentForm, CalibrationStandardForm, etc.
 */
export const OWNERSHIP_TYPES = [
  { value: 'company', label: 'Company Owned' },
  { value: 'employee', label: 'Employee Owned' },
  { value: 'customer', label: 'Customer Owned' }
] as const;

/**
 * Ownership types specific to large equipment (no employee-owned)
 * Used by: LargeEquipmentForm
 */
export const LARGE_EQUIPMENT_OWNERSHIP_TYPES = [
  { value: 'company', label: 'Company Owned' },
  { value: 'customer', label: 'Customer Owned' }
] as const;

/**
 * Comprehensive measurement units for all equipment types
 * Used by: HandToolForm, LargeEquipmentForm, CalibrationStandardForm, etc.
 */
export const MEASUREMENT_UNITS = [
  // Length
  { value: 'inch', label: 'Inches' },
  { value: 'mm', label: 'Millimeters' },
  { value: 'cm', label: 'Centimeters' },
  { value: 'm', label: 'Meters' },
  { value: 'ft', label: 'Feet' },

  // Weight
  { value: 'lb', label: 'Pounds' },
  { value: 'kg', label: 'Kilograms' },

  // Angle
  { value: 'deg', label: 'Degrees' },

  // Pressure
  { value: 'psi', label: 'PSI' },
  { value: 'bar', label: 'Bar' }
] as const;

/**
 * Common measurement units for hand tools (precision measuring tools use inches or metric only)
 * Used by: HandToolForm
 */
export const COMMON_MEASUREMENT_UNITS = [
  { value: 'inch', label: 'Inches' },
  { value: 'mm', label: 'Millimeters' }
] as const;

/**
 * Hand tool types per specification
 * Used by: HandToolForm
 */
export const HAND_TOOL_TYPES = [
  { value: 'Caliper', label: 'Caliper' },
  { value: 'Micrometer', label: 'Micrometer' },
  { value: 'Depth Gauge', label: 'Depth Gauge' },
  { value: 'Bore Gauge', label: 'Bore Gauge' }
] as const;

/**
 * Hand tool format options (Digital or Dial)
 * Used by: HandToolForm
 */
export const HAND_TOOL_FORMATS = [
  { value: 'Digital', label: 'Digital' },
  { value: 'Dial', label: 'Dial' }
] as const;

/**
 * Resolution values for imperial measuring tools (smallest readable increment)
 * Organized from finest to coarsest precision
 * Used by: HandToolForm
 */
export const RESOLUTION_VALUES_IMPERIAL = [
  { value: 0.00005, label: '0.00005"' },
  { value: 0.0001, label: '0.0001"' },
  { value: 0.0005, label: '0.0005"' },
  { value: 0.001, label: '0.001"' },
  { value: 0.01, label: '0.01"' }
] as const;

/**
 * Resolution values for metric measuring tools (smallest readable increment)
 * Organized from finest to coarsest precision
 * Used by: HandToolForm
 */
export const RESOLUTION_VALUES_METRIC = [
  { value: 0.001, label: '0.001mm' },
  { value: 0.01, label: '0.01mm' },
  { value: 0.1, label: '0.1mm' }
] as const;

/**
 * Accuracy/Tolerance values for imperial measuring tools
 * Organized from tightest to loosest tolerance
 * Used by: HandToolForm
 */
export const ACCURACY_VALUES_IMPERIAL = [
  { value: '±0.00005"', label: '±0.00005"' },
  { value: '±0.0001"', label: '±0.0001"' },
  { value: '±0.0002"', label: '±0.0002"' },
  { value: '±0.001"', label: '±0.001"' },
  { value: '±0.002"', label: '±0.002"' },
  { value: '±0.005"', label: '±0.005"' },
  { value: '±0.01"', label: '±0.01"' }
] as const;

/**
 * Accuracy/Tolerance values for metric measuring tools
 * Organized from tightest to loosest tolerance
 * Used by: HandToolForm
 */
export const ACCURACY_VALUES_METRIC = [
  { value: '±0.001mm', label: '±0.001mm' },
  { value: '±0.002mm', label: '±0.002mm' },
  { value: '±0.01mm', label: '±0.01mm' },
  { value: '±0.02mm', label: '±0.02mm' }
] as const;

// Type exports for TypeScript consumers
export type OwnershipType = typeof OWNERSHIP_TYPES[number]['value'];
export type MeasurementUnit = typeof MEASUREMENT_UNITS[number]['value'];
export type HandToolType = typeof HAND_TOOL_TYPES[number]['value'];
export type HandToolFormat = typeof HAND_TOOL_FORMATS[number]['value'];
export type ResolutionValueImperial = typeof RESOLUTION_VALUES_IMPERIAL[number]['value'];
export type ResolutionValueMetric = typeof RESOLUTION_VALUES_METRIC[number]['value'];
export type AccuracyValueImperial = typeof ACCURACY_VALUES_IMPERIAL[number]['value'];
export type AccuracyValueMetric = typeof ACCURACY_VALUES_METRIC[number]['value'];
