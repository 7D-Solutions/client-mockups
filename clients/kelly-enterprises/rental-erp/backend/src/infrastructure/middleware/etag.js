const crypto = require('crypto');

/**
 * Simple ETag middleware for polling efficiency
 * Generates ETags based on response content and handles If-None-Match
 */
const etagMiddleware = () => {
  return (req, res, next) => {
    // Store original send
    const originalSend = res.send;
    
    res.send = function(data) {
      // Generate ETag from response data
      const etag = crypto
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex');
      
      // Set ETag header
      res.set('ETag', `"${etag}"`);
      
      // Check If-None-Match header
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
        // Data hasn't changed, return 304
        return res.status(304).end();
      }
      
      // Call original send
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = etagMiddleware;