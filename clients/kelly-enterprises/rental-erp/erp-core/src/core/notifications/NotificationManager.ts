/**
 * NotificationManager - Core notification management service
 * 
 * Provides a centralized notification system with support for multiple
 * notification types, automatic dismissal, and stacking.
 */

export interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  timestamp: number
  dismissible?: boolean
  action?: {
    label: string
    handler: () => void
  }
}

export interface NotificationOptions {
  duration?: number
  id?: string
  dismissible?: boolean
  action?: {
    label: string
    handler: () => void
  }
}

export type NotificationListener = (notifications: Notification[]) => void

export class NotificationManager {
  private notifications: Notification[] = []
  private listeners: Set<NotificationListener> = new Set()
  private defaultDuration = 3000 // 3 seconds to match current system
  private timeouts: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Subscribe to notification changes
   * @returns Unsubscribe function
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener)
    // Immediately notify with current state
    listener([...this.notifications])
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const notificationsCopy = [...this.notifications]
    this.listeners.forEach(listener => {
      try {
        listener(notificationsCopy)
      } catch (error) {
        console.error('[NotificationManager] Error in listener:', error)
      }
    })
  }

  /**
   * Generate unique ID for notifications
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Add a notification
   */
  private addNotification(
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info', 
    options: NotificationOptions = {}
  ): string {
    const id = options.id || this.generateId()
    const duration = options.duration ?? this.defaultDuration
    
    const notification: Notification = {
      id,
      message,
      type,
      duration,
      timestamp: Date.now(),
      dismissible: options.dismissible ?? true,
      action: options.action
    }

    // Cancel existing timeout if replacing notification
    const existingTimeout = this.timeouts.get(id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
      this.timeouts.delete(id)
    }

    // Remove existing notification with same ID if exists
    this.notifications = this.notifications.filter(n => n.id !== id)
    
    // Add new notification
    this.notifications.push(notification)
    this.notifyListeners()

    // Auto-remove after duration (if duration > 0)
    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.remove(id)
      }, duration)
      this.timeouts.set(id, timeout)
    }

    return id
  }

  /**
   * Remove notification by ID
   */
  remove(id: string): void {
    // Clear timeout if exists
    const timeout = this.timeouts.get(id)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(id)
    }

    const initialLength = this.notifications.length
    this.notifications = this.notifications.filter(n => n.id !== id)
    
    // Only notify if something was actually removed
    if (this.notifications.length !== initialLength) {
      this.notifyListeners()
    }
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts.clear()

    if (this.notifications.length > 0) {
      this.notifications = []
      this.notifyListeners()
    }
  }

  /**
   * Show success notification
   */
  success(message: string, options: NotificationOptions = {}): string {
    return this.addNotification(message, 'success', options)
  }

  /**
   * Show error notification
   */
  error(message: string, options: NotificationOptions = {}): string {
    return this.addNotification(message, 'error', options)
  }

  /**
   * Show warning notification
   */
  warning(message: string, options: NotificationOptions = {}): string {
    return this.addNotification(message, 'warning', options)
  }

  /**
   * Show info notification
   */
  info(message: string, options: NotificationOptions = {}): string {
    return this.addNotification(message, 'info', options)
  }

  /**
   * Show generic notification (for backward compatibility)
   */
  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', options: NotificationOptions = {}): string {
    return this.addNotification(message, type, options)
  }

  /**
   * Dismiss a toast by ID (alias for remove)
   */
  dismissToast(id: string): void {
    this.remove(id)
  }

  /**
   * Get current notifications
   */
  getNotifications(): Readonly<Notification[]> {
    return [...this.notifications]
  }

  /**
   * Get notification count
   */
  getCount(): number {
    return this.notifications.length
  }

  /**
   * Check if a notification exists
   */
  has(id: string): boolean {
    return this.notifications.some(n => n.id === id)
  }

  /**
   * Update default duration
   */
  setDefaultDuration(duration: number): void {
    if (duration >= 0) {
      this.defaultDuration = duration
    }
  }

  /**
   * Get default duration
   */
  getDefaultDuration(): number {
    return this.defaultDuration
  }

  /**
   * Clean up (for testing or unmounting)
   */
  destroy(): void {
    this.clear()
    this.listeners.clear()
  }
}

// Create default instance
export const notificationManager = new NotificationManager()

// Convenience functions using default instance
export const showSuccess = notificationManager.success.bind(notificationManager)
export const showError = notificationManager.error.bind(notificationManager)
export const showWarning = notificationManager.warning.bind(notificationManager)
export const showInfo = notificationManager.info.bind(notificationManager)
export const dismissToast = notificationManager.dismissToast.bind(notificationManager)