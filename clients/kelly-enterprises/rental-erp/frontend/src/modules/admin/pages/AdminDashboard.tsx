import React from 'react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const adminCards = [
    {
      id: 'user-management',
      icon: '👥',
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions. Add new users, deactivate accounts, and control access levels.',
      actions: [
        { label: 'View Users', path: '/admin/users' },
        { label: 'Add User', path: '/admin/users?action=create' },
        { label: 'Roles', path: '/admin/roles' }
      ]
    },
    {
      id: 'gauge-types',
      icon: '🔧',
      title: 'Gauge Types & Categories',
      description: 'Configure gauge types, categories, and specifications. Define calibration intervals and requirements.',
      actions: [
        { label: 'Manage Types', path: '/admin/gauge-types' },
        { label: 'Add Type', path: '/admin/gauge-types' }
      ]
    },
    {
      id: 'locations',
      icon: '📍',
      title: 'Locations & Storage',
      description: 'Manage storage locations, facilities, buildings, and zones. Organize gauge storage and tracking.',
      actions: [
        { label: 'Storage Locations', path: '/inventory/locations' },
        { label: 'Facilities', path: '/admin/facilities' },
        { label: 'Buildings', path: '/admin/buildings' },
        { label: 'Zones', path: '/admin/zones' }
      ]
    },
    {
      id: 'calibration-settings',
      icon: '📅',
      title: 'Calibration Settings',
      description: 'Configure calibration schedules, intervals, and requirements. Manage calibration vendors and certificates.',
      actions: [
        { label: 'Settings', path: '/admin/settings' },
        { label: 'Vendors', path: '/admin/settings' }
      ]
    },
    {
      id: 'reports',
      icon: '📊',
      title: 'Reports & Analytics',
      description: 'Generate system reports, usage analytics, and compliance documentation. Export data and audit logs.',
      actions: [
        { label: 'View Reports', path: '/admin/audit' },
        { label: 'Generate', path: '/admin/audit' }
      ]
    },
    {
      id: 'system-settings',
      icon: '⚙️',
      title: 'System Settings',
      description: 'Configure system-wide settings, notifications, email templates, and integration options.',
      actions: [
        { label: 'General', path: '/admin/settings' },
        { label: 'Notifications', path: '/admin/settings' }
      ]
    }
  ];

  return (
    <div style={{
      padding: 'var(--space-8)',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 'var(--space-5)'
      }}>
        {adminCards.map((card) => (
          <div
            key={card.id}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: 'var(--space-6)',
              transition: 'box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              fontSize: '32px',
              marginBottom: 'var(--space-3)'
            }}>
              {card.icon}
            </div>

            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-2)'
            }}>
              {card.title}
            </div>

            <div style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-4)',
              lineHeight: '1.5'
            }}>
              {card.description}
            </div>

            <div style={{
              display: 'flex',
              gap: 'var(--space-2)',
              flexWrap: 'wrap'
            }}>
              {card.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(action.path);
                  }}
                  style={{
                    padding: 'var(--space-1) var(--space-3)',
                    background: 'var(--color-surface-secondary)',
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-primary-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-surface-secondary)';
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
