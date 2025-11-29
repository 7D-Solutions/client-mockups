// ReplaceGaugeModal - Phase 2 implementation
// Modal for replacing a gauge in a set with a compatible spare
import { useState, useEffect } from 'react';
import { gaugeService } from '../services/gaugeService';
import {
  Modal,
  ConfirmButton,
  CancelButton,
  LoadingSpinner,
  Icon,
  useToast
} from '../../../infrastructure/components';
import { logger } from '../../../infrastructure/utils/logger';
import type { Gauge } from '../types';

interface ReplaceGaugeModalProps {
  isOpen: boolean;
  setId: string;
  gaugeType: 'GO' | 'NOGO';
  currentGauge: Gauge;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReplaceGaugeModal({
  isOpen,
  _setId,
  gaugeType,
  currentGauge,
  onClose,
  onSuccess
}: ReplaceGaugeModalProps) {
  const [compatibleSpares, setCompatibleSpares] = useState<Gauge[]>([]);
  const [selectedSpare, setSelectedSpare] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  // Fetch compatible spares when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setCompatibleSpares([]);
      setSelectedSpare(null);
      return;
    }

    const fetchSpares = async () => {
      setIsLoading(true);
      try {
        const spares = await gaugeService.getSpareGauges({
          threadSize: currentGauge.thread_size,
          threadClass: currentGauge.thread_class,
          gaugeType
        });
        setCompatibleSpares(spares);
      } catch (error) {
        logger.error('Failed to fetch compatible spares:', error);
        toast.error('Failed to load spare gauges', 'Please try again');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpares();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentGauge, gaugeType]);

  const handleConfirm = async () => {
    if (!selectedSpare) return;

    setIsSubmitting(true);
    try {
      // Find the selected spare gauge for the reason
      const selectedSpareGauge = compatibleSpares.find(g => g.id === selectedSpare);
      const reason = `Replaced ${gaugeType} gauge with ${selectedSpareGauge.gauge_id}`;

      await gaugeService.replaceGauge(
        currentGauge.gauge_id,
        selectedSpareGauge!.gauge_id,
        reason
      );

      toast.success('Gauge Replaced', `${gaugeType} gauge replaced successfully`);
      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Failed to replace gauge:', error);
      toast.error('Failed to replace gauge', 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedSpare(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Replace ${gaugeType} Gauge`}>
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Current Gauge Info */}
          <div>
            <div style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-gray-600)',
              marginBottom: 'var(--space-1)'
            }}>
              Current {gaugeType} Gauge
            </div>
            <div style={{
              fontWeight: '600',
              fontSize: 'var(--font-size-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <Icon
                name={gaugeType === 'GO' ? 'check-circle' : 'times-circle'}
                style={{ color: gaugeType === 'GO' ? 'var(--color-success)' : 'var(--color-danger)' }}
              />
              {currentGauge.gauge_id}
            </div>
          </div>

          {/* Spare Selection */}
          <div>
            <div style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: '600',
              marginBottom: 'var(--space-2)',
              color: 'var(--color-gray-700)'
            }}>
              Select Replacement Gauge
            </div>

            {isLoading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '150px'
              }}>
                <LoadingSpinner size="md" />
              </div>
            ) : compatibleSpares.length === 0 ? (
              <div style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-gray-50)',
                borderRadius: 'var(--border-radius-md)',
                textAlign: 'center',
                color: 'var(--color-gray-600)'
              }}>
                <Icon name="info-circle" style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }} />
                <div>No compatible spare gauges available</div>
                <div style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
                  Thread Size: {currentGauge.thread_size} | Class: {currentGauge.thread_class} | Type: {gaugeType}
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid var(--color-gray-300)',
                borderRadius: 'var(--border-radius-md)',
                padding: 'var(--space-2)'
              }}>
                {compatibleSpares.map(spare => (
                  <div
                    key={spare.id}
                    onClick={() => setSelectedSpare(spare.id)}
                    style={{
                      padding: 'var(--space-4)',
                      border: `2px solid ${selectedSpare === spare.id ? 'var(--color-primary)' : 'var(--color-gray-300)'}`,
                      borderRadius: 'var(--border-radius-md)',
                      cursor: 'pointer',
                      backgroundColor: selectedSpare === spare.id ? 'var(--color-primary-50)' : 'white',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedSpare !== spare.id) {
                        e.currentTarget.style.borderColor = 'var(--color-gray-400)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedSpare !== spare.id) {
                        e.currentTarget.style.borderColor = 'var(--color-gray-300)';
                      }
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: 'var(--font-size-base)' }}>
                        {spare.gauge_id}
                      </div>
                      <div style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-gray-600)',
                        marginTop: 'var(--space-1)'
                      }}>
                        <Icon name="map-marker-alt" style={{ marginRight: 'var(--space-1)' }} />
                        {spare.storage_location}
                      </div>
                    </div>
                    {selectedSpare === spare.id && (
                      <Icon name="check-circle" style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-xl)' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal.Body>

      <Modal.Actions>
        <CancelButton onClick={handleClose} disabled={isSubmitting} />
        <ConfirmButton
          onClick={handleConfirm}
          disabled={!selectedSpare || isSubmitting || isLoading}
        >
          {isSubmitting ? 'Replacing...' : 'Replace Gauge'}
        </ConfirmButton>
      </Modal.Actions>
    </Modal>
  );
}
