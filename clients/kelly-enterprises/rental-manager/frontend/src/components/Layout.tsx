import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../infrastructure/components/Icon';
import { Button } from '../infrastructure/components/Button';
import styles from './Layout.module.css';

const Layout = () => {
  const { logout, user } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: 'tachometer-alt' },
    { to: '/properties', label: 'Properties', icon: 'home' },
    { to: '/tenants', label: 'Tenants', icon: 'users' },
    { to: '/payments', label: 'Payments', icon: 'dollar-sign' },
    { to: '/expenses', label: 'Expenses', icon: 'receipt' },
    { to: '/transactions', label: 'Transactions', icon: 'exchange-alt' },
    { to: '/messages', label: 'Messages', icon: 'envelope' },
    { to: '/applications', label: 'Applications', icon: 'file-alt' },
  ];

  // Get page title based on current path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/properties') return 'Properties';
    if (path === '/tenants') return 'Tenants';
    if (path === '/payments') return 'Payments';
    if (path === '/expenses') return 'Expenses';
    if (path === '/transactions') return 'Bank Transactions';
    if (path === '/messages') return 'Tenant Messages';
    if (path === '/applications') return 'Applications';
    return 'Kelly Rental Manager';
  };

  return (
    <div className={styles.app}>
      {/* Left Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <Icon name="home" />
          Kelly Rental
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userName}>{user?.name || user?.email}</div>
          <Button
            size="sm"
            variant="secondary"
            className={styles.logoutBtn}
            onClick={logout}
            icon={<Icon name="sign-out-alt" />}
          >
            Logout
          </Button>
        </div>
      </aside>

      {/* Content wrapper */}
      <div className={styles.container}>
        {/* Header Bar */}
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
        </header>

        {/* Main Content Container */}
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
