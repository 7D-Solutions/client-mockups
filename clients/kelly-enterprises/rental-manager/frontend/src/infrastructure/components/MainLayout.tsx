// MainLayout component - Central layout with navigation for all modules
import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useSharedActions, useNavigationActions } from '../store';
import { useEventBus, EVENTS } from '../events';
import { LoginScreen } from './LoginScreen';
import { ModalManager } from './ModalManager';
import { ChangePasswordModal } from './ChangePasswordModal';
import { Icon } from './Icon';
import { Button } from './Button';
import { UserMenu } from './UserMenu';
import { FontAwesomeCheck } from './FontAwesomeCheck';
import { Sidebar } from './Sidebar';
import { apiClient } from '../api/client';
import { logger } from '../utils/logger';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const location = useLocation();
  const { user, logout } = useAuth();
  const { addNotification } = useSharedActions();
  const { setCurrentPage } = useNavigationActions();

  // Check if user must change password on first login
  useEffect(() => {
    if (user?.mustChangePassword) {
      setShowChangePasswordModal(true);
    }
  }, [user]);

  // Listen for module events to show notifications
  useEventBus(EVENTS.GAUGE_UPDATED, (data) => {
    addNotification({
      type: 'success',
      title: 'Gauge Updated',
      message: `Gauge ${data.gaugeId} has been updated`
    });
  });

  // Permission change notification is handled by moduleSync.ts
  // to avoid duplicate notifications

  // Get page title based on current path
  const getPageTitle = () => {
    const path = location.pathname;

    if (path === '/gauges/my-gauges' || path.includes('/my-gauges')) {
      return 'My Gauges';
    } else if (path.startsWith('/admin/users')) {
      return 'User Management';
    } else if (path.startsWith('/admin/roles')) {
      return 'Role Management';
    } else if (path.startsWith('/admin/settings')) {
      return 'System Settings';
    } else if (path.startsWith('/admin/audit')) {
      return 'Audit Logs';
    } else if (path.startsWith('/admin/gauges')) {
      return 'Gauge Management';
    } else if (path.startsWith('/admin/gauge-types')) {
      return 'Gauge Types';
    } else if (path.startsWith('/admin')) {
      return 'Admin';
    } else if (path.startsWith('/inventory/locations') && path.split('/').length > 3) {
      return 'Location Details';
    } else if (path.startsWith('/inventory/movements')) {
      return 'Movement History';
    } else if (path.startsWith('/inventory')) {
      return 'Inventory';
    } else if (path === '/' || path.startsWith('/gauges')) {
      return 'Gauge Management';
    }
    return 'Fire-Proof ERP';
  };

  // Update navigation currentPage based on current path
  useEffect(() => {
    const path = location.pathname;

    // Map routes to navigation page IDs
    if (path.startsWith('/admin')) {
      setCurrentPage('admin');
    } else if (path.startsWith('/inventory')) {
      setCurrentPage('inventory');
    } else if (path === '/' || path.startsWith('/gauges')) {
      setCurrentPage('gauge-management');
    }
  }, [location.pathname, setCurrentPage]);

  // Show login screen if user is not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className={styles.app}>
      {/* Left Sidebar Navigation */}
      <Sidebar />

      {/* Content wrapper */}
      <div className={styles.container}>
        {/* Simple Header Bar */}
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
          <div className={styles.headerRight}>
            <UserMenu />
            <Button
              size="sm"
              variant="danger"
              className={styles.logoutBtn}
              onClick={logout}
              icon={<Icon name="sign-out-alt" />}
            >
              Logout
            </Button>
          </div>
        </header>

        {/* Main Content Container */}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>

      {/* Change Password Modal (for first-time login) */}
      {user?.mustChangePassword && (
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => {
            // Don't allow closing if password change is required
            if (!user?.mustChangePassword) {
              setShowChangePasswordModal(false);
            }
          }}
          onSuccess={async () => {
            // Refresh user data to get updated mustChangePassword flag
            try {
              const response = await apiClient.get('/auth/me');
              const userData = response.user || response.data || response;
              if (userData && !userData.mustChangePassword) {
                setShowChangePasswordModal(false);
                addNotification({
                  type: 'success',
                  title: 'Welcome!',
                  message: 'You can now access the system'
                });
              }
            } catch (error) {
              logger.error('Failed to refresh user data', error);
            }
          }}
          requireCurrent={true}
        />
      )}

      {/* Global Modal Manager */}
      <ModalManager />

      {/* Font Awesome Check */}
      <FontAwesomeCheck />
    </div>
  );
}