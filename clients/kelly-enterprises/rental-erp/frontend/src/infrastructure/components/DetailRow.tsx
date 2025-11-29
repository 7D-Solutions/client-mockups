import { ReactNode } from 'react';

interface DetailRowProps {
  label: string;
  value: ReactNode;
  suffix?: boolean;
}

export function DetailRow({ label, value, suffix = false }: DetailRowProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: suffix ? '0.25rem' : '0.25rem'
    }}>
      <span style={{
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)'
      }}>
        {label}:
      </span>
      <span style={{ 
        color: 'var(--color-text-primary)', 
        fontSize: 'var(--font-size-sm)' 
      }}>
        {value}
      </span>
    </div>
  );
}