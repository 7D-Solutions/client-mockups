# Database Migrations

This directory contains database schema migrations for the Fire-Proof ERP system.

## Overview

Migrations are SQL files that modify the database schema in a controlled, versioned manner. Each migration is tracked in the `database_migrations` table to ensure it only runs once.

## Migration Files

Migration files follow the naming convention: `<number>-<description>.sql`

Example: `001-add-user-table.sql`, `002-add-gauge-indexes.sql`

## Migration Runner

The migration runner (`scripts/migrate.js`) provides the following commands:

### Run All Pending Migrations

```bash
node scripts/migrate.js
```

This will:
1. Check the `database_migrations` table for executed migrations
2. Find all `.sql` files in `/migrations` directory
3. Execute pending migrations in alphabetical order
4. Record each successful migration in the tracking table

### Check Migration Status

```bash
node scripts/migrate.js --status
```

Shows:
- Total number of migration files
- List of executed migrations
- List of pending migrations

### Create New Migration

```bash
node scripts/migrate.js --create "add user permissions table"
```

Creates a new migration file with template SQL and proper naming.

## Writing Migrations

### Guidelines

1. **One Change Per Migration**: Each migration should represent a single logical change
2. **Idempotent**: Migrations should be safe to run multiple times (use `IF NOT EXISTS`, `IF EXISTS`)
3. **Test First**: Test migrations on a development database before applying to production
4. **Order Matters**: Migrations run alphabetically, so number them sequentially
5. **No Data Loss**: Always back up data before migrations that modify tables

### Migration Template

```sql
-- Migration: [Description]
-- Created: [Date]
-- Description: [Detailed explanation]

-- Check if changes are needed
SELECT 1; -- Add your validation queries here

-- Apply changes
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- Add indexes if needed
CREATE INDEX idx_users_email ON users(email);

-- Update existing data if needed
UPDATE users SET email = CONCAT(username, '@example.com') WHERE email IS NULL;
```

### Best Practices

**DO:**
- Use transactions where possible (migrations run in transactions by default)
- Add indexes for foreign keys and frequently queried columns
- Include comments explaining complex changes
- Test rollback procedures

**DON'T:**
- Modify existing migrations after they've been executed in production
- Include environment-specific data
- Use database-specific syntax unless necessary
- Forget to update corresponding model/repository code

## Migration Tracking

The `database_migrations` table tracks executed migrations:

```sql
CREATE TABLE database_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rollback_sql TEXT,
  INDEX idx_migration_name (migration_name),
  INDEX idx_executed_at (executed_at)
);
```

## Common Migration Patterns

### Adding a Column

```sql
ALTER TABLE table_name
ADD COLUMN column_name VARCHAR(255) DEFAULT 'default_value' AFTER existing_column;
```

### Creating an Index

```sql
CREATE INDEX idx_table_column ON table_name(column_name);
```

### Adding Foreign Key

```sql
ALTER TABLE child_table
ADD CONSTRAINT fk_child_parent
FOREIGN KEY (parent_id) REFERENCES parent_table(id)
ON DELETE CASCADE
ON UPDATE CASCADE;
```

### Modifying Column Type

```sql
-- Create new column
ALTER TABLE table_name ADD COLUMN new_column_name INT;

-- Copy data with conversion
UPDATE table_name SET new_column_name = CAST(old_column_name AS SIGNED);

-- Drop old column
ALTER TABLE table_name DROP COLUMN old_column_name;

-- Rename new column
ALTER TABLE table_name CHANGE COLUMN new_column_name old_column_name INT;
```

### Creating a Table

```sql
CREATE TABLE IF NOT EXISTS new_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Rollback

Currently, rollback is manual. To revert a migration:

1. Write SQL to undo the changes
2. Execute the rollback SQL manually
3. Remove the migration record from `database_migrations`:

```sql
DELETE FROM database_migrations WHERE migration_name = 'XXX-migration-name.sql';
```

## Docker Integration

When running in Docker, ensure:
- Environment variables are configured in `.env`
- Database host is `host.docker.internal` (for external MySQL)
- Migrations run after database is available

## Continuous Integration

In CI/CD pipelines:

```bash
# Check migration status (should show no pending)
node scripts/migrate.js --status

# Run migrations (if pending)
node scripts/migrate.js
```

## Troubleshooting

### Migration Fails Mid-Execution

Migrations run in transactions. If a migration fails:
1. The transaction is rolled back
2. No changes are applied
3. The migration is NOT recorded as executed

Fix the migration SQL and run again.

### Manual Migration Needed

If you need to apply a migration manually:

```bash
# Apply SQL manually via MySQL client
mysql -u $DB_USER -p$DB_PASS -h $DB_HOST -P $DB_PORT $DB_NAME < migrations/XXX-migration.sql

# Record migration as executed
mysql -u $DB_USER -p$DB_PASS -h $DB_HOST -P $DB_PORT $DB_NAME -e \
  "INSERT INTO database_migrations (migration_name) VALUES ('XXX-migration.sql');"
```

### Check Migrations in Production

```bash
# SSH to production server
ssh production-server

# Check status
cd /path/to/backend
node scripts/migrate.js --status
```

## Contact

For questions about migrations, contact the development team.
