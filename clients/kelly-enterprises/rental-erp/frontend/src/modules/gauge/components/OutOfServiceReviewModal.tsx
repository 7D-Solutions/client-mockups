// Out of Service Review modal for returning gauges to service
import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Button, LoadingSpinner, Icon, useImmediateModal, useToast } from '../../../infrastructure';
import { FormCheckbox, StorageLocationSelect, FormTextarea } from '../../../infrastructure/components';
import { useGauges } from '../hooks/useGauges';
import { useGaugeOperations } from '../hooks/useGaugeOperations';
import { StatusRules } from '../../../infrastructure/business/statusRules';

interface OutOfServiceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGaugeId?: string; // Optional: Pre-select a specific gauge
}

export function OutOfServiceReviewModal({ isOpen, onClose, initialGaugeId }: OutOfServiceReviewModalProps) {
  const [selectedGauge, setSelectedGauge] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [confirmPlacement, setConfirmPlacement] = useState(false);
  const [repairNotes, setRepairNotes] = useState('');

  const queryClient = useQueryClient();
  const { data: gaugeData, isLoading, refetch } = useGauges({ status: 'out_of_service' });
  const { qcVerify } = useGaugeOperations();

  // Memoize filtered and sorted gauges to prevent infinite loop
  const outOfServiceGauges = useMemo(() => {
    const outOfServiceGaugesRaw = gaugeData?.data?.filter(g => StatusRules.isOutOfService(g)) || [];
    return outOfServiceGaugesRaw.filter((gauge, index, self) => {
      return index === self.findIndex(g => g.gauge_id === gauge.gauge_id);
    }).sort((a, b) => {
      // Sort alphabetically by gauge ID
      const aId = a.gauge_id.toUpperCase();
      const bId = b.gauge_id.toUpperCase();
      return aId.localeCompare(bId);
    });
  }, [gaugeData?.data]);

  // Reset when modal opens, or select initial gauge if provided
  useEffect(() => {
    if (isOpen) {
      if (initialGaugeId) {
        // Find and select the gauge with the matching ID
        const matchingGauge = outOfServiceGauges.find(g =>
          g.gauge_id === initialGaugeId ||
          g.gauge_id === initialGaugeId ||
          g.id === initialGaugeId
        );
        if (matchingGauge) {
          setSelectedGauge(matchingGauge);
          setSelectedLocation(matchingGauge.storage_location || '');
        } else {
          setSelectedGauge(null);
          setSelectedLocation('');
        }
      } else {
        setSelectedGauge(null);
        setSelectedLocation('');
      }
      setConfirmPlacement(false);
      setRepairNotes('');
    }
  }, [isOpen, initialGaugeId, outOfServiceGauges]);

  const handleGaugeSelect = (gauge: any) => {
    setSelectedGauge(gauge);
    setSelectedLocation(gauge.storage_location || '');
  };

  const handleBackToList = () => {
    setSelectedGauge(null);
    setSelectedLocation('');
    setConfirmPlacement(false);
    setRepairNotes('');
  };

  const { handleSuccess } = useImmediateModal({ onClose: handleBackToList });
  const toast = useToast();

  const handleReturnToService = async () => {
    if (!selectedGauge) return;

    if (!selectedLocation.trim()) {
      toast.error('Missing Location', 'Please specify a bin location for the gauge (e.g., A1, B3, L5)');
      return;
    }

    if (!confirmPlacement) {
      toast.error('Confirmation Required', 'Please confirm that the gauge has been placed in the specified location');
      return;
    }

    if (!repairNotes.trim()) {
      toast.error('Repair Notes Required', 'Please describe what was done to return this gauge to service');
      return;
    }

    try {
      await qcVerify.mutateAsync({
        gaugeId: selectedGauge.gauge_id || selectedGauge.gauge_id,
        data: {
          pass_fail: 'pass' as const,
          condition_rating: 10,
          notes: `Returned to service: ${repairNotes.trim()}`,
          requires_calibration: false,
          storage_location: selectedLocation.trim(),
          confirmPlacement: true
        }
      });

      // Invalidate queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gauges'] }),
        queryClient.invalidateQueries({ queryKey: ['gauges', { status: 'out_of_service' }] }),
        queryClient.invalidateQueries({ queryKey: ['admin-alerts-stable', 'out-of-service'] }),
        refetch()
      ]);

      handleSuccess();
    } catch (error) {
      console.error('Error returning gauge to service:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen onClose={onClose} title="Out of Service Review" size="md">
      {isLoading ? (
        <Modal.Body>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-8)'
          }}>
            <LoadingSpinner />
          </div>
        </Modal.Body>
      ) : !selectedGauge ? (
        <>
          <Modal.Body>
            <div style={{ paddingBottom: 'var(--space-9)' }}>
              <div style={{
                marginBottom: 'var(--space-4)'
              }}>
                <p style={{
                  color: 'var(--color-text-secondary)',
                  margin: 0
                }}>
                  Review {outOfServiceGauges.length} gauge{outOfServiceGauges.length !== 1 ? 's' : ''} out of service
                </p>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)'
              }}>
              {outOfServiceGauges.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: 'var(--space-8)',
                  color: 'var(--color-text-secondary)'
                }}>
                  <Icon name="check-circle" style={{
                    fontSize: 'var(--font-size-4xl)',
                    marginBottom: 'var(--space-4)'
                  }} />
                  <p style={{ margin: 0 }}>No gauges out of service</p>
                </div>
              ) : (
                outOfServiceGauges.map((gauge, index) => (
                  <div
                    key={`${gauge.gauge_id}-${index}`}
                    style={{
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--color-border-light)',
                      cursor: 'pointer',
                      transition: 'var(--transition-default)'
                    }}
                    onClick={() => handleGaugeSelect(gauge)}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)'
                      }}>
                        <div>
                          <h4 style={{
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--color-text-primary)',
                            margin: 0,
                            marginBottom: 'var(--space-1)'
                          }}>
                            {gauge.name}
                          </h4>
                          <p style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)',
                            margin: 0
                          }}>S/N: {gauge.gauge_id}</p>
                          <p style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-danger)',
                            margin: 0
                          }}>Status: Out of Service</p>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: 'var(--color-primary)'
                        }}>
                          Click to Review
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          </Modal.Body>

          <Modal.Actions style={{ paddingTop: 'var(--space-4)' }}>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </Modal.Actions>
        </>
      ) : (
        <>
          <Modal.Body>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBackToList}
                icon={<Icon name="arrow-left" />}
              >
                Back to list
              </Button>
            </div>

            <div style={{
              marginBottom: 'var(--space-3)'
            }}>
              <h4 style={{
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                margin: 0,
                marginBottom: 'var(--space-1)'
              }}>{selectedGauge.name}</h4>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                margin: 0
              }}>S/N: {selectedGauge.gauge_id}</p>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-danger)',
                margin: 0
              }}>Status: Out of Service</p>
            </div>

            {selectedGauge.qc_notes && (
              <div style={{
                marginBottom: 'var(--space-3)',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-warning-light)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-warning)'
              }}>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--space-1)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)'
                }}>
                  Reason for Out of Service:
                </label>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                  {selectedGauge.qc_notes}
                </p>
              </div>
            )}

            <div style={{ marginBottom: 'var(--space-3)' }}>
              <FormTextarea
                label="Repair/Service Notes"
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                placeholder="Describe what was done to return this gauge to service (e.g., cleaned, repaired, calibrated, etc.)"
                rows={2}
                required
              />
            </div>

            <div style={{ marginBottom: 'var(--space-3)' }}>
              <StorageLocationSelect
                value={selectedLocation}
                onChange={setSelectedLocation}
                required
              />
            </div>

            <div style={{ margin: 0 }}>
              <FormCheckbox
                label="Confirm gauge has been placed in specified location"
                checked={confirmPlacement}
                onChange={setConfirmPlacement}
              />
            </div>
          </Modal.Body>

          <Modal.Actions style={{ paddingTop: 'var(--space-3)' }}>
            <Button
              variant="success"
              onClick={handleReturnToService}
              loading={qcVerify.isPending}
            >
              Return to Service
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </Modal.Actions>
        </>
      )}
    </Modal>
  );
}
