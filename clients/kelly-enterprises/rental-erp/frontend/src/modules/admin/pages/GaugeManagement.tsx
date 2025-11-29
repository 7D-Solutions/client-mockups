import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LoadingSpinner,
  Button,
  Icon,
  Badge,
  FormInput,
  FormSelect,
  useToast,
  DataTable
} from '../../../infrastructure';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { EquipmentRules } from '../../../infrastructure/business/equipmentRules';
import { StatusRules } from '../../../infrastructure/business/statusRules';
import { EditGaugeModal } from '../../gauge/components/EditGaugeModal';
import { LocationDetailModal } from '../../inventory/components/LocationDetailModal';
import { gaugeService } from '../../gauge/services/gaugeService';
import { adminService } from '../services/adminService';
import type { Gauge } from '../../gauge/types';

export const GaugeManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [gauges, setGauges] = useState<Gauge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGauge, setSelectedGauge] = useState<Gauge | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLocationCode, setSelectedLocationCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [recoveryGaugeId, setRecoveryGaugeId] = useState('');
  const [recoveryInfo, setRecoveryInfo] = useState<any>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const toast = useToast();

  const loadGauges = useCallback(async () => {
    try {
      setLoading(true);
      const response = await gaugeService.getAll();
      // Extract gauges array from response
      const gaugesList = Array.isArray(response) ? response : response.data || [];
      setGauges(gaugesList);
    } catch (error) {
      console.error('Failed to load gauges:', error);
      toast.error('Error', 'Failed to load gauges');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadGauges();
  }, [loadGauges]);

  const handleEdit = (gauge: Gauge) => {
    setSelectedGauge(gauge);
    setIsEditModalOpen(true);
  };

  const handleLocationClick = (e: React.MouseEvent, locationCode: string) => {
    e.stopPropagation();
    setSelectedLocationCode(locationCode);
  };

  const handleEditClose = async () => {
    setIsEditModalOpen(false);
    setSelectedGauge(null);
    await loadGauges(); // Refresh the list - wait for it to complete
  };

  const handleRecoveryCheck = async () => {
    if (!recoveryGaugeId.trim()) {
      toast.error('Error', 'Please enter a gauge ID');
      return;
    }

    try {
      setRecoveryLoading(true);
      const info = await adminService.getGaugeRecoveryInfo(recoveryGaugeId);
      setRecoveryInfo(info.data);
      toast.success('Success', 'Recovery information loaded');
    } catch (error) {
      console.error('Failed to get recovery info:', error);
      toast.error('Error', 'Failed to get recovery information');
      setRecoveryInfo(null);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleRecoveryAction = async (action: string) => {
    if (!recoveryGaugeId.trim()) return;

    try {
      setRecoveryLoading(true);
      const result = await adminService.executeGaugeRecovery(recoveryGaugeId, action);

      if (result.success) {
        toast.success('Success', result.message || 'Recovery action completed');
        // Refresh recovery info
        await handleRecoveryCheck();
        // Refresh gauge list
        await loadGauges();
      } else {
        toast.error('Error', result.message || 'Recovery action failed');
      }
    } catch (error) {
      console.error('Recovery action failed:', error);
      toast.error('Error', 'Recovery action failed');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Get unique locations for filter dropdown
  const uniqueLocations = Array.from(new Set(gauges.map(g => g.storage_location).filter(Boolean)));

  // Filter gauges based on search term, type, and location
  const filteredGauges = gauges.filter(gauge => {
    const matchesSearch = searchTerm === '' ||
      gauge.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gauge.gauge_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gauge.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || gauge['equipment_type'] === filterType;

    const matchesLocation = filterLocation === 'all' || gauge.storage_location === filterLocation;

    return matchesSearch && matchesType && matchesLocation;
  });

  const getStatusBadges = (gauge: any) => {
    const badges = [];

    // Main operational status badge (using StatusRules for consistency)
    badges.push(
      <Badge key="status" variant={StatusRules.getStatusBadgeVariant(gauge)} size="sm">
        {StatusRules.getStatusDisplayText(gauge)}
      </Badge>
    );

    // Seal status badge
    if (StatusRules.isSealed(gauge)) {
      badges.push(
        <Badge key="sealed" variant={StatusRules.getSealBadgeVariant(gauge)} size="sm">
          <Icon name="lock" /> {StatusRules.getSealDisplayText(gauge)}
        </Badge>
      );
    }

    // Pending unseal request
    if (StatusRules.isSealedWithPendingUnseal(gauge)) {
      badges.push(
        <Badge key="pending-unseal" variant="warning" size="sm">
          <Icon name="unlock-alt" /> Pending Unseal
        </Badge>
      );
    }

    // Checkout status
    if (StatusRules.isCheckedOut(gauge) && (gauge.assigned_to_user_name || gauge.checked_out_to)) {
      badges.push(
        <Badge key="checked-out" variant="info" size="sm">
          <Icon name="user" /> Out: {gauge.assigned_to_user_name || gauge.checked_out_to}
        </Badge>
      );
    }

    // Pending transfer
    if (gauge.has_pending_transfer) {
      badges.push(
        <Badge key="pending-transfer" variant="warning" size="sm">
          <Icon name="exchange-alt" /> Pending Transfer
        </Badge>
      );
    }

    return badges;
  };

  // Column definitions
  const columns: DataTableColumn[] = [
    {
      id: 'gauge_id',
      label: 'GAUGE ID',
      visible: true,
      locked: true,
      align: 'left'
    },
    {
      id: 'name',
      label: 'NAME',
      visible: true,
      align: 'left'
    },
    {
      id: 'equipment_type',
      label: 'TYPE',
      visible: true,
      align: 'left',
      render: (_, gauge: Gauge) => EquipmentRules.getDisplayName(gauge)
    },
    {
      id: 'serial_number',
      label: 'SERIAL #',
      visible: true,
      align: 'left',
      render: (value: string) => value || '-'
    },
    {
      id: 'status',
      label: 'STATUS',
      visible: true,
      align: 'left',
      sortable: false,
      render: (_, gauge: Gauge) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
          {getStatusBadges(gauge)}
        </div>
      )
    },
    {
      id: 'storage_location',
      label: 'LOCATION',
      visible: true,
      align: 'left',
      render: (value: string, gauge: Gauge) => {
        if (gauge.storage_location) {
          return (
            <span
              onClick={(e) => handleLocationClick(e, gauge.storage_location)}
              style={{
                color: 'var(--color-primary)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              {gauge.storage_location}
            </span>
          );
        }
        return '-';
      }
    },
    {
      id: 'calibration_due_date',
      label: 'CAL DUE',
      visible: true,
      align: 'left',
      filterType: 'date',
      render: (value: string) => {
        return value ? new Date(value).toLocaleDateString() : '-';
      },
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
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="info"
            icon={<Icon name="edit" />}
            onClick={() => handleEdit(gauge)}
          >
            Edit
          </Button>
        </div>
      )
    }
  ];

  // Column manager for table customization
  const columnManager = useColumnManager('gauge-management', columns);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--space-6)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Button
              onClick={() => navigate(-1)}
              variant="secondary"
              size="sm"
              style={{ padding: 'var(--space-2)' }}
            >
              <Icon name="arrow-left" />
            </Button>
            <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: '600' }}>
              Gauge Management
            </h2>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-gray-50)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'center'
        }}>
          {/* Search Input */}
          <FormInput
            type="text"
            placeholder="Search by name, ID, or serial number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
          />

          {/* Clear Button */}
          {(searchTerm || filterType !== 'all' || filterLocation !== 'all') && (
            <Button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterLocation('all');
              }}
              variant="secondary"
            >
              Clear
            </Button>
          )}

          {/* Type Filter Dropdown */}
          <FormSelect
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            <option value="all">All Types</option>
            <option value="thread_gauge">Thread Gauge</option>
            <option value="hand_tool">Hand Tool</option>
            <option value="large_equipment">Large Equipment</option>
            <option value="calibration_standard">Calibration Standard</option>
          </FormSelect>

          {/* Location Filter Dropdown */}
          <FormSelect
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            <option value="all">All Locations</option>
            {uniqueLocations.sort().map(location => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </FormSelect>
        </div>

        {/* DataTable */}
        <DataTable
          tableId="gauge-management"
          columns={columns}
          data={filteredGauges}
          columnManager={columnManager}
          itemsPerPage={50}
          emptyMessage="No gauges found"
          resetKey={location.pathname}
        />
      </div>

      {/* System Recovery Tools */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        marginTop: 'var(--space-4)'
      }}>
        <div style={{
          padding: 'var(--space-5)',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 'var(--font-size-xl)',
            fontWeight: '600'
          }}>System Recovery Tools</h2>
        </div>
        <div style={{ padding: 'var(--space-5)' }}>
          <p style={{ margin: '0 0 var(--space-4) 0', color: 'var(--color-gray-600)' }}>
            Diagnose and fix gauge status issues, stuck transfers, and other data inconsistencies.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <FormInput
              type="text"
              placeholder="Enter gauge ID (e.g., G-001)"
              value={recoveryGaugeId}
              onChange={(e) => setRecoveryGaugeId(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button
              onClick={handleRecoveryCheck}
              loading={recoveryLoading}
              icon={<Icon name="search" />}
            >
              Check Status
            </Button>
          </div>

          {recoveryInfo && (
            <div style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)'
            }}>
              <h4 style={{ margin: '0 0 var(--space-3) 0' }}>
                Recovery Analysis for {recoveryInfo.gauge?.gauge_id}
              </h4>

              <div style={{ marginBottom: 'var(--space-3)' }}>
                <strong>Current Status:</strong> {recoveryInfo.gauge?.status}
              </div>

              {recoveryInfo.status_issues?.length > 0 && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <strong>Issues Found:</strong>
                  <ul style={{ margin: 'var(--space-2) 0 0 var(--space-4)' }}>
                    {recoveryInfo.status_issues.map((issue: string, index: number) => (
                      <li key={index} style={{ color: 'var(--color-warning-dark)' }}>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recoveryInfo.recovery_actions?.length > 0 && (
                <div>
                  <strong>Available Recovery Actions:</strong>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {recoveryInfo.recovery_actions.map((action: any, index: number) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={action.impact === 'high' ? 'error' : action.impact === 'medium' ? 'warning' : 'info'}
                        onClick={() => handleRecoveryAction(action.action)}
                        loading={recoveryLoading}
                      >
                        {action.description}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {(!recoveryInfo.status_issues || recoveryInfo.status_issues.length === 0) && (
                <div style={{ color: 'var(--color-success-dark)' }}>
                  ✓ No issues found. Gauge appears to be in a consistent state.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {selectedGauge && (
        <EditGaugeModal
          isOpen={isEditModalOpen}
          onClose={handleEditClose}
          gauge={selectedGauge}
        />
      )}

      {/* Location Detail Modal */}
      {selectedLocationCode && (
        <LocationDetailModal
          locationCode={selectedLocationCode}
          isOpen={!!selectedLocationCode}
          onClose={() => setSelectedLocationCode(null)}
        />
      )}
    </div>
  );
};
