// DetailModal - Centralized modal for detail views with Edit pattern
// GOLD STANDARD: Use this component for all detail/info modals with edit functionality
//
// Features:
// - Automatic left-aligned Edit button
// - Right-aligned action buttons
// - Supports all standard Modal features (tabs, body, etc.)
//
// Usage:
// <DetailModal
//   isOpen={isOpen}
//   onClose={onClose}
//   title="Gauge Details"
//   editButton={<Button onClick={onEdit}>Edit</Button>}
//   actionButtons={<><Button>Action 1</Button><Button>Close</Button></>}
// >
//   <DetailModal.Body>Content here</DetailModal.Body>
// </DetailModal>

import { ReactNode } from 'react';
import { Modal } from './Modal';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFullClose?: () => void; // For 'X' button - navigate back to origin page
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  editButton?: ReactNode;
  actionButtons: ReactNode;
  className?: string;
  preventClosing?: boolean;
}

export const DetailModal = ({
  isOpen,
  onClose,
  onFullClose,
  title,
  size = 'md',
  children,
  editButton,
  actionButtons,
  className = '',
  preventClosing = false,
}: DetailModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onFullClose={onFullClose}
      title={title}
      size={size}
      className={className}
      preventClosing={preventClosing}
      noScroll={true}
    >
      {children}

      {/* Fixed footer with split button layout - always at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--space-6)',
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-primary)'
      }}>
          {/* Left group: Edit button */}
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {editButton}
          </div>

          {/* Right group: Action buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {actionButtons}
          </div>
      </div>
    </Modal>
  );
};

// Create custom Body component for DetailModal with flex layout
// Tab headers stay fixed, tab content controls its own scrolling, footer stays fixed
const DetailModalBody = ({ children, padding = true, className = '' }: {
  children: React.ReactNode;
  padding?: boolean;
  className?: string;
}) => (
  <div
    className={className}
    style={{
      padding: padding ? 'var(--space-4) var(--space-6) var(--space-6) var(--space-6)' : 0,
      paddingBottom: 'var(--modal-footer-height)', // Reserve space for fixed footer
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100% - var(--modal-footer-height))', // Full height minus footer
      overflow: 'hidden' // No scroll - let tab content control scrolling
    }}
  >
    {children}
  </div>
);

// Attach Modal sub-components for convenience
DetailModal.Body = DetailModalBody;
DetailModal.Header = Modal.Header;
DetailModal.Tabs = Modal.Tabs;
