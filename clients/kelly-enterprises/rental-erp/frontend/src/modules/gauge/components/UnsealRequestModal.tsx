// Modal for requesting to unseal a sealed gauge
// For Claude: Use Modal instead of window.confirm() or window.alert()
// Use Button instead of raw <button> elements
// Use Form components instead of raw <input>, <textarea>
import { useState, useEffect } from 'react';
import { Modal, Button, Icon, FormCheckbox, FormTextarea, TooltipToggle } from '../../../infrastructure';
import { useGaugeOperations } from '../hooks/useGaugeOperations';
import type { Gauge } from '../types';

interface UnsealRequestModalProps {
  isOpen: boolean;
  gauge: Gauge | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UnsealRequestModal({
  isOpen,
  gauge,
  onClose,
  onSuccess
}: UnsealRequestModalProps) {
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const { requestUnseal } = useGaugeOperations();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAcknowledged(false);
      setShowReasonInput(false);
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!gauge) return;
    
    if (acknowledged && !showReasonInput) {
      setShowReasonInput(true);
      return;
    }
    
    if (!acknowledged) return;
    
    try {
      await requestUnseal.mutateAsync({
        gaugeId: gauge.gauge_id,
        reason: reason.trim() || 'Request to unseal for use'
      });
      onSuccess?.();
      onClose();
    } catch (_error) {
      // Error handling is done in the hook via toast
    }
  };

  const handleClose = () => {
    setAcknowledged(false);
    setShowReasonInput(false);
    setReason('');
    onClose();
  };

  if (!gauge || !isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Sealed Gauge Notice"
      size="md"
    >
      <Modal.Body>
        <TooltipToggle />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)'
        }}>
          <Icon name="lock" />
          <span style={{
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--font-size-lg)',
            color: 'var(--color-text-primary)'
          }}>
            This gauge is sealed
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>Gauge:</span>
          <span style={{ color: 'var(--color-text-primary)' }}>{gauge.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>ID:</span>
          <span style={{ color: 'var(--color-text-primary)' }}>{gauge.gauge_id}</span>
        </div>
        
        <div style={{
          backgroundColor: 'var(--color-info-light-bg)',
          border: '1px solid var(--color-info-light)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)'
        }}>
          <p style={{
            margin: 0,
            color: 'var(--color-info)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}>
            <Icon name="info-circle" />
            This gauge is currently sealed and requires Admin/QC approval before it can be checked out.
          </p>
        </div>

        <div style={{
          backgroundColor: 'var(--color-warning-light-bg)',
          border: '1px solid var(--color-warning-light)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)'
        }}>
          <p style={{
            margin: 0,
            color: 'var(--color-warning)',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}>
            <Icon name="exclamation-triangle" />
            Before requesting to unseal:
          </p>
          <ul style={{
            margin: 'var(--space-2) 0 0 0',
            paddingLeft: 'var(--space-6)',
            color: 'var(--color-warning)'
          }}>
            <li>Please check if other similar gauges are available</li>
            <li>Only request unsealing if no alternatives meet your needs</li>
            <li>Admin/QC will review and approve/reject your request</li>
            <li>You'll be notified when a decision is made</li>
          </ul>
        </div>

        <FormCheckbox
          label="I have checked for alternatives and need to request this gauge be unsealed"
          checked={acknowledged}
          onChange={setAcknowledged}
          style={{
            margin: 'var(--space-4) 0',
            fontSize: 'var(--font-size-base)'
          }}
          tooltip="Confirm that you have verified no alternative gauges are available before requesting to unseal this one"
        />

        {showReasonInput && (
          <FormTextarea
            label="Reason for unseal request (optional):"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide any additional context for your request..."
            rows={4}
            tooltip="Provide additional context to help Admin/QC understand why this specific sealed gauge is needed"
          />
        )}
      </Modal.Body>

      <Modal.Actions>
        <Button 
          variant="primary"
          onClick={handleSubmit}
          disabled={!acknowledged || requestUnseal.isPending}
          loading={requestUnseal.isPending}
          icon={showReasonInput ? <Icon name="check" /> : <Icon name="unlock" />}
        >
          {requestUnseal.isPending ? 'Submitting...' : showReasonInput ? 'Submit Request' : 'Request Unseal'}
        </Button>
        <Button 
          variant="secondary"
          onClick={handleClose}
          disabled={requestUnseal.isPending}
        >
          Cancel
        </Button>
      </Modal.Actions>
    </Modal>
  );
}