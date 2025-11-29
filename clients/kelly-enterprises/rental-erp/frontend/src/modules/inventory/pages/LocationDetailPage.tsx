// Location Detail Page - Shows all items in a specific storage location
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner, Button, Icon, Badge, BackButton, DataTable } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { useToast } from '../../../infrastructure';
import { usePermissions } from '../../../infrastructure/auth/usePermissions';
import { inventoryService } from '../services/inventoryService';
import { apiClient } from '../../../infrastructure/api/client';
import { INVENTORY_PERMISSIONS } from '../permissions';
import { LocationDetailModal } from '../components/LocationDetailModal';
import type { LocationWithItems } from '../types';

interface StorageLocation {
  id: number;
  location_code: string;
  description: string | null;
  location_type: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface LocationItem {
  item_identifier: string;
  quantity: number;
  last_moved_at: string;
}

export function LocationDetailPage() {
  const { locationCode } = useParams<{ locationCode: string }>();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const [location, setLocation] = useState<LocationWithItems | null>(null);
  const [storageLocation, setStorageLocation] = useState<StorageLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  // Check permissions
  const canViewInventory = hasPermission(INVENTORY_PERMISSIONS.VIEW);
  const canManage = hasPermission(INVENTORY_PERMISSIONS.MANAGE);

  useEffect(() => {
    if (locationCode) {
      fetchLocationDetails();
      fetchStorageLocationInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationCode]);

  const fetchLocationDetails = async () => {
    if (!locationCode) return;

    try {
      const response = await inventoryService.getLocationDetails(locationCode);

      if (response.success && response.data) {
        setLocation(response.data);
      }
    } catch {
      // Failed to load location items - location might not have items yet
      // Error details available in development console if needed
    }
  };

  const fetchStorageLocationInfo = async () => {
    if (!locationCode) return;

    setIsLoading(true);
    try {
      // Get all storage locations and find the matching one
      const response = await apiClient.get<{ success: boolean; data: StorageLocation[] }>('/storage-locations');

      if (response.success && response.data) {
        const found = response.data.find(
          loc => loc.location_code.localeCompare(locationCode, undefined, { sensitivity: 'base' }) === 0
        );

        if (found) {
          setStorageLocation(found);
        } else {
          toast.error('Location Not Found', `Storage location "${locationCode}" does not exist`);
          navigate('/inventory/locations');
        }
      }
    } catch {
      // Failed to load storage location - error details available in development console if needed
      toast.error('Load Error', 'Failed to load storage location information');
      navigate('/inventory/locations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClose = () => {
    setShowEditModal(false);
    fetchStorageLocationInfo();
    fetchLocationDetails();
  };

  // Column definitions for Gauges table
  const gaugeColumns: DataTableColumn[] = [
    {
      id: 'item_identifier',
      label: 'GAUGE ID',
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
      id: 'quantity',
      label: 'QUANTITY',
      visible: true,
      align: 'center'
    },
    {
      id: 'last_moved_at',
      label: 'LAST MOVED',
      visible: true,
      align: 'center',
      filterType: 'date',
      render: (value) => value ? new Date(value).toLocaleString() : '-',
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

  // Column manager for gauges table
  const gaugeColumnManager = useColumnManager('location-gauges', gaugeColumns);

  // Column definitions for Tools table
  const toolColumns: DataTableColumn[] = [
    {
      id: 'item_identifier',
      label: 'TOOL ID',
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
      id: 'quantity',
      label: 'QUANTITY',
      visible: true,
      align: 'center'
    },
    {
      id: 'last_moved_at',
      label: 'LAST MOVED',
      visible: true,
      align: 'center',
      filterType: 'date',
      render: (value) => value ? new Date(value).toLocaleString() : '-',
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

  // Column manager for tools table
  const toolColumnManager = useColumnManager('location-tools', toolColumns);

  // Column definitions for Parts table
  const partColumns: DataTableColumn[] = [
    {
      id: 'item_identifier',
      label: 'PART NUMBER',
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
      id: 'quantity',
      label: 'QUANTITY',
      visible: true,
      align: 'center',
      render: (value) => (
        <Badge variant="info">{value}</Badge>
      )
    },
    {
      id: 'last_moved_at',
      label: 'LAST MOVED',
      visible: true,
      align: 'center',
      filterType: 'date',
      render: (value) => value ? new Date(value).toLocaleString() : '-',
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

  // Column manager for parts table
  const partColumnManager = useColumnManager('location-parts', partColumns);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Permission check
  if (!canViewInventory) {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-5)'
        }}>
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <Icon name="lock" style={{ fontSize: '48px', color: 'var(--color-error)', marginBottom: 'var(--space-4)' }} />
            <h2 style={{ color: 'var(--color-gray-900)', marginBottom: 'var(--space-2)' }}>
              Access Denied
            </h2>
            <p style={{ color: 'var(--color-gray-600)' }}>
              You do not have permission to view inventory data.
            </p>
            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
              Contact your administrator to request access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!storageLocation) {
    return null;
  }

  const totalItems = location?.total_items || 0;

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <BackButton onClick={() => {
          const returnTo = routerLocation.state?.returnTo;
          navigate(returnTo || '/inventory/locations');
        }} />
        <div style={{ marginTop: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <h1 style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: '700',
              color: 'var(--color-gray-900)',
              margin: 0
            }}>
              {storageLocation.location_code.toUpperCase()}
            </h1>
            <Badge variant={storageLocation.is_active ? 'success' : 'secondary'} size="compact">
              {storageLocation.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="info" size="compact">
              {storageLocation.location_type.charAt(0).toUpperCase() + storageLocation.location_type.slice(1)}
            </Badge>
          </div>
          {storageLocation.description && (
            <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--font-size-sm)', margin: '0 0 var(--space-1) 0' }}>
              {storageLocation.description}
            </p>
          )}
          <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
            {totalItems} {totalItems === 1 ? 'item' : 'items'} in this location
          </p>
        </div>
      </div>

      {/* Action Bar */}
      {canManage && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 'var(--space-3)'
        }}>
          <Button
            variant="secondary"
            size="compact"
            icon={<Icon name="edit" />}
            onClick={() => setShowEditModal(true)}
          >
            Edit Location
          </Button>
        </div>
      )}

      {/* Gauges Section */}
      {location?.items?.gauges && location.items.gauges.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          marginBottom: 'var(--space-4)'
        }}>
          <div style={{
            padding: '8px var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}>
            <Icon name="tool" />
            <h2 style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: '600',
              margin: 0
            }}>
              Gauges
            </h2>
            <Badge variant="default">{location.items.gauges.length}</Badge>
          </div>

          <DataTable
            tableId="location-gauges"
            columns={gaugeColumns}
            data={location.items.gauges}
            columnManager={gaugeColumnManager}
            onRowClick={(item: LocationItem) => navigate(`/gauges`, {
              state: {
                returnTo: `/inventory/location/${locationCode}`,
                openGaugeId: item.item_identifier
              }
            })}
            itemsPerPage={50}
            emptyMessage="No gauges in this location"
            resetKey={routerLocation.pathname}
          />
        </div>
      )}

      {/* Tools Section */}
      {location?.items?.tools && location.items.tools.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          marginBottom: 'var(--space-4)'
        }}>
          <div style={{
            padding: '8px var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}>
            <Icon name="wrench" />
            <h2 style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: '600',
              margin: 0
            }}>
              Tools
            </h2>
            <Badge variant="default">{location.items.tools.length}</Badge>
          </div>

