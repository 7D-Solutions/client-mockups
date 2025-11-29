import React, { createContext, useContext } from 'react'
import { NavigationContextValue } from './types.js'

/**
 * Navigation context for providing navigation state and functions
 * throughout the application
 */
export const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

/**
 * Hook to access navigation context
 * @throws Error if used outside NavigationProvider
 */
export const useNavigationContext = (): NavigationContextValue => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider')
  }
  return context
}