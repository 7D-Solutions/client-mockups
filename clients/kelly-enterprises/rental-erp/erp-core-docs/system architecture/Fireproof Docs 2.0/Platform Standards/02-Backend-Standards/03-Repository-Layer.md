# Repository Layer Standards

**Fire-Proof ERP Backend - Repository Pattern Implementation**

## Overview

The repository layer abstracts data access, provides transaction support, and handles database connections. All repositories extend `BaseRepository` for consistent behavior and security.

## BaseRepository Pattern

### Location
`backend/src/infrastructure/repositories/BaseRepository.js`

### Class Structure

```javascript
class BaseRepository {
  static ALLOWED_TABLES = new Set([
    'gauges', 'gauge_calibrations', 'core_users', ...
  ]);

  constructor(param1, param2 = 'id', param3 = null) {
    // Supports multiple constructor patterns for backward compatibility
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.schemaLoaded = false;
    this.tableSchema = null;
  }

  // Connection management
  async getConnectionWithTimeout(timeout = 15000) { }
  async withConnection(callback, existingConn = null) { }
  async withTransaction(callback) { }

  // CRUD operations
  async findById(id, conn) { }
  async create(data, conn) { }
  async update(id, data, conn) { }
  async softDelete(id, conn) { }
  async hardDelete(id, conn) { }
  async findAll(conditions = {}, conn) { }

  // Validation
  validateIdentifier(identifier) { }
  validateColumns(columns) { }
  validateIntegerParameter(value, paramName, min, max) { }
}
```

## GaugeRepository Implementation

### Example: Gauge-Specific Repository

**Location**: `backend/src/modules/gauge/repositories/GaugeRepository.js`

```javascript
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const { buildGaugeQuery } = require('../queries');
const GaugeDTOMapper = require('../mappers/GaugeDTOMapper');

const SPEC_TABLES = {
  thread_gauge: 'gauge_thread_specifications',
  hand_tool: 'gauge_hand_tool_specifications',
  large_equipment: 'gauge_large_equipment_specifications',
  calibration_standard: 'gauge_calibration_standard_specifications'
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

      if (gauge.equipment_type && SPEC_TABLES[gauge.equipment_type]) {
        const specTable = this.getSpecTableFor(gauge.equipment_type);
        const specs = await this.executeQuery(
          `SELECT * FROM \`${specTable}\` WHERE gauge_id = ?`,
          [gauge.id],
          conn
        );
        gauge.specifications = specs[0] || null;
      }

      return GaugeDTOMapper.transformToDTO(gauge);
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Create a new gauge with specifications
   */
  async createGauge(gaugeData, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      // Transform from DTO format to database format
      const dbData = GaugeDTOMapper.transformFromDTO(gaugeData);

      // Insert gauge
      const res = await this.executeQuery(
        `INSERT INTO gauges (gauge_id, set_id, name, equipment_type,
         category_id, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          dbData.gauge_id,
          dbData.set_id || null,
          dbData.name,
          dbData.equipment_type || 'thread_gauge',
          dbData.category_id || 31,
          dbData.status || 'available',
          dbData.created_by || 1
        ],
        connection
      );

      const gaugeId = res.insertId;

      // Create specifications if provided
      if (dbData.specifications) {
        const specTable = this.getSpecTableFor(dbData.equipment_type);
        const specs = dbData.specifications;

        // Build dynamic INSERT
        const fields = Object.keys(specs);
        const validatedFields = fields.map(field => {
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
            throw new Error(`Invalid field name: ${field}`);
          }
          return field;
        });

        const placeholders = validatedFields.map(() => '?').join(', ');
        const values = [gaugeId, ...validatedFields.map(f => specs[f])];
        const fieldList = validatedFields.map(f => `\`${f}\``).join(', ');

        await this.executeQuery(
          `INSERT INTO \`${specTable}\` (\`gauge_id\`, ${fieldList}) VALUES (?, ${placeholders})`,
          values,
          connection
        );
      }

      if (shouldCommit) await connection.commit();

      return GaugeDTOMapper.transformToDTO({ id: gaugeId, ...dbData });
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to create gauge:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = GaugeRepository;
```

## Repository Patterns

### Pattern 1: Connection Management

#### Automatic Connection Management
```javascript
async findById(id) {
  return this.withConnection(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT * FROM \`${this.tableName}\` WHERE \`${this.primaryKey}\` = ?`,
      [id]
    );
    return rows[0] || null;
  });
}
```

#### External Connection (Transaction Support)
```javascript
async create(data, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;
  const shouldCommit = !conn;

  try {
    if (shouldCommit) await connection.beginTransaction();

    const [result] = await connection.execute(query, values);

    if (shouldCommit) await connection.commit();

    return { id: result.insertId, ...data };
  } catch (error) {
    if (shouldCommit) await connection.rollback();
    throw error;
  } finally {
    if (shouldRelease) connection.release();
  }
}
```

### Pattern 2: Schema Validation

#### Load and Cache Table Schema
```javascript
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

    // Cache the schema (5 minute expiry)
    BaseRepository.schemaCache.set(cacheKey, {
      schema: this.tableSchema,
      expiry: Date.now() + 5 * 60 * 1000
    });

    this.schemaLoaded = true;
  } finally {
    if (shouldRelease) connection.release();
  }
}
```

#### Filter Invalid Columns
```javascript
async create(data, conn) {
  await this.ensureSchema(conn);

  // Filter out columns that don't exist in the table
  const validData = {};
  for (const [key, value] of Object.entries(data)) {
    if (this.tableSchema.columns[key]) {
      validData[key] = value;
    } else {
      logger.warn(`Ignoring unknown column '${key}' for table '${this.tableName}'`);
    }
  }

  // Add created_at if the table has it
  if (this.tableSchema.hasCreatedAt && !validData.created_at) {
    validData.created_at = new Date();
  }

  // Build and execute query...
}
```

### Pattern 3: Query Building

#### Dynamic Query Construction
```javascript
async findAll(conditions = {}, conn) {
  await this.ensureSchema(conn);

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
}
```

### Pattern 4: Soft Delete

```javascript
async softDelete(id, conn) {
  await this.ensureSchema(conn);

  if (!this.tableSchema.hasIsDeleted) {
    throw new Error(`Table ${this.tableName} does not support soft delete`);
  }

  return this.update(id, { is_deleted: 1 }, conn);
}
```

### Pattern 5: Parameterized Queries

**ALWAYS** use parameterized queries to prevent SQL injection:

```javascript
// ✅ CORRECT - Parameterized query
async findByGaugeId(gaugeId) {
  const [rows] = await connection.execute(
    'SELECT * FROM gauges WHERE gauge_id = ?',
    [gaugeId]
  );
  return rows[0];
}

