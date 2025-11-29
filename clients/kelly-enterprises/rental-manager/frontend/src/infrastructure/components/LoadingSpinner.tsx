// Shared Loading Spinner component
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary',
  className = '' 
}: LoadingSpinnerProps) => {
  const sizeClass = size === 'sm' ? styles.spinnerSmall : size === 'lg' || size === 'xl' ? styles.spinnerLarge : '';
  const colorClass = color === 'white' ? styles.spinnerWhite : color === 'gray' ? styles.spinnerGray : styles.spinnerPrimary;

  return (
    <div className={`${styles.spinner} ${sizeClass} ${colorClass} ${className}`}>
    </div>
  );
};

// Full page loading overlay
export const LoadingOverlay = ({ message = 'Loading...' }: { message?: string }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <LoadingSpinner size="xl" />
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
};