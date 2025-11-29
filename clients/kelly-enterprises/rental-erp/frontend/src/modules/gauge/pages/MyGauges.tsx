// My Gauges - Simplified clean table layout
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGauges } from '../hooks/useGauges';
import { useGaugeOperations } from '../hooks/useGaugeOperations';
import { useGaugeContext } from '../context';
import { Button, Badge, LoadingSpinner, useToast, GaugeTypeBadge, DataTable } from '../../../infrastructure';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { useAuth } from '../../../infrastructure';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { GaugeModalManager, SetCheckoutModal, SetUnsealRequestModal } from '../components';
import type { Gauge } from '../types';

export const MyGauges = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedGauge, setSelectedGauge] = useState<Gauge | null>(null);
  const [modalType, setModalType] = useState<string | null>(null);
  const [showSetCheckoutModal, setShowSetCheckoutModal] = useState(false);
  const [setCheckoutId, setSetCheckoutId] = useState<string | null>(null);
  const [showSetUnsealModal, setShowSetUnsealModal] = useState(false);
  const [setUnsealId, setSetUnsealId] = useState<string | null>(null);

  const toast = useToast();
  const { filters } = useGaugeContext();
  const { canCheckout, canReturn, canTransfer } = useGaugeOperations();

  // Fetch all gauges
  const { data, isLoading, error, refetch } = useGauges({ ...filters, limit: 1000 });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load gauges', 'Please try again');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Filter to show only gauges checked out to current user
  const myGauges = useMemo(() => {
    const gauges = data?.data || [];
    return gauges.filter(gauge => {
      const isCheckedOut = StatusRules.isCheckedOut(gauge);
      const isMyGauge = gauge.checked_out_to === user?.id ||
                       gauge.checked_out_to === user?.name ||
                       String(gauge.checked_out_to) === String(user?.id) ||
                       gauge.holder?.id === user?.id;
      return isCheckedOut && isMyGauge;
    });
  }, [data, user]);

  // Group gauges by set_id for display (same logic as GaugeList)
  interface GroupedGauge extends Gauge {
    displayId: string;  // Set ID for sets, gauge_id for individual gauges
  }

  const groupedGauges = useMemo(() => {
    // First pass: collect all gauges by set_id
    const setMap = new Map<string, Gauge[]>();
    const singles: Gauge[] = [];

    myGauges.forEach(gauge => {
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
  }, [myGauges]);

  const handleCheckout = (gauge: Gauge) => {
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
      // If gauge is sealed, go directly to unseal modal instead of checkout
      if (gauge.is_sealed) {
        setModalType('unseal');
      } else {
        setModalType('checkout');
      }
    }
  };

  const handleCheckin = (gauge: Gauge) => {
    setSelectedGauge(gauge);
    setModalType('return');
  };

  const handleTransfer = (gauge: Gauge) => {
    setSelectedGauge(gauge);
    setModalType('transfer');
  };

  const handleModalClose = async () => {
    setModalType(null);
    setSelectedGauge(null);
    await refetch();
  };

  // Handle full close (X button) - closes all modals and ensures we're on main page
  const handleFullClose = () => {
    setModalType(null);
    setSelectedGauge(null);
    // Clear any URL state that might have caused modal to open
    navigate(location.pathname, { replace: true, state: {} });
  };

  const handleRowClick = (gauge: GroupedGauge) => {
    // If displayId is a set ID (not a gauge ID), navigate to set page
    if (gauge.set_id && gauge.displayId === gauge.set_id) {
      navigate(`/gauges/sets/${gauge.set_id}`);
    } else {
      setSelectedGauge(gauge);
      setModalType('details');
    }
  };

  // Column definitions
  const columns: DataTableColumn[] = [
    {
      id: 'displayId',
      label: 'GAUGE ID',
      visible: true,
      locked: true,
      align: 'left',
      render: (value, row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{
            fontWeight: '600',
            color: 'var(--color-primary)'
          }}>
            {value || '-'}
          </span>
          {(row.is_spare === 1 || row.is_spare === true || (EquipmentRules.isThreadGauge(row) && !row.set_id)) && (
            <GaugeTypeBadge type="spare" />
          )}
        </span>
      )
    },
    {
      id: 'name',
      label: 'DESCRIPTION',
      visible: true,
      align: 'left',
      render: (value) => value || '-'
    },
    {
      id: 'status',
      label: 'STATUS',
      visible: true,
      align: 'center',
      render: () => (
        <Badge size="compact" variant="warning">
          Checked Out
        </Badge>
      )
    },
    {
      id: 'checkout_date',
      label: 'CHECKED OUT',
      visible: true,
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
      id: 'calibration_due_date',
      label: 'CAL DUE',
      visible: true,
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
      filterable: false,
      label: 'ACTIONS',
      visible: true,
      align: 'center',
      sortable: false,
      render: (_, gauge: Gauge) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          {StatusRules.isAvailable(gauge) && canCheckout(gauge) && (
            <Button
              size="compact"
              variant="primary"
              icon={<i className="fas fa-upload" />}
              onClick={(e) => {
                e.stopPropagation();
                handleCheckout(gauge);
              }}
            >
              Checkout
            </Button>
          )}
          {StatusRules.isCheckedOut(gauge) && canReturn(gauge) && (
            <Button
              size="compact"
              variant="success"
              icon={<i className="fas fa-download" />}
              onClick={(e) => {
                e.stopPropagation();
                handleCheckin(gauge);
              }}
            >
              Checkin
            </Button>
          )}
          {canTransfer(gauge) && (
            <Button
              size="compact"
              variant="info"
              icon={<i className="fas fa-exchange-alt" />}
              onClick={(e) => {
                e.stopPropagation();
                handleTransfer(gauge);
              }}
            >
              Transfer
            </Button>
          )}
        </div>
      )
    }
  ];

  // Column manager for table customization
  const columnManager = useColumnManager('my-gauges', columns);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: '100%', margin: '0' }}>
      {/* Main Content Card */}
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
            My Active Checkouts
          </h2>
        </div>

        {/* DataTable */}
        <DataTable
          tableId="my-gauges"
          columns={columns}
          data={groupedGauges}
          columnManager={columnManager}
          onRowClick={handleRowClick}
          itemsPerPage={50}
          emptyMessage="No active checkouts"
          resetKey={location.pathname}
        />
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
};
