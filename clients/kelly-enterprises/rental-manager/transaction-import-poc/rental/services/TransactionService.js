const stringSimilarity = require('string-similarity');
const TransactionRepository = require('../repositories/TransactionRepository');

class TransactionService {
  constructor() {
    this.repository = new TransactionRepository();
  }

  /**
   * Import transactions from parsed spreadsheet data
   */
  async importTransactions(rawData, userId, filename) {
    // Detect and map columns
    const columnMapping = this.detectColumns(Object.keys(rawData[0]));

    // Normalize transactions
    const normalized = rawData.map((row, index) => {
      const transaction = {
        date: this.parseDate(row[columnMapping.date]),
        amount: this.parseAmount(row[columnMapping.amount]),
        description: row[columnMapping.description] || '',
        reference: row[columnMapping.reference] || '',
        rowNumber: index + 2, // +2 for 1-indexed + header row
        rawData: row
      };

      // Validate
      if (!transaction.date || isNaN(transaction.amount)) {
        throw new Error(`Invalid data at row ${transaction.rowNumber}`);
      }

      return transaction;
    });

    // Create import batch
    const batchId = await this.repository.createBatch({
      filename,
      uploadedBy: userId,
      totalRows: normalized.length
    });

    // Save transactions and find matches
    const results = await Promise.all(
      normalized.map(t => this.processTransaction(t, batchId))
    );

    // Update batch stats
    const matched = results.filter(r => r.matches.length > 0).length;
    await this.repository.updateBatch(batchId, {
      processedRows: results.length,
      matchedCount: matched
    });

    return {
      batchId,
      total: results.length,
      imported: results.length,
      matched,
      unmatched: results.length - matched,
      transactions: results
    };
  }

  /**
   * Process single transaction: save + find matches
   */
  async processTransaction(transaction, batchId) {
    // Save transaction
    const transactionId = await this.repository.saveTransaction({
      ...transaction,
      importId: batchId
    });

    // Find possible matches
    const matches = await this.findMatches(transaction);

    // Auto-match if high confidence
    if (matches.length === 1 && matches[0].confidence >= 0.95) {
      await this.repository.linkTransaction(
        transactionId,
        matches[0].rentalPaymentId,
        matches[0].confidence,
        'auto'
      );
    }

    return {
      id: transactionId,
      ...transaction,
      matches
    };
  }

  /**
   * Find matching rental payments
   */
  async findMatches(transaction) {
    const matches = [];

    // Strategy 1: Exact amount + date within 7 days
    const exactMatches = await this.repository.findByAmountAndDate(
      transaction.amount,
      transaction.date,
      7
    );

    exactMatches.forEach(match => {
      matches.push({
        ...match,
        confidence: 0.95,
        reason: 'Exact amount + date match'
      });
    });

    // Strategy 2: Fuzzy amount (±$10) + description match
    if (matches.length === 0 && transaction.description) {
      const fuzzyMatches = await this.repository.findByFuzzyAmount(
        transaction.amount,
        10
      );

      fuzzyMatches.forEach(match => {
        const similarity = stringSimilarity.compareTwoStrings(
          transaction.description.toLowerCase(),
          (match.tenant_name || '').toLowerCase()
        );

        if (similarity > 0.5) {
          matches.push({
            ...match,
            confidence: Math.round(similarity * 100) / 100,
            reason: `Description similarity: ${Math.round(similarity * 100)}%`
          });
        }
      });
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Manual match transaction to rental payment
   */
  async matchTransaction(transactionId, rentalPaymentId, userId) {
    await this.repository.linkTransaction(
      transactionId,
      rentalPaymentId,
      1.0,
      'manual',
      userId
    );
  }

  /**
   * Get batch details with transactions
   */
  async getBatchDetails(batchId) {
    return await this.repository.getBatch(batchId);
  }

  /**
   * Smart column detection using fuzzy matching
   */
  detectColumns(headers) {
    const patterns = {
      date: ['date', 'transaction date', 'trans date', 'posted date', 'dt', 'transaction_date'],
      amount: ['amount', 'amt', 'total', 'sum', 'value', 'price', 'payment'],
      description: ['description', 'desc', 'memo', 'notes', 'details', 'merchant', 'payee'],
      reference: ['reference', 'ref', 'ref #', 'check #', 'transaction id', 'txn id']
    };

    const detected = {};

    headers.forEach(header => {
      const normalized = header.toLowerCase().trim();

      Object.keys(patterns).forEach(field => {
        const matches = stringSimilarity.findBestMatch(normalized, patterns[field]);
        if (matches.bestMatch.rating > 0.6) {
          detected[field] = header;
        }
      });
    });

    // Fallback to first matching columns if auto-detect fails
    if (!detected.date) detected.date = headers[0];
    if (!detected.amount) detected.amount = headers[1];
    if (!detected.description) detected.description = headers[2];

    return detected;
  }

  /**
   * Parse date from various formats
   */
  parseDate(value) {
    if (!value) return null;

    // Handle Excel serial dates
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }

    // Handle string dates
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;

    return date.toISOString().split('T')[0];
  }

  /**
   * Parse amount from various formats
   */
  parseAmount(value) {
    if (typeof value === 'number') return value;

    // Remove currency symbols and commas
    const cleaned = String(value).replace(/[$,]/g, '');
    return parseFloat(cleaned);
  }
}

module.exports = TransactionService;
