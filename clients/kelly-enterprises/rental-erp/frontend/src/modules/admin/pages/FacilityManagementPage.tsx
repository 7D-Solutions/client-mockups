import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingSpinner, Button, Modal, FormInput, FormCheckbox, Badge, useToast, DataTable } from '../../../infrastructure/components';
import type { DataTableColumn } from '../../../infrastructure/components';
import { useColumnManager } from '../../../infrastructure/hooks';
import { apiClient } from '../../../infrastructure/api/client';
import { Facility } from '../../inventory/types';

export const FacilityManagementPage: React.FC = () => {
  const location = useLocation();
  const toast = useToast();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [facilityToDelete, setFacilityToDelete] = useState<Facility | null>(null);
  const [formData, setFormData] = useState({
    facility_code: '',
    facility_name: '',
    is_active: true,
    display_order: 0
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  const loadFacilities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ success: boolean; data: Facility[] }>('/api/facilities');
      if (response.success && response.data) {
        setFacilities(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load facilities:', error);
      toast.error('Load Error', error.message || 'Failed to load facilities');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.facility_code.trim()) {
      errors.facility_code = 'Facility code is required';
    }
    if (!formData.facility_name.trim()) {
      errors.facility_name = 'Facility name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (facility?: Facility) => {
    if (facility) {
      setSelectedFacility(facility);
      setFormData({
        facility_code: facility.facility_code,
        facility_name: facility.facility_name,
        is_active: facility.is_active,
        display_order: facility.display_order
      });
    } else {
      setSelectedFacility(null);
      setFormData({
        facility_code: '',
        facility_name: '',
        is_active: true,
        display_order: facilities.length
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedFacility(null);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (selectedFacility) {
        // Update existing facility
        const response = await apiClient.put(`/api/facilities/${selectedFacility.id}`, formData);
        if (response.success) {
          toast.success('Facility Updated', 'Facility updated successfully');
          loadFacilities();
          handleCloseModal();
        }
      } else {
        // Create new facility
        const response = await apiClient.post('/api/facilities', formData);
        if (response.success) {
          toast.success('Facility Created', 'Facility created successfully');
          loadFacilities();
          handleCloseModal();
        }
      }
    } catch (error: any) {
      console.error('Failed to save facility:', error);
      toast.error('Save Error', error.message || 'Failed to save facility');
    }
  };

  const handleDeleteClick = (facility: Facility) => {
    setFacilityToDelete(facility);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!facilityToDelete) return;

    try {
      const response = await apiClient.delete(`/api/facilities/${facilityToDelete.id}`);
      if (response.success) {
        toast.success('Facility Deleted', 'Facility deleted successfully');
        loadFacilities();
      }
    } catch (error: any) {
      console.error('Failed to delete facility:', error);
      toast.error('Delete Error', error.message || 'Failed to delete facility');
    } finally {
      setShowDeleteConfirm(false);
      setFacilityToDelete(null);
    }
  };

  // Column definitions
  const columns: DataTableColumn[] = [
    {
      id: 'facility_code',
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
      id: 'facility_name',
      label: 'NAME',
      visible: true,
      align: 'left'
    },
    {
      id: 'building_count',
      label: 'BUILDINGS',
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
      render: (_, facility: Facility) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            onClick={() => handleOpenModal(facility)}
            variant="secondary"
            size="sm"
          >
            Edit
          </Button>
          <Button
            onClick={() => handleDeleteClick(facility)}
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
  const columnManager = useColumnManager('facility-management', columns);

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
            Facility Management
          </h2>
          <Button onClick={() => handleOpenModal()} variant="primary">
            <i className="fas fa-plus" style={{ marginRight: 'var(--space-2)' }} />
            Add Facility
          </Button>
        </div>

        {/* DataTable */}
        <DataTable
          tableId="facility-management"
          columns={columns}
          data={facilities}
          columnManager={columnManager}
          itemsPerPage={50}
          emptyMessage="No facilities found"
          resetKey={location.pathname}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={selectedFacility ? 'Edit Facility' : 'Add Facility'}
        size="sm"
      >
        <form onSubmit={handleSubmit}>
          <Modal.Body padding={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <FormInput
                label="Facility Code"
                value={formData.facility_code}
                onChange={(e) => setFormData({ ...formData, facility_code: e.target.value })}
                required
                error={formErrors.facility_code}
              />
              <FormInput
                label="Facility Name"
                value={formData.facility_name}
                onChange={(e) => setFormData({ ...formData, facility_name: e.target.value })}
                required
                error={formErrors.facility_name}
              />
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
              {selectedFacility ? 'Update' : 'Create'}
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
        title="Delete Facility?"
        size="sm"
      >
        <Modal.Body padding={true}>
          <p>
            Are you sure you want to delete facility "{facilityToDelete?.facility_name}"?
            This will also affect all related buildings and zones.
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
