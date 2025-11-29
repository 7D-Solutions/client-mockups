// Phase 5: Spare Inventory Page
// Two-column pairing interface for spare gauges
import React, { useState, useEffect, useMemo } from 'react';
import { gaugeService } from '../services/gaugeService';
import { usePermissions } from '../../../infrastructure/auth/usePermissions';
import { useAuth } from '../../../infrastructure/auth';
import { logger } from '../../../infrastructure/utils/logger';
import type { Gauge } from '../types';
import {
  Modal,
  Button,
  FormInput,
  ConfirmButton,
  CancelButton,
  LoadingSpinner,
  Alert,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useToast,
  Breadcrumb,
  StorageLocationSelect,
  LocationDisplay
} from '../../../infrastructure/components';
import { SetIdEditor } from '../components/creation/steps/SetIdEditor';
import styles from './SpareInventoryPage.module.css';

export const SpareInventoryPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();

  // Permission-based access check (not role-based!)
  const canManageGaugeSets = hasPermission('gauge.manage.full') || hasPermission('gauge.operate.execute');
  const [spares, setSpares] = useState<Gauge[]>([]);
  const [selectedGO, setSelectedGO] = useState<Gauge | null>(null);
  const [selectedNOGO, setSelectedNOGO] = useState<Gauge | null>(null);
  const [search, setSearch] = useState('');
  const [selectedSetId, setSelectedSetId] = useState('');
  const [location, setLocation] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  // Fetch spares on mount and when search changes (with debouncing)
  useEffect(() => {
    if (!user) {
      return; // Wait for user to load
    }

    if (!canManageGaugeSets) {
      setIsLoading(false);
      return;
    }

    // Debounce search to avoid too many API calls
    const timerId = setTimeout(() => {
      fetchSpares();
    }, 300); // 300ms debounce

    return () => clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canManageGaugeSets, search]); // Re-fetch when search changes

  const fetchSpares = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Pass search term as threadSize filter for server-side flexible search
      // Backend supports fractions (1/2), decimals (.5, .500), etc.
      const response = await gaugeService.getSpareGauges(
        search ? { threadSize: search } : undefined
      );
      setSpares(response || []);
    } catch (err: any) {
      logger.error('❌ Failed to fetch spare gauges', err);
      setError(err.message || 'Failed to load spare gauges');
    } finally {
      setIsLoading(false);
    }
  };


  // No client-side filtering needed - backend handles it with flexible format support
  const filteredSpares = spares;

  // Split into GO and NO GO based on is_go_gauge field from gauge_thread_specifications
  // is_go_gauge === 1 for GO gauges, is_go_gauge === 0 for NO GO gauges
  const goSpares = useMemo(() => {
    return filteredSpares.filter(s => s.is_go_gauge === 1 || s.is_go_gauge === true);
  }, [filteredSpares]);

  const nogoSpares = useMemo(() => {
    return filteredSpares.filter(s => s.is_go_gauge === 0 || s.is_go_gauge === false);
  }, [filteredSpares]);

  // Helper function to create a unique key for matching gauge specifications
  // Match based on thread specifications (size + class + type) for accurate pairing
  const getSpecKey = (gauge: Gauge) => {
    return `${gauge.thread_size}-${gauge.thread_class}-${gauge.thread_type}`;
  };

  // Get compatible spares when one is selected
  // Match based on thread specifications (thread_size, thread_class, thread_type)
  const compatibleNOGO = useMemo(() => {
    if (!selectedGO) return nogoSpares;

    const selectedKey = getSpecKey(selectedGO);

    return nogoSpares.filter(nogo => {
      const nogoKey = getSpecKey(nogo);
      return nogoKey === selectedKey;
    });
  }, [selectedGO, nogoSpares]);

  const compatibleGO = useMemo(() => {
    if (!selectedNOGO) return goSpares;

    const selectedKey = getSpecKey(selectedNOGO);

    return goSpares.filter(go => {
      const goKey = getSpecKey(go);
      return goKey === selectedKey;
    });
  }, [selectedNOGO, goSpares]);

  // Handle selection
  const handleSelectGO = (gauge: Gauge) => {
    if (selectedGO?.id === gauge.id) {
      setSelectedGO(null); // Deselect if clicking same gauge
    } else {
      setSelectedGO(gauge);
      // Don't clear NOGO - allow building up a pair
    }
  };

  const handleSelectNOGO = (gauge: Gauge) => {
    if (selectedNOGO?.id === gauge.id) {
      setSelectedNOGO(null); // Deselect if clicking same gauge
    } else {
      setSelectedNOGO(gauge);
      // Don't clear GO - allow building up a pair
    }
  };

  // Open location modal
  const handleOpenLocationModal = () => {
    if (!selectedGO || !selectedNOGO) return;
    setShowLocationModal(true);
  };

  // Create set
  const handleCreateSet = async () => {
    if (!selectedGO || !selectedNOGO || !location) return;

    // Validate IDs exist
    if (!selectedGO.id || !selectedNOGO.id) {
      toast.error(`Missing gauge IDs: GO=${selectedGO.id}, NOGO=${selectedNOGO.id}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await gaugeService.pairSpares(
        parseInt(selectedGO.id),
        parseInt(selectedNOGO.id),
        location,
        selectedSetId || undefined  // Pass custom setId if provided
      );

      toast.success(`Set created: ${selectedGO.gauge_id} + ${selectedNOGO.gauge_id}`);

      // Refresh spares
      await fetchSpares();

      // Clear selections and form
      setSelectedGO(null);
      setSelectedNOGO(null);
      setSelectedSetId('');
      setLocation('');
      setShowLocationModal(false);
    } catch (error: any) {
      logger.error('❌ Failed to create set - Full error:', error);
      logger.error('Error response:', error.response);
      logger.error('Error data:', error.response?.data);

      // Extract detailed error message
      const errorMsg = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'Failed to create set - unknown error';

      toast.error(`Failed to pair: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setSelectedSetId('');
      setLocation('');
      setShowLocationModal(false);
    }
  };

  // Show loading while user is being authenticated
  if (!user) {
    return (
      <div className={styles.spareInventoryPage}>
        <h1>Spare Inventory</h1>
        <LoadingSpinner />
      </div>
    );
  }

  // Permission check
  if (!canManageGaugeSets) {
    return (
      <div className={styles.spareInventoryPage}>
        <Alert variant="danger">
          <h2>Access Denied</h2>
          <p>You do not have permission to manage gauge sets. Required permission: gauge.manage.full or gauge.operate.execute</p>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.spareInventoryPage}>
        <h1>Spare Inventory</h1>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={styles.spareInventoryPage}>
      {/* ➕ Phase 7: Breadcrumb navigation */}
      <Breadcrumb
        items={[
          { label: 'Gauge Inventory', to: '/gauges' },
          { label: 'Spare Inventory' }
        ]}
      />

      <div className={styles.header}>
        <h1>Spare Inventory - Pairing Interface</h1>
        <div className={styles.headerInfo}>
          <span className={styles.totalCount}>
            {filteredSpares.length} total spares ({goSpares.length} GO, {nogoSpares.length} NOGO)
          </span>
          {spares.length > 0 && (
            <div style={{ fontSize: '12px', marginTop: 'var(--space-2)', background: 'var(--color-surface-secondary)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
              <strong>Debug - First Gauge Data:</strong><br/>
              ID: {spares[0].gauge_id}<br/>
              Name: {spares[0].name || 'null'}<br/>
              Std Name: {spares[0].displayName || 'null'}<br/>
              Thread Size: {spares[0].thread_size || 'null'}<br/>
              Thread Class: {spares[0].thread_class || 'null'}<br/>
              Thread Form: {spares[0].thread_form || 'null'}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <Card className={styles.searchCard}>
        <CardContent>
          <FormInput
            type="text"
            placeholder="Search by Gauge ID, Thread Size, Thread Class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <Button
              onClick={() => setSearch('')}
              variant="secondary"
              size="sm"
            >
              Clear Search
            </Button>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="danger">
          {error}
          <Button onClick={fetchSpares} variant="link">Retry</Button>
        </Alert>
      )}

      {/* Two-column layout */}
      <div className={styles.twoColumns}>
        {/* GO Column */}
        <Card>
          <CardHeader>
            <CardTitle>GO Gauges (A) - {goSpares.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.gaugeColumn}>
              {(selectedNOGO ? compatibleGO : goSpares).length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No GO gauges available</p>
                  {selectedNOGO && <p>No compatible GO gauges for selected NOGO</p>}
                </div>
              ) : (
                (selectedNOGO ? compatibleGO : goSpares).map(gauge => {
                  const isSelected = selectedGO?.id === gauge.id;
                  const isIncompatible = selectedNOGO && !compatibleGO.find(g => g.id === gauge.id);

                  return (
                    <div
                      key={gauge.id}
                      className={`${styles.gaugeCard} ${isSelected ? styles.selected : ''} ${
                        isIncompatible ? styles.incompatible : ''
                      }`}
                      onClick={() => !isIncompatible && handleSelectGO(gauge)}
                    >
                      <div className={styles.gaugeCardHeader}>
                        <strong>{gauge.name || gauge.displayName || `${gauge.thread_size} ${gauge.thread_class}`}</strong>
                        {isSelected && <span className={styles.selectedBadge}>✓ Selected</span>}
                      </div>
                      <div className={styles.gaugeCardDetails}>
                        <div>ID: {gauge.gauge_id}</div>
                        {gauge.manufacturer && <div>Mfr: {gauge.manufacturer}</div>}
                        <div className={styles.location}>
                          <LocationDisplay
                            location_code={gauge.storage_location}
                            building_name={gauge.building_name}
                            facility_name={gauge.facility_name}
                            zone_name={gauge.zone_name}
                            showHierarchy={true}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* NO GO Column */}
        <Card>
          <CardHeader>
            <CardTitle>NO GO Gauges (B) - {nogoSpares.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.gaugeColumn}>
              {(selectedGO ? compatibleNOGO : nogoSpares).length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No NOGO gauges available</p>
                  {selectedGO && <p>No compatible NOGO gauges for selected GO</p>}
                </div>
              ) : (
                (selectedGO ? compatibleNOGO : nogoSpares).map(gauge => {
                  const isSelected = selectedNOGO?.id === gauge.id;
                  const isIncompatible = selectedGO && !compatibleNOGO.find(g => g.id === gauge.id);

                  return (
                    <div
                      key={gauge.id}
                      className={`${styles.gaugeCard} ${isSelected ? styles.selected : ''} ${
                        isIncompatible ? styles.incompatible : ''
                      }`}
                      onClick={() => !isIncompatible && handleSelectNOGO(gauge)}
                    >
                      <div className={styles.gaugeCardHeader}>
                        <strong>{gauge.name || gauge.displayName || `${gauge.thread_size} ${gauge.thread_class}`}</strong>
                        {isSelected && <span className={styles.selectedBadge}>✓ Selected</span>}
                      </div>
                      <div className={styles.gaugeCardDetails}>
                        <div>ID: {gauge.gauge_id}</div>
                        {gauge.manufacturer && <div>Mfr: {gauge.manufacturer}</div>}
                        <div className={styles.location}>
                          <LocationDisplay
                            location_code={gauge.storage_location}
                            building_name={gauge.building_name}
                            facility_name={gauge.facility_name}
                            zone_name={gauge.zone_name}
                            showHierarchy={true}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Set button */}
      {selectedGO && selectedNOGO && (
        <div className={styles.createSetButtonContainer}>
          <Button onClick={handleOpenLocationModal} variant="primary" size="lg">
            Create Set: {selectedGO.gauge_id} + {selectedNOGO.gauge_id}
          </Button>
        </div>
      )}

      {/* Set Configuration Modal */}
      <Modal
        isOpen={showLocationModal}
        onClose={handleCloseModal}
        title="Create Set - Configure Details"
        size="md"
      >
        <Modal.Body>
          {/* Selected Gauges Summary */}
          <div style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
            background: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-gray-200)'
          }}>
            <div style={{ marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'space-between' }}>
              <strong>GO Gauge:</strong>
              <span>{selectedGO?.gauge_id}</span>
            </div>
            <div style={{ marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'space-between' }}>
              <strong>NOGO Gauge:</strong>
              <span>{selectedNOGO?.gauge_id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>Specifications:</strong>
              <span>{selectedGO?.thread_size} {selectedGO?.thread_class} {selectedGO?.thread_type?.toUpperCase()}</span>
            </div>
          </div>

          {/* Set ID Configuration */}
          <SetIdEditor
            categoryId={selectedGO?.category_id}
            gaugeType="plug"
            onSetIdChange={setSelectedSetId}
          />

          {/* Storage Location */}
          <StorageLocationSelect
            value={location}
            onChange={setLocation}
            label="Storage Location"
            required
          />
        </Modal.Body>

        <Modal.Actions>
          <ConfirmButton
            onClick={handleCreateSet}
            disabled={!location || isSubmitting}
          >
            {isSubmitting ? 'Creating Set...' : 'Create Set'}
          </ConfirmButton>
          <CancelButton onClick={handleCloseModal} disabled={isSubmitting} />
        </Modal.Actions>
      </Modal>
    </div>
  );
};
