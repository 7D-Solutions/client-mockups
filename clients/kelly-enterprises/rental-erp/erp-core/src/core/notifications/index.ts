/**
 * Notifications module exports
 * 
 * This module provides a complete notification system including:
 * - NotificationManager for managing notification state
 * - React Provider and Hooks for integration
 * - Display components for rendering notifications
 * - Support for multiple notification types and display modes
 */

// Core notification manager and types
export {
  NotificationManager,
  notificationManager,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  dismissToast
} from './NotificationManager.js'

export type {
  Notification,
  NotificationOptions,
  NotificationListener
} from './NotificationManager.js'

// React integration
export {
  NotificationProvider,
  useNotifications,
  useNotification
} from './NotificationProvider.js'

export type {
  NotificationProviderProps
} from './NotificationProvider.js'

// Display components
export {
  NotificationDisplay,
  NotificationBanner
} from './NotificationDisplay.js'

export type {
  NotificationDisplayProps,
  NotificationBannerProps
} from './NotificationDisplay.js'

// Removed exports for moved files:
// - useNotificationState, useNotificationStateCompat (moved to review-for-delete)
// - useNotificationStateStandalone (moved to review-for-delete)
// - LocalNotification type (moved to review-for-delete)

// Re-export styles path for importing
export const notificationStyles = './styles.css'