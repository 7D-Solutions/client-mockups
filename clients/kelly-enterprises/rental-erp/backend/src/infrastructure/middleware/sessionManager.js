/**
 * Session Management Middleware
 * Provides secure session handling with timeouts and cleanup
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

// Simple in-memory session storage
// For a small internal tool, this is PERFECTLY FINE
const activeSessions = new Map();

logger.info('📦 Session manager using in-memory storage (simple and fast!)');

/**
 * Session configuration
 */
const SESSION_CONFIG = {
  timeout: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '60') * 60 * 1000, // Default 60 minutes
  cleanupInterval: 5 * 60 * 1000, // Clean up every 5 minutes
  maxSessions: parseInt(process.env.MAX_SESSIONS_PER_USER || '3') // Max concurrent sessions per user
};

/**
 * Session data structure
 */
class Session {
  constructor(userId, sessionId, userAgent, ip) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.userAgent = userAgent;
    this.ip = ip;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.isActive = true;
  }

  isExpired() {
    return Date.now() - this.lastActivity > SESSION_CONFIG.timeout;
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  deactivate() {
    this.isActive = false;
  }
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.isExpired() || !session.isActive) {
      activeSessions.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`🧹 Cleaned up ${cleaned} expired/inactive sessions`);
  }
}

// Start session cleanup interval
setInterval(cleanupExpiredSessions, SESSION_CONFIG.cleanupInterval);

/**
 * Create a new session
 */
function createSession(userId, token, userAgent, ip) {
  const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const session = new Session(userId, sessionId, userAgent, ip);

  // Enforce max sessions per user
  const userSessions = getUserSessions(userId);
  if (userSessions.length >= SESSION_CONFIG.maxSessions) {
    // Remove oldest session
    const oldestSession = userSessions.sort((a, b) => a.createdAt - b.createdAt)[0];
    oldestSession.deactivate();
    activeSessions.delete(oldestSession.sessionId);
    logger.info(`🚫 Deactivated oldest session for user ${userId} due to max session limit`);
  }

  activeSessions.set(sessionId, session);
  logger.info(`✅ Created new session ${sessionId} for user ${userId}`);
  return sessionId;
}

/**
 * Get all active sessions for a user
 */
function getUserSessions(userId) {
  return Array.from(activeSessions.values()).filter(
    session => session.userId === userId && session.isActive && !session.isExpired()
  );
}

/**
 * Validate and update session
 */
function validateSession(sessionId, userAgent, ip) {
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return { valid: false, reason: 'Session not found' };
  }

  if (!session.isActive) {
    return { valid: false, reason: 'Session deactivated' };
  }

  if (session.isExpired()) {
    session.deactivate();
    activeSessions.delete(sessionId);
    return { valid: false, reason: 'Session expired' };
  }

  // Optionally validate user agent and IP for security
  if (process.env.SESSION_STRICT_VALIDATION === 'true') {
    if (session.userAgent !== userAgent) {
      logger.warn(`🚨 User agent mismatch for session ${sessionId}`);
      return { valid: false, reason: 'Session security violation' };
    }

    if (session.ip !== ip) {
      logger.warn(`🚨 IP address mismatch for session ${sessionId}`);
      return { valid: false, reason: 'Session security violation' };
    }
  }

  // Update last activity
  session.updateActivity();
  return { valid: true, session };
}

/**
 * Destroy a session
 */
function destroySession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.deactivate();
    activeSessions.delete(sessionId);
    logger.info(`🗑️  Destroyed session ${sessionId}`);
    return true;
  }
  return false;
}

/**
 * Destroy all sessions for a user
 */
function destroyUserSessions(userId) {
  const userSessions = getUserSessions(userId);
  let destroyed = 0;

  userSessions.forEach(session => {
    session.deactivate();
    activeSessions.delete(session.sessionId);
    destroyed++;
  });

  logger.info(`🗑️  Destroyed ${destroyed} sessions for user ${userId}`);
  return destroyed;
}

/**
 * Enhanced JWT middleware with session management
 */
const sessionMiddleware = (req, res, next) => {
  // First try to get token from cookie
  let token = req.cookies?.authToken;
  
  // Fall back to Authorization header for API clients
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  }

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Access denied. Authentication required.' 
    });
  }

  try {
    const decoded = jwt.verify(token, config.security.jwtSecret);
    
    // Extract session ID from token (if present)
    const sessionId = decoded.sessionId;
    
    if (sessionId) {
      // Validate session if sessionId is present
      const validation = validateSession(
        sessionId, 
        req.get('User-Agent'), 
        req.ip || req.connection.remoteAddress
      );

      if (!validation.valid) {
        return res.status(401).json({ 
          success: false,
          error: 'Session invalid: ' + validation.reason
        });
      }
    }

    // Add user context to request object
    req.user = {
      id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
      company_id: decoded.company_id,
      name: decoded.name || decoded.email,
      sessionId: sessionId
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // Clean up any associated session
      const payload = jwt.decode(token);
      if (payload?.sessionId) {
        destroySession(payload.sessionId);
      }
      
      return res.status(401).json({ 
        success: false,
        error: 'Session expired. Please login again.' 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      error: 'Invalid authentication.' 
    });
  }
};

/**
 * Get session statistics
 */
function getSessionStats() {
  const now = Date.now();
  const sessions = Array.from(activeSessions.values());
  
  return {
    total: sessions.length,
    active: sessions.filter(s => s.isActive && !s.isExpired()).length,
    expired: sessions.filter(s => s.isExpired()).length,
    inactive: sessions.filter(s => !s.isActive).length,
    byUser: sessions.reduce((acc, session) => {
      acc[session.userId] = (acc[session.userId] || 0) + 1;
      return acc;
    }, {}),
    avgSessionDuration: sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + (now - s.createdAt), 0) / sessions.length / 1000 / 60 // minutes
      : 0
  };
}

module.exports = {
  sessionMiddleware,
  createSession,
  validateSession,
  destroySession,
  destroyUserSessions,
  getUserSessions,
  getSessionStats,
  cleanupExpiredSessions,
  SESSION_CONFIG
};