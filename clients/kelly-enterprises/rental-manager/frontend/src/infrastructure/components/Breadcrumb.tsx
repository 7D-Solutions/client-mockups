// Breadcrumb navigation component for hierarchical navigation
import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import styles from './Breadcrumb.module.css';

export interface BreadcrumbItem {
  label: string;
  to?: string; // Optional - if not provided, item is rendered as plain text (current page)
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className={`${styles.breadcrumb} ${className || ''}`} aria-label="Breadcrumb">
      <ol className={styles.breadcrumbList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className={styles.breadcrumbItem}>
              {!isLast && item.to ? (
                <>
                  <Link to={item.to} className={styles.breadcrumbLink}>
                    {item.label}
                  </Link>
                  <Icon name="chevron-right" className={styles.separator} />
                </>
              ) : (
                <span className={styles.breadcrumbCurrent} aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
