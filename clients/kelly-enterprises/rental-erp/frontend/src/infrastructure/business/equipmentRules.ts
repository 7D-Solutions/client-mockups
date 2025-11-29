/**
 * Equipment Business Rules Engine
 * 
 * Centralized location for all equipment-related business logic.
 * Changes to equipment rules should ONLY be made here.
 * 
 * USAGE EXAMPLES:
 * 
 * Display Equipment Type:
 * ```typescript
 * // ❌ DON'T DO THIS
 * <span>{gauge.equipment_type?.replace(/_/g, ' ')}</span>
 * 
 * // ✅ DO THIS INSTEAD
 * import { EquipmentRules } from '../infrastructure/business/equipmentRules';
 * <span>{EquipmentRules.getDisplayName(gauge)}</span>
 * ```
 * 
 * Check Checkout Permissions:
 * ```typescript
 * // ❌ DON'T DO THIS
 * const canCheckout = gauge.ownership_type !== 'employee' && 
 *                     gauge.equipment_type !== 'large_equipment';
 * 
 * // ✅ DO THIS INSTEAD
 * import { EquipmentRules } from '../infrastructure/business/equipmentRules';
 * const canCheckout = EquipmentRules.canBeCheckedOut(gauge);
 * ```
 * 
 * ESLINT ENFORCEMENT:
 * ESLint rules prevent direct equipment business logic in components:
 * - equipment_type.replace(/_/g, ' ') → Use EquipmentRules.getDisplayName()
 * - equipment_type === comparisons → Use appropriate EquipmentRules method
 * - ownership_type === 'employee' → Use EquipmentRules.canBeCheckedOut()
 */

export interface Equipment {
  equipment_type?: string;
  ownership_type?: string;
  category?: string;
  [key: string]: any;
}

/**
 * Equipment types that cannot be sealed
 */
const NON_SEALABLE_EQUIPMENT_TYPES = [
  'large_equipment',
  'hand_tool'
] as const;

/**
 * Equipment business rules
 */
export const EquipmentRules = {
  /**
   * Determines if equipment can be sealed
   * @param equipment - Equipment object with type information
   * @returns true if equipment can be sealed
   */
  canBeSealed(equipment: Equipment): boolean {
    if (!equipment?.equipment_type) return false;
    return !NON_SEALABLE_EQUIPMENT_TYPES.includes(equipment.equipment_type as any);
  },

  /**
   * Determines if equipment requires calibration
   * @param equipment - Equipment object
   * @returns true if equipment requires calibration
   */
  requiresCalibration(equipment: Equipment): boolean {
    return equipment?.equipment_type === 'calibration_standard' || 
           equipment?.equipment_type === 'thread_gauge';
  },

  /**
   * Determines if equipment can be checked out based on business rules
   * @param equipment - Equipment object
   * @returns true if equipment can be checked out
   */
  canBeCheckedOut(equipment: Equipment): boolean {
    if (!equipment) return false;

    // Employee hand tools, large equipment, and calibration standards cannot be checked out
    if (equipment.ownership_type === 'employee' ||
        equipment.equipment_type === 'large_equipment' ||
        equipment.equipment_type === 'calibration_standard') {
      return false;
    }

    // Spare gauges (set_id is null) cannot be checked out
    if (equipment.equipment_type === 'thread_gauge' && !equipment.set_id) {
      return false;
    }

    return true;
  },

  /**
   * Determines if equipment is employee-owned
   * @param equipment - Equipment object
   * @returns true if equipment is owned by an employee
   */
  isEmployeeOwned(equipment: Equipment): boolean {
    return equipment?.ownership_type === 'employee';
  },

  /**
   * Determines if equipment is large equipment type
   * @param equipment - Equipment object
   * @returns true if equipment is large equipment
   */
  isLargeEquipment(equipment: Equipment): boolean {
    return equipment?.equipment_type === 'large_equipment';
  },

  /**
   * Determines if equipment is hand tool type
   * @param equipment - Equipment object
   * @returns true if equipment is hand tool
   */
  isHandTool(equipment: Equipment): boolean {
    return equipment?.equipment_type === 'hand_tool';
  },

  /**
   * Determines if equipment is thread gauge type
   * @param equipment - Equipment object
   * @returns true if equipment is thread gauge
   */
  isThreadGauge(equipment: Equipment): boolean {
    return equipment?.equipment_type === 'thread_gauge';
  },

  /**
   * Determines if equipment is calibration standard type
   * @param equipment - Equipment object
   * @returns true if equipment is calibration standard
   */
  isCalibrationStandard(equipment: Equipment): boolean {
    return equipment?.equipment_type === 'calibration_standard';
  },

  /**
   * Gets ownership type display name
   * @param equipment - Equipment object
   * @returns formatted ownership type
   */
  getOwnershipTypeDisplay(equipment: Equipment): string {
    if (equipment?.ownership_type === 'employee') return 'Employee';
    if (equipment?.ownership_type === 'customer') return 'Customer';
    return 'Company';
  },

  /**
   * Gets display-friendly equipment type name
   * @param equipment - Equipment object
   * @returns formatted equipment type name
   */
  getDisplayName(equipment: Equipment): string {
    return equipment?.equipment_type?.replace(/_/g, ' ') || 'Unknown';
  },

  /**
   * Checks if equipment matches a filter type
   * @param equipment - Equipment object
   * @param filterType - Filter type ('All' or specific equipment_type)
   * @returns true if equipment matches filter
   */
  matchesFilterType(equipment: Equipment, filterType: string): boolean {
    return filterType === 'All' || equipment?.equipment_type === filterType;
  }
} as const;