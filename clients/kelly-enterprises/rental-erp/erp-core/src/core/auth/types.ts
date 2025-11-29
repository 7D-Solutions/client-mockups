export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
  [key: string]: any; // Allow additional properties from Fireproof
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success?: boolean;
  token: string;
  user: User;
  error?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export type AuthHeaders = Record<string, string>;

export interface PermissionGateProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}