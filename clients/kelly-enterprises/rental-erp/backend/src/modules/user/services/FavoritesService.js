const BaseService = require('../../../infrastructure/services/BaseService');
const logger = require('../../../infrastructure/utils/logger');

// Valid navigation item IDs (from FINAL-NAVIGATION-SPECIFICATION.md)
const VALID_ITEM_IDS = new Set([
  // Main Navigation
  'gauge-management',
  'inventory',
  'my-dashboard',
  'admin',

  // Gauge Operations Context
  'pending-qc',
  'out-of-service',
  'calibration-due',
  'checked-out',

  // Inventory Context
  'low-stock',
  'pending-orders',
  'recent-receipts',
  'stock-adjustments',
  'categories',

  // Dashboard Context
  'my-checkouts',
  'alerts',
  'recent-activity',

  // Admin Context
  'user-management',
  'gauge-types',
  'locations',
  'calibration-settings',
  'reports',
  'system-settings'
]);

class FavoritesService extends BaseService {
  constructor(favoritesRepository, options = {}) {
    super(favoritesRepository, options);
  }

  /**
   * Validates if an item ID is in the allowed list
   */
  isValidItemId(itemId) {
    return VALID_ITEM_IDS.has(itemId);
  }

  /**
   * Get user's favorites sorted by position
   */
  async getUserFavorites(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const favorites = await this.repository.getUserFavorites(userId);

      // Return only the item IDs in order (frontend needs this format)
      const itemIds = favorites.map(fav => fav.item_id);

      return {
        success: true,
        data: itemIds
      };
    } catch (error) {
      logger.error('Failed to get user favorites:', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Add a favorite for a user
   */
  async addFavorite(userId, itemId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!itemId) {
        throw new Error('Item ID is required');
      }

      // Validate item ID
      if (!this.isValidItemId(itemId)) {
        const error = new Error('Invalid item ID');
        error.code = 'INVALID_ITEM_ID';
        throw error;
      }

      const result = await this.repository.addFavorite(userId, itemId);

      return {
        success: true,
        data: {
          item_id: result.item_id,
          position: result.position
        }
      };
    } catch (error) {
      if (error.code === 'DUPLICATE_FAVORITE') {
        logger.warn('Attempt to add duplicate favorite:', {
          userId,
          itemId
        });
        // Return success for idempotency (frontend already has it starred)
        return {
          success: true,
          data: { item_id: itemId, message: 'Favorite already exists' }
        };
      }

      if (error.code === 'INVALID_ITEM_ID') {
        logger.warn('Invalid item ID attempted:', {
          userId,
          itemId
        });
        throw error;
      }

      logger.error('Failed to add favorite:', {
        error: error.message,
        userId,
        itemId
      });
      throw error;
    }
  }

  /**
   * Remove a favorite for a user
   */
  async removeFavorite(userId, itemId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!itemId) {
        throw new Error('Item ID is required');
      }

      await this.repository.removeFavorite(userId, itemId);

      return {
        success: true,
        data: { item_id: itemId }
      };
    } catch (error) {
      if (error.code === 'FAVORITE_NOT_FOUND') {
        logger.warn('Attempt to remove non-existent favorite:', {
          userId,
          itemId
        });
        // Return success for idempotency (frontend already has it unstarred)
        return {
          success: true,
          data: { item_id: itemId, message: 'Favorite not found' }
        };
      }

      logger.error('Failed to remove favorite:', {
        error: error.message,
        userId,
        itemId
      });
      throw error;
    }
  }

  /**
   * Reorder user's favorites
   */
  async reorderFavorites(userId, order) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!Array.isArray(order) || order.length === 0) {
        throw new Error('Order must be a non-empty array');
      }

      // Validate all item IDs in the order array
      for (const itemId of order) {
        if (!this.isValidItemId(itemId)) {
          const error = new Error(`Invalid item ID in order: ${itemId}`);
          error.code = 'INVALID_ITEM_ID';
          throw error;
        }
      }

      // Check for duplicates in order array
      const uniqueItems = new Set(order);
      if (uniqueItems.size !== order.length) {
        throw new Error('Order array contains duplicate item IDs');
      }

      await this.repository.reorderFavorites(userId, order);

      return {
        success: true,
        data: { order }
      };
    } catch (error) {
      if (error.code === 'INVALID_ITEM_ID') {
        logger.warn('Invalid item ID in reorder:', {
          userId,
          order
        });
        throw error;
      }

      logger.error('Failed to reorder favorites:', {
        error: error.message,
        userId,
        orderLength: order?.length
      });
      throw error;
    }
  }
}

module.exports = FavoritesService;
