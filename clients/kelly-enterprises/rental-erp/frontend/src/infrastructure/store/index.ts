// Modular Zustand store with namespaced module states
import { create } from 'zustand';
import type { Gauge, GaugeCategory, GaugeCreationData } from '../../modules/gauge/types';
import type { SystemSettings } from '../../modules/admin/types';
import type { UserProfile, UserPreferences } from '../../modules/user/types';
// Note: Using basic zustand without middleware for now
// Persist and immer middleware can be added when needed for production deployment

// Shared application state
interface SharedState {
  theme: 'light' | 'dark';
  notifications: Notification[];
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
  duration?: number; // Custom duration for this notification
}

// Gauge module state
interface GaugeModuleState {
  selectedGaugeId: string | null;
  filters: {
    status?: string;
    category?: string;
    location?: string;
    search?: string;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  cache: {
    gauges: Record<string, Gauge>;
    lastFetch: number;
  };
  // Gauge creation workflow state
  createGauge: {
    // Workflow state
    currentStep: number;
    isSubmitting: boolean;
    
    // Form data
    equipmentType: string;
    categoryId: string;
    categoryName: string;
    formData: Partial<GaugeCreationData>;
    
    // Categories cache
    categoriesCache: Record<string, GaugeCategory[]>;
  };
}

// Admin module state  
interface AdminModuleState {
  selectedUserId: string | null;
  userFilters: {
    role?: string;
    status?: string;
    search?: string;
  };
  systemSettings: Record<string, SystemSettings>;
  auditLog: {
    page: number;
    filters: Partial<{
      userId: string;
      action: string;
      resource: string;
      startDate: string;
      endDate: string;
    }>;
  };
}

// User module state
interface UserModuleState {
  profile: UserProfile | null;
  preferences: UserPreferences;
  isProfileLoading: boolean;
}

// Navigation module state
interface NavigationModuleState {
  currentPage: string;
  favorites: string[];
}

// Combined application state
interface AppState {
  // Shared state
  shared: SharedState;

  // Module states
  gauge: GaugeModuleState;
  admin: AdminModuleState;
  user: UserModuleState;
  navigation: NavigationModuleState;

  // Shared actions
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  dismissAllActiveToasts: () => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;

  // Gauge actions
  setSelectedGauge: (id: string | null) => void;
  updateGaugeFilters: (filters: Partial<GaugeModuleState['filters']>) => void;
  setGaugeSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setGaugeViewMode: (mode: 'grid' | 'list') => void;
  updateGaugeCache: (gauges: Record<string, Gauge>) => void;

  // Gauge creation actions
  setCreateGaugeStep: (step: number) => void;
  setEquipmentType: (type: string) => void;
  setGaugeCategory: (id: string, name: string) => void;
  updateGaugeFormData: (data: Partial<GaugeCreationData>) => void;
  resetGaugeForm: () => void;
  setCategoriesCache: (equipmentType: string, categories: GaugeCategory[]) => void;
  setGaugeSubmitting: (isSubmitting: boolean) => void;

  // Admin actions
  setSelectedUser: (id: string | null) => void;
  updateUserFilters: (filters: Partial<AdminModuleState['userFilters']>) => void;
  updateSystemSettings: (settings: Record<string, SystemSettings>) => void;
  updateAuditLogPage: (page: number) => void;

