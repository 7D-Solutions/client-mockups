// Storage Locations Management Page
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner, Button, Badge, useToast, DataTable } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { usePermissions } from '../../../infrastructure/auth/usePermissions';
import { apiClient } from '../../../infrastructure/api/client';
import { logger } from '../../../infrastructure/utils/logger';
import { INVENTORY_PERMISSIONS } from '../permissions';
import { AddLocationModal } from '../components/AddLocationModal';

interface StorageLocation {
  id: number;
  location_code: string;
  building_id?: number | null;
  building_name?: string;
  facility_id?: number;
  facility_name?: string;
  zone_id?: number | null;
  zone_name?: string;
  location_type: string;
  is_active: boolean;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export function StorageLocationsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const canManage = hasPermission(INVENTORY_PERMISSIONS.MANAGE);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<{ success: boolean; data: StorageLocation[] }>(
        `/storage-locations?includeInactive=${includeInactive}`
      );
      if (response.success && response.data) {
        setLocations(response.data);
      }
    } catch (error) {
      logger.error('Failed to load storage locations:', error);
      toast.error('Load Error', 'Failed to load storage locations');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleLocationClick = (location: StorageLocation) => {
    navigate(`/inventory/location/${location.location_code}`);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    fetchLocations();
  };

  const getLocationTypeColor = (type: string): 'info' | 'success' | 'warning' | 'danger' | 'secondary' => {
    switch (type) {
      case 'bin': return 'info';
      case 'shelf': return 'success';
      case 'rack': return 'warning';
      case 'cabinet': return 'secondary';
      case 'drawer': return 'info';
      case 'room': return 'danger';
      default: return 'secondary';
    }
  };

  // Define DataTable columns
  const columns: DataTableColumn[] = [
    {
      id: 'location_code',
      label: 'LOCATION CODE',
      visible: true,
      locked: true,
      align: 'left',
      render: (value) => (
        <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
          {value}
        </span>
      )
    },
    {
      id: 'building_name',
      label: 'BUILDING',
      visible: true,
      align: 'left',
      render: (value) => value || '-'
    },
    {
      id: 'zone_name',
      label: 'ZONE',
      visible: true,
      align: 'left',
      render: (value) => value || '-'
    },
    {
      id: 'location_type',
      label: 'TYPE',
      visible: true,
      align: 'center',
      render: (value) => (
        <Badge size="compact" variant={getLocationTypeColor(value)}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      )
    },
    {
      id: 'is_active',
      label: 'STATUS',
      visible: true,
      align: 'center',
      render: (value) => (
        <Badge size="compact" variant={value ? 'success' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
      filterFn: (value, filterValue) => {
        const status = value ? 'active' : 'inactive';
        return status.includes(filterValue.toLowerCase());
      },
      sortFn: (a, b, direction) => {
        const aVal = a.is_active ? 'active' : 'inactive';
        const bVal = b.is_active ? 'active' : 'inactive';
        const comparison = aVal.localeCompare(bVal);
        return direction === 'asc' ? comparison : -comparison;
      }
    },
    {
      id: 'item_count',
      label: 'ITEMS',
      visible: true,
      align: 'center',
      render: (value) => (
        value > 0 ? (
          <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{value}</span>
        ) : '-'
      ),
      sortFn: (a, b, direction) => {
        return direction === 'asc' ? a.item_count - b.item_count : b.item_count - a.item_count;
      }
    },
    {
      id: 'created_at',
      label: 'CREATED',
      visible: true,
      align: 'center',
      filterType: 'date',
      render: (value) => new Date(value).toLocaleDateString(),
      dateFilterFn: (value, range) => {
        if (!value) return false;
        const date = new Date(value);
        if (isNaN(date.getTime())) return false;
        if (range.start && date < range.start) return false;
        if (range.end && date > range.end) return false;
        return true;
      }
    }
  ];

  // Column manager for table customization
  const columnManager = useColumnManager('storage-locations', columns);

  if (isLoading) {
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
          padding: '8px var(--space-4)',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 'var(--font-size-xl)',
            fontWeight: '600'
          }}>
            Storage Locations
          </h2>
        </div>

        {/* Action Buttons Row */}
        <div style={{
          padding: '8px var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-gray-50)',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          {canManage && (
            <Button
              onClick={() => setShowAddModal(true)}
              variant="primary"
              icon={<i className="fas fa-plus" />}
              size="sm"
            >
              Add Location
            </Button>
          )}
        </div>

        {/* Filter Row */}
        <div style={{
          paddingTop: 'var(--space-0)',
          paddingBottom: 'var(--space-2)',
          paddingLeft: 'var(--space-4)',
          paddingRight: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-gray-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              Show Inactive
            </label>
          </div>
        </div>

        {/* DataTable */}
        <DataTable
          tableId="storage-locations"
          columns={columns}
          data={locations}
          columnManager={columnManager}
          onRowClick={handleLocationClick}
          itemsPerPage={50}
          isLoading={isLoading}
          emptyMessage="No storage locations found"
          resetKey={location.pathname}
        />
      </div>

      {/* Modal */}
      {showAddModal && (
        <AddLocationModal
          isOpen={showAddModal}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
