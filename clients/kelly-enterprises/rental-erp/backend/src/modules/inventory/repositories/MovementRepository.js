const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

/**
 * MovementRepository
 *
 * Handles CRUD operations for inventory_movements table
 * Provides audit trail of all item location changes
 */
class MovementRepository extends BaseRepository {
  constructor() {
    super('inventory_movements', 'id');
  }

  /**
   * Create a new movement record
   * @param {Object} movementData - Movement data
   * @returns {Promise<number>} The ID of the created movement
   */
  async createMovement(movementData, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        INSERT INTO inventory_movements (
          movement_type,
          item_type,
          item_identifier,
          quantity,
          order_number,
          job_number,
          from_location,
          to_location,
          moved_by,
          moved_at,
          reason,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
      `;

      const params = [
        movementData.movement_type,
        movementData.item_type,
        movementData.item_identifier,
        movementData.quantity || 1,
        movementData.order_number || null,
        movementData.job_number || null,
        movementData.from_location || null,
        movementData.to_location || null,
        movementData.moved_by,
        movementData.reason || null,
        movementData.notes || null
      ];

      const result = await this.executeQuery(sql, params, conn);

      logger.info('Movement record created:', {
        movementId: result.insertId,
        itemType: movementData.item_type,
        itemIdentifier: movementData.item_identifier
      });

      return result.insertId;
    } catch (error) {
      logger.error('Failed to create movement record:', {
        error: error.message,
        movementData
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Get movement history for a specific item
   * @param {string} itemType - Type of item (gauge, tool, part)
   * @param {string} itemIdentifier - Item identifier
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array>} List of movements
   */
  async getMovementsByItem(itemType, itemIdentifier, options = {}, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const limit = parseInt(options.limit) || 50;
      const offset = parseInt(options.offset) || 0;

      const sql = `
        SELECT
          im.*,
          u.username as moved_by_username,
          u.name as moved_by_name
        FROM inventory_movements im
        LEFT JOIN core_users u ON im.moved_by = u.id
        WHERE im.item_type = ? AND im.item_identifier = ?
        ORDER BY im.moved_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const params = [itemType, itemIdentifier];
      const movements = await this.executeQuery(sql, params, conn);

      return movements;
    } catch (error) {
      logger.error('Failed to get movements by item:', {
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
   * Get movement history for a specific location
   * @param {string} locationCode - Storage location code
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array>} List of movements
   */
  async getMovementsByLocation(locationCode, options = {}, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const limit = parseInt(options.limit) || 50;
      const offset = parseInt(options.offset) || 0;

      const sql = `
        SELECT
          im.*,
          u.username as moved_by_username,
          u.name as moved_by_name
        FROM inventory_movements im
        LEFT JOIN core_users u ON im.moved_by = u.id
        WHERE im.from_location = ? OR im.to_location = ?
        ORDER BY im.moved_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const params = [locationCode, locationCode];
      const movements = await this.executeQuery(sql, params, conn);

      return movements;
    } catch (error) {
      logger.error('Failed to get movements by location:', {
        error: error.message,
        locationCode
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Get recent movements across all items
   * @param {Object} options - Query options (limit, offset, filters)
   * @returns {Promise<Array>} List of movements
   */
  async getRecentMovements(options = {}, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const limit = parseInt(options.limit) || 50;
      const offset = parseInt(options.offset) || 0;

      let whereClauses = [];
      let params = [];

      // Optional filters
      if (options.item_type) {
        whereClauses.push('im.item_type = ?');
        params.push(options.item_type);
      }

      if (options.movement_type) {
        whereClauses.push('im.movement_type = ?');
        params.push(options.movement_type);
      }

      if (options.from_date) {
        whereClauses.push('im.moved_at >= ?');
        params.push(options.from_date);
      }

      if (options.to_date) {
        whereClauses.push('im.moved_at <= ?');
        params.push(options.to_date);
      }

      const whereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

      const sql = `
        SELECT
          im.*,
          u.username as moved_by_username,
          u.name as moved_by_name
        FROM inventory_movements im
        LEFT JOIN core_users u ON im.moved_by = u.id
        ${whereClause}
        ORDER BY im.moved_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const movements = await this.executeQuery(sql, params, conn);

      return movements;
    } catch (error) {
      logger.error('Failed to get recent movements:', {
        error: error.message,
        options
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Get movement count for an item
   * @param {string} itemType - Type of item
   * @param {string} itemIdentifier - Item identifier
   * @returns {Promise<number>} Count of movements
   */
  async getMovementCount(itemType, itemIdentifier, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM inventory_movements
        WHERE item_type = ? AND item_identifier = ?
      `;

      const params = [itemType, itemIdentifier];
      const [result] = await this.executeQuery(sql, params, conn);

      return result.count;
    } catch (error) {
      logger.error('Failed to get movement count:', {
        error: error.message,
        itemType,
        itemIdentifier
      });
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }
}

module.exports = MovementRepository;
