const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class AccountLockoutRepository extends BaseRepository {
  constructor() {
    super('account_lockouts', 'id');
  }

  /**
   * Record a login attempt
   */
  async recordLoginAttempt(email, userId, ipAddress, userAgent, result, failureReason = null, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [res] = await connection.execute(
        `INSERT INTO core_login_attempts 
         (email, user_id, ip_address, user_agent, attempt_result, failure_reason) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [email, userId, ipAddress, userAgent, result, failureReason]
      );
      
      logger.info('Login attempt recorded', { email, result });
      return { id: res.insertId };
    } catch (error) {
      logger.error('Failed to record login attempt:', { error: error.message, email });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Count recent failed attempts
   */
  async countRecentFailedAttempts(email, windowMinutes, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [attempts] = await connection.execute(
        `SELECT COUNT(*) as failed_count 
         FROM core_login_attempts 
         WHERE email = ? 
         AND attempt_result = 'failed' 
         AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [email, windowMinutes]
      );
      
      return attempts[0].failed_count;
    } catch (error) {
      logger.error('Failed to count failed attempts:', { error: error.message, email });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Create or update account lockout
   */
  async createOrUpdateLockout(userId, email, failedAttempts, lockUntil, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [res] = await connection.execute(
        `INSERT INTO account_lockouts 
         (user_id, email, failed_attempts, locked_at, locked_until) 
         VALUES (?, ?, ?, NOW(), ?)
         ON DUPLICATE KEY UPDATE 
         failed_attempts = ?, locked_at = NOW(), locked_until = ?`,
        [userId, email, failedAttempts, lockUntil, failedAttempts, lockUntil]
      );
      
      return { affected: res.affectedRows };
    } catch (error) {
      logger.error('Failed to create/update lockout:', { error: error.message, email });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get all active lockouts
   */
  async getActiveLockouts(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [lockouts] = await connection.execute(
        `SELECT al.*, u.username, u.email as user_email
         FROM account_lockouts al
         LEFT JOIN core_users u ON al.user_id = u.user_id
         WHERE al.locked_until > NOW()
         ORDER BY al.locked_at DESC`
      );
      
      return lockouts;
    } catch (error) {
      logger.error('Failed to get active lockouts:', { error: error.message });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Unlock specific account
   */
  async unlockAccount(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [res] = await connection.execute(
        `UPDATE account_lockouts 
         SET locked_until = NOW(), unlocked_at = NOW(), unlocked_by = 'manual'
         WHERE user_id = ?`,
        [userId]
      );
      
      return { affected: res.affectedRows };
    } catch (error) {
      logger.error('Failed to unlock account:', { error: error.message, userId });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get lockout statistics
   */
  async getLockoutStats(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [stats] = await connection.execute(
        `SELECT 
           COUNT(CASE WHEN locked_until > NOW() THEN 1 END) as currently_locked,
           COUNT(CASE WHEN locked_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as locked_24h,
           COUNT(CASE WHEN locked_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as locked_7d,
           COUNT(*) as total_lockouts
         FROM account_lockouts`
      );
      
      return stats[0];
    } catch (error) {
      logger.error('Failed to get lockout stats:', { error: error.message });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Check if account is currently locked
   */
  async isAccountLocked(email, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [lockStatus] = await connection.execute(
        `SELECT locked_until 
         FROM account_lockouts 
         WHERE email = ? AND locked_until > NOW()
         ORDER BY locked_at DESC 
         LIMIT 1`,
        [email]
      );
      
      if (lockStatus.length > 0) {
        return {
          isLocked: true,
          lockedUntil: lockStatus[0].locked_until
        };
      }
      
      return { isLocked: false };
    } catch (error) {
      logger.error('Failed to check lock status:', { error: error.message, email });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = AccountLockoutRepository;