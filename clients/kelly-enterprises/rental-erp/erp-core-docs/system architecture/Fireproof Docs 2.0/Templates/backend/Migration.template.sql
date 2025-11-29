-- =====================================================================
-- {{ENTITY_NAME}} Module - Database Migration Template
-- =====================================================================
--
-- USAGE:
-- Replace placeholders with actual values:
-- - {{TABLE_NAME}} → Database table name (e.g., "gauges", "customers", "orders")
-- - {{ENTITY_NAME}} → PascalCase entity name (e.g., "Gauge", "Customer", "Order")
-- - {{FIELDS}} → Entity-specific columns
-- - {{RELATIONSHIPS}} → Foreign key relationships
--
-- PATTERN: Database Migration
-- - Main entity table with standard columns
-- - Specification tables (if entity has multiple types)
-- - Supporting tables (relationships, history, etc.)
-- - Indexes for performance
-- - Foreign keys for data integrity
-- - Check constraints for validation
-- - Seed data (idempotent with INSERT IGNORE)
--
-- STANDARD COLUMNS (included in all entity tables):
-- - id: INT PRIMARY KEY AUTO_INCREMENT
-- - is_active: BOOLEAN DEFAULT TRUE
-- - is_deleted: BOOLEAN DEFAULT FALSE (for soft deletes)
-- - created_by: INT (foreign key to core_users)
-- - created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- - updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
--
-- =====================================================================

-- ========== MAIN ENTITY TABLE ==========

/**
 * Main {{TABLE_NAME}} table
 * Stores core entity data with standard audit fields
 */
