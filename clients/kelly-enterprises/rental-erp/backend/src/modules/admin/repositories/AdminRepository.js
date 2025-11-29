const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class AdminRepository extends BaseRepository {
  constructor() {
    super('core_users', 'id');
  }

  /**
   * Get users with pagination and filters
   */
  async getUsers(options = {}, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const { limit = 10, offset = 0, includeDeleted = false, search = '', sortBy = 'name', sortOrder = 'asc' } = options;
      // Ensure limit and offset are integers
      const limitInt = parseInt(limit) || 10;
      const offsetInt = parseInt(offset) || 0;

      logger.debug(`getUsers called with limit: ${limitInt}, offset: ${offsetInt}, includeDeleted: ${includeDeleted}, search: ${search}, sortBy: ${sortBy}, sortOrder: ${sortOrder}`);

      // Build WHERE clause
      const conditions = [];
      const params = [];

      if (!includeDeleted) {
        conditions.push('u.is_deleted = 0');
      }

      if (search) {
        conditions.push('(u.email LIKE ? OR u.name LIKE ? OR u.username LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const [countResult] = await connection.query(
        `SELECT COUNT(*) as total FROM core_users u ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // Validate and build ORDER BY clause
      const validSortColumns = ['name', 'email', 'created_at', 'last_login'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
      const sortDirection = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      // Get users with roles - build query based on filters
      let query = `
        SELECT
          u.id,
          u.email,
          u.username,
          u.name,
          u.is_active,
          u.failed_login_count,
          u.locked_until,
          u.created_at,
          u.updated_at,
          u.last_login,
          u.is_deleted,
          GROUP_CONCAT(r.name) as roles
        FROM core_users u
        LEFT JOIN core_user_roles ur ON u.id = ur.user_id
        LEFT JOIN core_roles r ON ur.role_id = r.id
        ${whereClause}
        GROUP BY u.id
        ORDER BY u.${sortColumn} ${sortDirection}
        LIMIT ? OFFSET ?`;
      
      // Add pagination params to the query params
      const queryParams = [...params, limitInt, offsetInt];
      
      const [users] = await connection.query(query, queryParams);
      
      return {
        users: users.map(user => ({
          ...user,
          roles: user.roles ? user.roles.split(',').map(r => {
            if (r === 'admin') return 'Admin';
            if (r === 'super_admin') return 'Super Admin';
            return r;
          }) : []
        })),
        total,
        page: Math.floor(offsetInt / limitInt) + 1,
        totalPages: Math.ceil(total / limitInt)
      };
    } catch (error) {
      logger.error('Failed to get users:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      // User statistics
      const [userStats] = await connection.query(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN is_deleted = 1 THEN 1 ELSE 0 END) as deleted_users,
          SUM(CASE WHEN locked_until IS NOT NULL AND locked_until > NOW() THEN 1 ELSE 0 END) as locked_users,
          COUNT(DISTINCT DATE(created_at)) as days_active
        FROM core_users
      `);

      // Recent activity (last 7 days)
      const [recentActivity] = await connection.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM core_users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      // Login statistics (last 30 days)
      const [loginStats] = await connection.query(`
        SELECT 
          COUNT(*) as total_attempts,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_logins,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_logins,
          COUNT(DISTINCT email) as unique_users
        FROM core_login_attempts
        WHERE attempted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      return {
        users: userStats[0],
        recentActivity,
        loginStats: loginStats[0]
      };
    } catch (error) {
      logger.error('Failed to get system stats:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get detailed user statistics
   */
  async getDetailedUserStats(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      // User breakdown by role
      const [userByRole] = await connection.query(`
        SELECT 
          r.name as role,
          COUNT(ur.user_id) as count
        FROM core_roles r
        LEFT JOIN core_user_roles ur ON r.id = ur.role_id
        LEFT JOIN core_users u ON ur.user_id = u.id AND u.is_deleted = 0
        GROUP BY r.id, r.name
        ORDER BY count DESC
      `);

      // Login trends (last 6 months)
      const [loginTrends] = await connection.query(`
        SELECT 
          DATE_FORMAT(attempted_at, '%Y-%m') as month,
          COUNT(*) as total_attempts,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
        FROM core_login_attempts
        WHERE attempted_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(attempted_at, '%Y-%m')
        ORDER BY month DESC
      `);

      return {
        userByRole,
        loginTrends
      };
    } catch (error) {
      logger.error('Failed to get detailed user stats:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get gauge statistics
   */
  async getGaugeStats(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      // Basic gauge statistics
      const [gaugeStats] = await connection.query(`
        SELECT 
          COUNT(*) as total_gauges,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_gauges,
          SUM(CASE WHEN is_deleted = 1 THEN 1 ELSE 0 END) as deleted_gauges,
          SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) as checked_out,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status = 'calibration' THEN 1 ELSE 0 END) as in_calibration
        FROM gauges
      `);

      // Gauge breakdown by equipment type and status
      const [gaugeBreakdown] = await connection.query(`
        SELECT 
          equipment_type,
          status,
          COUNT(*) as count
        FROM gauges
        WHERE is_deleted = 0
        GROUP BY equipment_type, status
        ORDER BY equipment_type, status
      `);

      // Status distribution
      const [statusCounts] = await connection.query(`
        SELECT status, COUNT(*) as count 
        FROM gauges 
        WHERE is_deleted = 0 
        GROUP BY status
      `);

      // Checkout statistics - using gauge_active_checkouts table
      const [checkoutStats] = await connection.query(`
        SELECT 
          COUNT(*) as total_checkouts,
          COUNT(DISTINCT gac.checked_out_to) as unique_users
        FROM gauge_active_checkouts gac
        JOIN gauges g ON gac.gauge_id = g.id
        WHERE g.is_deleted = 0
      `);

      return {
        basic: gaugeStats[0],
        breakdown: gaugeBreakdown,
        statusDistribution: statusCounts,
        checkouts: checkoutStats[0]
      };
    } catch (error) {
      logger.error('Failed to get gauge stats:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get gauge details for recovery
   */
  async getGaugeDetailsForRecovery(gaugeId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      // Get gauge details
      const [gaugeRows] = await connection.query(
        `SELECT g.*
         FROM gauges g
         WHERE g.gauge_id = ?`,
        [gaugeId]
      );

      if (gaugeRows.length === 0) {
        return null;
      }

      const gauge = gaugeRows[0];

      // Check for pending transfers
      const [transferRows] = await connection.query(
        `SELECT t.*, 
         from_user.name as from_user_name,
         to_user.name as to_user_name
         FROM gauge_transfers t
         LEFT JOIN core_users from_user ON t.from_user_id = from_user.id
         LEFT JOIN core_users to_user ON t.to_user_id = to_user.id
         WHERE t.gauge_id = ? AND t.status IN ('pending', 'in_progress')`,
        [gauge.id]
      );

      // Check for pending unseal requests
      const [unsealRows] = await connection.query(
        `SELECT ur.*, u.name as requested_by_name
         FROM unseal_requests ur
         LEFT JOIN core_users u ON ur.requested_by = u.id
         WHERE ur.gauge_id = ? AND ur.status = 'pending'`,
        [gauge.id]
      );

      // Check for active assignments
      const [assignmentRows] = await connection.query(
        `SELECT gac.*, u.name as user_name
         FROM gauge_assignment_checks gac
         LEFT JOIN core_users u ON gac.user_id = u.id
         WHERE gac.gauge_id = ? AND gac.returned_at IS NULL`,
        [gauge.id]
      );

      // Check if calibration is overdue
      const [calibrationRows] = await connection.query(
        `SELECT due_date 
         FROM gauge_calibrations 
         WHERE gauge_id = ? 
         ORDER BY due_date DESC 
         LIMIT 1`,
        [gauge.id]
      );

      return {
        gauge,
        pendingTransfers: transferRows,
        pendingUnsealRequests: unsealRows,
        activeAssignments: assignmentRows,
        lastCalibration: calibrationRows[0] || null
      };
    } catch (error) {
      logger.error('Failed to get gauge details for recovery:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email, excludeUserId = null, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      let query = 'SELECT id FROM core_users WHERE email = ?';
      const params = [email];
      
      if (excludeUserId) {
        query += ' AND id !== ?';
        params.push(excludeUserId);
      }
      
      const [existing] = await connection.query(query, params);
      return existing.length > 0;
    } catch (error) {
      logger.error('Failed to check email existence:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Check if username exists
   */
  async usernameExists(username, excludeUserId = null, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      let query = 'SELECT id FROM core_users WHERE username = ?';
      const params = [username];
      
      if (excludeUserId) {
        query += ' AND id !== ?';
        params.push(excludeUserId);
      }
      
      const [existing] = await connection.query(query, params);
      return existing.length > 0;
    } catch (error) {
      logger.error('Failed to check username existence:', error);
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
      const [users] = await connection.query(`
        SELECT
          u.id,
          u.email,
          u.username,
          u.name,
          u.is_active,
          u.created_at,
          u.updated_at,
          u.last_login,
          GROUP_CONCAT(DISTINCT r.name) as roles,
          GROUP_CONCAT(DISTINCT CONCAT(p.module_id, '.', p.action)) as permissions
        FROM core_users u
        LEFT JOIN core_user_roles ur ON u.id = ur.user_id
        LEFT JOIN core_roles r ON ur.role_id = r.id
        LEFT JOIN core_role_permissions rp ON r.id = rp.role_id
        LEFT JOIN core_permissions p ON rp.permission_id = p.id
        WHERE u.id = ? AND u.is_deleted = 0
        GROUP BY u.id
      `, [userId]);
      
      if (users.length === 0) {
        return null;
      }
      
      const user = users[0];
      return {
        ...user,
        roles: user.roles ? user.roles.split(',').map(r => r === 'admin' ? 'Admin' : r) : [],
        permissions: user.permissions ? user.permissions.split(',') : []
      };
    } catch (error) {
      logger.error('Failed to find user by ID with roles:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Assign roles to a user
   */
  async assignUserRoles(userId, roleNames, conn, assignedBy = null) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      // Get role IDs
      const roles = await this.getRoles(conn);
      const roleMap = {};
      roles.forEach(role => {
        roleMap[role.name] = role.id;
      });

      // Use provided assignedBy or default to the user being updated (for self-assignment)
      const assignerId = assignedBy || userId;

      // Insert user roles using parameterized queries
      for (const roleName of roleNames) {
        const roleId = roleMap[roleName];
        if (roleId) {
          await connection.query(
            'INSERT INTO core_user_roles (user_id, role_id, assigned_by, assigned_at) VALUES (?, ?, ?, UTC_TIMESTAMP())',
            [userId, roleId, assignerId]
          );
        }
      }
    } catch (error) {
      logger.error('Failed to assign user roles:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Remove all roles from a user
   */
  async removeUserRoles(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      await connection.query(
        'DELETE FROM core_user_roles WHERE user_id = ?',
        [userId]
      );
    } catch (error) {
      logger.error('Failed to remove user roles:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get all roles
   */
  async getRoles(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const [roles] = await connection.query(`
        SELECT
          r.id,
          r.name,
          r.description,
          COUNT(ur.user_id) as user_count
        FROM core_roles r
        LEFT JOIN core_user_roles ur ON r.id = ur.role_id
        LEFT JOIN core_users u ON ur.user_id = u.id AND u.is_deleted = 0
        WHERE r.name IN ('User', 'QC', 'admin', 'Admin', 'super_admin')
        GROUP BY r.id
        ORDER BY FIELD(r.name, 'super_admin', 'admin', 'Admin', 'QC', 'User')
      `);

      // Normalize role names for display: 'admin' -> 'Admin', 'super_admin' -> 'Super Admin'
      return roles.map(role => ({
        ...role,
        name: role.name === 'admin' ? 'Admin' : role.name === 'super_admin' ? 'Super Admin' : role.name
      }));
    } catch (error) {
      logger.error('Failed to get roles:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(hours = 24, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [activity] = await connection.query(`
        SELECT 
          'New User' as type,
          CONCAT('User ', name, ' joined') as description,
          created_at as timestamp
        FROM core_users
        WHERE created_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
        ORDER BY created_at DESC
        LIMIT 20
      `, [hours]);
      
      return activity;
    } catch (error) {
      logger.error('Failed to get recent activity:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get user by email for password verification
   */
  async getUserPasswordHash(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [users] = await connection.query(
        'SELECT password_hash FROM core_users WHERE id = ?',
        [userId]
      );
      
      return users[0] || null;
    } catch (error) {
      logger.error('Failed to get user password hash:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update user password
   */
  async updateUserPassword(userId, passwordHash, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      await connection.query(
        'UPDATE core_users SET password_hash = ?, must_change_password = 1, updated_at = NOW() WHERE id = ?',
        [passwordHash, userId]
      );
      
      if (shouldCommit) await connection.commit();
      return true;
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to update user password:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get users for integrity check
   */
  async getUsersForIntegrityCheck(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [users] = await connection.query(`
        SELECT 
          u.id,
          u.email,
          u.name,
          u.is_active,
          u.is_deleted,
          GROUP_CONCAT(r.name) as roles
        FROM core_users u
        LEFT JOIN core_user_roles ur ON u.id = ur.user_id
        LEFT JOIN core_roles r ON ur.role_id = r.id
        GROUP BY u.id
      `);
      
      return users.map(user => ({
        ...user,
        roles: user.roles ? user.roles.split(',').map(r => r === 'admin' ? 'Admin' : r) : []
      }));
    } catch (error) {
      logger.error('Failed to get users for integrity check:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get data consistency issues
   */
  async getDataConsistencyIssues(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const issues = [];

      // Check 1: Checked out but no user
      const [check1] = await connection.query(`
        SELECT g.gauge_id, g.status, gac.user_id
        FROM gauges g
        LEFT JOIN (
          SELECT gauge_id, user_id
          FROM gauge_assignment_checks
          WHERE returned_at IS NULL
          GROUP BY gauge_id
        ) gac ON g.id = gac.gauge_id
        WHERE g.status = 'checked_out' 
          AND gac.user_id IS NULL
          AND g.is_deleted = 0
      `);
      
      check1.forEach(row => {
        issues.push({
          type: 'gauge_status_mismatch',
          gauge_id: row.gauge_id,
          status: row.status,
          user_id: row.user_id,
          issue: 'Gauge marked as checked out but no active assignment'
        });
      });

      // Check 2: Has user but not checked out
      const [check2] = await connection.query(`
        SELECT g.gauge_id, g.status, gac.user_id
        FROM gauges g
        INNER JOIN (
          SELECT gauge_id, user_id
          FROM gauge_assignment_checks
          WHERE returned_at IS NULL
          GROUP BY gauge_id
        ) gac ON g.id = gac.gauge_id
        WHERE g.status != 'checked_out'
          AND g.is_deleted = 0
      `);
      
      check2.forEach(row => {
        issues.push({
          type: 'gauge_status_mismatch',
          gauge_id: row.gauge_id,
          status: row.status,
          user_id: row.user_id,
          issue: 'Gauge has active assignment but not marked as checked out'
        });
      });

      // Check 3: Pending QC but wrong status
      const [check3] = await connection.query(`
        SELECT gauge_id, status, 'N/A' as qc_verification_status
        FROM gauges
        WHERE status = 'pending_qc'
          AND is_deleted = 0
      `);
      
      check3.forEach(row => {
        issues.push({
          type: 'qc_status_mismatch',
          gauge_id: row.gauge_id,
          status: row.status,
          qc_verification_status: row.qc_verification_status,
          issue: 'Gauge in pending_qc status but no QC record'
        });
      });

      return issues;
    } catch (error) {
      logger.error('Failed to get data consistency issues:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update gauge status
   */
  async updateGaugeStatus(gaugeId, status, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      await connection.query(
        'UPDATE gauges SET status = ? WHERE id = ?',
        [status, gaugeId]
      );
      
      if (shouldCommit) await connection.commit();
      return true;
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to update gauge status:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get gauges for maintenance
   */
  async getGaugesForMaintenance(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [rows] = await connection.query(`
        SELECT 
          g.id,
          g.gauge_id,
          g.status,
          g.is_active,
          gc.due_date as calibration_due_date,
          CASE 
            WHEN gc.due_date < NOW() THEN 'overdue'
            WHEN gc.due_date <= DATE_ADD(NOW(), INTERVAL 30 DAY) THEN 'due_soon'
            ELSE 'ok'
          END as calibration_status
        FROM gauges g
        LEFT JOIN (
          SELECT gauge_id, MAX(due_date) as due_date
          FROM gauge_calibrations
          WHERE is_active = 1
          GROUP BY gauge_id
        ) gc ON g.id = gc.gauge_id
        WHERE g.is_deleted = 0
      `);
      
      return rows;
    } catch (error) {
      logger.error('Failed to get gauges for maintenance:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get overdue calibration count
   */
  async getOverdueCalibrationCount(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [result] = await connection.query(`
        SELECT COUNT(*) as overdue_count
        FROM gauges g
        INNER JOIN gauge_calibrations gc ON g.id = gc.gauge_id
        WHERE gc.due_date < NOW() 
          AND gc.is_active = 1
          AND g.is_deleted = 0
      `);
      
      return result[0].overdue_count;
    } catch (error) {
      logger.error('Failed to get overdue calibration count:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get due soon calibration count
   */
  async getDueSoonCalibrationCount(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [result] = await connection.query(`
        SELECT COUNT(*) as due_soon_count
        FROM gauges g
        INNER JOIN gauge_calibrations gc ON g.id = gc.gauge_id
        WHERE gc.due_date >= NOW() 
          AND gc.due_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
          AND gc.is_active = 1
          AND g.is_deleted = 0
      `);
      
      return result[0].due_soon_count;
    } catch (error) {
      logger.error('Failed to get due soon calibration count:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get system settings
   */
  async getSystemSettings(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [rows] = await connection.query(`
        SELECT 
          setting_key,
          setting_value,
          description,
          updated_at
        FROM system_settings 
        ORDER BY setting_key ASC
      `);
      
      return rows;
    } catch (error) {
      logger.error('Failed to get system settings:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update system setting
   */
  async updateSystemSetting(key, value, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      await connection.query(`
        INSERT INTO system_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          setting_value = VALUES(setting_value),
          updated_at = NOW()
      `, [key, value]);
      
      // Return the updated setting
      const [rows] = await connection.query(`
        SELECT 
          setting_key,
          setting_value,
          description,
          updated_at
        FROM system_settings 
        WHERE setting_key = ?
      `, [key]);
      
      return rows[0];
    } catch (error) {
      logger.error('Failed to update system setting:', { key, value, error });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Grant multiple permissions to a user
   */
  async grantPermissionsBulk(userId, permissionIds, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      // Build the values for bulk insert
      const values = permissionIds.map(permissionId => [userId, permissionId]);

      // Insert permissions (ignore duplicates)
      await conn.query(`
        INSERT IGNORE INTO core_user_permissions (user_id, permission_id)
        VALUES ?
      `, [values]);

      return true;
    } catch (error) {
      logger.error('Failed to grant permissions in bulk:', { userId, permissionIds, error });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Revoke multiple permissions from a user
   */
  async revokePermissionsBulk(userId, permissionIds, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      if (permissionIds.length === 0) {
        return true;
      }

      // Build the IN clause
      const placeholders = permissionIds.map(() => '?').join(',');

      // Delete permissions
      await conn.query(`
        DELETE FROM core_user_permissions
        WHERE user_id = ? AND permission_id IN (${placeholders})
      `, [userId, ...permissionIds]);

      return true;
    } catch (error) {
      logger.error('Failed to revoke permissions in bulk:', { userId, permissionIds, error });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }
}

module.exports = AdminRepository;