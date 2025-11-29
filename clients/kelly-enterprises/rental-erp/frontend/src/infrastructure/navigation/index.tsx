// Navigation infrastructure for module routing
import { ReactNode } from 'react';
import { PermissionRules } from '../business/permissionRules';

export interface NavigationItem {
  path: string;
  label: string;
  icon?: string;
  permissions?: string[];
  children?: NavigationItem[];
}

export interface ModuleNavigation {
  moduleId: string;
  items: NavigationItem[];
}

// Navigation registry for modules
class NavigationRegistry {
  private modules: Map<string, ModuleNavigation> = new Map();

  register(moduleId: string, navigation: NavigationItem[]): void {
    this.modules.set(moduleId, {
      moduleId,
      items: navigation,
    });
  }

  unregister(moduleId: string): void {
    this.modules.delete(moduleId);
  }

  getNavigation(moduleId: string): NavigationItem[] {
    return this.modules.get(moduleId)?.items || [];
  }

  getAllNavigation(): ModuleNavigation[] {
    return Array.from(this.modules.values());
  }

  // Filter navigation by user permissions
  filterByPermissions(permissions: string[]): ModuleNavigation[] {
    return this.getAllNavigation().map(module => ({
      ...module,
      items: this.filterItemsByPermissions(module.items, permissions),
    })).filter(module => module.items.length > 0);
  }

  private filterItemsByPermissions(items: NavigationItem[], permissions: string[]): NavigationItem[] {
    return items.filter(item => {
      // If no permissions required, show item
      if (!item.permissions || item.permissions.length === 0) {
        return true;
      }
      
      // Check if user has any required permission using centralized rules
      const hasPermission = PermissionRules.hasNavigationPermission(permissions, item.permissions);
      
      if (hasPermission && item.children) {
        // Recursively filter children
        item.children = this.filterItemsByPermissions(item.children, permissions);
      }
      
      return hasPermission;
    });
  }
}

export const navigationRegistry = new NavigationRegistry();

// Navigation Provider Context (placeholder for ERP-core integration)
import { createContext, useContext } from 'react';

interface NavigationContextType {
  currentPath: string;
  navigate: (path: string) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  // This will be replaced with ERP-core NavigationProvider when core integration is ready
  // For now, this is a placeholder that works with react-router
  
  const value: NavigationContextType = {
    currentPath: window.location.pathname,
    navigate: (path: string) => {
      window.history.pushState({}, '', path);
    },
    goBack: () => {
      window.history.back();
    },
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

// Exports handled by function declarations above