CREATE TABLE IF NOT EXISTS {{TABLE_NAME}} (
  -- Primary key
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- Business identifier (unique public-facing ID)
  {{ENTITY_BUSINESS_ID}} VARCHAR(50) UNIQUE NOT NULL,

  -- ========== CUSTOMIZATION POINT: Entity-Specific Fields ==========
  -- Add your entity's specific columns here
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('active', 'inactive', 'pending', 'archived') DEFAULT 'active',

  -- Example: Foreign keys
  -- category_id INT NOT NULL,
  -- owner_id INT,

  -- Example: Entity-specific fields
  -- equipment_type ENUM('type_a', 'type_b', 'type_c') NOT NULL,
  -- serial_number VARCHAR(100),
  -- manufacturer VARCHAR(255),
  -- model_number VARCHAR(255),

  -- Standard audit fields (REQUIRED)
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- ========== CUSTOMIZATION POINT: Foreign Key Constraints ==========
  -- Example:
  -- CONSTRAINT fk_{{TABLE_NAME}}_category FOREIGN KEY (category_id)
  --   REFERENCES categories(id) ON DELETE RESTRICT,
  -- CONSTRAINT fk_{{TABLE_NAME}}_owner FOREIGN KEY (owner_id)
  --   REFERENCES core_users(id) ON DELETE SET NULL,

  CONSTRAINT fk_{{TABLE_NAME}}_created_by FOREIGN KEY (created_by)
    REFERENCES core_users(id) ON DELETE RESTRICT,

  -- ========== CUSTOMIZATION POINT: Check Constraints ==========
  -- Example: Validate enum values, ranges, etc.
  -- CONSTRAINT chk_{{TABLE_NAME}}_valid_status CHECK (status IN ('active', 'inactive', 'pending')),
  -- CONSTRAINT chk_{{TABLE_NAME}}_valid_quantity CHECK (quantity >= 0),

  -- ========== CUSTOMIZATION POINT: Indexes ==========
  -- Add indexes for frequently queried columns
  INDEX idx_{{TABLE_NAME}}_status (status, is_deleted),
  INDEX idx_{{TABLE_NAME}}_created_at (created_at),
  INDEX idx_{{TABLE_NAME}}_{{ENTITY_BUSINESS_ID}} ({{ENTITY_BUSINESS_ID}})
  -- Example:
  -- INDEX idx_{{TABLE_NAME}}_category (category_id, is_deleted),
  -- INDEX idx_{{TABLE_NAME}}_search (name, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== SPECIFICATION TABLES ==========
-- If your entity has multiple types with different specifications, create separate tables

/**
 * Example: Type A Specifications
 * Stores type-specific attributes for {{TABLE_NAME}} of type A
 */
-- CREATE TABLE IF NOT EXISTS {{TABLE_NAME}}_type_a_specifications (
--   {{ENTITY_LOWER}}_id INT PRIMARY KEY,
--   spec_field_one VARCHAR(50) NOT NULL,
--   spec_field_two VARCHAR(50) NOT NULL,
--   spec_field_three DECIMAL(10,4),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   CONSTRAINT fk_{{TABLE_NAME}}_type_a_spec FOREIGN KEY ({{ENTITY_LOWER}}_id)
--     REFERENCES {{TABLE_NAME}}(id) ON DELETE CASCADE,
--   INDEX idx_type_a_search (spec_field_one, spec_field_two)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/**
 * Example: Type B Specifications
 * Stores type-specific attributes for {{TABLE_NAME}} of type B
 */
-- CREATE TABLE IF NOT EXISTS {{TABLE_NAME}}_type_b_specifications (
--   {{ENTITY_LOWER}}_id INT PRIMARY KEY,
--   spec_field_x VARCHAR(50) NOT NULL,
--   spec_field_y VARCHAR(50) NOT NULL,
--   spec_field_z INT,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   CONSTRAINT fk_{{TABLE_NAME}}_type_b_spec FOREIGN KEY ({{ENTITY_LOWER}}_id)
--     REFERENCES {{TABLE_NAME}}(id) ON DELETE CASCADE,
--   INDEX idx_type_b_search (spec_field_x, spec_field_y)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== SUPPORTING TABLES ==========

/**
 * Example: Categories Table
 * Stores categories for organizing {{TABLE_NAME}} entities
 */
-- CREATE TABLE IF NOT EXISTS {{TABLE_NAME}}_categories (
--   id INT PRIMARY KEY AUTO_INCREMENT,
--   name VARCHAR(100) NOT NULL UNIQUE,
--   description TEXT,
--   display_order INT DEFAULT 0,
--   is_active BOOLEAN DEFAULT TRUE,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   INDEX idx_categories_active (is_active, display_order)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/**
 * Example: History/Audit Table
 * Stores historical changes for {{TABLE_NAME}} entities
 */
-- CREATE TABLE IF NOT EXISTS {{TABLE_NAME}}_history (
--   id INT PRIMARY KEY AUTO_INCREMENT,
--   {{ENTITY_LOWER}}_id INT NOT NULL,
--   action ENUM('created', 'updated', 'deleted', 'status_changed') NOT NULL,
--   old_value TEXT,
--   new_value TEXT,
--   changed_by INT NOT NULL,
--   changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   reason VARCHAR(255),
--   CONSTRAINT fk_{{TABLE_NAME}}_history_{{ENTITY_LOWER}} FOREIGN KEY ({{ENTITY_LOWER}}_id)
--     REFERENCES {{TABLE_NAME}}(id) ON DELETE CASCADE,
--   CONSTRAINT fk_{{TABLE_NAME}}_history_user FOREIGN KEY (changed_by)
--     REFERENCES core_users(id) ON DELETE RESTRICT,
--   INDEX idx_{{TABLE_NAME}}_history_entity ({{ENTITY_LOWER}}_id, changed_at),
--   INDEX idx_{{TABLE_NAME}}_history_action (action, changed_at)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/**
 * Example: Relationship Table (Many-to-Many)
 * Stores relationships between {{TABLE_NAME}} and another entity
 */
-- CREATE TABLE IF NOT EXISTS {{TABLE_NAME}}_relationships (
--   id INT PRIMARY KEY AUTO_INCREMENT,
--   {{ENTITY_LOWER}}_id INT NOT NULL,
--   related_entity_id INT NOT NULL,
--   relationship_type ENUM('parent', 'child', 'related') NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   created_by INT NOT NULL,
--   CONSTRAINT fk_{{TABLE_NAME}}_rel_{{ENTITY_LOWER}} FOREIGN KEY ({{ENTITY_LOWER}}_id)
--     REFERENCES {{TABLE_NAME}}(id) ON DELETE CASCADE,
--   CONSTRAINT fk_{{TABLE_NAME}}_rel_related FOREIGN KEY (related_entity_id)
--     REFERENCES related_entities(id) ON DELETE CASCADE,
--   CONSTRAINT fk_{{TABLE_NAME}}_rel_user FOREIGN KEY (created_by)
--     REFERENCES core_users(id) ON DELETE RESTRICT,
--   UNIQUE KEY unique_relationship ({{ENTITY_LOWER}}_id, related_entity_id, relationship_type),
--   INDEX idx_{{TABLE_NAME}}_rel_entity ({{ENTITY_LOWER}}_id),
--   INDEX idx_{{TABLE_NAME}}_rel_related (related_entity_id)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== SEED DATA ==========
-- Use INSERT IGNORE for idempotent seeding (won't fail if data already exists)

/**
 * Example: Seed Categories
 */
-- INSERT IGNORE INTO {{TABLE_NAME}}_categories (name, description, display_order)
-- VALUES
--   ('Category A', 'Description for Category A', 1),
--   ('Category B', 'Description for Category B', 2),
--   ('Category C', 'Description for Category C', 3);

/**
 * Example: Seed Default Entities
 */
-- INSERT IGNORE INTO {{TABLE_NAME}} ({{ENTITY_BUSINESS_ID}}, name, status, created_by)
-- VALUES
--   ('DEFAULT-001', 'Default {{ENTITY_NAME}} 1', 'active', 1),
--   ('DEFAULT-002', 'Default {{ENTITY_NAME}} 2', 'active', 1);

-- ========== VIEWS (OPTIONAL) ==========
-- Create views for common queries with JOINs

/**
 * Example: Entity with Relations View
 * Provides a denormalized view of {{TABLE_NAME}} with related data
 */
-- CREATE OR REPLACE VIEW {{TABLE_NAME}}_with_relations AS
-- SELECT
--   e.*,
--   c.name AS category_name,
--   u.name AS created_by_name,
--   spec.spec_field_one,
--   spec.spec_field_two
-- FROM {{TABLE_NAME}} e
-- LEFT JOIN {{TABLE_NAME}}_categories c ON e.category_id = c.id
-- LEFT JOIN core_users u ON e.created_by = u.id
-- LEFT JOIN {{TABLE_NAME}}_type_a_specifications spec ON e.id = spec.{{ENTITY_LOWER}}_id
-- WHERE e.is_deleted = 0;

-- ========== MIGRATION TRACKING ==========
-- Optional: Track migration execution (if not using external migration tool)

-- INSERT INTO migration_history (migration_name, executed_at)
-- VALUES ('001_create_{{TABLE_NAME}}_tables', UTC_TIMESTAMP())
-- ON DUPLICATE KEY UPDATE executed_at = UTC_TIMESTAMP();

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================

/* ========== IMPLEMENTATION CHECKLIST ==========

1. Replace all {{PLACEHOLDERS}} with actual values
2. Add entity-specific columns to main table
3. Add foreign key constraints for relationships
4. Add indexes for frequently queried columns
5. Create specification tables if entity has multiple types
6. Create supporting tables (categories, history, relationships)
7. Add seed data with INSERT IGNORE for idempotency
8. Create views for common queries (optional)
9. Test migration in development environment
10. Document any manual steps or data migrations needed
11. Add rollback script if needed (separate file)
12. Update migration tracking system

*/
