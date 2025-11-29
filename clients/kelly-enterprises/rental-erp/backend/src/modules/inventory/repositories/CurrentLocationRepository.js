const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

/**
 * CurrentLocationRepository
 *
 * Handles CRUD operations for inventory_current_locations table
 * Single source of truth for "Where is item NOW?"
 */
class CurrentLocationRepository extends BaseRepository {
  constructor() {
    super('inventory_current_locations', 'id');
  }

  /**
   * Get current location for an item
   * @param {string} itemType - Type of item (gauge, tool, part)
   * @param {string} itemIdentifier - Item identifier
   * @returns {Promise<Object|null>} Current location record or null
   */
  async getCurrentLocation(itemType, itemIdentifier, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        SELECT
          icl.*,
          u.username as last_moved_by_username,
          u.name as last_moved_by_name
        FROM inventory_current_locations icl
        LEFT JOIN core_users u ON icl.last_moved_by = u.id
        WHERE icl.item_type = ? AND icl.item_identifier = ?
      `;

      const params = [itemType, itemIdentifier];
      const [result] = await this.executeQuery(sql, params, conn);

      return result || null;
    } catch (error) {
      logger.error('Failed to get current location:', {
        error: error.message,
        itemType,
        itemIdentifier
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Get all current locations for parts (can be in multiple locations)
   * @param {string} partIdentifier - Part identifier
   * @returns {Promise<Array>} List of current locations for this part
   */
  async getPartLocations(partIdentifier, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        SELECT
          icl.*,
          u.username as last_moved_by_username,
          u.name as last_moved_by_name
        FROM inventory_current_locations icl
        LEFT JOIN core_users u ON icl.last_moved_by = u.id
        WHERE icl.item_type = 'part' AND icl.item_identifier = ?
        ORDER BY icl.current_location
      `;

      const params = [partIdentifier];
      const results = await this.executeQuery(sql, params, conn);

      return results;
    } catch (error) {
      logger.error('Failed to get part locations:', {
        error: error.message,
        partIdentifier
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Get all items in a specific location
   * @param {string} locationCode - Storage location code
   * @returns {Promise<Array>} List of items in this location
   */
  async getItemsInLocation(locationCode, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        SELECT
          icl.*,
          u.username as last_moved_by_username,
          u.name as last_moved_by_name
        FROM inventory_current_locations icl
        LEFT JOIN core_users u ON icl.last_moved_by = u.id
        WHERE icl.current_location = ?
        ORDER BY icl.item_type, icl.item_identifier
      `;

      const params = [locationCode];
      const results = await this.executeQuery(sql, params, conn);

      return results;
    } catch (error) {
      logger.error('Failed to get items in location:', {
        error: error.message,
        locationCode
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Update current location for gauges/tools (unique items)
   * @param {string} itemType - Type of item
   * @param {string} itemIdentifier - Item identifier
   * @param {string} toLocation - New location
   * @param {number} movedBy - User ID who moved item
   * @returns {Promise<void>}
   */
  async updateCurrentLocation(itemType, itemIdentifier, toLocation, movedBy, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        UPDATE inventory_current_locations
        SET current_location = ?,
            last_moved_at = NOW(),
            last_moved_by = ?
        WHERE item_type = ? AND item_identifier = ?
      `;

      const params = [toLocation, movedBy, itemType, itemIdentifier];
      await this.executeQuery(sql, params, conn);

      logger.info('Current location updated:', {
        itemType,
        itemIdentifier,
        toLocation
      });
    } catch (error) {
      logger.error('Failed to update current location:', {
        error: error.message,
        itemType,
        itemIdentifier,
        toLocation
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Insert new current location record (first time tracking item)
   * @param {Object} locationData - Location data
   * @returns {Promise<number>} The ID of the created record
   */
  async insertCurrentLocation(locationData, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        INSERT INTO inventory_current_locations (
          item_type,
          item_identifier,
          current_location,
          quantity,
          last_moved_by,
          last_moved_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `;

      const params = [
        locationData.item_type,
        locationData.item_identifier,
        locationData.current_location,
        locationData.quantity || 1,
        locationData.last_moved_by
      ];

      const result = await this.executeQuery(sql, params, conn);

      logger.info('Current location record created:', {
        id: result.insertId,
        itemType: locationData.item_type,
        itemIdentifier: locationData.item_identifier
      });

      return result.insertId;
    } catch (error) {
      logger.error('Failed to insert current location:', {
        error: error.message,
        locationData
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Update or insert part quantity (for parts with quantity tracking)
   * Uses INSERT...ON DUPLICATE KEY UPDATE for parts
   * @param {Object} partData - Part location data
   * @returns {Promise<number>} The ID of the affected record
   */
  async upsertPartQuantity(partData, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        INSERT INTO inventory_current_locations (
          item_type,
          item_identifier,
          current_location,
          quantity,
          last_moved_by,
          last_moved_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          quantity = quantity + VALUES(quantity),
          last_moved_at = NOW(),
          last_moved_by = VALUES(last_moved_by)
      `;

      const params = [
        'part',
        partData.item_identifier,
        partData.current_location,
        partData.quantity,
        partData.last_moved_by
      ];

      const result = await this.executeQuery(sql, params, conn);

      logger.info('Part quantity upserted:', {
        partIdentifier: partData.item_identifier,
        location: partData.current_location,
        quantity: partData.quantity
      });

      return result.insertId || result.affectedRows;
    } catch (error) {
      logger.error('Failed to upsert part quantity:', {
        error: error.message,
        partData
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Remove item from current locations (when item is deleted)
   * @param {string} itemType - Type of item
   * @param {string} itemIdentifier - Item identifier
   * @returns {Promise<void>}
   */
  async removeCurrentLocation(itemType, itemIdentifier, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        DELETE FROM inventory_current_locations
        WHERE item_type = ? AND item_identifier = ?
      `;

      const params = [itemType, itemIdentifier];
      await this.executeQuery(sql, params, conn);

      logger.info('Current location removed:', {
        itemType,
        itemIdentifier
      });
    } catch (error) {
      logger.error('Failed to remove current location:', {
        error: error.message,
        itemType,
        itemIdentifier
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Get total quantity for a part across all locations
   * @param {string} partIdentifier - Part identifier
   * @returns {Promise<number>} Total quantity
   */
  async getTotalPartQuantity(partIdentifier, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        SELECT SUM(quantity) as total_quantity
        FROM inventory_current_locations
        WHERE item_type = 'part' AND item_identifier = ?
      `;

      const params = [partIdentifier];
      const [result] = await this.executeQuery(sql, params, conn);

      return result.total_quantity || 0;
    } catch (error) {
      logger.error('Failed to get total part quantity:', {
        error: error.message,
        partIdentifier
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }
}

module.exports = CurrentLocationRepository;
