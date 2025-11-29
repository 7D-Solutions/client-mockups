const fs = require('fs');
const path = require('path');

// Try to find mysql2 in different locations
let mysql;
try {
  // Try backend path
  mysql = require('../../backend/node_modules/mysql2/promise');
} catch (e1) {
  try {
    // Try global
    mysql = require('mysql2/promise');
  } catch (e2) {
    console.error('ERROR: mysql2 package not found.');
    console.error('Please run: npm install mysql2 in the backend directory');
    process.exit(1);
  }
}

// ============================================================
// CONFIGURATION - UPDATE THESE VALUES FOR YOUR PROJECT
// ============================================================
const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3307,                        // UPDATE: Your MySQL port
  user: 'root',                      // UPDATE: Your MySQL user
  password: 'your_password_here',    // UPDATE: Your MySQL password
  database: 'your_database_here'     // UPDATE: Your database name
};

const MODULE_PREFIX = 'your_module_';  // UPDATE: Your table prefix (e.g., 'rental_', 'invoice_')
const MODULE_NAME = 'Your Module';     // UPDATE: Your module name (e.g., 'Rental Manager', 'Invoice System')
const VERSION = '1.0.0';               // UPDATE: Your version number

// ============================================================
// Helper functions
// ============================================================
function parseColumnType(columnType) {
  const match = columnType.match(/^(\w+)(?:\(([^)]+)\))?(.*)$/);
  if (match) {
    return {
      baseType: match[1],
      size: match[2],
      extra: match[3] ? match[3].trim() : ''
    };
  }
  return { baseType: columnType, size: null, extra: '' };
}

