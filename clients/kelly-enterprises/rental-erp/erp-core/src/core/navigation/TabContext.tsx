import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { TabState } from './types.js'

interface TabContextType {
  tabs: TabState
  setTab: (category: keyof TabState, value: string) => void
}

const TabContext = createContext<TabContextType | undefined>(undefined)

export const useTabContext = () => {
  const context = useContext(TabContext)
  if (!context) {
    throw new Error('useTabContext must be used within TabProvider')
  }
  return context
}

interface TabProviderProps {
  children: ReactNode
}

export const TabProvider: React.FC<TabProviderProps> = ({ children }) => {
  const [tabs, setTabs] = useState<TabState>({
    main: 'gauge-management',
    gauge: 'all', 
    thread: 'all',
    dashboard: 'personal',
    details: 'details',
    admin: 'users'
  })
  
  const setTab = useCallback((category: keyof TabState, value: string) => {
    setTabs(prev => ({ ...prev, [category]: value }))
  }, [])
  
  const value: TabContextType = {
    tabs,
    setTab
  }
  
  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  )
}