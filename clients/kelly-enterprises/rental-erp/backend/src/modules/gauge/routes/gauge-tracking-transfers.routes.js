const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, requireOperator } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

const router = express.Router();

// Validation middleware
const validateTransferCreate = [
  body('gauge_id').notEmpty().withMessage('Gauge ID is required'),
  body('to_user_id').isInt().withMessage('To user ID must be an integer'),
  body('reason').notEmpty().withMessage('Transfer reason is required')
];

const validateTransferId = [
  param('transferId').isInt().withMessage('Transfer ID must be an integer')
];

// GET /api/gauges/tracking/transfers - Get transfer requests
router.get('/transfers', authenticateToken, asyncErrorHandler(async (req, res) => {
  const { status = 'all', user_type = 'all' } = req.query;
  const userId = req.user.id;

  const transfersService = serviceRegistry.get('TransfersService');
  const result = await transfersService.getTransfers(userId, { status, user_type });
  res.json(result);
}));

// POST /api/gauges/tracking/transfers - Create transfer request
router.post('/transfers', authenticateToken, requireOperator, validateTransferCreate, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const userId = req.user.id;
  const transfersService = serviceRegistry.get('TransfersService');
  const result = await transfersService.createTransfer(req.body, userId);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
}));

// PUT /api/gauges/tracking/transfers/:transferId/accept - Accept transfer
router.put('/transfers/:transferId/accept', authenticateToken, requireOperator, validateTransferId, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { transferId } = req.params;
  const userId = req.user.id;
  
  const transfersService = serviceRegistry.get('TransfersService');
  const result = await transfersService.acceptTransfer(parseInt(transferId), userId);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
}));

// PUT /api/gauges/tracking/transfers/:transferId/reject - Reject transfer
router.put('/transfers/:transferId/reject', authenticateToken, requireOperator, validateTransferId, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { transferId } = req.params;
  const userId = req.user.id;
  const { reason } = req.body;
  
  const transfersService = serviceRegistry.get('TransfersService');
  const result = await transfersService.rejectTransfer(parseInt(transferId), userId, reason);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
}));

module.exports = router;