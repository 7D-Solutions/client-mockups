// Set Checkout Modal - Handles checkout for gauge sets (GO + NO-GO)
import { Modal, Button, FormTextarea, Icon, Tag, useToast, TooltipToggle, Card, CardHeader, CardTitle, CardContent } from '../../../infrastructure/components';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../infrastructure/api/client';
import { gaugeService } from '../services/gaugeService';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import type { Gauge } from '../types';

interface SetCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: string;
}

export const SetCheckoutModal = ({ isOpen, onClose, setId }: SetCheckoutModalProps) => {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [goGauge, setGoGauge] = useState<Gauge | null>(null);
  const [nogoGauge, setNogoGauge] = useState<Gauge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
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

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!goGauge) throw new Error('GO gauge not found');
      // Backend will automatically checkout both gauges in the set
      const response = await apiClient.post(`/gauges/tracking/${goGauge.gauge_id}/checkout`, {
        notes
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-gauges'] });
      toast.success('Set checked out successfully');
      onClose();
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.error || 'Failed to checkout set';
      setError(errorMessage);
      toast.error('Checkout failed', errorMessage);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkoutMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Checkout Gauge Set">
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <TooltipToggle />

          {isLoading ? (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
              Loading set information...
            </div>
          ) : (
            <>
              <Card style={{ marginBottom: 'var(--space-4)' }}>
                <CardHeader>
                  <CardTitle>Set Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span><strong>Set ID:</strong></span>
                    <span>{setId}</span>
                  </div>

                  {goGauge && (
                    <div style={{
                      marginTop: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      backgroundColor: 'white',
                      border: '2px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <span style={{ fontWeight: '600', fontSize: 'var(--font-size-base)' }}>GO Gauge:</span>
                        <Tag size="sm" variant="success">GO</Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>ID:</span>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>{goGauge.gauge_id}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Name:</span>
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{goGauge.name}</span>
                      </div>
                      {StatusRules.isSealed(goGauge) && (
                        <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <Icon name="lock" />
                          <span style={{ color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>Sealed</span>
                        </div>
                      )}
                    </div>
                  )}

                  {nogoGauge && (
                    <div style={{
                      marginTop: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      backgroundColor: 'white',
                      border: '2px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-md)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <span style={{ fontWeight: '600', fontSize: 'var(--font-size-base)' }}>NO-GO Gauge:</span>
                        <Tag size="sm" variant="danger">NO-GO</Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>ID:</span>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>{nogoGauge.gauge_id}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Name:</span>
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{nogoGauge.name}</span>
                      </div>
                      {StatusRules.isSealed(nogoGauge) && (
                        <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <Icon name="lock" />
                          <span style={{ color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>Sealed</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <FormTextarea
                  label="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes for this checkout..."
                  rows={3}
                  tooltip="Add optional notes about the intended use or checkout details for both gauges in this set"
                />
              </div>

              {error && (
                <Card style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-danger)' }}>
                  <CardContent>
                    <p style={{ margin: 0, display: 'flex', alignItems: 'center', color: 'var(--color-danger)' }}>
                      <Icon name="exclamation-triangle" style={{ marginRight: 'var(--space-2)' }} />
                      {error}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Actions>
          <Button
            type="submit"
            variant="primary"
            disabled={checkoutMutation.isPending || isLoading}
          >
            {checkoutMutation.isPending ? 'Checking out...' : 'Checkout Set'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </Modal.Actions>
      </form>
    </Modal>
  );
};
