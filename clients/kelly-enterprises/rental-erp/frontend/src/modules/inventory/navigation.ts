// Inventory module navigation configuration
import { NavigationItem, navigationRegistry } from '../../infrastructure';

export const inventoryNavigation: NavigationItem[] = [
  {
    path: '/inventory',
    label: 'Inventory',
    icon: 'fas fa-warehouse',
    permissions: ['inventory.view.access'],
    children: [
      {
        path: '/inventory',
        label: 'Dashboard',
        icon: 'fas fa-chart-line',
        permissions: ['inventory.view.access']
      },
      {
        path: '/inventory/movements',
        label: 'Movement History',
        icon: 'fas fa-history',
        permissions: ['inventory.view.access']
      }
    ]
  }
];

// Register inventory navigation
export const registerInventoryNavigation = () => {
  navigationRegistry.register('inventory', inventoryNavigation);
};

// Auto-register on import
registerInventoryNavigation();
