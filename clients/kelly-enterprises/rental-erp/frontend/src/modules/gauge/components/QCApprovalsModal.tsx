// QC Approvals modal for handling pending quality control approvals
// For Claude: Use Modal instead of window.confirm() or window.alert()
// Use Button instead of raw <button> elements
// Use FormCheckbox instead of raw <input type="checkbox">
// Use apiClient instead of direct fetch() calls
import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Button, LoadingSpinner, RejectModal, Icon, useImmediateModal, useToast } from '../../../infrastructure';
import { FormCheckbox, StorageLocationSelect } from '../../../infrastructure/components';
import { GaugeTypeBadge } from '../../../infrastructure/components';
import { apiClient } from '../../../infrastructure/api/client';
import { useGauges } from '../hooks/useGauges';
import { useGaugeOperations } from '../hooks/useGaugeOperations';
import { groupGaugesForDisplay } from '../utils/gaugeGrouping';

interface QCApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGaugeId?: string; // Optional: Pre-select a specific gauge
}

export function QCApprovalsModal({ isOpen, onClose, initialGaugeId }: QCApprovalsModalProps) {
  const [selectedGauge, setSelectedGauge] = useState<any>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [confirmPlacement, setConfirmPlacement] = useState(false);

  const queryClient = useQueryClient();
  const { data: gaugeData, isLoading, refetch } = useGauges({ status: 'pending_qc' });
  const { qcVerify } = useGaugeOperations();

  // Use shared grouping logic for consistency with badge count
  const pendingGauges = useMemo(() => {
    return groupGaugesForDisplay(gaugeData?.data);
  }, [gaugeData?.data]);

  // Reset to list view when modal opens, or select initial gauge if provided
  useEffect(() => {
    if (isOpen) {
      if (initialGaugeId) {
        // Find and select the gauge with the matching ID
        const matchingGauge = pendingGauges.find(g =>
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
    }
  }, [isOpen, initialGaugeId, pendingGauges]);

  const handleGaugeSelect = (gauge: any) => {
    setSelectedGauge(gauge);
    setSelectedLocation(gauge.storage_location || '');
  };

  const handleBackToList = () => {
    setSelectedGauge(null);
    setSelectedLocation('');
    setConfirmPlacement(false);
  };

  const { handleSuccess } = useImmediateModal({ onClose: handleBackToList });
  const toast = useToast();

  const handleApprove = async () => {
    if (!selectedGauge) return;

    if (!selectedLocation.trim()) {
      toast.error('Missing Location', 'Please specify a bin location for the gauge (e.g., A1, B3, L5)');
      return;
    }

    if (!confirmPlacement) {
      toast.error('Confirmation Required', 'Please confirm that the gauge has been placed in the specified location');
      return;
    }

    try {
      // If it's a set, approve both gauges using direct API calls (no mutation toasts)
      if ((selectedGauge as any)._isSet && (selectedGauge as any)._gauges) {
        const gauges = (selectedGauge as any)._gauges;

        // Approve each gauge in the set using direct API calls
        for (const gauge of gauges) {
          await apiClient.post(`/gauges/tracking/${gauge.gauge_id}/qc-verify`, {
            pass_fail: 'pass',
            condition_rating: 10,
            notes: 'QC inspection passed (Set)',
            requires_calibration: false,
            storage_location: selectedLocation.trim(),
            confirmPlacement: true
          });
        }

        // Force immediate cache invalidation after approving set
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['gauges'] }),
          queryClient.invalidateQueries({ queryKey: ['gauges', { status: 'pending_qc' }] }),
          queryClient.invalidateQueries({ queryKey: ['admin-alerts-stable', 'pending-qc'] }),
          refetch()
        ]);

        // Show single success message for the set
        toast.success('Set Approved', `Both gauges in set ${(selectedGauge as any)._setId} have been approved and are now available`);

        // Go back to list
        handleBackToList();
      } else {
        // Single gauge approval - let mutation handle success toast
        await qcVerify.mutateAsync({
          gaugeId: selectedGauge.gauge_id || selectedGauge.gauge_id,
          data: {
            pass_fail: 'pass' as const,
            condition_rating: 10,
            notes: 'QC inspection passed',
            requires_calibration: false,
            storage_location: selectedLocation.trim(),
            confirmPlacement: true
          }
        });

        // Use centralized modal success handling for single gauge
        handleSuccess();
      }
    } catch (error) {
      console.error('Error approving gauge:', error);
    }
  };

  const handleReject = () => {
    setShowRejectConfirm(true);
  };

  const handleRejectConfirmYes = () => {
    setShowRejectConfirm(false);
    setShowRejectModal(true);
  };

  const handleRejectConfirmNo = () => {
    setShowRejectConfirm(false);
  };

  const handleRejectConfirm = async (reason: string, notes?: string) => {
    try {
      // Map frontend reason strings to backend reason IDs
      const reasonMapping: Record<string, number> = {
        'Physical damage': 7, // 'Gauge damaged during inspection' → out_of_service
        'Contamination': 1, // 'Gauge damaged' → out_of_service
        'Missing parts/Incomplete': 9, // 'Missing identification markings' → out_of_service
        'Other': 5 // 'Equipment malfunction' → out_of_service
      };

      const reasonId = reasonMapping[reason] || 1; // Default to gauge damaged

      const response = await apiClient.post<{ success: boolean; error?: string; data?: any }>('/gauges/rejection-reasons/reject-gauge', {
        gauge_id: selectedGauge.gauge_id || selectedGauge.gauge_id,
        reason_id: reasonId,
        notes: notes || undefined
      });

      if (response.success || response.data?.success) {
        // Force immediate updates of all relevant queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['gauges'] }),
          queryClient.invalidateQueries({ queryKey: ['gauges', { status: 'pending_qc' }] }),
          queryClient.invalidateQueries({ queryKey: ['gauges', { status: 'out_of_service' }] }),
          queryClient.invalidateQueries({ queryKey: ['admin-alerts-stable', 'pending-qc'] }),
          queryClient.invalidateQueries({ queryKey: ['admin-alerts-stable', 'out-of-service'] }),
          refetch()
        ]);

        // Show success notification
        toast.success(
          'Gauge Rejected',
          `${selectedGauge.gauge_id} has been marked as out of service and will require repair before returning to use`
        );

        setShowRejectModal(false);
        handleBackToList();
      } else {
        throw new Error(response.error || response.data?.error || 'Failed to reject gauge');
      }
    } catch (error: any) {
      console.error('Error rejecting gauge:', error);
      // Let the RejectModal handle error display if it supports it
      // Otherwise, we could use a toast here
      throw error; // Re-throw to let RejectModal handle the error
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen onClose={onClose} title="QC Approvals" size="md">
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
                    Review {pendingGauges.length} item{pendingGauges.length !== 1 ? 's' : ''} awaiting QC approval
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)'
                }}>
                {pendingGauges.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: 'var(--space-8)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    <Icon name="check-circle" style={{
                      fontSize: 'var(--font-size-4xl)',
                      marginBottom: 'var(--space-4)'
                    }} />
                    <p style={{ margin: 0 }}>No gauges pending QC approval</p>
                  </div>
                ) : (
                  pendingGauges.map((gauge, index) => (
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                              <h4 style={{
                                fontWeight: 'var(--font-weight-medium)',
                                color: 'var(--color-text-primary)',
                                margin: 0
                              }}>
                                {gauge.name}
                              </h4>
                              {(gauge as any)._isSet && (
                                <GaugeTypeBadge type="set" />
                              )}
                              {!gauge.set_id && !(gauge as any)._isSet && (
                                <GaugeTypeBadge type="spare" />
                              )}
                            </div>
                            <p style={{
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--color-text-secondary)',
                              margin: 0
                            }}>S/N: {gauge.gauge_id}</p>
                            <p style={{
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--color-text-secondary)',
                              margin: 0
                            }}>
                              Returned by: {gauge.returned_by_user_name || gauge.assigned_to_user_name || gauge.checked_out_to || gauge.holder?.name || 'Unknown'}
                            </p>
                            <p style={{
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--color-text-secondary)',
                              margin: 0
                            }}>Status: Pending QC Approval</p>
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
              <div style={{ marginBottom: 'var(--space-4)' }}>
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
                  marginBottom: 'var(--space-4)',
                  paddingTop: 'var(--space-6)',
                  paddingRight: 'var(--space-6)',
                  paddingBottom: 'var(--space-6)',
                  paddingLeft: '0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                    <h4 style={{
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      margin: 0
                    }}>{selectedGauge.name}</h4>
                    {(selectedGauge as any)._isSet && (
                      <GaugeTypeBadge type="set" />
                    )}
                    {!selectedGauge.set_id && !(selectedGauge as any)._isSet && (
                      <GaugeTypeBadge type="spare" />
                    )}
                  </div>
                  <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    margin: 0
                  }}>S/N: {selectedGauge.gauge_id}</p>
                  {(selectedGauge as any)._isSet && (selectedGauge as any)._gauges && (
                    <p style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      margin: 0
                    }}>
                      Includes: {(selectedGauge as any)._gauges.map((g: any) => g.gauge_id).join(', ')}
                    </p>
                  )}
                  <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    margin: 0
                  }}>
                    Returned by: {selectedGauge.returned_by_user_name || selectedGauge.assigned_to_user_name || selectedGauge.checked_out_to || selectedGauge.holder?.name || 'Unknown'}
                  </p>
                  <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    margin: 0
                  }}>Status: Pending QC Approval</p>
                  
                  <div style={{ marginTop: 'var(--space-6)' }}>
                    <StorageLocationSelect
                      value={selectedLocation}
                      onChange={setSelectedLocation}
                      required
                    />
                    
                    <div style={{ marginTop: 'var(--space-4)' }}>
                      <FormCheckbox
                        label="Confirm gauge has been placed in specified location"
                        checked={confirmPlacement}
                        onChange={setConfirmPlacement}
                      />
                    </div>
                  </div>
                </div>
            </Modal.Body>
              
            <Modal.Actions>
              <Button 
                variant="success" 
                onClick={handleApprove}
                loading={qcVerify.isPending}
              >
                Approve
              </Button>
              <Button 
                variant="danger" 
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </Modal.Actions>
          </>
        )}
      </Modal>

      {/* Reject Confirmation Modal */}
      {selectedGauge && showRejectConfirm && (
        <Modal
          isOpen={showRejectConfirm}
          onClose={handleRejectConfirmNo}
          title="Confirm Rejection"
          size="sm"
        >
          <Modal.Body>
            <div style={{
              padding: 'var(--space-4)',
              textAlign: 'center'
            }}>
              <Icon name="exclamation-triangle" style={{
                fontSize: '3rem',
                color: 'var(--color-danger)',
                marginBottom: 'var(--space-4)'
              }} />
              <h3 style={{
                margin: 0,
                marginBottom: 'var(--space-2)',
                fontSize: 'var(--font-size-lg)',
                fontWeight: '600'
              }}>
                Reject this gauge?
              </h3>
              <p style={{
                margin: 0,
                marginBottom: 'var(--space-2)',
                color: 'var(--color-text-secondary)'
              }}>
                <strong>{selectedGauge.gauge_id}</strong> - {selectedGauge.name}
              </p>
              <p style={{
                margin: 0,
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)'
              }}>
                The gauge will be marked as out of service and require repair before it can be used again.
              </p>
            </div>
          </Modal.Body>
          <Modal.Actions>
            <Button
              variant="danger"
              onClick={handleRejectConfirmYes}
            >
              Yes, Reject
            </Button>
            <Button
              variant="secondary"
              onClick={handleRejectConfirmNo}
            >
              Cancel
            </Button>
          </Modal.Actions>
        </Modal>
      )}

      {/* Reject Reason Modal */}
      {selectedGauge && (
        <RejectModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
          }}
          onReject={handleRejectConfirm}
          title="Reject Gauge QC"
          itemDescription={`Gauge: ${selectedGauge.gauge_id} (${selectedGauge.name})`}
          reasons={[
            'Physical damage',
            'Contamination',
            'Missing parts/Incomplete',
            'Other'
          ]}
        />
      )}
    </>
  );
}