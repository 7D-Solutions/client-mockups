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
import type { Expense } from '../types';
import styles from './Expenses.module.css';

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<Partial<Expense>>({
    property_id: 0,
    date: new Date().toISOString().split('T')[0],
    category: 'maintenance',
    vendor: '',
    amount: 0,
    description: '',
    payment_method: 'cash',
  });

  const columnManager = useColumnManager('expenses-table', [
    { id: 'property_address', label: 'Property', visible: true },
    { id: 'category', label: 'Category', visible: true },
    { id: 'description', label: 'Description', visible: true },
    { id: 'amount', label: 'Amount', visible: true },
    { id: 'date', label: 'Date', visible: true },
    { id: 'payment_method', label: 'Payment Method', visible: true },
    { id: 'receipt', label: 'Receipt', visible: true },
  ]);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const response = await api.get('/rental/expenses');
      setExpenses(response.data.data);
    } catch (error) {
      console.error('Error loading expenses:', handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await api.put(`/rental/expenses/${editingExpense.id}`, formData);
      } else {
        await api.post('/rental/expenses', formData);
      }
      setShowModal(false);
      setEditingExpense(null);
      resetForm();
      loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', handleApiError(error));
    }
  };

  const handleRowClick = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData(expense);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      property_id: 0,
      date: new Date().toISOString().split('T')[0],
      category: 'maintenance',
      vendor: '',
      amount: 0,
      description: '',
      payment_method: 'cash',
    });
  };

  const handleAddNew = () => {
    setEditingExpense(null);
    resetForm();
    setShowModal(true);
  };

  const columns: DataTableColumn<Expense>[] = [
    {
      key: 'property_address',
      header: 'Property',
      render: (expense) => expense.property_address || 'N/A',
    },
    {
      key: 'category',
      header: 'Category',
      render: (expense) => (
        <span className={styles.categoryCell}>
          {expense.category.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (expense) => expense.description || 'N/A',
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (expense) => (
        <div className={styles.amountCell}>
          -${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (expense) => new Date(expense.date).toLocaleDateString(),
    },
    {
      key: 'payment_method',
      header: 'Payment Method',
      render: (expense) => (
        <span className={styles.paymentMethodCell}>
          {expense.payment_method.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'receipt',
      header: 'Receipt',
      render: (expense) => (
        expense.receipt_file_name ? (
          <Badge variant="success">
            <Icon name="file-alt" />
            Yes
          </Badge>
        ) : (
          <Badge variant="default">No</Badge>
        )
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
    <div className={styles.expensesPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Expenses</h1>
          <p className={styles.pageDescription}>Track property expenses</p>
        </div>
        <Button variant="primary" onClick={handleAddNew} icon={<Icon name="plus" />}>
          Add Expense
        </Button>
      </div>

      <DataTable
        tableId="expenses-table"
        columns={columns}
        data={expenses}
        onRowClick={handleRowClick}
        columnManager={columnManager}
        emptyMessage="No expenses found. Add your first expense to get started."
      />

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
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
                  label="Date"
                  id="date"
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <FormSelect
                  label="Category"
                  id="category"
                  value={formData.category || 'maintenance'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
                  required
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="repair">Repair</option>
                  <option value="utilities">Utilities</option>
                  <option value="insurance">Insurance</option>
                  <option value="property_tax">Property Tax</option>
                  <option value="hoa_fees">HOA Fees</option>
                  <option value="lawn_care">Lawn Care</option>
                  <option value="pest_control">Pest Control</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="legal">Legal</option>
                  <option value="accounting">Accounting</option>
                  <option value="other">Other</option>
                </FormSelect>

                <FormSelect
                  label="Payment Method"
                  id="payment_method"
                  value={formData.payment_method || 'cash'}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as Expense['payment_method'] })}
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="online">Online</option>
                </FormSelect>
              </div>

              <div className={styles.formRow}>
                <FormInput
                  label="Vendor"
                  id="vendor"
                  value={formData.vendor || ''}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
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
                {editingExpense ? 'Update' : 'Create'} Expense
              </SaveButton>
            </Modal.Actions>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Expenses;
