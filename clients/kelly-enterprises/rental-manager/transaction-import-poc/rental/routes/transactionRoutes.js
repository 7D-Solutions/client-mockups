const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const router = express.Router();
const { authenticateToken } = require('../../../infrastructure/middleware/auth');
const TransactionService = require('../services/TransactionService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype) ||
        file.originalname.match(/\.(csv|xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files allowed.'));
    }
  }
});

// POST /api/rental/transactions/import
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Parse spreadsheet
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet is empty'
      });
    }

    // Process transactions
    const transactionService = new TransactionService();
    const result = await transactionService.importTransactions(
      rawData,
      req.user.id,
      req.file.originalname
    );

    res.json({
      success: true,
      message: `Imported ${result.imported} transactions`,
      data: {
        batchId: result.batchId,
        total: result.total,
        imported: result.imported,
        matched: result.matched,
        unmatched: result.unmatched,
        transactions: result.transactions
      }
    });

  } catch (error) {
    console.error('Transaction import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/rental/transactions/import/:batchId
router.get('/import/:batchId', authenticateToken, async (req, res) => {
  try {
    const transactionService = new TransactionService();
    const batch = await transactionService.getBatchDetails(req.params.batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Import batch not found'
      });
    }

    res.json({
      success: true,
      data: batch
    });

  } catch (error) {
    console.error('Get batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve batch details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/rental/transactions/:id/match
router.post('/:id/match', authenticateToken, async (req, res) => {
  try {
    const { rentalPaymentId } = req.body;

    if (!rentalPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Rental payment ID required'
      });
    }

    const transactionService = new TransactionService();
    await transactionService.matchTransaction(
      req.params.id,
      rentalPaymentId,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Transaction matched successfully'
    });

  } catch (error) {
    console.error('Match transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to match transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
