const connection = require('../database/connection');
const logger = require('../utils/logger');

class BaseRepository {
  // Whitelist of allowed tables - MUST be maintained
  static ALLOWED_TABLES = new Set([
    'core_users',
    'core_user_roles',
    'gauges',
    'gauge_calibrations',
    'gauge_transfers',
    'gauge_transfer_items',
    'manufacturers',
    'audit_logs',
    'core_audit_log',
    'login_attempts',
    'notifications',
    'notification_recipients',
    'purchase_orders',
    'purchase_order_items',
    'seal_statuses',
    'unseal_requests',
    'gauge_unseal_requests',
    'location_types',
    'rejection_reasons',
    'gauge_status_history',
    'user_sessions',
    'system_settings',
    'core_sessions',
    'core_login_attempts',
    'core_roles',
    'account_lockouts',
    'gauge_active_checkouts',
    'gauge_calibration_schedule',
    'gauge_hand_tool_specifications',
    'gauge_large_equipment_specifications',
    'gauge_thread_specifications',
    'gauge_calibration_standard_specifications',
    'gauge_categories',
    'gauge_audit_trail',
    'gauge_id_config',
    'certificates',
    'calibration_batches',
    'calibration_batch_gauges',
    'inventory_current_locations',
    'inventory_movements',
    'storage_locations',
    'user_favorites',
    'facilities',
    'buildings',
    'zones'
  ]);

  // Schema cache to avoid repeated queries
  static schemaCache = new Map();
  static schemaCacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor(param1, param2 = 'id', param3 = null) {
    let tableName, entityType, primaryKey;

    // HANDLE LEGACY CONSTRUCTOR PATTERNS
    if (param1 && typeof param1 === 'object' && (param1.execute || param1.pool)) {
      // Legacy: constructor(pool, tableName)
      this.pool = param1; // Store the pool!
      tableName = param2;
      entityType = null;
      primaryKey = 'id';
    } else if (typeof param1 === 'string' && typeof param2 === 'string' && param3 === null) {
      // Legacy: constructor(tableName, primaryKey)
      tableName = param1;
      primaryKey = param2;
      entityType = null;
    } else {
      // New: constructor(tableName, entityType, primaryKey)
      tableName = param1;
      entityType = param2;
      primaryKey = param3 || 'id';
    }

    // Enhanced constructor validation and debugging
    if (!tableName || typeof tableName !== 'string') {
      throw new Error(`Repository ${this.constructor.name} requires valid tableName parameter, got: ${typeof tableName}`);
    }
    
    logger.debug(`Repository ${this.constructor.name} initialization:`, {
      tableName, 
      primaryKey,
      entityType: entityType || 'auto-detected'
    });

    // Validate table name against whitelist
    if (!BaseRepository.ALLOWED_TABLES.has(tableName)) {
      throw new Error(`Table '${tableName}' is not in the allowed list`);
    }
    
    this.tableName = tableName;
    this.primaryKey = this.validateIdentifier(primaryKey);
    this.schemaLoaded = false;
    this.tableSchema = null;

    // Don't store pool reference - access dynamically through connection module
    // This ensures we always get the current pool state, not the initial null value
  }

  /**
   * Validates SQL identifiers to prevent injection
   */
  validateIdentifier(identifier) {
    if (typeof identifier !== 'string') {
      throw new Error('Identifier must be a string');
    }
    
    // Only allow alphanumeric, underscore, and dash
    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    
    // Prevent SQL keywords
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE'];
    if (sqlKeywords.includes(identifier.toUpperCase())) {
      throw new Error(`Identifier cannot be SQL keyword: ${identifier}`);
    }
    
    return identifier;
  }

  /**
   * Validates and sanitizes column names
   */
  validateColumns(columns) {
    if (!Array.isArray(columns)) {
      throw new Error('Columns must be an array');
    }

    return columns.map(col => this.validateIdentifier(col));
  }

