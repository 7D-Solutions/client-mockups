// Simplified Gauge List - Clean table layout matching mockup
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useGauges } from '../hooks/useGauges';
import { useGaugeOperations } from '../hooks/useGaugeOperations';
import { useAdminAlerts } from '../hooks/useAdminAlerts';
import { useGaugeContext } from '../context';
import { Button, Badge, LoadingSpinner, useToast, Icon, useEventBus, FormInput, LocationDisplay, DataTable, useAuth, useColumnManager } from '../../../infrastructure';
import type { DataTableColumn } from '../../../infrastructure';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { GaugeModalManager, AddGaugeWizard, UnsealRequestsManagerModal, QCApprovalsModal, OutOfServiceReviewModal, SetCheckoutModal, SetUnsealRequestModal } from '../components';
import type { Gauge, EquipmentType } from '../types';

export function GaugeList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Initialize modal state from navigation state to prevent flash
  const [selectedGauge, setSelectedGauge] = useState<Gauge | null>(null);
  const [modalType, setModalType] = useState<string | null>(() => {
    return location.state?.openGaugeId ? 'details' : null;
  });
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [showUnsealRequestsModal, setShowUnsealRequestsModal] = useState(false);
  const [showQCModal, setShowQCModal] = useState(false);
  const [showOutOfServiceModal, setShowOutOfServiceModal] = useState(false);
  const [showSetCheckoutModal, setShowSetCheckoutModal] = useState(false);
  const [setCheckoutId, setSetCheckoutId] = useState<string | null>(null);
  const [showSetUnsealModal, setShowSetUnsealModal] = useState(false);
  const [setUnsealId, setSetUnsealId] = useState<string | null>(null);

  // Load search term from sessionStorage
  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      return sessionStorage.getItem('gaugeList_searchTerm') || '';
    } catch {
      return '';
    }
  });

  // Store reference to DataTable's reset function
  const dataTableResetRef = useRef<(() => void) | null>(null);

  const toast = useToast();
  const { user } = useAuth();
  const { filters } = useGaugeContext();
  const { canCheckout, canReturn, canTransfer } = useGaugeOperations();
  const { pendingQCCount, outOfServiceCount, pendingUnsealCount, calibrationDueCount } = useAdminAlerts();

  // Read URL parameters and merge with context filters
  const activeFilters = useMemo(() => {
    const urlEquipmentType = searchParams.get('equipment_type') as EquipmentType | null;
    return {
      ...filters,
      ...(urlEquipmentType && { equipment_type: urlEquipmentType }),
      limit: 1000
    };
  }, [filters, searchParams]);

  // Get page title based on equipment type filter
  const pageTitle = useMemo(() => {
    const equipmentType = searchParams.get('equipment_type');
    if (equipmentType === 'thread_gauge') return 'Thread Gauges';
    if (equipmentType === 'large_equipment') return 'Large Equipment';
    if (equipmentType === 'hand_tool') return 'Hand Tools';
    if (equipmentType === 'calibration_standard') return 'Calibration Standards';
    return 'All Gauges';
  }, [searchParams]);

  // Fetch gauges with combined filters
  const { data, isLoading, error, refetch } = useGauges(activeFilters);
  const gauges = useMemo(() => data?.data || [], [data]);

  useEffect(() => {
    if (error) {
      toast.error('Failed to load gauges', 'Please try again');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Save search term to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('gaugeList_searchTerm', searchTerm);
    } catch {
      // Silently fail if sessionStorage is unavailable
    }
  }, [searchTerm]);

  // Clear filters when navigating away from gauge routes
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith('/gauges')) {
      try {
        sessionStorage.removeItem('gaugeList_searchTerm');
      } catch {
        // Silently fail if sessionStorage is unavailable
      }
    }

    const handleBeforeUnload = () => {
      const nextPath = window.location.pathname;
      if (!nextPath.startsWith('/gauges')) {
        try {
          sessionStorage.removeItem('gaugeList_searchTerm');
        } catch {
          // Silently fail if sessionStorage is unavailable
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Handle gauge modal opening from navigation state
  useEffect(() => {
    if (gauges.length === 0) return;

    const stateGaugeId = location.state?.openGaugeId;
    if (stateGaugeId) {
      const gauge = gauges.find(g => g.gauge_id === stateGaugeId || String(g.id) === stateGaugeId);
      if (gauge) {
        setSelectedGauge(gauge);
        setModalType('details');
        navigate(window.location.pathname, { replace: true, state: { returnTo: location.state?.returnTo } });
        return;
      }
    }

    const openGaugeId = searchParams.get('open');
    if (openGaugeId) {
      const gauge = gauges.find(g => g.gauge_id === openGaugeId || String(g.id) === openGaugeId);
      if (gauge) {
        setSelectedGauge(gauge);
        setModalType('details');
        navigate(window.location.pathname, { replace: true });
      }
    }
  }, [searchParams, gauges, navigate, location.state]);

  // Listen for modal open events
  useEventBus<{ type: string }>('modal:open', (data) => {
    if (data?.type === 'qc-approvals') {
      setShowQCModal(true);
    } else if (data?.type === 'out-of-service-review') {
      setShowOutOfServiceModal(true);
    } else if (data?.type === 'add-gauge') {
      setShowAddWizard(true);
    }
  });

  // Apply global search term to filter gauges
  const filteredGauges = gauges.filter(gauge => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        gauge.gauge_id?.toLowerCase().includes(searchLower) ||
        gauge.set_id?.toLowerCase().includes(searchLower) ||
        gauge.name?.toLowerCase().includes(searchLower) ||
        gauge.description?.toLowerCase().includes(searchLower) ||
        gauge.serial_number?.toLowerCase().includes(searchLower) ||
        gauge.status?.toLowerCase().includes(searchLower) ||
        gauge.storage_location?.toLowerCase().includes(searchLower) ||
        gauge.assigned_to_user_name?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }
    return true;
  });

  // Group gauges by set_id for display
  interface GroupedGauge extends Gauge {
    displayId: string;  // Set ID for sets, gauge_id for individual gauges
  }

  const groupedGauges = useMemo(() => {
    // First pass: collect all gauges by set_id
    const setMap = new Map<string, Gauge[]>();
    const singles: Gauge[] = [];

    filteredGauges.forEach(gauge => {
      if (gauge.set_id) {
        if (!setMap.has(gauge.set_id)) {
          setMap.set(gauge.set_id, []);
        }
        setMap.get(gauge.set_id)!.push(gauge);
      } else {
        singles.push(gauge);
      }
    });

    // Second pass: create aggregated set representations
    const result: GroupedGauge[] = [];

    // Add sets with aggregated properties
    setMap.forEach((gaugesInSet, setId) => {
      // Use the first gauge as base, but aggregate critical properties
      const baseGauge = gaugesInSet[0];

      // Aggregate critical properties (most restrictive wins)
      // Note: is_sealed can be 0/1 (number) or boolean, so explicit check needed
      const isSealed = gaugesInSet.some(g => StatusRules.isSealed(g));
      const hasPendingUnsealRequest = gaugesInSet.some(g => StatusRules.hasPendingUnsealRequest(g));

      // Calibration: use earliest due date (most urgent)
      const calibrationDates = gaugesInSet
        .map(g => g.calibration_due_date)
        .filter(d => d)
        .sort();
      const earliestCalibrationDate = calibrationDates[0];

      // Calibration status: Expired > Due Soon > Current
      const statusPriority = { 'Expired': 3, 'Due Soon': 2, 'Current': 1 };
      const worstCalibrationStatus = gaugesInSet.reduce((worst, g) => {
        if (!g.calibration_status) return worst;
        if (!worst) return g.calibration_status;
        return statusPriority[g.calibration_status] > statusPriority[worst] ? g.calibration_status : worst;
      }, null as 'Expired' | 'Due Soon' | 'Current' | null);

      result.push({
        ...baseGauge,
        is_sealed: isSealed,
        has_pending_unseal_request: hasPendingUnsealRequest,
        calibration_due_date: earliestCalibrationDate || baseGauge.calibration_due_date,
        calibration_status: worstCalibrationStatus || baseGauge.calibration_status,
        displayId: setId,
      });
    });

    // Add individual gauges
    singles.forEach(gauge => {
      result.push({
        ...gauge,
        displayId: gauge.gauge_id || '',
      });
    });

    return result;
  }, [filteredGauges]);

  // Handle gauge actions
  const handleCheckout = useCallback((gauge: Gauge) => {
    // Check if this is a set row (displayId equals set_id)
    const isSetRow = gauge.set_id && (gauge as any).displayId === gauge.set_id;

    if (isSetRow) {
      // For sets, check if sealed - if so, go to set unseal flow
      if (gauge.is_sealed) {
        // Set has sealed gauge(s), open set unseal modal
        setSetUnsealId(gauge.set_id);
        setShowSetUnsealModal(true);
      } else {
        // Set is not sealed, open set checkout modal
        setSetCheckoutId(gauge.set_id);
        setShowSetCheckoutModal(true);
      }
    } else {
      // Open individual gauge checkout modal
      setSelectedGauge(gauge);
      if (gauge.is_sealed) {
        setModalType('unseal');
      } else {
        setModalType('checkout');
      }
    }
  }, []);

  const handleCheckin = useCallback((gauge: Gauge) => {
    setSelectedGauge(gauge);
    setModalType('return');
  }, []);

  const handleTransfer = useCallback((gauge: Gauge) => {
    setSelectedGauge(gauge);
    setModalType('transfer');
  }, []);

  const handleModalClose = async () => {
    setModalType(null);
    setSelectedGauge(null);

    const returnTo = location.state?.returnTo;
    if (returnTo) {
      navigate(-1);
    } else {
      const returnToParam = searchParams.get('returnTo');
      if (returnToParam) {
        navigate(returnToParam, { replace: true });
      } else {
        await refetch();
      }
    }
  };

  // Handle full close (X button) - closes all modals and ensures we're on main page
  const handleFullClose = () => {
    setModalType(null);
    setSelectedGauge(null);
    // Clear any URL state that might have caused modal to open
    navigate(location.pathname, { replace: true, state: {} });
  };

  // Handle row click
  const handleRowClick = (gauge: GroupedGauge) => {
    // If displayId is a set ID (not a gauge ID), navigate to set page
    if (gauge.set_id && gauge.displayId === gauge.set_id) {
      navigate(`/gauges/sets/${gauge.set_id}`);
    } else {
      setSelectedGauge(gauge);
      setModalType('details');
    }
  };

  // Helper function to get status display text for sorting
  const getStatusSortValue = useCallback((row: Gauge): string => {
    // Match the display logic exactly
    if (row.is_spare === 1 || row.is_spare === true || (EquipmentRules.isThreadGauge(row) && !row.set_id)) {
      return 'SPARE';
    }
    if (row.is_sealed) {
      return 'Sealed';
    }
    return StatusRules.getStatusDisplayText(row);
  }, []);

  // Define DataTable columns (memoized to prevent stale closure in resetToDefault)
  const columns: DataTableColumn[] = useMemo(() => [
    {
      id: 'displayId',
      label: 'GAUGE ID',
      locked: true,
      align: 'left',
      render: (value) => (
        <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
          {value || '-'}
        </span>
      )
    },
    {
      id: 'name',
      label: 'DESCRIPTION',
      align: 'left'
    },
    {
      id: 'status',
      label: 'STATUS',
      align: 'center',
      render: (value, row) => (
        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'center', flexWrap: 'nowrap' }}>
          {(row.is_spare === 1 || row.is_spare === true || (EquipmentRules.isThreadGauge(row) && !row.set_id)) ? (
            <Badge size="compact" variant="secondary">
              SPARE
            </Badge>
          ) : row.is_sealed ? (
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-info-light)',
              border: '1px solid var(--color-info)',
              color: 'white'
            }}>
              Sealed
            </span>
          ) : (value === 'pending_qc' || value === 'pending_unseal') ? (
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-warning-light)',
              border: '1px solid var(--color-warning)',
              color: 'var(--color-gray-800)'
            }}>
              {StatusRules.getStatusDisplayText(row)}
            </span>
          ) : (
            <Badge size="compact" variant={StatusRules.getStatusBadgeVariant(row)}>
              {StatusRules.getStatusDisplayText(row)}
            </Badge>
          )}
        </div>
      ),
      sortFn: (a, b, direction) => {
        const aStatus = getStatusSortValue(a);
        const bStatus = getStatusSortValue(b);
        const comparison = aStatus.localeCompare(bStatus);
        return direction === 'asc' ? comparison : -comparison;
      },
      filterFn: (value, filterValue, row) => {
        const statusText = StatusRules.getStatusDisplayText(row).toLowerCase();
        return statusText.includes(filterValue.toLowerCase());
      }
    },
    {
      id: 'assigned_to_user_name',
      label: 'ISSUED TO',
      align: 'center',
      render: (value) => value || '—'
    },
    {
      id: 'storage_location',
      label: 'LOCATION',
      align: 'center',
      render: (value, row) => (
        value || row.location ? (
          <Link
            to={`/inventory/location/${encodeURIComponent(value || row.location)}`}
            state={{ returnTo: '/gauges' }}
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            onClick={(e) => e.stopPropagation()}
          >
            <LocationDisplay
              location_code={value || row.location}
              building_name={row.building_name}
              facility_name={row.facility_name}
              zone_name={row.zone_name}
              showHierarchy={false}
            />
          </Link>
        ) : (
          <LocationDisplay location_code={undefined} showHierarchy={false} />
        )
      ),
      filterFn: (value, filterValue, row) => {
        const locationValue = (value || row.location || '').toLowerCase();
        return locationValue.includes(filterValue.toLowerCase());
      }
    },
    {
      id: 'calibration_due_date',
      label: 'CAL DUE',
      align: 'center',
      filterType: 'date',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
      dateFilterFn: (value, range) => {
        if (!value) return false;
        const date = new Date(value);
        if (isNaN(date.getTime())) return false;
        if (range.start && date < range.start) return false;
        if (range.end && date > range.end) return false;
        return true;
      }
    },
    {
      id: 'actions',
      label: 'ACTIONS',
      locked: true,
      align: 'center',
      filterable: false,
      sortable: false,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          {canCheckout(row) && (
            <Button
              size="compact"
              variant="primary"
              icon={<i className="fas fa-upload" />}
              onClick={(e) => {
                e.stopPropagation();
                handleCheckout(row);
              }}
            >
              Checkout
            </Button>
          )}
          {StatusRules.isCheckedOut(row) && (
            <>
              {/* Show pending transfer button if transfer exists */}
              {row.has_pending_transfer ? (
                // If current user is the sender, show "Pending" button
                (String(row.holder?.id) === String(user?.id) || String(row.checked_out_to) === String(user?.id)) ? (
                  <Button
                    size="compact"
                    variant="warning"
                    icon={<i className="fas fa-exchange-alt" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGauge(row);
                      setModalType('cancelTransfer');
                    }}
                  >
                    Pending
                  </Button>
                ) : (
                  // If current user is the recipient, show "Transfer Waiting" button
                  String(row.transfer_to_user_id) === String(user?.id) ? (
                    <Button
                      size="compact"
                      variant="info"
                      icon={<i className="fas fa-inbox" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGauge(row);
                        setModalType('details');
                      }}
                    >
                      Transfer Waiting
                    </Button>
                  ) : null
                )
              ) : (
                // No pending transfer - show regular Transfer button if user can transfer
                canTransfer(row) && (
                  <Button
                    size="compact"
                    variant="info"
                    icon={<i className="fas fa-exchange-alt" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTransfer(row);
                    }}
                  >
                    Transfer
                  </Button>
                )
              )}

              {/* Always show Checkin button for checked out gauges if user can return */}
              {canReturn(row) && (
                <Button
                  size="compact"
                  variant="success"
                  icon={<i className="fas fa-download" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheckin(row);
                  }}
                >
                  Checkin
                </Button>
              )}
            </>
          )}
        </div>
      )
    }
  ], [canCheckout, canReturn, canTransfer, user, handleCheckout, handleCheckin, handleTransfer, setSelectedGauge, setModalType, getStatusSortValue]);

  // Column manager for table customization
  const columnManager = useColumnManager('gauge-list', columns);

  const shouldShowLoading = isLoading || (location.state?.openGaugeId && !selectedGauge);

  if (shouldShowLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: '100%', margin: '0' }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        {/* Page Title */}
        <div style={{
          padding: 'var(--space-2) var(--space-4)',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 'var(--font-size-xl)',
            fontWeight: '600'
          }}>
            {pageTitle}
          </h2>
        </div>

        {/* Action Buttons Row */}
        <div style={{
          padding: 'var(--space-2) var(--space-4) 0 var(--space-4)',
          backgroundColor: 'var(--color-gray-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <Button
              onClick={() => setShowAddWizard(true)}
              variant="primary"
              icon={<Icon name="plus" />}
              size="sm"
            >
              Add Gauge
            </Button>

            {pendingQCCount > 0 && (
              <Button
                onClick={() => setShowQCModal(true)}
                variant="warning"
                icon={<Icon name="clipboard-check" />}
                size="sm"
                style={{
                  backgroundColor: 'var(--color-warning-light)',
                  border: '1px solid var(--color-warning)',
                  color: 'var(--color-gray-800)'
                }}
              >
                Pending QC
                <span style={{
                  background: 'var(--color-primary)',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginLeft: 'var(--space-2)'
                }}>
                  {pendingQCCount}
                </span>
              </Button>
            )}

            {calibrationDueCount > 0 && (
              <Button
                onClick={() => navigate('/gauges/calibration-management')}
                variant="danger"
                icon={<Icon name="calendar-alt" />}
                size="sm"
              >
                Calibration Due
                <span style={{
                  background: 'white',
                  color: 'var(--color-danger)',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginLeft: 'var(--space-2)'
                }}>
                  {calibrationDueCount}
                </span>
              </Button>
            )}

            {pendingUnsealCount > 0 && (
              <Button
                onClick={() => setShowUnsealRequestsModal(true)}
                variant="warning"
                icon={<Icon name="lock" />}
                size="sm"
                style={{
                  backgroundColor: 'var(--color-warning-light)',
                  border: '1px solid var(--color-warning)',
                  color: 'var(--color-gray-800)'
                }}
              >
                Unseal Requests
                <span style={{
                  background: 'var(--color-primary)',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginLeft: 'var(--space-2)'
                }}>
                  {pendingUnsealCount}
                </span>
              </Button>
            )}

            {outOfServiceCount > 0 && (
              <Button
                onClick={() => setShowOutOfServiceModal(true)}
                variant="danger"
                icon={<Icon name="tools" />}
                size="sm"
              >
                Out of Service
                <span style={{
                  background: 'white',
                  color: 'var(--color-danger)',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginLeft: 'var(--space-2)'
                }}>
                  {outOfServiceCount}
                </span>
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {!columnManager.isEditMode ? (
              <Button
                onClick={() => columnManager.toggleEditMode()}
                variant="secondary"
                icon={<Icon name="cog" />}
                size="sm"
                preventDoubleClick={false}
              >
                Columns
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => columnManager.toggleEditMode()}
                  variant="primary"
                  icon={<Icon name="check" />}
                  size="sm"
                  preventDoubleClick={false}
                >
                  Done
                </Button>
                <Button
                  onClick={() => {
                    if (dataTableResetRef.current) {
                      dataTableResetRef.current();
                    }
                  }}
                  variant="secondary"
                  size="sm"
                  preventDoubleClick={false}
                >
                  Reset Columns
                </Button>
              </>
            )}
          </div>
        </div>

        {/* DataTable */}
        {columnManager.columns.length > 0 && (
          <DataTable
            tableId="gauge-list"
            columns={columns}
            data={groupedGauges}
            onRowClick={handleRowClick}
            itemsPerPage={50}
            isLoading={isLoading}
            emptyMessage="No gauges found"
            resetKey={searchParams.get('equipment_type') || 'all'}
            disableColumnControls={true}
            externalEditMode={columnManager.isEditMode}
            onResetColumns={(resetFn) => {
              dataTableResetRef.current = resetFn;
            }}
            columnManager={columnManager}
            leftControls={
              <>
                <FormInput
                  type="text"
                  placeholder="Search gauges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Icon name="search" />}
                  size="sm"
                  style={{ width: '400px', marginBottom: 0, marginTop: 0 }}
                />

                {searchTerm && (
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      try {
                        sessionStorage.removeItem('gaugeList_searchTerm');
                      } catch {
                        // Silently fail if sessionStorage is unavailable
                      }
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    Clear Search
                  </Button>
                )}
              </>
            }
          />
        )}
      </div>

      {/* Modals */}
      {modalType && selectedGauge && (
        <GaugeModalManager
          selectedGauge={selectedGauge}
          modalType={modalType}
          onClose={handleModalClose}
          onFullClose={handleFullClose}
          onRefetch={refetch}
          onModalTypeChange={setModalType}
        />
      )}

      <AddGaugeWizard
        isOpen={showAddWizard}
        onClose={() => {
          setShowAddWizard(false);
          refetch();
        }}
      />

      <UnsealRequestsManagerModal
        isOpen={showUnsealRequestsModal}
        onClose={() => setShowUnsealRequestsModal(false)}
      />

      <QCApprovalsModal
        isOpen={showQCModal}
        onClose={() => setShowQCModal(false)}
      />

      <OutOfServiceReviewModal
        isOpen={showOutOfServiceModal}
        onClose={() => setShowOutOfServiceModal(false)}
      />

      {setCheckoutId && (
        <SetCheckoutModal
          isOpen={showSetCheckoutModal}
          onClose={() => {
            setShowSetCheckoutModal(false);
            setSetCheckoutId(null);
            refetch();
          }}
          setId={setCheckoutId}
        />
      )}

      {setUnsealId && (
        <SetUnsealRequestModal
          isOpen={showSetUnsealModal}
          onClose={() => {
            setShowSetUnsealModal(false);
            setSetUnsealId(null);
          }}
          onSuccess={() => {
            refetch();
          }}
          setId={setUnsealId}
        />
      )}
    </div>
  );
}
