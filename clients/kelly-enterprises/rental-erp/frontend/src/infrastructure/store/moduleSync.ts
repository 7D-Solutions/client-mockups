// Module state synchronization and cross-module state management
import { useAppStore } from './index';
import { eventBus, moduleEventManager, EVENTS } from '../events';

// Cross-module state synchronization utilities
export class ModuleStateSync {
  private static instance: ModuleStateSync;
  private syncSubscriptions: (() => void)[] = [];

  static getInstance(): ModuleStateSync {
    if (!ModuleStateSync.instance) {
      ModuleStateSync.instance = new ModuleStateSync();
    }
    return ModuleStateSync.instance;
  }

  initialize() {
    this.setupGaugeAdminSync();
    this.setupNotificationSync();
    this.setupPermissionSync();
  }

  destroy() {
    this.syncSubscriptions.forEach(unsub => unsub());
    this.syncSubscriptions = [];
  }

  // Sync gauge operations to admin audit trail
  private setupGaugeAdminSync() {
    const unsubGaugeUpdated = eventBus.on(EVENTS.GAUGE_UPDATED, (data) => {
      const store = useAppStore.getState();
      
      // Add notification for admin users
      if (store.shared.notifications.length < 50) {
        store.addNotification({
          type: 'info',
          title: 'Gauge Updated',
          message: `Gauge ${data.gaugeId} was updated by ${data.changes?.user || 'system'}`
        });
      }

      // Update admin audit data if admin module is active
      const adminState = store.admin;
      if (adminState) {
        // This would integrate with admin audit logs when fully implemented
      }
    });

    const unsubGaugeCheckout = eventBus.on(EVENTS.GAUGE_CHECKED_OUT, (_data) => {
      // Notification already handled by useGaugeOperations hook
      // Sync with admin dashboard metrics
      // This would update admin dashboard counters
    });

    const unsubGaugeReturn = eventBus.on(EVENTS.GAUGE_RETURNED, (_data) => {
      // Notification already handled by useGaugeOperations hook
      // This would update admin dashboard counters
    });

    this.syncSubscriptions.push(unsubGaugeUpdated, unsubGaugeCheckout, unsubGaugeReturn);
  }

  // Sync notifications across modules
  private setupNotificationSync() {
    const unsubNotification = eventBus.on(EVENTS.NOTIFICATION_SHOW, (data) => {
      const store = useAppStore.getState();
      store.addNotification({
        type: data.type,
        title: data.title,
        message: data.message
      });
    });

    this.syncSubscriptions.push(unsubNotification);
  }

  // Sync permission changes from admin to gauge module
  private setupPermissionSync() {
    const unsubPermissionChange = eventBus.on(EVENTS.USER_PERMISSIONS_CHANGED, (data) => {
      const store = useAppStore.getState();

      // Clear relevant caches when permissions change
      store.updateGaugeCache({});

      // Show notification
      store.addNotification({
        type: 'warning',
        title: 'Permissions Updated',
        message: data.userName
          ? `Permissions have been updated for ${data.userName}`
          : 'Your permissions have been updated'
      });

      // Force refresh of navigation based on new permissions
      // This would trigger navigation re-render
    });

    this.syncSubscriptions.push(unsubPermissionChange);
  }

  // Get shared module statistics for dashboard
  getModuleStatistics() {
    const store = useAppStore.getState();
    const eventHistory = moduleEventManager.getEventHistory();

    return {
      gauge: {
        selectedGauge: store.gauge.selectedGaugeId,
        activeFilters: Object.keys(store.gauge.filters).length,
        cacheSize: Object.keys(store.gauge.cache.gauges).length,
        lastCacheUpdate: store.gauge.cache.lastFetch,
      },
      admin: {
        selectedUser: store.admin.selectedUserId,
        activeFilters: Object.keys(store.admin.userFilters).length,
        auditPage: store.admin.auditLog.page,
      },
      shared: {
        theme: store.shared.theme,
        unreadNotifications: store.shared.notifications.filter(n => !n.read).length,
        totalNotifications: store.shared.notifications.length,
        activeLoading: Object.keys(store.shared.loading).length,
        activeErrors: Object.keys(store.shared.errors).length,
      },
      events: {
        totalEvents: eventHistory.length,
        recentEvents: eventHistory.slice(-10).map(e => ({
          event: e.event,
          timestamp: e.timestamp,
        })),
      },
    };
  }

  // Clear all module caches
  clearAllModuleCaches() {
    const store = useAppStore.getState();
    store.updateGaugeCache({});
    store.clearNotifications();
    moduleEventManager.clearEventHistory();
  }

  // Emergency reset - clear all module states
  emergencyReset() {
    const store = useAppStore.getState();
    
    // Reset to initial states
    store.setSelectedGauge(null);
    store.setSelectedUser(null);
    store.updateGaugeFilters({});
    store.updateUserFilters({});
    store.clearNotifications();
    
    // Clear caches
    this.clearAllModuleCaches();

    // Emit system reset event
    eventBus.emit('system:reset', { timestamp: Date.now() });
  }
}

// Singleton instance
export const moduleStateSync = ModuleStateSync.getInstance();

// React hook for module statistics
import { useState, useEffect } from 'react';

export const useModuleStatistics = (refreshInterval = 5000) => {
  const [statistics, setStatistics] = useState(() => moduleStateSync.getModuleStatistics());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatistics(moduleStateSync.getModuleStatistics());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return statistics;
};

// Note: moduleStateSync.initialize() now called in App.tsx useEffect for proper lifecycle management