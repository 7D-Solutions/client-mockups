/**
 * PAGE TEMPLATE
 *
 * This template provides a standardized pattern for list/table pages in the Fire-Proof ERP system.
 *
 * PATTERN OVERVIEW:
 * - React Query for data fetching with caching
 * - DataTable for consistent table UI with filtering, sorting, and pagination
 * - Infrastructure components (Button, FormInput, Badge, etc.)
 * - Session storage for filter persistence
 * - Modal management for CRUD operations
 *
 * CUSTOMIZATION POINTS:
 * 1. Replace {{ENTITY_NAME}} with singular entity name (e.g., "Gauge", "User", "Order")
 * 2. Replace {{ENTITY_NAME_PLURAL}} with plural (e.g., "Gauges", "Users", "Orders")
 * 3. Replace {{ENTITY_NAME_LOWER}} with lowercase singular (e.g., "gauge", "user", "order")
 * 4. Replace {{ENTITY_NAME_LOWER_PLURAL}} with lowercase plural (e.g., "gauges", "users", "orders")
 * 5. Define DataTable columns based on your entity fields
 * 6. Add action buttons specific to your entity
 * 7. Configure filters relevant to your domain
 *
 * INFRASTRUCTURE COMPONENTS USED:
 * - DataTable: Main table component with built-in filtering, sorting, pagination
 * - Button: Centralized button with double-click protection
 * - FormInput: Consistent form inputs
 * - Badge: Status indicators
 * - LoadingSpinner: Loading states
 * - useToast: Toast notifications
 * - Icon: Font Awesome icons
 *
 * @see GaugeList.tsx - Reference implementation
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { use{{ENTITY_NAME_PLURAL}} } from '../hooks/use{{ENTITY_NAME_PLURAL}}';
import { Button, Badge, LoadingSpinner, useToast, Icon, FormInput, DataTable } from '../../../infrastructure';
import type { DataTableColumn } from '../../../infrastructure';
import { {{ENTITY_NAME}}ModalManager } from '../components';
import type { {{ENTITY_NAME}} } from '../types';

export function {{ENTITY_NAME}}List() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // ===== STATE MANAGEMENT =====

  // Modal state
  const [selected{{ENTITY_NAME}}, setSelected{{ENTITY_NAME}}] = useState<{{ENTITY_NAME}} | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<string | null>(() => {
    // Initialize from navigation state to prevent flash
    return location.state?.open{{ENTITY_NAME}}Id ? 'details' : null;
  });
  const [showAddModal, setShowAddModal] = useState(false);

  // Search state with sessionStorage persistence
  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      return sessionStorage.getItem('{{ENTITY_NAME_LOWER}}List_searchTerm') || '';
    } catch {
      return '';
    }
  });

  // CUSTOMIZATION POINT: Add additional UI state (filters, toggles, etc.)
  // Example:
  // const [showArchived, setShowArchived] = useState(false);

  // ===== DATA FETCHING =====

  // CUSTOMIZATION POINT: Adjust filters based on URL params and context
  const activeFilters = useMemo(() => {
    const urlFilter = searchParams.get('filter_param'); // Replace with actual param name
    return {
      ...(urlFilter && { filter_field: urlFilter }),
      limit: 1000
    };
  }, [searchParams]);

  // Fetch data with React Query
  const { data, isLoading, error, refetch } = use{{ENTITY_NAME_PLURAL}}(activeFilters);
  const {{ENTITY_NAME_LOWER_PLURAL}} = data?.data || [];

  // ===== EFFECTS =====

  // Error handling
  useEffect(() => {
    if (error) {
      toast.error('Failed to load {{ENTITY_NAME_LOWER_PLURAL}}', 'Please try again');
    }
  }, [error, toast]);

  // Persist search term
  useEffect(() => {
    try {
      sessionStorage.setItem('{{ENTITY_NAME_LOWER}}List_searchTerm', searchTerm);
    } catch (error) {
      console.error('Failed to save search term:', error);
    }
  }, [searchTerm]);

  // Clear filters when navigating away
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith('/{{ENTITY_NAME_LOWER_PLURAL}}')) {
      try {
        sessionStorage.removeItem('{{ENTITY_NAME_LOWER}}List_searchTerm');
      } catch (error) {
        console.error('Failed to clear filters:', error);
      }
    }

    const handleBeforeUnload = () => {
      const nextPath = window.location.pathname;
      if (!nextPath.startsWith('/{{ENTITY_NAME_LOWER_PLURAL}}')) {
        try {
          sessionStorage.removeItem('{{ENTITY_NAME_LOWER}}List_searchTerm');
        } catch (error) {
          console.error('Failed to clear filters:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Handle modal opening from navigation state
  useEffect(() => {
    if ({{ENTITY_NAME_LOWER_PLURAL}}.length === 0) return;

    const state{{ENTITY_NAME}}Id = location.state?.open{{ENTITY_NAME}}Id;
    if (state{{ENTITY_NAME}}Id) {
      const {{ENTITY_NAME_LOWER}} = {{ENTITY_NAME_LOWER_PLURAL}}.find(item => String(item.id) === state{{ENTITY_NAME}}Id);
      if ({{ENTITY_NAME_LOWER}}) {
        setSelected{{ENTITY_NAME}}({{ENTITY_NAME_LOWER}});
        setModalType('details');
        navigate(window.location.pathname, { replace: true, state: { returnTo: location.state?.returnTo } });
        return;
      }
    }

    const open{{ENTITY_NAME}}Id = searchParams.get('open');
    if (open{{ENTITY_NAME}}Id) {
      const {{ENTITY_NAME_LOWER}} = {{ENTITY_NAME_LOWER_PLURAL}}.find(item => String(item.id) === open{{ENTITY_NAME}}Id);
      if ({{ENTITY_NAME_LOWER}}) {
        setSelected{{ENTITY_NAME}}({{ENTITY_NAME_LOWER}});
        setModalType('details');
        navigate(window.location.pathname, { replace: true });
      }
    }
  }, [searchParams, {{ENTITY_NAME_LOWER_PLURAL}}, navigate, location.state]);

  // ===== DATA PROCESSING =====

  // Apply search filter
  const filtered{{ENTITY_NAME_PLURAL}} = {{ENTITY_NAME_LOWER_PLURAL}}.filter(item => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      // CUSTOMIZATION POINT: Add searchable fields for your entity
      const matchesSearch =
        item.name?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.status?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }
    return true;
  });

  // ===== EVENT HANDLERS =====

  const handleRowClick = (item: {{ENTITY_NAME}}) => {
    setSelectedRowId(String(item.id));
    setSelected{{ENTITY_NAME}}(item);
    setModalType('details');
  };

  const handleModalClose = async () => {
    setModalType(null);
    setSelected{{ENTITY_NAME}}(null);

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

  // CUSTOMIZATION POINT: Add action handlers specific to your entity
  const handleEdit = (item: {{ENTITY_NAME}}) => {
    setSelected{{ENTITY_NAME}}(item);
    setModalType('edit');
  };

  const handleDelete = (item: {{ENTITY_NAME}}) => {
    setSelected{{ENTITY_NAME}}(item);
    setModalType('delete');
  };

  // ===== DATATABLE CONFIGURATION =====

  // CUSTOMIZATION POINT: Define columns based on your entity structure
  const columns: DataTableColumn[] = [
    {
      id: 'id',
      label: 'ID',
      visible: true,
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
      label: 'NAME',
      visible: true,
      align: 'left'
    },
    {
      id: 'status',
      label: 'STATUS',
      visible: true,
      align: 'center',
      render: (value) => (
        <Badge size="compact" variant={getStatusVariant(value)}>
          {getStatusText(value)}
        </Badge>
      ),
      filterFn: (value, filterValue) => {
        const statusText = getStatusText(value).toLowerCase();
        return statusText.includes(filterValue.toLowerCase());
      }
    },
    // CUSTOMIZATION POINT: Add more columns as needed
    {
      id: 'created_at',
      label: 'CREATED',
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
      label: 'ACTIONS',
      visible: true,
      locked: true,
      align: 'center',
      filterable: false,
      sortable: false,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          {/* CUSTOMIZATION POINT: Add action buttons based on status/permissions */}
          <Button
            size="compact"
            variant="primary"
            icon={<Icon name="edit" />}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
          >
            Edit
          </Button>
          <Button
            size="compact"
            variant="danger"
            icon={<Icon name="trash" />}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  // ===== HELPER FUNCTIONS =====

  // CUSTOMIZATION POINT: Implement status badge variant mapping
  const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'danger' | 'secondary' => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'inactive': return 'secondary';
      case 'error': return 'danger';
      default: return 'secondary';
    }
  };

  // CUSTOMIZATION POINT: Implement status display text mapping
  const getStatusText = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'active': return 'Active';
      case 'pending': return 'Pending';
      case 'inactive': return 'Inactive';
      case 'error': return 'Error';
      default: return status || '-';
    }
  };

  // ===== RENDER =====

  const shouldShowLoading = isLoading || (location.state?.open{{ENTITY_NAME}}Id && !selected{{ENTITY_NAME}});

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
          padding: '8px var(--space-4)',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 'var(--font-size-xl)',
            fontWeight: '600'
          }}>
            {{ENTITY_NAME_PLURAL}}
          </h2>
        </div>

        {/* Action Buttons Row */}
        <div style={{
          padding: '8px var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-gray-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            {/* CUSTOMIZATION POINT: Add alert/notification buttons */}
          </div>

          <Button
            onClick={() => setShowAddModal(true)}
            variant="primary"
            icon={<Icon name="plus" />}
            size="sm"
          >
            Add {{ENTITY_NAME}}
          </Button>
        </div>

        {/* Search Bar */}
        <div style={{
          paddingTop: '0px',
          paddingBottom: '8px',
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
            <FormInput
              type="text"
              placeholder="Search {{ENTITY_NAME_LOWER_PLURAL}}..."
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
                    sessionStorage.removeItem('{{ENTITY_NAME_LOWER}}List_searchTerm');
                  } catch (error) {
                    console.error('Failed to clear search:', error);
                  }
                }}
                variant="secondary"
                size="sm"
              >
                Clear Search
              </Button>
            )}

            {/* CUSTOMIZATION POINT: Add filter toggles/checkboxes */}
          </div>
        </div>

        {/* DataTable */}
        <DataTable
          tableId="{{ENTITY_NAME_LOWER}}-list"
          columns={columns}
          data={filtered{{ENTITY_NAME_PLURAL}}}
          onRowClick={handleRowClick}
          itemsPerPage={50}
          isLoading={isLoading}
          emptyMessage="No {{ENTITY_NAME_LOWER_PLURAL}} found"
          resetKey={searchParams.get('filter_param') || 'all'}
        />
      </div>

      {/* Modals */}
      {modalType && selected{{ENTITY_NAME}} && (
        <{{ENTITY_NAME}}ModalManager
          selected{{ENTITY_NAME}}={selected{{ENTITY_NAME}}}
          modalType={modalType}
          onClose={handleModalClose}
          onRefetch={refetch}
        />
      )}

      {/* CUSTOMIZATION POINT: Add additional modals (create, bulk actions, etc.) */}
    </div>
  );
}
