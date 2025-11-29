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
import type { Payment } from '../types';
import styles from './Payments.module.css';

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState<Partial<Payment>>({
    property_id: 0,
    tenant_id: 0,
    payment_date: '',
    amount: 0,
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
  });

  const columnManager = useColumnManager('payments-table', [
    { id: 'property', label: 'Property', visible: true },
    { id: 'tenant', label: 'Tenant', visible: true },
    { id: 'amount', label: 'Amount', visible: true },
    { id: 'payment_date', label: 'Payment Date', visible: true },
    { id: 'method', label: 'Method', visible: true },
    { id: 'period', label: 'Period', visible: true },
    { id: 'status', label: 'Status', visible: true },
  ]);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const response = await api.get('/rental/payments');
      setPayments(response.data.data);
    } catch (error) {
      console.error('Error loading payments:', handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPayment) {
        await api.put(`/rental/payments/${editingPayment.id}`, formData);
      } else {
        await api.post('/rental/payments', formData);
      }
      setShowModal(false);
      setEditingPayment(null);
      resetForm();
      loadPayments();
    } catch (error) {
      console.error('Error saving payment:', handleApiError(error));
    }
  };

  const handleRowClick = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData(payment);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      property_id: 0,
      tenant_id: 0,
      payment_date: '',
      amount: 0,
      payment_method: 'bank_transfer',
      reference_number: '',
      notes: '',
    });
  };

  const handleAddNew = () => {
    setEditingPayment(null);
    resetForm();
    setShowModal(true);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
  };

  const formatPaymentDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPaymentPeriod = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const columns: DataTableColumn<Payment>[] = [
    {
      key: 'tenant_name',
      header: 'Tenant',
      render: (payment) => payment.tenant_name || 'N/A',
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (payment) => (
        <div className={styles.amountCell}>
          <Icon name="dollar-sign" />
          {formatCurrency(payment.amount)}
        </div>
      ),
    },
    {
      key: 'payment_date',
      header: 'Payment Date',
      render: (payment) => formatPaymentDate(payment.payment_date),
    },
    {
      key: 'period',
      header: 'Period',
      render: (payment) => formatPaymentPeriod(payment.payment_date),
    },
    {
      key: 'payment_method',
      header: 'Method',
      render: (payment) => (
        <span className={styles.methodCell}>
          {payment.payment_method.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <Badge variant="success">Completed</Badge>,
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
    <div className={styles.paymentsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Payments</h1>
          <p className={styles.pageDescription}>Track rent payments</p>
        </div>
        <Button variant="primary" onClick={handleAddNew} icon={<Icon name="plus" />}>
          Record Payment
        </Button>
      </div>

      <DataTable
        tableId="payments-table"
        columns={columns}
        data={payments}
        onRowClick={handleRowClick}
        columnManager={columnManager}
        emptyMessage="No payments found. Record your first payment to get started."
      />

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingPayment ? 'Edit Payment' : 'Record New Payment'}
        >
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <div className={styles.formRow}>
                <FormInput
                  label="Property ID"
                  id="property_id"
                  type="number"
                  value={formData.property_id || 0}
                  onChange={(e) => setFormData({ ...formData, property_id: parseInt(e.target.value) })}
                  required
                  min={1}
                />

                <FormInput
                  label="Tenant ID"
                  id="tenant_id"
                  type="number"
                  value={formData.tenant_id || 0}
                  onChange={(e) => setFormData({ ...formData, tenant_id: parseInt(e.target.value) })}
                  required
                  min={1}
                />
              </div>

              <div className={styles.formRow}>
                <FormInput
                  label="Payment Date"
                  id="payment_date"
                  type="date"
                  value={formData.payment_date || ''}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />

                <FormInput
                  label="Amount"
                  id="amount"
                  type="number"
                  value={formData.amount || 0}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  required
                  min={0}
                  step={0.01}
                />
              </div>

              <div className={styles.formRow}>
                <FormSelect
                  label="Payment Method"
                  id="payment_method"
                  value={formData.payment_method || 'bank_transfer'}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as Payment['payment_method'] })}
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="online">Online</option>
                </FormSelect>

                <FormInput
                  label="Reference Number"
                  id="reference_number"
                  value={formData.reference_number || ''}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                />
              </div>

              <FormTextarea
                label="Notes"
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </Modal.Body>

            <Modal.Actions>
              <CloseButton onClick={() => setShowModal(false)} />
              <SaveButton type="submit">
                {editingPayment ? 'Update' : 'Record'} Payment
              </SaveButton>
            </Modal.Actions>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Payments;
