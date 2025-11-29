// Shared Modal component for all modules
//
// MANDATORY: Use this Modal component instead of window.confirm() or window.alert().
// This provides:
// - Consistent styling and accessibility
// - Proper modal stacking and focus management
// - Keyboard navigation support
//
// For Claude Code: Use this Modal component for all confirmations and dialogs.
import { ReactNode, useEffect, KeyboardEvent, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import styles from './Modal.module.css';

// Track modal z-index to ensure proper stacking
let modalCount = 0;
const getNextZIndex = () => {
  modalCount++;
  return 1050 + modalCount * 10;
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFullClose?: () => void; // For 'X' button - navigate back to main page
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  className?: string;
  preventClosing?: boolean;
  noScroll?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  onFullClose,
  title,
  size = 'md',
  children,
  className = '',
  preventClosing = false,
  noScroll = false,
}: ModalProps) => {
  const [zIndex, setZIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Get z-index when modal opens
      const newZIndex = getNextZIndex();
      setZIndex(newZIndex);
      return () => {
        document.body.style.overflow = 'unset';
        // Decrement modal count when closing
        modalCount = Math.max(0, modalCount - 1);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventClosing) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape as EventListener);
      return () => {
        document.removeEventListener('keydown', handleEscape as EventListener);
      };
    }
  }, [isOpen, onClose, preventClosing]);

  if (!isOpen) return null;

  // Size classes are now handled in CSS modules

  const handleBackdropClick = (_e: React.MouseEvent) => {
    // Prevent closing on backdrop click - modals should stay open
    // Users can still close using the X button or Cancel/Close buttons
    return;
  };

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgb(59, 130, 246)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: zIndex,
        padding: 'var(--space-4)'
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'transparent'
        }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        style={{
          position: 'relative',
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth: size === 'sm' ? 'var(--modal-width-sm)' : size === 'md' ? 'var(--modal-width-md)' : size === 'lg' ? 'var(--modal-width-lg)' : 'var(--modal-width-xl)',
          maxHeight: noScroll ? (size === 'sm' ? 'var(--modal-height-sm)' : size === 'md' ? 'var(--modal-height-md)' : size === 'lg' ? 'var(--modal-height-lg)' : 'var(--modal-height-xl)') : 'var(--modal-max-height)',
          height: noScroll ? (size === 'sm' ? 'var(--modal-height-sm)' : size === 'md' ? 'var(--modal-height-md)' : size === 'lg' ? 'var(--modal-height-lg)' : 'var(--modal-height-xl)') : 'auto',
          overflowY: noScroll ? 'hidden' : 'auto',
          zIndex: 1050
        }}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {title && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-4) var(--space-6) var(--space-4) var(--space-6)',
            borderBottom: '1px solid var(--color-gray-200)'
          }}>
            <h2 id="modal-title" style={{
              margin: 0,
              color: 'var(--color-primary)',
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-semibold)'
            }}>
              {title}
            </h2>
            {!preventClosing && (
              <Button
                onClick={onFullClose || onClose}
                variant="ghost"
                size="sm"
                style={{
                  padding: 'var(--space-1)',
                  color: 'var(--color-text-muted)'
                }}
                aria-label="Close modal"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div style={{
          padding: title ? '0' : 'var(--space-6) 0 0',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Modal composition components
interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onClose?: () => void;
  className?: string;
}

const ModalHeader = ({ title, subtitle, actions, onClose, className = '' }: ModalHeaderProps) => (
  <div className={className} style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-4) var(--space-6) var(--space-4) var(--space-6)',
    borderBottom: '1px solid var(--color-gray-200)'
  }}>
    <div style={{ flex: 1 }}>
      <h2 style={{
        margin: 0,
        fontSize: 'var(--font-size-2xl)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-text-primary)'
      }}>{title}</h2>
      {subtitle && <p style={{
        margin: 'var(--space-1) 0 0 0',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)'
      }}>{subtitle}</p>}
    </div>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }}>
      {actions}
      {onClose && (
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          style={{
            padding: 'var(--space-1)',
            color: 'var(--color-text-muted)'
          }}
          aria-label="Close modal"
          title="Close and return to main page"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      )}
    </div>
  </div>
);

interface ModalBodyProps {
  children: ReactNode;
  padding?: boolean;
  scrollable?: boolean;
  className?: string;
}

const ModalBody = ({ children, padding = true, scrollable = true, className = '' }: ModalBodyProps) => (
  <div className={`${scrollable ? styles.modalBody : styles.modalBodyNonScrollable} ${className}`}>
    <div className={padding ? styles.modalBodyInner : styles.modalBodyInnerNoPadding}>
      {children}
    </div>
  </div>
);

interface ModalActionsProps {
  children: ReactNode;
  alignment?: 'left' | 'center' | 'right';
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Bottom padding matches header top padding for balance
const ModalActions = ({ children, alignment = 'right', spacing = 'md', className = '' }: ModalActionsProps) => {
  const alignmentClass = alignment === 'left' ? styles.modalActionsLeft : alignment === 'center' ? styles.modalActionsCenter : styles.modalActionsRight;
  const spacingClass = spacing === 'sm' ? styles.spacingSm : spacing === 'lg' ? styles.spacingLg : styles.spacingMd;

  return (
    <div className={`${styles.modalActions} ${alignmentClass} ${spacingClass} ${className}`}>
      {children}
    </div>
  );
};

interface ModalTabsProps {
  children: ReactNode;
  className?: string;
}

const ModalTabs = ({ children, className = '' }: ModalTabsProps) => (
  <div className={className} style={{
    marginBottom: 'var(--space-4)'
  }}>
    {children}
  </div>
);

// Attach composition components to Modal
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Actions = ModalActions;
Modal.Tabs = ModalTabs;