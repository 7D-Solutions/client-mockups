const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');
const { buildGaugeQuery } = require('../queries');
const { buildThreadSizeSearchClause } = require('../utils/threadSizeNormalizer');

/**
 * GaugeQueryRepository
 *
 * Handles complex gauge queries, searches, and filtering operations.
 * Responsible for multi-criteria searches and paginated results.
 */
class GaugeQueryRepository extends BaseRepository {
  constructor() {
    super('gauges', 'id');
  }

  /**
   * Search gauges with filters and pagination
   * @param {Object} filters - Search filters
   * @param {Object} conn - Database connection (optional)
   * @returns {Promise<Object>} Object with gauges array and total count
   */
  async searchGauges(filters = {}, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      // Use the standardized query with calibration data from gaugeQueries.js
      const { sql: baseQuery } = buildGaugeQuery('WHERE g.is_deleted = 0');
      let query = baseQuery;
      const params = [];

      // Apply filters
      if (filters.status) {
        query += ' AND g.status = ?';
        params.push(filters.status);
      }

      if (filters.equipment_type) {
        query += ' AND g.equipment_type = ?';
        params.push(filters.equipment_type);
      }

      if (filters.is_spare !== undefined) {
        query += ' AND g.is_spare = ?';
        params.push(filters.is_spare ? 1 : 0);
      }

      if (filters.is_sealed !== undefined) {
        query += ' AND g.is_sealed = ?';
        params.push(filters.is_sealed ? 1 : 0);
      }

      if (filters.ownership_type) {
        query += ' AND g.ownership_type = ?';
        params.push(filters.ownership_type);
      }

      // Support for IS NULL check on set_id (for finding spare gauges)
      if (filters.set_id_null === true) {
        query += ' AND g.set_id IS NULL';
      } else if (filters.set_id !== undefined) {
        query += ' AND g.set_id = ?';
        params.push(filters.set_id);
      }

      if (filters.search) {
        query += ' AND (g.gauge_id LIKE ? OR g.custom_id LIKE ? OR g.name LIKE ? OR g.model_number LIKE ? OR g.manufacturer LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Thread specification filters (from gauge_thread_specifications table)
      // Flexible thread size search - supports fractions (1/2) and decimals (.5, .500)
      if (filters.thread_size) {
        const { clause, params: sizeParams, hasMatch } = buildThreadSizeSearchClause(filters.thread_size);
        if (hasMatch) {
          query += ` AND ${clause}`;
          params.push(...sizeParams);
        }
      }

      if (filters.thread_class) {
        query += ' AND ts.thread_class = ?';
        params.push(filters.thread_class);
      }

      if (filters.gauge_type) {
        query += ' AND ts.gauge_type = ?';
        params.push(filters.gauge_type);
      }

      if (filters.is_go_gauge !== undefined) {
        query += ' AND ts.is_go_gauge = ?';
        params.push(filters.is_go_gauge ? 1 : 0);
      }

      if (filters.thread_type_exclude) {
        query += ' AND ts.thread_type != ?';
        params.push(filters.thread_type_exclude);
      }

      // Add ordering and pagination with comprehensive validation
      query += ' ORDER BY g.created_at DESC';

      if (filters.limit !== undefined && filters.limit !== null) {
        // Use comprehensive integer validation that prevents ALL forms of SQL injection
        const limitValue = this.validateIntegerParameter(filters.limit, 'limit', 1, 1000);

        // MySQL 8 requires special handling for LIMIT in prepared statements
        // The validated integer ensures SQL injection prevention while maintaining compatibility
        query += ` LIMIT ${limitValue}`;

        if (filters.offset !== undefined) {
          const offsetValue = this.validateIntegerParameter(filters.offset, 'offset', 0, Number.MAX_SAFE_INTEGER);
          query += ` OFFSET ${offsetValue}`;
        }
      }

      const gauges = await this.executeQuery(query, params, connection);

      // Get total count for pagination - use same base structure as main query
      let countQuery = `
        SELECT COUNT(DISTINCT g.id) as total
        FROM gauges g
        LEFT JOIN gauge_active_checkouts gac ON g.id = gac.gauge_id
        LEFT JOIN core_users u ON gac.checked_out_to = u.id
        LEFT JOIN gauge_transfers gt ON g.id = gt.gauge_id AND gt.status = 'pending'
        LEFT JOIN core_users tu ON gt.to_user_id = tu.id
        LEFT JOIN core_users fu ON gt.from_user_id = fu.id
        LEFT JOIN gauge_calibration_schedule gcs ON g.id = gcs.gauge_id AND gcs.is_active = 1
        LEFT JOIN gauge_thread_specifications ts ON g.id = ts.gauge_id
        WHERE g.is_deleted = 0
      `;

      // Apply the same filters to count query (but without pagination)
      const countParams = [];

      if (filters.status) {
        countQuery += ' AND g.status = ?';
        countParams.push(filters.status);
      }

      if (filters.equipment_type) {
        countQuery += ' AND g.equipment_type = ?';
        countParams.push(filters.equipment_type);
      }

      if (filters.is_spare !== undefined) {
        countQuery += ' AND g.is_spare = ?';
        countParams.push(filters.is_spare ? 1 : 0);
      }

      if (filters.is_sealed !== undefined) {
        countQuery += ' AND g.is_sealed = ?';
        countParams.push(filters.is_sealed ? 1 : 0);
      }

      if (filters.ownership_type) {
        countQuery += ' AND g.ownership_type = ?';
        countParams.push(filters.ownership_type);
      }

      // Support for IS NULL check on set_id (for finding spare gauges)
      if (filters.set_id_null === true) {
        countQuery += ' AND g.set_id IS NULL';
      } else if (filters.set_id !== undefined) {
        countQuery += ' AND g.set_id = ?';
        countParams.push(filters.set_id);
      }

      if (filters.search) {
        countQuery += ' AND (g.gauge_id LIKE ? OR g.custom_id LIKE ? OR g.name LIKE ? OR g.model_number LIKE ? OR g.manufacturer LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Thread specification filters for count query
      // Flexible thread size search - supports fractions (1/2) and decimals (.5, .500)
      if (filters.thread_size) {
        const { clause, params: sizeParams, hasMatch } = buildThreadSizeSearchClause(filters.thread_size);
        if (hasMatch) {
          countQuery += ` AND ${clause}`;
          countParams.push(...sizeParams);
        }
      }

      if (filters.thread_class) {
        countQuery += ' AND ts.thread_class = ?';
        countParams.push(filters.thread_class);
      }

      if (filters.gauge_type) {
        countQuery += ' AND ts.gauge_type = ?';
        countParams.push(filters.gauge_type);
      }

      if (filters.is_go_gauge !== undefined) {
        countQuery += ' AND ts.is_go_gauge = ?';
        countParams.push(filters.is_go_gauge ? 1 : 0);
      }

      if (filters.thread_type_exclude) {
        countQuery += ' AND ts.thread_type != ?';
        countParams.push(filters.thread_type_exclude);
      }

      const countResult = await this.executeQuery(countQuery, countParams, connection);
      const total = countResult[0]?.total || 0;

      // Apply DTO transformation to all gauges
      const transformedGauges = gauges.map(gauge => this.transformToDTO(gauge));

      return { gauges: transformedGauges, total };
    } catch (error) {
      logger.error('Failed to search gauges:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Transform gauge data to DTO format
   * @param {Object} gauge - Raw gauge data from database
   * @returns {Object} Transformed gauge DTO
   */
  transformToDTO(gauge) {
    if (!gauge) return null;

    return {
      ...gauge,
      // Convert MySQL boolean integers to JavaScript booleans
      is_spare: Boolean(gauge.is_spare),
      is_sealed: Boolean(gauge.is_sealed),
      is_deleted: Boolean(gauge.is_deleted),
      // Parse JSON fields if they are strings
      spec: typeof gauge.spec === 'string' ? JSON.parse(gauge.spec) : gauge.spec
    };
  }
}

module.exports = GaugeQueryRepository;
