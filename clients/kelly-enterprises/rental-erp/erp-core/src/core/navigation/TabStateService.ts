import { TabKey, TabState } from './types.js'

/**
 * Tab state management service
 * Centralizes localStorage operations for UI tab states
 * Extracted from Fireproof Gauge System
 */

const TAB_DEFAULTS: TabState = {
  main: 'gauge-management',
  gauge: 'all',
  thread: 'all',
  dashboard: 'personal',
  details: 'details',
  admin: 'users'
}

export { TabKey, TabState } from './types.js'

export const TabStateService = {
  /**
   * Get a specific tab state
   */
  getTabState: (key: TabKey): string => {
    try {
      return localStorage.getItem(key) || TAB_DEFAULTS[key]
    } catch (error) {
      console.warn(`Failed to get tab state for ${key}:`, error)
      return TAB_DEFAULTS[key]
    }
  },

  /**
   * Get all tab states at once
   */
  getAllTabStates: (): TabState => {
    try {
      return {
        main: localStorage.getItem('main') || TAB_DEFAULTS.main,
        gauge: localStorage.getItem('gauge') || TAB_DEFAULTS.gauge,
        thread: localStorage.getItem('thread') || TAB_DEFAULTS.thread,
        dashboard: localStorage.getItem('dashboard') || TAB_DEFAULTS.dashboard,
        details: localStorage.getItem('details') || TAB_DEFAULTS.details,
        admin: localStorage.getItem('admin') || TAB_DEFAULTS.admin
      }
    } catch (error) {
      console.warn('Failed to get tab states:', error)
      return TAB_DEFAULTS
    }
  },

  /**
   * Set a specific tab state
   */
  setTabState: (key: TabKey, value: string): void => {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error(`Failed to set tab state for ${key}:`, error)
    }
  },

  /**
   * Update multiple tab states at once
   */
  setMultipleTabStates: (states: Partial<TabState>): void => {
    Object.entries(states).forEach(([key, value]) => {
      if (value !== undefined) {
        TabStateService.setTabState(key as TabKey, value)
      }
    })
  },

  /**
   * Clear all tab states (used on logout)
   */
  clearAllTabStates: (): void => {
    const keys: TabKey[] = ['main', 'gauge', 'thread', 'dashboard', 'details', 'admin']
    keys.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`Failed to clear tab state for ${key}:`, error)
      }
    })
  },

  /**
   * Reset tab states to defaults
   */
  resetToDefaults: (): void => {
    Object.entries(TAB_DEFAULTS).forEach(([key, value]) => {
      try {
        localStorage.setItem(key, value)
      } catch (error) {
        console.error(`Failed to reset tab state for ${key}:`, error)
      }
    })
  },

  /**
   * Get default tab state
   */
  getDefaults: (): TabState => {
    return { ...TAB_DEFAULTS }
  },

  /**
   * Check if localStorage is available
   */
  isStorageAvailable: (): boolean => {
    try {
      const testKey = '__navigation_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }
}