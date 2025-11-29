# Repository Implementation Template

Ready-to-use template for creating data access layer classes that extend `BaseRepository`.

## Overview

Repositories handle **database operations**, **query execution**, and **data transformation**. They isolate SQL from business logic and provide a clean data access interface.

## Template

```javascript
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');
const [Module]DTOMapper = require('../mappers/[Module]DTOMapper');

/**
 * TODO: Replace [Module] with actual module name (e.g., Gauge, Inventory, User)
 * [Module]Repository - Data access layer for [module items]
 *
 * Responsibilities:
 * - Database query execution
 * - DTO transformation
 * - Connection management
 * - Transaction support
 *
 * @example
 * const repo = new [Module]Repository();
 * const item = await repo.get[ModuleName]ById(id);
 */
class [Module]Repository extends BaseRepository {
  /**
   * Constructor
   * TODO: Replace 'table_name' with actual table name
   */
  constructor() {
    super('[table_name]', 'id'); // Table name and primary key column
  }

  /**
   * UNIVERSAL REPOSITORY IMPLEMENTATION - Primary Key
   * Required by BaseRepository pattern
   */
  async findByPrimaryKey(id, connection = null) {
    try {
      return await this.get[ModuleName]ById(id, connection);
    } catch (error) {
      logger.error('[Module]Repository.findByPrimaryKey failed:', {
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * UNIVERSAL REPOSITORY IMPLEMENTATION - Business Identifier
   * TODO: Implement if your module has a business identifier (e.g., gauge_id, sku, email)
   * Remove this if not applicable
   */
  async findByBusinessIdentifier(identifier, connection = null) {
    try {
      return await this._fetchByField('[business_id_column]', identifier, connection);
    } catch (error) {
      logger.error('[Module]Repository.findByBusinessIdentifier failed:', {
        identifier,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Private helper: Fetch record by field name
   * TODO: Customize query to include related data (JOINs)
   * @private
   */
  async _fetchByField(fieldName, fieldValue, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      // TODO: Customize SELECT query - add JOINs if needed
      const items = await this.executeQuery(
        `SELECT * FROM [table_name]
         WHERE ${fieldName} = ? AND is_deleted = 0`,
        [fieldValue],
        conn
      );

      if (items.length === 0) return null;

      // Transform to DTO
      return [Module]DTOMapper.transformToDTO(items[0]);
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Get [module item] by ID
   * TODO: Add related data fetching if needed (e.g., specifications, relations)
   * @param {number} id - Item ID
   * @param {Object} connection - Optional database connection
   * @returns {Promise<Object|null>} Item or null
   */
  async get[ModuleName]ById(id, conn) {
    try {
      return await this._fetchByField('id', id, conn);
    } catch (error) {
      logger.error('Failed to get [module item] by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new [module item]
   * TODO: Customize fields for your table structure
   * @param {Object} data - Item data
   * @param {Object} conn - Database connection
   * @returns {Promise<Object>} Created item
   */
  async create[ModuleName](data, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      // Transform from DTO to database format
      const dbData = [Module]DTOMapper.transformFromDTO(data);

      // TODO: Customize INSERT statement with actual fields
      const res = await this.executeQuery(
        `INSERT INTO [table_name] (
          field1, field2, field3,
          created_by, created_at, is_deleted
        ) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), 0)`,
        [
          dbData.field1,
          dbData.field2,
          dbData.field3,
          dbData.created_by || 1
        ],
        connection
      );

      const itemId = res.insertId;

      // TODO: If you have related tables (specifications, etc), insert them here
      // Example:
      // if (dbData.specifications) {
      //   await this.executeQuery(
      //     `INSERT INTO [spec_table] (item_id, spec_field) VALUES (?, ?)`,
      //     [itemId, dbData.specifications.spec_field],
      //     connection
      //   );
      // }

      if (shouldCommit) await connection.commit();

      // Return created item with DTO transformation
      const createdItem = { id: itemId, ...dbData };
      return [Module]DTOMapper.transformToDTO(createdItem);
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to create [module item]:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Update [module item]
   * TODO: Add validation for updatable fields
   * @param {number} id - Item ID
   * @param {Object} updates - Update data
   * @param {Object} conn - Database connection
   * @returns {Promise<Object>} Updated item
   */
  async update[ModuleName](id, updates, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      // Transform from DTO to database format
      const dbUpdates = [Module]DTOMapper.transformFromDTO(updates);

      // Use BaseRepository update method
      const result = await this.update(id, dbUpdates, connection);

      // TODO: If you have related tables, update them here
      // Example:
      // if (dbUpdates.specifications) {
      //   await this.executeQuery(
      //     `UPDATE [spec_table] SET spec_field = ? WHERE item_id = ?`,
      //     [dbUpdates.specifications.spec_field, id],
      //     connection
      //   );
      // }

      if (shouldCommit) await connection.commit();

      return [Module]DTOMapper.transformToDTO(result);
    } catch (error) {
      if (shouldCommit) await connection.rollback();
      logger.error('Failed to update [module item]:', error);
      throw error;
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Find [module items] with filters
   * TODO: Customize filter conditions for your domain
   * @param {Object} filters - Search filters
   * @param {Object} connection - Optional database connection
   * @returns {Promise<Array>} Array of items
   */
  async findByFilters(filters = {}, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      let query = `SELECT * FROM [table_name] WHERE is_deleted = 0`;
      const params = [];

      // TODO: Add filter conditions
      if (filters.category) {
        query += ` AND category = ?`;
        params.push(filters.category);
      }

      if (filters.status) {
        query += ` AND status = ?`;
        params.push(filters.status);
      }

      if (filters.search) {
        query += ` AND (name LIKE ? OR description LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      // TODO: Add sorting
      query += ` ORDER BY created_at DESC`;

      // TODO: Add pagination
      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);

        if (filters.offset) {
          query += ` OFFSET ?`;
          params.push(filters.offset);
        }
      }

      const items = await this.executeQuery(query, params, conn);

      return items.map(item => [Module]DTOMapper.transformToDTO(item));
    } catch (error) {
      logger.error('Failed to find [module items] by filters:', error);
      throw error;
    } finally {
      if (shouldRelease) conn.release();
    }
  }

  /**
   * Example: Custom query with JOIN
   * TODO: Replace with actual joined query
   * @param {number} id - Item ID
   * @param {Object} connection - Optional database connection
   * @returns {Promise<Object>} Item with related data
   */
  async get[ModuleName]WithRelations(id, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;

    try {
      // TODO: Customize JOIN query
      const items = await this.executeQuery(
        `SELECT
          t1.*,
          t2.related_field
         FROM [table_name] t1
         LEFT JOIN [related_table] t2 ON t1.id = t2.item_id
         WHERE t1.id = ? AND t1.is_deleted = 0`,
        [id],
        connection
      );

      if (items.length === 0) return null;

      const item = items[0];

      // TODO: Process related data
      // item.relatedData = items.map(row => row.related_field);

      return [Module]DTOMapper.transformToDTO(item);
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  /**
   * Example: Count items with filters
   * TODO: Use same filter logic as findByFilters
   * @param {Object} filters - Search filters
   * @param {Object} connection - Optional database connection
   * @returns {Promise<number>} Count of items
   */
  async countByFilters(filters = {}, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      let query = `SELECT COUNT(*) as count FROM [table_name] WHERE is_deleted = 0`;
      const params = [];

      // TODO: Add same filters as findByFilters
      if (filters.category) {
        query += ` AND category = ?`;
        params.push(filters.category);
      }

      const result = await this.executeQuery(query, params, conn);

      return result[0].count;
    } finally {
      if (shouldRelease) connection.release();
    }
  }
}

