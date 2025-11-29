const logger = require('../../../../infrastructure/utils/logger');

/**
 * Handle gauge operation errors and send appropriate HTTP response
 */
function handleGaugeError(res, error, operation, context = {}) {
  const errorMap = {
    'Gauge not found': 404,
    'not found': 404,
    'already exists': 409,
    'Gauge ID already exists': 409,
    'Invalid equipment type': 422,
    'No valid fields to update': 422,
    'not configured': 503
  };

  let statusCode = 500;
  let message = `Failed to ${operation} gauge`;

  for (const [errorText, code] of Object.entries(errorMap)) {
    if (error.message && error.message.includes(errorText)) {
      statusCode = code;
      message = error.message;
      break;
    }
  }

  logger.error(`Gauge ${operation} failed`, {
    ...context,
    error: error.message
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
}

/**
 * Send success response for gauge operation
 */
function sendSuccess(res, message, data, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    ...(data && { data })
  });
}

/**
 * Validate request and return errors if any
 */
function validateRequest(validationResult, res) {
  const errors = validationResult();
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array() });
    return false;
  }
  return true;
}

/**
 * Filter allowed fields for gauge updates
 */
function filterAllowedFields(updates, allowedFields) {
  const filtered = {};
  allowedFields.forEach(field => {
    if (updates[field] !== undefined && updates[field] !== '') {
      filtered[field] = updates[field];
    }
  });
  return filtered;
}

module.exports = {
  handleGaugeError,
  sendSuccess,
  validateRequest,
  filterAllowedFields
};
