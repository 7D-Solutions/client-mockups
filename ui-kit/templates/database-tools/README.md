# Database Tooling Template

Reusable database management scripts for modular applications.

## Overview

This template provides three essential database tools:

1. **YAML Schema Generator** - Human-readable schema documentation
2. **SQL Dump Generator** - Restorable database backups
3. **Documentation Template** - Complete usage guide

## Setup Instructions

### 1. Copy Files to Your Project

Copy all files from this template directory to your project's `database/dump/` folder:

```bash
cp /ui-kit/templates/database-tools/* /your-project/database/dump/
```

### 2. Update Configuration Variables

#### In `generate-database-yaml.js`:

```javascript
const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3307,                        // Your MySQL port
  user: 'root',                      // Your MySQL user
  password: 'your_password_here',    // Your MySQL password
  database: 'your_database_here'     // Your database name
};

const MODULE_PREFIX = 'your_module_';  // Your table prefix (e.g., 'rental_', 'invoice_')
const MODULE_NAME = 'Your Module';     // Your module name (e.g., 'Rental Manager')
const VERSION = '1.0.0';               // Your version number
```

#### In `generate-restorable-dump.bat`:

```batch
set "PORT=3307"
set "PASSWORD=your_password_here"
set "DATABASE=your_database_here"
set "TABLE_PREFIX=your_module_"
set "MODULE_NAME=Your Module"
```

### 3. Install Dependencies

Ensure `mysql2` is installed in your backend:

```bash
cd backend
npm install mysql2
```

### 4. Test the Tools

#### Generate YAML Schema:
```bash
cd database/dump
generate-db-yaml.bat
```

This creates: `[module]_database_structure_YYYY-MM-DD.yaml`

#### Generate SQL Dump:
```bash
cd database/dump
generate-restorable-dump.bat
```

This creates:
- `[module]_dump_YYYY-MM-DD_HH-MM-SS.sql` - The dump file
- `[module]_dump_report_YYYY-MM-DD_HH-MM-SS.log` - Summary report

## Tool Details

### YAML Schema Generator

**Purpose**: Creates human-readable YAML representation of database schema

**What it does**:
- Connects to database
- Scans all `[prefix]*` tables
- Exports structure including:
  - Columns with types, defaults, nullability
  - Indexes (primary, unique, foreign keys)
  - Relationships between tables
- Creates timestamped YAML file

**Use cases**:
- Quick schema reference
- Documentation
- Verify migrations applied correctly
- Compare schema versions

### Restorable Dump Generator

**Purpose**: Creates SQL dump that can be restored to another database

**What it does**:
- Finds all `[prefix]*` tables automatically
- Auto-detects mysqldump location
- Creates mysqldump with proper options
- Includes table structure + data
- Generates restoration report

**Restore a dump**:
```bash
mysql -h localhost -P 3307 -u root -p new_database < [module]_dump_2024-11-14_10-30-00.sql
```

## Requirements

### Node.js (for YAML generator)
- Node.js installed
- `mysql2` package: `npm install mysql2` in backend directory

### MySQL Client (for dump generator)
- mysqldump and mysql binaries
- Auto-detects from:
  - MySQL Workbench 8.0 CE
  - MySQL Server 8.0/8.4
  - XAMPP
  - WAMP64
  - System PATH

## Migration Workflow

### 1. Create/Modify Schema
Edit migration files in `migrations/` folder:
```sql
-- database/migrations/001_create_initial_tables.sql
CREATE TABLE IF NOT EXISTS [module]_entities (...);
```

### 2. Apply Migration
```bash
mysql -h localhost -P 3307 -u root -p [database] < migrations/001_create_initial_tables.sql
```

### 3. Verify Schema
Run YAML generator to confirm structure:
```bash
cd dump
generate-db-yaml.bat
# Review YAML output
```

### 4. Backup Data
Create dump before making changes:
```bash
cd dump
generate-restorable-dump.bat
```

## Troubleshooting

### YAML Generator

**Error**: "mysql2 package not found"
- Solution: `cd ../../backend && npm install mysql2`

**Error**: "Cannot connect to database"
- Check Docker: `docker ps` (MySQL should be running)
- Test connection: `mysql -h localhost -P 3307 -u root -p`

### Dump Generator

**Error**: "mysqldump not found"
- Install MySQL Workbench 8.0 CE
- OR add MySQL bin directory to system PATH

**Error**: "No [prefix]* tables found"
- Tables not created yet
- Run migration: `mysql -h localhost -P 3307 -u root -p [database] < ../migrations/001_create_initial_tables.sql`

## Best Practices

1. **Always backup before migrations**
   ```bash
   generate-restorable-dump.bat
   ```

2. **Verify after migrations**
   ```bash
   generate-db-yaml.bat
   # Review YAML file for correctness
   ```

3. **Use version control**
   - Commit migration files
   - Commit YAML snapshots for documentation
   - Don't commit SQL dumps (too large, contains data)

4. **Test migrations**
   - Test on dev database first
   - Verify with YAML generator
   - Then apply to production

## Example: Kelly Rental Manager

See complete reference implementation:
- **Location**: `/7D Solutions/clients/kelly-enterprises/rental-manager/database/`
- **Configuration**: 17 tables, `rental_*` prefix
- **Database**: `fai_db_sandbox` on port 3307

Review this for a working example of:
- Configured database tools
- Complex table relationships
- Complete documentation

---

**Template Version**: 1.0
**Created**: 2024-11-14
**Maintained By**: 7D Solutions
