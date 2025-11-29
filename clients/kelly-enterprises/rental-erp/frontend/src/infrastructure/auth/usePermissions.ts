import { useAuth } from './index';
import { PermissionRules } from '../business/permissionRules';

/**
 * Hook for checking user permissions
 */
export const usePermissions = () => {
  const { user, permissions } = useAuth();

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!user || !permissions) return false;
    return permissions.includes(permission);
  };

  /**
   * Check if user has ANY of the provided permissions
   */
  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    if (!user || !permissions) return false;
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  /**
   * Check if user has ALL of the provided permissions
   */
  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    if (!user || !permissions) return false;
    return requiredPermissions.every(permission => permissions.includes(permission));
  };

  /**
   * Legacy role check for backward compatibility
   * @deprecated Use permission-based checks instead
   */
  const isAdmin = (): boolean => {
    // Legacy function - uses PermissionRules for consistency
    return PermissionRules.isAdmin(user);
  };

  // ==========================================
  // PERMISSION-BASED ACCESS CHECKS
  // ==========================================

  /**
   * Check if user can manage calibration workflows
   */
  const canManageCalibration = hasPermission('calibration.manage.full');

  /**
   * Check if user can view returned customer gauges
   */
  const canViewReturnedCustomer = hasPermission('gauge.view.access');

  /**
   * Check if user can manage gauge sets
   */
  const canManageSets = hasPermission('gauge.manage.full');

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin, // Deprecated, for backward compatibility
    // Permission-based access checks
    canManageCalibration,
    canViewReturnedCustomer,
    canManageSets,
  };
};