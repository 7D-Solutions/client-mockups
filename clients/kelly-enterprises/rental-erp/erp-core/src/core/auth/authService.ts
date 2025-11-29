// Centralized authentication utilities
// Extracted from Fireproof Gauge System

import { AUTH_TOKEN_KEY } from './constants.js';
import { LoginCredentials, LoginResponse, User, AuthHeaders } from './types.js';

export { AUTH_TOKEN_KEY } from './constants.js';
export const USER_KEY = 'user';

/**
 * Get authentication headers for API requests
 * Now uses session-based authentication with httpOnly cookies
 */
export const getAuthHeaders = (): AuthHeaders => {
  // With httpOnly cookies, we don't need to send the token manually
  // The browser automatically includes the authentication cookie
  return {
    'credentials': 'include'  // Ensure cookies are included in requests
  };
};

/**
 * Get auth headers with JSON content type
 */
export const getAuthHeadersWithJson = (): AuthHeaders => {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeaders()
  };
};

/**
 * Check if user is authenticated
 * Now checks for session-based authentication
 */
export const isAuthenticated = (): boolean => {
  // With httpOnly cookies, we need to check session state differently
  // For now, check if we have user data (will be set by login response)
  const userStr = sessionStorage.getItem(USER_KEY);
  return !!userStr;
};

/**
 * Store authentication token
 * With httpOnly cookies, tokens are managed server-side
 */
export const setAuthToken = (token: string): void => {
  // Token is now handled via httpOnly cookies on the server
  // This function is kept for compatibility but doesn't store client-side tokens
};

/**
 * Clear authentication data
 * Now clears session data instead of localStorage
 */
export const clearAuth = (): void => {
  sessionStorage.removeItem(USER_KEY);
  // Server-side logout will clear httpOnly cookies
};

/**
 * Get current user from session storage
 */
export const getCurrentUser = (): User | null => {
  const userStr = sessionStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Store current user in session storage
 */
export const setCurrentUser = (user: User): void => {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Handle successful login - store user data
 */
export const handleLoginSuccess = async (user: User): Promise<User> => {
  setCurrentUser(user);
  return user;
};

/**
 * Handle API response errors
 */
export const handleAuthError = (error: any): void => {
  if (error.status === 401 || 
      (error.message && error.message.includes('401'))) {
    clearAuth();
    // Note: Navigation to login should be handled by the app
  }
};

/**
 * Login with credentials
 * Now uses session-based authentication with httpOnly cookies
 */
export const login = async (credentials: LoginCredentials, apiClient: any): Promise<LoginResponse> => {
  const response = await apiClient.post('auth/login', credentials, {
    withCredentials: true  // Ensure cookies are included
  });
  
  if (!response.data || !response.data.user) {
    throw new Error('No user data received from server');
  }
  
  // Store user data in session storage
  setCurrentUser(response.data.user);
  
  return response.data;
};

/**
 * Logout and clear authentication
 */
export const logout = (): void => {
  clearAuth();
};

/**
 * Get authentication token
 * With httpOnly cookies, tokens are not accessible to client-side code
 */
export const getToken = (): string | null => {
  // Tokens are now managed via httpOnly cookies and not accessible to client code
  return null;
};

/**
 * Set authentication token
 */
export const setToken = (token: string): void => {
  setAuthToken(token);
};

// Export all functions as authService object for compatibility
export const authService = {
  getAuthHeaders,
  getAuthHeadersWithJson,
  isAuthenticated,
  setAuthToken,
  clearAuth,
  getCurrentUser,
  setCurrentUser,
  handleLoginSuccess,
  handleAuthError,
  login,
  logout,
  getToken,
  setToken
};