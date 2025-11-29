// Inventory module permissions
// Following the 8-permission system pattern from gauge module

export const INVENTORY_PERMISSIONS = {
  // Basic viewing (baseline access to inventory dashboard)
  VIEW: 'inventory.view.access',
  VIEW_DASHBOARD: 'inventory.view.access',
  VIEW_LOCATIONS: 'inventory.view.access',
  VIEW_HISTORY: 'inventory.view.access',

  // Management (move items, manage locations)
  MANAGE: 'inventory.manage.full',
  MOVE_ITEMS: 'inventory.manage.full',
  MANAGE_LOCATIONS: 'inventory.manage.full',
  DELETE_ITEMS: 'inventory.manage.full',
} as const;

// Type for inventory permissions
export type InventoryPermission = typeof INVENTORY_PERMISSIONS[keyof typeof INVENTORY_PERMISSIONS];

/**
 * Permission Dependencies
 * - inventory.manage.full requires inventory.view.access
 */
export const INVENTORY_PERMISSION_DEPENDENCIES = {
  'inventory.manage.full': ['inventory.view.access']
};

/**
 * Permission Descriptions
 */
export const INVENTORY_PERMISSION_DESCRIPTIONS = {
  'inventory.view.access': 'View inventory dashboard, locations, and movement history',
  'inventory.manage.full': 'Move items between locations and manage inventory'
};
