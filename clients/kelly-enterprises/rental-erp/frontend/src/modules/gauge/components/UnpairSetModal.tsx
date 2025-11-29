// UnpairSetModal - Phase 2 implementation
// Modal for breaking apart a gauge set into two spare gauges
import { useState } from 'react';
import { gaugeService } from '../services/gaugeService';
import {
  Modal,
  FormTextarea,
  ConfirmButton,
  CancelButton,
  Icon,
  useToast
} from '../../../infrastructure/components';
import { TooltipToggle } from '../../../infrastructure';
import { logger } from '../../../infrastructure/utils/logger';

interface UnpairSetModalProps {
  isOpen: boolean;
  setId: string;
  gaugeId: number; // Numeric database ID of one of the gauges in the set
  onClose: () => void;
  onSuccess: () => void;
}

export function UnpairSetModal({ isOpen, setId, gaugeId, onClose, onSuccess }: UnpairSetModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // Call unpair API with the numeric gauge ID (will unpair both gauges)
      await gaugeService.unpairSet(gaugeId, reason || undefined);

      toast.success('Set Unpaired', 'Both gauges are now spare/unpaired gauges');
      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Failed to unpair set:', error);
      toast.error('Failed to unpair set', 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Unpair Gauge Set">
      <Modal.Body>
        <TooltipToggle />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Set ID Display */}
          <div>
            <div style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-gray-600)',
              marginBottom: 'var(--space-1)'
            }}>
              Set ID
            </div>
            <div style={{
              fontWeight: '600',
              fontSize: 'var(--font-size-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <Icon name="link" style={{ color: 'var(--color-primary)' }} />
              {setId}
            </div>
          </div>

          {/* Warning Message */}
          <div style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-warning-50)',
            border: '1px solid var(--color-warning-200)',
            borderRadius: 'var(--border-radius-md)',
            display: 'flex',
            gap: 'var(--space-2)',
            alignItems: 'flex-start'
          }}>
            <Icon name="exclamation-triangle" style={{ color: 'var(--color-warning)', marginTop: 'var(--space-0)' }} />
            <div>
              <div style={{ fontWeight: '600', marginBottom: 'var(--space-1)' }}>
                Warning
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-700)' }}>
                Both gauges will become spare/unpaired gauges. They can be paired with other compatible gauges later.
              </div>
            </div>
          </div>

          {/* Reason Field */}
          <FormTextarea
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for unpairing (optional)"
            rows={3}
            tooltip="Optionally provide a reason for breaking this gauge set apart (e.g., one gauge damaged, need to re-pair with different gauge)"
          />
        </div>
      </Modal.Body>

      <Modal.Actions>
        <CancelButton onClick={handleClose} disabled={isSubmitting} />
        <ConfirmButton onClick={handleConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Unpairing...' : 'Unpair Set'}
        </ConfirmButton>
      </Modal.Actions>
    </Modal>
  );
}
