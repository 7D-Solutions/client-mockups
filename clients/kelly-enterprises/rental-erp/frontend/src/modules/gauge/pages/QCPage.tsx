// QC Page - dedicated page for quality control approvals
import { useState, useEffect } from 'react';
import { Button, Icon } from '../../../infrastructure/components';
import { QCApprovalsModal } from '../components/QCApprovalsModal';

export const QCPage = () => {
  const [showQCModal, setShowQCModal] = useState(false);

  // Auto-open the modal when the page loads
  useEffect(() => {
    setShowQCModal(true);
  }, []);

  const handleCloseModal = () => {
    setShowQCModal(false);
    // Navigate back to dashboard when modal is closed
    window.history.back();
  };

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 var(--space-2) 0' }}>Quality Control Approvals</h1>
        <p style={{ margin: 0, color: 'var(--color-gray-600)' }}>Review and approve pending gauge returns</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          onClick={() => setShowQCModal(true)}
          variant="primary"
          icon={<Icon name="clipboard-check" />}
        >
          Open QC Approvals
        </Button>
      </div>

      <QCApprovalsModal
        isOpen={showQCModal}
        onClose={handleCloseModal}
      />
    </div>
  );
};
