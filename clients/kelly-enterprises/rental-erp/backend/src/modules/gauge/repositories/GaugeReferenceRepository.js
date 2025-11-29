const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');

/**
 * GaugeReferenceRepository
 *
 * Handles reference data lookups for gauge-related entities.
 * Responsible for categories, statuses, and other lookup tables.
 */
class GaugeReferenceRepository extends BaseRepository {
  constructor(pool = null) {
    // Support both legacy pool parameter and new pattern
    if (pool && typeof pool === 'object' && pool.execute) {
      super(pool, 'gauge_categories');
    } else {
      super('gauge_categories', 'id');
    }
  }

  /**
   * Get all seal statuses
   * @param {Object} conn - Database connection (optional)
   * @returns {Promise<Array>} List of seal statuses
   */
  async getSealStatuses(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const statuses = await this.executeQuery(
        'SELECT * FROM seal_statuses ORDER BY name',
        [],
        connection
      );

      return statuses;
    } catch (error) {
      logger.error('Failed to get seal statuses:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get all manufacturers
   * Note: Manufacturers table doesn't exist - manufacturer info is stored in gauges.manufacturer column
   * @returns {Promise<Array>} Empty array
   */
  async getManufacturers() {
    return [];
  }

  /**
   * Get category by ID
   * @param {number} categoryId - Category ID
   * @param {Object} conn - Database connection (optional)
   * @returns {Promise<Object|null>} Category object or null
   */
  async getCategoryById(categoryId, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const categories = await this.executeQuery(
        'SELECT * FROM gauge_categories WHERE id = ?',
        [categoryId],
        connection
      );

      return categories[0] || null;
    } catch (error) {
      logger.error('Failed to get category:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get categories by equipment type
   * @param {string} equipmentType - Equipment type
   * @param {Object} conn - Database connection (optional)
   * @returns {Promise<Array>} List of categories
   */
  async getCategoriesByEquipmentType(equipmentType, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const categories = await this.executeQuery(
        `SELECT id, name, prefix, equipment_type, description
         FROM gauge_categories
         WHERE equipment_type = ?
         ORDER BY name ASC`,
        [equipmentType],
        connection
      );

      return categories;
    } catch (error) {
      logger.error('Failed to get categories by equipment type:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get all categories
   * @param {Object} conn - Database connection (optional)
   * @returns {Promise<Array>} List of all categories
   */
  async getAllCategories(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const categories = await this.executeQuery(
        'SELECT * FROM gauge_categories ORDER BY name ASC',
        [],
        connection
      );

      return categories;
    } catch (error) {
      logger.error('Failed to get all categories:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get all gauge statuses
   * @param {Object} conn - Database connection (optional)
   * @returns {Promise<Array>} List of gauge statuses
   */
  async getGaugeStatuses(conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      // Return standard gauge statuses
      return [
        { value: 'available', label: 'Available' },
        { value: 'checked_out', label: 'Checked Out' },
        { value: 'calibration_due', label: 'Calibration Due' },
        { value: 'out_of_service', label: 'Out of Service' },
        { value: 'retired', label: 'Retired' },
        { value: 'sealed', label: 'Sealed' }
      ];
    } catch (error) {
      logger.error('Failed to get gauge statuses:', error);
      throw error;
    } finally {
      if (shouldRelease && connection) connection.release();
    }
  }

  /**
   * Get all equipment types
   * @returns {Promise<Array>} List of equipment types
   */
  async getEquipmentTypes() {
    return [
      { value: 'thread_gauge', label: 'Thread Gauge' },
      { value: 'hand_tool', label: 'Hand Tool' },
      { value: 'large_equipment', label: 'Large Equipment' },
      { value: 'calibration_standard', label: 'Calibration Standard' }
    ];
  }
}

module.exports = GaugeReferenceRepository;
