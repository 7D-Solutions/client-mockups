import { Route, NavigationItem } from './types.js'

/**
 * Match a path against a route pattern
 * Supports simple parameter matching like /users/:id
 */
export function matchPath(pathname: string, pattern: string): {
  matched: boolean
  params?: Record<string, string>
} {
  const patternParts = pattern.split('/')
  const pathParts = pathname.split('/')
  
  if (patternParts.length !== pathParts.length) {
    return { matched: false }
  }
  
  const params: Record<string, string> = {}
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    const pathPart = pathParts[i]
    
    if (patternPart.startsWith(':')) {
      // This is a parameter
      const paramName = patternPart.substring(1)
      params[paramName] = pathPart
    } else if (patternPart !== pathPart) {
      // Not a match
      return { matched: false }
    }
  }
  
  return { matched: true, params }
}

/**
 * Find a route that matches the given path
 */
export function findMatchingRoute(path: string, routes: Route[]): Route | undefined {
  return routes.find(route => {
    const { matched } = matchPath(path, route.path)
    return matched
  })
}

/**
 * Build a path from a pattern and params
 * Example: buildPath('/users/:id', { id: '123' }) => '/users/123'
 */
export function buildPath(pattern: string, params: Record<string, string>): string {
  let path = pattern
  
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value)
  })
  
  return path
}

/**
 * Get all parent paths for a given path
 * Example: /users/123/posts => ['/', '/users', '/users/123', '/users/123/posts']
 */
export function getParentPaths(path: string): string[] {
  const parts = path.split('/').filter(Boolean)
  const paths = ['/']
  
  parts.forEach((_, index) => {
    const parentPath = '/' + parts.slice(0, index + 1).join('/')
    paths.push(parentPath)
  })
  
  return paths
}

/**
 * Check if a navigation item is active based on current path
 */
export function isNavItemActive(item: NavigationItem, currentPath: string): boolean {
  // Exact match
  if (item.path === currentPath) {
    return true
  }
  
  // Check if current path is a child of the item path
  if (currentPath.startsWith(item.path + '/')) {
    return true
  }
  
  // Check children recursively
  if (item.children) {
    return item.children.some(child => isNavItemActive(child, currentPath))
  }
  
  return false
}

/**
 * Flatten a hierarchical navigation structure
 */
export function flattenNavigation(items: NavigationItem[]): NavigationItem[] {
  const flattened: NavigationItem[] = []
  
  const flatten = (item: NavigationItem) => {
    flattened.push(item)
    if (item.children) {
      item.children.forEach(flatten)
    }
  }
  
  items.forEach(flatten)
  return flattened
}

/**
 * Filter navigation items by permissions
 */
export function filterNavigationByPermissions(
  items: NavigationItem[],
  userPermissions: string[]
): NavigationItem[] {
  return items
    .filter(item => {
      // If no permissions required, include the item
      if (!item.permissions || item.permissions.length === 0) {
        return true
      }
      
      // Check if user has all required permissions
      return item.permissions.every(permission => 
        userPermissions.includes(permission)
      )
    })
    .map(item => ({
      ...item,
      // Recursively filter children
      children: item.children 
        ? filterNavigationByPermissions(item.children, userPermissions)
        : undefined
    }))
}

/**
 * Generate a URL-safe slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/--+/g, '-') // Replace multiple - with single -
    .trim()
}

/**
 * Parse query string into object
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString)
  const result: Record<string, string> = {}
  
  params.forEach((value, key) => {
    result[key] = value
  })
  
  return result
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, string | number | boolean>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}