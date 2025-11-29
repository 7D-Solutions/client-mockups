import { useCallback, useEffect, useState } from 'react'
import { useNavigate as useRouterNavigate, useLocation, useParams } from 'react-router-dom'
import { useNavigationContext } from './NavigationContext.js'
import { NavigationOptions, Module, NavigationItem } from './types.js'
import { TabStateService } from './TabStateService.js'
import { TabKey, TabState } from './types.js'

/**
 * Enhanced navigation hook that wraps React Router's useNavigate
 * with additional functionality
 */
export const useNavigate = () => {
  const { navigate } = useNavigationContext()
  return navigate
}

/**
 * Hook to get current navigation state
 */
export const useNavigationState = () => {
  const { navigationState } = useNavigationContext()
  return navigationState
}

/**
 * Hook to check if a route is accessible
 */
export const useRouteAccessibility = (path?: string) => {
  const { isRouteAccessible } = useNavigationContext()
  const location = useLocation()
  const pathToCheck = path || location.pathname
  
  return isRouteAccessible(pathToCheck)
}

/**
 * Hook to manage module registration
 */
export const useModuleRegistration = (module: Module, deps: any[] = []) => {
  const { registerModule, unregisterModule } = useNavigationContext()
  
  useEffect(() => {
    registerModule(module)
    
    return () => {
      unregisterModule(module.id)
    }
  }, deps)
}

/**
 * Hook to get navigation items
 */
export const useNavigationItems = (): NavigationItem[] => {
  const { getNavigation } = useNavigationContext()
  const [items, setItems] = useState<NavigationItem[]>([])
  
  useEffect(() => {
    setItems(getNavigation())
  }, [getNavigation])
  
  return items
}

/**
 * Hook for managing tab state
 */
export const useTabState = (key: TabKey) => {
  const [tabState, setTabStateValue] = useState(() => TabStateService.getTabState(key))
  
  const setTabState = useCallback((value: string) => {
    TabStateService.setTabState(key, value)
    setTabStateValue(value)
  }, [key])
  
  // Listen for storage events (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setTabStateValue(e.newValue)
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])
  
  return [tabState, setTabState] as const
}

/**
 * Hook to manage all tab states
 */
export const useAllTabStates = () => {
  const [tabStates, setTabStates] = useState<TabState>(() => TabStateService.getAllTabStates())
  
  const updateTabState = useCallback((key: TabKey, value: string) => {
    TabStateService.setTabState(key, value)
    setTabStates((prev: TabState) => ({ ...prev, [key]: value }))
  }, [])
  
  const updateMultipleTabStates = useCallback((updates: Partial<TabState>) => {
    TabStateService.setMultipleTabStates(updates)
    setTabStates((prev: TabState) => ({ ...prev, ...updates }))
  }, [])
  
  const resetTabStates = useCallback(() => {
    TabStateService.resetToDefaults()
    setTabStates(TabStateService.getDefaults())
  }, [])
  
  const clearTabStates = useCallback(() => {
    TabStateService.clearAllTabStates()
    setTabStates(TabStateService.getDefaults())
  }, [])
  
  // Listen for storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const tabKeys: TabKey[] = ['main', 'gauge', 'thread', 'dashboard', 'details', 'admin']
      if (e.key && tabKeys.includes(e.key as TabKey)) {
        setTabStates(TabStateService.getAllTabStates())
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
  
  return {
    tabStates,
    updateTabState,
    updateMultipleTabStates,
    resetTabStates,
    clearTabStates
  }
}

/**
 * Hook for breadcrumb navigation
 */
export const useBreadcrumbs = () => {
  const location = useLocation()
  const { getRoutes } = useNavigationContext()
  
  const breadcrumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .reduce((acc: Array<{ label: string; path: string }>, segment, index, array) => {
      const path = '/' + array.slice(0, index + 1).join('/')
      const routes = getRoutes()
      
      // Find matching route to get metadata
      const route = routes.find(r => {
        const pathPattern = r.path.replace(/:[^/]+/g, '[^/]+')
        const regex = new RegExp(`^${pathPattern}$`)
        return regex.test(path)
      })
      
      const label = route?.meta?.title || segment.charAt(0).toUpperCase() + segment.slice(1)
      
      acc.push({ label, path })
      return acc
    }, [{ label: 'Home', path: '/' }])
  
  return breadcrumbs
}

/**
 * Hook for scroll management on navigation
 */
export const useNavigationScroll = (options?: { 
  resetOnNavigate?: boolean; 
  savePosition?: boolean 
}) => {
  const location = useLocation()
  const [savedPositions, setSavedPositions] = useState<Record<string, number>>({})
  
  useEffect(() => {
    if (options?.savePosition) {
      // Save current position before navigating away
      return () => {
        setSavedPositions(prev => ({
          ...prev,
          [location.pathname]: window.scrollY
        }))
      }
    }
  }, [location.pathname, options?.savePosition])
  
  useEffect(() => {
    if (options?.resetOnNavigate) {
      window.scrollTo(0, 0)
    } else if (options?.savePosition && savedPositions[location.pathname]) {
      window.scrollTo(0, savedPositions[location.pathname])
    }
  }, [location.pathname, options?.resetOnNavigate, options?.savePosition, savedPositions])
  
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  
  const saveCurrentPosition = useCallback(() => {
    setSavedPositions(prev => ({
      ...prev,
      [location.pathname]: window.scrollY
    }))
  }, [location.pathname])
  
  return { scrollToTop, saveCurrentPosition }
}

// Re-export React Router hooks for convenience
export { useLocation, useParams } from 'react-router-dom'

// Export custom navigation hooks
export * from './hooks/useAppNavigation.js'