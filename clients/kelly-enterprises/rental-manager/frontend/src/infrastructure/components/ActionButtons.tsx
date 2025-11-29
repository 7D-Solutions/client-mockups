// ActionButtons - Inline action buttons for tables matching mockup design
import { ReactNode, ButtonHTMLAttributes, useRef, useCallback } from 'react';
import styles from './ActionButtons.module.css';

type ActionButtonVariant = 'checkout' | 'checkin' | 'transfer' | 'view';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ActionButtonVariant;
  icon?: string;
  children: ReactNode;
  preventDoubleClick?: boolean;
  doubleClickDelay?: number;
}

export const ActionButton = ({
  variant,
  icon,
  children,
  disabled,
  className = '',
  preventDoubleClick = true,
  doubleClickDelay = 1000,
  onClick,
  ...props
}: ActionButtonProps) => {
  const lastClickTime = useRef<number>(0);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!preventDoubleClick || disabled) {
      onClick?.(event);
      return;
    }

    const now = Date.now();
    if (now - lastClickTime.current < doubleClickDelay) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    lastClickTime.current = now;
    onClick?.(event);
  }, [onClick, preventDoubleClick, disabled, doubleClickDelay]);

  const variantClass = styles[variant] || styles.view;

  return (
    <button
      className={`${styles.actionBtn} ${variantClass} ${className}`}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      {icon && <span className={styles.btnIcon}>{icon}</span>}
      {children}
    </button>
  );
};

// Wrapper for inline action buttons
interface InlineActionsProps {
  children: ReactNode;
  className?: string;
}

export const InlineActions = ({ children, className = '' }: InlineActionsProps) => {
  return (
    <div className={`${styles.inlineActions} ${className}`} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
};

// Convenience components for common table actions
// Note: Using "TableAction" prefix to avoid conflicts with SemanticButtons
export const TableCheckoutButton = ({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) => (
  <ActionButton variant="checkout" icon="↑" onClick={onClick} disabled={disabled}>
    Checkout
  </ActionButton>
);

export const TableCheckinButton = ({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) => (
  <ActionButton variant="checkin" icon="✓" onClick={onClick} disabled={disabled}>
    Checkin
  </ActionButton>
);

export const TableTransferButton = ({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) => (
  <ActionButton variant="transfer" icon="↗" onClick={onClick} disabled={disabled}>
    Transfer
  </ActionButton>
);

export const TableViewButton = ({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) => (
  <ActionButton variant="view" onClick={onClick} disabled={disabled}>
    View
  </ActionButton>
);