module.exports = [Module]Repository;
```

## Working Example

Based on `GaugeRepository.js`:

```javascript
const BaseRepository = require('../../../infrastructure/repositories/BaseRepository');
const logger = require('../../../infrastructure/utils/logger');
const GaugeDTOMapper = require('../mappers/GaugeDTOMapper');

const SPEC_TABLES = {
  thread_gauge: 'gauge_thread_specifications',
  hand_tool: 'gauge_hand_tool_specifications',
  large_equipment: 'gauge_large_equipment_specifications',
  calibration_standard: 'gauge_calibration_standard_specifications',
};

class GaugeRepository extends BaseRepository {
  constructor() {
    super('gauges', 'id');
  }

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

  async _fetchGaugeByField(fieldName, fieldValue, connection = null) {
    const conn = connection || await this.getConnectionWithTimeout();
    const shouldRelease = !connection;

    try {
      const gauges = await this.executeQuery(
        `SELECT * FROM gauges WHERE ${fieldName} = ? AND is_deleted = 0`,
        [fieldValue],
        conn
      );

      if (gauges.length === 0) return null;

      const gauge = gauges[0];

      // Fetch specifications if applicable
      if (gauge.equipment_type && SPEC_TABLES[gauge.equipment_type]) {
        const specTable = SPEC_TABLES[gauge.equipment_type];
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

  async getGaugeById(id, conn) {
    return await this._fetchGaugeByField('id', id, conn);
  }

  async createGauge(gaugeData, conn) {
    const connection = conn || await this.getConnectionWithTimeout();
    const shouldRelease = !conn;
    const shouldCommit = !conn;

    try {
      if (shouldCommit) await connection.beginTransaction();

      const dbData = GaugeDTOMapper.transformFromDTO(gaugeData);

      const res = await this.executeQuery(
        `INSERT INTO gauges (gauge_id, name, equipment_type, category_id, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [dbData.gauge_id, dbData.name, dbData.equipment_type, dbData.category_id, dbData.status, dbData.created_by],
        connection
      );

      const gaugeId = res.insertId;

      // Create specifications
      if (dbData.specifications) {
        const specTable = SPEC_TABLES[dbData.equipment_type];
        const specs = dbData.specifications;
        const fields = Object.keys(specs);
        const placeholders = fields.map(() => '?').join(', ');
        const values = [gaugeId, ...fields.map(f => specs[f])];

        await this.executeQuery(
          `INSERT INTO \`${specTable}\` (gauge_id, ${fields.join(', ')}) VALUES (?, ${placeholders})`,
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

## Common Patterns

### Pattern 1: Fetch with Specifications/Relations
```javascript
async getItemWithSpecs(id, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;

  try {
    const items = await this.executeQuery(
      `SELECT * FROM items WHERE id = ?`,
      [id],
      connection
    );

    if (items.length === 0) return null;

    const item = items[0];

    // Fetch related specifications
    const specs = await this.executeQuery(
      `SELECT * FROM item_specs WHERE item_id = ?`,
      [id],
      connection
    );

    item.specifications = specs[0] || null;

    return DTOMapper.transformToDTO(item);
  } finally {
    if (shouldRelease) connection.release();
  }
}
```

### Pattern 2: Batch Insert with Transaction
```javascript
async createBatch(items, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;
  const shouldCommit = !conn;

  try {
    if (shouldCommit) await connection.beginTransaction();

    const created = [];

    for (const item of items) {
      const dbData = DTOMapper.transformFromDTO(item);
      const res = await this.executeQuery(
        `INSERT INTO items (name, category) VALUES (?, ?)`,
        [dbData.name, dbData.category],
        connection
      );

      created.push({ id: res.insertId, ...dbData });
    }

    if (shouldCommit) await connection.commit();

    return created.map(item => DTOMapper.transformToDTO(item));
  } catch (error) {
    if (shouldCommit) await connection.rollback();
    throw error;
  } finally {
    if (shouldRelease) connection.release();
  }
}
```

### Pattern 3: Complex Query with Dynamic Filters
```javascript
async findWithFilters(filters, conn) {
  const connection = conn || await this.getConnectionWithTimeout();
  const shouldRelease = !conn;

  try {
    let query = `SELECT * FROM items WHERE is_deleted = 0`;
    const params = [];

    if (filters.category) {
      query += ` AND category IN (?)`;
      params.push(filters.category);
    }

    if (filters.dateRange) {
      query += ` AND created_at BETWEEN ? AND ?`;
      params.push(filters.dateRange.start, filters.dateRange.end);
    }

    if (filters.search) {
      query += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ` ORDER BY ${filters.sortBy || 'created_at'} ${filters.sortDir || 'DESC'}`;

    const items = await this.executeQuery(query, params, connection);

    return items.map(item => DTOMapper.transformToDTO(item));
  } finally {
    if (shouldRelease) connection.release();
  }
}
```

## TODO Checklist

- [ ] Replace `[Module]` with actual module name
- [ ] Replace `[table_name]` with database table name
- [ ] Replace `[ModuleName]` with method names
- [ ] Implement custom query methods
- [ ] Add DTO transformation for all methods
- [ ] Handle related data (JOINs, specifications)
- [ ] Add proper connection management
- [ ] Add transaction support for multi-table operations
- [ ] Add JSDoc documentation
- [ ] Keep file under 300 lines
- [ ] Write integration tests

## Common Pitfalls

- ❌ **Don't** forget connection.release() in finally blocks
- ❌ **Don't** skip transaction rollback on errors
- ❌ **Don't** expose raw database fields - use DTO transformation
- ❌ **Don't** build dynamic SQL without parameterization (SQL injection risk)
- ❌ **Don't** forget to check shouldRelease and shouldCommit flags

## Best Practices

- ✅ **Do** always use parameterized queries
- ✅ **Do** transform all data through DTOMapper
- ✅ **Do** use transactions for multi-table operations
- ✅ **Do** release connections in finally blocks
- ✅ **Do** log errors with context
- ✅ **Do** validate field names before building dynamic SQL
