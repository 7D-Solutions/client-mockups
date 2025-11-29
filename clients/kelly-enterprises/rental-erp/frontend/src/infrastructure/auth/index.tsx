// Authentication wrapper

import { useContext, createContext, ReactNode, useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { logger } from '../utils/logger';

interface User {
  id: string | number;
  username: string;       // Username is required for all users
  name: string;
  email?: string | null;  // Email is optional
  role?: string;
  roles?: string[];
  permissions?: string[];
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: { identifier: string; password: string }) => Promise<void>;
  logout: () => void;
  permissions: string[];
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing session by calling /me endpoint
    // This validates the httpOnly cookie automatically
    const validateSession = async () => {
      try {
        const response = await apiClient.get('/auth/me');

        // Normalize response structure - backend may return different formats
        let userData = null;

        if (response && typeof response === 'object') {
          // Check for user data in expected locations
          userData = response.user || response.data || (response.id ? response : null);

          // Validate that userData has required fields (id is required, email is optional)
          if (userData && userData.id) {
            setUser(userData);
          } else {
            logger.warn('Auth: Invalid user data structure:', response);
            setUser(null);
          }
        } else {
          logger.warn('Auth: Unexpected response format:', response);
          setUser(null);
        }
      } catch (_error) {
        // Session invalid or expired, user remains null
        setUser(null);
      }
    };

    validateSession();

    // Listen for auth:logout events from the API client
    const handleAuthLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  const login = async (credentials: { identifier: string; password: string }) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);

      // Normalize response structure - backend may return different formats
      let userData = null;

      if (response && typeof response === 'object') {
        // Check for user data in expected locations
        userData = response.user || response.data || (response.id ? response : null);

        // Validate that userData has required fields (id is required, email is optional)
        if (userData && userData.id) {
          setUser(userData);
        } else {
          throw new Error('Invalid user data received from server');
        }
      } else {
        throw new Error('No user data received from server');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear server session and httpOnly cookie
      await apiClient.post('/auth/logout');
    } catch (_error) {
      // Continue with logout even if API call fails
    } finally {
      // Clear user state - cookie will be cleared by server
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    permissions: user?.permissions || [],
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Exports handled by function declarations above