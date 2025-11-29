const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, requireOperator, requireInspector } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const { validateStatus, validateGaugeId: customValidateGaugeId } = require('../middleware/validation');
const { createValidator } = require('../../../infrastructure/middleware/strictFieldValidator');
const validateCheckoutFields = createValidator('checkout');
const validateGaugeFields = createValidator('gauge');
const logger = require('../../../infrastructure/utils/logger');

const router = express.Router();

// Validation middleware
const validateGaugeId = [
  param('gaugeId').notEmpty().withMessage('Gauge ID is required')
];

const validateCheckout = [
  body('assigned_to_user_id').optional().isInt().withMessage('Assigned user ID must be an integer'),
  body('assigned_to_department').optional().isString().withMessage('Assigned department must be a string'),
  body('assignment_type').optional().isIn(['checkout', 'permanent', 'temporary']).withMessage('Invalid assignment type'),
  body('expected_return_date').optional().isISO8601().withMessage('Expected return date must be valid ISO date')
];

const validateCheckoutBody = [
  body('gauge_id')
    .notEmpty().withMessage('Gauge ID is required')
    .isString().withMessage('Gauge ID must be a string')
    .matches(/^[A-Za-z0-9\-_]+$/).withMessage('Gauge ID contains invalid characters'),
  body('assigned_to_user_id').optional().isInt().withMessage('Assigned user ID must be an integer'),
  body('assigned_to_department').optional().isString().withMessage('Assigned department must be a string'),
  body('assignment_type').optional().isIn(['checkout', 'permanent', 'temporary']).withMessage('Invalid assignment type'),
  body('expected_return_date').optional().isISO8601().withMessage('Expected return date must be valid ISO date')
];

const validateReturn = [
  body('condition_at_return').isIn(['excellent', 'good', 'fair', 'poor', 'damaged']).withMessage('Invalid condition rating'),
  body('return_notes').optional().isString().withMessage('Return notes must be a string'),
  body('returned_to_storage_location').optional().isString().withMessage('Storage location must be a string'),
  body('usage_hours').optional().isNumeric().withMessage('Usage hours must be numeric'),
  body('cross_user_acknowledged').optional().isBoolean().withMessage('Cross user acknowledgment must be boolean')
];

const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const ValidationError = require('../../../infrastructure/errors/ValidationError');

// GET /api/gauges/tracking/:gaugeId - Get gauge details
router.get('/:gaugeId', authenticateToken, validateGaugeId, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Invalid gauge ID' });
  }

  const { gaugeId } = req.params;
  const checkoutService = serviceRegistry.get('GaugeCheckoutService');
  const result = await checkoutService.getGaugeDetails(gaugeId);

  if (!result.success) {
    return res.status(404).json(result);
  }

  res.json(result);
}));

// POST /api/gauges/tracking/:gaugeId/checkout - Check out a gauge
router.post('/:gaugeId/checkout', authenticateToken, requireOperator, customValidateGaugeId, validateGaugeId, validateCheckoutFields, validateCheckout, validateStatus, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Invalid input parameters' });
  }

  const { gaugeId } = req.params;
  const userId = req.user.id;

  try {
    const checkoutService = serviceRegistry.get('GaugeCheckoutService');
    const result = await checkoutService.checkoutGauge(gaugeId, req.body, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    // Return 400 for validation errors (client errors), 500 for server errors
    const statusCode = error instanceof ValidationError ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}));

// POST /api/gauges/tracking/checkout - Alternative checkout endpoint (body contains gauge_id)
router.post('/checkout', authenticateToken, requireOperator, customValidateGaugeId, validateCheckoutFields, validateCheckoutBody, validateStatus, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { gauge_id } = req.body;
  const userId = req.user.id;

  try {
    const checkoutService = serviceRegistry.get('GaugeCheckoutService');
    const result = await checkoutService.checkoutGauge(gauge_id, req.body, userId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    // Return 400 for validation errors (client errors), 500 for server errors
    const statusCode = error instanceof ValidationError ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}));

// POST /api/gauges/tracking/:gaugeId/return - Return a gauge
router.post('/:gaugeId/return', authenticateToken, requireOperator, customValidateGaugeId, validateGaugeFields, validateGaugeId, validateReturn, validateStatus, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Invalid input parameters' });
  }

  const { gaugeId } = req.params;
  const userId = req.user.id;

  try {
    const checkoutService = serviceRegistry.get('GaugeCheckoutService');
    const result = await checkoutService.returnGauge(gaugeId, req.body, userId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    // Return 400 for validation errors (client errors), 500 for server errors
    const statusCode = error instanceof ValidationError ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}));

// POST /api/gauges/tracking/:gaugeId/qc-verify - QC verify a gauge
router.post('/:gaugeId/qc-verify', authenticateToken, requireInspector, customValidateGaugeId, validateGaugeId, validateStatus, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Invalid gauge ID' });
  }

  const { gaugeId } = req.params;
  const userId = req.user.id;

  try {
    const checkoutService = serviceRegistry.get('GaugeCheckoutService');
    const result = await checkoutService.qcVerifyGauge(gaugeId, req.body, userId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    // Return 400 for validation errors (client errors), 500 for server errors
    const statusCode = error instanceof ValidationError ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}));

// POST /api/gauges/tracking/:gaugeId/accept-return - Accept a gauge return
router.post('/:gaugeId/accept-return', authenticateToken, requireOperator, customValidateGaugeId, validateGaugeId, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Invalid gauge ID' });
  }

  const { gaugeId } = req.params;
  const userId = req.user.id;

  try {
    const checkoutService = serviceRegistry.get('GaugeCheckoutService');
    const result = await checkoutService.acceptGaugeReturn(gaugeId, req.body, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error accepting gauge return:', { gaugeId, error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// POST /api/gauges/tracking/:gaugeId/return-customer - Return customer-owned gauge
const validateCustomerReturn = [
  body('returnBoth').optional().isBoolean().withMessage('returnBoth must be a boolean')
];

router.post('/:gaugeId/return-customer', authenticateToken, requireInspector, customValidateGaugeId, validateGaugeId, validateCustomerReturn, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Invalid input parameters', errors: errors.array() });
  }

  const { gaugeId } = req.params;
  const userId = req.user.id;
  const returnBoth = req.body.returnBoth || false;

  try {
    const operationsService = serviceRegistry.get('OperationsService');
    const result = await operationsService.returnCustomerGauge(gaugeId, userId, returnBoth);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error returning customer gauge:', { gaugeId, error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

module.exports = router;