  // User actions
  setProfile: (profile: UserProfile | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  setProfileLoading: (loading: boolean) => void;

  // Navigation actions
  setCurrentPage: (page: string) => void;
  setNavigationFavorites: (favorites: string[]) => void;
  addNavigationFavorite: (itemId: string) => void;
  removeNavigationFavorite: (itemId: string) => void;
  reorderNavigationFavorites: (order: string[]) => void;
}

const initialSharedState: SharedState = {
  theme: 'light',
  notifications: [],
  loading: {},
  errors: {},
};

const initialGaugeState: GaugeModuleState = {
  selectedGaugeId: null,
  filters: {},
  sortBy: 'name',
  sortOrder: 'asc',
  viewMode: 'list',
  cache: {
    gauges: {},
    lastFetch: 0,
  },
  createGauge: {
    currentStep: 0,
    isSubmitting: false,
    equipmentType: '',
    categoryId: '',
    categoryName: '',
    formData: {},
    categoriesCache: {},
  },
};

const initialAdminState: AdminModuleState = {
  selectedUserId: null,
  userFilters: {},
  systemSettings: {},
  auditLog: {
    page: 1,
    filters: {},
  },
};

const initialUserState: UserModuleState = {
  profile: null,
  preferences: {
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    emailNotifications: true,
    pushNotifications: false,
    gaugeAlerts: true,
    maintenanceReminders: true,
    defaultView: 'list',
    itemsPerPage: 50,
  },
  isProfileLoading: false,
};

const initialNavigationState: NavigationModuleState = {
  currentPage: 'gauge-management',
  favorites: [],
};

export const useAppStore = create<AppState>()((set, _get) => ({
      // Initial state
      shared: initialSharedState,
      gauge: initialGaugeState,
      admin: initialAdminState,
      user: initialUserState,
      navigation: initialNavigationState,

      // Shared actions
      setTheme: (theme) => {
        set((state) => ({
          ...state,
          shared: { ...state.shared, theme }
        }));
      },

      addNotification: (notification) => {
        set((state) => {
          // Check for duplicate notifications based on title and message
          const isDuplicate = state.shared.notifications.some(n => 
            n.title === notification.title && 
            n.message === notification.message && 
            !n.read && 
            (Date.now() - n.timestamp) < 30000 // Within last 30 seconds
          );
          
          if (isDuplicate) {
            return state; // Don't add duplicate
          }
          
          const newNotification: Notification = {
            ...notification,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            read: false,
          };
          const notifications = [newNotification, ...state.shared.notifications];
          
          // Keep only last 50 notifications
          const trimmedNotifications = notifications.length > 50 
            ? notifications.slice(0, 50) 
            : notifications;
            
          return {
            ...state,
            shared: { ...state.shared, notifications: trimmedNotifications }
          };
        });
      },

      markNotificationRead: (id) => {
        set((state) => ({
          ...state,
          shared: {
            ...state.shared,
            notifications: state.shared.notifications.map(n => 
              n.id === id ? { ...n, read: true } : n
            )
          }
        }));
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          ...state,
          shared: {
            ...state.shared,
            notifications: state.shared.notifications.map(n => ({ ...n, read: true }))
          }
        }));
      },

      clearNotifications: () => {
        set((state) => ({
          ...state,
          shared: { ...state.shared, notifications: [] }
        }));
      },

      removeNotification: (id: string) => {
        set((state) => ({
          ...state,
          shared: {
            ...state.shared,
            notifications: state.shared.notifications.filter(n => n.id !== id)
          }
        }));
      },

      dismissAllActiveToasts: () => {
        set((state) => ({
          ...state,
          shared: {
            ...state.shared,
            notifications: state.shared.notifications.filter(n => n.read)
          }
        }));
      },

      setLoading: (key, loading) => {
        set((state) => {
          const newLoading = { ...state.shared.loading };
          if (loading) {
            newLoading[key] = true;
          } else {
            delete newLoading[key];
          }
          return {
            ...state,
            shared: { ...state.shared, loading: newLoading }
          };
        });
      },

      setError: (key, error) => {
        set((state) => {
          const newErrors = { ...state.shared.errors };
          if (error) {
            newErrors[key] = error;
          } else {
            delete newErrors[key];
          }
          return {
            ...state,
            shared: { ...state.shared, errors: newErrors }
          };
        });
      },

      // Gauge actions
      setSelectedGauge: (id) => {
        set((state) => ({
          ...state,
          gauge: { ...state.gauge, selectedGaugeId: id }
        }));
      },

