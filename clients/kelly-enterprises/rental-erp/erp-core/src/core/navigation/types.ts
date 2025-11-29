import React from 'react'

// Navigation types
export interface NavigationItem {
  label: string
  path: string
  icon?: React.ComponentType | string
  permissions?: string[]
  badge?: number | string
  children?: NavigationItem[]
}

export interface Route {
  path: string
  component: React.ComponentType
  exact?: boolean
  permissions?: string[]
  meta?: {
    title?: string
    requiresAuth?: boolean
  }
}

export interface Module {
  id: string
  name: string
  version?: string
  routes: Route[]
  permissions?: string[]
  navigation?: NavigationItem[]
  dependencies?: string[]
  onLoad?: () => void | Promise<void>
  onUnload?: () => void | Promise<void>
}

export type TabKey = 'main' | 'gauge' | 'thread' | 'dashboard' | 'details' | 'admin'

export interface TabState {
  main: string
  gauge: string
  thread: string
  dashboard: string
  details: string
  admin: string
}

export interface NavigationState {
  currentRoute: string
  previousRoute: string | null
  isNavigating: boolean
  navigationHistory: string[]
}

export interface NavigationContextValue {
  navigationState: NavigationState
  navigate: (path: string, options?: NavigationOptions) => void
  goBack: () => void
  canGoBack: boolean
  registerModule: (module: Module) => void
  unregisterModule: (moduleId: string) => void
  getRoutes: () => Route[]
  getNavigation: () => NavigationItem[]
  isRouteAccessible: (path: string) => boolean
}

export interface NavigationOptions {
  replace?: boolean
  state?: any
  preventScrollReset?: boolean
}