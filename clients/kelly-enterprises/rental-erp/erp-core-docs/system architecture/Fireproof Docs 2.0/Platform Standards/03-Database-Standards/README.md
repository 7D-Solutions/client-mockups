# Database Standards

Comprehensive database design and management standards for the Fire-Proof ERP Platform.

## Table of Contents

- [Schema Design Principles](#schema-design-principles)
- [Naming Conventions](#naming-conventions)
- [Audit Trail Pattern](#audit-trail-pattern)
- [Migration Management](#migration-management)
- [Connection Configuration](#connection-configuration)
- [Index Strategies](#index-strategies)
- [Data Types and Constraints](#data-types-and-constraints)

---

## Schema Design Principles

### Database Engine
- **Engine**: InnoDB (default for all tables)
- **Character Set**: utf8mb4
- **Collation**: utf8mb4_unicode_ci
- **Reason**: Full Unicode support including emojis, consistent sorting

```sql
CREATE TABLE table_name (
    ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Primary Keys
- **Type**: Auto-incrementing integers
- **Column Name**: `id` (for most tables) or `{entity}_id` for domain-specific tables
- **Data Type**: `INT` or `BIGINT` for high-volume tables

```sql
-- Standard primary key
id INT AUTO_INCREMENT PRIMARY KEY

-- High-volume table (audit logs, events)
id BIGINT AUTO_INCREMENT PRIMARY KEY
```

### Foreign Keys
- **Pattern**: Use `{referenced_table}_id` format
- **Constraints**: Define explicit foreign key constraints where appropriate
- **Example**: `user_id`, `category_id`, `gauge_id`

```sql
-- Example from gauge tables
ALTER TABLE gauges
ADD CONSTRAINT fk_gauges_category
FOREIGN KEY (category_id) REFERENCES gauge_categories(id)
ON DELETE RESTRICT ON UPDATE CASCADE;
```

---

## Naming Conventions

### Table Names
- **Format**: `snake_case`, plural nouns
- **Examples**: `gauges`, `gauge_categories`, `audit_logs`, `core_users`
- **Module Prefix**: Use module prefix for core tables (`core_users`, `core_roles`)

### Column Names
- **Format**: `snake_case`, descriptive
- **Boolean Fields**: Prefix with `is_` or `has_`
- **Date Fields**: Use `_at` suffix for timestamps, `_date` for dates
- **ID Fields**: Use `{entity}_id` format for foreign keys

```sql
-- Good column naming examples
is_active BOOLEAN DEFAULT 1
is_deleted BOOLEAN DEFAULT 0
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
user_id INT NOT NULL
category_id INT NOT NULL
```

### Index Names
- **Format**: `idx_{table}_{column(s)}`
- **Composite Index**: `idx_{table}_{col1}_{col2}`
- **Unique Index**: `idx_{table}_{column}_unique`

```sql
-- Single column index
CREATE INDEX idx_gauges_category_id ON gauges(category_id);

-- Composite index
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);

-- Unique index
CREATE UNIQUE INDEX idx_users_email_unique ON core_users(email);
```

---

## Audit Trail Pattern

All tables that track changes should implement the audit trail pattern with standardized timestamp and user tracking fields.

### Required Audit Fields

```sql
-- Standard audit fields (add to all tables)
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
created_by INT NULL,
updated_by INT NULL,

-- Soft delete support
is_deleted BOOLEAN DEFAULT 0,
deleted_at TIMESTAMP NULL,
deleted_by INT NULL,

-- Foreign key constraints
INDEX idx_created_by (created_by),
INDEX idx_updated_by (updated_by),
FOREIGN KEY (created_by) REFERENCES core_users(id),
FOREIGN KEY (updated_by) REFERENCES core_users(id)
```

### Example: Gauges Table with Audit Trail

```sql
CREATE TABLE gauges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gauge_id VARCHAR(50) NOT NULL UNIQUE,
    category_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    equipment_type ENUM('thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard') NOT NULL,

    -- Audit trail fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_by INT NULL,

    -- Soft delete
    is_deleted BOOLEAN DEFAULT 0,
    deleted_at TIMESTAMP NULL,
    deleted_by INT NULL,

    -- Indexes
    INDEX idx_category_id (category_id),
    INDEX idx_equipment_type (equipment_type),
    INDEX idx_created_by (created_by),
    INDEX idx_updated_by (updated_by),

    -- Foreign keys
    FOREIGN KEY (category_id) REFERENCES gauge_categories(id),
    FOREIGN KEY (created_by) REFERENCES core_users(id),
    FOREIGN KEY (updated_by) REFERENCES core_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Audit Logging Service Integration

The platform uses a centralized audit logging service that tracks all data modifications.

**Location**: `/backend/src/infrastructure/audit/auditService.js`

**Audit Log Table Structure**:

```sql
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NULL,
    record_id INT NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    event_type VARCHAR(50) DEFAULT 'system',
    severity_level VARCHAR(20) DEFAULT 'medium',
    hash_chain VARCHAR(64) NULL,        -- Tamper-proof chain
    digital_signature VARCHAR(128) NULL, -- Critical operation verification
    previous_hash VARCHAR(64) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_audit_user_id (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_table_record (table_name, record_id),
    INDEX idx_audit_timestamp (timestamp),
    INDEX idx_audit_event_type (event_type),
    INDEX idx_audit_severity (severity_level),
    INDEX idx_audit_hash_chain (hash_chain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Audit Log Usage**:

```javascript
// In service layer
const auditService = require('../../../infrastructure/audit/auditService');

// Log data modification
await auditService.logAction({
    userId: req.user.id,
    action: 'create',
    tableName: 'gauges',
    recordId: newGauge.id,
    details: { gauge_id: newGauge.gauge_id, category_id: newGauge.category_id },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
});
```

---

## Migration Management

### Migration File Organization

**Location**: `/backend/src/infrastructure/database/migrations/`

**Naming Convention**: `{sequence}-{description}.sql`

```
migrations/
├── 001-migrate-audit-logs.sql
├── 002-add-audit-permissions.sql
├── 003-add-user-profile-fields.sql
├── 007-add-manufacturer-model-to-gauges.sql
├── 008-update-username-format.sql
└── 016-simple-gauge-id-refactor.sql
```

### Migration File Structure

Every migration file should include:
1. Header comment with purpose and date
2. Incremental changes only
3. Rollback strategy (if applicable)
4. Comments for complex operations

```sql
-- Migration: Add manufacturer and model_number columns to gauges table
-- Created: 2025-10-22
-- Purpose: Add manufacturer and model number fields to gauges table to support gauge metadata

-- Add manufacturer column
ALTER TABLE `gauges`
ADD COLUMN `manufacturer` VARCHAR(255) NULL AFTER `serial_number`;

-- Add model_number column
ALTER TABLE `gauges`
ADD COLUMN `model_number` VARCHAR(100) NULL AFTER `manufacturer`;

-- Add index for searching by manufacturer
CREATE INDEX `idx_manufacturer` ON `gauges` (`manufacturer`);

-- Add index for searching by model
CREATE INDEX `idx_model_number` ON `gauges` (`model_number`);
```

### Migration Best Practices

1. **Incremental Changes**: Each migration should be small and focused
2. **Idempotent**: Use `IF NOT EXISTS` and `IF EXISTS` checks
3. **Backward Compatible**: Avoid breaking changes when possible
4. **Data Preservation**: Always backup before destructive operations
5. **Validation**: Test migrations on development environment first

```sql
-- Good: Idempotent migration
ALTER TABLE gauges
ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255) NULL;

-- Good: Backup before destructive operation
CREATE TABLE core_audit_log_backup AS SELECT * FROM core_audit_log;

-- Good: Safe column modification
ALTER TABLE gauges
MODIFY COLUMN name VARCHAR(500) NULL;  -- Widening column is safe
```

### Rollback Strategies

Document rollback steps for complex migrations:

```sql
-- Migration: Remove standardized_name column
-- Created: 2025-10-30
-- Rollback: Recreate standardized_name column and rebuild data from name field

-- Forward migration
ALTER TABLE gauges DROP COLUMN IF EXISTS standardized_name;

-- Rollback (if needed)
-- ALTER TABLE gauges ADD COLUMN standardized_name VARCHAR(255) NULL;
-- UPDATE gauges SET standardized_name = UPPER(TRIM(name));
```

---

## Connection Configuration

### Environment-Based Configuration

The platform supports multiple database connection patterns for different environments:

**Location**: `/backend/src/infrastructure/database/connection.js`

### Development (Docker)

```bash
# .env for Docker development
DB_HOST=host.docker.internal
DB_PORT=3307
DB_USER=root
DB_PASS=your_password
DB_NAME=fai_db_sandbox
```

### Production (Railway)

Railway automatically injects database connection variables:

```bash
# Railway environment (auto-injected)
DB_HOST=mysql.railway.internal  # Internal network
DB_PORT=3306
DB_USER=root
DB_PASS=${MYSQL_PASSWORD}      # Auto-generated
DB_NAME=railway
```

### Connection Pool Configuration

```javascript
// Connection pool with optimal settings
const pool = mysql.createPool({
    host: resolvedHost,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    waitForConnections: true,
    connectionLimit: 10,           // Optimal for most workloads
    queueLimit: 0,                 // Unlimited queue
    connectTimeout: 15000,         // 15 seconds for Railway
    ssl: config.database.ssl === true ? { rejectUnauthorized: false } : false
});
```

### Connection Best Practices

1. **Always use connection pool**: Never create direct connections in routes/controllers
2. **Release connections**: Always release connections back to pool after use
3. **Error handling**: Implement proper error handling for connection failures
4. **Monitoring**: Use pool stats for performance monitoring

```javascript
// Good: Using connection pool
const { pool } = require('../../../infrastructure/database/connection');

async function queryDatabase() {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.execute('SELECT * FROM gauges');
        return rows;
    } finally {
        connection.release();  // Always release
    }
}

// Better: Let pool handle connections automatically
async function queryDatabase() {
    const [rows] = await pool.execute('SELECT * FROM gauges');
    return rows;
}
```

---

## Index Strategies

### Index Guidelines

1. **Primary Keys**: Automatically indexed
2. **Foreign Keys**: Always index foreign key columns
3. **Search Columns**: Index columns used in WHERE clauses
4. **Composite Indexes**: Order matters - most selective column first
5. **Unique Constraints**: Use unique indexes for business keys

### Common Index Patterns

```sql
-- Single column indexes for foreign keys
CREATE INDEX idx_gauges_category_id ON gauges(category_id);
CREATE INDEX idx_gauges_created_by ON gauges(created_by);

-- Composite index for common query patterns
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);

-- Unique index for business keys
CREATE UNIQUE INDEX idx_gauges_gauge_id ON gauges(gauge_id);

-- Index for timestamp queries
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);

-- Index for enum/status fields
CREATE INDEX idx_gauges_equipment_type ON gauges(equipment_type);
```

### Index Performance Considerations

- **Cardinality**: Index columns with high cardinality (many unique values)
- **Selectivity**: Index columns that filter out most rows
- **Size**: Avoid indexing large TEXT/BLOB columns
- **Maintenance**: Too many indexes slow down INSERT/UPDATE operations

```sql
-- Good: High cardinality, frequently searched
CREATE INDEX idx_gauges_gauge_id ON gauges(gauge_id);  -- Unique identifier

-- Bad: Low cardinality, rarely searched
-- CREATE INDEX idx_gauges_is_deleted ON gauges(is_deleted);  -- Only 0/1 values
```

---

## Data Types and Constraints

### Common Data Types

```sql
-- Integer types
INT               -- Standard integers (-2B to 2B)
BIGINT            -- Large integers (use for high-volume tables)
TINYINT           -- Small integers (0-255)

-- String types
VARCHAR(n)        -- Variable length strings (use for most text)
TEXT              -- Large text content
ENUM(...)         -- Fixed set of values

-- Decimal types
DECIMAL(10,2)     -- Fixed precision decimals (use for money, measurements)
FLOAT/DOUBLE      -- Floating point (use for scientific values)

-- Date/Time types
TIMESTAMP         -- Auto-updating timestamps (use for created_at/updated_at)
DATETIME          -- Fixed date/time (use for scheduled dates)
DATE              -- Date only (use for birthdays, due dates)

-- Boolean type
BOOLEAN           -- Maps to TINYINT(1), use with DEFAULT 0 or DEFAULT 1

-- JSON type
JSON              -- Structured data (use for flexible metadata)
```

### Constraint Examples

```sql
-- NOT NULL constraint
name VARCHAR(255) NOT NULL,

-- DEFAULT values
is_active BOOLEAN DEFAULT 1,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

-- CHECK constraints (MySQL 8.0+)
CHECK (calibration_frequency_days > 0),

-- UNIQUE constraints
UNIQUE (email),
UNIQUE (gauge_id),

-- ENUM constraints
equipment_type ENUM('thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard') NOT NULL,

-- Foreign key constraints
FOREIGN KEY (category_id) REFERENCES gauge_categories(id)
    ON DELETE RESTRICT    -- Prevent deletion if referenced
    ON UPDATE CASCADE,    -- Update references if parent changes
```

### NULL vs NOT NULL

**Use NOT NULL when**:
- Field is required for business logic
- Field has a sensible default value
- Field represents a core attribute

**Use NULL when**:
- Field is truly optional
- Field may not have a value yet
- Field represents optional metadata

```sql
-- Required fields
gauge_id VARCHAR(50) NOT NULL,
category_id INT NOT NULL,
name VARCHAR(255) NOT NULL,

-- Optional fields
manufacturer VARCHAR(255) NULL,
model_number VARCHAR(100) NULL,
notes TEXT NULL,
```

---

## Best Practices Summary

### DO's ✅

- Use InnoDB engine for all tables
- Use utf8mb4 character set for Unicode support
- Implement audit trail fields on all tables
- Use snake_case for all identifiers
- Index foreign keys and frequently queried columns
- Use connection pool for all database operations
- Document all migrations with purpose and rollback steps
- Use ENUM for fixed sets of values
- Use JSON for flexible metadata
- Implement soft deletes with `is_deleted` flag

### DON'Ts ❌

- Don't hardcode database credentials
- Don't use MyISAM engine
- Don't create indexes on low-cardinality columns
- Don't use SELECT * in production code
- Don't skip migration documentation
- Don't modify production database directly
- Don't use VARCHAR(255) for everything
- Don't skip foreign key constraints
- Don't ignore connection pool errors
- Don't store sensitive data unencrypted

---

## Related Documentation

- [Backend Standards](../02-Backend-Standards/README.md) - Backend service patterns
- [API Standards](../04-API-Standards/README.md) - API design and response formats
- [Architecture Patterns](../07-Architecture-Patterns/README.md) - System architecture