      updateGaugeFilters: (filters) => {
        set((state) => ({
          ...state,
          gauge: { ...state.gauge, filters: { ...state.gauge.filters, ...filters } }
        }));
      },

      clearGaugeFilters: () => {
        set((state) => ({
          ...state,
          gauge: { ...state.gauge, filters: {} }
        }));
      },

      setGaugeSort: (sortBy, sortOrder) => {
        set((state) => ({
          ...state,
          gauge: { ...state.gauge, sortBy, sortOrder }
        }));
      },

      setGaugeViewMode: (mode) => {
        set((state) => ({
          ...state,
          gauge: { ...state.gauge, viewMode: mode }
        }));
      },

      updateGaugeCache: (gauges) => {
        set((state) => ({
          ...state,
          gauge: {
            ...state.gauge,
            cache: {
              gauges: { ...state.gauge.cache.gauges, ...gauges },
              lastFetch: Date.now()
            }
          }
        }));
      },

      // Gauge creation actions
      setCreateGaugeStep: (step) => {
        set((state) => ({
          ...state,
          gauge: {
            ...state.gauge,
            createGauge: { ...state.gauge.createGauge, currentStep: step }
          }
        }));
      },

      setEquipmentType: (type) => {
        set((state) => ({
          ...state,
          gauge: {
            ...state.gauge,
            createGauge: { ...state.gauge.createGauge, equipmentType: type }
          }
        }));
      },

      setGaugeCategory: (id, name) => {
        set((state) => ({
          ...state,
          gauge: {
            ...state.gauge,
            createGauge: {
              ...state.gauge.createGauge,
              categoryId: id,
              categoryName: name
            }
          }
        }));
      },

      updateGaugeFormData: (data) => {
        set((state) => ({
          ...state,
          gauge: {
            ...state.gauge,
            createGauge: {
              ...state.gauge.createGauge,
              formData: { ...state.gauge.createGauge.formData, ...data }
            }
          }
        }));
      },

      resetGaugeForm: () => {
        set((state) => ({
          ...state,
          gauge: {
            ...state.gauge,
            createGauge: {
              currentStep: 0,
              isSubmitting: false,
              equipmentType: '',
              categoryId: '',
              categoryName: '',
              formData: {},
              categoriesCache: state.gauge.createGauge.categoriesCache, // Keep cache
            }
          }
        }));
      },

      setCategoriesCache: (equipmentType, categories) => {
        set((state) => ({
          ...state,
          gauge: {
            ...state.gauge,
            createGauge: {
              ...state.gauge.createGauge,
              categoriesCache: {
                ...state.gauge.createGauge.categoriesCache,
                [equipmentType]: categories
              }
            }
          }
        }));
      },

      setGaugeSubmitting: (isSubmitting) => {
        set((state) => ({
          ...state,
          gauge: {
            ...state.gauge,
            createGauge: { ...state.gauge.createGauge, isSubmitting }
          }
        }));
      },

      // Admin actions
      setSelectedUser: (id) => {
        set((state) => ({
          ...state,
          admin: { ...state.admin, selectedUserId: id }
        }));
      },

      updateUserFilters: (filters) => {
        set((state) => ({
          ...state,
          admin: { ...state.admin, userFilters: { ...state.admin.userFilters, ...filters } }
        }));
      },

      updateSystemSettings: (settings) => {
        set((state) => ({
          ...state,
          admin: { ...state.admin, systemSettings: { ...state.admin.systemSettings, ...settings } }
        }));
      },

      updateAuditLogPage: (page) => {
        set((state) => ({
          ...state,
          admin: { ...state.admin, auditLog: { ...state.admin.auditLog, page } }
        }));
      },

      // User actions
      setProfile: (profile) => {
        set((state) => ({
          ...state,
          user: { ...state.user, profile }
        }));
      },

