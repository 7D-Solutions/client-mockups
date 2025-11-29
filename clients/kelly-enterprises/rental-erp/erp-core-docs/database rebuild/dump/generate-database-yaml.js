const fs = require('fs');
const path = require('path');
// Try different paths to find mysql2
let mysql;
try {
  // First try the backend path
  mysql = require('../../../backend/node_modules/mysql2/promise');
} catch (e1) {
  try {
    // Then try the Fireproof Gauge System path
    mysql = require('../../../Fireproof Gauge System/backend/node_modules/mysql2/promise');
  } catch (e2) {
    // If both fail, try to require it directly (in case it's globally installed)
    mysql = require('mysql2/promise');
  }
}

// Database configuration
const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'fireproof_root_sandbox',
  database: 'fai_db_sandbox'
};

// Helper functions
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
  // If string contains special YAML characters, quote it
  if (str.match(/[:#@!%^&*(){}\[\]|\\'"]/)) {
    return '"' + str.replace(/"/g, '\\"') + '"';
  }
  return str;
}

function formatDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  
  // Get timezone offset
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
    // Connect to database
    console.log('Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('Connected successfully');

    // Start building YAML content
    let yaml = '# Database Structure - Fire-Proof ERP Sandbox\n';
    yaml += '# Version: 1.0.0\n';
    yaml += '# Generated from live database\n';
    yaml += '# Generated at: ' + formatLocalTimestamp() + ' CST\n';
    yaml += '# WARNING: This is a snapshot. Always verify against actual database.\n\n';
    
    // Add metadata section
    yaml += 'metadata:\n';
    yaml += '  version: 1.0.0\n';
    yaml += '  generator: generate-database-yaml.js\n';
    yaml += '  timestamp: ' + formatLocalTimestamp() + ' CST\n';
    yaml += '  warnings:\n';
    yaml += '    - Missing table: gauge_calibrations (referenced by foreign keys)\n';
    yaml += '    - Contains 11 stored procedures\n';
    yaml += '    - Contains 1 scheduled event: expire_transfer_requests\n';
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

    // Get table count (excluding views)
    const [tableCount] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM information_schema.tables 
       WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      [DB_CONFIG.database]
    );
    yaml += `table_count: ${tableCount[0].count}\n\n`;

    // Get all tables
    const [tables] = await connection.execute(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = ? AND table_type = 'BASE TABLE' 
       ORDER BY table_name`,
      [DB_CONFIG.database]
    );

    // Add table list as comment
    yaml += `# Table List (${tables.length} tables):\n`;
    tables.forEach((table, index) => {
      yaml += `# ${index + 1}. ${table.TABLE_NAME}\n`;
    });
    yaml += '\n';

    yaml += 'tables:\n';

    // Process each table
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      yaml += `  - name: ${tableName}\n`;

      // Get columns with full information
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
        
        // Parse and output type properly
        const typeInfo = parseColumnType(col.COLUMN_TYPE);
        yaml += `        type: ${typeInfo.baseType}`;
        
        // Add size/precision info if needed
        if (typeInfo.size) {
          yaml += `(${typeInfo.size})`;
        }
        yaml += '\n';
        
        yaml += `        nullable: ${col.IS_NULLABLE === 'YES' ? 'true' : 'false'}\n`;
        
        if (col.COLUMN_KEY === 'PRI') yaml += '        primary_key: true\n';
        if (col.COLUMN_KEY === 'UNI') yaml += '        unique: true\n';
        
        // Handle defaults properly
        const defaultVal = formatDefault(col.COLUMN_DEFAULT);
        if (defaultVal !== null) {
          yaml += `        default: ${escapeYAML(defaultVal)}\n`;
        }
        
        if (col.EXTRA.includes('auto_increment')) yaml += '        auto_increment: true\n';
        if (col.EXTRA.includes('on update')) yaml += '        on_update: CURRENT_TIMESTAMP\n';
      }

      // Get all indexes including type
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

      // Get foreign keys with cascade rules
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

      // Get CHECK constraints (MySQL 8.0+)
      try {
        const [checks] = await connection.execute(
          `SELECT constraint_name, check_clause
           FROM information_schema.check_constraints
           WHERE constraint_schema = ? AND table_name = ?`,
          [DB_CONFIG.database, tableName]
        );
        
        if (checks.length > 0) {
          yaml += '    check_constraints:\n';
          for (const chk of checks) {
            yaml += `      - name: ${chk.CONSTRAINT_NAME}\n`;
            yaml += `        expression: ${escapeYAML(chk.CHECK_CLAUSE)}\n`;
          }
        }
      } catch (e) {
        // Ignore if CHECK constraints table doesn't exist (older MySQL)
      }

      yaml += '\n';
    }

    // Get views separately
    const [views] = await connection.execute(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = ? AND table_type = 'VIEW' 
       ORDER BY table_name`,
      [DB_CONFIG.database]
    );

    if (views.length > 0) {
      yaml += 'views:\n';
      for (const view of views) {
        yaml += `  - name: ${view.TABLE_NAME}\n`;
      }
    }

    // Get stored procedures
    const [procedures] = await connection.execute(
      `SELECT routine_name, routine_type, definer, created
       FROM information_schema.routines
       WHERE routine_schema = ? AND routine_type = 'PROCEDURE'
       ORDER BY routine_name`,
      [DB_CONFIG.database]
    );

    yaml += '\n# Stored Procedures (NOT included in structure, listed for completeness)\n';
    yaml += 'stored_procedures:\n';
    if (procedures.length > 0) {
      for (const proc of procedures) {
        yaml += `  - name: ${proc.ROUTINE_NAME}\n`;
        yaml += `    definer: ${proc.DEFINER}\n`;
        yaml += `    created: ${proc.CREATED}\n`;
      }
    } else {
      yaml += '  # None found\n';
    }

    // Get scheduled events
    const [events] = await connection.execute(
      `SELECT event_name, definer, event_type, execute_at, interval_value, 
              interval_field, status, on_completion
       FROM information_schema.events
       WHERE event_schema = ?
       ORDER BY event_name`,
      [DB_CONFIG.database]
    );

    yaml += '\n# Scheduled Events (NOT included in structure, listed for completeness)\n';
    yaml += 'scheduled_events:\n';
    if (events.length > 0) {
      for (const event of events) {
        yaml += `  - name: ${event.EVENT_NAME}\n`;
        yaml += `    definer: ${event.DEFINER}\n`;
        yaml += `    status: ${event.STATUS}\n`;
        yaml += `    type: ${event.EVENT_TYPE}\n`;
        if (event.INTERVAL_VALUE && event.INTERVAL_FIELD) {
          yaml += `    schedule: EVERY ${event.INTERVAL_VALUE} ${event.INTERVAL_FIELD}\n`;
        }
      }
    } else {
      yaml += '  # None found\n';
    }

    // Add integrity issues section
    yaml += '\n# Known Integrity Issues\n';
    yaml += 'integrity_issues:\n';
    yaml += '  missing_tables:\n';
    yaml += '    - name: gauge_calibrations\n';
    yaml += '      referenced_by:\n';
    yaml += '        - gauge_calibration_failures.calibration_id\n';
    yaml += '        - gauge_calibration_schedule.last_calibration_id\n';
    yaml += '      impact: "Foreign key constraints exist but table is missing"\n';

    // Add relationships section for easy reference
    yaml += '\nrelationships:\n';
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

    // Write to file in the same directory as this script
    const outputFile = `database_structure_${formatDate()}.yaml`;
    const outputPath = path.join(__dirname, outputFile);
    fs.writeFileSync(outputPath, yaml);
    
    console.log(`\nYAML file generated successfully: ${outputFile}`);
    console.log(`Full path: ${outputPath}`);
    console.log(`Total tables: ${tables.length}`);
    console.log(`Total views: ${views.length}`);

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