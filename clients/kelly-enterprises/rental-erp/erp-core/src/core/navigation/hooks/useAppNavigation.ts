import { useState, useEffect } from 'react'
import { TabStateService } from '../TabStateService.js'

/**
 * Custom hook for managing application navigation state
 * Extracted from Fireproof Gauge System MainApp.tsx
 */
export const useAppNavigation = () => {
  // Initialize tab states from localStorage
  const [activeTab, setActiveTab] = useState(() => 
    TabStateService.getTabState('main')
  )
  const [activeGaugeTab, setActiveGaugeTab] = useState(() => 
    TabStateService.getTabState('gauge')
  )
  const [activeThreadTab, setActiveThreadTab] = useState(() => 
    TabStateService.getTabState('thread')
  )
  const [activeDashboardTab, setActiveDashboardTab] = useState(() => 
    TabStateService.getTabState('dashboard')
  )
  const [detailsActiveTab, setDetailsActiveTab] = useState(() => 
    TabStateService.getTabState('details')
  )
  const [activeAdminTab, setActiveAdminTab] = useState(() => 
    TabStateService.getTabState('admin')
  )

  // Persist tab states to localStorage
  useEffect(() => {
    TabStateService.setTabState('main', activeTab)
  }, [activeTab])

  useEffect(() => {
    TabStateService.setTabState('gauge', activeGaugeTab)
  }, [activeGaugeTab])

  useEffect(() => {
    TabStateService.setTabState('thread', activeThreadTab)
  }, [activeThreadTab])

  useEffect(() => {
    TabStateService.setTabState('dashboard', activeDashboardTab)
  }, [activeDashboardTab])

  useEffect(() => {
    TabStateService.setTabState('details', detailsActiveTab)
  }, [detailsActiveTab])

  useEffect(() => {
    TabStateService.setTabState('admin', activeAdminTab)
  }, [activeAdminTab])

  // Reset all navigation states to defaults
  const resetNavigationStates = () => {
    setActiveTab('gauge-management')
    setActiveGaugeTab('company')
    setActiveThreadTab('all')
    setActiveDashboardTab('personal')
    setDetailsActiveTab('details')
    setActiveAdminTab('users')
  }

  // Clear all navigation states (for logout)
  const clearNavigationStates = () => {
    TabStateService.clearAllTabStates()
    resetNavigationStates()
  }

  return {
    // Tab states
    activeTab,
    setActiveTab,
    activeGaugeTab,
    setActiveGaugeTab,
    activeThreadTab,
    setActiveThreadTab,
    activeDashboardTab,
    setActiveDashboardTab,
    detailsActiveTab,
    setDetailsActiveTab,
    activeAdminTab,
    setActiveAdminTab,
    
    // Actions
    resetNavigationStates,
    clearNavigationStates
  }
}