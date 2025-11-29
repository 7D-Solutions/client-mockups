import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Modal,
  Button,
  FormTextarea,
  SearchableSelect,
  Icon,
  InfoCard,
  DetailRow,
  FormSection,
  Alert,
  useImmediateModal,
  TooltipToggle
} from '../../../infrastructure';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { useGaugeOperations } from '../hooks/useGaugeOperations';
import { apiClient } from '../../../infrastructure/api/client';
import type { Gauge } from '../types';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  gauge: Gauge;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  roles?: string[];
}

export const TransferModal = ({ isOpen, onClose, gauge }: TransferModalProps) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { transfer } = useGaugeOperations();
  const { handleSuccess } = useImmediateModal({ onClose });

  // Fetch available users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Employee[] }>('/gauges/users');
      const usersList = response.data || [];
      // Sort users alphabetically by name
      return usersList.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: isOpen
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId('');
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  // Prepare options for SearchableSelect
  const userOptions = Array.isArray(users)
    ? users.map(user => ({
        id: user.id,
        label: user.name, // Display just the name
        value: user.id,
        // But search by name, email, and role
        searchText: `${user.name} ${user.email} ${user.roles ? user.roles.join(' ') : ''}`.toLowerCase()
      }))
    : [];

  // Get selected user
  const selectedUser = Array.isArray(users) ? users.find(u => u.id === selectedUserId) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      setError('Please select a user to transfer to');
      return;
    }

    try {
      await transfer.mutateAsync({
        gaugeId: gauge.gauge_id,
        data: {
          to_user_id: selectedUserId,
          reason: notes || 'Transfer request'
        }
      });
      handleSuccess(); // Use centralized modal success handling
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to transfer gauge');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Gauge">
      <form onSubmit={handleSubmit}>
        <Modal.Body padding={true} scrollable={true}>
          <TooltipToggle />

          <FormSection title="Gauge Information">
            <InfoCard>
              <DetailRow label="Gauge Name" value={gauge.name} />
              <DetailRow label="Type" value={EquipmentRules.getDisplayName(gauge)} />
              <DetailRow label="Gauge ID" value={gauge.gauge_id} />
              {gauge.holder && (
                <DetailRow label="Current Holder" value={gauge.holder.name} />
              )}
            </InfoCard>
          </FormSection>

          <SearchableSelect
            label={<>Transfer To <span style={{ color: 'var(--color-danger)' }}>*</span></>}
            options={userOptions}
            value={selectedUserId}
            onChange={setSelectedUserId}
            placeholder="Type to search users..."
            disabled={usersLoading}
            required
            fieldSize="md"
            tooltip="Select the user who will receive the transfer request. They must accept before the gauge is assigned."
          />

          {selectedUser && (
            <InfoCard variant="warning" padding="var(--space-4)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Icon name="info-circle" />
                <div>
                  Transfer request will be sent to <strong>{selectedUser.name}</strong>. 
                  They will need to accept the transfer before the gauge is assigned to them.
                </div>
              </div>
            </InfoCard>
          )}

          <FormTextarea
            label="Transfer Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes for this transfer..."
            rows={3}
            fieldSize="md"
            tooltip="Provide context or reason for the transfer request that will be visible to the recipient"
          />

          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}
        </Modal.Body>

        <Modal.Actions>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={transfer.isPending || !selectedUserId}
          >
            {transfer.isPending ? 'Initiating Transfer...' : 'Send Transfer Request'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </Modal.Actions>
      </form>
    </Modal>
  );
};