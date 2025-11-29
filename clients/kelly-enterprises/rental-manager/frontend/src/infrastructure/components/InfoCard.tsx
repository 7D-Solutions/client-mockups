import { ReactNode } from 'react';

interface InfoCardProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'warning';
  padding?: string;
  marginBottom?: string;
}

export function InfoCard({ 
  children, 
  variant = 'secondary',
  padding = 'var(--space-2)',
  marginBottom = 'var(--space-2)'
}: InfoCardProps) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return 'var(--color-bg-primary)';
      case 'warning':
        return '#fff3cd'; // Solid yellow background
      case 'secondary':
      default:
        return 'var(--color-bg-secondary)';
    }
  };

  return (
    <div style={{
      backgroundColor: getBackgroundColor(),
      borderRadius: 'var(--radius-md)',
      padding,
      marginBottom
    }}>
      {children}
    </div>
  );
}