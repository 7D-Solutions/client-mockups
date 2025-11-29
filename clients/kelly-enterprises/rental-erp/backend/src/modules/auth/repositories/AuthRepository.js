const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class AuthRepository extends BaseRepository {
  constructor() {
    super('core_users', 'id');
  }

  /**
   * Record a login attempt
   */
  async recordLoginAttempt(email, ipAddress, success, failureReason = null, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      await connection.execute(`
        INSERT INTO core_login_attempts 
        (email, ip_address, success, failure_reason, attempted_at) 
        VALUES (?, ?, ?, ?, UTC_TIMESTAMP())
      `, [email, ipAddress, success ? 1 : 0, failureReason]);
      
      return true;
    } catch (error) {
      logger.error('Failed to record login attempt:', {
        error: error.message,
        email,
        ipAddress
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get user with roles by email
   */
  async findByEmailWithRoles(email, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const [users] = await connection.execute(`
        SELECT
          u.id,
          u.email,
          u.password_hash,
          u.name,
          u.failed_login_count,
          u.locked_until,
          u.must_change_password,
          GROUP_CONCAT(r.name) as roles
        FROM core_users u
        LEFT JOIN core_user_roles ur ON u.id = ur.user_id
        LEFT JOIN core_roles r ON ur.role_id = r.id
        WHERE u.email = ? AND u.is_deleted = 0
        GROUP BY u.id
      `, [email]);

      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      return {
        id: user.id,
        email: user.email,
        password_hash: user.password_hash,
        name: user.name,
        failed_login_count: user.failed_login_count,
        locked_until: user.locked_until,
        must_change_password: user.must_change_password,
        roles: user.roles ? user.roles.split(',') : []
      };
    } catch (error) {
      logger.error('Failed to find user by email:', {
        error: error.message,
        email
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get user with roles by identifier (email OR username)
   * @param {string} identifier - Email or username
   * @param {Connection} conn - Optional database connection
   * @returns {Promise<Object|null>} User object with roles or null if not found
   */
  async findByIdentifierWithRoles(identifier, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      // Try with username field first (for databases with migration 003 applied)
      try {
        const [users] = await connection.execute(`
          SELECT
            u.id,
            u.email,
            u.password_hash,
            u.name,
            u.failed_login_count,
            u.locked_until,
            u.must_change_password,
            GROUP_CONCAT(r.name) as roles
          FROM core_users u
          LEFT JOIN core_user_roles ur ON u.id = ur.user_id
          LEFT JOIN core_roles r ON ur.role_id = r.id
          WHERE (u.email = ? OR u.username = ?) AND u.is_deleted = 0
          GROUP BY u.id
        `, [identifier, identifier]);

        if (users.length === 0) {
          return null;
        }

        const user = users[0];
        return {
          id: user.id,
          email: user.email,
          password_hash: user.password_hash,
          name: user.name,
          failed_login_count: user.failed_login_count,
          locked_until: user.locked_until,
          must_change_password: user.must_change_password,
          roles: user.roles ? user.roles.split(',') : []
        };
      } catch (error) {
        // If error is due to missing username column, fallback to email-only lookup
        if (error.code === 'ER_BAD_FIELD_ERROR' || error.message.includes('username')) {
          logger.warn('Username column not found, falling back to email-only authentication');

          const [users] = await connection.execute(`
            SELECT
              u.id,
              u.email,
              u.password_hash,
              u.name,
              u.failed_login_count,
              u.locked_until,
              u.must_change_password,
              GROUP_CONCAT(r.name) as roles
            FROM core_users u
            LEFT JOIN core_user_roles ur ON u.id = ur.user_id
            LEFT JOIN core_roles r ON ur.role_id = r.id
            WHERE u.email = ? AND u.is_deleted = 0
            GROUP BY u.id
          `, [identifier]);

          if (users.length === 0) {
            return null;
          }

          const user = users[0];
          return {
            id: user.id,
            email: user.email,
            password_hash: user.password_hash,
            name: user.name,
            failed_login_count: user.failed_login_count,
            locked_until: user.locked_until,
            must_change_password: user.must_change_password,
            roles: user.roles ? user.roles.split(',') : []
          };
        }
        throw error;
      }
    } catch (error) {
      logger.error('Failed to find user by identifier:', {
        error: error.message,
        identifier: identifier.substring(0, 3) + '***' // Partial log for security
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get user by ID with roles
   */
  async findByIdWithRoles(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      // Try with username field first (for databases with migration 003 applied)
      try {
        const [users] = await connection.execute(`
          SELECT
            u.id,
            u.email,
            u.username,
            u.name,
            u.password_hash,
            u.must_change_password,
            GROUP_CONCAT(r.name) as roles
          FROM core_users u
          LEFT JOIN core_user_roles ur ON u.id = ur.user_id
          LEFT JOIN core_roles r ON ur.role_id = r.id
          WHERE u.id = ? AND u.is_deleted = 0
          GROUP BY u.id
        `, [userId]);

        if (users.length === 0) {
          return null;
        }

        const user = users[0];
        const rolesArray = user.roles ? user.roles.split(',') : [];
        return {
          id: user.id,
          email: user.email,
          username: user.username || null,
          name: user.name,
          password_hash: user.password_hash,
          must_change_password: user.must_change_password,
          role: rolesArray[0] || null,  // Primary role for frontend compatibility
          roles: rolesArray
        };
      } catch (error) {
        // If error is due to missing username column, retry without it
        if (error.code === 'ER_BAD_FIELD_ERROR' || error.message.includes('username')) {
          logger.warn('Username column not found, using fallback query without username field');

          const [users] = await connection.execute(`
            SELECT
              u.id,
              u.email,
              u.name,
              u.password_hash,
              u.must_change_password,
              GROUP_CONCAT(r.name) as roles
            FROM core_users u
            LEFT JOIN core_user_roles ur ON u.id = ur.user_id
            LEFT JOIN core_roles r ON ur.role_id = r.id
            WHERE u.id = ? AND u.is_deleted = 0
            GROUP BY u.id
          `, [userId]);

          if (users.length === 0) {
            return null;
          }

          const user = users[0];
          const rolesArray = user.roles ? user.roles.split(',') : [];
          return {
            id: user.id,
            email: user.email,
            username: null, // Column doesn't exist yet
            name: user.name,
            password_hash: user.password_hash,
            must_change_password: user.must_change_password,
            role: rolesArray[0] || null,  // Primary role for frontend compatibility
            roles: rolesArray
          };
        }
        throw error;
      }
    } catch (error) {
      logger.error('Failed to find user by ID:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get failed login attempts count for user in last 30 minutes
   */
  async getRecentFailedAttempts(email, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [attempts] = await connection.execute(`
        SELECT COUNT(*) as failed_count 
        FROM core_login_attempts 
        WHERE email = ? 
        AND success = 0 
        AND attempted_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE)
      `, [email]);
      
      return attempts[0].failed_count;
    } catch (error) {
      logger.error('Failed to get recent failed attempts:', {
        error: error.message,
        email
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update user lock status
   */
  async updateLockStatus(userId, failedCount, lockUntil, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      await connection.execute(`
        UPDATE core_users 
        SET failed_login_count = ?, 
            locked_until = ? 
        WHERE id = ?
      `, [failedCount, lockUntil, userId]);
      
      if (shouldCommit) await connection.commit();
      return true;
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to update lock status:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Increment failed login count
   */
  async incrementFailedLoginCount(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      await connection.execute(`
        UPDATE core_users 
        SET failed_login_count = failed_login_count + 1 
        WHERE id = ?
      `, [userId]);
      
      if (shouldCommit) await connection.commit();
      return true;
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to increment failed login count:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update user on successful login - resets failed attempts and updates last_login
   */
  async updateSuccessfulLogin(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      await connection.execute(`
        UPDATE core_users
        SET failed_login_count = 0,
            locked_until = NULL,
            last_login = UTC_TIMESTAMP()
        WHERE id = ?
      `, [userId]);

      if (shouldCommit) await connection.commit();
      return true;
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to update successful login:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Create a new session
   */
  async createSession(userId, token, ipAddress, userAgent, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      const expiresAt = new Date(Date.now() + (8 * 60 * 60 * 1000)); // 8 hours
      
      await connection.execute(`
        INSERT INTO core_sessions 
        (user_id, token, ip_address, user_agent, expires_at, created_at) 
        VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
      `, [userId, token, ipAddress, userAgent, expiresAt]);
      
      if (shouldCommit) await connection.commit();
      return { success: true, expiresAt };
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to create session:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Invalidate session by token
   */
  async invalidateSession(token, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      const [result] = await connection.execute(`
        DELETE FROM core_sessions 
        WHERE token = ?
      `, [token]);
      
      if (shouldCommit) await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to invalidate session:', {
        error: error.message,
        token: token.substring(0, 10) + '...' // Log only first 10 chars for security
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      const [result] = await connection.execute(`
        DELETE FROM core_sessions 
        WHERE expires_at < UTC_TIMESTAMP()
      `);
      
      if (shouldCommit) await connection.commit();
      
      if (result.affectedRows > 0) {
        logger.info(`Cleaned up ${result.affectedRows} expired sessions`);
      }
      
      return result.affectedRows;
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to cleanup expired sessions:', {
        error: error.message
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Change user password and clear must_change_password flag
   * @param {number} userId - User ID
   * @param {string} passwordHash - New password hash
   * @returns {Promise<boolean>}
   */
  async changeUserPassword(userId, passwordHash) {
    const connection = await this.getConnectionWithTimeout();
    const shouldRelease = true;
    const shouldCommit = true;

    try {
      if (shouldCommit) await connection.beginTransaction();

      await connection.query(
        'UPDATE core_users SET password_hash = ?, must_change_password = 0, updated_at = NOW() WHERE id = ?',
        [passwordHash, userId]
      );

      if (shouldCommit) await connection.commit();
      return true;
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to change user password', {
        userId,
        error: error.message
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = AuthRepository;