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
import type { Transaction } from '../types';
import styles from './Transactions.module.css';

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    category: 'rent_payment',
    reconciled: false,
  });

  const columnManager = useColumnManager('transactions-table', [
    { id: 'transaction_date', label: 'Date', visible: true },
    { id: 'description', label: 'Description', visible: true },
    { id: 'category', label: 'Category', visible: true },
    { id: 'amount', label: 'Amount', visible: true },
    { id: 'reconciled', label: 'Status', visible: true },
  ]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await api.get('/rental/transactions');
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Error loading transactions:', handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTransaction) {
        await api.put(`/rental/transactions/${editingTransaction.id}`, formData);
      } else {
        await api.post('/rental/transactions', formData);
      }
      setShowModal(false);
      setEditingTransaction(null);
      resetForm();
      loadTransactions();
    } catch (error) {
      console.error('Error saving transaction:', handleApiError(error));
    }
  };

  const handleRowClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData(transaction);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      transaction_date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      category: 'rent_payment',
      reconciled: false,
    });
  };

  const handleAddNew = () => {
    setEditingTransaction(null);
    resetForm();
    setShowModal(true);
  };

  const columns: DataTableColumn<Transaction>[] = [
    {
      key: 'transaction_date',
      header: 'Date',
      render: (transaction) => new Date(transaction.transaction_date).toLocaleDateString(),
    },
    {
      key: 'description',
      header: 'Description',
      render: (transaction) => transaction.description,
    },
    {
      key: 'category',
      header: 'Category',
      render: (transaction) => (
        <span className={styles.categoryCell}>
          {transaction.category?.replace('_', ' ') || '-'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (transaction) => (
        <div className={styles.amountCell}>
          <Icon name={transaction.amount > 0 ? 'arrow-up' : 'arrow-down'} />
          <span className={transaction.amount > 0 ? styles.positive : styles.negative}>
            {transaction.amount > 0 ? '+' : ''}
            {transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ),
    },
    {
      key: 'reconciled',
      header: 'Status',
      render: (transaction) => (
        <Badge variant={transaction.reconciled ? 'success' : 'warning'}>
          {transaction.reconciled ? 'Reconciled' : 'Unreconciled'}
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
    <div className={styles.transactionsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Bank Transactions</h1>
          <p className={styles.pageDescription}>Import and reconcile bank transactions</p>
        </div>
        <Button variant="primary" onClick={handleAddNew} icon={<Icon name="upload" />}>
          Import Transactions
        </Button>
      </div>

      <DataTable
        tableId="transactions-table"
        columns={columns}
        data={transactions}
        onRowClick={handleRowClick}
        columnManager={columnManager}
        emptyMessage="No transactions found. Import your first transaction to get started."
      />

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
        >
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <FormInput
                label="Date"
                id="transaction_date"
                type="date"
                value={formData.transaction_date || ''}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                required
              />

              <FormInput
                label="Description"
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />

              <div className={styles.formRow}>
                <FormSelect
                  label="Category"
                  id="category"
                  value={formData.category || 'rent_payment'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Transaction['category'] })}
                  required
                >
                  <option value="rent_payment">Rent Payment</option>
                  <option value="security_deposit">Security Deposit</option>
                  <option value="late_fee">Late Fee</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="utilities">Utilities</option>
                  <option value="insurance">Insurance</option>
                  <option value="property_tax">Property Tax</option>
                  <option value="other">Other</option>
                </FormSelect>

                <FormInput
                  label="Amount"
                  id="amount"
                  type="number"
                  value={formData.amount || 0}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  required
                  step={0.01}
                />
              </div>

              <FormSelect
                label="Status"
                id="reconciled"
                value={formData.reconciled ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, reconciled: e.target.value === 'true' })}
                required
              >
                <option value="false">Unreconciled</option>
                <option value="true">Reconciled</option>
              </FormSelect>

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
                {editingTransaction ? 'Update' : 'Create'} Transaction
              </SaveButton>
            </Modal.Actions>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Transactions;
