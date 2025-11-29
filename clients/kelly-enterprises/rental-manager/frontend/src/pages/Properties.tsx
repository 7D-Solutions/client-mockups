import { useEffect, useState } from 'react';
import api, { handleApiError } from '../lib/api';
import { Icon } from '../infrastructure/components/Icon';
import { Button } from '../infrastructure/components/Button';
import { Modal } from '../infrastructure/components/Modal';
import { LoadingSpinner } from '../infrastructure/components/LoadingSpinner';
import { DataTable, DataTableColumn } from '../infrastructure/components/DataTable';
import { FormInput } from '../infrastructure/components/FormInput';
import { FormSelect } from '../infrastructure/components/FormSelect';
import { FormTextarea } from '../infrastructure/components/FormTextarea';
import { Badge } from '../infrastructure/components/Badge';
import { CloseButton, SaveButton } from '../infrastructure/components/SemanticButtons';
import { useColumnManager } from '../infrastructure/hooks';
import type { Property } from '../types';
import styles from './Properties.module.css';

const Properties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<Partial<Property>>({
    address: '',
    type: 'single_family',
    bedrooms: 0,
    bathrooms: 0,
    square_feet: 0,
    rent_amount: 0,
    status: 'vacant',
  });

  // Initialize column manager
  const columnManager = useColumnManager('properties-table', [
    { id: 'address', label: 'Address', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'bedrooms', label: 'Bed/Bath', visible: true },
    { id: 'square_feet', label: 'Sq Ft', visible: true },
    { id: 'rent_amount', label: 'Rent', visible: true },
    { id: 'status', label: 'Status', visible: true },
  ]);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const response = await api.get('/rental/properties');
      setProperties(response.data.data);
    } catch (error) {
      console.error('Error loading properties:', handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProperty) {
        await api.put(`/rental/properties/${editingProperty.id}`, formData);
      } else {
        await api.post('/rental/properties', formData);
      }
      setShowModal(false);
      setEditingProperty(null);
      resetForm();
      loadProperties();
    } catch (error) {
      console.error('Error saving property:', handleApiError(error));
    }
  };

  const handleRowClick = (property: Property) => {
    setEditingProperty(property);
    setFormData(property);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }
    try {
      await api.delete(`/rental/properties/${id}`);
      loadProperties();
    } catch (error) {
      console.error('Error deleting property:', handleApiError(error));
    }
  };

  const resetForm = () => {
    setFormData({
      address: '',
      type: 'single_family',
      bedrooms: 0,
      bathrooms: 0,
      square_feet: 0,
      rent_amount: 0,
      status: 'vacant',
    });
  };

  const handleAddNew = () => {
    setEditingProperty(null);
    resetForm();
    setShowModal(true);
  };

  const columns: DataTableColumn<Property>[] = [
    {
      key: 'address',
      header: 'Address',
      render: (property) => (
        <div className={styles.addressCell}>
          <Icon name="home" />
          {property.address}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (property) => (
        <span className={styles.typeCell}>
          {property.type.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'bedrooms',
      header: 'Bed/Bath',
      render: (property) => `${property.bedrooms}/${property.bathrooms}`,
    },
    {
      key: 'square_feet',
      header: 'Sq Ft',
      render: (property) => property.square_feet?.toLocaleString() || 'N/A',
    },
    {
      key: 'rent_amount',
      header: 'Rent',
      render: (property) => `$${property.rent_amount.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (property) => (
        <Badge
          variant={
            property.status === 'occupied'
              ? 'success'
              : property.status === 'vacant'
              ? 'warning'
              : 'default'
          }
        >
          {property.status}
        </Badge>
      ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={styles.propertiesPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Properties</h1>
          <p className={styles.pageDescription}>Manage your rental properties</p>
        </div>
        <Button variant="primary" onClick={handleAddNew} icon={<Icon name="plus" />}>
          Add Property
        </Button>
      </div>

      <DataTable
        tableId="properties-table"
        columns={columns}
        data={properties}
        onRowClick={handleRowClick}
        emptyMessage="No properties found. Add your first property to get started."
        columnManager={columnManager}
      />

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingProperty ? 'Edit Property' : 'Add New Property'}
        >
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <FormInput
                label="Address"
                id="address"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />

              <div className={styles.formRow}>
                <FormSelect
                  label="Type"
                  id="type"
                  value={formData.type || 'single_family'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Property['type'] })}
                  required
                >
                  <option value="single_family">Single Family</option>
                  <option value="multi_family">Multi Family</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="apartment">Apartment</option>
                  <option value="commercial">Commercial</option>
                </FormSelect>

                <FormSelect
                  label="Status"
                  id="status"
                  value={formData.status || 'vacant'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Property['status'] })}
                  required
                >
                  <option value="vacant">Vacant</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </FormSelect>
              </div>

              <div className={styles.formRow}>
                <FormInput
                  label="Bedrooms"
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms || 0}
                  onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                  required
                  min={0}
                />

                <FormInput
                  label="Bathrooms"
                  id="bathrooms"
                  type="number"
                  value={formData.bathrooms || 0}
                  onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) })}
                  required
                  min={0}
                  step={0.5}
                />
              </div>

              <div className={styles.formRow}>
                <FormInput
                  label="Square Feet"
                  id="square_feet"
                  type="number"
                  value={formData.square_feet || 0}
                  onChange={(e) => setFormData({ ...formData, square_feet: parseInt(e.target.value) })}
                  min={0}
                />

                <FormInput
                  label="Rent Amount"
                  id="rent_amount"
                  type="number"
                  value={formData.rent_amount || 0}
                  onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) })}
                  required
                  min={0}
                  step={0.01}
                />
              </div>

              <FormTextarea
                label="Description"
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </Modal.Body>

            <Modal.Actions>
              <CloseButton onClick={() => setShowModal(false)} />
              <SaveButton type="submit">
                {editingProperty ? 'Update' : 'Create'} Property
              </SaveButton>
            </Modal.Actions>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Properties;
