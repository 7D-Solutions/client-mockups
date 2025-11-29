// Set Details Page - Phase 1 & 2 implementation
// Shows unified view of a gauge set (GO + NO GO pair)
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { gaugeService } from '../services/gaugeService';
import { LoadingSpinner, Button, Icon, useToast } from '../../../infrastructure/components';
import { UnpairSetModal } from '../components/UnpairSetModal';
import { ReplaceGaugeModal } from '../components/ReplaceGaugeModal';
import { GaugeModalManager, SetDetail } from '../components';
import { logger } from '../../../infrastructure/utils/logger';
import type { Gauge } from '../types';

export function SetDetailsPage() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [goGauge, setGoGauge] = useState<Gauge | null>(null);
  const [nogoGauge, setNogoGauge] = useState<Gauge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Phase 2: Modal state management
  const [showSetDetailModal, setShowSetDetailModal] = useState(true);
  const [showUnpairModal, setShowUnpairModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceGaugeType, setReplaceGaugeType] = useState<'GO' | 'NOGO' | null>(null);

  // Gauge detail modal state
  const [selectedGauge, setSelectedGauge] = useState<Gauge | null>(null);
  const [modalType, setModalType] = useState<string | null>(null);

  // Set operation handlers
  const handleSetCheckout = async () => {
    if (!goGauge) return;

    try {
      // Checkout the set by calling the API with the GO gauge
      // Backend will automatically checkout both gauges in the set
      await gaugeService.checkout(goGauge.gauge_id, {});
      toast.success('Set checked out successfully');
      await refetchSet();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to checkout set';
      toast.error('Checkout failed', errorMessage);
    }
  };

  const handleSetCheckin = () => {
    // Use GO gauge as representative for set checkin
    setSelectedGauge(goGauge);
    setModalType('return');
    setShowSetDetailModal(false);
  };

  const handleSetTransfer = () => {
    // Use GO gauge as representative for set transfer
    setSelectedGauge(goGauge);
    setModalType('transfer');
    setShowSetDetailModal(false);
  };

  // Fetch both gauges on mount
  useEffect(() => {
    const fetchSet = async () => {
      if (!setId) {
        setError('No set ID provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch set data with both gauges from the sets API
        const setData = await gaugeService.getSetById(setId);
        setGoGauge(setData.goGauge);
        setNogoGauge(setData.nogoGauge);
      } catch (err) {
        logger.error('Failed to fetch set', err);
        setError('Failed to load gauge set');
        toast.error('Failed to load gauge set', 'Please try again');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]); // Removed toast from dependencies - it's stable and doesn't need to be tracked

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !goGauge || !nogoGauge) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 'var(--space-4)' }}>
        <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-lg)' }}>
          {error || 'Set not found'}
        </p>
        <Button onClick={() => navigate(-1)} variant="primary">
          <Icon name="arrow-left" /> Back
        </Button>
      </div>
    );
  }

  // Modal close handler
  const handleCloseModal = () => {
    setSelectedGauge(null);
    setModalType(null);
    // Re-show the set detail modal when gauge detail closes
    setShowSetDetailModal(true);
  };

  // Handle full close (X button) - close all modals and navigate to gauges list
  const handleFullClose = () => {
    setShowSetDetailModal(false);
    setSelectedGauge(null);
    setModalType(null);
    // Navigate back to gauges list
    navigate('/gauges', { replace: true, state: {} });
  };

  // Handle gauge click from set detail
  const handleGaugeClick = (gauge: Gauge) => {
    setShowSetDetailModal(false);
    setSelectedGauge(gauge);
    setModalType('details');
  };

  // Refetch set data
  const refetchSet = async () => {
    if (!setId) return;
    try {
      const setData = await gaugeService.getSetById(setId);
      setGoGauge(setData.goGauge);
      setNogoGauge(setData.nogoGauge);
    } catch (err) {
      logger.error('Failed to refetch set', err);
    }
  };

  return (
    <>
      {/* Set Detail Modal */}
      <SetDetail
        isOpen={showSetDetailModal}
        onClose={() => {
          setShowSetDetailModal(false);
          navigate('/gauges');
        }}
        goGauge={goGauge}
        nogoGauge={nogoGauge}
        setId={setId!}
        onReplaceGauge={(gaugeType) => {
          setReplaceGaugeType(gaugeType);
          setShowSetDetailModal(false);
          setShowReplaceModal(true);
        }}
        onUnpairSet={() => {
          setShowSetDetailModal(false);
          setShowUnpairModal(true);
        }}
        onGaugeClick={handleGaugeClick}
        onCheckout={handleSetCheckout}
        onCheckin={handleSetCheckin}
        onTransfer={handleSetTransfer}
      />

      {/* Phase 2: Action Modals */}
      <UnpairSetModal
        isOpen={showUnpairModal}
        setId={setId!}
        gaugeId={parseInt(goGauge?.id || '0', 10)}
        onClose={() => {
          setShowUnpairModal(false);
          setShowSetDetailModal(true);
        }}
        onSuccess={() => navigate('/gauges')}
      />

      {replaceGaugeType && (
        <ReplaceGaugeModal
          isOpen={showReplaceModal}
          setId={setId!}
          gaugeType={replaceGaugeType}
          currentGauge={replaceGaugeType === 'GO' ? goGauge! : nogoGauge!}
          onClose={() => {
            setShowReplaceModal(false);
            setReplaceGaugeType(null);
            setShowSetDetailModal(true);
          }}
          onSuccess={() => window.location.reload()}
        />
      )}

      {/* Gauge Detail Modal */}
      <GaugeModalManager
        selectedGauge={selectedGauge}
        modalType={modalType}
        onClose={handleCloseModal}
        onFullClose={handleFullClose}
        onRefetch={refetchSet}
        onModalTypeChange={setModalType}
      />
    </>
  );
}
