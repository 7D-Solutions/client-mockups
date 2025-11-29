import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingSpinner, Button, Modal, FormInput, FormSelect, FormCheckbox, Badge, useToast, DataTable } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { apiClient } from '../../../infrastructure/api/client';
import { Zone, Building } from '../../inventory/types';

export const ZoneManagementPage: React.FC = () => {
  const location = useLocation();
  const toast = useToast();
  const [zones, setZones] = useState<Zone[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);
  const [buildingFilter, setBuildingFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    zone_code: '',
    zone_name: '',
    building_id: 0,
    is_active: true,
    display_order: 0
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  const loadBuildings = useCallback(async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: Building[] }>('/api/buildings');
      if (response.success && response.data) {
        setBuildings(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load buildings:', error);
      toast.error('Load Error', error.message || 'Failed to load buildings');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadZones = useCallback(async () => {
    try {
      setLoading(true);
      const url = buildingFilter ? `/api/zones?buildingId=${buildingFilter}` : '/api/zones';
      const response = await apiClient.get<{ success: boolean; data: Zone[] }>(url);
      if (response.success && response.data) {
        setZones(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load zones:', error);
      toast.error('Load Error', error.message || 'Failed to load zones');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingFilter]);

  useEffect(() => {
    loadBuildings();
    loadZones();
  }, [loadBuildings, loadZones]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.zone_code.trim()) {
      errors.zone_code = 'Zone code is required';
    }
    if (!formData.zone_name.trim()) {
      errors.zone_name = 'Zone name is required';
    }
    if (!formData.building_id) {
      errors.building_id = 'Building is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (zone?: Zone) => {
    if (zone) {
      setSelectedZone(zone);
      setFormData({
        zone_code: zone.zone_code,
        zone_name: zone.zone_name,
        building_id: zone.building_id,
        is_active: zone.is_active,
        display_order: zone.display_order
      });
    } else {
      setSelectedZone(null);
      setFormData({
        zone_code: '',
        zone_name: '',
        building_id: buildings.length > 0 ? buildings[0].id : 0,
        is_active: true,
        display_order: zones.length
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedZone(null);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (selectedZone) {
        // Update existing zone
        const response = await apiClient.put(`/api/zones/${selectedZone.id}`, formData);
        if (response.success) {
          toast.success('Zone Updated', 'Zone updated successfully');
          loadZones();
          handleCloseModal();
        }
      } else {
        // Create new zone
        const response = await apiClient.post('/api/zones', formData);
        if (response.success) {
          toast.success('Zone Created', 'Zone created successfully');
          loadZones();
          handleCloseModal();
        }
      }
    } catch (error: any) {
      console.error('Failed to save zone:', error);
      toast.error('Save Error', error.message || 'Failed to save zone');
    }
  };

  const handleDeleteClick = (zone: Zone) => {
    setZoneToDelete(zone);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!zoneToDelete) return;

    try {
      const response = await apiClient.delete(`/api/zones/${zoneToDelete.id}`);
      if (response.success) {
        toast.success('Zone Deleted', 'Zone deleted successfully');
        loadZones();
      }
    } catch (error: any) {
      console.error('Failed to delete zone:', error);
      toast.error('Delete Error', error.message || 'Failed to delete zone');
    } finally {
      setShowDeleteConfirm(false);
      setZoneToDelete(null);
    }
  };

  // Column definitions
  const columns: DataTableColumn[] = [
    {
      id: 'zone_code',
      label: 'CODE',
      visible: true,
      locked: true,
      align: 'left',
      render: (value: string) => (
        <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
          {value}
        </span>
      )
    },
    {
      id: 'zone_name',
      label: 'NAME',
      visible: true,
      align: 'left'
    },
    {
      id: 'building_name',
      label: 'BUILDING',
      visible: true,
      align: 'left'
    },
    {
      id: 'facility_name',
      label: 'FACILITY',
      visible: true,
      align: 'left'
    },
    {
      id: 'location_count',
      label: 'LOCATIONS',
      visible: true,
      align: 'center',
      render: (value: number) => value || 0
    },
    {
      id: 'is_active',
      label: 'STATUS',
      visible: true,
      align: 'center',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'secondary'} size="compact">
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      id: 'display_order',
      label: 'ORDER',
      visible: true,
      align: 'center'
    },
    {
      id: 'actions',
      filterable: false,
      label: 'ACTIONS',
      visible: true,
      align: 'center',
      sortable: false,
      render: (_, zone: Zone) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            onClick={() => handleOpenModal(zone)}
            variant="secondary"
            size="sm"
          >
            Edit
          </Button>
          <Button
            onClick={() => handleDeleteClick(zone)}
            variant="danger"
            size="sm"
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  // Column manager for table customization
  const columnManager = useColumnManager('zone-management', columns);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner size="lg" />
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
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: '600' }}>
            Zone Management
          </h2>
          <Button onClick={() => handleOpenModal()} variant="primary">
            <i className="fas fa-plus" style={{ marginRight: 'var(--space-2)' }} />
            Add Zone
          </Button>
        </div>

        {/* Filter */}
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-gray-50)' }}>
          <FormSelect
            label="Filter by Building"
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            style={{ maxWidth: '300px' }}
          >
            <option value="">All Buildings</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.building_name} ({building.facility_name})
              </option>
            ))}
          </FormSelect>
        </div>

        {/* DataTable */}
        <DataTable
          tableId="zone-management"
          columns={columns}
          data={zones}
          columnManager={columnManager}
          itemsPerPage={50}
          emptyMessage="No zones found"
          resetKey={location.pathname}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={selectedZone ? 'Edit Zone' : 'Add Zone'}
        size="sm"
      >
        <form onSubmit={handleSubmit}>
          <Modal.Body padding={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <FormInput
                label="Zone Code"
                value={formData.zone_code}
                onChange={(e) => setFormData({ ...formData, zone_code: e.target.value })}
                required
                error={formErrors.zone_code}
              />
              <FormInput
                label="Zone Name"
                value={formData.zone_name}
                onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })}
                required
                error={formErrors.zone_name}
              />
              <FormSelect
                label="Building"
                value={formData.building_id.toString()}
                onChange={(e) => setFormData({ ...formData, building_id: parseInt(e.target.value) })}
                required
                error={formErrors.building_id}
              >
                <option value="">Select a building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.building_name} ({building.facility_name})
                  </option>
                ))}
              </FormSelect>
              <FormInput
                label="Display Order"
                type="number"
                value={formData.display_order.toString()}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
              <FormCheckbox
                label="Active"
                checked={formData.is_active}
                onChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </Modal.Body>
          <Modal.Actions>
            <Button type="submit" variant="primary" size="sm">
              {selectedZone ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleCloseModal}>
              Cancel
            </Button>
          </Modal.Actions>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Zone?"
        size="sm"
      >
        <Modal.Body padding={true}>
          <p>
            Are you sure you want to delete zone "{zoneToDelete?.zone_name}"?
            This may affect storage locations in this zone.
          </p>
        </Modal.Body>
        <Modal.Actions>
          <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
            Delete
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
        </Modal.Actions>
      </Modal>
    </div>
  );
};
