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
import type { Application } from '../types';
import styles from './Applications.module.css';

const Applications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [formData, setFormData] = useState<Partial<Application>>({
    applicant_name: '',
    email: '',
    phone: '',
    application_date: new Date().toISOString().split('T')[0],
    status: 'pending',
  });

  const columnManager = useColumnManager('applications-table', [
    { id: 'applicant_name', label: 'Applicant', visible: true },
    { id: 'property_address', label: 'Property', visible: true },
    { id: 'email', label: 'Email', visible: true },
    { id: 'phone', label: 'Phone', visible: true },
    { id: 'application_date', label: 'Application Date', visible: true },
    { id: 'status', label: 'Status', visible: true },
  ]);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await api.get('/rental/applications');
      setApplications(response.data.data);
    } catch (error) {
      console.error('Error loading applications:', handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingApplication) {
        await api.put(`/rental/applications/${editingApplication.id}`, formData);
      } else {
        await api.post('/rental/applications', formData);
      }
      setShowModal(false);
      setEditingApplication(null);
      resetForm();
      loadApplications();
    } catch (error) {
      console.error('Error saving application:', handleApiError(error));
    }
  };

  const handleRowClick = (application: Application) => {
    setEditingApplication(application);
    setFormData(application);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      applicant_name: '',
      email: '',
      phone: '',
      application_date: new Date().toISOString().split('T')[0],
      status: 'pending',
    });
  };

  const handleAddNew = () => {
    setEditingApplication(null);
    resetForm();
    setShowModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return 'check-circle';
      case 'rejected':
        return 'x-circle';
      default:
        return 'clock';
    }
  };

  const columns: DataTableColumn<Application>[] = [
    {
      key: 'applicant_name',
      header: 'Applicant',
      render: (application) => (
        <div className={styles.applicantCell}>
          <Icon name="file-text" />
          {application.applicant_name}
        </div>
      ),
    },
    {
      key: 'property_address',
      header: 'Property',
      render: (application) => application.property_address || '-',
    },
    {
      key: 'email',
      header: 'Email',
      render: (application) => application.email,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (application) => application.phone,
    },
    {
      key: 'application_date',
      header: 'Application Date',
      render: (application) => new Date(application.application_date).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      render: (application) => (
        <div className={styles.statusCell}>
          <Icon name={getStatusIcon(application.status)} />
          <Badge
            variant={
              application.status === 'approved'
                ? 'success'
                : application.status === 'rejected'
                ? 'danger'
                : 'warning'
            }
          >
            {application.status}
          </Badge>
        </div>
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
    <div className={styles.applicationsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Rental Applications</h1>
          <p className={styles.pageDescription}>Manage tenant applications</p>
        </div>
        <Button variant="primary" onClick={handleAddNew} icon={<Icon name="plus" />}>
          New Application
        </Button>
      </div>

      <DataTable
        tableId="applications-table"
        columns={columns}
        data={applications}
        onRowClick={handleRowClick}
        columnManager={columnManager}
        emptyMessage="No applications found. Add your first application to get started."
      />

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingApplication ? 'Application Details' : 'New Application'}
        >
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <FormInput
                label="Applicant Name"
                id="applicant_name"
                value={formData.applicant_name || ''}
                onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                required
              />

              <div className={styles.formRow}>
                <FormInput
                  label="Email"
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />

                <FormInput
                  label="Phone"
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <FormInput
                  label="Application Date"
                  id="application_date"
                  type="date"
                  value={formData.application_date || ''}
                  onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                  required
                />

                <FormSelect
                  label="Status"
                  id="status"
                  value={formData.status || 'pending'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Application['status'] })}
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </FormSelect>
              </div>

              <FormInput
                label="Current Address"
                id="current_address"
                value={formData.current_address || ''}
                onChange={(e) => setFormData({ ...formData, current_address: e.target.value })}
              />

              <FormInput
                label="Current Employer"
                id="current_employer"
                value={formData.current_employer || ''}
                onChange={(e) => setFormData({ ...formData, current_employer: e.target.value })}
              />

              <div className={styles.formRow}>
                <FormInput
                  label="Monthly Income"
                  id="monthly_income"
                  type="number"
                  value={formData.monthly_income || 0}
                  onChange={(e) => setFormData({ ...formData, monthly_income: parseFloat(e.target.value) })}
                  min={0}
                  step={0.01}
                />

                <FormInput
                  label="Credit Score"
                  id="credit_score"
                  type="number"
                  value={formData.credit_score || ''}
                  onChange={(e) => setFormData({ ...formData, credit_score: parseInt(e.target.value) })}
                  min={300}
                  max={850}
                />
              </div>

              <FormTextarea
                label="Notes"
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Additional information about the application..."
              />
            </Modal.Body>

            <Modal.Actions>
              <CloseButton onClick={() => setShowModal(false)} />
              <SaveButton type="submit">
                {editingApplication ? 'Update' : 'Create'} Application
              </SaveButton>
            </Modal.Actions>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Applications;
