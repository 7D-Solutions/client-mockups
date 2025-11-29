// Review Modal - for QC approval workflow
// For Claude: Use Modal instead of window.confirm() or window.alert()
// Use Button instead of raw <button> elements
// Use FormTextarea instead of raw <textarea>
// Use apiClient instead of direct fetch() calls
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../infrastructure/api/client';
import { Modal, Button, FormTextarea, useToast, TooltipToggle } from '../../../infrastructure/components';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { TextFormatRules } from '../../../infrastructure/business/textFormatRules';
import type { Gauge } from '../types';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  gauge: Gauge;
}

interface ReviewData {
  gauge_id: string;
  approved: boolean;
  rejection_reason?: string;
  review_notes?: string;
}

export const ReviewModal = ({ isOpen, onClose, gauge }: ReviewModalProps) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [decision, setDecision] = useState<'approve' | 'reject' | ''>('');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async (data: ReviewData) => {
      const response = await apiClient.post('/gauges/review', data);
      return response;
    },
    onSuccess: () => {
      toast.success(`Gauge ${gauge.name} ${decision === 'approve' ? 'approved' : 'rejected'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['gauges'] });
      queryClient.invalidateQueries({ queryKey: ['qc-reviews'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit review');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: Record<string, string> = {};
    
    if (!decision) {
      newErrors.decision = 'Please select a decision';
    }
    
    if (decision === 'reject' && !rejectionReason.trim()) {
      newErrors.rejectionReason = 'Please provide a reason for rejection';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit
    reviewMutation.mutate({
      gauge_id: gauge.id,
      approved: decision === 'approve',
      rejection_reason: decision === 'reject' ? rejectionReason.trim() : undefined,
      review_notes: notes.trim() || undefined
    });
  };

  const handleClose = () => {
    setDecision('');
    setNotes('');
    setRejectionReason('');
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="QC Review"
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <TooltipToggle />

          {/* Gauge Information */}
          <div style={{
            backgroundColor: 'var(--color-bg-secondary)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)'
          }}>
            <h4 style={{
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-2)',
              marginTop: 0
            }}>Gauge Details</h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'var(--space-2)',
              fontSize: 'var(--font-size-sm)'
            }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Serial Number:</span>
                <span style={{ marginLeft: 'var(--space-2)', fontWeight: 'var(--font-weight-medium)' }}>{gauge.name}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Type:</span>
                <span style={{ marginLeft: 'var(--space-2)', fontWeight: 'var(--font-weight-medium)' }}>{EquipmentRules.getDisplayName(gauge)}</span>
              </div>
              {gauge.status && (
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
                  <span style={{
                    marginLeft: 'var(--space-2)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: StatusRules.isOutOfService(gauge) ? 'var(--color-danger)' : 
                           StatusRules.isCalibrationDueStatus(gauge) ? 'var(--color-warning)' : 
                           'var(--color-success)'
                  }}>
                    {TextFormatRules.formatStatusText(gauge.status)}
                  </span>
                </div>
              )}
            </div>
            
            {gauge.notes && (
              <div style={{
                marginTop: 'var(--space-3)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--color-border-default)'
              }}>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-1)',
                  marginTop: 0
                }}>Notes:</p>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  margin: 0
                }}>{gauge.notes}</p>
              </div>
            )}
          </div>
        
          {/* Review Checklist */}
          <div style={{
            backgroundColor: 'var(--color-info-light-bg)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)'
          }}>
            <h4 style={{
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-2)',
              marginTop: 0,
              color: 'var(--color-info-dark)'
            }}>Review Checklist</h4>
            <ul style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-1)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-info)',
              margin: 0,
              padding: 0,
              listStyle: 'none'
            }}>
              <li>✓ Physical condition verified</li>
              <li>✓ Calibration status checked</li>
              <li>✓ Serial number confirmed</li>
              <li>✓ Documentation complete</li>
            </ul>
          </div>
        
          {/* Decision Selection */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-2)'
            }}>
              Review Decision <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)'
            }}>
              <div
                onClick={() => {
                  setDecision('approve');
                  setErrors({ ...errors, decision: '' });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 'var(--space-4)',
                  border: `2px solid ${decision === 'approve' ? 'var(--color-primary)' : 'var(--color-border-default)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: decision === 'approve' ? 'var(--color-primary-light-bg)' : 'transparent'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${decision === 'approve' ? 'var(--color-primary)' : 'var(--color-border-default)'}`,
                  marginRight: 'var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--color-bg-primary)'
                }}>
                  {decision === 'approve' && (
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary)'
                    }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-success)',
                    margin: 0
                  }}>Approve</span>
                  <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    margin: 0
                  }}>Gauge meets all quality standards</p>
                </div>
              </div>
              
              <div
                onClick={() => {
                  setDecision('reject');
                  setErrors({ ...errors, decision: '' });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 'var(--space-4)',
                  border: `2px solid ${decision === 'reject' ? 'var(--color-primary)' : 'var(--color-border-default)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: decision === 'reject' ? 'var(--color-primary-light-bg)' : 'transparent'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${decision === 'reject' ? 'var(--color-primary)' : 'var(--color-border-default)'}`,
                  marginRight: 'var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--color-bg-primary)'
                }}>
                  {decision === 'reject' && (
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary)'
                    }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-danger)',
                    margin: 0
                  }}>Reject</span>
                  <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    margin: 0
                  }}>Gauge does not meet quality standards</p>
                </div>
              </div>
            </div>
            {errors.decision && (
              <p style={{
                color: 'var(--color-danger)',
                fontSize: 'var(--font-size-sm)',
                marginTop: 'var(--space-1)',
                marginBottom: 0
              }}>{errors.decision}</p>
            )}
          </div>
        
          {/* Rejection Reason (conditional) */}
          {decision === 'reject' && (
            <FormTextarea
              label={<>Rejection Reason <span style={{ color: 'var(--color-danger)' }}>*</span></>}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setErrors({ ...errors, rejectionReason: '' });
              }}
              placeholder="Please describe why this gauge is being rejected..."
              rows={3}
              error={errors.rejectionReason}
              tooltip="Provide a detailed reason for rejecting this gauge (e.g., calibration issues, physical damage, documentation incomplete)"
            />
          )}
        
          {/* Review Notes (optional) */}
          <FormTextarea
            label="Additional Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional comments about this review..."
            rows={3}
            tooltip="Add any additional observations, recommendations, or comments related to this QC review"
          />
        
          {/* Warning/Info based on decision */}
          {decision && (
            <div style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: decision === 'approve' ? 'var(--color-success-light-bg)' : 'var(--color-danger-light-bg)',
              color: decision === 'approve' ? 'var(--color-success-dark)' : 'var(--color-danger-dark)',
              marginTop: 'var(--space-4)'
            }}>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                margin: 0
              }}>
                {decision === 'approve' 
                  ? 'This gauge will be marked as approved and returned to available inventory.'
                  : 'This gauge will be flagged for further action based on the rejection reason.'}
              </p>
            </div>
          )}
        
        </Modal.Body>
        
        <Modal.Actions>
          <Button
            type="submit"
            disabled={reviewMutation.isPending || !decision}
            variant={decision === 'reject' ? 'danger' : 'default'}
          >
            {reviewMutation.isPending 
              ? 'Submitting...' 
              : decision === 'approve' 
                ? 'Approve Gauge' 
                : decision === 'reject' 
                  ? 'Reject Gauge' 
                  : 'Submit Review'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={reviewMutation.isPending}
          >
            Cancel
          </Button>
        </Modal.Actions>
      </form>
    </Modal>
  );
};