  /**
   * Validates integer parameters for LIMIT/OFFSET to prevent SQL injection
   * @param {any} value - Value to validate
   * @param {string} paramName - Parameter name for error messages
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @returns {number} Validated integer
   * @throws {Error} If validation fails
   */
  validateIntegerParameter(value, paramName, min = 0, max = Number.MAX_SAFE_INTEGER) {
    if (value === null || value === undefined) {
      throw new Error(`Invalid ${paramName} value: must be a valid integer`);
    }

    const stringValue = String(value).trim();

    if (stringValue === '') {
      throw new Error(`Invalid ${paramName} value: must be a valid integer`);
    }

    if (!/^\d+$/.test(stringValue)) {
      throw new Error(`Invalid ${paramName} value: must be between ${min} and ${max}`);
    }

    const parsed = parseInt(stringValue, 10);

    if (isNaN(parsed)) {
      throw new Error(`Invalid ${paramName} value: must be a valid integer`);
    }

    if (parsed.toString() !== stringValue) {
      throw new Error(`Invalid ${paramName} value: must be an integer`);
    }

    if (parsed < min || parsed > max) {
      if (paramName === 'offset' && min === 0) {
        throw new Error(`Invalid ${paramName}: must be between ${min} and ${max}`);
      }
      throw new Error(`Invalid ${paramName}: must be between ${min} and ${max}`);
    }

    return parsed;
  }

