import React from 'react';
import styles from './Icon.module.css';

export type IconName =
  // Actions
  | 'check'
  | 'times'
  | 'x'
  | 'save'
  | 'edit'
  | 'exchange-alt'
  | 'sign-in-alt'
  | 'sign-out-alt'
  | 'arrow-left'
  | 'arrow-right'
  | 'download'
  | 'upload'
  | 'ban'
  | 'unlock-alt'
  // Status
  | 'spinner'
  | 'info-circle'
  | 'alert-circle'
  | 'exclamation-triangle'
  | 'check-circle'
  | 'lock'
  | 'lock-open'
  | 'unlock'
  | 'user-clock'
  | 'wrench'
  | 'clock'
  // Navigation
  | 'inbox'
  | 'history'
  | 'certificate'
  | 'map-marker-alt'
  | 'map-marker'
  | 'clipboard-check'
  | 'list'
  | 'cogs'
  // UI
  | 'tools'
  | 'tachometer-alt'
  | 'chart-line'
  | 'users-cog'
  | 'users'
  | 'user'
  | 'percentage'
  | 'gear'
  // Additional icons for legacy compatibility
  | 'plus'
  | 'user-plus'
  | 'key'
  | 'trash'
  | 'database'
  | 'broom'
  | 'cog'
  | 'chart-bar'
  | 'file-download'
  | 'file-pdf'
  | 'eye'
  | 'check-double'
  | 'times-circle'
  // Extended icon set
  | 'search'
  | 'search-plus'
  | 'filter'
  | 'eye-slash'
  | 'sync'
  | 'calendar-alt'
  | 'print'
  | 'file-alt'
  | 'pencil-alt'
  | 'trash-alt'
  | 'minus'
  | 'refresh'
  | 'undo'
  | 'redo'
  | 'copy'
  | 'paste'
  | 'cut'
  | 'home'
  | 'building'
  | 'phone'
  | 'envelope'
  | 'globe'
  | 'briefcase'
  | 'graduation-cap'
  | 'book'
  | 'delete'
  | 'link'
  | 'unlink'
  | 'chevron-right'
  | 'arrow-circle-right'
  // Inventory icons
  | 'warehouse'
  | 'box'
  | 'tool'
  // Gauge types
  | 'ruler'
  | 'ruler-combined'
  | 'hammer'
  | 'sitemap';

interface IconProps {
  name: IconName;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  spin?: boolean;
  className?: string;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
}

// Map icon names to Font Awesome class names
const iconClassMap: Record<IconName, string> = {
  // Actions
  'check': 'fa-check',
  'times': 'fa-times',
  'x': 'fa-times',
  'save': 'fa-save',
  'edit': 'fa-edit',
  'exchange-alt': 'fa-exchange-alt',
  'sign-in-alt': 'fa-sign-in-alt',
  'sign-out-alt': 'fa-sign-out-alt',
  'arrow-left': 'fa-arrow-left',
  'arrow-right': 'fa-arrow-right',
  'download': 'fa-download',
  'upload': 'fa-upload',
  'ban': 'fa-ban',
  'unlock-alt': 'fa-unlock-alt',
  // Status
  'spinner': 'fa-spinner',
  'info-circle': 'fa-info-circle',
  'alert-circle': 'fa-exclamation-circle',
  'exclamation-triangle': 'fa-exclamation-triangle',
  'check-circle': 'fa-check-circle',
  'lock': 'fa-lock',
  'lock-open': 'fa-lock-open',
  'unlock': 'fa-unlock',
  'user-clock': 'fa-user-clock',
  'wrench': 'fa-wrench',
  'clock': 'fa-clock',
  // Navigation
  'inbox': 'fa-inbox',
  'history': 'fa-history',
  'certificate': 'fa-certificate',
  'map-marker-alt': 'fa-map-marker-alt',
  'map-marker': 'fa-map-marker',
  'clipboard-check': 'fa-clipboard-check',
  'list': 'fa-list',
  'cogs': 'fa-cogs',
  // UI
  'tools': 'fa-tools',
  'tachometer-alt': 'fa-tachometer-alt',
  'chart-line': 'fa-chart-line',
  'users-cog': 'fa-users-cog',
  'users': 'fa-users',
  'user': 'fa-user',
  'percentage': 'fa-percentage',
  'gear': 'fa-gear',
  'search': 'fa-search',
  'search-plus': 'fa-search-plus',
  'filter': 'fa-filter',
  'eye-slash': 'fa-eye-slash',
  'sync': 'fa-sync',
  'calendar-alt': 'fa-calendar-alt',
  'print': 'fa-print',
  'file-alt': 'fa-file-alt',
  'pencil-alt': 'fa-pencil-alt',
  'trash-alt': 'fa-trash-alt',
  'minus': 'fa-minus',
  'refresh': 'fa-refresh',
  'undo': 'fa-undo',
  'redo': 'fa-redo',
  'copy': 'fa-copy',
  'paste': 'fa-paste',
  'cut': 'fa-cut',
  'home': 'fa-home',
  'building': 'fa-building',
  'phone': 'fa-phone',
  'envelope': 'fa-envelope',
  'globe': 'fa-globe',
  'briefcase': 'fa-briefcase',
  'graduation-cap': 'fa-graduation-cap',
  'book': 'fa-book',
  'delete': 'fa-trash',
  // Additional
  'plus': 'fa-plus',
  'user-plus': 'fa-user-plus',
  'key': 'fa-key',
  'trash': 'fa-trash',
  'database': 'fa-database',
  'broom': 'fa-broom',
  'cog': 'fa-cog',
  'chart-bar': 'fa-chart-bar',
  'file-download': 'fa-file-download',
  'file-pdf': 'fa-file-pdf',
  'eye': 'fa-eye',
  'check-double': 'fa-check-double',
  'times-circle': 'fa-times-circle',
  'link': 'fa-link',
  'unlink': 'fa-unlink',
  'chevron-right': 'fa-chevron-right',
  'arrow-circle-right': 'fa-arrow-circle-right',
  // Inventory
  'warehouse': 'fa-warehouse',
  'box': 'fa-box',
  'tool': 'fa-wrench',
  // Gauge types
  'ruler': 'fa-ruler',
  'ruler-combined': 'fa-ruler-combined',
  'hammer': 'fa-hammer',
  'sitemap': 'fa-sitemap'
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  spin = false,
  className = '',
  'aria-hidden': ariaHidden = true,
  'aria-label': ariaLabel
}) => {
  const faClass = iconClassMap[name];
  if (!faClass) {
    // Icon not found - silently return placeholder
    return <span>?</span>;
  }
  
  const classes = [
    'fas',
    faClass,
    styles.icon,
    styles[size],
    spin && styles.spin,
    spin && 'fa-spin',
    className
  ].filter(Boolean).join(' ');

  return (
    <i 
      className={classes}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    />
  );
};

// Convenience components for common patterns
export const SpinnerIcon: React.FC<{ size?: IconProps['size']; className?: string }> = (props) => (
  <Icon name="spinner" spin {...props} />
);

export const SaveIcon: React.FC<{ size?: IconProps['size']; className?: string }> = (props) => (
  <Icon name="save" {...props} />
);

export const CheckIcon: React.FC<{ size?: IconProps['size']; className?: string }> = (props) => (
  <Icon name="check" {...props} />
);

export const CancelIcon: React.FC<{ size?: IconProps['size']; className?: string }> = (props) => (
  <Icon name="times" {...props} />
);