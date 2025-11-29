/**
 * Common Types - Unified type definitions shared across modules
 *
 * This file consolidates common types used throughout the application
 * to ensure type consistency and prevent duplication.
 */

/**
 * Authenticated User Interface
 *
 * Unified type for authenticated users across the application.
 * Combines properties from admin and gauge module User types.
 *
 * @property id - Unique user identifier
 * @property email - User email address
 * @property username - Optional username (legacy support)
 * @property firstName - User first name
 * @property lastName - User last name
 * @property role - Primary role (for backward compatibility)
 * @property roles - Array of all user roles
 * @property permissions - Array of permission strings (e.g., 'system.admin.full')
 * @property isActive - Whether user account is active
 * @property createdAt - Account creation timestamp (optional, from admin module)
 * @property updatedAt - Last update timestamp (optional, from admin module)
 * @property lastLogin - Last login timestamp (optional, from admin module)
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  role: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string | null;
}

/**
 * Type guard to check if a value is an AuthenticatedUser
 *
 * @param value - Value to check
 * @returns True if value is an AuthenticatedUser
 */
export function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (!value || typeof value !== 'object') return false;

  const user = value as Record<string, unknown>;

  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.firstName === 'string' &&
    typeof user.lastName === 'string' &&
    typeof user.role === 'string' &&
    Array.isArray(user.roles) &&
    Array.isArray(user.permissions) &&
    typeof user.isActive === 'boolean'
  );
}

/**
 * Get user display name
 *
 * @param user - User object
 * @returns Full name or email if name not available
 */
export function getUserDisplayName(user: AuthenticatedUser | null | undefined): string {
  if (!user) return 'Unknown User';

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName || user.email || 'Unknown User';
}
