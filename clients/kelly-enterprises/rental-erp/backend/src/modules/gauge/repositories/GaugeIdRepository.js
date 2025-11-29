const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');

/**
 * Repository for atomic gauge ID generation operations
 * Handles sequence management and configuration lookups
 */
class GaugeIdRepository extends BaseRepository {
  constructor() {
    super('gauge_id_config', 'id');
  }

  /**
   * Atomically get next sequence number and configuration
   * Uses SELECT ... FOR UPDATE to prevent race conditions
   * 
   * @param {number} categoryId - The gauge category ID
   * @param {string|null} gaugeType - The gauge type (e.g., 'plug', 'ring')
   * @param {Object} connection - Database connection for transaction
   * @returns {Promise<Object>} Configuration with current_sequence, prefix, category_name
   */
  async getSequenceConfig(categoryId, gaugeType, connection) {
    const [rows] = await connection.execute(
      `SELECT gc.prefix, gic.current_sequence, gc.name as category_name
       FROM gauge_id_config gic 
       JOIN gauge_categories gc ON gic.category_id = gc.id
       WHERE gic.category_id = ? 
         AND (gic.gauge_type = ? OR (gic.gauge_type IS NULL AND ? IS NULL))
       FOR UPDATE`,
      [categoryId, gaugeType, gaugeType]
    );
    
    return rows[0] || null;
  }

  /**
   * Atomically update sequence to next value
   * Must be called within same transaction as getSequenceConfig
   * 
   * @param {number} categoryId - The gauge category ID
   * @param {string|null} gaugeType - The gauge type
   * @param {number} nextSequence - The next sequence number
   * @param {Object} connection - Database connection for transaction
   * @returns {Promise<void>}
   */
  async updateSequence(categoryId, gaugeType, nextSequence, connection) {
    await connection.execute(
      'UPDATE gauge_id_config SET current_sequence = ? WHERE category_id = ? AND (gauge_type = ? OR (gauge_type IS NULL AND ? IS NULL))',
      [nextSequence, categoryId, gaugeType, gaugeType]
    );
  }

  /**
   * Atomically generate next sequence ID within a transaction
   * Combines get and update operations for atomic sequence generation
   * 
   * @param {number} categoryId - The gauge category ID
   * @param {string|null} gaugeType - The gauge type
   * @param {Object} connection - Database connection for transaction
   * @returns {Promise<Object>} { nextSequence, prefix, categoryName }
   */
  async generateSequence(categoryId, gaugeType, connection) {
    // Get current config with lock
    const config = await this.getSequenceConfig(categoryId, gaugeType, connection);
    
    if (!config) {
      throw new Error(`No ID configuration found for category ${categoryId} and gauge type ${gaugeType || 'null'}`);
    }
    
    const nextSequence = config.current_sequence + 1;
    
    // Update sequence atomically
    await this.updateSequence(categoryId, gaugeType, nextSequence, connection);
    
    return {
      nextSequence,
      prefix: config.prefix,
      categoryName: config.category_name
    };
  }

  /**
   * Get all available ID configurations for a category
   * Used for validation and configuration management
   * 
   * @param {number} categoryId - The gauge category ID
   * @returns {Promise<Array>} Array of configuration objects
   */
  async getConfigsByCategory(categoryId) {
    const query = `
      SELECT 
        gic.category_id,
        gic.gauge_type,
        gic.current_sequence,
        gc.prefix,
        gc.name as category_name
      FROM gauge_id_config gic 
      JOIN gauge_categories gc ON gic.category_id = gc.id
      WHERE gic.category_id = ?
      ORDER BY gic.gauge_type
    `;
    
    const [rows] = await this.pool.execute(query, [categoryId]);
    return rows;
  }

  /**
   * Initialize ID configuration for a new category/gauge type combination
   * 
   * @param {number} categoryId - The gauge category ID
   * @param {string|null} gaugeType - The gauge type
   * @param {number} startingSequence - Starting sequence number (default: 0)
   * @returns {Promise<Object>} Created configuration
   */
  async initializeConfig(categoryId, gaugeType, startingSequence = 0) {
    const data = {
      category_id: categoryId,
      gauge_type: gaugeType,
      current_sequence: startingSequence
    };
    
    return await this.create(data);
  }

  /**
   * Reset sequence for a category/gauge type (admin operation)
   * 
   * @param {number} categoryId - The gauge category ID
   * @param {string|null} gaugeType - The gauge type
   * @param {number} newSequence - New sequence number
   * @returns {Promise<void>}
   */
  async resetSequence(categoryId, gaugeType, newSequence) {
    const query = `
      UPDATE gauge_id_config 
      SET current_sequence = ? 
      WHERE category_id = ? 
        AND (gauge_type = ? OR (gauge_type IS NULL AND ? IS NULL))
    `;
    
    const [result] = await this.pool.execute(query, [newSequence, categoryId, gaugeType, gaugeType]);
    
    if (result.affectedRows === 0) {
      throw new Error(`No configuration found for category ${categoryId} and gauge type ${gaugeType || 'null'}`);
    }
  }

  /**
   * Get sequence statistics for monitoring
   * 
   * @returns {Promise<Array>} Array of sequence statistics
   */
  async getSequenceStats() {
    const query = `
      SELECT 
        gc.name as category_name,
        gic.gauge_type,
        gic.current_sequence,
        gc.prefix,
        COUNT(g.id) as gauges_created
      FROM gauge_id_config gic
      JOIN gauge_categories gc ON gic.category_id = gc.id
      LEFT JOIN gauges g ON g.category_id = gic.category_id 
        AND (g.gauge_type = gic.gauge_type OR (g.gauge_type IS NULL AND gic.gauge_type IS NULL))
      GROUP BY gic.category_id, gic.gauge_type
      ORDER BY gc.name, gic.gauge_type
    `;
    
    const [rows] = await this.pool.execute(query);
    return rows;
  }
}

module.exports = GaugeIdRepository;