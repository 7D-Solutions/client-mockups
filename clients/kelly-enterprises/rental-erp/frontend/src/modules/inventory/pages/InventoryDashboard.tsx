// Inventory Dashboard - Using standardized DataTable component
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DataTable, DataTableColumn, Badge, useToast, LoadingSpinner, Button, Icon, FormInput } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { usePermissions } from '../../../infrastructure/auth/usePermissions';
import { inventoryService } from '../services/inventoryService';
import { INVENTORY_PERMISSIONS } from '../permissions';

interface InventoryItem {
  type: string;
  id: string;
  name: string;
  quantity: number;
  last_moved_at: string;
  location_code?: string;
  facility_name?: string;
  building_name?: string;
  zone_name?: string;
}

interface LocationData {
  location_code: string;
  building_name?: string;
  zone_name?: string;
  facility_name?: string;
  location_type: string | null;
  display_order: number;
  total_items: number;
  items: InventoryItem[];
}

export function InventoryDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load search term from sessionStorage
  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      return sessionStorage.getItem('inventoryDashboard_searchTerm') || '';
    } catch {
      return '';
    }
  });

  const canViewInventory = hasPermission(INVENTORY_PERMISSIONS.VIEW);

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save search term to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('inventoryDashboard_searchTerm', searchTerm);
    } catch {
      // Silently fail if sessionStorage is unavailable
    }
  }, [searchTerm]);

  // Clear filters when navigating away from inventory routes
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith('/inventory')) {
      try {
        sessionStorage.removeItem('inventoryDashboard_searchTerm');
      } catch {
        // Silently fail if sessionStorage is unavailable
      }
    }

    const handleBeforeUnload = () => {
      const nextPath = window.location.pathname;
      if (!nextPath.startsWith('/inventory')) {
        try {
          sessionStorage.removeItem('inventoryDashboard_searchTerm');
        } catch {
          // Silently fail if sessionStorage is unavailable
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const response = await inventoryService.getOverview();
      if (response.success && response.data) {
        const locationData = Array.isArray(response.data.locations)
          ? response.data.locations
          : [];
        setLocations(locationData);
      }
    } catch {
      toast.error('Load Error', 'Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = (item: InventoryItem) => {
    if (item.type === 'gauge') {
      navigate(`/gauges`, {
        state: {
          returnTo: '/inventory',
          openGaugeId: item.id
        }
      });
    } else {
      toast.info('Item Details', `${item.type} module coming soon`);
    }
  };

  const handleLocationClick = (e: React.MouseEvent, locationCode: string) => {
    e.stopPropagation();
    navigate(`/inventory/location/${locationCode}`, { state: { returnTo: '/inventory' } });
  };

  // Flatten all items from all locations for the table
  const allItems = locations.flatMap(location =>
    location.items.map(item => ({
      ...item,
      location_code: location.location_code,
      facility_name: location.facility_name,
      building_name: location.building_name,
      zone_name: location.zone_name
    }))
  );

  // Column definitions with custom rendering
  const columns: DataTableColumn[] = [
    {
      id: 'id',
      label: 'ITEM ID',
      visible: true,
      locked: true,
      align: 'center',
      render: (value) => (
        <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
          {value}
        </span>
      )
    },
    {
      id: 'name',
      label: 'ITEM NAME',
      visible: true,
      align: 'left'
    },
    {
      id: 'type',
      label: 'TYPE',
      visible: true,
      align: 'center',
      render: (value) => (
        <Badge size="compact" variant={value === 'gauge' ? 'info' : 'secondary'}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      )
    },
    {
      id: 'facility_name',
      label: 'FACILITY',
      visible: true,
      align: 'center',
      render: (value) => value || '-'
    },
    {
      id: 'building_name',
      label: 'BUILDING',
      visible: true,
      align: 'center',
      render: (value) => value || '-'
    },
    {
      id: 'zone_name',
      label: 'ZONE',
      visible: true,
      align: 'center',
      render: (value) => value || '-'
    },
    {
      id: 'location_code',
      label: 'LOCATION',
      visible: true,
      align: 'center',
      render: (value) => value ? (
        <span
          onClick={(e) => handleLocationClick(e, value)}
          style={{
            color: 'var(--color-primary)',
            fontWeight: '600',
            cursor: 'pointer',
            textDecoration: 'none'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          {value}
        </span>
      ) : '-'
    },
    {
      id: 'quantity',
      label: 'QUANTITY',
      visible: true,
      align: 'center',
      render: (value) => value || 1
    },
    {
      id: 'last_moved_at',
      label: 'LAST MOVED',
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
    }
  ];

  // Column manager for table customization
  const columnManager = useColumnManager('inventory-dashboard', columns);

  // Filter items by search term
  const filteredItems = searchTerm
    ? allItems.filter(item =>
        item.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location_code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allItems;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!canViewInventory) {
    return (
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-8)',
        textAlign: 'center'
      }}>
        <i className="fas fa-lock" style={{ fontSize: '48px', color: 'var(--color-danger)', marginBottom: 'var(--space-4)' }} />
        <h2>Access Denied</h2>
        <p>You do not have permission to view inventory data.</p>
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
            All Items
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
            {/* Action buttons can go here in the future */}
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
                  onClick={columnManager.resetToDefault}
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

        {/* DataTable Component */}
        {columnManager.columns.length > 0 && (
          <DataTable
            tableId="inventory-dashboard"
            columns={columns}
            data={filteredItems}
            onRowClick={handleItemClick}
            itemsPerPage={50}
            resetKey={location.pathname}
            disableColumnControls={true}
            externalEditMode={columnManager.isEditMode}
            columnManager={columnManager}
            leftControls={
              <>
                <FormInput
                  type="text"
                  placeholder="Search items..."
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
                        sessionStorage.removeItem('inventoryDashboard_searchTerm');
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
    </div>
  );
}
