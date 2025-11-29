const logger = require('../../../../infrastructure/utils/logger');

/**
 * Handle certificate operation errors and send appropriate HTTP response
 */
function handleCertificateError(res, error, operation, context = {}) {
  const errorMap = {
    'Gauge not found': 404,
    'Certificate not found': 404,
    'Certificate not found for this gauge': 404,
    'Certificate storage service is not configured': 503,
    'already been uploaded': 400,
    'Certificate name is required': 400,
    'Certificate name contains invalid characters': 400,
    'Certificate name is too long': 400
  };

  // Find matching error status
  let statusCode = 500;
  let message = `Failed to ${operation} certificate`;

  for (const [errorText, code] of Object.entries(errorMap)) {
    if (error.message && error.message.includes(errorText)) {
      statusCode = code;
      message = error.message;
      break;
    }
  }

  logger.error(`Certificate ${operation} failed`, {
    ...context,
    error: error.message
  });

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

/**
 * Send success response for certificate operation
 */
function sendSuccess(res, message, data) {
  res.json({
    success: true,
    message,
    data
  });
}

module.exports = {
  handleCertificateError,
  sendSuccess
};