  /**
   * Gets connection with timeout protection
   */
  async getConnectionWithTimeout(timeout = 15000) {
    // Use instance pool if available, otherwise use global pool
    const pool = this.pool || connection.pool;

    if (!pool) {
      throw new Error('Database pool not available - check database configuration');
    }

    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Connection pool timeout')), timeout);
    });

    try {
      const conn = await Promise.race([
        pool.getConnection(),
        timeoutPromise
      ]);
      clearTimeout(timeoutId); // Clear timeout when connection succeeds
      return conn;
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout on error too
      if (error.message === 'Connection pool timeout') {
        const { pool: poolImpl } = pool;
        logger.error('Connection pool exhausted', {
          connectionLimit: poolImpl?.config?.connectionLimit || 'unknown',
          activeConnections: poolImpl?._allConnections?.length || 'unknown',
          freeConnections: poolImpl?._freeConnections?.length || 'unknown',
          queuedRequests: poolImpl?._connectionQueue?.length || 'unknown'
        });
      }
      throw error;
    }
  }

  /**
   * Loads and caches table schema
   */
  async loadTableSchema(conn) {
    // Check cache first
    const cacheKey = this.tableName;
    const cached = BaseRepository.schemaCache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      this.tableSchema = cached.schema;
      this.schemaLoaded = true;
      return;
    }

    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [this.tableName]
      );

      if (columns.length === 0) {
        throw new Error(`Table ${this.tableName} not found in database`);
      }

      this.tableSchema = {
        columns: columns.reduce((acc, col) => {
          acc[col.COLUMN_NAME] = {
            type: col.DATA_TYPE,
            nullable: col.IS_NULLABLE === 'YES',
            default: col.COLUMN_DEFAULT
          };
          return acc;
        }, {}),
        hasIsDeleted: columns.some(col => col.COLUMN_NAME === 'is_deleted'),
        hasUpdatedAt: columns.some(col => col.COLUMN_NAME === 'updated_at'),
        hasCreatedAt: columns.some(col => col.COLUMN_NAME === 'created_at')
      };

      // Cache the schema
      BaseRepository.schemaCache.set(cacheKey, {
        schema: this.tableSchema,
        expiry: Date.now() + BaseRepository.schemaCacheExpiry
      });

      this.schemaLoaded = true;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Ensures schema is loaded before operations
   */
  async ensureSchema(conn) {
    if (!this.schemaLoaded) {
      await this.loadTableSchema(conn);
    }
  }

  /**
   * Executes a callback with automatic connection management
   * @param {Function} callback - Async function that receives a connection
   * @param {Object} existingConn - Optional existing connection for transaction support
   * @returns {Promise} Result of callback execution
   */
  async withConnection(callback, existingConn = null) {
    if (existingConn) {
      return await callback(existingConn);
    }
    
    const connection = await this.getConnectionWithTimeout();
    
    try {
      return await callback(connection);
    } finally {
      connection.release();
    }
  }

  /**
   * Executes a callback within a transaction
   * @param {Function} callback - Async function that receives a connection
   * @returns {Promise} Result of callback execution
   */
  async withTransaction(callback) {
    return this.withConnection(async (connection) => {
      await connection.beginTransaction();
      
      try {
        const result = await callback(connection);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });
  }

  /**
   * Finds a record by ID
   */
  async findById(id, conn) {
    await this.ensureSchema(conn);
    
    return this.withConnection(async (connection) => {
      let query = `SELECT * FROM \`${this.tableName}\` WHERE \`${this.primaryKey}\` = ?`;
      const params = [id];
      
      // Only add soft delete check if column exists
      if (this.tableSchema.hasIsDeleted) {
        query += ' AND is_deleted = 0';
      }
      
      const [rows] = await connection.execute(query, params);
      return rows[0] || null;
    }, conn);
  }

  /**
   * Creates a new record with validation
   */
  async create(data, conn) {
    await this.ensureSchema(conn);
    
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      // Filter out columns that don't exist in the table
      const validData = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.tableSchema.columns[key]) {
          validData[key] = value;
        } else {
          logger.warn(`Ignoring unknown column '${key}' for table '${this.tableName}'`);
        }
      }
      
      // Add created_at if the table has it and it's not provided
      if (this.tableSchema.hasCreatedAt && !validData.created_at) {
        validData.created_at = new Date();
      }
      
      const columns = Object.keys(validData);
      if (columns.length === 0) {
        throw new Error('No valid columns to insert');
      }
      
      const validatedColumns = this.validateColumns(columns);
      const placeholders = validatedColumns.map(() => '?').join(',');
      const values = validatedColumns.map(col => validData[col]);
      
      // Use backticks for identifiers, ? for values
      const query = `INSERT INTO \`${this.tableName}\` (${validatedColumns.map(col => `\`${col}\``).join(',')}) VALUES (${placeholders})`;
      
      const [result] = await connection.execute(query, values);
      
      if (shouldCommit) await connection.commit();
      
      return { id: result.insertId, ...validData };
      
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error(`${this.constructor.name}.create failed:`, {
        error: error.message,
        table: this.tableName,
        columns: Object.keys(data),
        sqlState: error.sqlState
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Updates a record with validation
   */
  async update(id, data, conn) {
    await this.ensureSchema(conn);

    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      // Filter out columns that don't exist
      const validData = {};
      const filteredOut = [];
      for (const [key, value] of Object.entries(data)) {
        if (this.tableSchema.columns[key] && key !== this.primaryKey) {
          validData[key] = value;
        } else if (key !== this.primaryKey) {
          filteredOut.push(key);
        }
      }

      if (filteredOut.length > 0) {
        logger.warn(`${this.tableName}: Filtered out unknown columns:`, {
          filteredOut,
          availableColumns: Object.keys(this.tableSchema.columns)
        });
      }
      
      // Add updated_at if the table has it
      if (this.tableSchema.hasUpdatedAt && !validData.updated_at) {
        validData.updated_at = new Date();
      }
      
      const columns = Object.keys(validData);
      if (columns.length === 0) {
        throw new Error('No valid columns to update');
      }
      
      const validatedColumns = this.validateColumns(columns);
      const setClause = validatedColumns.map(col => `\`${col}\` = ?`).join(', ');
      const values = [...validatedColumns.map(col => validData[col]), id];
      
      const query = `UPDATE \`${this.tableName}\` SET ${setClause} WHERE \`${this.primaryKey}\` = ?`;
      
      const [result] = await connection.execute(query, values);
      
      if (result.affectedRows === 0) {
        throw new Error(`No rows updated for ${this.tableName} with ${this.primaryKey} = ${id}`);
      }
      
      if (shouldCommit) await connection.commit();
      
      return { id, ...validData };
      
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error(`${this.constructor.name}.update failed:`, {
        error: error.message,
        table: this.tableName,
        id,
        sqlState: error.sqlState
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Soft deletes a record (if supported)
   */
  async softDelete(id, conn) {
    await this.ensureSchema(conn);
    
    if (!this.tableSchema.hasIsDeleted) {
      throw new Error(`Table ${this.tableName} does not support soft delete`);
    }
    
    return this.update(id, { is_deleted: 1 }, conn);
  }

  /**
   * Hard deletes a record (use with caution)
   */
  async hardDelete(id, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;
    
    try {
      if (shouldCommit) await connection.beginTransaction();
      
      const query = `DELETE FROM \`${this.tableName}\` WHERE \`${this.primaryKey}\` = ?`;
      const [result] = await connection.execute(query, [id]);
      
      if (result.affectedRows === 0) {
        throw new Error(`No rows deleted for ${this.tableName} with ${this.primaryKey} = ${id}`);
      }
      
      if (shouldCommit) await connection.commit();
      
      return { id, deleted: true };
      
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error(`${this.constructor.name}.hardDelete failed:`, {
        error: error.message,
        table: this.tableName,
        id,
        sqlState: error.sqlState
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Finds all records with optional conditions
   */
  async findAll(conditions = {}, conn) {
    await this.ensureSchema(conn);
    
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      let query = `SELECT * FROM \`${this.tableName}\` WHERE 1=1`;
      const params = [];
      
      // Add soft delete check if supported
      if (this.tableSchema.hasIsDeleted && !conditions.includeDeleted) {
        query += ' AND is_deleted = 0';
      }
      
      // Add custom conditions
      for (const [key, value] of Object.entries(conditions)) {
        if (key === 'includeDeleted') continue;
        
        const validatedKey = this.validateIdentifier(key);
        if (this.tableSchema.columns[validatedKey]) {
          query += ` AND \`${validatedKey}\` = ?`;
          params.push(value);
        } else {
          // DEBUG: Log invalid column attempts
          logger.error('Invalid column reference detected', {
            table: this.tableName,
            invalidColumn: validatedKey,
            availableColumns: Object.keys(this.tableSchema.columns),
            conditions: Object.keys(conditions),
            stackTrace: new Error().stack
          });
        }
      }
      
      const [rows] = await connection.execute(query, params);
      return rows;
      
    } catch (error) {
      logger.error(`${this.constructor.name}.findAll failed:`, {
        error: error.message,
        table: this.tableName,
        conditions: Object.keys(conditions),
        sqlState: error.sqlState
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Executes a raw query with validation (use sparingly)
   */
  async executeQuery(query, params = [], conn) {
    // Validate that query doesn't contain dangerous operations
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /ALTER\s+TABLE/i,
      /CREATE\s+TABLE/i,
      /TRUNCATE/i,
      /INTO\s+OUTFILE/i,
      /LOAD\s+DATA/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error('Query contains prohibited operation');
      }
    }
    
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      const [rows] = await connection.execute(query, params);
      return rows;
    } catch (error) {
      logger.error(`${this.constructor.name} query failed on table '${this.tableName}':`, {
        error: error.message,
        sqlState: error.sqlState,
        query: query.substring(0, 100),
        primaryKey: this.primaryKey
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Generic find by column helper
   */
  async findByColumn(column, value, connection = null) {
    await this.ensureSchema(connection);
    
    return this.withConnection(async (conn) => {
      const validatedColumn = this.validateIdentifier(column);
      let query = `SELECT * FROM \`${this.tableName}\` WHERE \`${validatedColumn}\` = ?`;
      const params = [value];
      
      // Add soft delete check if supported
      if (this.tableSchema.hasIsDeleted) {
        query += ' AND is_deleted = 0';
      }
      
      const [rows] = await conn.execute(query, params);
      return rows[0] || null;
    }, connection);
  }
}

module.exports = BaseRepository;