const db = require('../../../infrastructure/database/connection');
const CurrentLocationRepository = require('../repositories/CurrentLocationRepository');
const MovementRepository = require('../repositories/MovementRepository');
const logger = require('../../../infrastructure/utils/logger');

/**
 * MovementService
 *
 * CRITICAL SERVICE: Handles atomic transactions for item movements
 * Updates both inventory_current_locations and inventory_movements tables
 * in a single transaction to ensure consistency
 *
 * Key Implementation Notes:
 * - Gauges/Tools: Use UPDATE or INSERT (unique items, one location only)
 * - Parts: Use INSERT ON DUPLICATE KEY UPDATE (quantity-based, multiple locations)
 */
class MovementService {
  constructor() {
    this.currentLocationRepo = new CurrentLocationRepository();
    this.movementRepo = new MovementRepository();
  }

  /**
   * Move an item to a new location
   *
   * ATOMIC TRANSACTION: Updates both tables or neither
   *
   * @param {Object} moveData - Movement data
   * @param {string} moveData.itemType - 'gauge', 'tool', or 'part'
   * @param {string} moveData.itemIdentifier - Item ID (GAUGE-001, TOOL-015, P/N-12345)
   * @param {string} moveData.toLocation - Destination location code
   * @param {number} moveData.movedBy - User ID performing the move
   * @param {string} [moveData.reason] - Optional reason for move
   * @param {string} [moveData.notes] - Optional notes
   * @param {number} [moveData.quantity] - Required for parts, defaults to 1
   * @param {string} [moveData.orderNumber] - For parts sold movements
   * @param {string} [moveData.jobNumber] - For parts consumed movements
   * @returns {Promise<Object>} Movement result
   */
  async moveItem(moveData) {
    const connection = await db.pool.getConnection();

    try {
      await connection.beginTransaction();

      logger.info('Starting item move transaction:', {
        itemType: moveData.itemType,
        itemIdentifier: moveData.itemIdentifier,
        toLocation: moveData.toLocation
      });

      // STEP 1: Get current location (if exists)
      const currentLocation = await this.currentLocationRepo.getCurrentLocation(
        moveData.itemType,
        moveData.itemIdentifier,
        connection
      );

      const fromLocation = currentLocation?.current_location || null;

      // STEP 2: Check if location actually changed
      if (fromLocation === moveData.toLocation) {
        await connection.rollback();
        return {
          success: false,
          message: `${moveData.itemIdentifier} is already in location ${moveData.toLocation}`,
          currentLocation: fromLocation
        };
      }

      // STEP 3: Update current_locations table based on item type
      if (moveData.itemType === 'part') {
        // PARTS: Use INSERT ON DUPLICATE KEY UPDATE (quantity-based)
        await this.currentLocationRepo.upsertPartQuantity(
          {
            item_identifier: moveData.itemIdentifier,
            current_location: moveData.toLocation,
            quantity: moveData.quantity || 1,
            last_moved_by: moveData.movedBy
          },
          connection
        );
      } else {
        // GAUGES/TOOLS: Use UPDATE or INSERT (unique items)
        if (currentLocation) {
          // Item exists - UPDATE current location
          await this.currentLocationRepo.updateCurrentLocation(
            moveData.itemType,
            moveData.itemIdentifier,
            moveData.toLocation,
            moveData.movedBy,
            connection
          );
        } else {
          // First time tracking this item - INSERT new record
          await this.currentLocationRepo.insertCurrentLocation(
            {
              item_type: moveData.itemType,
              item_identifier: moveData.itemIdentifier,
              current_location: moveData.toLocation,
              quantity: 1, // Always 1 for gauges/tools
              last_moved_by: moveData.movedBy
            },
            connection
          );
        }
      }

      // STEP 4: Record movement in history table (audit trail)
      const movementId = await this.movementRepo.createMovement(
        {
          movement_type: this._determineMovementType(fromLocation, moveData.toLocation),
          item_type: moveData.itemType,
          item_identifier: moveData.itemIdentifier,
          quantity: moveData.quantity || 1,
          order_number: moveData.orderNumber || null,
          job_number: moveData.jobNumber || null,
          from_location: fromLocation,
          to_location: moveData.toLocation,
          moved_by: moveData.movedBy,
          reason: moveData.reason || null,
          notes: moveData.notes || null
        },
        connection
      );

      // STEP 5: Commit transaction
      await connection.commit();

      logger.info('Item move transaction completed successfully:', {
        movementId,
        itemType: moveData.itemType,
        itemIdentifier: moveData.itemIdentifier,
        from: fromLocation,
        to: moveData.toLocation
      });

      return {
        success: true,
        movementId,
        currentLocation: moveData.toLocation,
        previousLocation: fromLocation
      };
    } catch (error) {
      // Rollback on any error
      await connection.rollback();

      logger.error('Item move transaction failed (rolled back):', {
        error: error.message,
        stack: error.stack,
        moveData
      });

      throw new Error(`Failed to move item: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get current location for an item
   * @param {string} itemType - Type of item
   * @param {string} itemIdentifier - Item identifier
   * @returns {Promise<Object|null>} Current location data or null
   */
  async getCurrentLocation(itemType, itemIdentifier) {
    try {
      const location = await this.currentLocationRepo.getCurrentLocation(
        itemType,
        itemIdentifier
      );

      if (!location) {
        return null;
      }

      return {
        item_type: location.item_type,
        item_identifier: location.item_identifier,
        current_location: location.current_location,
        quantity: location.quantity,
        last_moved_at: location.last_moved_at,
        last_moved_by: location.last_moved_by,
        last_moved_by_username: location.last_moved_by_username,
        last_moved_by_name: location.last_moved_by_name
      };
    } catch (error) {
      logger.error('Failed to get current location:', {
        error: error.message,
        itemType,
        itemIdentifier
      });
      throw error;
    }
  }

  /**
   * Remove item from inventory (when item is deleted)
   * Records a 'deleted' movement and removes from current_locations
   * @param {string} itemType - Type of item
   * @param {string} itemIdentifier - Item identifier
   * @param {number} deletedBy - User ID performing deletion
   * @param {string} [reason] - Optional reason for deletion
   * @returns {Promise<Object>} Deletion result
   */
  async removeItem(itemType, itemIdentifier, deletedBy, reason = null) {
    const connection = await db.pool.getConnection();

    try {
      await connection.beginTransaction();

      logger.info('Starting item removal transaction:', {
        itemType,
        itemIdentifier
      });

      // Get current location before deletion
      const currentLocation = await this.currentLocationRepo.getCurrentLocation(
        itemType,
        itemIdentifier,
        connection
      );

      if (!currentLocation) {
        await connection.rollback();
        return {
          success: false,
          message: `${itemIdentifier} not found in inventory`
        };
      }

      // Record deletion movement
      await this.movementRepo.createMovement(
        {
          movement_type: 'deleted',
          item_type: itemType,
          item_identifier: itemIdentifier,
          quantity: currentLocation.quantity,
          from_location: currentLocation.current_location,
          to_location: null,
          moved_by: deletedBy,
          reason: reason || 'Item deleted'
        },
        connection
      );

      // Remove from current_locations
      await this.currentLocationRepo.removeCurrentLocation(
        itemType,
        itemIdentifier,
        connection
      );

      await connection.commit();

      logger.info('Item removal transaction completed:', {
        itemType,
        itemIdentifier
      });

      return {
        success: true,
        message: `${itemIdentifier} removed from inventory`,
        previousLocation: currentLocation.current_location
      };
    } catch (error) {
      await connection.rollback();

      logger.error('Item removal transaction failed:', {
        error: error.message,
        itemType,
        itemIdentifier
      });

      throw new Error(`Failed to remove item: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get movement history for an item
   * @param {string} itemType - Type of item
   * @param {string} itemIdentifier - Item identifier
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array>} Movement history
   */
  async getMovementHistory(itemType, itemIdentifier, options = {}) {
    try {
      return await this.movementRepo.getMovementsByItem(
        itemType,
        itemIdentifier,
        options
      );
    } catch (error) {
      logger.error('Failed to get movement history:', {
        error: error.message,
        itemType,
        itemIdentifier
      });
      throw error;
    }
  }

  /**
   * Determine movement type based on from/to locations
   * @private
   */
  _determineMovementType(fromLocation, toLocation) {
    if (!fromLocation && toLocation) return 'created';
    if (fromLocation && !toLocation) return 'deleted';
    if (fromLocation && toLocation) return 'transfer';
    return 'other';
  }
}

module.exports = MovementService;