          <DataTable
            tableId="location-tools"
            columns={toolColumns}
            data={location.items.tools}
            columnManager={toolColumnManager}
            onRowClick={() => toast.info('Tool Details', 'Tool module coming soon')}
            itemsPerPage={50}
            emptyMessage="No tools in this location"
            resetKey={routerLocation.pathname}
          />
        </div>
      )}

      {/* Parts Section */}
      {location?.items?.parts && location.items.parts.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          marginBottom: 'var(--space-4)'
        }}>
          <div style={{
            padding: '8px var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}>
            <Icon name="box" />
            <h2 style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: '600',
              margin: 0
            }}>
              Parts
            </h2>
            <Badge variant="default">{location.items.parts.length}</Badge>
          </div>

          <DataTable
            tableId="location-parts"
            columns={partColumns}
            data={location.items.parts}
            columnManager={partColumnManager}
            onRowClick={() => toast.info('Part Details', 'Part module coming soon')}
            itemsPerPage={50}
            emptyMessage="No parts in this location"
            resetKey={routerLocation.pathname}
          />
        </div>
      )}

      {/* Empty State */}
      {totalItems === 0 && (
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-5)'
        }}>
            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <Icon name="box" style={{ fontSize: '48px', color: 'var(--color-gray-400)', marginBottom: 'var(--space-4)' }} />
              <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--font-size-lg)' }}>
                No items in this location
              </p>
            </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && storageLocation && (
        <LocationDetailModal
          isOpen={showEditModal}
          location={storageLocation}
          onClose={handleEditClose}
          canManage={canManage}
        />
      )}
    </div>
  );
}
