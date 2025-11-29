// ModalManager - Centralized modal management to prevent circular dependencies
import { useState } from 'react';
import { useEventBus, EVENTS } from '../events';
import { PasswordModal } from './PasswordModal';

export function ModalManager() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Listen for modal show events
  useEventBus(EVENTS.SHOW_PASSWORD_MODAL, () => {
    setShowPasswordModal(true);
  });

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
  };

  return (
    <>
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={handlePasswordModalClose}
      />
    </>
  );
}