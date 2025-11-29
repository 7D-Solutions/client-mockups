import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, Card, CardHeader, CardTitle, CardContent } from '../../../infrastructure/components';

interface PageCategory {
  title: string;
  icon: string;
  pages: PageInfo[];
}

interface PageInfo {
  path: string;
  title: string;
  description: string;
  icon?: string;
}

const siteStructure: PageCategory[] = [
  {
    title: 'Gauge Management',
    icon: 'wrench',
    pages: [
      { path: '/gauges/', title: 'All Gauges', description: 'View and manage all gauges in the system', icon: 'home' },
      { path: '/gauges/my-gauges', title: 'My Gauges', description: 'View gauges assigned to you', icon: 'user' },
      { path: '/gauges/calibration-management', title: 'Calibration Management', description: 'Manage gauge calibration schedules and history', icon: 'calendar-alt' },
      { path: '/gauges/returned-customer-gauges', title: 'Returned Customer Gauges', description: 'Process gauges returned from customers', icon: 'user-times' },
      { path: '/gauges/spare-inventory', title: 'Spare Inventory', description: 'Manage spare gauge inventory and pairing', icon: 'boxes' },
      { path: '/gauges/qc', title: 'QC Page', description: 'Quality control and approval workflow', icon: 'check-circle' },
      { path: '/gauges/create', title: 'Create Gauge', description: 'Add a new gauge to the system', icon: 'plus' },
    ]
  },
  {
    title: 'Inventory',
    icon: 'inbox',
    pages: [
      { path: '/inventory', title: 'Inventory Dashboard', description: 'Overview of inventory metrics and statistics', icon: 'home' },
      { path: '/inventory/locations', title: 'Storage Locations', description: 'Manage storage locations and zones', icon: 'map-marker-alt' },
      { path: '/inventory/organization', title: 'Organization Management', description: 'Manage facilities, buildings, and organizational structure', icon: 'sitemap' },
      { path: '/inventory/movements', title: 'Movement History', description: 'View inventory movement and transfer history', icon: 'exchange-alt' },
    ]
  },
  {
    title: 'Administration',
    icon: 'users-cog',
    pages: [
      { path: '/admin', title: 'Admin Dashboard', description: 'Administrative overview and quick actions', icon: 'home' },
      { path: '/admin/users', title: 'User Management', description: 'Manage user accounts and access', icon: 'users' },
      { path: '/admin/roles', title: 'Role Management', description: 'Configure roles and permissions', icon: 'shield-alt' },
      { path: '/admin/settings', title: 'System Settings', description: 'Configure system-wide settings and maintenance tools', icon: 'cog' },
      { path: '/admin/audit', title: 'Audit Logs', description: 'View system audit trail and activity logs', icon: 'clipboard-list' },
      { path: '/admin/gauges', title: 'Gauge Management (Admin)', description: 'Administrative gauge type and configuration management', icon: 'wrench' },
      { path: '/admin/facilities', title: 'Facility Management', description: 'Manage facilities and locations', icon: 'building' },
      { path: '/admin/buildings', title: 'Building Management', description: 'Manage buildings within facilities', icon: 'city' },
      { path: '/admin/zones', title: 'Zone Management', description: 'Manage storage zones within buildings', icon: 'th' },
      { path: '/admin/site-index', title: 'Site Index', description: 'Complete listing of all available pages', icon: 'sitemap' },
    ]
  },
  {
    title: 'User',
    icon: 'user',
    pages: [
      { path: '/user/profile', title: 'User Profile', description: 'View and edit your profile information', icon: 'id-card' },
      { path: '/user/settings', title: 'User Settings', description: 'Manage your personal settings and preferences', icon: 'sliders-h' },
    ]
  },
  {
    title: 'Development & Testing',
    icon: 'flask',
    pages: [
      { path: '/test/buttons', title: 'Button Test', description: 'Test and preview button components', icon: 'mouse-pointer' },
      { path: '/test/css', title: 'CSS Test', description: 'Test CSS variables and styling system', icon: 'palette' },
      { path: '/test/error-boundary', title: 'Error Boundary Test', description: 'Test error handling and boundaries', icon: 'exclamation-triangle' },
      { path: '/test/icons', title: 'Icon Test', description: 'Browse and test available icons', icon: 'icons' },
      { path: '/test/showcase', title: 'Component Showcase', description: 'Preview all UI components', icon: 'th-large' },
    ]
  }
];

export const SiteIndex: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            size="sm"
            style={{ padding: 'var(--space-2)' }}
          >
            <Icon name="arrow-left" />
          </Button>
          <h1 style={{ margin: 0, fontSize: 'var(--font-size-2xl)', fontWeight: '700', color: 'white' }}>
            Site Index
          </h1>
        </div>
        <p style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          Complete directory of all pages and features available in the Fire-Proof ERP system
        </p>
      </div>

      {/* Category Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {siteStructure.map((category) => (
          <Card key={category.title}>
            <CardHeader>
              <CardTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Icon name={category.icon as any} />
                  <span>{category.title}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 'var(--space-4)'
              }}>
                {category.pages.map((page) => (
                  <div
                    key={page.path}
                    onClick={() => navigate(page.path)}
                    style={{
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.backgroundColor = 'var(--color-gray-50)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.backgroundColor = 'var(--color-background)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                      {page.icon && (
                        <div style={{
                          flexShrink: 0,
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-primary-light)',
                          color: 'var(--color-primary)'
                        }}>
                          <Icon name={page.icon as any} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          margin: '0 0 var(--space-1) 0',
                          fontSize: 'var(--font-size-md)',
                          fontWeight: '600',
                          color: 'var(--color-text-primary)'
                        }}>
                          {page.title}
                        </h3>
                        <p style={{
                          margin: '0 0 var(--space-2) 0',
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                          lineHeight: '1.5'
                        }}>
                          {page.description}
                        </p>
                        <code style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-tertiary)',
                          backgroundColor: 'var(--color-gray-100)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontFamily: 'monospace'
                        }}>
                          {page.path}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Note */}
      <div style={{
        marginTop: 'var(--space-6)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-info-light)',
        border: '1px solid var(--color-info)',
        display: 'flex',
        gap: 'var(--space-3)',
        alignItems: 'flex-start'
      }}>
        <Icon name="info-circle" style={{ color: 'var(--color-info)', marginTop: '2px' }} />
        <div>
          <p style={{ margin: '0 0 var(--space-1) 0', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Navigation Tip
          </p>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Click on any page card to navigate directly to that page. You can also use the sidebar navigation for quick access to frequently used pages.
          </p>
        </div>
      </div>
    </div>
  );
};
