const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, requireOperator, requireInspector } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

const router = express.Router();

// Validation middleware
const validateGaugeId = [
  param('gaugeId').notEmpty().withMessage('Gauge ID is required')
];

const validateUnsealRequest = [
  body('reason').notEmpty().trim().withMessage('Reason for unsealing is required')
];

const validateRequestId = [
  param('requestId').isNumeric().withMessage('Request ID must be numeric')
];

// GET /api/gauges/tracking/unseal-requests - Get unseal requests
router.get('/unseal-requests', authenticateToken, asyncErrorHandler(async (req, res) => {
  const { status = 'all', user_type = 'all' } = req.query;
  const userId = req.user.id;
  
  const filters = {};
  if (status !== 'all') {
    filters.status = status;
  }
  if (user_type === 'mine') {
    filters.requested_by_user_id = userId;
  }

  const unsealsService = serviceRegistry.get('UnsealsService');
  const result = await unsealsService.getUnsealRequests(filters);
  res.json(result);
}));

// GET /:gaugeId/unseal-request - Get unseal request status for specific gauge
router.get('/:gaugeId/unseal-request', 
  authenticateToken,
  validateGaugeId,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { gaugeId } = req.params;
    
    const unsealsService = serviceRegistry.get('UnsealsService');
    const result = await unsealsService.getUnsealRequestByGaugeId(gaugeId);
    
    res.json(result);
  })
);

// POST /:gaugeId/unseal-request - Create unseal request
router.post('/:gaugeId/unseal-request', 
  authenticateToken, 
  requireOperator, 
  validateGaugeId,
  validateUnsealRequest,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { gaugeId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const unsealsService = serviceRegistry.get('UnsealsService');
    const result = await unsealsService.createUnsealRequest(
      gaugeId,
      { reason },
      userId
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
}));

// PUT /api/gauges/tracking/unseal-requests/:requestId/approve - Approve unseal request
router.put('/unseal-requests/:requestId/approve', 
  authenticateToken, 
  requireInspector,
  validateRequestId,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { requestId } = req.params;
    const userId = req.user.id;

    const unsealsService = serviceRegistry.get('UnsealsService');
    const result = await unsealsService.approveUnsealRequest(
      requestId,
      {},
      userId
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
}));

// PUT /api/gauges/tracking/unseal-requests/:requestId/confirm-unseal - Confirm physical unsealing
router.put('/unseal-requests/:requestId/confirm-unseal', 
  authenticateToken, 
  requireInspector,
  validateRequestId,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { requestId } = req.params;
    const userId = req.user.id;

    const unsealsService = serviceRegistry.get('UnsealsService');
    const result = await unsealsService.confirmUnseal(requestId, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
}));

// PUT /api/gauges/tracking/unseal-requests/:requestId/reject - Reject unseal request
router.put('/unseal-requests/:requestId/reject', 
  authenticateToken, 
  requireInspector,
  validateRequestId,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { requestId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const unsealsService = serviceRegistry.get('UnsealsService');
    const result = await unsealsService.rejectUnsealRequest(
      requestId,
      { review_notes: reason },
      userId
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
}));

// POST /api/gauges/tracking/unseal-requests/:id/approve - Approve unseal request (frontend-compatible endpoint)
router.post('/unseal-requests/:id/approve', 
  authenticateToken, 
  requireInspector,
  [param('id').isNumeric().withMessage('Request ID must be numeric')],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const userId = req.user.id;

    const unsealsService = serviceRegistry.get('UnsealsService');
    const result = await unsealsService.approveUnsealRequest(
      id,
      {},
      userId
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
}));

// POST /api/gauges/tracking/unseal-requests/:id/deny - Deny unseal request (frontend-compatible endpoint)
router.post('/unseal-requests/:id/deny',
  authenticateToken,
  requireInspector,
  [param('id').isNumeric().withMessage('Request ID must be numeric')],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const unsealsService = serviceRegistry.get('UnsealsService');
    const result = await unsealsService.rejectUnsealRequest(
      id,
      { review_notes: reason },
      userId
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
}));

// POST /api/gauges/tracking/unseal-requests/set/:setId/approve - Approve all unseal requests for a set
router.post('/unseal-requests/set/:setId/approve',
  authenticateToken,
  requireInspector,
  [param('setId').notEmpty().withMessage('Set ID is required')],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { setId } = req.params;
    const userId = req.user.id;

    const unsealsService = serviceRegistry.get('UnsealsService');
    const result = await unsealsService.approveSetUnsealRequests(setId, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
}));

// POST /api/gauges/tracking/unseal-requests/set/:setId/deny - Deny all unseal requests for a set
router.post('/unseal-requests/set/:setId/deny',
  authenticateToken,
  requireInspector,
  [param('setId').notEmpty().withMessage('Set ID is required')],
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { setId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const unsealsService = serviceRegistry.get('UnsealsService');
    const result = await unsealsService.rejectSetUnsealRequests(setId, { review_notes: reason }, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
}));

module.exports = router;