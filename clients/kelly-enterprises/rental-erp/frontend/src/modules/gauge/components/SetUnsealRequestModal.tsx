// Set Unseal Request Modal - Handles unseal requests for gauge sets (GO + NO-GO)
import { useState, useEffect } from 'react';
import { Modal, Button, Icon, FormCheckbox, FormTextarea, Tag, TooltipToggle, useToast } from '../../../infrastructure/components';
import { useGaugeOperations } from '../hooks/useGaugeOperations';
import { gaugeService } from '../services/gaugeService';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import type { Gauge } from '../types';

interface SetUnsealRequestModalProps {
  isOpen: boolean;
  setId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SetUnsealRequestModal({
  isOpen,
  setId,
  onClose,
  onSuccess
}: SetUnsealRequestModalProps) {
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [goGauge, setGoGauge] = useState<Gauge | null>(null);
  const [nogoGauge, setNogoGauge] = useState<Gauge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestUnseal } = useGaugeOperations();
  const toast = useToast();

  // Fetch set data
  useEffect(() => {
    if (isOpen && setId) {
      setIsLoading(true);
      setError(null);
      gaugeService.getSetById(setId)
        .then((setData) => {
          setGoGauge(setData.goGauge);
          setNogoGauge(setData.nogoGauge);
        })
        .catch((err) => {
          setError('Failed to load set data');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, setId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAcknowledged(false);
      setShowReasonInput(false);
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!goGauge || !nogoGauge) return;

    if (acknowledged && !showReasonInput) {
      setShowReasonInput(true);
      return;
    }

    if (!acknowledged) return;

    // Determine which gauges need unsealing
    const goSealed = StatusRules.isSealed(goGauge);
    const nogoSealed = StatusRules.isSealed(nogoGauge);

    const unsealRequests = [];
    if (goSealed) {
      unsealRequests.push(
        requestUnseal.mutateAsync({
          gaugeId: goGauge.gauge_id,
          reason: reason.trim() || 'Request to unseal for use'
        })
      );
    }
    if (nogoSealed) {
      unsealRequests.push(
        requestUnseal.mutateAsync({
          gaugeId: nogoGauge.gauge_id,
          reason: reason.trim() || 'Request to unseal for use'
        })
      );
    }

    if (unsealRequests.length === 0) {
      toast.error('No sealed gauges found', 'This set does not have any sealed gauges');
      return;
    }

    try {
      setIsSubmitting(true);
      await Promise.all(unsealRequests);
      toast.success(
        'Unseal request(s) submitted',
        `Unseal request submitted for ${unsealRequests.length} gauge(s). Admin/QC will review your request.`
      );
      onSuccess?.();
      onClose();
    } catch (_error) {
      // Error handling is done in the hook via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAcknowledged(false);
    setShowReasonInput(false);
    setReason('');
    onClose();
  };

  if (!isOpen) return null;

  // Check which gauges are sealed
  const goSealed = goGauge && StatusRules.isSealed(goGauge);
  const nogoSealed = nogoGauge && StatusRules.isSealed(nogoGauge);
  const sealedCount = (goSealed ? 1 : 0) + (nogoSealed ? 1 : 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Sealed Set Notice"
      size="md"
    >
      <Modal.Body>
        <TooltipToggle />

        {isLoading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            Loading set information...
          </div>
        ) : error ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-danger)' }}>
            {error}
          </div>
        ) : (
          <>
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
                This set has {sealedCount} sealed {sealedCount === 1 ? 'gauge' : 'gauges'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>Set ID:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{setId}</span>
            </div>

            {/* GO Gauge */}
            {goGauge && (
              <div style={{
                marginBottom: 'var(--space-3)',
                padding: 'var(--space-3)',
                backgroundColor: goSealed ? 'var(--color-warning-light-bg)' : 'white',
                borderRadius: 'var(--radius-md)',
                border: goSealed ? '2px solid var(--color-warning)' : '2px solid var(--color-border-default)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontWeight: '600', fontSize: 'var(--font-size-base)' }}>GO Gauge:</span>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <Tag size="sm" variant="success">GO</Tag>
                    {goSealed && (
                      <Tag size="sm" variant="warning">
                        <Icon name="lock" /> Sealed
                      </Tag>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>ID:</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>{goGauge.gauge_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between)' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Name:</span>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>{goGauge.name}</span>
                </div>
              </div>
            )}

            {/* NO-GO Gauge */}
            {nogoGauge && (
              <div style={{
                marginBottom: 'var(--space-4)',
                padding: 'var(--space-3)',
                backgroundColor: nogoSealed ? 'var(--color-warning-light-bg)' : 'white',
                borderRadius: 'var(--radius-md)',
                border: nogoSealed ? '2px solid var(--color-warning)' : '2px solid var(--color-border-default)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontWeight: '600', fontSize: 'var(--font-size-base)' }}>NO-GO Gauge:</span>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <Tag size="sm" variant="danger">NO-GO</Tag>
                    {nogoSealed && (
                      <Tag size="sm" variant="warning">
                        <Icon name="lock" /> Sealed
                      </Tag>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>ID:</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>{nogoGauge.gauge_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between)' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Name:</span>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>{nogoGauge.name}</span>
                </div>
              </div>
            )}

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
                {sealedCount === 1 ? 'This gauge is' : 'These gauges are'} currently sealed and {sealedCount === 1 ? 'requires' : 'require'} Admin/QC approval before {sealedCount === 1 ? 'it' : 'they'} can be checked out.
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
              label="I have checked for alternatives and need to request this set be unsealed"
              checked={acknowledged}
              onChange={setAcknowledged}
              style={{
                margin: 'var(--space-4) 0',
                fontSize: 'var(--font-size-base)'
              }}
              tooltip="Confirm that you have verified no alternative gauge sets are available before requesting to unseal this one"
            />

            {showReasonInput && (
              <FormTextarea
                label="Reason for unseal request (optional):"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide any additional context for your request..."
                rows={4}
                tooltip="Provide additional context to help Admin/QC understand why this specific sealed gauge set is needed"
              />
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Actions>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!acknowledged || isSubmitting || isLoading}
          loading={isSubmitting}
          icon={showReasonInput ? <Icon name="check" /> : <Icon name="unlock" />}
        >
          {isSubmitting ? 'Submitting...' : showReasonInput ? 'Submit Request' : 'Request Unseal'}
        </Button>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
