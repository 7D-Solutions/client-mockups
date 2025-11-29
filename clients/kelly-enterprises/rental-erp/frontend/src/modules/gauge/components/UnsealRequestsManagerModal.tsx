// Modal for managing pending unseal requests (Admin functionality)
// For Claude: Use Modal instead of window.confirm() or window.alert()
// Use Button instead of raw <button> elements
// Use centralized components for consistent UX
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Icon, Badge } from '../../../infrastructure';
import { gaugeService } from '../services';
import { useToast } from '../../../infrastructure';
import { useGaugeOperations } from '../hooks/useGaugeOperations';
import { UnsealConfirmModal } from './UnsealConfirmModal';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import type { UnsealRequest } from '../types';

interface UnsealRequestsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Group requests by set_id
interface GroupedRequest {
  id: string; // If set, use setId; if individual, use request id
  isSet: boolean;
  setId?: string;
  requests: UnsealRequest[]; // All requests in this group (1 for individual, 2+ for set)
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
}

export function UnsealRequestsManagerModal({ isOpen, onClose }: UnsealRequestsManagerModalProps) {
  const [selectedGrouped, setSelectedGrouped] = useState<GroupedRequest | null>(null);
  const [confirmModalData, setConfirmModalData] = useState<{
    grouped: GroupedRequest | null;
    type: 'approve' | 'confirm_unseal' | 'reject';
  }>({ grouped: null, type: 'approve' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { confirmUnseal } = useGaugeOperations();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedGrouped(null);
      setConfirmModalData({ grouped: null, type: 'approve' });
      setShowConfirmModal(false);
    }
  }, [isOpen]);
  
  const { data: pendingData, isLoading: pendingLoading, error: pendingError } = useQuery({
    queryKey: ['unseal-requests', 'pending'],
    queryFn: () => gaugeService.getUnsealRequests('pending'),
    enabled: isOpen,
  });

  const { data: approvedData, isLoading: approvedLoading, error: approvedError } = useQuery({
    queryKey: ['unseal-requests', 'approved'],
    queryFn: () => gaugeService.getUnsealRequests('approved'),
    enabled: isOpen,
  });

  const _isLoading = pendingLoading || approvedLoading;
  const _error = pendingError || approvedError;
  
  const refetch = () => {
    // Refetch both queries
  };

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => gaugeService.approveUnsealRequest(requestId),
    onSuccess: () => {
      toast.success('Success', 'Unseal request approved');
      queryClient.invalidateQueries({ queryKey: ['gauges'] });
      queryClient.invalidateQueries({ queryKey: ['unseal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error('Error', error.message || 'Failed to approve unseal request');
    }
  });

  const denyMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      gaugeService.denyUnsealRequest(requestId, reason),
    onSuccess: () => {
      toast.success('Success', 'Unseal request denied');
      queryClient.invalidateQueries({ queryKey: ['gauges'] });
      queryClient.invalidateQueries({ queryKey: ['unseal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error('Error', error.message || 'Failed to deny unseal request');
    }
  });

  const approveSetMutation = useMutation({
    mutationFn: (setId: string) => gaugeService.approveSetUnsealRequests(setId),
    onSuccess: () => {
      toast.success('Success', 'Set unseal requests approved');
      queryClient.invalidateQueries({ queryKey: ['gauges'] });
      queryClient.invalidateQueries({ queryKey: ['unseal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error('Error', error.message || 'Failed to approve set unseal requests');
    }
  });

  const denySetMutation = useMutation({
    mutationFn: ({ setId, reason }: { setId: string; reason: string }) =>
      gaugeService.denySetUnsealRequests(setId, reason),
    onSuccess: () => {
      toast.success('Success', 'Set unseal requests denied');
      queryClient.invalidateQueries({ queryKey: ['gauges'] });
      queryClient.invalidateQueries({ queryKey: ['unseal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error('Error', error.message || 'Failed to deny set unseal requests');
    }
  });

  const pendingRequests = pendingData?.data || [];
  const approvedRequests = approvedData?.data || [];
  const allRequests = [...pendingRequests, ...approvedRequests];

  // Group requests by set_id
  const groupedRequests: GroupedRequest[] = [];
  const processedSets = new Set<string>();

  allRequests.forEach((request) => {
    if (request.set_id && !processedSets.has(request.set_id)) {
      // This is part of a set - find all requests for this set
      const setRequests = allRequests.filter(r => r.set_id === request.set_id);
      processedSets.add(request.set_id);

      groupedRequests.push({
        id: request.set_id,
        isSet: true,
        setId: request.set_id,
        requests: setRequests,
        status: setRequests[0].status as 'pending' | 'approved' | 'denied' | 'cancelled'
      });
    } else if (!request.set_id) {
      // Individual gauge
      groupedRequests.push({
        id: request.id,
        isSet: false,
        requests: [request],
        status: request.status as 'pending' | 'approved' | 'denied' | 'cancelled'
      });
    }
  });

  const handleApprove = (grouped: GroupedRequest) => {
    setConfirmModalData({ grouped, type: 'approve' });
    setShowConfirmModal(true);
  };

  const handleDeny = (grouped: GroupedRequest) => {
    setConfirmModalData({ grouped, type: 'reject' });
    setShowConfirmModal(true);
  };

  const handleConfirmUnseal = (grouped: GroupedRequest) => {
    setConfirmModalData({ grouped, type: 'confirm_unseal' });
    setShowConfirmModal(true);
  };

  const handleModalConfirm = async (data?: any) => {
    if (!confirmModalData.grouped) return;

    const grouped = confirmModalData.grouped;

    if (confirmModalData.type === 'approve') {
      // Use set-based approval if this is a set, otherwise individual
      if (grouped.isSet && grouped.setId) {
        approveSetMutation.mutate(grouped.setId);
      } else {
        approveMutation.mutate(grouped.requests[0].id);
      }
      setShowConfirmModal(false);
      setConfirmModalData({ grouped: null, type: 'approve' });
    } else if (confirmModalData.type === 'confirm_unseal') {
      // For confirm unseal, we still use individual request IDs
      // The backend confirmUnseal already handles unsealing all gauges in a set
      try {
        await confirmUnseal.mutateAsync(grouped.requests[0].id);
        toast.success('Success', grouped.isSet ? 'Gauge set has been unsealed' : 'Gauge has been unsealed');
        queryClient.invalidateQueries({ queryKey: ['gauges'] });
        queryClient.invalidateQueries({ queryKey: ['unseal-requests'] });
        queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
        refetch();
        setShowConfirmModal(false);
        setConfirmModalData({ grouped: null, type: 'approve' });
      } catch (error) {
        // Error is handled by the mutation
        setShowConfirmModal(false);
        setConfirmModalData({ grouped: null, type: 'approve' });
      }
    } else if (confirmModalData.type === 'reject') {
      // Use set-based denial if this is a set, otherwise individual
      if (grouped.isSet && grouped.setId) {
        denySetMutation.mutate({
          setId: grouped.setId,
          reason: data.reason
        });
      } else {
        denyMutation.mutate({
          requestId: grouped.requests[0].id,
          reason: data.reason
        });
      }
      setShowConfirmModal(false);
      setConfirmModalData({ grouped: null, type: 'approve' });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Unseal Requests"
        size="lg"
      >
        <Modal.Body>
          {groupedRequests.length === 0 ? (
            <p style={{
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              padding: 'var(--space-8)'
            }}>
              No unseal requests
            </p>
          ) : (
            <div>
              {!selectedGrouped ? (
                <div>
                  <p style={{
                    marginBottom: 'var(--space-4)',
                    color: 'var(--color-text-primary)'
                  }}>
                    Review requests to unseal gauges for checkout
                  </p>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)'
                  }}>
                    {groupedRequests.map((grouped: GroupedRequest) => {
                      const mainRequest = grouped.requests[0];
                      return (
                        <div
                          key={grouped.id}
                          style={{
                            border: '1px solid var(--color-border-light)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-4)',
                            cursor: 'pointer',
                            transition: 'var(--transition-default)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onClick={() => setSelectedGrouped(grouped)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-gray-50)';
                            e.currentTarget.style.borderColor = 'var(--color-border-default)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '';
                            e.currentTarget.style.borderColor = 'var(--color-border-light)';
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <h4 style={{
                              margin: '0 0 var(--space-2) 0',
                              fontSize: 'var(--font-size-lg)',
                              color: 'var(--color-text-primary)'
                            }}>
                              {grouped.isSet
                                ? `Thread Gauge Set ${grouped.setId}`
                                : mainRequest.gauge_name || 'Unknown Gauge'}
                            </h4>
                            {grouped.isSet ? (
                              <>
                                <p style={{
                                  margin: 'var(--space-2) 0',
                                  fontSize: 'var(--font-size-sm)',
                                  color: 'var(--color-text-secondary)',
                                  fontWeight: '500'
                                }}>
                                  {grouped.requests.length} gauge{grouped.requests.length > 1 ? 's' : ''} in set:
                                </p>
                                <div style={{
                                  display: 'flex',
                                  gap: 'var(--space-2)',
                                  marginTop: 'var(--space-2)'
                                }}>
                                  {grouped.requests.map((req) => (
                                    <div
                                      key={req.id}
                                      style={{
                                        flex: '1',
                                        border: '1px solid var(--color-border-default)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: 'var(--space-2)',
                                        backgroundColor: 'white'
                                      }}
                                    >
                                      <p style={{
                                        margin: '0 0 var(--space-1) 0',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: '600',
                                        color: 'var(--color-text-primary)'
                                      }}>
                                        {req.gauge_name}
                                      </p>
                                      <p style={{
                                        margin: '0',
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-secondary)'
                                      }}>
                                        {req.gauge_tag}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p style={{
                                margin: 'var(--space-1) 0',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-secondary)'
                              }}>
                                Gauge ID: {mainRequest.gauge_tag}
                              </p>
                            )}
                            <p style={{
                              margin: 'var(--space-1) 0',
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--color-text-secondary)'
                            }}>
                              Requested by: {mainRequest.requester_name || 'Unknown User'}
                            </p>
                            <p style={{
                              margin: 'var(--space-1) 0',
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--color-text-secondary)'
                            }}>
                              Date: {new Date(mainRequest.created_at).toLocaleString()}
                            </p>
                            {StatusRules.isTransferPending({ status: mainRequest.status }) ? (
                              <Badge size="sm" variant={StatusRules.getTransferStatusVariant(mainRequest.status)}>
                                <Icon name="lock" /> Awaiting approval
                              </Badge>
                            ) : (
                              <p style={{
                                margin: 'var(--space-2) 0',
                                color: 'var(--color-success)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-1)',
                                fontSize: 'var(--font-size-sm)'
                              }}>
                                <Icon name="check-circle" /> Approved - awaiting physical unseal
                              </p>
                            )}
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--color-text-secondary)',
                            fontSize: 'var(--font-size-sm)'
                          }}>
                            Click to review <Icon name="sign-out-alt" style={{ marginLeft: 'var(--space-2)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedGrouped(null)}
                    style={{ marginBottom: 'var(--space-4)' }}
                    icon={<Icon name="arrow-left" />}
                  >
                    Back to list
                  </Button>

                  <div style={{
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-6)',
                    marginBottom: 'var(--space-4)',
                    backgroundColor: 'var(--color-gray-50)'
                  }}>
                    <div>
                      <h4 style={{
                        margin: '0 0 var(--space-3) 0',
                        fontSize: 'var(--font-size-xl)',
                        color: 'var(--color-text-primary)'
                      }}>
                        {selectedGrouped.isSet
                          ? `Thread Gauge Set ${selectedGrouped.setId}`
                          : selectedGrouped.requests[0].gauge_name || 'Unknown Gauge'}
                      </h4>

                      {selectedGrouped.isSet ? (
                        <>
                          <div style={{ marginBottom: 'var(--space-4)' }}>
                            {selectedGrouped.requests.map((req, index) => (
                              <div
                                key={req.id}
                                style={{
                                  border: '2px solid var(--color-border-default)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: 'var(--space-3)',
                                  marginBottom: index < selectedGrouped.requests.length - 1 ? 'var(--space-3)' : '0',
                                  backgroundColor: 'white'
                                }}
                              >
                                <p style={{
                                  margin: '0 0 var(--space-2) 0',
                                  color: 'var(--color-text-primary)',
                                  fontWeight: '600',
                                  fontSize: 'var(--font-size-base)'
                                }}>
                                  {req.gauge_name}
                                </p>
                                <p style={{
                                  margin: '0',
                                  fontSize: 'var(--font-size-sm)',
                                  color: 'var(--color-text-secondary)'
                                }}>
                                  Gauge ID: {req.gauge_tag}
                                </p>
                              </div>
                            ))}
                          </div>
                          <p style={{
                            margin: 'var(--space-2) 0',
                            color: 'var(--color-text-primary)'
                          }}>
                            Requested by: {selectedGrouped.requests[0].requester_name || 'Unknown User'}
                          </p>
                          <p style={{
                            margin: 'var(--space-2) 0',
                            color: 'var(--color-text-primary)'
                          }}>
                            Date: {new Date(selectedGrouped.requests[0].created_at).toLocaleString()}
                          </p>
                          {selectedGrouped.requests[0].reason && (
                            <p style={{
                              margin: 'var(--space-2) 0',
                              color: 'var(--color-text-primary)'
                            }}>
                              Reason: {selectedGrouped.requests[0].reason}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p style={{
                            margin: 'var(--space-2) 0',
                            color: 'var(--color-text-primary)'
                          }}>
                            Gauge ID: {selectedGrouped.requests[0].gauge_tag}
                          </p>
                          <p style={{
                            margin: 'var(--space-2) 0',
                            color: 'var(--color-text-primary)'
                          }}>
                            Requested by: {selectedGrouped.requests[0].requester_name || 'Unknown User'}
                          </p>
                          <p style={{
                            margin: 'var(--space-2) 0',
                            color: 'var(--color-text-primary)'
                          }}>
                            Date: {new Date(selectedGrouped.requests[0].created_at).toLocaleString()}
                          </p>
                          {selectedGrouped.requests[0].reason && (
                            <p style={{
                              margin: 'var(--space-2) 0',
                              color: 'var(--color-text-primary)'
                            }}>
                              Reason: {selectedGrouped.requests[0].reason}
                            </p>
                          )}
                        </>
                      )}

                      {StatusRules.isTransferPending({ status: selectedGrouped.status }) ? (
                        <div style={{ marginTop: 'var(--space-4)' }}>
                          <Badge size="sm" variant={StatusRules.getTransferStatusVariant(selectedGrouped.status)}>
                            <Icon name="lock" /> {selectedGrouped.isSet ? 'Sealed gauges require' : 'Sealed gauge requires'} approval to unseal
                          </Badge>
                        </div>
                      ) : (
                        <div style={{ marginTop: 'var(--space-4)' }}>
                          <p style={{
                            margin: 'var(--space-2) 0',
                            color: 'var(--color-success)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-1)'
                          }}>
                            <Icon name="check-circle" /> Approved
                          </p>
                          <p style={{
                            margin: 'var(--space-2) 0',
                            color: 'var(--color-warning)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-1)'
                          }}>
                            <Icon name="exclamation-triangle" /> Awaiting physical unseal
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: 'var(--space-3)',
                    justifyContent: 'flex-end'
                  }}>
                    {StatusRules.isTransferPending({ status: selectedGrouped.status }) ? (
                      <>
                        <Button
                          variant="primary"
                          onClick={() => handleApprove(selectedGrouped)}
                          disabled={approveMutation.isPending || approveSetMutation.isPending}
                          icon={<Icon name="check" />}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => handleDeny(selectedGrouped)}
                          disabled={denyMutation.isPending || denySetMutation.isPending}
                          icon={<Icon name="times" />}
                        >
                          Deny
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => handleConfirmUnseal(selectedGrouped)}
                        disabled={confirmUnseal.isPending}
                        icon={<Icon name="unlock" />}
                      >
                        Confirm Unsealed
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>

        <Modal.Actions>
          <Button variant="outline" onClick={onClose} icon={<Icon name="times" />}>
            Close
          </Button>
        </Modal.Actions>
      </Modal>
      
      {showConfirmModal && confirmModalData.grouped && (
        <UnsealConfirmModal
          isOpen={showConfirmModal}
          request={confirmModalData.grouped.requests[0]}
          type={confirmModalData.type}
          onConfirm={handleModalConfirm}
          onCancel={() => {
            setShowConfirmModal(false);
            setConfirmModalData({ grouped: null, type: 'approve' });
          }}
        />
      )}
    </>
  );
}