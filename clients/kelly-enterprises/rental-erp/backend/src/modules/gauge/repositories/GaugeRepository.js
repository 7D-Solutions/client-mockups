const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');
const { GAUGE_WITH_RELATIONS, buildGaugeQuery } = require('../queries');
const GaugeDTOMapper = require('../mappers/GaugeDTOMapper');
const { buildThreadSizeSearchClause } = require('../utils/threadSizeNormalizer');

// Maps equipment_type → spec table name
const SPEC_TABLES = {
  thread_gauge: 'gauge_thread_specifications',
  hand_tool: 'gauge_hand_tool_specifications',
  large_equipment: 'gauge_large_equipment_specifications',
  calibration_standard: 'gauge_calibration_standard_specifications',
};

class GaugeRepository extends BaseRepository {
  constructor(pool = null) {
    // Support both legacy pool parameter and new pattern
    if (pool && typeof pool === 'object' && pool.execute) {
      super(pool, 'gauges');
    } else {
      super('gauges', 'id');
    }
  }

  /**
   * UNIVERSAL REPOSITORY IMPLEMENTATION - Primary Key
   * Uses optimized gauge query with specifications
   */
  async findByPrimaryKey(id, connection = null) {
    try {
      return await this.getGaugeById(id, connection);
    } catch (error) {
      logger.error('GaugeRepository.findByPrimaryKey failed:', {
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * UNIVERSAL REPOSITORY IMPLEMENTATION - Business Identifier
   * Should not be used - Universal Repository routes to specific methods
   */
  async findByBusinessIdentifier(identifier, connection = null) {
    logger.warn('findByBusinessIdentifier called - routing should be deterministic', { identifier });
    throw new Error('Use deterministic routing: findByGaugeId or findBySystemGaugeId');
  }

  /**
   * Private helper: Fetch gauge with specifications by field
   */
  async _fetchGaugeByField(fieldName, fieldValue, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const { sql, params } = buildGaugeQuery(
        `WHERE g.${fieldName} = ? AND g.is_deleted = 0`,
        [fieldValue]
      );
      const gauges = await this.executeQuery(sql, params, conn);

      if (gauges.length === 0) return null;

      const gauge = gauges[0];

      // DEBUG LOGGING - Log raw database result
      logger.info('🔍 GAUGE QUERY DEBUG - Raw database result', {
        fieldName,
        fieldValue,
        gauge_id: gauge.id,
        gauge_id_string: gauge.gauge_id,
        has_pending_transfer_raw: gauge.has_pending_transfer,
        pending_transfer_id_raw: gauge.pending_transfer_id,
        transfer_to_user_id_raw: gauge.transfer_to_user_id
      });

      if (gauge.equipment_type && SPEC_TABLES[gauge.equipment_type]) {
        const specTable = this.getSpecTableFor(gauge.equipment_type);
        const specs = await this.executeQuery(
          `SELECT * FROM \`${specTable}\` WHERE gauge_id = ?`,
          [gauge.id],
          conn
        );
        gauge.specifications = specs[0] || null;
      }

      const dto = GaugeDTOMapper.transformToDTO(gauge);

      // DEBUG LOGGING - Log DTO transformation result
      logger.info('🔍 GAUGE DTO DEBUG - After transformation', {
        id: dto.id,
        gauge_id: dto.gauge_id,
        has_pending_transfer: dto.has_pending_transfer,
        pending_transfer_id: dto.pending_transfer_id
      });

      return dto;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * GAUGE-SPECIFIC: Find by gauge_id (GB0004, MRS0002, etc.)
   */
  async findByGaugeId(gaugeId, connection = null) {
    try {
      return await this._fetchGaugeByField('gauge_id', gaugeId, connection);
    } catch (error) {
      logger.error('Failed to find gauge by gauge_id:', error);
      throw error;
    }
  }

  /**
   * GAUGE-SPECIFIC: Find all gauges by set_id (for gauge sets)
   */
  async findBySetId(setId, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const { sql, params } = buildGaugeQuery(
        `WHERE g.set_id = ? AND g.is_deleted = 0`,
        [setId]
      );
      const gauges = await this.executeQuery(sql, params, conn);

      // Fetch specifications for each gauge
      for (const gauge of gauges) {
        if (gauge.equipment_type && SPEC_TABLES[gauge.equipment_type]) {
          const specTable = this.getSpecTableFor(gauge.equipment_type);
          const specs = await this.executeQuery(
            `SELECT * FROM \`${specTable}\` WHERE gauge_id = ?`,
            [gauge.id],
            conn
          );
          gauge.specifications = specs[0] || null;
        }
      }

      return gauges.map(g => GaugeDTOMapper.transformToDTO(g));
    } catch (error) {
      logger.error('Failed to find gauges by set_id:', error);
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Get spec table for equipment type
   */
  getSpecTableFor(type) {
    const table = SPEC_TABLES[type];
    if (!table) throw new Error(`Unsupported equipment_type: ${type}`);
    return table;
  }

  /**
   * Create a new gauge
   */
  async createGauge(gaugeData, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();

      // Transform from DTO format to database format
      const dbData = GaugeDTOMapper.transformFromDTO(gaugeData);

      // Set required defaults
      const equipmentType = dbData.equipment_type || 'thread_gauge';
      const createdBy = dbData.created_by || 1;

      // Log undefined values in dbData
      const undefinedFields = [];
      Object.keys(dbData).forEach(key => {
        if (dbData[key] === undefined) {
          undefinedFields.push(key);
        }
      });
      if (undefinedFields.length > 0) {
        logger.error('❌ FOUND UNDEFINED FIELDS IN dbData:', undefinedFields);
        logger.error('❌ dbData keys:', Object.keys(dbData));
      }

      // Build parameters array and ensure no undefined values
      const params = [
        dbData.gauge_id,
        dbData.set_id || null,
        dbData.custom_id || null,
        dbData.name,
        equipmentType,
        dbData.category_id || 31, // Default to Thread Plugs category if not provided
        dbData.status || 'available',
        dbData.is_spare || 0,
        dbData.is_sealed !== undefined ? dbData.is_sealed : 0,
        dbData.is_active !== undefined ? dbData.is_active : 1,
        dbData.is_deleted || 0,
        createdBy,
        dbData.ownership_type || 'company',
        dbData.employee_owner_id || null,
        dbData.purchase_info || 'company_issued',
        dbData.manufacturer || null,
        dbData.model_number || null
      ];

      // Safety check: Convert any remaining undefined to null
      for (let i = 0; i < params.length; i++) {
        if (params[i] === undefined) {
          logger.error(`❌ Parameter at index ${i} is undefined! Converting to null.`);
          params[i] = null;
        }
      }

      const res = await this.executeQuery(
        `INSERT INTO gauges (gauge_id, set_id, custom_id, name, equipment_type,
         category_id, status, is_spare, is_sealed, is_active, is_deleted, created_by,
         ownership_type, employee_owner_id, purchase_info, manufacturer, model_number, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        params,
        connection
      );

      const gaugeId = res.insertId;

      // Create specifications if provided
      if (dbData.specifications) {
        const specTable = this.getSpecTableFor(equipmentType);
        const specs = dbData.specifications;
        
        // Build dynamic INSERT based on spec fields with validation
        const fields = Object.keys(specs);
        // Validate all field names to prevent SQL injection
        const validatedFields = fields.map(field => {
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
            throw new Error(`Invalid field name: ${field}`);
          }
          return field;
        });
        const placeholders = validatedFields.map(() => '?').join(', ');
        const values = [gaugeId, ...validatedFields.map(f => specs[f])];
        
        // Use backticks for identifiers to prevent injection
        const fieldList = validatedFields.map(f => `\`${f}\``).join(', ');
        await this.executeQuery(
          `INSERT INTO \`${specTable}\` (\`gauge_id\`, ${fieldList}) VALUES (?, ${placeholders})`,
          values,
          connection
        );
      }

      if (shouldCommit) await connection.commit();
      
      // Return the created gauge with DTO transformation
      const createdGauge = { id: gaugeId, ...dbData };
      return GaugeDTOMapper.transformToDTO(createdGauge);
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to create gauge:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Get gauge by ID with specifications
   */
  async getGaugeById(id, conn) {
    try {
      return await this._fetchGaugeByField('id', id, conn);
    } catch (error) {
      logger.error('Failed to get gauge by ID:', error);
      throw error;
    }
  }

  /**
   * Get gauge by gauge_id (universal public identifier)
   * The gauge_id field is the universal public identifier for all equipment types:
   * - Thread gauges: Serial number (e.g., "12345", "SP7002A")
   * - Hand tools: System-generated (e.g., "CA0001")
   * - Large equipment: System-generated (e.g., "CMM0001")
   */
  async getGaugeByGaugeId(gaugeId, conn) {
    try {
      // gauge_id is the universal public identifier - no fallback needed
      const result = await this._fetchGaugeByField('gauge_id', gaugeId, conn);
      return result;
    } catch (error) {
      logger.error('Failed to get gauge by gauge_id:', error);
      throw error;
    }
  }

  /**
   * Update gauge
   */
  async updateGauge(id, updates, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      // Transform from DTO format to database format
      const dbUpdates = GaugeDTOMapper.transformFromDTO(updates);

      // Update gauge
      const result = await this.update(id, dbUpdates, connection);

      // Update specifications if provided
      if (dbUpdates.specifications && dbUpdates.equipment_type) {
        const specTable = this.getSpecTableFor(dbUpdates.equipment_type);
        const specs = dbUpdates.specifications;
        
        // Check if specs exist
        const existing = await this.executeQuery(
          `SELECT gauge_id FROM \`${specTable}\` WHERE gauge_id = ?`,
          [id],
          connection
        );

        if (existing.length > 0) {
          // Update existing specs
          const fields = Object.keys(specs);
          // Validate all field names to prevent SQL injection
          const validatedFields = fields.map(field => {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
              throw new Error(`Invalid field name: ${field}`);
            }
            return field;
          });
          const setClause = validatedFields.map(f => `\`${f}\` = ?`).join(', ');
          const values = [...validatedFields.map(f => specs[f]), id];

          await this.executeQuery(
            `UPDATE \`${specTable}\` SET ${setClause} WHERE gauge_id = ?`,
            values,
            connection
          );
        } else {
          // Insert new specs
          const fields = Object.keys(specs);
          // Validate all field names to prevent SQL injection
          const validatedFields = fields.map(field => {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
              throw new Error(`Invalid field name: ${field}`);
            }
            return field;
          });
          const placeholders = validatedFields.map(() => '?').join(', ');
          const fieldList = validatedFields.map(f => `\`${f}\``).join(', ');
          const values = [id, ...validatedFields.map(f => specs[f])];

          await this.executeQuery(
            `INSERT INTO \`${specTable}\` (\`gauge_id\`, ${fieldList}) VALUES (?, ${placeholders})`,
            values,
            connection
          );
        }
      }

      if (shouldCommit) await connection.commit();
      
      // Return the result with DTO transformation
      return GaugeDTOMapper.transformToDTO(result);
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to update gauge:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }


  /**
   * Find spare thread gauges (gauge_id IS NULL)
   * @param {Object} filters - Optional filters (thread_size, thread_class, gauge_type)
   * @param {Object|null} connection - Optional database connection
   * @returns {Promise<Array>} - Array of gauge DTOs
   */
  async findSpareThreadGauges(filters = {}, connection = null) {
    try {
      const conn = connection || await this.getConnectionWithTimeout();
      const shouldRelease = !connection;

      try {
        let query = `
          ${GAUGE_WITH_RELATIONS}
          WHERE g.equipment_type = 'thread_gauge'
            AND g.gauge_id IS NULL
        `;

        const params = [];

        // Flexible thread size search - supports fractions (1/2) and decimals (.5, .500)
        if (filters.thread_size) {
          const { clause, params: sizeParams, hasMatch } = buildThreadSizeSearchClause(filters.thread_size);
          if (hasMatch) {
            query += ` AND ${clause}`;
            params.push(...sizeParams);
          }
        }

        if (filters.thread_class) {
          query += ` AND ts.thread_class = ?`;
          params.push(filters.thread_class);
        }

        if (filters.gauge_type) {
          query += ` AND gt.gauge_type = ?`;
          params.push(filters.gauge_type);
        }

        if (filters.is_go_gauge !== undefined) {
          query += ` AND g.is_go_gauge = ?`;
          params.push(filters.is_go_gauge);
        }

        query += ` ORDER BY g.custom_id ASC`;

        const [rows] = await conn.query(query, params);
        return rows.map(row => GaugeDTOMapper.transformToDTO(row));
      } finally {
        if (shouldRelease) conn.release();
      }
    } catch (error) {
      logger.error('GaugeRepository.findSpareThreadGauges failed:', {
        filters,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = GaugeRepository;