/**
 * NotificationDisplay - React component for displaying notifications
 * 
 * Supports both single notification (center overlay) and multiple notifications (stacked)
 */

import React from 'react'
import { Notification } from './NotificationManager.js'
import { useNotifications } from './NotificationProvider.js'

export interface NotificationDisplayProps {
  /**
   * Display mode
   * - 'single': Shows only the latest notification as center overlay (default)
   * - 'stack': Shows all notifications stacked
   */
  mode?: 'single' | 'stack'
  
  /**
   * Position for stacked mode
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  
  /**
   * Custom className for styling
   */
  className?: string
  
  /**
   * Whether to show dismiss button
   */
  showDismissButton?: boolean
  
  /**
   * Custom icon renderer
   */
  renderIcon?: (type: Notification['type']) => React.ReactNode
}

/**
 * Individual notification component
 */
const NotificationItem: React.FC<{
  notification: Notification
  onDismiss?: (id: string) => void
  showDismissButton?: boolean
  renderIcon?: (type: Notification['type']) => React.ReactNode
}> = ({ notification, onDismiss, showDismissButton = true, renderIcon }) => {
  const defaultIcons = {
    success: <i className="fas fa-check-circle"></i>,
    error: <i className="fas fa-exclamation-circle"></i>,
    warning: <i className="fas fa-exclamation-triangle"></i>,
    info: <i className="fas fa-info-circle"></i>
  }

  const icon = renderIcon ? renderIcon(notification.type) : defaultIcons[notification.type]

  return (
    <div className={`notification notification-${notification.type}`}>
      <div className="notification-content">
        {icon}
        <span className="notification-message">{notification.message}</span>
        {notification.action && (
          <button 
            className="notification-action"
            onClick={notification.action.handler}
          >
            {notification.action.label}
          </button>
        )}
      </div>
      {showDismissButton && notification.dismissible !== false && (
        <button 
          className="notification-dismiss"
          onClick={() => onDismiss?.(notification.id)}
          aria-label="Dismiss notification"
        >
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  )
}

/**
 * Main notification display component
 */
export const NotificationDisplay: React.FC<NotificationDisplayProps> = ({
  mode = 'single',
  position = 'top-right',
  className = '',
  showDismissButton = true,
  renderIcon
}) => {
  const { notifications, dismissToast } = useNotifications()

  // For single mode, only show the latest notification
  const displayNotifications = mode === 'single' 
    ? notifications.slice(-1) 
    : notifications

  if (displayNotifications.length === 0) {
    return null
  }

  const containerClass = mode === 'stack' 
    ? `notification-container notification-container-${position} ${className}`
    : `notification-single-container ${className}`

  return (
    <div className={containerClass}>
      {displayNotifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={dismissToast}
          showDismissButton={showDismissButton}
          renderIcon={renderIcon}
        />
      ))}
    </div>
  )
}

/**
 * Legacy NotificationBanner component for backward compatibility
 */
export interface NotificationBannerProps {
  notification: {
    message: string
    type: 'success' | 'error' | 'info'
  } | null
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ notification }) => {
  if (!notification) return null

  // Convert to new notification format
  const mockNotification: Notification = {
    id: 'legacy',
    message: notification.message,
    type: notification.type as 'success' | 'error' | 'info',
    timestamp: Date.now()
  }

  return (
    <NotificationItem
      notification={mockNotification}
      showDismissButton={false}
    />
  )
}