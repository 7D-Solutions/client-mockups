const crypto = require('crypto');
const { getPool } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Idempotency middleware to prevent duplicate processing of requests
 * Checks for Idempotency-Key header and returns cached response if found
 */
const idempotency = async (req, res, next) => {
  const key = req.header('Idempotency-Key');
  
  // Only process idempotency for mutation methods with a key
  if (!key || !['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }
  
  // Validate key format (16-128 chars, alphanumeric with dashes/underscores)
  const keyRegex = /^[a-zA-Z0-9-_]{16,128}$/;
  if (!keyRegex.test(key)) {
    return res.status(400).json({ 
      error: 'Invalid idempotency key format. Must be 16-128 characters, alphanumeric with dashes/underscores.' 
    });
  }
  
  const userId = req.user?.id || null;
  const route = req.route?.path || req.originalUrl.split('?')[0];
  const method = req.method;
  const bodyHash = crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');
  
  try {
    // Check if we've seen this request before
    const pool = getPool();
    if (!pool) {
      logger.error('Database pool not available for idempotency check');
      // Continue without idempotency protection
      return next();
    }
    const [rows] = await pool.execute(
      `SELECT response_status, response_body, request_hash 
       FROM idempotency_keys 
       WHERE idempotency_key = ? 
         AND IFNULL(user_id, 0) = IFNULL(?, 0) 
         AND method = ? 
         AND route = ? 
       LIMIT 1`,
      [key, userId, method, route]
    );
    
    const hit = rows && rows[0];
    
    if (hit) {
      // Check if request body has changed
      if (hit.request_hash !== bodyHash) {
        logger.warn(`Idempotency key ${key} reused with different request body`);
        return res.status(409).json({ 
          error: 'Idempotency key already used with different request body' 
        });
      }
      
      // Return cached response
      logger.info(`Returning cached response for idempotency key: ${key}`);
      res.status(hit.response_status);
      
      if (hit.response_body) {
        const buffer = Buffer.from(hit.response_body);
        try {
          res.set('Content-Type', 'application/json');
          res.send(JSON.parse(buffer.toString()));
        } catch {
          res.send(buffer);
        }
      } else {
        res.end();
      }
      return;
    }
    
    // Intercept response to store it
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);
    
    const storeResponse = async (body) => {
      const status = res.statusCode;
      
      // Only store successful responses (2xx status codes)
      if (status >= 200 && status < 300) {
        const payload = Buffer.isBuffer(body) 
          ? body 
          : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body || null));
        
        try {
          const poolForStore = getPool();
          if (!poolForStore) {
            logger.warn('Database pool not available for storing idempotency response');
            return;
          }
          await poolForStore.execute(
            `INSERT INTO idempotency_keys 
             (idempotency_key, user_id, method, route, request_hash, response_status, response_body) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [key, userId, method, route, bodyHash, status, payload]
          );
          logger.info(`Stored response for idempotency key: ${key}`);
        } catch (error) {
          // Log error but don't fail the request
          logger.error('Failed to store idempotency key:', error);
        }
      }
    };
    
    res.send = function(body) {
      storeResponse(body);
      return originalSend(body);
    };
    
    res.json = function(body) {
      storeResponse(body);
      return originalJson(body);
    };
    
    next();
    
  } catch (error) {
    logger.error('Idempotency middleware error:', error);
    // Continue without idempotency protection on error
    next();
  }
};

module.exports = idempotency;