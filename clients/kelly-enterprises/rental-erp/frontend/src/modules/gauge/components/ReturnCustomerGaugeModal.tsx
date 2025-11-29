// Phase 4: Return Customer Gauge Modal
// Modal for returning customer-owned gauges with companion awareness
import React, { useState } from 'react';
import { gaugeService } from '../services/gaugeService';
import type { Gauge } from '../types';
import {
  Modal,
  FormCheckbox,
  FormTextarea,
  ConfirmButton,
  CancelButton,
  Alert,
  useToast
} from '../../../infrastructure/components';
import { TooltipToggle } from '../../../infrastructure';

interface ReturnCustomerGaugeModalProps {
  isOpen: boolean;
  gauge: Gauge | null;
  companionGauge?: Gauge | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReturnCustomerGaugeModal: React.FC<ReturnCustomerGaugeModalProps> = ({
  isOpen,
  gauge,
  companionGauge,
  onClose,
  onSuccess
}) => {
  const [returnCompanion, setReturnCompanion] = useState(!!companionGauge);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!gauge) return null;

  const handleConfirm = async () => {
    if (!gauge) return;

    setIsSubmitting(true);
    try {
      // Return primary gauge
      await gaugeService.returnCustomerGauge(parseInt(gauge.id), reason || 'Customer returned gauge');

      // Return companion if selected
      if (returnCompanion && companionGauge) {
        await gaugeService.returnCustomerGauge(parseInt(companionGauge.id), reason || 'Customer returned gauge');
      }

      toast.success(`Successfully returned gauge ${gauge.gaugeId}${returnCompanion && companionGauge ? ` and ${companionGauge.gaugeId}` : ''}`);
      onSuccess();
      onClose();

      // Reset state
      setReason('');
      setReturnCompanion(!!companionGauge);
    } catch (error: any) {
      console.error('Failed to return customer gauge', error);
      toast.error(error.message || 'Failed to return gauge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setReturnCompanion(!!companionGauge);
      onClose();
    }
  };

  // Extract customer name from ownership or other fields
  const customerName = gauge.owner_employee_name || 'Customer';
  const baseId = gauge.gaugeId?.replace(/[AB]$/, '') || gauge.gaugeId;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Return Customer Gauge">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <TooltipToggle />

        <Alert variant="info">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Customer:</strong>
              <span>{customerName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Gauge:</strong>
              <span>{gauge.gaugeId}</span>
            </div>
            {gauge.name && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Description:</strong>
                <span>{gauge.name}</span>
              </div>
            )}
          </div>
        </Alert>

        {companionGauge && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Alert variant="info">
              This gauge is part of set: <strong>{baseId}</strong>
            </Alert>

            <FormCheckbox
              checked={returnCompanion}
              onChange={(e) => setReturnCompanion(e.target.checked)}
              label={`Also return companion gauge (${companionGauge.gaugeId})`}
              tooltip="Select this option to return both gauges in the set together. If unchecked, the companion becomes a spare."
            />

            {!returnCompanion && (
              <Alert variant="warning">
                ⚠️ Companion gauge will become a spare gauge if not returned
              </Alert>
            )}
          </div>
        )}

        <FormTextarea
          label="Reason for Return (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Customer no longer needs gauge, End of project, etc."
          rows={3}
          tooltip="Provide the reason for returning this customer gauge (e.g., project complete, no longer needed)"
        />

        <Alert variant="info">
          ℹ️ Returned gauges will be removed from active inventory and visible only to Admin/QC
        </Alert>

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border-default)' }}>
          <ConfirmButton onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Returning...' : 'Confirm Return'}
          </ConfirmButton>
          <CancelButton onClick={handleClose} disabled={isSubmitting} />
        </div>
      </div>
    </Modal>
  );
};
