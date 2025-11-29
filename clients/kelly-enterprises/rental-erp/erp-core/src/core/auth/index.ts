// Main hook for authentication
export { useAuth } from './useAuth.js';

// Context provider and hook
export { AuthProvider, useAuthContext } from './AuthProvider.js';

// Permission-based rendering component
export { default as PermissionGate } from './PermissionGate.js';

// Auth service functions for direct access (Fireproof compatibility)
export * from './authService.js';

// Constants
export { AUTH_TOKEN_KEY } from './constants.js';

// TypeScript types and interfaces
export type {
  User,
  AuthState,
  LoginCredentials,
  LoginResponse,
  AuthHeaders,
  PermissionGateProps
} from './types.js';