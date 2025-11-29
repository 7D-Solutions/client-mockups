const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, requireInspector } = require('../../../infrastructure/middleware/auth');
const { asyncErrorHandler } = require('../../../infrastructure/middleware/errorHandler');
const serviceRegistry = require('../../../infrastructure/services/ServiceRegistry');
const logger = require('../../../infrastructure/utils/logger');

const router = express.Router();

// Validation middleware
const validateGaugeId = param('gaugeId')
  .notEmpty().withMessage('Gauge ID is required')
  .isString().withMessage('Gauge ID must be a string');

const validateQcData = [
  body('condition').isIn(['good', 'fair', 'poor', 'needs_repair', 'damaged']).withMessage('Invalid condition'),
  body('passed').isBoolean().withMessage('Passed must be a boolean'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('inspector_comments').optional().isString().withMessage('Inspector comments must be a string')
];

/**
 * @route POST /api/gauges/tracking/qc/:gaugeId/verify
 * @desc QC verify a returned gauge
 * @access Inspector only
 */
router.post('/:gaugeId/verify', 
  authenticateToken, 
  requireInspector, 
  validateGaugeId,
  validateQcData,
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { gaugeId } = req.params;
    const { condition, passed, notes, inspector_comments } = req.body;
    
    try {
      // Verify gauge needs QC approval (is unsealed)
      const gaugeService = serviceRegistry.get('GaugeService');
      const gauge = await gaugeService.getGaugeById(gaugeId);
      if (!gauge) {
        return res.status(404).json({
          success: false,
          error: 'Gauge not found'
        });
      }
      
      if (gauge.is_sealed !== 0) {
        return res.status(400).json({
          success: false,
          error: 'Gauge does not need QC approval (already sealed)',
          current_sealed_status: gauge.is_sealed
        });
      }
      
      // Perform QC verification - update gauge based on pass/fail
      const updateData = {
        is_sealed: passed ? 1 : 0,
        status: passed ? 'available' : 'out_of_service' // Use 'out_of_service' for failed gauges
        // Note: updated_by column doesn't exist in current schema
        // Updated timestamp is handled automatically by gaugeService
      };
      
      // Note: condition_rating and qc_notes columns don't exist in current schema
      // QC inspection data should be logged to audit trail instead
      
      const result = await gaugeService.updateGauge(gaugeId, updateData);
      
      // Log QC inspection details to logger
      logger.info('QC verification completed', {
        gauge_id: gaugeId,
        passed,
        condition,
        notes: notes || inspector_comments || 'No notes',
        inspector_id: req.user.id,
        inspector_email: req.user.email
      });
      
      res.json({
        success: true,
        message: 'QC verification completed',
        data: {
          gauge_id: gaugeId,
          status: updateData.status,
          qc_passed: passed,
          condition: condition,
          sealed: passed,
          next_action: passed ? 'Gauge sealed and available for use' : 'Gauge marked for maintenance'
        }
      });
      
    } catch (error) {
      logger.error('QC verification error:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  })
);

/**
 * @route GET /api/gauges/tracking/qc/pending
 * @desc Get all gauges pending QC verification
 * @access Authenticated users (for admin alerts)
 */
router.get('/pending',
  authenticateToken,
  asyncErrorHandler(async (req, res) => {
    try {
      // Get gauges that need QC approval (pending_qc status)
      const gaugeService = serviceRegistry.get('GaugeService');
      const result = await gaugeService.searchGauges({
        status: 'pending_qc'
      });
      const pendingGauges = Array.isArray(result) ? result : (result.gauges || []);
      
      res.json({
        success: true,
        count: pendingGauges.length,
        data: pendingGauges.map(gauge => ({
          gauge_id: gauge.gauge_id,
          name: gauge.name,
          manufacturer: gauge.manufacturer,
          model_number: gauge.model_number,
          returned_date: gauge.updated_at,
          location: gauge.location,
          priority: gauge.risk_level === 'high' ? 'urgent' : 'normal'
        }))
      });
      
    } catch (error) {
      logger.error('Error fetching pending QC gauges:', error);
      throw error;
    }
  })
);

/**
 * @route POST /api/gauges/tracking/qc/:gaugeId/fail
 * @desc Mark a gauge as failed QC
 * @access Inspector only
 */
router.post('/:gaugeId/fail', 
  authenticateToken, 
  requireInspector, 
  validateGaugeId,
  body('reason').notEmpty().withMessage('Failure reason is required'),
  body('requires_calibration').optional().isBoolean(),
  body('requires_repair').optional().isBoolean(),
  asyncErrorHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { gaugeId } = req.params;
    const { reason, requires_calibration, requires_repair } = req.body;
    
    try {
      // Update gauge status - use valid enum values
      const gaugeService = serviceRegistry.get('GaugeService');
      const updateData = {
        status: 'out_of_service' // Default to out_of_service for failed QC
        // Note: updated_by column doesn't exist in current schema
      };
      
      // All failed QC gauges should be marked as out_of_service
      // Calibration due status is calculated automatically based on dates
      if (requires_repair) {
        updateData.status = 'out_of_service';
      } else {
        updateData.status = 'out_of_service'; // Even calibration-required gauges are out of service until calibrated
      }
      
      // Note: condition_rating and qc_failure_reason columns don't exist in current schema
      // QC failure data should be logged to audit trail instead
      
      await gaugeService.updateGauge(gaugeId, updateData);
      
      // Log QC failure details to logger
      logger.info('QC failure recorded', {
        gauge_id: gaugeId,
        reason,
        requires_calibration,
        requires_repair,
        final_status: updateData.status,
        inspector_id: req.user.id,
        inspector_email: req.user.email
      });
      
      res.json({
        success: true,
        message: 'Gauge marked as QC failed',
        data: {
          gauge_id: gaugeId,
          status: updateData.status,
          reason: reason,
          next_action: requires_calibration ? 'Schedule calibration' : 
                      requires_repair ? 'Schedule repair' : 'Review required'
        }
      });
      
    } catch (error) {
      logger.error('QC failure recording error:', error);
      throw error;
    }
  })
);

/**
 * @route GET /api/gauges/tracking/qc/history/:gaugeId
 * @desc Get QC history for a gauge
 * @access Private
 */
router.get('/history/:gaugeId', 
  authenticateToken, 
  validateGaugeId,
  asyncErrorHandler(async (req, res) => {
    const { gaugeId } = req.params;
    
    try {
      // TODO: Implement QC history tracking in database
      // For now, return empty history
      res.json({
        success: true,
        gauge_id: gaugeId,
        history: [],
        message: 'QC history tracking not yet implemented'
      });
      
    } catch (error) {
      logger.error('Error fetching QC history:', error);
      throw error;
    }
  })
);

module.exports = router;
