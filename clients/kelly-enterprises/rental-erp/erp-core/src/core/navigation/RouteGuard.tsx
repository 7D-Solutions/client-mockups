import React, { ReactNode, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/index.js'
import { useNavigationContext } from './NavigationContext.js'

interface RouteGuardProps {
  children: ReactNode
  requireAuth?: boolean
  permissions?: string[]
  redirectTo?: string
  fallback?: ReactNode
}

/**
 * Route Guard Component
 * Protects routes based on authentication and permissions
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = true,
  permissions = [],
  redirectTo = '/login',
  fallback = null
}) => {
  const { user, hasPermission, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { isRouteAccessible } = useNavigationContext()
  
  useEffect(() => {
    // Don't check while auth is loading
    if (loading) {
      return
    }
    
    // Check authentication requirement
    if (requireAuth && !user) {
      navigate(redirectTo, { 
        replace: true, 
        state: { from: location.pathname } 
      })
      return
    }
    
    // Check permissions
    if (permissions.length > 0 && !permissions.every(p => hasPermission(p))) {
      // User is authenticated but lacks permissions
      console.warn('Access denied: Insufficient permissions')
      navigate('/', { replace: true })
      return
    }
    
    // Additional route accessibility check
    if (!isRouteAccessible(location.pathname)) {
      console.warn('Route not accessible:', location.pathname)
      navigate('/', { replace: true })
    }
  }, [
    user, 
    requireAuth, 
    permissions, 
    hasPermission, 
    navigate, 
    redirectTo, 
    location,
    loading,
    isRouteAccessible
  ])
  
  // Show loading state while auth is being verified
  if (loading) {
    return <>{fallback || <div>Loading...</div>}</>
  }
  
  // Don't render children if not authenticated when required
  if (requireAuth && !user) {
    return <>{fallback}</>
  }
  
  // Don't render children if permissions are not met
  if (permissions.length > 0 && !permissions.every(p => hasPermission(p))) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * Higher-order component for route protection
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps?: Omit<RouteGuardProps, 'children'>
): React.ComponentType<P> {
  return (props: P) => (
    <RouteGuard {...guardProps}>
      <Component {...props} />
    </RouteGuard>
  )
}