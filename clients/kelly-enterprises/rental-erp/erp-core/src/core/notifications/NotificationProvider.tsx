/**
 * NotificationProvider - React context provider for notifications
 * 
 * Provides notification functionality to React components through context
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { 
  Notification, 
  NotificationOptions, 
  NotificationManager,
  notificationManager,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  dismissToast
} from './NotificationManager.js'

interface NotificationContextValue {
  notifications: Notification[]
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
  showSuccess: (message: string, options?: NotificationOptions) => string
  showError: (message: string, options?: NotificationOptions) => string
  showWarning: (message: string, options?: NotificationOptions) => string
  showInfo: (message: string, options?: NotificationOptions) => string
  dismissToast: (id: string) => void
  clear: () => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export interface NotificationProviderProps {
  children: ReactNode
  manager?: NotificationManager
}

/**
 * NotificationProvider component
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  manager = notificationManager 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Subscribe to notification manager
  useEffect(() => {
    const unsubscribe = manager.subscribe((newNotifications: Notification[]) => {
      setNotifications(newNotifications)
    })

    return () => {
      unsubscribe()
    }
  }, [manager])

  // Legacy showNotification function for backward compatibility
  const showNotification = useCallback((
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    manager.show(message, type)
  }, [manager])

  // Context value with all notification methods
  const contextValue: NotificationContextValue = {
    notifications,
    showNotification,
    showSuccess: manager.success.bind(manager),
    showError: manager.error.bind(manager),
    showWarning: manager.warning.bind(manager),
    showInfo: manager.info.bind(manager),
    dismissToast: manager.dismissToast.bind(manager),
    clear: manager.clear.bind(manager),
    clearAll: manager.clear.bind(manager)
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

/**
 * Hook to use notifications
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext)
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  
  return context
}

/**
 * Hook for components that only need the showNotification function
 * (for backward compatibility with existing code)
 */
export const useNotification = () => {
  const { showNotification } = useNotifications()
  return showNotification
}