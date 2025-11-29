const { pool } = require('../../../infrastructure/database/connection');

class TransactionRepository {
  /**
   * Create import batch record
   */
  async createBatch({ filename, uploadedBy, totalRows }) {
    const [result] = await pool.query(
      `INSERT INTO transaction_imports
       (filename, uploaded_by, total_transactions, status)
       VALUES (?, ?, ?, 'processing')`,
      [filename, uploadedBy, totalRows]
    );
    return result.insertId;
  }

  /**
   * Update batch statistics
   */
  async updateBatch(batchId, { processedRows, matchedCount }) {
    await pool.query(
      `UPDATE transaction_imports
       SET processed_rows = ?, matched_count = ?, status = 'completed'
       WHERE id = ?`,
      [processedRows, matchedCount, batchId]
    );
  }

  /**
   * Save imported transaction
   */
  async saveTransaction({ importId, date, amount, description, reference, rowNumber, rawData }) {
    const [result] = await pool.query(
      `INSERT INTO imported_transactions
       (import_id, transaction_date, amount, description, reference, row_number, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [importId, date, amount, description, reference, rowNumber, JSON.stringify(rawData)]
    );
    return result.insertId;
  }

  /**
   * Find rental payments by exact amount and date range
   */
  async findByAmountAndDate(amount, date, dayRange = 7) {
    const [rows] = await pool.query(
      `SELECT
        rp.id as rental_payment_id,
        rp.property_id,
        rp.tenant_id,
        rp.amount_expected,
        rp.payment_date,
        t.tenant_name,
        p.property_name
       FROM rental_payments rp
       LEFT JOIN tenants t ON rp.tenant_id = t.id
       LEFT JOIN properties p ON rp.property_id = p.id
       WHERE rp.amount_expected = ?
       AND rp.payment_date BETWEEN DATE_SUB(?, INTERVAL ? DAY)
                               AND DATE_ADD(?, INTERVAL ? DAY)
       AND rp.reconciliation_status = 'unmatched'`,
      [amount, date, dayRange, date, dayRange]
    );
    return rows;
  }

  /**
   * Find rental payments by fuzzy amount
   */
  async findByFuzzyAmount(amount, tolerance = 10) {
    const [rows] = await pool.query(
      `SELECT
        rp.id as rental_payment_id,
        rp.property_id,
        rp.tenant_id,
        rp.amount_expected,
        rp.payment_date,
        t.tenant_name,
        p.property_name
       FROM rental_payments rp
       LEFT JOIN tenants t ON rp.tenant_id = t.id
       LEFT JOIN properties p ON rp.property_id = p.id
       WHERE ABS(rp.amount_expected - ?) < ?
       AND rp.reconciliation_status = 'unmatched'
       LIMIT 10`,
      [amount, tolerance]
    );
    return rows;
  }

  /**
   * Link transaction to rental payment
   */
  async linkTransaction(transactionId, rentalPaymentId, confidence, method = 'auto', userId = null) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Create reconciliation record
      await connection.query(
        `INSERT INTO payment_reconciliations
         (bank_transaction_id, rental_payment_id, match_confidence, match_method, reconciled_by)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, rentalPaymentId, confidence, method, userId]
      );

      // Update rental payment status
      await connection.query(
        `UPDATE rental_payments
         SET reconciliation_status = 'matched'
         WHERE id = ?`,
        [rentalPaymentId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get batch details with transactions
   */
  async getBatch(batchId) {
    const [batches] = await pool.query(
      `SELECT * FROM transaction_imports WHERE id = ?`,
      [batchId]
    );

    if (batches.length === 0) return null;

    const [transactions] = await pool.query(
      `SELECT
        it.*,
        pr.rental_payment_id,
        pr.match_confidence,
        pr.match_method
       FROM imported_transactions it
       LEFT JOIN payment_reconciliations pr ON it.id = pr.bank_transaction_id
       WHERE it.import_id = ?
       ORDER BY it.row_number`,
      [batchId]
    );

    return {
      ...batches[0],
      transactions
    };
  }
}

module.exports = TransactionRepository;
