import { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Alert.module.css';

interface AlertProps {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  icon?: boolean;
  className?: string;
}

const ICON_MAP = {
  info: 'info-circle',
  success: 'check-circle', 
  warning: 'exclamation-triangle',
  danger: 'exclamation-triangle'
};

export function Alert({ 
  children, 
  variant = 'info', 
  title,
  icon = true,
  className = ''
}: AlertProps) {
  const iconName = ICON_MAP[variant];
  
  return (
    <div className={`${styles.alert} ${styles[variant]} ${className}`}>
      {title && (
        <div className={styles.alertHeader}>
          {icon && <Icon name={iconName} />}
          <span className={styles.alertTitle}>{title}</span>
        </div>
      )}
      <div className={styles.alertContent}>
        {!title && icon && <Icon name={iconName} />}
        <span>{children}</span>
      </div>
    </div>
  );
}