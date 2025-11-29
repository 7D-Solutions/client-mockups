/**
 * UserPreferencesService
 *
 * Service for managing user preferences with cross-device synchronization.
 * Preferences are stored as JSON and synced across all user's devices.
 */

const { getPool } = require('../../../infrastructure/database/connection');
const logger = require('../../../infrastructure/utils/logger');

class UserPreferencesService {
  /**
   * Get a user preference by key
   * @param {number} userId - User ID
   * @param {string} preferenceKey - Preference key (e.g., 'column-config-gauge-list')
   * @returns {Promise<object|null>} Preference value or null if not found
   */
  async getUserPreference(userId, preferenceKey) {
    try {
      const pool = getPool();
      if (!pool) {
        throw new Error('Database pool not initialized');
      }

      const [rows] = await pool.query(
        'SELECT preference_value FROM user_preferences WHERE user_id = ? AND preference_key = ?',
        [userId, preferenceKey]
      );

      if (rows.length === 0) {
        return null;
      }

      const value = rows[0].preference_value;
      return value;
    } catch (error) {
      logger.error('Error fetching user preference:', { userId, preferenceKey, error: error.message });
      throw error;
    }
  }

  /**
   * Get all preferences for a user
   * @param {number} userId - User ID
   * @returns {Promise<object>} Object with preference keys and values
   */
  async getAllUserPreferences(userId) {
    try {
      const pool = getPool();
      if (!pool) {
        throw new Error('Database pool not initialized');
      }

      const [rows] = await pool.query(
        'SELECT preference_key, preference_value FROM user_preferences WHERE user_id = ?',
        [userId]
      );

      const preferences = {};
      rows.forEach(row => {
        preferences[row.preference_key] = row.preference_value;
      });

      return preferences;
    } catch (error) {
      logger.error('Error fetching all user preferences:', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Save or update a user preference
   * @param {number} userId - User ID
   * @param {string} preferenceKey - Preference key
   * @param {object} preferenceValue - Preference value (will be stored as JSON)
   * @returns {Promise<void>}
   */
  async saveUserPreference(userId, preferenceKey, preferenceValue) {
    try {
      const pool = getPool();
      if (!pool) {
        throw new Error('Database pool not initialized');
      }

      const jsonString = JSON.stringify(preferenceValue);

      const [result] = await pool.query(
        `INSERT INTO user_preferences (user_id, preference_key, preference_value)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           preference_value = VALUES(preference_value),
           updated_at = CURRENT_TIMESTAMP`,
        [userId, preferenceKey, jsonString]
      );

      logger.info('User preference saved:', { userId, preferenceKey });
    } catch (error) {
      logger.error('Error saving user preference:', { userId, preferenceKey, error: error.message });
      throw error;
    }
  }

  /**
   * Delete a user preference
   * @param {number} userId - User ID
   * @param {string} preferenceKey - Preference key
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteUserPreference(userId, preferenceKey) {
    try {
      const pool = getPool();
      if (!pool) {
        throw new Error('Database pool not initialized');
      }

      const [result] = await pool.query(
        'DELETE FROM user_preferences WHERE user_id = ? AND preference_key = ?',
        [userId, preferenceKey]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting user preference:', { userId, preferenceKey, error: error.message });
      throw error;
    }
  }

  /**
   * Delete all preferences for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of preferences deleted
   */
  async deleteAllUserPreferences(userId) {
    try {
      const pool = getPool();
      if (!pool) {
        throw new Error('Database pool not initialized');
      }

      const [result] = await pool.query(
        'DELETE FROM user_preferences WHERE user_id = ?',
        [userId]
      );

      return result.affectedRows;
    } catch (error) {
      logger.error('Error deleting all user preferences:', { userId, error: error.message });
      throw error;
    }
  }
}

module.exports = new UserPreferencesService();
