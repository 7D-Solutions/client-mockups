const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

class FavoritesRepository extends BaseRepository {
  constructor() {
    super('user_favorites', 'id');
  }

  /**
   * Get user's favorites sorted by position
   */
  async getUserFavorites(userId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const [rows] = await connection.execute(`
        SELECT
          id,
          user_id,
          item_id,
          position,
          created_at,
          updated_at
        FROM user_favorites
        WHERE user_id = ?
        ORDER BY position ASC
      `, [userId]);

      return rows;
    } catch (error) {
      logger.error('Failed to get user favorites:', {
        error: error.message,
        userId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Add a favorite item for a user
   */
  async addFavorite(userId, itemId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      // Get the highest position for this user
      const [maxPosition] = await connection.execute(`
        SELECT COALESCE(MAX(position), -1) as max_position
        FROM user_favorites
        WHERE user_id = ?
      `, [userId]);

      const newPosition = maxPosition[0].max_position + 1;

      // Insert the new favorite
      const [result] = await connection.execute(`
        INSERT INTO user_favorites (user_id, item_id, position)
        VALUES (?, ?, ?)
      `, [userId, itemId, newPosition]);

      return {
        id: result.insertId,
        user_id: userId,
        item_id: itemId,
        position: newPosition
      };
    } catch (error) {
      // Check for duplicate key error
      if (error.code === 'ER_DUP_ENTRY') {
        const duplicateError = new Error('Favorite already exists');
        duplicateError.code = 'DUPLICATE_FAVORITE';
        throw duplicateError;
      }

      logger.error('Failed to add favorite:', {
        error: error.message,
        userId,
        itemId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Remove a favorite item for a user
   */
  async removeFavorite(userId, itemId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const [result] = await connection.execute(`
        DELETE FROM user_favorites
        WHERE user_id = ? AND item_id = ?
      `, [userId, itemId]);

      if (result.affectedRows === 0) {
        const notFoundError = new Error('Favorite not found');
        notFoundError.code = 'FAVORITE_NOT_FOUND';
        throw notFoundError;
      }

      return { deleted: true };
    } catch (error) {
      if (error.code === 'FAVORITE_NOT_FOUND') {
        throw error;
      }

      logger.error('Failed to remove favorite:', {
        error: error.message,
        userId,
        itemId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Reorder user's favorites
   * @param {number} userId - User ID
   * @param {string[]} order - Array of item IDs in desired order
   */
  async reorderFavorites(userId, order, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      // Update each favorite's position
      for (let i = 0; i < order.length; i++) {
        await connection.execute(`
          UPDATE user_favorites
          SET position = ?, updated_at = NOW()
          WHERE user_id = ? AND item_id = ?
        `, [i, userId, order[i]]);
      }

      if (shouldCommit) await connection.commit();

      return { reordered: true };
    } catch (error) {
      if (shouldCommit) await connection.rollback();

      logger.error('Failed to reorder favorites:', {
        error: error.message,
        userId,
        orderLength: order.length
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Check if a favorite exists for a user
   */
  async favoriteExists(userId, itemId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const [rows] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM user_favorites
        WHERE user_id = ? AND item_id = ?
      `, [userId, itemId]);

      return rows[0].count > 0;
    } catch (error) {
      logger.error('Failed to check favorite existence:', {
        error: error.message,
        userId,
        itemId
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = FavoritesRepository;
