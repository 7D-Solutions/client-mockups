import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingSpinner, Button, Modal, FormInput, FormSelect, FormCheckbox, Badge, useToast, DataTable } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { apiClient } from '../../../infrastructure/api/client';
import { Building, Facility } from '../../inventory/types';

export const BuildingManagementPage: React.FC = () => {
  const location = useLocation();
  const toast = useToast();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null);
  const [facilityFilter, setFacilityFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    building_code: '',
    building_name: '',
    facility_id: 0,
    is_active: true,
    display_order: 0
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  const loadFacilities = useCallback(async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: Facility[] }>('/api/facilities');
      if (response.success && response.data) {
        setFacilities(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load facilities:', error);
      toast.error('Load Error', error.message || 'Failed to load facilities');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBuildings = useCallback(async () => {
    try {
      setLoading(true);
      const url = facilityFilter ? `/api/buildings?facilityId=${facilityFilter}` : '/api/buildings';
      const response = await apiClient.get<{ success: boolean; data: Building[] }>(url);
      if (response.success && response.data) {
        setBuildings(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load buildings:', error);
      toast.error('Load Error', error.message || 'Failed to load buildings');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityFilter]);

  useEffect(() => {
    loadFacilities();
    loadBuildings();
  }, [loadFacilities, loadBuildings]);

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.building_code.trim()) {
      errors.building_code = 'Building code is required';
    }
    if (!formData.building_name.trim()) {
      errors.building_name = 'Building name is required';
    }
    if (!formData.facility_id) {
      errors.facility_id = 'Facility is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (building?: Building) => {
    if (building) {
      setSelectedBuilding(building);
      setFormData({
        building_code: building.building_code,
        building_name: building.building_name,
        facility_id: building.facility_id,
        is_active: building.is_active,
        display_order: building.display_order
      });
    } else {
      setSelectedBuilding(null);
      setFormData({
        building_code: '',
        building_name: '',
        facility_id: facilities.length > 0 ? facilities[0].id : 0,
        is_active: true,
        display_order: buildings.length
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBuilding(null);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (selectedBuilding) {
        // Update existing building
        const response = await apiClient.put(`/api/buildings/${selectedBuilding.id}`, formData);
        if (response.success) {
          toast.success('Building Updated', 'Building updated successfully');
          loadBuildings();
          handleCloseModal();
        }
      } else {
        // Create new building
        const response = await apiClient.post('/api/buildings', formData);
        if (response.success) {
          toast.success('Building Created', 'Building created successfully');
          loadBuildings();
          handleCloseModal();
        }
      }
    } catch (error: any) {
      console.error('Failed to save building:', error);
      toast.error('Save Error', error.message || 'Failed to save building');
    }
  };

  const handleDeleteClick = (building: Building) => {
    setBuildingToDelete(building);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!buildingToDelete) return;

    try {
      const response = await apiClient.delete(`/api/buildings/${buildingToDelete.id}`);
      if (response.success) {
        toast.success('Building Deleted', 'Building deleted successfully');
        loadBuildings();
      }
    } catch (error: any) {
      console.error('Failed to delete building:', error);
      toast.error('Delete Error', error.message || 'Failed to delete building');
    } finally {
      setShowDeleteConfirm(false);
      setBuildingToDelete(null);
    }
  };

  // Column definitions
  const columns: DataTableColumn[] = [
    {
      id: 'building_code',
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
      id: 'building_name',
      label: 'NAME',
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
      id: 'zone_count',
      label: 'ZONES',
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
      render: (_, building: Building) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            onClick={() => handleOpenModal(building)}
            variant="secondary"
            size="sm"
          >
            Edit
          </Button>
          <Button
            onClick={() => handleDeleteClick(building)}
            variant="danger"
            size="sm"
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  const columnManager = useColumnManager('building-management', columns);

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
            Building Management
          </h2>
          <Button onClick={() => handleOpenModal()} variant="primary">
            <i className="fas fa-plus" style={{ marginRight: 'var(--space-2)' }} />
            Add Building
          </Button>
        </div>

        {/* Filter */}
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-gray-50)' }}>
          <FormSelect
            label="Filter by Facility"
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            style={{ maxWidth: '300px' }}
          >
            <option value="">All Facilities</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.facility_name}
              </option>
            ))}
          </FormSelect>
        </div>

        {/* DataTable */}
        <DataTable
          tableId="building-management"
          columns={columns}
          data={buildings}
          columnManager={columnManager}
          itemsPerPage={50}
          emptyMessage="No buildings found"
          resetKey={location.pathname}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={selectedBuilding ? 'Edit Building' : 'Add Building'}
        size="sm"
      >
        <form onSubmit={handleSubmit}>
          <Modal.Body padding={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <FormInput
                label="Building Code"
                value={formData.building_code}
                onChange={(e) => setFormData({ ...formData, building_code: e.target.value })}
                required
                error={formErrors.building_code}
              />
              <FormInput
                label="Building Name"
                value={formData.building_name}
                onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                required
                error={formErrors.building_name}
              />
              <FormSelect
                label="Facility"
                value={formData.facility_id.toString()}
                onChange={(e) => setFormData({ ...formData, facility_id: parseInt(e.target.value) })}
                required
                error={formErrors.facility_id}
              >
                <option value="">Select a facility</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.facility_name}
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
              {selectedBuilding ? 'Update' : 'Create'}
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
        title="Delete Building?"
        size="sm"
      >
        <Modal.Body padding={true}>
          <p>
            Are you sure you want to delete building "{buildingToDelete?.building_name}"?
            This will also affect all related zones.
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
