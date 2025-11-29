import { useState, useEffect, useCallback } from 'react';
import { DetailModal, Button, Icon, FormInput, FormSelect, LoadingSpinner, CloseButton } from '../../../infrastructure/components';
import { gaugeService } from '../services/gaugeService';
import { useToast } from '../../../infrastructure';
import { apiClient } from '../../../infrastructure/api/client';
import { logger } from '../../../infrastructure/utils/logger';
import type { Gauge } from '../types';

interface StorageLocation {
  id: number;
  location_code: string;
  description?: string;
  location_type: string;
  is_active: boolean;
}

interface SparePairingInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sourceGauge?: Gauge; // The gauge that was clicked to pair
}

/**
 * SparePairingInterface Component
 * Provides UI for pairing spare thread gauges into sets
 *
 * Two modes:
 * 1. WITH sourceGauge: Auto-filters to show only compatible spares for pairing with the source gauge
 * 2. WITHOUT sourceGauge: Manual filtering mode for general spare pairing
 */
export function SparePairingInterface({
  isOpen,
  onClose,
  onSuccess,
  sourceGauge
}: SparePairingInterfaceProps) {
  const toast = useToast();

  // Filter state - auto-populated from sourceGauge if provided
  const [threadSize, setThreadSize] = useState('');
  const [threadClass, setThreadClass] = useState('');
  const [gaugeType, setGaugeType] = useState('');

  // Available spares
  const [spares, setSpares] = useState<Gauge[]>([]);
  const [loadingSpares, setLoadingSpares] = useState(false);

  // Storage locations
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Selection state
  const [selectedGoSerial, setSelectedGoSerial] = useState('');
  const [selectedNoGoSerial, setSelectedNoGoSerial] = useState('');
  const [storageLocation, setStorageLocation] = useState('');

  // Operation state
  const [isPairing, setIsPairing] = useState(false);

  // Auto-populate filters from sourceGauge when modal opens
  useEffect(() => {
    if (isOpen && sourceGauge) {
      logger.debug('🔍 Source gauge data:', {
        gauge_id: sourceGauge.gauge_id,
        is_go_gauge: sourceGauge.is_go_gauge,
        thread_size: sourceGauge.thread_size,
        thread_class: sourceGauge.thread_class
      });

      setThreadSize(sourceGauge.thread_size || '');
      setThreadClass(sourceGauge.thread_class || '');

      // Search for the OPPOSITE gauge type to find compatible pairs
      // If source is GO (is_go_gauge=true), search for NO-GO (is_go_gauge=false), and vice versa
      const oppositeIsGoGauge = !sourceGauge.is_go_gauge;

      logger.debug('🔄 Type conversion:', {
        source_is_go_gauge: sourceGauge.is_go_gauge,
        search_is_go_gauge: oppositeIsGoGauge,
        willSearchFor: oppositeIsGoGauge ? 'GO' : 'NO-GO'
      });

      // Store as string for UI display
      setGaugeType(oppositeIsGoGauge ? 'GO' : 'NO-GO');

      // Pre-select the source gauge as GO or NO-GO based on is_go_gauge
      // Use serial_number if available, otherwise use gauge_id
      const sourceIdentifier = sourceGauge.serial_number || sourceGauge.gauge_id || '';
      if (sourceGauge.is_go_gauge) {
        setSelectedGoSerial(sourceIdentifier);
      } else {
        setSelectedNoGoSerial(sourceIdentifier);
      }
    }
  }, [isOpen, sourceGauge]);

  const loadStorageLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const response = await apiClient.get('/storage-locations');
      setStorageLocations(response.data || []);
    } catch (error: any) {
      console.error('Failed to load storage locations', error);
      toast.error('Failed to load storage locations', error.message || 'Please try again');
      setStorageLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSpares = useCallback(async () => {
    setLoadingSpares(true);
    try {
      const filters: any = {};
      if (threadSize) filters.thread_size = threadSize;
      if (threadClass) filters.thread_class = threadClass;

      // Convert gaugeType string ('GO' or 'NO-GO') to is_go_gauge boolean
      if (gaugeType) {
        filters.is_go_gauge = gaugeType === 'GO';
      }

      // Add gauge_type filter if source gauge has it (plug/ring)
      if (sourceGauge?.gauge_type) {
        filters.gauge_type = sourceGauge.gauge_type;
      }

      const response = await gaugeService.getSpareThreadGauges(filters);
      setSpares(response.data || []);
    } catch (error: any) {
      console.error('Failed to load spare gauges', error);
      toast.error('Failed to load spare gauges', error.message || 'Please try again');
      setSpares([]);
    } finally {
      setLoadingSpares(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadSize, threadClass, gaugeType, sourceGauge]);

  // Load storage locations when modal opens
  useEffect(() => {
    if (isOpen) {
      loadStorageLocations();
    }
  }, [isOpen, loadStorageLocations]);

  // Load spares when filters change
  useEffect(() => {
    if (isOpen) {
      loadSpares();
    }
  }, [isOpen, loadSpares]);

  const handlePairSpares = async () => {
    if (!selectedGoSerial || !selectedNoGoSerial) {
      toast.error('Validation Error', 'Please select both GO and NO GO gauges');
      return;
    }

    if (selectedGoSerial === selectedNoGoSerial) {
      toast.error('Validation Error', 'GO and NO GO gauges must be different');
      return;
    }

    if (!storageLocation || storageLocation.trim() === '') {
      toast.error('Validation Error', 'Storage location is required');
      return;
    }

    setIsPairing(true);
    try {
      // Find the selected gauges from the spares array
      const goGauge = spares.find(s =>
        (s.serial_number === selectedGoSerial || s.gauge_id === selectedGoSerial)
      );
      const noGoGauge = spares.find(s =>
        (s.serial_number === selectedNoGoSerial || s.gauge_id === selectedNoGoSerial)
      );

      // Also check if sourceGauge matches either selection
      const finalGoGauge = goGauge || (sourceGauge?.is_go_gauge &&
        (sourceGauge.serial_number === selectedGoSerial || sourceGauge.gauge_id === selectedGoSerial)
        ? sourceGauge : null);
      const finalNoGoGauge = noGoGauge || (!sourceGauge?.is_go_gauge &&
        (sourceGauge.serial_number === selectedNoGoSerial || sourceGauge.gauge_id === selectedNoGoSerial)
        ? sourceGauge : null);

      if (!finalGoGauge || !finalNoGoGauge) {
        toast.error('Error', 'Could not find selected gauges');
        return;
      }

      if (!finalGoGauge.id || !finalNoGoGauge.id) {
        toast.error('Error', 'Selected gauges do not have valid IDs');
        return;
      }

      const result = await gaugeService.pairSpares(
        finalGoGauge.id,
        finalNoGoGauge.id,
        storageLocation.trim()
      );

      toast.success('Success', `Set ${result.data.baseId} created successfully`);

      // Reset form
      setSelectedGoSerial('');
      setSelectedNoGoSerial('');
      setStorageLocation('');

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to pair spares', error);
      toast.error('Pairing Failed', error.message || 'Failed to pair gauges');
    } finally {
      setIsPairing(false);
    }
  };

  const handleClose = () => {
    // Reset form on close
    setThreadSize('');
    setThreadClass('');
    setGaugeType('');
    setSelectedGoSerial('');
    setSelectedNoGoSerial('');
    setStorageLocation('');
    onClose();
  };

  // Filter spares to exclude already selected gauges from opposite dropdown
  // Use serial_number if available, otherwise fall back to gauge_id
  const goGaugeOptions = spares
    .filter(spare => spare.serial_number !== selectedNoGoSerial && spare.gauge_id !== selectedNoGoSerial)
    .map(spare => {
      const identifier = spare.serial_number || spare.gauge_id;
      const displayLabel = spare.serial_number
        ? `S/N ${spare.serial_number}`
        : spare.gauge_id;

      return {
        value: identifier,
        label: `${displayLabel}${spare.thread_size ? ` - ${spare.thread_size}` : ''}${spare.thread_class ? ` ${spare.thread_class}` : ''}`
      };
    });

  const noGoGaugeOptions = spares
    .filter(spare => spare.serial_number !== selectedGoSerial && spare.gauge_id !== selectedGoSerial)
    .map(spare => {
      const identifier = spare.serial_number || spare.gauge_id;
      const displayLabel = spare.serial_number
        ? `S/N ${spare.serial_number}`
        : spare.gauge_id;

      return {
        value: identifier,
        label: `${displayLabel}${spare.thread_size ? ` - ${spare.thread_size}` : ''}${spare.thread_class ? ` ${spare.thread_class}` : ''}`
      };
    });

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Pair Spare Thread Gauges"
      size="lg"
      actionButtons={
        <>
          <Button
            variant="default"
            onClick={handleClose}
            disabled={isPairing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePairSpares}
            disabled={!selectedGoSerial || !selectedNoGoSerial || isPairing || loadingSpares}
            icon={<Icon name="link" />}
          >
            {isPairing ? 'Pairing...' : 'Pair Gauges'}
          </Button>
        </>
      }
    >
      <DetailModal.Body padding={false}>
        <div style={{ padding: 'var(--space-4)', overflowY: 'auto', height: '100%' }}>
        {/* Show source gauge specs as read-only if provided, otherwise show filters */}
        {sourceGauge ? (
          <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-gray-700)' }}>
              Finding compatible {gaugeType} gauges for: {sourceGauge.gauge_id}
            </h4>
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
              <span><strong>Thread Size:</strong> {threadSize || 'N/A'}</span>
              <span><strong>Thread Class:</strong> {threadClass || 'N/A'}</span>
              <span><strong>Source Gauge Type:</strong> {sourceGauge.gauge_type?.toUpperCase() || 'N/A'}</span>
              <span><strong>Searching For:</strong> {gaugeType?.toUpperCase() || 'N/A'}</span>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--color-gray-900)' }}>
              Filter Available Spares
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
              <FormInput
                label="Thread Size"
                value={threadSize}
                onChange={(e) => setThreadSize(e.target.value)}
                placeholder="e.g., 1/4-20"
              />
              <FormInput
                label="Thread Class"
                value={threadClass}
                onChange={(e) => setThreadClass(e.target.value)}
                placeholder="e.g., 2A, 3A"
              />
              <FormSelect
                label="Gauge Type"
                value={gaugeType}
                onChange={(e) => setGaugeType(e.target.value)}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'plug', label: 'Plug' },
                  { value: 'ring', label: 'Ring' }
                ]}
              />
            </div>
          </div>
        )}

        {/* Available Spares Count */}
        <div style={{
          padding: 'var(--space-2)',
          backgroundColor: 'var(--color-gray-50)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }}>
          <Icon name="info-circle" style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-700)' }}>
            {loadingSpares ? 'Loading...' : `${spares.length} available spare${spares.length !== 1 ? 's' : ''} found`}
          </span>
        </div>

        {loadingSpares ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
            <LoadingSpinner />
          </div>
        ) : spares.length === 0 ? (
          <div style={{
            padding: 'var(--space-6)',
            textAlign: 'center',
            color: 'var(--color-gray-500)',
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-md)'
          }}>
            <Icon name="search" style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }} />
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
              No spare thread gauges found. Adjust filters to find matching gauges.
            </p>
          </div>
        ) : (
          <>
            {/* Gauge Selection */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--color-gray-900)' }}>
                {sourceGauge ? `Select ${gaugeType} Gauge to Pair` : 'Select Gauges to Pair'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: sourceGauge ? '1fr' : '1fr 1fr', gap: 'var(--space-3)' }}>
                {/* Only show GO gauge dropdown if NO source gauge OR source is NO-GO */}
                {(!sourceGauge || !sourceGauge.is_go_gauge) && (
                  <FormSelect
                    label="GO Gauge (A)"
                    value={selectedGoSerial}
                    onChange={(e) => setSelectedGoSerial(e.target.value)}
                    options={[
                      { value: '', label: 'Select GO gauge...' },
                      ...goGaugeOptions
                    ]}
                    required
                  />
                )}
                {/* Only show NO-GO gauge dropdown if NO source gauge OR source is GO */}
                {(!sourceGauge || sourceGauge.is_go_gauge) && (
                  <FormSelect
                    label="NO GO Gauge (B)"
                    value={selectedNoGoSerial}
                    onChange={(e) => setSelectedNoGoSerial(e.target.value)}
                    options={[
                      { value: '', label: 'Select NO GO gauge...' },
                      ...noGoGaugeOptions
                    ]}
                    required
                  />
                )}
              </div>
            </div>

            {/* Storage Location */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: 'var(--font-size-md)', fontWeight: '600', color: 'var(--color-gray-900)' }}>
                Set Information
              </h4>
              <FormSelect
                label="Storage Location"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                options={[
                  { value: '', label: loadingLocations ? 'Loading locations...' : 'Select storage location...' },
                  ...storageLocations.map(loc => ({
                    value: loc.location_code,
                    label: loc.description ? `${loc.location_code} - ${loc.description}` : loc.location_code
                  }))
                ]}
                required
                disabled={loadingLocations}
              />
            </div>

            {/* Preview */}
            {selectedGoSerial && selectedNoGoSerial && (
              <div style={{
                padding: 'var(--space-3)',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <Icon name="check-circle" style={{ color: 'var(--color-success)' }} />
                  <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success)' }}>
                    Ready to Pair
                  </strong>
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-700)' }}>
                  <div>GO Gauge: S/N {selectedGoSerial}</div>
                  <div>NO GO Gauge: S/N {selectedNoGoSerial}</div>
                  {storageLocation && <div>Location: {storageLocation}</div>}
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </DetailModal.Body>
    </DetailModal>
  );
}
