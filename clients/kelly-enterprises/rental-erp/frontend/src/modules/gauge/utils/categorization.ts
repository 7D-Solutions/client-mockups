// Gauge categorization utility functions
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import type { Gauge } from '../types';

export interface CategorizedGauges {
  all: Gauge[];
  largeEquipment: Gauge[];
  companyHandTools: Gauge[];
  employeeHandTools: Gauge[];
  threadGauges: Gauge[];
  threadRing: Gauge[];
  threadPlug: Gauge[];
  other: Gauge[];
}

// Derive gauge type from equipment_type or name
export function deriveGaugeType(gauge: Gauge): string {
  const name = gauge.name?.toLowerCase() || '';
  const equipmentType = gauge.equipment_type?.toLowerCase() || '';
  
  // Check for CMM
  if (equipmentType.includes('cmm') || name.includes('cmm')) {
    return 'cmm';
  }
  
  // Check for calipers
  if (equipmentType.includes('caliper') || name.includes('caliper')) {
    return 'caliper';
  }
  
  // Check for micrometers
  if (equipmentType.includes('micrometer') || name.includes('micrometer') || name.includes('mic')) {
    return 'micrometer';
  }
  
  // Check for pin gauges
  if (equipmentType.includes('pin') || name.includes('pin gauge')) {
    return 'pin_gauge';
  }
  
  // Check for thread gauges
  if (equipmentType === 'thread_gauge' || equipmentType.includes('thread') || name.includes('thread')) {
    return 'thread_gauge';
  }
  
  return 'other';
}

// Categorize gauges based on type and ownership
export function categorizeGauges(gauges: Gauge[]): CategorizedGauges {
  const categorized: CategorizedGauges = {
    all: gauges,
    largeEquipment: [],
    companyHandTools: [],
    employeeHandTools: [],
    threadGauges: [],
    threadRing: [],
    threadPlug: [],
    other: []
  };
  
  gauges.forEach((gauge, _index) => {
    // Use derived_type for categorization logic
    const type = (gauge as any).derived_type || deriveGaugeType(gauge);
    const name = gauge.name?.toLowerCase() || '';
    const equipmentType = gauge.equipment_type?.toLowerCase() || '';
    
    // Large equipment
    if (type === 'cmm' || type === 'pin_gauge') {
      categorized.largeEquipment.push(gauge);
    }
    // Thread gauges - check both type and equipment_type
    else if (type === 'thread_gauge' || equipmentType === 'thread_gauge' || name.includes('thread')) {
      categorized.threadGauges.push(gauge);
      
      // Sub-categorize thread gauges
      if (name.includes('ring')) {
        categorized.threadRing.push(gauge);
      } else if (name.includes('plug')) {
        categorized.threadPlug.push(gauge);
      }
    }
    // Hand tools (calipers and micrometers)
    else if (type === 'caliper' || type === 'micrometer') {
      if (EquipmentRules.isEmployeeOwned(gauge)) {
        categorized.employeeHandTools.push(gauge);
      } else {
        // Default to company if ownership_type is not set or is 'company'
        categorized.companyHandTools.push(gauge);
      }
    }
    // Other
    else {
      categorized.other.push(gauge);
    }
  });
  
  return categorized;
}

// Derive ownership type from various fields
export function deriveOwnershipType(gauge: Gauge): 'company' | 'employee' | 'customer' {
  // If explicitly set, use it
  if (gauge.ownership_type) {
    return gauge.ownership_type;
  }
  
  // If has owner_employee_name, it's employee owned
  if (gauge.owner_employee_name) {
    return 'employee';
  }
  
  // Check storage_location or other fields that might indicate ownership
  const storageLocation = gauge.storage_location?.toLowerCase() || '';
  if (storageLocation.includes('personal') || storageLocation.includes('employee')) {
    return 'employee';
  }
  
  // Default to company
  return 'company';
}