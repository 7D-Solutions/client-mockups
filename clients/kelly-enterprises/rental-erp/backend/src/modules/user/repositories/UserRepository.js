const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class UserRepository extends BaseRepository {
  constructor() {
    super('core_users', 'id');
  }

  /**
   * Get user's gauge assignments
   */
  async getUserAssignments(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          g.id,
          g.gauge_id,
          g.name,
          g.status,
          g.equipment_type,
          g.serial_number,
          gac.checked_out_to
        FROM gauges g
        INNER JOIN gauge_active_checkouts gac ON gac.gauge_id = g.id
        WHERE gac.checked_out_to = ? 
        AND g.is_active = 1 
        AND g.is_deleted = 0
        ORDER BY g.updated_at DESC
      `, [userId]);

      return rows;
    } catch (error) {
      logger.error('Failed to get user assignments:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get user's pending transfers
   */
  async getUserPendingTransfers(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          t.id,
          t.gauge_id,
          t.from_user_id,
          t.to_user_id,
          t.reason,
          t.status,
          t.created_at,
          g.gauge_id as gauge_name,
          g.name as gauge_display_name,
          from_user.name as from_user_name,
          to_user.name as to_user_name
        FROM gauge_transfers t
        LEFT JOIN gauges g ON t.gauge_id = g.id
        LEFT JOIN core_users from_user ON t.from_user_id = from_user.id
        LEFT JOIN core_users to_user ON t.to_user_id = to_user.id
        WHERE (t.from_user_id = ? OR t.to_user_id = ?) 
        AND t.status IN ('pending', 'in_progress')
        ORDER BY t.created_at DESC
      `, [userId, userId]);

      return rows;
    } catch (error) {
      logger.error('Failed to get user pending transfers:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get all active users (for transfer dropdown, etc.)
   */
  async getAllActiveUsers(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const [rows] = await connection.execute(`
        SELECT
          id,
          name,
          email,
          department
        FROM core_users
        WHERE is_active = 1
        ORDER BY name ASC
      `);

      return rows;
    } catch (error) {
      logger.error('Failed to get active users:', {
        error: error.message
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get user profile with preferences and roles
   */
  async getUserProfile(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const [users] = await connection.execute(`
        SELECT
          u.id,
          u.username,
          u.name,
          u.email,
          u.phone,
          u.department,
          u.position,
          u.theme,
          u.language,
          u.timezone,
          u.email_notifications,
          u.push_notifications,
          u.gauge_alerts,
          u.maintenance_reminders,
          u.default_view,
          u.items_per_page,
          u.created_at,
          u.updated_at,
          u.last_login,
          GROUP_CONCAT(DISTINCT r.name) as roles
        FROM core_users u
        LEFT JOIN core_user_roles ur ON u.id = ur.user_id
        LEFT JOIN core_roles r ON ur.role_id = r.id
        WHERE u.id = ? AND u.is_active = 1 AND u.is_deleted = 0
        GROUP BY u.id
      `, [userId]);

      if (users.length === 0) {
        return null;
      }

      return users[0];
    } catch (error) {
      logger.error('Failed to get user profile:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update user profile and preferences
   */
  async updateUserProfile(userId, data, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      // Build dynamic UPDATE query based on provided fields
      const updates = [];
      const values = [];

      // Profile fields
      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.email !== undefined) {
        updates.push('email = ?');
        values.push(data.email);
      }
      if (data.phone !== undefined) {
        updates.push('phone = ?');
        values.push(data.phone);
      }

      // Preference fields
      if (data.theme !== undefined) {
        updates.push('theme = ?');
        values.push(data.theme);
      }
      if (data.language !== undefined) {
        updates.push('language = ?');
        values.push(data.language);
      }
      if (data.timezone !== undefined) {
        updates.push('timezone = ?');
        values.push(data.timezone);
      }
      if (data.emailNotifications !== undefined) {
        updates.push('email_notifications = ?');
        values.push(data.emailNotifications);
      }
      if (data.pushNotifications !== undefined) {
        updates.push('push_notifications = ?');
        values.push(data.pushNotifications);
      }
      if (data.gaugeAlerts !== undefined) {
        updates.push('gauge_alerts = ?');
        values.push(data.gaugeAlerts);
      }
      if (data.maintenanceReminders !== undefined) {
        updates.push('maintenance_reminders = ?');
        values.push(data.maintenanceReminders);
      }
      if (data.defaultView !== undefined) {
        updates.push('default_view = ?');
        values.push(data.defaultView);
      }
      if (data.itemsPerPage !== undefined) {
        updates.push('items_per_page = ?');
        values.push(data.itemsPerPage);
      }

      // Always update timestamp
      updates.push('updated_at = NOW()');
      values.push(userId);

      if (updates.length === 1) {
        // Only timestamp update, nothing to do
        return await this.getUserProfile(userId, connection);
      }

      await connection.execute(
        `UPDATE core_users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Return updated profile
      return await this.getUserProfile(userId, connection);
    } catch (error) {
      logger.error('Failed to update user profile:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = UserRepository;