      updatePreferences: (preferences) => {
        set((state) => ({
          ...state,
          user: {
            ...state.user,
            preferences: { ...state.user.preferences, ...preferences }
          }
        }));
      },

      setProfileLoading: (loading) => {
        set((state) => ({
          ...state,
          user: { ...state.user, isProfileLoading: loading }
        }));
      },

      // Navigation actions
      setCurrentPage: (page) => {
        set((state) => ({
          ...state,
          navigation: { ...state.navigation, currentPage: page }
        }));
      },

      setNavigationFavorites: (favorites) => {
        set((state) => ({
          ...state,
          navigation: { ...state.navigation, favorites }
        }));
      },

      addNavigationFavorite: (itemId) => {
        set((state) => ({
          ...state,
          navigation: {
            ...state.navigation,
            favorites: [...state.navigation.favorites, itemId]
          }
        }));
      },

      removeNavigationFavorite: (itemId) => {
        set((state) => ({
          ...state,
          navigation: {
            ...state.navigation,
            favorites: state.navigation.favorites.filter(id => id !== itemId)
          }
        }));
      },

      reorderNavigationFavorites: (order) => {
        set((state) => ({
          ...state,
          navigation: { ...state.navigation, favorites: order }
        }));
      },
    }));

// Module-specific selectors for performance
export const useSharedState = () => useAppStore((state) => state.shared);
export const useGaugeState = () => useAppStore((state) => state.gauge);
export const useAdminState = () => useAppStore((state) => state.admin);

// Action selectors
export const useSharedActions = () => useAppStore((state) => ({
  setTheme: state.setTheme,
  addNotification: state.addNotification,
  markNotificationRead: state.markNotificationRead,
  markAllNotificationsRead: state.markAllNotificationsRead,
  clearNotifications: state.clearNotifications,
  removeNotification: state.removeNotification,
  dismissAllActiveToasts: state.dismissAllActiveToasts,
  setLoading: state.setLoading,
  setError: state.setError,
}));

export const useGaugeActions = () => useAppStore((state) => ({
  setSelectedGauge: state.setSelectedGauge,
  updateGaugeFilters: state.updateGaugeFilters,
  clearGaugeFilters: state.clearGaugeFilters,
  setGaugeSort: state.setGaugeSort,
  setGaugeViewMode: state.setGaugeViewMode,
  updateGaugeCache: state.updateGaugeCache,
  // Gauge creation actions
  setCreateGaugeStep: state.setCreateGaugeStep,
  setEquipmentType: state.setEquipmentType,
  setGaugeCategory: state.setGaugeCategory,
  updateGaugeFormData: state.updateGaugeFormData,
  resetGaugeForm: state.resetGaugeForm,
  setCategoriesCache: state.setCategoriesCache,
  setGaugeSubmitting: state.setGaugeSubmitting,
}));

export const useAdminActions = () => useAppStore((state) => ({
  setSelectedUser: state.setSelectedUser,
  updateUserFilters: state.updateUserFilters,
  updateSystemSettings: state.updateSystemSettings,
  updateAuditLogPage: state.updateAuditLogPage,
}));

export const useUserState = () => useAppStore((state) => state.user);

export const useUserActions = () => useAppStore((state) => ({
  setProfile: state.setProfile,
  updatePreferences: state.updatePreferences,
  setProfileLoading: state.setProfileLoading,
}));

export const useNavigationState = () => useAppStore((state) => state.navigation);

export const useNavigationActions = () => useAppStore((state) => ({
  setCurrentPage: state.setCurrentPage,
  setNavigationFavorites: state.setNavigationFavorites,
  addNavigationFavorite: state.addNavigationFavorite,
  removeNavigationFavorite: state.removeNavigationFavorite,
  reorderNavigationFavorites: state.reorderNavigationFavorites,
}));

// Export module synchronization
export * from './moduleSync';