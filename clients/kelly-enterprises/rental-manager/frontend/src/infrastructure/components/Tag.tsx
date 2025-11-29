import React, { ReactNode } from 'react';
import styles from './Tag.module.css';

interface TagProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary' | 'secondary';
  children: ReactNode;
  className?: string;
}

export const Tag = React.memo(function Tag({
  size = 'md',
  variant = 'default',
  children,
  className = ''
}: TagProps) {
  const sizeClass = styles[`tag${size.toUpperCase()}`];
  const variantClass = styles[`tag${variant.charAt(0).toUpperCase() + variant.slice(1)}`];
  
  return (
    <span className={`${styles.tag} ${sizeClass} ${variantClass} ${className}`}>
      {children}
    </span>
  );
});