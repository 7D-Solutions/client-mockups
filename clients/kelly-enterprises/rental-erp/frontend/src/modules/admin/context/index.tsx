import React, { createContext, useContext, ReactNode, useState } from 'react';
import { eventBus, useEventBus, EVENTS } from '../../../infrastructure/events';
import { useAdminState, useAdminActions, useSharedActions } from '../../../infrastructure/store';
import { User, Role, CreateUserData, CreateRoleData } from '../types';
import { adminService } from '../services/adminService';

// Type definitions for admin context
interface UserFilters {
  search?: string;
  role?: string;
  status?: 'active' | 'inactive';
  [key: string]: string | undefined;
}

interface AdminContextValue {
  // State from Zustand store
  selectedUserId: string | null;
  userFilters: UserFilters;
  systemSettings: Record<string, unknown>;
  auditLogPage: number;

  // Loading states
  loadingStates: {
    createUser: boolean;
    updateUser: boolean;
    deleteUser: boolean;
    createRole: boolean;
    updateRole: boolean;
    deleteRole: boolean;
    assignRoleToUser: boolean;
    removeRoleFromUser: boolean;
  };

  // Actions from Zustand store
  setSelectedUser: (id: string | null) => void;
  updateUserFilters: (filters: UserFilters) => void;
  updateSystemSettings: (settings: Record<string, unknown>) => void;
  updateAuditLogPage: (page: number) => void;

  // Business logic actions
  createUser: (userData: Partial<User>) => Promise<void>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<void>;
  deleteUser: (userId: string, userName?: string) => Promise<void>;

  // Role management actions
  createRole: (roleData: Partial<Role>) => Promise<void>;
  updateRole: (roleId: string, roleData: Partial<Role>) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;

  // Permission management
  assignRoleToUser: (userId: string, roleId: string) => Promise<void>;
  removeRoleFromUser: (userId: string, roleId: string) => Promise<void>;

  // Event emitters
  emitAdminEvent: (event: string, data: unknown) => void;
}

// Remove useReducer pattern - using Zustand store instead

const AdminContext = createContext<AdminContextValue | null>(null);

export const useAdmin = (): AdminContextValue => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const adminState = useAdminState();
  const adminActions = useAdminActions();
  const { addNotification } = useSharedActions();

  // Loading states for admin operations
  const [loadingStates, setLoadingStates] = useState({
    createUser: false,
    updateUser: false,
    deleteUser: false,
    createRole: false,
    updateRole: false,
    deleteRole: false,
    assignRoleToUser: false,
    removeRoleFromUser: false,
  });

  const setLoading = (operation: keyof typeof loadingStates, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [operation]: isLoading }));
  };

  // Listen to gauge events for admin audit tracking
  // Note: MainLayout handles notifications, we only handle admin-specific logic
  useEventBus(EVENTS.GAUGE_UPDATED, (_data) => {
    // Log gauge updates in admin audit trail (admin-specific processing)
    // Audit log integration will be implemented when audit service is available
    // This event handler serves as the integration point for future audit logging
  });

  useEventBus(EVENTS.USER_PERMISSIONS_CHANGED, (_data) => {
    // Refresh admin data when permissions change (admin-specific processing)
    // User list refresh will be implemented when admin user management is added
    // This event handler serves as the integration point for user list refresh
  });

  // Event emitter function
  const emitAdminEvent = (event: string, data: unknown) => {
    eventBus.emit(event, data);
  };

  // User management actions
  const createUser = async (userData: Partial<User>) => {
    setLoading('createUser', true);
    try {
      const newUser = await adminService.createUser(userData as CreateUserData);
      const userName = `${newUser.firstName} ${newUser.lastName}`;
      addNotification({
        type: 'success',
        title: 'User Created',
        message: `User ${userName} was created successfully`
      });
      eventBus.emit('admin:user:created', newUser);
      // Don't emit USER_PERMISSIONS_CHANGED for new user creation
      // That event is for when existing user permissions are modified
    } finally {
      setLoading('createUser', false);
    }
  };

  const updateUser = async (userId: string, userData: Partial<User>) => {
    setLoading('updateUser', true);
    try {
      const response = await adminService.updateUser(userId, userData);
      // Backend returns { success: true, data: user }
      const updatedUser = (response as { data?: User }).data || (response as User);
      const userName = `${updatedUser.firstName} ${updatedUser.lastName}`;
      addNotification({
        type: 'success',
        title: 'User Updated',
        message: `User ${userName} was updated`
      });
      eventBus.emit('admin:user:updated', { userId, data: updatedUser });
      emitAdminEvent(EVENTS.USER_PERMISSIONS_CHANGED, {
        userId,
        userName: `${updatedUser.firstName} ${updatedUser.lastName}`
      });
    } finally {
      setLoading('updateUser', false);
    }
  };

  const deleteUser = async (userId: string, userName?: string) => {
    setLoading('deleteUser', true);
    try {
      await adminService.deleteUser(userId);
      addNotification({
        type: 'success',
        title: 'User Deleted',
        message: userName ? `User ${userName} was deleted successfully` : 'User was deleted successfully'
      });
      eventBus.emit('admin:user:deleted', userId);
      // Don't emit USER_PERMISSIONS_CHANGED for user deletion
      // That event is for when existing user permissions are modified, not for user deletion
    } finally {
      setLoading('deleteUser', false);
    }
  };

  // Role management actions
  const createRole = async (roleData: Partial<Role>) => {
    setLoading('createRole', true);
    try {
      const newRole = await adminService.createRole(roleData as CreateRoleData);
      eventBus.emit('admin:role:created', newRole);
      emitAdminEvent(EVENTS.USER_PERMISSIONS_CHANGED, { roleId: newRole.id, action: 'role_created' });
    } finally {
      setLoading('createRole', false);
    }
  };

  const updateRole = async (roleId: string, roleData: Partial<Role>) => {
    setLoading('updateRole', true);
    try {
      const updatedRole = await adminService.updateRole(roleId, roleData);
      eventBus.emit('admin:role:updated', { roleId, data: updatedRole });
      emitAdminEvent(EVENTS.USER_PERMISSIONS_CHANGED, { roleId, action: 'role_updated' });
    } finally {
      setLoading('updateRole', false);
    }
  };

  const deleteRole = async (roleId: string) => {
    setLoading('deleteRole', true);
    try {
      await adminService.deleteRole(roleId);
      eventBus.emit('admin:role:deleted', roleId);
      emitAdminEvent(EVENTS.USER_PERMISSIONS_CHANGED, { roleId, action: 'role_deleted' });
    } finally {
      setLoading('deleteRole', false);
    }
  };

  // Permission management
  const assignRoleToUser = async (userId: string, roleId: string) => {
    setLoading('assignRoleToUser', true);
    try {
      await adminService.assignRoleToUser(userId, roleId);
      eventBus.emit('admin:user:role:assigned', { userId, roleId });
      emitAdminEvent(EVENTS.USER_PERMISSIONS_CHANGED, { userId, roleId, action: 'role_assigned' });
    } finally {
      setLoading('assignRoleToUser', false);
    }
  };

  const removeRoleFromUser = async (userId: string, roleId: string) => {
    setLoading('removeRoleFromUser', true);
    try {
      await adminService.removeRoleFromUser(userId, roleId);
      eventBus.emit('admin:user:role:removed', { userId, roleId });
      emitAdminEvent(EVENTS.USER_PERMISSIONS_CHANGED, { userId, roleId, action: 'role_removed' });
    } finally {
      setLoading('removeRoleFromUser', false);
    }
  };

  const value: AdminContextValue = {
    // State from Zustand store
    selectedUserId: adminState.selectedUserId,
    userFilters: adminState.userFilters,
    systemSettings: adminState.systemSettings,
    auditLogPage: adminState.auditLog.page,
    
    // Loading states
    loadingStates,
    
    // Actions from Zustand store
    setSelectedUser: adminActions.setSelectedUser,
    updateUserFilters: adminActions.updateUserFilters,
    updateSystemSettings: adminActions.updateSystemSettings,
    updateAuditLogPage: adminActions.updateAuditLogPage,
    
    // Business logic actions
    createUser,
    updateUser,
    deleteUser,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser,
    removeRoleFromUser,
    
    // Event emitter
    emitAdminEvent,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};