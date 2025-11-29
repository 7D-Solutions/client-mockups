const logger = require('../utils/logger');

const createValidator = (type) => {
  const fieldRules = {
    gauge: {
      rejected: ['location', 'job_number']
    },
    checkout: {
      rejected: ['storage_location', 'location', 'job_number']
    }
  };

  const rules = fieldRules[type];
  if (!rules) {
    throw new Error(`Unknown validation type: ${type}`);
  }

  return (req, res, next) => {
    const body = req.body || {};
    const query = req.query || {};
    
    // Check both body and query parameters
    const bodyInvalid = rules.rejected.filter((fieldName) => body[fieldName] !== undefined);
    const queryInvalid = rules.rejected.filter((fieldName) => query[fieldName] !== undefined);
    const invalid = [...new Set([...bodyInvalid, ...queryInvalid])];

    if (invalid.length > 0) {
      // Log telemetry for rejected fields
      logger.warn('Rejected invalid fields', {
        endpoint: req.originalUrl,
        method: req.method,
        validationType: type,
        invalidFields: invalid,
        source: {
          body: bodyInvalid,
          query: queryInvalid
        },
        userId: req.user?.id,
        userEmail: req.user?.email,
        environment: process.env.NODE_ENV
      });

      // Always reject invalid fields (removed environment check)
      return res.status(400).json({
        success: false,
        message: `Invalid fields: ${invalid.join(', ')}`,
        invalidFields: invalid
      });
    }

    return next();
  };
};

module.exports = { createValidator };


