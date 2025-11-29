import React, { Suspense } from 'react'
import { createBrowserRouter, RouteObject } from 'react-router-dom'
import { moduleRegistry } from './ModuleRegistry.js'
import { RouteGuard } from './RouteGuard.js'

export interface CreateModularRouterOptions {
  defaultRoute?: RouteObject
  rootComponent?: React.ComponentType<{ children: React.ReactNode }>
  loadingComponent?: React.ComponentType
  errorComponent?: React.ComponentType<{ error: Error }>
  routerOptions?: Parameters<typeof createBrowserRouter>[1]
}

/**
 * Creates a modular router that integrates with the module registry
 */
export function createModularRouter(options: CreateModularRouterOptions = {}) {
  const {
    defaultRoute,
    rootComponent: RootComponent,
    loadingComponent: LoadingComponent = () => <div>Loading...</div>,
    errorComponent: ErrorComponent = ({ error }) => <div>Error: {error.message}</div>,
    routerOptions = {}
  } = options
  
  // Get routes from module registry
  const moduleRoutes = moduleRegistry.getRoutes()
  
  // Convert module routes to React Router format
  const routes: RouteObject[] = moduleRoutes.map(route => {
    const Component = route.component
    
    // Wrap component with route guard if permissions are specified
    const element = route.permissions ? (
      <RouteGuard permissions={route.permissions} requireAuth={route.meta?.requiresAuth}>
        <Suspense fallback={<LoadingComponent />}>
          <Component />
        </Suspense>
      </RouteGuard>
    ) : (
      <Suspense fallback={<LoadingComponent />}>
        <Component />
      </Suspense>
    )
    
    return {
      path: route.path,
      element,
      errorElement: <ErrorComponent error={new Error('Route error')} />
    }
  })
  
  // Add default route if provided
  if (defaultRoute) {
    routes.push(defaultRoute)
  }
  
  // Wrap all routes with root component if provided
  const finalRoutes = RootComponent ? [{
    path: '/',
    element: <RootComponent>{null}</RootComponent>,
    children: routes
  }] : routes
  
  // Create and return the router
  return createBrowserRouter(finalRoutes, {
    ...routerOptions
  })
}

/**
 * Hook to dynamically update router when modules change
 */
export function useDynamicRouter(router: ReturnType<typeof createBrowserRouter>) {
  React.useEffect(() => {
    const unsubscribe = moduleRegistry.subscribe((event, moduleId) => {
      // In a real implementation, you might want to update the router
      // when modules are registered/unregistered
      console.log(`Module ${event}: ${moduleId}`)
      
      // Note: React Router v6 doesn't support dynamic route updates
      // You would need to recreate the router or use a different approach
      // for truly dynamic routing
    })
    
    return unsubscribe
  }, [router])
}