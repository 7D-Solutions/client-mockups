import { useState } from 'react';
import { Button, FormInput, Modal } from '../../../infrastructure/components';
import { apiClient } from '../../../infrastructure/api/client';
import './TransactionImport.css';

interface Transaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  reference: string;
  matches: Array<{
    rental_payment_id: number;
    property_name: string;
    tenant_name: string;
    amount_expected: number;
    payment_date: string;
    confidence: number;
    reason: string;
  }>;
}

export const TransactionImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ total: 0, matched: 0, unmatched: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/rental/transactions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setTransactions(response.data.transactions);
      setStats({
        total: response.data.total,
        matched: response.data.matched,
        unmatched: response.data.unmatched
      });
    } catch (error: any) {
      alert(`Import failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async (transactionId: number, rentalPaymentId: number) => {
    try {
      await apiClient.post(`/rental/transactions/${transactionId}/match`, {
        rentalPaymentId
      });

      // Update UI
      setTransactions(prev =>
        prev.map(t => t.id === transactionId ? { ...t, matches: [] } : t)
      );
      setStats(prev => ({
        ...prev,
        matched: prev.matched + 1,
        unmatched: prev.unmatched - 1
      }));

      alert('Transaction matched successfully!');
    } catch (error: any) {
      alert(`Match failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  return (
    <div className="transaction-import">
      <h1>Import Bank Transactions</h1>

      {/* Upload Section */}
      <div className="upload-section">
        <FormInput
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          label="Select Transaction File"
        />

        <Button
          onClick={handleImport}
          disabled={!file || loading}
          variant="primary"
        >
          {loading ? 'Processing...' : 'Import & Match'}
        </Button>

        {file && (
          <div className="file-info">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats.total > 0 && (
        <div className="stats">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Transactions</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{stats.matched}</div>
            <div className="stat-label">Auto-Matched</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{stats.unmatched}</div>
            <div className="stat-label">Need Review</div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length > 0 && (
        <div className="transactions-list">
          <h2>Review Transactions</h2>

          {transactions.map((transaction) => (
            <div key={transaction.id} className="transaction-card">
              <div className="transaction-header">
                <div className="transaction-info">
                  <div className="transaction-amount">
                    {formatCurrency(transaction.amount)}
                  </div>
                  <div className="transaction-date">
                    {formatDate(transaction.date)}
                  </div>
                </div>
                <div className="transaction-description">
                  {transaction.description}
                  {transaction.reference && (
                    <span className="reference"> • Ref: {transaction.reference}</span>
                  )}
                </div>
              </div>

              {/* Possible Matches */}
              {transaction.matches.length > 0 ? (
                <div className="matches">
                  <div className="matches-header">Possible Matches:</div>
                  {transaction.matches.map((match, idx) => (
                    <div
                      key={idx}
                      className={`match-card ${match.confidence >= 0.9 ? 'high-confidence' : 'medium-confidence'}`}
                    >
                      <div className="match-info">
                        <div className="match-details">
                          <strong>{match.tenant_name}</strong> - {match.property_name}
                        </div>
                        <div className="match-meta">
                          Expected: {formatCurrency(match.amount_expected)} on{' '}
                          {formatDate(match.payment_date)}
                        </div>
                        <div className="match-reason">{match.reason}</div>
                      </div>
                      <div className="match-actions">
                        <div className="confidence-badge">
                          {Math.round(match.confidence * 100)}%
                        </div>
                        <Button
                          onClick={() => handleMatch(transaction.id, match.rental_payment_id)}
                          variant="primary"
                          size="small"
                        >
                          Approve Match
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-matches">
                  <span className="no-match-icon">⚠️</span>
                  No automatic matches found - manual review required
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {transactions.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Transactions Imported</h3>
          <p>Upload a CSV or Excel file to get started</p>
          <p className="hint">
            Supported formats: .csv, .xlsx, .xls
          </p>
        </div>
      )}
    </div>
  );
};
