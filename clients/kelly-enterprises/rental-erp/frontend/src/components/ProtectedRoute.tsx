import { ReactNode } from 'react';
import { useAuth } from '../infrastructure/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles = [] }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <div>Please log in to access this page.</div>;
  }

  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => role === user.role);
    if (!hasRequiredRole) {
      return <div>Access denied. Required roles: {requiredRoles.join(', ')}</div>;
    }
  }

  return <>{children}</>;
}