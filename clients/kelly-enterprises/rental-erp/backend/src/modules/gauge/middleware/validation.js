/**
 * Validation middleware for gauge operations
 * Implements status whitelist and parameter validation
 */

const GaugeStatusService = require('../services/GaugeStatusService');

// Get valid statuses from the service
const VALID_STATUSES = Object.values(GaugeStatusService.STATUS);

/**
 * Validate status values against whitelist
 */
const validateStatus = (req, res, next) => {
  const status = req.body.status || req.query.status;
  
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: `Invalid status value. Must be one of: ${VALID_STATUSES.join(', ')}`,
        field: 'status',
        value: status
      }
    });
  }
  
  next();
};

/**
 * Validate required parameters for checkout
 */
const validateCheckout = (req, res, next) => {
  const { assigned_to_user_id, location, assigned_to_department } = req.body;
  
  if (!location || !assigned_to_department) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Location and department are required for checkout',
        fields: {
          location: !location ? 'required' : null,
          assigned_to_department: !assigned_to_department ? 'required' : null
        }
      }
    });
  }
  
  next();
};

/**
 * Validate required parameters for return
 */
const validateReturn = (req, res, next) => {
  const { condition_at_return } = req.body;
  
  if (!condition_at_return) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Condition at return is required',
        fields: {
          condition_at_return: 'required'
        }
      }
    });
  }
  
  next();
};

/**
 * Validate gauge ID format
 */
const validateGaugeId = (req, res, next) => {
  const gaugeId = req.params.gaugeId || req.body.gauge_id;
  
  if (!gaugeId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_GAUGE_ID',
        message: 'Gauge ID is required'
      }
    });
  }
  
  // Gauge IDs should be strings like 'TG-001', not numeric
  if (typeof gaugeId === 'number') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_GAUGE_ID_FORMAT',
        message: 'Gauge ID must be a string identifier (e.g., TG-001), not a numeric ID',
        value: gaugeId
      }
    });
  }
  
  next();
};

module.exports = {
  validateStatus,
  validateCheckout,
  validateReturn,
  validateGaugeId
};