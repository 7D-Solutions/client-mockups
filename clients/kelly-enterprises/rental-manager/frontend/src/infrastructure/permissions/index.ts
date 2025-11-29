/**
 * Permission constants matching database exactly (8-permission system)
 * Update this file when adding new permissions to database
 */
export const PERMISSIONS = {
  // Gauge Module Permissions
  GAUGE: {
    VIEW: 'gauge.view.access',           // View gauges and details
    OPERATE: 'gauge.operate.execute',    // Checkout, return, transfer gauges
    MANAGE: 'gauge.manage.full',         // Create, edit, retire gauges
  },
  // Calibration Permission
  CALIBRATION: {
    MANAGE: 'calibration.manage.full',   // Record calibration results, manage calibration
  },
  // User Management Permission
  USER: {
    MANAGE: 'user.manage.full',          // Create/edit users, assign roles
  },
  // System Administration Permission
  SYSTEM: {
    ADMIN: 'system.admin.full',          // System configuration, recovery tools
  },
  // Audit Permission
  AUDIT: {
    VIEW: 'audit.view.access',           // View audit logs
  },
  // Data Export Permission
  DATA: {
    EXPORT: 'data.export.execute',       // Export reports
  }
} as const;

/**
 * Check if user has a specific permission
 * @param permissions User's permission array
 * @param permission Permission string to check
 * @returns boolean indicating if user has the permission
 */
export const hasPermission = (
  permissions: string[] | undefined,
  permission: string
): boolean => {
  return permissions?.includes(permission) ?? false;
};

/**
 * Check if user has any of the specified permissions
 * @param permissions User's permission array
 * @param requiredPermissions Array of permission strings
 * @returns boolean indicating if user has at least one permission
 */
export const hasAnyPermission = (
  permissions: string[] | undefined,
  requiredPermissions: string[]
): boolean => {
  if (!permissions || !Array.isArray(permissions)) return false;
  return requiredPermissions.some(perm => permissions.includes(perm));
};

/**
 * Check if user has all of the specified permissions
 * @param permissions User's permission array
 * @param requiredPermissions Array of permission strings
 * @returns boolean indicating if user has all permissions
 */
export const hasAllPermissions = (
  permissions: string[] | undefined,
  requiredPermissions: string[]
): boolean => {
  if (!permissions || !Array.isArray(permissions)) return false;
  return requiredPermissions.every(perm => permissions.includes(perm));
};
