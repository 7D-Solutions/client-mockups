import { ReactNode } from 'react';
import { Icon } from './Icon';

interface SectionHeaderProps {
  children: ReactNode;
  size?: 'sm' | 'base' | 'lg';
  marginBottom?: string;
  icon?: string;
}

export function SectionHeader({ 
  children, 
  size = 'base',
  marginBottom = 'var(--space-2)',
  icon
}: SectionHeaderProps) {
  const fontSize = size === 'sm' 
    ? 'var(--font-size-lg)' 
    : size === 'lg' 
    ? 'var(--font-size-2xl)' 
    : 'var(--font-size-xl)';

  return (
    <h3 style={{ 
      fontSize,
      marginBottom,
      fontWeight: 'var(--font-weight-semibold)',
      color: 'var(--color-text-primary)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }}>
      {icon && <Icon name={icon} />}
      {children}
    </h3>
  );
}