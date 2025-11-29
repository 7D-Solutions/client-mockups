// For Claude: Perfect example of using centralized Modal and Button components
// Use this pattern instead of window.confirm() for all confirmation dialogs
// This provides consistent UX, accessibility, and modal stacking
import { Modal } from '../infrastructure/components/Modal';
import { Button } from '../infrastructure/components/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const getButtonVariant = (): 'danger' | 'success' | 'primary' => {
    return confirmVariant;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <Modal.Body>
        <p>{message}</p>
      </Modal.Body>
      
      <Modal.Actions>
        <Button
          type="button"
          size="sm"
          variant={getButtonVariant()}
          onClick={handleConfirm}
          disabled={isLoading}
          loading={isLoading}
        >
          {isLoading ? 'Processing...' : confirmText}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleCancel}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
      </Modal.Actions>
    </Modal>
  );
}