function formatDefault(defaultValue) {
  if (defaultValue === null) return null;
  if (defaultValue === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP';
  if (defaultValue.startsWith("'") && defaultValue.endsWith("'")) {
    return defaultValue.slice(1, -1);
  }
  return defaultValue;
}

function escapeYAML(str) {
  if (typeof str !== 'string') return str;
  if (str.match(/[:#@!%^&*(){}\\[\\]|\\\\'\"]/)) {
    return '"' + str.replace(/"/g, '\\"') + '"';
  }
  return str;
}

function formatDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatLocalTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');

  const offset = -now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetSign = offset >= 0 ? '+' : '-';
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${offsetString}`;
}

async function generateYAML() {
  let connection;

  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('Connected successfully');

    // Start building YAML content
    let yaml = `# Database Structure - ${MODULE_NAME}\n`;
    yaml += `# Version: ${VERSION}\n`;
    yaml += '# Generated from live database\n';
    yaml += '# Generated at: ' + formatLocalTimestamp() + '\n';
    yaml += `# Filter: ${MODULE_PREFIX}* tables only\n\n`;

    yaml += 'metadata:\n';
    yaml += `  version: ${VERSION}\n`;
    yaml += '  generator: generate-database-yaml.js\n';
    yaml += '  timestamp: ' + formatLocalTimestamp() + '\n';
    yaml += `  module: ${MODULE_NAME}\n`;
    yaml += `  filter: ${MODULE_PREFIX}* tables\n`;
    yaml += '\n';

    yaml += `database: ${DB_CONFIG.database}\n`;

    // Get database charset and collation
    const [dbInfo] = await connection.execute(
      `SELECT default_character_set_name, default_collation_name
       FROM information_schema.schemata
       WHERE schema_name = ?`,
      [DB_CONFIG.database]
    );

    if (dbInfo.length > 0) {
      yaml += `character_set: ${dbInfo[0].DEFAULT_CHARACTER_SET_NAME}\n`;
      yaml += `collation: ${dbInfo[0].DEFAULT_COLLATION_NAME}\n`;
    }

    // Get only tables matching prefix
    const [tables] = await connection.execute(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = ?
         AND table_type = 'BASE TABLE'
         AND table_name LIKE ?
       ORDER BY table_name`,
      [DB_CONFIG.database, `${MODULE_PREFIX}%`]
    );

    yaml += `table_count: ${tables.length}\n\n`;

    // Add table list
    yaml += `# ${MODULE_NAME} Tables (${tables.length} tables):\n`;
    tables.forEach((table, index) => {
      yaml += `# ${index + 1}. ${table.TABLE_NAME}\n`;
    });
    yaml += '\n';

    yaml += 'tables:\n';

    // Process each table
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      yaml += `  - name: ${tableName}\n`;

      // Get columns
      const [columns] = await connection.execute(
        `SELECT column_name, data_type, column_type, is_nullable,
                column_default, extra, column_key,
                character_maximum_length, numeric_precision, numeric_scale
         FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ?
         ORDER BY ordinal_position`,
        [DB_CONFIG.database, tableName]
      );

      yaml += '    columns:\n';
      for (const col of columns) {
        yaml += `      - name: ${col.COLUMN_NAME}\n`;

        const typeInfo = parseColumnType(col.COLUMN_TYPE);
        yaml += `        type: ${typeInfo.baseType}`;
        if (typeInfo.size) {
          yaml += `(${typeInfo.size})`;
        }
        yaml += '\n';

        yaml += `        nullable: ${col.IS_NULLABLE === 'YES' ? 'true' : 'false'}\n`;

        if (col.COLUMN_KEY === 'PRI') yaml += '        primary_key: true\n';
        if (col.COLUMN_KEY === 'UNI') yaml += '        unique: true\n';

        const defaultVal = formatDefault(col.COLUMN_DEFAULT);
        if (defaultVal !== null) {
          yaml += `        default: ${escapeYAML(defaultVal)}\n`;
        }

        if (col.EXTRA.includes('auto_increment')) yaml += '        auto_increment: true\n';
        if (col.EXTRA.includes('on update')) yaml += '        on_update: CURRENT_TIMESTAMP\n';
      }

      // Get indexes
      const [indexes] = await connection.execute(
        `SELECT index_name, non_unique, index_type,
                GROUP_CONCAT(column_name ORDER BY seq_in_index) as columns
         FROM information_schema.statistics
         WHERE table_schema = ? AND table_name = ?
         GROUP BY index_name, non_unique, index_type
         ORDER BY index_name`,
        [DB_CONFIG.database, tableName]
      );

      if (indexes.length > 0) {
        yaml += '    indexes:\n';
        for (const idx of indexes) {
          yaml += `      - name: ${idx.INDEX_NAME}\n`;
          yaml += `        columns: [${idx.columns.split(',').join(', ')}]\n`;
          yaml += `        unique: ${idx.NON_UNIQUE === 0 ? 'true' : 'false'}\n`;
          if (idx.INDEX_TYPE === 'FULLTEXT') {
            yaml += '        type: FULLTEXT\n';
          }
        }
      }

      // Get foreign keys
      const [fks] = await connection.execute(
        `SELECT rc.constraint_name, kcu.column_name,
                kcu.referenced_table_name, kcu.referenced_column_name,
                rc.update_rule, rc.delete_rule
         FROM information_schema.key_column_usage kcu
         JOIN information_schema.referential_constraints rc
           ON kcu.constraint_name = rc.constraint_name
           AND kcu.table_schema = rc.constraint_schema
         WHERE kcu.table_schema = ? AND kcu.table_name = ?
           AND kcu.referenced_table_name IS NOT NULL`,
        [DB_CONFIG.database, tableName]
      );

      if (fks.length > 0) {
        yaml += '    foreign_keys:\n';
        for (const fk of fks) {
          yaml += `      - name: ${fk.CONSTRAINT_NAME}\n`;
          yaml += `        column: ${fk.COLUMN_NAME}\n`;
          yaml += `        references: ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}\n`;
          if (fk.DELETE_RULE !== 'RESTRICT') {
            yaml += `        on_delete: ${fk.DELETE_RULE}\n`;
          }
          if (fk.UPDATE_RULE !== 'RESTRICT') {
            yaml += `        on_update: ${fk.UPDATE_RULE}\n`;
          }
        }
      }

      yaml += '\n';
    }

    // Add relationships section
    yaml += 'relationships:\n';
    for (const table of tables) {
      const [fks] = await connection.execute(
        `SELECT kcu.column_name, kcu.referenced_table_name, kcu.referenced_column_name
         FROM information_schema.key_column_usage kcu
         WHERE kcu.table_schema = ? AND kcu.table_name = ?
           AND kcu.referenced_table_name IS NOT NULL`,
        [DB_CONFIG.database, table.TABLE_NAME]
      );

      for (const fk of fks) {
        yaml += `  - from: ${table.TABLE_NAME}.${fk.COLUMN_NAME}\n`;
        yaml += `    to: ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}\n`;
      }
    }

    // Write to file
    const outputFile = `${MODULE_PREFIX.replace(/_$/, '')}_database_structure_${formatDate()}.yaml`;
    const outputPath = path.join(__dirname, outputFile);
    fs.writeFileSync(outputPath, yaml);

    console.log(`\nYAML file generated successfully: ${outputFile}`);
    console.log(`Full path: ${outputPath}`);
    console.log(`Total ${MODULE_NAME.toLowerCase()} tables: ${tables.length}`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the generator
generateYAML();
