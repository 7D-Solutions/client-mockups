import { useEffect, useState } from 'react';
import api, { handleApiError } from '../lib/api';
import type { Tenant } from '../types';
import { Icon } from '../infrastructure/components/Icon';
import { Button } from '../infrastructure/components/Button';
import { Modal } from '../infrastructure/components/Modal';
import { LoadingSpinner } from '../infrastructure/components/LoadingSpinner';
import { DataTable, DataTableColumn } from '../infrastructure/components/DataTable';
import { FormInput } from '../infrastructure/components/FormInput';
import { FormSelect } from '../infrastructure/components/FormSelect';
import { FormTextarea } from '../infrastructure/components/FormTextarea';
import { Badge } from '../infrastructure/components/Badge';
import { CloseButton, SaveButton, DeleteButton } from '../infrastructure/components/SemanticButtons';
import { useColumnManager } from '../infrastructure/hooks';
import styles from './Tenants.module.css';

const Tenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    property_id: '',
    lease_start_date: '',
    lease_end_date: '',
    monthly_rent: '',
    security_deposit: '',
    status: 'active' as 'active' | 'inactive'
  });

  const columnManager = useColumnManager('tenants-table', [
    { id: 'name', label: 'Name', visible: true },
    { id: 'property', label: 'Property', visible: true },
    { id: 'email', label: 'Email', visible: true },
    { id: 'phone', label: 'Phone', visible: true },
    { id: 'lease_start', label: 'Lease Start', visible: true },
    { id: 'lease_end', label: 'Lease End', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'actions', label: 'Actions', visible: true },
  ]);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const response = await api.get('/rental/tenants');
      setTenants(response.data.data);
    } catch (error) {
      console.error('Error loading tenants:', handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      property_id: tenant.property_id.toString(),
      lease_start_date: tenant.lease_start_date,
      lease_end_date: tenant.lease_end_date,
      monthly_rent: tenant.monthly_rent.toString(),
      security_deposit: tenant.security_deposit.toString(),
      status: tenant.status
    });
    setIsEditModalOpen(true);
  };

  const handleAddTenant = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      property_id: '',
      lease_start_date: '',
      lease_end_date: '',
      monthly_rent: '',
      security_deposit: '',
      status: 'active'
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async () => {
    // TODO: Implement save logic
    console.log('Saving tenant:', formData);
  };

  const handleDelete = async () => {
    // TODO: Implement delete logic
    console.log('Deleting tenant:', selectedTenant);
    setIsDeleteModalOpen(false);
  };

  const columns: DataTableColumn<Tenant>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (tenant) => (
        <div className={styles.nameCell}>
          <Icon name="user" />
          {tenant.name}
        </div>
      )
    },
    {
      key: 'property_address',
      header: 'Property',
      render: (tenant) => (
        <div className={styles.propertyCell}>
          <Icon name="home" />
          {tenant.property_address}
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email'
    },
    {
      key: 'phone',
      header: 'Phone'
    },
    {
      key: 'lease_start_date',
      header: 'Lease Start',
      render: (tenant) => new Date(tenant.lease_start_date).toLocaleDateString()
    },
    {
      key: 'lease_end_date',
      header: 'Lease End',
      render: (tenant) => new Date(tenant.lease_end_date).toLocaleDateString()
    },
    {
      key: 'status',
      header: 'Status',
      render: (tenant) => (
        <Badge variant={tenant.status === 'active' ? 'success' : 'secondary'}>
          {tenant.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (tenant) => (
        <DeleteButton
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(tenant);
          }}
          size="small"
          icon={<Icon name="trash" />}
        />
      )
    }
  ];

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={styles.tenantsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Tenants</h1>
          <p className={styles.pageDescription}>Manage your tenants</p>
        </div>
        <Button onClick={handleAddTenant} variant="primary" icon={<Icon name="plus" />}>
          Add Tenant
        </Button>
      </div>

      <DataTable
        tableId="tenants-table"
        data={tenants}
        columns={columns}
        onRowClick={handleRowClick}
        columnManager={columnManager}
      />

      {/* Add Tenant Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Tenant"
      >
        <Modal.Body>
          <div className={styles.formRow}>
            <FormInput
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <FormInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className={styles.formRow}>
            <FormInput
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <FormInput
              label="Property ID"
              type="number"
              value={formData.property_id}
              onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
              required
            />
          </div>
          <div className={styles.formRow}>
            <FormInput
              label="Lease Start Date"
              type="date"
              value={formData.lease_start_date}
              onChange={(e) => setFormData({ ...formData, lease_start_date: e.target.value })}
              required
            />
            <FormInput
              label="Lease End Date"
              type="date"
              value={formData.lease_end_date}
              onChange={(e) => setFormData({ ...formData, lease_end_date: e.target.value })}
              required
            />
          </div>
          <div className={styles.formRow}>
            <FormInput
              label="Monthly Rent"
              type="number"
              value={formData.monthly_rent}
              onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
              required
            />
            <FormInput
              label="Security Deposit"
              type="number"
              value={formData.security_deposit}
              onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
              required
            />
          </div>
          <FormSelect
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            required
          />
        </Modal.Body>
        <Modal.Actions>
          <SaveButton onClick={handleSave} />
          <CloseButton onClick={() => setIsAddModalOpen(false)} />
        </Modal.Actions>
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Tenant"
      >
        <Modal.Body>
          <div className={styles.formRow}>
            <FormInput
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <FormInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className={styles.formRow}>
            <FormInput
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <FormInput
              label="Property ID"
              type="number"
              value={formData.property_id}
              onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
              required
            />
          </div>
          <div className={styles.formRow}>
            <FormInput
              label="Lease Start Date"
              type="date"
              value={formData.lease_start_date}
              onChange={(e) => setFormData({ ...formData, lease_start_date: e.target.value })}
              required
            />
            <FormInput
              label="Lease End Date"
              type="date"
              value={formData.lease_end_date}
              onChange={(e) => setFormData({ ...formData, lease_end_date: e.target.value })}
              required
            />
          </div>
          <div className={styles.formRow}>
            <FormInput
              label="Monthly Rent"
              type="number"
              value={formData.monthly_rent}
              onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
              required
            />
            <FormInput
              label="Security Deposit"
              type="number"
              value={formData.security_deposit}
              onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
              required
            />
          </div>
          <FormSelect
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            required
          />
        </Modal.Body>
        <Modal.Actions>
          <SaveButton onClick={handleSave} />
          <CloseButton onClick={() => setIsEditModalOpen(false)} />
        </Modal.Actions>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Tenant"
      >
        <Modal.Body>
          <p>Are you sure you want to delete tenant <strong>{selectedTenant?.name}</strong>?</p>
          <p>This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Actions>
          <DeleteButton onClick={handleDelete} />
          <CloseButton onClick={() => setIsDeleteModalOpen(false)} />
        </Modal.Actions>
      </Modal>
    </div>
  );
};

export default Tenants;
