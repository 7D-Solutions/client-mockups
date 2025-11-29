import React from 'react';
import { PermissionGateProps } from './types.js';
import { useAuth } from './useAuth.js';

/**
 * PermissionGate component that conditionally renders children based on permissions
 * Shows/hides content based on user permissions
 */
const PermissionGate: React.FC<PermissionGateProps> = ({ 
  children, 
  permissions = [], 
  requireAll = false,
  fallback = null 
}) => {
  const { hasPermission, isAuthenticated } = useAuth();

  // If not authenticated, don't show content
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // If no permissions specified, show content to any authenticated user
  if (permissions.length === 0) {
    return <>{children}</>;
  }

  // Check permissions
  const hasRequiredPermissions = requireAll
    ? permissions.every(permission => hasPermission(permission))
    : permissions.some(permission => hasPermission(permission));

  return hasRequiredPermissions ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGate;