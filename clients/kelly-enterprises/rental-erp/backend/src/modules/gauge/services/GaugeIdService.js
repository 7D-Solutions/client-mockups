const BaseService = require('../../../infrastructure/services/BaseService');
const GaugeIdRepository = require('../repositories/GaugeIdRepository');
const logger = require('../../../infrastructure/utils/logger');

/**
 * Service for generating standardized gauge IDs
 * Uses gauge_categories.prefix and next_number for atomic ID generation
 */
class GaugeIdService extends BaseService {
  constructor(gaugeIdRepository = null, options = {}) {
    const repository = gaugeIdRepository || new GaugeIdRepository();
    super(repository, options);
    this.serviceName = 'GaugeIdService';
  }

  /**
   * Performance monitoring for critical operations
   */
  async performanceMonitor(operation, callback) {
    const start = process.hrtime.bigint();
    try {
      const result = await callback();
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to ms
      
      // Log if exceeds threshold
      if (duration > 100) {
        logger.warn(`Slow operation: ${operation} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;
      logger.error(`Failed operation: ${operation} took ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }
  
  /**
   * Generate a standardized system ID for a gauge with enhanced thread gauge support
   * BACKFILLS GAPS: Always finds the first available ID (e.g., if SP0001, SP0003 exist, generates SP0002)
   * FIX: Added connection parameter to participate in parent transaction
   * @param {number} categoryId - The gauge category ID
   * @param {string|null} gaugeType - The gauge type (e.g., 'plug', 'ring')
   * @param {boolean|null} isGoGauge - true for GO, false for NO GO, null for non-thread gauges
   * @param {Object|null} connection - Optional database connection for transaction (if null, creates own transaction)
   * @returns {Promise<string>} The generated system ID
   */
  async generateSystemId(categoryId, gaugeType = null, isGoGauge = null, connection = null) {
    return this.performanceMonitor('generateSystemId', async () => {
      // FIX: If connection provided, use it directly; otherwise create transaction
      const executeWithConnection = async (conn) => {
        // Get prefix from category
        const [categoryRows] = await conn.execute(
          'SELECT prefix FROM gauge_categories WHERE id = ?',
          [categoryId]
        );

        if (!categoryRows || categoryRows.length === 0) {
          throw new Error(`Category not found: ${categoryId}`);
        }

        const prefix = categoryRows[0].prefix;

        // For thread gauges, we need to check set_id (without A/B suffix)
        // For other gauges, we check gauge_id directly
        const isThreadGauge = gaugeType && prefix !== 'NPT' && isGoGauge !== null;

        // Get all existing IDs with this prefix to find gaps
        // FIX: Added is_deleted = 0 filter and FOR UPDATE lock to prevent race conditions
        const idPattern = isThreadGauge
          ? `${prefix}%` // Match set_ids like SP0001, SP0002
          : `${prefix}%`; // Match gauge_ids

        const idField = isThreadGauge ? 'set_id' : 'gauge_id';

        const [existingRows] = await conn.execute(
          `SELECT DISTINCT ${idField} FROM gauges
           WHERE ${idField} LIKE ?
           AND ${idField} IS NOT NULL
           AND is_deleted = 0
           ORDER BY ${idField}
           FOR UPDATE`,
          [idPattern]
        );

        // Extract numeric parts from existing IDs
        const existingNumbers = existingRows.map(row => {
          const id = row[idField];
          // Remove prefix and suffix (A/B for thread gauges)
          const numericPart = id.replace(prefix, '').replace(/[AB]$/, '');
          return parseInt(numericPart, 10);
        }).filter(num => !isNaN(num)).sort((a, b) => a - b);

        // Find first gap or use next number
        let nextNumber = 1;
        for (const num of existingNumbers) {
          if (num === nextNumber) {
            nextNumber++;
          } else if (num > nextNumber) {
            // Found a gap
            break;
          }
        }

        // Build the ID
        let systemId = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

        // Add suffix for thread gauges
        if (isThreadGauge) {
          systemId += isGoGauge ? 'A' : 'B';
        }

        // Update sequence counter to reflect the highest used number
        const maxUsedNumber = existingNumbers.length > 0
          ? Math.max(...existingNumbers)
          : 0;

        // Only update sequence if we're using a number higher than current max
        if (nextNumber > maxUsedNumber) {
          await this.repository.updateSequence(categoryId, gaugeType, nextNumber, conn);
        }

        logger.info('Generated gauge system ID with gap backfill', {
          categoryId,
          gaugeType,
          prefix,
          systemId,
          nextNumber,
          existingCount: existingNumbers.length,
          maxUsedNumber,
          backfilled: nextNumber <= maxUsedNumber
        });

        return systemId;
      };

      // FIX: Use provided connection or create new transaction
      if (connection) {
        return await executeWithConnection(connection);
      } else {
        return this.executeInTransaction(async (conn) => {
          return await executeWithConnection(conn);
        });
      }
    });
  }
  
  /**
   * Generate a standardized name for a gauge based on its properties
   * @param {Object} gaugeData - The gauge data including equipment_type, spec, and gauge_suffix
   * @returns {string} The standardized name
   */
  generateStandardizedName(gaugeData) {
    const { equipment_type, spec, gauge_suffix, name } = gaugeData;
    
    switch (equipment_type) {
      case 'thread_gauge':
        if (!spec) return name;
        
        // Build standardized thread gauge name
        let stdName = '';
        if (spec.thread_size) stdName += spec.thread_size + ' ';
        if (spec.thread_form) stdName += spec.thread_form + ' ';
        if (spec.thread_class) stdName += spec.thread_class + ' ';
        stdName += 'Thread ';
        if (spec.gauge_type) stdName += spec.gauge_type.charAt(0).toUpperCase() + spec.gauge_type.slice(1) + ' ';
        stdName += 'Gauge';
        
        // Add GO/NO GO suffix for thread gauges
        if (gauge_suffix === 'A') {
          stdName += ' GO';
        } else if (gauge_suffix === 'B') {
          stdName += ' NO GO';
        }
        
        return stdName.trim();
        
      case 'hand_tool':
        if (!spec) return name;
        
        // Format: "0-6inches Digital Caliper"
        let toolName = '';
        if (spec.range_min !== undefined && spec.range_max !== undefined) {
          toolName += `${spec.range_min}-${spec.range_max}`;
          toolName += spec.range_unit || 'inches';
          toolName += ' ';
        }
        if (spec.format) toolName += spec.format.charAt(0).toUpperCase() + spec.format.slice(1) + ' ';
        if (spec.tool_type) {
          // Convert snake_case to Title Case
          const toolType = spec.tool_type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          toolName += toolType;
        }
        
        return toolName.trim() || name;
        
      case 'large_equipment':
      case 'calibration_standard':
        // For these types, use the provided name as-is
        return name;
        
      default:
        return name;
    }
  }

  /**
   * Utility methods for extracting gauge suffix from gauge_id
   * These derive GO/NO GO status from gauge_id suffix
   */

  /**
   * Get the gauge suffix from gauge_id
   * @param {string} gaugeId - The gauge identifier
   * @returns {string|null} 'A' for GO, 'B' for NO GO, null if no suffix
   */
  static getGaugeSuffix(gaugeId) {
    const match = gaugeId?.match(/[AB]$/);
    return match ? match[0] : null;
  }

  /**
   * Check if a gauge is a GO gauge based on gauge_id suffix
   * @param {string} gaugeId - The gauge identifier
   * @returns {boolean} true if GO gauge (ends with 'A'), false otherwise
   */
  static isGoGauge(gaugeId) {
    return gaugeId?.endsWith('A');
  }

  /**
   * SERIAL NUMBER SYSTEM: Generate a SET ID for pairing spare thread gauges
   * SET IDs use SP prefix and do NOT include A/B suffix
   * @param {number} categoryId - The gauge category ID
   * @returns {Promise<string>} The generated set ID (e.g., "SP0001")
   */
  async generateSetId(categoryId) {
    return this.performanceMonitor('generateSetId', async () => {
      return this.executeInTransaction(async (connection) => {
        // Use repository for atomic sequence generation
        // Note: Uses 'plug' gauge_type since sets use the plug sequence configuration
        const { nextSequence, prefix } = await this.repository.generateSequence(
          categoryId,
          'plug',
          connection
        );

        // SET IDs use prefix without A/B suffix
        const setId = `${prefix}${nextSequence.toString().padStart(4, '0')}`;

        logger.info('Generated gauge set ID', {
          categoryId,
          setId,
          nextSequence,
          prefix
        });

        return setId;
      });
    });
  }

  /**
   * Validate a custom gauge ID format and check availability
   * FIX: Added connection and forUpdate parameters for transaction safety
   * @param {string} customGaugeId - The custom gauge ID to validate
   * @param {number} categoryId - The gauge category ID
   * @param {string|null} gaugeType - The gauge type (for thread gauges: 'plug' or 'ring')
   * @param {boolean|null} isGoGauge - For thread gauges: true for GO, false for NO GO
   * @param {Object|null} connection - Optional database connection for transaction
   * @param {boolean} forUpdate - If true, adds FOR UPDATE lock (requires connection in transaction)
   * @returns {Promise<Object>} Validation result { valid: boolean, available: boolean, message: string, suggestedId: string }
   */
  async validateCustomGaugeId(customGaugeId, categoryId, gaugeType = null, isGoGauge = null, connection = null, forUpdate = false) {
    return this.performanceMonitor('validateCustomGaugeId', async () => {
      // Basic format validation
      if (!customGaugeId || typeof customGaugeId !== 'string') {
        return {
          valid: false,
          available: false,
          message: 'Gauge ID is required and must be a string'
        };
      }

      // Trim whitespace
      customGaugeId = customGaugeId.trim();

      // Length validation (2-20 characters)
      if (customGaugeId.length < 2 || customGaugeId.length > 20) {
        return {
          valid: false,
          available: false,
          message: 'Gauge ID must be between 2 and 20 characters'
        };
      }

      // Format validation: alphanumeric with optional hyphens
      if (!/^[A-Z0-9-]+$/.test(customGaugeId)) {
        return {
          valid: false,
          available: false,
          message: 'Gauge ID must contain only uppercase letters, numbers, and hyphens'
        };
      }

      // Check availability in database (with optional locking)
      const isAvailable = await this.isGaugeIdAvailable(customGaugeId, connection, forUpdate);

      if (!isAvailable) {
        // Generate a suggestion (uses connection if inside transaction)
        const suggestedId = connection
          ? await this.generateSystemId(categoryId, gaugeType, isGoGauge)
          : await this.generateSystemId(categoryId, gaugeType, isGoGauge);

        return {
          valid: true,
          available: false,
          message: `Gauge ID "${customGaugeId}" is already in use`,
          suggestedId
        };
      }

      logger.info('Custom gauge ID validated', {
        customGaugeId,
        categoryId,
        gaugeType,
        valid: true,
        available: true
      });

      return {
        valid: true,
        available: true,
        message: 'Gauge ID is available'
      };
    });
  }

  /**
   * Check if a gauge ID is available (not already in use)
   * FIX: Added is_deleted = 0 filter to prevent counting soft-deleted records
   * FIX: Added connection parameter for transaction safety and row locking
   * @param {string} gaugeId - The gauge ID to check
   * @param {Object|null} connection - Optional database connection for transaction
   * @param {boolean} forUpdate - If true, adds FOR UPDATE lock (requires connection in transaction)
   * @returns {Promise<boolean>} true if available, false if already in use
   */
  async isGaugeIdAvailable(gaugeId, connection = null, forUpdate = false) {
    return this.performanceMonitor('isGaugeIdAvailable', async () => {
      const dbConnection = require('../../../infrastructure/database/connection');
      const conn = connection || (this.pool || dbConnection.getPool());

      const lockClause = forUpdate && connection ? ' FOR UPDATE' : '';
      const query = `SELECT COUNT(*) as count FROM gauges
                     WHERE (gauge_id = ? OR set_id = ?)
                     AND is_deleted = 0${lockClause}`;

      const [rows] = await (connection
        ? connection.execute(query, [gaugeId, gaugeId])
        : conn.execute(query, [gaugeId, gaugeId])
      );

      return rows[0].count === 0;
    });
  }

  /**
   * Suggest next available gauge ID for a category
   * This is a wrapper around generateSystemId for API convenience
   * @param {number} categoryId - The gauge category ID
   * @param {string|null} gaugeType - The gauge type
   * @param {boolean|null} isGoGauge - For thread gauges: true for GO, false for NO GO
   * @returns {Promise<Object>} { suggestedId: string, prefix: string }
   */
  async suggestGaugeId(categoryId, gaugeType = null, isGoGauge = null) {
    return this.performanceMonitor('suggestGaugeId', async () => {
      const suggestedId = await this.generateSystemId(categoryId, gaugeType, isGoGauge);

      // Get prefix for reference
      const dbConnection = require('../../../infrastructure/database/connection');
      const pool = this.pool || dbConnection.getPool();
      const [categoryRows] = await pool.execute(
        'SELECT prefix FROM gauge_categories WHERE id = ?',
        [categoryId]
      );

      const prefix = categoryRows[0]?.prefix || '';

      logger.info('Suggested gauge ID', {
        categoryId,
        gaugeType,
        suggestedId,
        prefix
      });

      return {
        suggestedId,
        prefix
      };
    });
  }
}

module.exports = GaugeIdService;