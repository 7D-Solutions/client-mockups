import { useState, useEffect, useCallback } from 'react';
import { AuthState, LoginCredentials, User } from './types.js';
import * as authServiceFunctions from './authService.js';

/**
 * useAuth hook that wraps the existing Fireproof auth service
 * Maintains compatibility with existing auth patterns while providing React hook interface
 */
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      const isAuth = authServiceFunctions.isAuthenticated();
      const user = authServiceFunctions.getCurrentUser();
      
      setAuthState({
        isAuthenticated: isAuth,
        user,
        loading: false,
        error: null,
      });
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials, apiClient: any): Promise<User> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await authServiceFunctions.login(credentials, apiClient);
      const user = response.user;
      
      setAuthState({
        isAuthenticated: true,
        user,
        loading: false,
        error: null,
      });
      
      return user;
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    authServiceFunctions.logout();
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
    });
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!authState.user) return false;
    
    // Check if user has the specific permission
    if (authState.user.permissions?.includes(permission)) {
      return true;
    }
    
    // Check if user has admin role (admin has all permissions)
    if (authState.user.role === 'admin' || authState.user.role === 'super_admin') {
      return true;
    }
    
    return false;
  }, [authState.user]);

  const updateUser = useCallback((user: User) => {
    authServiceFunctions.setCurrentUser(user);
    setAuthState(prev => ({
      ...prev,
      user,
    }));
  }, []);

  return {
    // State
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    currentUser: authState.user, // Alias for Fireproof compatibility
    
    // Actions
    login,
    logout,
    hasPermission,
    updateUser,
    setCurrentUser: updateUser, // Alias for Fireproof compatibility
    
    // Direct access to auth service functions for compatibility
    getAuthHeaders: authServiceFunctions.getAuthHeaders,
    getAuthHeadersWithJson: authServiceFunctions.getAuthHeadersWithJson,
    getToken: authServiceFunctions.getToken,
    setToken: authServiceFunctions.setToken,
    clearAuth: authServiceFunctions.clearAuth,
    handleAuthError: authServiceFunctions.handleAuthError,
  };
};