import React, { createContext, useContext } from 'react';
import { useAuth } from './useAuth.js';

// Create auth context
const AuthContext = createContext<ReturnType<typeof useAuth> | undefined>(undefined);

/**
 * AuthProvider component that provides auth context to children
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 * @throws Error if used outside AuthProvider
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};