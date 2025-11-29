const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const CurrentLocationRepository = require('../repositories/CurrentLocationRepository');
const MovementRepository = require('../repositories/MovementRepository');
const logger = require('../../../infrastructure/utils/logger');

/**
 * InventoryReportingService
 *
 * Handles cross-module inventory reporting and dashboard queries
 * Uses JOIN strategy for performance (Option B from implementation plan)
 */
class InventoryReportingService extends BaseRepository {
  constructor() {
    super('inventory_current_locations', 'id');
    this.currentLocationRepo = new CurrentLocationRepository();
    this.movementRepo = new MovementRepository();
  }

  /**
   * Get inventory overview for dashboard
   * Returns all locations with their items (cross-module query)
   *
   * @returns {Promise<Array>} List of locations with items
   */
  async getInventoryOverview() {
    const connection = await this.getConnectionWithTimeout();

    try {
      // Use single query with LEFT JOINs for performance (Option B)
      // NOTE: Only joining to gauges table for now - tools and parts tables don't exist yet
      // NOTE: Using COLLATE to handle collation mismatch between inventory and gauges tables
      const sql = `
        SELECT
          sl.location_code,
          sl.location_type,
          sl.display_order,
          b.building_name,
          f.facility_name,
          z.zone_name,
          icl.item_type,
          icl.item_identifier,
          icl.quantity,
          icl.last_moved_at,
          g.name as item_name,
          g.gauge_id as item_business_id
        FROM storage_locations sl
        LEFT JOIN buildings b ON sl.building_id = b.id
        LEFT JOIN facilities f ON b.facility_id = f.id
        LEFT JOIN zones z ON sl.zone_id = z.id
        LEFT JOIN inventory_current_locations icl ON sl.location_code = icl.current_location
        LEFT JOIN gauges g ON icl.item_type = 'gauge'
          AND icl.item_identifier COLLATE utf8mb4_0900_ai_ci = g.gauge_id
        WHERE sl.is_active = TRUE
        ORDER BY sl.display_order, sl.location_code, icl.item_type, icl.item_identifier
      `;

      const results = await this.executeQuery(sql, [], connection);

      // Group by location
      const locationMap = new Map();

      for (const row of results) {
        if (!locationMap.has(row.location_code)) {
          locationMap.set(row.location_code, {
            location_code: row.location_code,
            location_type: row.location_type,
            display_order: row.display_order,
            building_name: row.building_name,
            facility_name: row.facility_name,
            zone_name: row.zone_name,
            total_items: 0,
            items: []
          });
        }

        const location = locationMap.get(row.location_code);

        // Only add item if it exists
        if (row.item_type && row.item_identifier) {
          location.total_items++;
          location.items.push({
            type: row.item_type,
            type_display: this._formatItemType(row.item_type),
            id: row.item_identifier,
            name: row.item_name || 'Unknown',
            quantity: row.quantity,
            last_moved_at: row.last_moved_at
          });
        }
      }

      return Array.from(locationMap.values());
    } catch (error) {
      logger.error('Failed to get inventory overview:', {
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all items in a specific location with details
   *
   * @param {string} locationCode - Storage location code
   * @returns {Promise<Object>} Location with grouped items
   */
  async getLocationDetails(locationCode) {
    const connection = await this.getConnectionWithTimeout();

    try {
      // Get location info with hierarchy (including inactive locations for viewing)
      const locationSql = `
        SELECT
          sl.*,
          b.building_name,
          f.facility_name,
          z.zone_name
        FROM storage_locations sl
        LEFT JOIN buildings b ON sl.building_id = b.id
        LEFT JOIN facilities f ON b.facility_id = f.id
        LEFT JOIN zones z ON sl.zone_id = z.id
        WHERE sl.location_code = ?
      `;
      const [location] = await this.executeQuery(locationSql, [locationCode], connection);

      if (!location) {
        return null;
      }

      // Get all items in this location with JOINs
      // NOTE: Only joining to gauges table for now - tools and parts tables don't exist yet
      // NOTE: Using COLLATE to handle collation mismatch between inventory and gauges tables
      const itemsSql = `
        SELECT
          icl.item_type,
          icl.item_identifier,
          icl.quantity,
          icl.last_moved_at,
          g.name as item_name,
          u.username as last_moved_by_username
        FROM inventory_current_locations icl
        LEFT JOIN gauges g ON icl.item_type = 'gauge'
          AND icl.item_identifier COLLATE utf8mb4_0900_ai_ci = g.gauge_id
        LEFT JOIN core_users u ON icl.last_moved_by = u.id
        WHERE icl.current_location = ?
        ORDER BY icl.item_type, icl.item_identifier
      `;

      const items = await this.executeQuery(itemsSql, [locationCode], connection);

      // Group items by type
      const grouped = {
        gauges: [],
        tools: [],
        parts: []
      };

      for (const item of items) {
        const itemData = {
          item_identifier: item.item_identifier,  // Match frontend interface
          name: item.item_name || 'Unknown',
          quantity: item.quantity,
          last_moved_at: item.last_moved_at,
          last_moved_by: item.last_moved_by_username
        };

        if (item.item_type === 'gauge') {
          grouped.gauges.push(itemData);
        } else if (item.item_type === 'tool') {
          grouped.tools.push(itemData);
        } else if (item.item_type === 'part') {
          // For parts, also get total quantity across all locations
          const totalQtySql = `
            SELECT SUM(quantity) as total_quantity
            FROM inventory_current_locations
            WHERE item_type = 'part' AND item_identifier = ?
          `;
          const [totalResult] = await this.executeQuery(totalQtySql, [item.item_identifier], connection);
          itemData.total_quantity = totalResult.total_quantity || 0;
          grouped.parts.push(itemData);
        }
      }

      // Calculate total items count
      const totalItems = grouped.gauges.length + grouped.tools.length + grouped.parts.length;

      return {
        location: {
          location_code: location.location_code,
          location_type: location.location_type,
          building_name: location.building_name,
          facility_name: location.facility_name,
          zone_name: location.zone_name
        },
        items: grouped,
        total_items: totalItems
      };
    } catch (error) {
      logger.error('Failed to get location details:', {
        error: error.message,
        locationCode
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get movement history with optional filters
   *
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Movements with pagination
   */
  async getMovementHistory(filters = {}) {
    try {
      const options = {
        item_type: filters.itemType,
        movement_type: filters.movementType,
        from_date: filters.fromDate,
        to_date: filters.toDate,
        limit: filters.limit || 50,
        offset: filters.offset || 0
      };

      const movements = await this.movementRepo.getRecentMovements(options);

      // Enrich with item names (query source modules)
      const enrichedMovements = await this._enrichMovementsWithNames(movements);

      return {
        movements: enrichedMovements,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: movements.length
        }
      };
    } catch (error) {
      logger.error('Failed to get movement history:', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Get inventory statistics summary
   *
   * @returns {Promise<Object>} Statistics
   */
  async getInventoryStatistics() {
    const connection = await this.getConnectionWithTimeout();

    try {
      // Get counts by item type
      const countsSql = `
        SELECT
          item_type,
          COUNT(DISTINCT item_identifier) as item_count,
          COUNT(DISTINCT current_location) as location_count,
          SUM(quantity) as total_quantity
        FROM inventory_current_locations
        GROUP BY item_type
      `;

      const counts = await this.executeQuery(countsSql, [], connection);

      // Get total locations
      const locationsSql = `
        SELECT COUNT(*) as total_locations
        FROM storage_locations
        WHERE is_active = TRUE
      `;

      const [locationResult] = await this.executeQuery(locationsSql, [], connection);

      // Get recent movements count
      const movementsSql = `
        SELECT COUNT(*) as recent_movements
        FROM inventory_movements
        WHERE moved_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `;

      const [movementsResult] = await this.executeQuery(movementsSql, [], connection);

      // Transform counts array into by_type object
      const byType = {
        gauge: 0,
        tool: 0,
        part: 0,
        equipment: 0,
        material: 0
      };

      let totalItems = 0;

      for (const row of counts) {
        const itemType = row.item_type;
        const count = parseInt(row.item_count, 10) || 0;

        if (byType.hasOwnProperty(itemType)) {
          byType[itemType] = count;
          totalItems += count;
        }
      }

      return {
        total_items: totalItems,
        by_type: byType,
        total_locations: locationResult.total_locations,
        recent_movements: movementsResult.recent_movements
      };
    } catch (error) {
      logger.error('Failed to get inventory statistics:', {
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Search inventory items
   *
   * @param {string} searchType - 'all', 'id', 'name', 'location'
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Search results
   */
  async searchInventory(searchType, searchTerm) {
    const connection = await this.getConnectionWithTimeout();

    try {
      let sql;
      let params;

      if (searchType === 'location') {
        // Search by location code
        // NOTE: Only joining to gauges table for now - tools and parts tables don't exist yet
        // NOTE: Using COLLATE to handle collation mismatch between inventory and gauges tables
        sql = `
          SELECT
            icl.item_type,
            icl.item_identifier,
            icl.quantity,
            icl.current_location,
            g.name as item_name
          FROM inventory_current_locations icl
          LEFT JOIN gauges g ON icl.item_type = 'gauge'
            AND icl.item_identifier COLLATE utf8mb4_0900_ai_ci = g.gauge_id
          WHERE icl.current_location LIKE ?
          ORDER BY icl.current_location, icl.item_type, icl.item_identifier
        `;
        params = [`%${searchTerm}%`];
      } else if (searchType === 'id') {
        // Search by item identifier
        // NOTE: Only joining to gauges table for now - tools and parts tables don't exist yet
        // NOTE: Using COLLATE to handle collation mismatch between inventory and gauges tables
        sql = `
          SELECT
            icl.item_type,
            icl.item_identifier,
            icl.quantity,
            icl.current_location,
            g.name as item_name
          FROM inventory_current_locations icl
          LEFT JOIN gauges g ON icl.item_type = 'gauge'
            AND icl.item_identifier COLLATE utf8mb4_0900_ai_ci = g.gauge_id
          WHERE icl.item_identifier LIKE ?
          ORDER BY icl.item_type, icl.item_identifier
        `;
        params = [`%${searchTerm}%`];
      } else if (searchType === 'name') {
        // Search by item name (requires JOINs)
        // NOTE: Only joining to gauges table for now - tools and parts tables don't exist yet
        // NOTE: Using COLLATE to handle collation mismatch between inventory and gauges tables
        sql = `
          SELECT
            icl.item_type,
            icl.item_identifier,
            icl.quantity,
            icl.current_location,
            g.name as item_name
          FROM inventory_current_locations icl
          LEFT JOIN gauges g ON icl.item_type = 'gauge'
            AND icl.item_identifier COLLATE utf8mb4_0900_ai_ci = g.gauge_id
          WHERE g.name LIKE ?
          ORDER BY icl.item_type, icl.item_identifier
        `;
        params = [`%${searchTerm}%`];
      } else {
        // Search all (id, name, location)
        // NOTE: Only joining to gauges table for now - tools and parts tables don't exist yet
        // NOTE: Using COLLATE to handle collation mismatch between inventory and gauges tables
        sql = `
          SELECT
            icl.item_type,
            icl.item_identifier,
            icl.quantity,
            icl.current_location,
            g.name as item_name
          FROM inventory_current_locations icl
          LEFT JOIN gauges g ON icl.item_type = 'gauge'
            AND icl.item_identifier COLLATE utf8mb4_0900_ai_ci = g.gauge_id
          WHERE icl.item_identifier LIKE ?
             OR icl.current_location LIKE ?
             OR g.name LIKE ?
          ORDER BY icl.item_type, icl.item_identifier
        `;
        params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];
      }

      const results = await this.executeQuery(sql, params, connection);

      return results.map(row => ({
        item_type: row.item_type,
        item_identifier: row.item_identifier,
        item_name: row.item_name || 'Unknown',
        quantity: row.quantity,
        current_location: row.current_location
      }));
    } catch (error) {
      logger.error('Failed to search inventory:', {
        error: error.message,
        searchType,
        searchTerm
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Enrich movements with item names from source modules
   * @private
   */
  async _enrichMovementsWithNames(movements) {
    const connection = await this.getConnectionWithTimeout();

    try {
      const enriched = [];

      for (const movement of movements) {
        let itemName = 'Unknown';

        if (movement.item_type === 'gauge') {
          const [gauge] = await this.executeQuery(
            'SELECT name FROM gauges WHERE gauge_id = ?',
            [movement.item_identifier],
            connection
          );
          itemName = gauge?.name || itemName;
        } else if (movement.item_type === 'tool') {
          const [tool] = await this.executeQuery(
            'SELECT name FROM tools WHERE tool_id = ?',
            [movement.item_identifier],
            connection
          );
          itemName = tool?.name || itemName;
        } else if (movement.item_type === 'part') {
          const [part] = await this.executeQuery(
            'SELECT description FROM parts WHERE part_number = ?',
            [movement.item_identifier],
            connection
          );
          itemName = part?.description || itemName;
        }

        enriched.push({
          ...movement,
          item_name: itemName
        });
      }

      return enriched;
    } finally {
      connection.release();
    }
  }

  /**
   * Format item type for display
   * @private
   */
  _formatItemType(itemType) {
    const typeMap = {
      gauge: 'Gauge',
      tool: 'Tool',
      part: 'Part',
      equipment: 'Equipment',
      material: 'Material'
    };
    return typeMap[itemType] || itemType;
  }
}

module.exports = InventoryReportingService;
