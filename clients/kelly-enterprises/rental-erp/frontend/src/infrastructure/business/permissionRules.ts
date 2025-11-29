/**
 * Permission Rules - Enhanced centralized permission and role logic
 *
 * Usage Examples:
 * - PermissionRules.isAdmin(user) → true/false
 * - PermissionRules.canManageGauges(permissions) → true/false
 * - PermissionRules.hasAdminRole(user) → true/false
 * - PermissionRules.canAccessAdmin(user) → true/false
 *
 * @note This consolidates scattered role-checking patterns from 6+ files
 * @note Enhances existing usePermissions hook with role-based convenience methods
 * @note Provides consistent admin, role, and permission checking across the application
 */

import { AuthenticatedUser } from '../../types/common';

export interface PermissionConfig {
  user?: AuthenticatedUser | null;
  permissions?: string[];
  role?: string;
  roles?: string[];
  [key: string]: unknown;
}

export const PermissionRules = {
  
  // ===== ADMIN ROLE CHECKING =====
  
  /**
   * Check if user has admin permissions
   * Consolidates scattered isAdmin logic from multiple files
   * @param user - User object with permissions property
   * @returns True if user has admin privileges
   */
  isAdmin(user: AuthenticatedUser | null | undefined): boolean {
    if (!user) return false;
    return user.permissions.includes('system.admin.full');
  },

  /**
   * Check if user has admin permissions (includes permission checking)
   * Consolidates isAdminOrSuperAdmin logic from MainLayout and Admin components
   * @param user - User object with permissions property
   * @returns True if user has admin privileges
   */
  hasAdminRole(user: AuthenticatedUser | null | undefined): boolean {
    if (!user) return false;
    return user.permissions.includes('system.admin.full');
  },

  /**
   * Check if user can access admin features
   * Combines role and permission checks for admin access
   * @param user - User object
   * @returns True if user can access admin features
   */
  canAccessAdmin(user: AuthenticatedUser | null | undefined): boolean {
    return this.hasAdminRole(user);
  },

  // ===== PERMISSION-BASED CHECKS =====

  /**
   * Check if user has gauge management permissions
   * @param permissions - User permissions array
   * @returns True if user can manage gauges
   */
  canManageGauges(permissions: string[]): boolean {
    if (!permissions) return false;
    return permissions.includes('gauge.manage.full');
  },

  /**
   * Check if user has calibration management permissions
   * @param permissions - User permissions array
   * @returns True if user can manage calibration
   */
  canManageCalibration(permissions: string[]): boolean {
    if (!permissions) return false;
    return permissions.includes('calibration.manage.full');
  },

  /**
   * Check if user can accept gauge returns
   * @param permissions - User permissions array
   * @param gauge - Gauge object (optional for status checking)
   * @returns True if user can accept returns
   */
  canAcceptReturn(permissions: string[], gauge?: { status?: string }): boolean {
    if (!this.canManageGauges(permissions)) return false;
    if (gauge) {
      return gauge.status === 'pending_qc';
    }
    return true;
  },

  // ===== ROLE-BASED CHECKS =====

  /**
   * Check if user has operator role
   * @param user - User object
   * @returns True if user is an operator
   */
  isOperator(user: AuthenticatedUser | null | undefined): boolean {
    if (!user) return false;
    const userRole = user.role || user.roles[0] || 'operator';
    return userRole === 'operator';
  },

  /**
   * Check if user has supervisor role
   * @param user - User object
   * @returns True if user is a supervisor
   */
  isSupervisor(user: AuthenticatedUser | null | undefined): boolean {
    if (!user) return false;
    return (
      user.role === 'supervisor' ||
      user.roles.includes('supervisor')
    );
  },

  // ===== EQUIPMENT ACCESS CHECKS =====

  /**
   * Check if user can view large equipment
   * Based on admin role - non-admin users cannot see large equipment
   * @param user - User object
   * @returns True if user can view large equipment
   */
  canViewLargeEquipment(user: AuthenticatedUser | null | undefined): boolean {
    return this.isAdmin(user);
  },

  /**
   * Check if user can view calibration standards
   * Based on admin role - non-admin users cannot see calibration standards
   * @param user - User object
   * @returns True if user can view calibration standards
   */
  canViewCalibrationStandards(user: AuthenticatedUser | null | undefined): boolean {
    return this.isAdmin(user);
  },

  // ===== NAVIGATION PERMISSION CHECKS =====

  /**
   * Check if user has any of the required permissions for navigation items
   * @param userPermissions - User's permission array
   * @param requiredPermissions - Required permissions for navigation item
   * @returns True if user has any required permission
   */
  hasNavigationPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    if (!userPermissions || !requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required, show item
    }
    
    return requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
  },

  // ===== ALERT VISIBILITY CHECKS =====

  /**
   * Check if user should see admin alerts (QC, unseal requests)
   * @param user - User object
   * @returns True if user should see admin alerts
   */
  canViewAdminAlerts(user: AuthenticatedUser | null | undefined): boolean {
    return this.hasAdminRole(user);
  },

  // ===== UTILITY METHODS =====

  /**
   * Get user's primary role
   * @param user - User object
   * @returns Primary role string
   */
  getPrimaryRole(user: AuthenticatedUser | null | undefined): string {
    if (!user) return 'guest';
    return user.role || user.roles[0] || 'operator';
  },

  /**
   * Get all user roles as array
   * @param user - User object
   * @returns Array of role strings
   */
  getAllRoles(user: AuthenticatedUser | null | undefined): string[] {
    if (!user) return [];
    const userRole = user.role || user.roles[0] || 'operator';
    return user.roles || [userRole];
  },

  /**
   * Check if user has specific role
   * @param user - User object
   * @param role - Role to check
   * @returns True if user has the specified role
   */
  hasRole(user: AuthenticatedUser | null | undefined, role: string): boolean {
    if (!user || !role) return false;
    const allRoles = this.getAllRoles(user);
    return allRoles.includes(role);
  },

  // ===== SAFE PERMISSION WRAPPER =====

  /**
   * Safe permission checking wrapper that handles null/undefined inputs
   * @param user - User object (can be null/undefined)
   * @param permissions - Permissions array (can be null/undefined)
   * @param checker - Permission checking function to apply
   * @returns Result of permission check or false if inputs are invalid
   */
  safeCheck(
    user: AuthenticatedUser | null | undefined,
    permissions: string[] | null | undefined,
    checker: (user: AuthenticatedUser | null | undefined, permissions?: string[]) => boolean
  ): boolean {
    try {
      return checker(user, permissions || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('PermissionRules: Error checking permissions:', error);
      return false;
    }
  }
};