// Generic Reject Modal - for any rejection workflow
// For Claude: Example of using centralized components instead of raw HTML elements
// Use Modal: instead of window.confirm(), Button instead of <button>, Form components instead of raw inputs
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { FormTextarea } from './FormTextarea';
import { FormSelect } from './FormSelect';
import { TooltipToggle } from './TooltipToggle';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: (reason: string, notes?: string) => void | Promise<void>;
  title?: string;
  itemDescription?: string;
  reasons?: string[];
  loading?: boolean;
}

export const RejectModal = ({ 
  isOpen, 
  onClose, 
  onReject,
  title = 'Reject Item',
  itemDescription,
  reasons = [
    'Does not meet quality standards',
    'Incorrect specifications',
    'Damaged or defective',
    'Missing documentation',
    'Other'
  ],
  loading = false
}: RejectModalProps) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: Record<string, string> = {};
    
    if (!selectedReason) {
      newErrors.reason = 'Please select a rejection reason';
    }
    
    if (selectedReason === 'Other' && !notes.trim()) {
      newErrors.notes = 'Please provide details for "Other" reason';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit
    setIsSubmitting(true);
    try {
      await onReject(selectedReason, notes.trim() || undefined);
      handleClose();
    } catch (_error) {
      // Error handling is done by the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setNotes('');
    setErrors({});
    onClose();
  };

  const handleReasonChange = (value: string) => {
    setSelectedReason(value);
    setErrors({ ...errors, reason: '' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <TooltipToggle />

          {/* Item Description */}
          {itemDescription && (
            <div style={{
              background: 'var(--color-bg-secondary)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-4)'
            }}>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                margin: 0
              }}>{itemDescription}</p>
            </div>
          )}
          
          {/* Rejection Reason */}
          <FormSelect
            label={
              <>
                Rejection Reason <span style={{ color: 'var(--color-danger)' }}>*</span>
              </>
            }
            value={selectedReason}
            onChange={(e) => handleReasonChange(e.target.value)}
            error={errors.reason}
            tooltip="Select the primary reason for rejecting this item"
          >
            <option value="">Select a reason</option>
            {reasons.map(reason => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </FormSelect>
          
          {/* Additional Notes */}
          <FormTextarea
            label={
              <>
                Additional Notes {selectedReason === 'Other' && <span style={{ color: 'var(--color-danger)' }}>*</span>}
              </>
            }
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setErrors({ ...errors, notes: '' });
            }}
            placeholder={
              selectedReason === 'Other'
                ? 'Please provide specific details...'
                : 'Any additional information (optional)...'
            }
            rows={4}
            error={errors.notes}
            tooltip="Provide additional context or details about the rejection (required if 'Other' is selected)"
          />
          
          {/* Warning */}
          <div style={{
            background: 'var(--color-danger-light-bg)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            marginTop: 'var(--space-4)'
          }}>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-danger-dark)',
              margin: 0
            }}>
              This action cannot be undone. The item will be rejected and flagged for review.
            </p>
          </div>
        </Modal.Body>
        
        <Modal.Actions>
          <Button
            type="submit"
            variant="danger"
            disabled={loading || isSubmitting}
          >
            {loading || isSubmitting ? 'Rejecting...' : 'Reject'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading || isSubmitting}
          >
            Cancel
          </Button>
        </Modal.Actions>
      </form>
    </Modal>
  );
};