const express = require('express');
const router = express.Router();
const logger = require('../../../infrastructure/utils/logger');
const AuditRepository = require('../repositories/AuditRepository');

/**
 * Frontend Audit Event Endpoint
 * Fire-and-forget endpoint for frontend to log audit events
 * Returns 202 Accepted immediately without waiting for DB write
 */
router.post('/frontend-event', async (req, res) => {
  // Immediately acknowledge receipt
  res.status(202).json({ accepted: true });

  // Extract audit data
  const { action, entity, details = {} } = req.body;
  const userId = req.user?.id || null;
  const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Validate required fields
  if (!action || !entity) {
    logger.warn('Frontend audit event missing required fields', {
      action,
      entity,
      userId,
      ip: ipAddress
    });
    return; // Already responded, just log and return
  }

  // Async write to database (fire-and-forget)
  setImmediate(async () => {
    try {
      const auditRepository = new AuditRepository();
      await auditRepository.logFrontendEvent({
        userId,
        action,
        entity,
        details,
        ipAddress,
        userAgent
      });
      
      logger.info('Frontend audit event logged', {
        action,
        entity,
        userId,
        ip: ipAddress
      });
    } catch (dbError) {
      logger.error('Failed to write frontend audit event', {
        error: dbError.message,
        action,
        entity,
        userId
      });
    }
  });
});

module.exports = router;