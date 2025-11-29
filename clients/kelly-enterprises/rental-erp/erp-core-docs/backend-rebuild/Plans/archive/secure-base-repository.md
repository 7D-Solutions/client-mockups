# Secure BaseRepository Implementation

## Overview
This document provides a secure implementation of BaseRepository that addresses the SQL injection vulnerability and other critical issues found in the original plan.

## Critical Security Fixes

### 1. SQL Injection Prevention
- Whitelist allowed table names
- Validate all identifiers
- Use parameterized queries exclusively
- Never interpolate user input into SQL strings

### 2. Connection Management
- Add connection timeout handling
- Implement connection pool exhaustion protection
- Proper error handling and resource cleanup

### 3. Schema Validation
- Verify table structure before operations
- Handle missing columns gracefully
- Support tables without soft delete

## Secure BaseRepository Implementation

```javascript
const { pool } = require('../database/connection');
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
    'login_attempts',
    'notifications',
    'notification_recipients',
    'purchase_orders',
    'purchase_order_items',
    'seal_statuses',
    'unseal_requests',
    'location_types'
  ]);

  // Schema cache to avoid repeated queries
  static schemaCache = new Map();
  static schemaCacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor(tableName, primaryKey = 'id') {
    // Validate table name against whitelist
    if (!BaseRepository.ALLOWED_TABLES.has(tableName)) {
      throw new Error(`Table '${tableName}' is not in the allowed list`);
    }
    
    this.tableName = tableName;
    this.primaryKey = this.validateIdentifier(primaryKey);
    this.schemaLoaded = false;
    this.tableSchema = null;
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
   * Gets connection with timeout protection
   */
  async getConnectionWithTimeout(timeout = 5000) {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection pool timeout')), timeout)
    );
    
    try {
      return await Promise.race([
        pool.getConnection(),
        timeoutPromise
      ]);
    } catch (error) {
      if (error.message === 'Connection pool timeout') {
        logger.error('Connection pool exhausted', {
          activeConnections: pool.pool._allConnections.length,
          freeConnections: pool.pool._freeConnections.length
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
   * Finds a record by ID
   */
  async findById(id, conn) {
    await this.ensureSchema(conn);
    
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    
    try {
      let query = `SELECT * FROM \`${this.tableName}\` WHERE \`${this.primaryKey}\` = ?`;
      const params = [id];
      
      // Only add soft delete check if column exists
      if (this.tableSchema.hasIsDeleted) {
        query += ' AND is_deleted = 0';
      }
      
      const [rows] = await connection.execute(query, params);
      return rows[0] || null;
    } catch (error) {
      logger.error(`Failed to find ${this.tableName} by ID:`, {
        error: error.message,
        tableName: this.tableName,
        id
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
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
      logger.error(`Failed to create ${this.tableName}:`, {
        error: error.message,
        tableName: this.tableName,
        data: Object.keys(data) // Log keys only, not values
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
      for (const [key, value] of Object.entries(data)) {
        if (this.tableSchema.columns[key] && key !== this.primaryKey) {
          validData[key] = value;
        }
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
      logger.error(`Failed to update ${this.tableName}:`, {
        error: error.message,
        tableName: this.tableName,
        id
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
      logger.error(`Failed to hard delete from ${this.tableName}:`, {
        error: error.message,
        tableName: this.tableName,
        id
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
        }
      }
      
      const [rows] = await connection.execute(query, params);
      return rows;
      
    } catch (error) {
      logger.error(`Failed to find all ${this.tableName}:`, {
        error: error.message,
        tableName: this.tableName,
        conditions: Object.keys(conditions)
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
      logger.error('Failed to execute query:', {
        error: error.message,
        query: query.substring(0, 100) // Log only first 100 chars
      });
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = BaseRepository;
```

## Implementation Notes

### 1. Security Measures
- **Table Whitelist**: Only explicitly allowed tables can be used
- **Identifier Validation**: All identifiers are validated against injection patterns
- **SQL Keywords**: Prevents use of SQL keywords as identifiers
- **Parameterized Queries**: All values use parameter binding
- **Query Validation**: Raw queries are checked for dangerous operations

### 2. Connection Management
- **Timeout Protection**: Connections have 5-second timeout to prevent hanging
- **Pool Monitoring**: Logs pool status on timeout
- **Proper Cleanup**: Always releases connections in finally blocks
- **Transaction Support**: Handles transaction commit/rollback properly

### 3. Schema Awareness
- **Dynamic Schema Loading**: Loads table schema on first use
- **Schema Caching**: Caches schema for 5 minutes to reduce queries
- **Column Validation**: Only allows operations on existing columns
- **Soft Delete Support**: Checks if table supports soft delete
- **Timestamp Handling**: Automatically adds created_at/updated_at where supported

### 4. Error Handling
- **Detailed Logging**: Logs errors with context but not sensitive data
- **Graceful Failures**: Provides meaningful error messages
- **Transaction Safety**: Always rolls back on error
- **Resource Cleanup**: Ensures connections are released even on error

## Usage Example

```javascript
const BaseRepository = require('./infrastructure/repositories/BaseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('core_users', 'user_id'); // Table name must be in whitelist
  }

  async findByEmail(email, conn) {
    await this.ensureSchema(conn);
    
    // Use executeQuery for complex queries with proper parameterization
    const query = `
      SELECT u.*, GROUP_CONCAT(r.role_name) as roles
      FROM \`core_users\` u
      LEFT JOIN \`core_user_roles\` ur ON u.user_id = ur.user_id
      LEFT JOIN \`core_roles\` r ON ur.role_id = r.role_id
      WHERE u.email = ? AND u.is_deleted = 0
      GROUP BY u.user_id
    `;
    
    const rows = await this.executeQuery(query, [email], conn);
    return rows[0] || null;
  }
}
```

## Testing Requirements

### Security Tests
```javascript
describe('BaseRepository Security', () => {
  it('should reject non-whitelisted tables', () => {
    expect(() => new BaseRepository('evil_table'))
      .toThrow('Table \'evil_table\' is not in the allowed list');
  });

  it('should reject SQL injection in identifiers', () => {
    const repo = new BaseRepository('core_users');
    expect(() => repo.validateIdentifier('id; DROP TABLE users'))
      .toThrow('Invalid identifier');
  });

  it('should reject SQL keywords as identifiers', () => {
    const repo = new BaseRepository('core_users');
    expect(() => repo.validateIdentifier('SELECT'))
      .toThrow('Identifier cannot be SQL keyword');
  });
});
```

### Connection Management Tests
```javascript
describe('Connection Management', () => {
  it('should timeout if pool exhausted', async () => {
    // Exhaust pool
    const connections = await Promise.all(
      Array(10).fill(null).map(() => pool.getConnection())
    );
    
    const repo = new BaseRepository('core_users');
    await expect(repo.findById(1))
      .rejects.toThrow('Connection pool timeout');
    
    // Cleanup
    connections.forEach(c => c.release());
  });
});
```

## Migration Path

1. **Update Whitelist**: Add all production tables to ALLOWED_TABLES
2. **Test Schema Loading**: Verify schema detection works for all tables
3. **Update Existing Repos**: Gradually migrate existing repositories
4. **Add Security Tests**: Ensure no injection vulnerabilities
5. **Monitor Performance**: Check connection pool usage and timeouts

## Critical Reminders

1. **NEVER** remove the table whitelist
2. **NEVER** allow dynamic table names from user input
3. **ALWAYS** validate identifiers before use
4. **ALWAYS** use parameterized queries for values
5. **ALWAYS** release connections properly
6. **ALWAYS** handle schema differences between tables