// ❌ WRONG - String concatenation (SQL injection risk)
async findByGaugeId(gaugeId) {
  const [rows] = await connection.execute(
    `SELECT * FROM gauges WHERE gauge_id = '${gaugeId}'`
  );
  return rows[0];
}
```

## Security Patterns

### 1. Table Whitelist

```javascript
static ALLOWED_TABLES = new Set([
  'core_users',
  'gauges',
  'gauge_calibrations',
  // ... more tables
]);

constructor(tableName, primaryKey) {
  if (!BaseRepository.ALLOWED_TABLES.has(tableName)) {
    throw new Error(`Table '${tableName}' is not in the allowed list`);
  }
  this.tableName = tableName;
}
```

### 2. Identifier Validation

```javascript
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
```

### 3. Integer Parameter Validation

```javascript
validateIntegerParameter(value, paramName, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined) {
    throw new Error(`Invalid ${paramName} value: must be a valid integer`);
  }

  const stringValue = String(value).trim();

  if (stringValue === '' || !/^\d+$/.test(stringValue)) {
    throw new Error(`Invalid ${paramName} value: must be between ${min} and ${max}`);
  }

  const parsed = parseInt(stringValue, 10);

  if (isNaN(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid ${paramName}: must be between ${min} and ${max}`);
  }

  return parsed;
}
```

### 4. Dangerous Query Detection

```javascript
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

  // Execute query...
}
```

## Transaction Patterns

### Pattern 1: Service-Managed Transaction

```javascript
// Service layer
async createGaugeSet(goData, noGoData, userId) {
  return this.executeInTransaction(async (connection) => {
    const goGauge = await this.repository.createGauge(goData, connection);
    const noGoGauge = await this.repository.createGauge(noGoData, connection);
    await this.auditService.logAction({ ... }, connection);
    return { goGauge, noGoGauge };
  });
}

// Repository layer
async createGauge(data, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;
  const shouldCommit = !conn;

  try {
    if (shouldCommit) await connection.beginTransaction();
    // ... insert logic
    if (shouldCommit) await connection.commit();
    return gauge;
  } catch (error) {
    if (shouldCommit) await connection.rollback();
    throw error;
  } finally {
    if (shouldRelease) connection.release();
  }
}
```

### Pattern 2: Repository withTransaction Helper

```javascript
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
```

## Best Practices

### 1. Use BaseRepository Methods

```javascript
// ✅ CORRECT - Use BaseRepository methods
async findById(id, conn) {
  return this.withConnection(async (connection) => {
    const [rows] = await connection.execute(query, [id]);
    return rows[0];
  }, conn);
}

// ❌ WRONG - Manual connection management
async findById(id) {
  const connection = await this.pool.getConnection();
  try {
    const [rows] = await connection.execute(query, [id]);
    return rows[0];
  } finally {
    connection.release();
  }
}
```

### 2. Support External Connections

Always accept an optional connection parameter:

```javascript
async createGauge(data, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;
  // ... implementation
}
```

### 3. Validate Before Executing

```javascript
async create(data, conn) {
  await this.ensureSchema(conn);

  const validData = {};
  for (const [key, value] of Object.entries(data)) {
    if (this.tableSchema.columns[key]) {
      validData[key] = value;
    }
  }

  // Build query...
}
```

### 4. Log Errors with Context

```javascript
catch (error) {
  logger.error(`${this.constructor.name}.create failed:`, {
    error: error.message,
    table: this.tableName,
    columns: Object.keys(data),
    sqlState: error.sqlState
  });
  throw error;
}
```

### 5. Use DTO Mappers

```javascript
async findByGaugeId(gaugeId, connection = null) {
  const gauge = await this._fetchGaugeByField('gauge_id', gaugeId, connection);
  return GaugeDTOMapper.transformToDTO(gauge);
}
```
