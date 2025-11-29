// Gauge module navigation configuration
import { NavigationItem, navigationRegistry } from '../../infrastructure';

export const gaugeNavigation: NavigationItem[] = [
  {
    path: '/gauges',
    label: 'Gauge Management',
    icon: 'fas fa-tools',
    permissions: ['gauge.view.access'],
    children: [
      {
        path: '/gauges/list',
        label: 'Gauge List',
        icon: 'fas fa-list',
        permissions: ['gauge.view.access']
      },
      {
        path: '/gauges/qc',
        label: 'Pending QC',
        icon: 'fas fa-clipboard-check',
        permissions: ['calibration.manage.full']
      }
    ]
  }
];

// Register gauge navigation
export const registerGaugeNavigation = () => {
  navigationRegistry.register('gauge', gaugeNavigation);
};

// Auto-register on import
registerGaugeNavigation();