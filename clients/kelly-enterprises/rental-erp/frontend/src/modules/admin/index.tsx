import React from 'react';
import { Navigate } from 'react-router-dom';
import { AdminRoutes } from './routes';
import { AdminProvider } from './context';
import { useAuth } from '../../infrastructure/auth';
import { PermissionRules } from '../../infrastructure/business/permissionRules';

export const AdminModule: React.FC = () => {
  const { user } = useAuth();
  
  // Check if user has admin role using centralized permission rules
  if (!user || !PermissionRules.canAccessAdmin(user)) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <AdminProvider>
      <AdminRoutes />
    </AdminProvider>
  );
};

export default AdminModule;