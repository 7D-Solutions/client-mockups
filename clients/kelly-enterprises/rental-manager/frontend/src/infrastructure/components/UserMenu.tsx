import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { eventBus, EVENTS } from '../events';
import { Icon } from './Icon';
import styles from './UserMenu.module.css';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMenuClick = (action: string) => {
    setIsOpen(false);

    switch (action) {
      case 'profile':
        navigate('/user/profile');
        break;
      case 'settings':
        navigate('/user/settings');
        break;
      case 'change-password':
        eventBus.emit(EVENTS.SHOW_PASSWORD_MODAL);
        break;
    }
  };

  if (!user) return null;

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        className={styles.userMenuButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Icon name="user" className={styles.userIcon} />
        <span className={styles.userName}>{user.name}</span>
        <span className={styles.chevronIcon}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <div className={styles.dropdownUserName}>{user.name}</div>
            <div className={styles.dropdownUserRole}>{user.role || 'User'}</div>
          </div>

          <div className={styles.dropdownDivider} />

          <button
            className={styles.dropdownItem}
            onClick={() => handleMenuClick('profile')}
          >
            <Icon name="user" className={styles.dropdownIcon} />
            My Profile
          </button>

          <button
            className={styles.dropdownItem}
            onClick={() => handleMenuClick('settings')}
          >
            <Icon name="cog" className={styles.dropdownIcon} />
            Settings
          </button>

          <button
            className={styles.dropdownItem}
            onClick={() => handleMenuClick('change-password')}
          >
            <Icon name="key" className={styles.dropdownIcon} />
            Change Password
          </button>
        </div>
      )}
    </div>
  );
}
