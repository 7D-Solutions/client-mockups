/**
 * Navigation-aware authentication utilities
 * Handles auth actions that need navigation side effects
 */

export interface NavigationAuthOptions {
  loginPath?: string
  defaultPath?: string
  onNavigate?: (path: string) => void
}

export class NavigationAuth {
  private options: NavigationAuthOptions

  constructor(options: NavigationAuthOptions = {}) {
    this.options = {
      loginPath: '/login',
      defaultPath: '/',
      ...options
    }
  }

  /**
   * Navigate to a path using the configured navigation method
   */
  private navigate(path: string): void {
    if (this.options.onNavigate) {
      this.options.onNavigate(path)
    } else if (typeof window !== 'undefined') {
      window.location.href = path
    }
  }

  /**
   * Handle logout with navigation
   */
  logout(clearAuthFn: () => void): void {
    clearAuthFn()
    this.navigate(this.options.loginPath!)
  }

  /**
   * Handle login success with navigation
   */
  loginSuccess(token: string, user: any, setAuthFn: (token: string, user: any) => void): void {
    setAuthFn(token, user)
    this.navigate(this.options.defaultPath!)
  }

  /**
   * Handle auth error with navigation
   */
  authError(clearAuthFn: () => void): void {
    clearAuthFn()
    this.navigate(this.options.loginPath!)
  }

  /**
   * Check if current route requires auth and redirect if not authenticated
   */
  requireAuth(isAuthenticatedFn: () => boolean, currentPath?: string): boolean {
    const authenticated = isAuthenticatedFn()
    if (!authenticated && currentPath !== this.options.loginPath) {
      this.navigate(this.options.loginPath!)
      return false
    }
    return authenticated
  }
}