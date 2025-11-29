// For Claude: Use Modal instead of window.confirm() or window.alert()
// Use Button instead of raw <button> elements
// Use Form components instead of raw <input>, <select>, <textarea>
// This ensures consistent UX, accessibility, and centralized functionality
import { Modal, Button, FormSelect, FormTextarea, FormCheckbox, Alert, InfoCard, SectionHeader, TooltipToggle } from '../../../infrastructure/components';
import { useState, useEffect } from 'react';
import { useAuth, useImmediateModal } from '../../../infrastructure';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { useGaugeOperations } from '../hooks/useGaugeOperations';
import type { Gauge } from '../types';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  gauge: Gauge;
}

export const CheckinModal = ({ isOpen, onClose, gauge }: CheckinModalProps) => {
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCrossUserWarning, setShowCrossUserWarning] = useState(false);
  const [crossUserAcknowledged, setCrossUserAcknowledged] = useState(false);
  const [crossUserData, setCrossUserData] = useState<{ checkedOutTo?: string } | null>(null);
  const { user } = useAuth();
  const { return: returnMutation } = useGaugeOperations();
  const { handleSuccess } = useImmediateModal({ onClose });

  // Check if this is a cross-user return on modal open
  useEffect(() => {
    if (isOpen && gauge && user) {
      // Only check for cross-user if gauge is checked out
      if (StatusRules.isCheckedOut(gauge) && gauge.checked_out_to) {
        // Convert IDs to strings for consistent comparison
        const currentUserId = String(user.id);
        const checkedOutToUserId = String(gauge.checked_out_to);

        // Check if gauge is checked out by someone else
        if (checkedOutToUserId !== currentUserId) {
          // Use assigned_to_user_name from the API
          const userName = gauge.assigned_to_user_name || 'another user';
          setShowCrossUserWarning(true);
          setCrossUserData({ checkedOutTo: userName });
          setCrossUserAcknowledged(false); // Reset checkbox when warning shows
        } else {
          // Reset warning if it's not a cross-user return
          setShowCrossUserWarning(false);
          setCrossUserData(null);
          setCrossUserAcknowledged(false);
        }
      } else {
        // Reset warning if gauge is not checked out
        setShowCrossUserWarning(false);
        setCrossUserData(null);
        setCrossUserAcknowledged(false);
      }
    }
  }, [isOpen, gauge, user]);

  const handleClose = () => {
    // Reset state when closing
    setCondition('good');
    setNotes('');
    setError(null);
    setShowCrossUserWarning(false);
    setCrossUserAcknowledged(false);
    setCrossUserData(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If cross-user warning is showing, ensure checkbox is checked
    if (showCrossUserWarning && !crossUserAcknowledged) {
      setError('Please acknowledge the cross-user return by checking the box');
      return;
    }
    
    try {
      await returnMutation.mutateAsync({
        gaugeId: gauge.gauge_id,
        data: {
          condition_at_return: condition,
          return_notes: notes,
          returned_to_storage_location: gauge.storage_location || '',
          cross_user_acknowledged: crossUserAcknowledged
        }
      });
      handleSuccess(); // Use centralized modal success handling
    } catch (err: any) {
      // Check if this is a cross-user return that needs acknowledgment
      if (err.status === 400 && (err.data?.requiresAcknowledgment || err.message?.includes('Cross-user return'))) {
        // Extract the username from the error data or gauge data
        const checkedOutTo = err.data?.checkedOutTo || 
                            gauge.assigned_to_user_name || 
                            'another user';
        
        setShowCrossUserWarning(true);
        setCrossUserData({ checkedOutTo });
        setCrossUserAcknowledged(false);
        setError(null);
        return;
      }
      
      // Better error extraction
      const errorMessage = err.response?.data?.error || 
                         err.response?.data?.message || 
                         err.data?.error || 
                         err.message || 
                         'Failed to checkin gauge';
      console.error('Check-in error:', err.response?.data || err);
      setError(errorMessage);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Check In Gauge">
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <TooltipToggle />

          <InfoCard marginBottom="var(--space-4)" padding="var(--space-4)">
            <SectionHeader size="sm">Gauge Information</SectionHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span><strong>Gauge Name:</strong></span>
              <span>{gauge.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span><strong>Type:</strong></span>
              <span>{EquipmentRules.getDisplayName(gauge)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>Gauge ID:</strong></span>
              <span>{gauge.gauge_id}</span>
            </div>
          </InfoCard>

          {showCrossUserWarning && (
            <InfoCard variant="warning" marginBottom="var(--space-4)" padding="var(--space-4)">
              <SectionHeader size="sm" icon="exclamation-triangle">
                Cross-User Return Warning
              </SectionHeader>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  You are returning a gauge that was checked out by <strong>{crossUserData?.checkedOutTo}</strong>.
                </div>
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  Please confirm that you have authorization to return this gauge on their behalf.
                </div>
                <FormCheckbox
                  label={`I acknowledge that I am returning this gauge on behalf of ${crossUserData?.checkedOutTo}`}
                  checked={crossUserAcknowledged}
                  onChange={(checked) => setCrossUserAcknowledged(checked)}
                  tooltip="Confirm you have authorization to return this gauge on behalf of another user"
                />
              </div>
            </InfoCard>
          )}

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <FormSelect
              label="Condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              required
              tooltip="Select the current physical condition of the gauge upon return"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="damaged">Damaged</option>
            </FormSelect>
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <FormTextarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the gauge condition..."
              rows={3}
              tooltip="Add any additional observations about the gauge condition or issues encountered during use"
            />
          </div>

          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}
        </Modal.Body>

        <Modal.Actions>
          <Button 
            type="submit" 
            variant={showCrossUserWarning ? "warning" : "primary"}
            disabled={returnMutation.isPending || (showCrossUserWarning && !crossUserAcknowledged)}
          >
            {returnMutation.isPending ? 'Checking in...' : showCrossUserWarning ? 'Yes, Return on Their Behalf' : 'Check In'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </Modal.Actions>
      </form>
    </Modal>
  );
};