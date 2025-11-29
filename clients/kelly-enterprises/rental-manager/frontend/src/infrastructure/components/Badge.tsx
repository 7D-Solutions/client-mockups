import { ReactNode } from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  size?: 'compact' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary' | 'secondary' | 'alert';
  children: ReactNode;
  className?: string;
  count?: boolean; // For numeric badges
}

export const Badge = ({
  size = 'md',
  variant = 'default',
  children,
  className = '',
  count = false
}: BadgeProps) => {
  const sizeClass = size === 'compact' ? styles.badgeCompact : styles[`badge${size.toUpperCase()}`];
  const variantClass = styles[`badge${variant.charAt(0).toUpperCase() + variant.slice(1)}`];
  const countClass = count ? styles.badgeCount : '';
  
  return (
    <span className={`${styles.badge} ${sizeClass} ${variantClass} ${countClass} ${className}`}>
      {children}
    </span>
  );
};