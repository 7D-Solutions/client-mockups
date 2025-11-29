import React, { useState, useCallback, useEffect, useMemo, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { NavigationContext } from './NavigationContext.js'
import { NavigationState, NavigationOptions, Module, Route, NavigationItem } from './types.js'
import { moduleRegistry } from './ModuleRegistry.js'
import { useAuth } from '../auth/index.js'

interface NavigationProviderProps {
  children: ReactNode
  maxHistorySize?: number
}

/**
 * Navigation Provider Component
 * Manages navigation state, history, and module integration
 */
export const NavigationProvider: React.FC<NavigationProviderProps> = ({ 
  children, 
  maxHistorySize = 50 
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, hasPermission } = useAuth()
  
  // Navigation state
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentRoute: location.pathname,
    previousRoute: null,
    isNavigating: false,
    navigationHistory: [location.pathname]
  })

  // Update navigation state when location changes
  useEffect(() => {
    setNavigationState(prev => {
      const newHistory = [...prev.navigationHistory, location.pathname]
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.splice(0, newHistory.length - maxHistorySize)
      }
      
      return {
        currentRoute: location.pathname,
        previousRoute: prev.currentRoute,
        isNavigating: false,
        navigationHistory: newHistory
      }
    })
  }, [location.pathname, maxHistorySize])

  // Navigation function
  const handleNavigate = useCallback((path: string, options?: NavigationOptions) => {
    // Check if route is accessible
    const routes = moduleRegistry.getRoutes()
    const route = routes.find(r => {
      // Simple path matching (could be enhanced with path-to-regexp)
      const pathPattern = r.path.replace(/:[^/]+/g, '[^/]+')
      const regex = new RegExp(`^${pathPattern}$`)
      return regex.test(path)
    })
    
    if (route?.permissions && !route.permissions.every(p => hasPermission(p))) {
      console.warn(`Navigation blocked: Insufficient permissions for ${path}`)
      return
    }
    
    setNavigationState(prev => ({ ...prev, isNavigating: true }))
    
    if (options?.replace) {
      navigate(path, { replace: true, state: options?.state })
    } else {
      navigate(path, { state: options?.state })
    }
    
    // Handle scroll reset
    if (!options || !options.preventScrollReset) {
      window.scrollTo(0, 0)
    }
  }, [navigate, hasPermission])

  // Go back function
  const goBack = useCallback(() => {
    const historyLength = navigationState.navigationHistory.length
    if (historyLength > 1) {
      navigate(-1)
    }
  }, [navigate, navigationState.navigationHistory])

  // Check if can go back
  const canGoBack = useMemo(() => {
    return navigationState.navigationHistory.length > 1
  }, [navigationState.navigationHistory])

  // Register module
  const registerModule = useCallback((module: Module) => {
    moduleRegistry.register(module)
  }, [])

  // Unregister module
  const unregisterModule = useCallback((moduleId: string) => {
    moduleRegistry.unregister(moduleId)
  }, [])

  // Get all routes
  const getRoutes = useCallback((): Route[] => {
    return moduleRegistry.getRoutes()
  }, [])

  // Get navigation items
  const getNavigation = useCallback((): NavigationItem[] => {
    const allNavItems = moduleRegistry.getNavigation()
    
    // Filter by permissions if user is authenticated
    if (user) {
      return allNavItems.filter(item => {
        if (!item.permissions || item.permissions.length === 0) {
          return true
        }
        return item.permissions.every(p => hasPermission(p))
      })
    }
    
    // Return only public navigation items if not authenticated
    return allNavItems.filter(item => !item.permissions || item.permissions.length === 0)
  }, [user, hasPermission])

  // Check if route is accessible
  const isRouteAccessible = useCallback((path: string): boolean => {
    const routes = getRoutes()
    const route = routes.find(r => {
      const pathPattern = r.path.replace(/:[^/]+/g, '[^/]+')
      const regex = new RegExp(`^${pathPattern}$`)
      return regex.test(path)
    })
    
    if (!route) {
      return true // Allow unknown routes (they might be handled elsewhere)
    }
    
    if (route.meta?.requiresAuth && !user) {
      return false
    }
    
    if (route.permissions && route.permissions.length > 0) {
      return route.permissions.every(p => hasPermission(p))
    }
    
    return true
  }, [getRoutes, user, hasPermission])

  const contextValue = useMemo(() => ({
    navigationState,
    navigate: handleNavigate,
    goBack,
    canGoBack,
    registerModule,
    unregisterModule,
    getRoutes,
    getNavigation,
    isRouteAccessible
  }), [
    navigationState,
    handleNavigate,
    goBack,
    canGoBack,
    registerModule,
    unregisterModule,
    getRoutes,
    getNavigation,
    isRouteAccessible
  ])

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  )
}