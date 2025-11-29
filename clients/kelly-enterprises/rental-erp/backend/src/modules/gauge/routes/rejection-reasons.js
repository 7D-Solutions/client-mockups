const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');

const router = express.Router();

// Validation middleware
const validateReason = [
  body('reason_name')
    .notEmpty().withMessage('Reason name is required')
    .isLength({ max: 100 }).withMessage('Reason name must be less than 100 characters'),
  body('action_type')
    .isIn(['remove_checkout', 'keep_checkout']).withMessage('Invalid action type'),
  body('target_status')
    .optional()
    .isLength({ max: 50 }).withMessage('Target status must be less than 50 characters'),
  body('requires_notes')
    .optional()
    .isBoolean().withMessage('Requires notes must be boolean'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('Is active must be boolean'),
  body('display_order')
    .optional()
    .isInt().withMessage('Display order must be an integer')
];

// GET /api/rejection-reasons - Get all active rejection reasons
router.get('/', authenticateToken, asyncErrorHandler(async (req, res) => {
  const includeInactive = req.query.include_inactive === 'true';
  
  const gaugeRejectionService = serviceRegistry.get('GaugeRejectionService');
  const reasons = await gaugeRejectionService.getAllRejectionReasons(includeInactive);
  
  res.json({
    success: true,
    data: reasons
  });
}));

// GET /api/rejection-reasons/:id - Get specific rejection reason
router.get('/:id', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  
  const gaugeRejectionService = serviceRegistry.get('GaugeRejectionService');
  const reason = await gaugeRejectionService.getRejectionReasonById(id);
  
  if (!reason) {
    return res.status(404).json({
      success: false,
      error: 'Rejection reason not found'
    });
  }
  
  res.json({
    success: true,
    data: reason
  });
}));

// POST /api/rejection-reasons - Create new rejection reason
router.post('/', authenticateToken, requireAdmin, validateReason, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  const {
    reason_name,
    action_type,
    target_status,
    requires_notes = false,
    is_active = true,
    display_order = 0
  } = req.body;
  
  const gaugeRejectionService = serviceRegistry.get('GaugeRejectionService');
  
  try {
    const result = await gaugeRejectionService.createRejectionReason({
      reason_name,
      action_type,
      target_status,
      requires_notes,
      is_active,
      display_order
    });
    
    res.status(201).json({
      success: true,
      message: 'Rejection reason created successfully',
      data: result
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    throw error;
  }
}));

// PUT /api/rejection-reasons/:id - Update rejection reason
router.put('/:id', authenticateToken, requireAdmin, validateReason, asyncErrorHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  const { id } = req.params;
  const {
    reason_name,
    action_type,
    target_status,
    requires_notes,
    is_active,
    display_order
  } = req.body;
  
  const gaugeRejectionService = serviceRegistry.get('GaugeRejectionService');
  
  try {
    await gaugeRejectionService.updateRejectionReason(id, {
      reason_name,
      action_type,
      target_status,
      requires_notes,
      is_active,
      display_order
    });
    
    res.json({
      success: true,
      message: 'Rejection reason updated successfully'
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    if (error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    throw error;
  }
}));

// DELETE /api/rejection-reasons/:id - Delete rejection reason
router.delete('/:id', authenticateToken, requireAdmin, asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  
  const gaugeRejectionService = serviceRegistry.get('GaugeRejectionService');
  
  try {
    const result = await gaugeRejectionService.deleteRejectionReason(id);
    
    res.json({
      success: true,
      message: result.isDefault ? 'Default rejection reason deactivated' : 'Rejection reason deleted successfully'
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    throw error;
  }
}));

// POST /api/rejection-reasons/reject-gauge - Reject a gauge with reason
router.post('/reject-gauge', authenticateToken, asyncErrorHandler(async (req, res) => {
  const {
    gauge_id,
    reason_id,
    notes
  } = req.body;
  
  if (!gauge_id || !reason_id) {
    return res.status(400).json({
      success: false,
      error: 'Gauge ID and reason ID are required'
    });
  }
  
  const gaugeRejectionService = serviceRegistry.get('GaugeRejectionService');
  
  try {
    const result = await gaugeRejectionService.rejectGauge(gauge_id, reason_id, notes, req.user.id);
    
    res.json({
      success: true,
      message: result.message,
      action: result.action,
      new_status: result.new_status
    });
  } catch (error) {
    if (error.message.includes('Invalid or inactive rejection reason')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    if (error.message.includes('Notes are required')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    if (error.message.includes('Gauge not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    if (error.message.includes('not pending return')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    throw error;
  }
}));

module.exports = router;