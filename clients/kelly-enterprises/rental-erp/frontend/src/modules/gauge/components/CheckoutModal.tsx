// For Claude: Use Modal instead of window.confirm() or window.alert()
// Use Button instead of raw <button> elements
// Use Form components instead of raw <input>, <textarea>
// Use apiClient instead of direct fetch() calls
import { Modal, Button, FormTextarea, Icon, TooltipToggle, Card, CardHeader, CardTitle, CardContent } from '../../../infrastructure/components';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../infrastructure/api/client';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import type { Gauge } from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  gauge: Gauge;
}

export const CheckoutModal = ({ isOpen, onClose, gauge }: CheckoutModalProps) => {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/gauges/${gauge.id}/checkout`, {
        notes
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-gauges'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to checkout gauge');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkoutMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Checkout Gauge">
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <TooltipToggle />

          <Card style={{ marginBottom: 'var(--space-4)' }}>
            <CardHeader>
              <CardTitle>Gauge Information</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <FormTextarea
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this checkout..."
              rows={3}
              tooltip="Add any notes about the intended use or expected duration of checkout"
            />
          </div>

          {error && (
            <Card style={{ marginBottom: 'var(--space-4)' }}>
              <CardContent>
                <p style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                  <Icon name="exclamation-triangle" style={{ marginRight: 'var(--space-2)' }} />
                  {error}
                </p>
              </CardContent>
            </Card>
          )}
        </Modal.Body>

        <Modal.Actions>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={checkoutMutation.isPending}
          >
            {checkoutMutation.isPending ? 'Checking out...' : 'Checkout'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </Modal.Actions>
      </form>
    </Modal>
  );
};