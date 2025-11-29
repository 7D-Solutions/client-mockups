// Admin module navigation configuration
import { NavigationItem, navigationRegistry } from '../../infrastructure';

export const adminNavigation: NavigationItem[] = [
  {
    path: '/admin',
    label: 'Administration',
    icon: 'fas fa-cogs',
    permissions: ['system.admin.full'],
    children: [
      {
        path: '/admin/dashboard',
        label: 'Dashboard',
        icon: 'fas fa-tachometer-alt',
        permissions: ['system.admin.full']
      },
      {
        path: '/admin/users',
        label: 'User Management',
        icon: 'fas fa-users',
        permissions: ['user.manage.full']
      },
      {
        path: '/admin/roles',
        label: 'Role Management',
        icon: 'fas fa-user-shield',
        permissions: ['user.manage.full']
      },
      {
        path: '/admin/facilities',
        label: 'Facilities',
        icon: 'fas fa-building',
        permissions: ['system.admin.full']
      },
      {
        path: '/admin/buildings',
        label: 'Buildings',
        icon: 'fas fa-city',
        permissions: ['system.admin.full']
      },
      {
        path: '/admin/zones',
        label: 'Zones',
        icon: 'fas fa-map-marked-alt',
        permissions: ['system.admin.full']
      },
      {
        path: '/admin/audit',
        label: 'Audit Logs',
        icon: 'fas fa-history',
        permissions: ['audit.view.access']
      },
      {
        path: '/admin/settings',
        label: 'System Settings',
        icon: 'fas fa-sliders-h',
        permissions: ['system.admin.full']
      }
    ]
  }
];

// Register admin navigation
export const registerAdminNavigation = () => {
  navigationRegistry.register('admin', adminNavigation);
};

// Auto-register on import
registerAdminNavigation();