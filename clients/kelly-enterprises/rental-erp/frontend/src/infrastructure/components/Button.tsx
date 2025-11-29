// Shared Button component for all modules
//
// MANDATORY: Use this component instead of raw <button> elements throughout the application.
// This component provides:
// - Double-click protection (prevents multiple rapid clicks)
// - Consistent styling and variants
// - Loading states and accessibility
//
// For Claude Code: ALWAYS import and use this Button component, never create <button> elements.
import { ReactNode, ButtonHTMLAttributes, useRef, useCallback } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'default' | 'outline' | 'ghost' | 'nav';
  size?: 'compact' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  preventDoubleClick?: boolean; // Optional prop to control double-click protection
  doubleClickDelay?: number; // Customizable delay (default 1000ms)
  active?: boolean; // For navigation tabs and similar toggleable buttons
}

export type ButtonVariant = ButtonProps['variant'];
export type ButtonSize = ButtonProps['size'];

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  preventDoubleClick = true, // Enable by default for all buttons
  doubleClickDelay = 1000, // 1 second default delay
  active = false,
  onClick,
  ...props
}: ButtonProps) => {
  const lastClickTime = useRef<number>(0);

  // Enhanced click handler with double-click protection
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!preventDoubleClick || disabled || loading) {
      // If double-click protection is disabled, or button is already disabled/loading, just call onClick
      onClick?.(event);
      return;
    }

    const now = Date.now();

    // Check if we're within the double-click prevention window
    if (now - lastClickTime.current < doubleClickDelay) {
      // Prevent the click if we're in the cooldown period
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Update the last click time immediately (synchronous)
    lastClickTime.current = now;

    // Call the original onClick handler
    onClick?.(event);
  }, [onClick, preventDoubleClick, disabled, loading, doubleClickDelay]);

  const sizeClass =
    size === 'compact' ? styles.compact :
    size === 'xs' ? styles.extraSmall :
    size === 'sm' ? styles.small :
    size === 'lg' ? styles.large :
    size === 'xl' ? styles.extraLarge :
    styles.medium;
  const variantClass = styles[variant] || styles.primary;
  const activeClass = active ? styles.active : '';
  const classes = `${styles.button} ${variantClass} ${sizeClass} ${activeClass} ${className}`;

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <svg className={styles.spinner} fill="none" viewBox="0 0 24 24">
          <circle className={styles.spinnerCircle} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className={styles.spinnerPath} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        icon && <span className={styles.iconWrapper}>{icon}</span>
      )}
      {children && <span className={styles.text}>{children}</span>}
    </button>
  );
};