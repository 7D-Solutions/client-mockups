# Gauge Standardization - Final Database Schema

## Overview
This document contains the complete, finalized database schema for the gauge standardization system. It implements a multi-table architecture with separate specification tables for each equipment type, avoiding the pitfalls of a single wide table with numerous NULL columns.

## Architecture Decisions

### Multi-Table Design
- **Main gauges table**: Contains only shared fields common to all equipment types
- **4 Specification tables**: Type-specific fields for thread gauges, hand tools, large equipment, and calibration standards
- **Supporting tables**: Categories, ID configuration, companion history
- **Benefits**: Clean separation, no wasted columns, type-specific validation, easy to extend

### Key Design Principles
1. **Serial Numbers**: Track physical items (permanent)
2. **System Gauge IDs**: Track logical positions (e.g., SP0001A)
3. **Custom IDs**: Support legacy numbering systems
4. **Companion Tracking**: GO/NO GO pairs with full history
5. **Configurable Prefixes**: Setup-only customization
6. **Dual ID Display**: Show system, custom, or both IDs

## Complete Schema

### 1. Main Gauges Table Modifications

**Note**: For the complete gauges table structure including existing columns, see COMPLETE_GAUGES_TABLE_STRUCTURE.md

```sql
-- Add standardization columns to existing gauges table
ALTER TABLE gauges ADD COLUMN
  -- Equipment categorization
  equipment_category ENUM('thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard'),
  category_id INT,
  
  -- Standardization IDs
  system_gauge_id VARCHAR(20) COMMENT 'SP0001A, CA0001, LE0001, CS0001',
  custom_id VARCHAR(50) UNIQUE COMMENT 'Customer legacy IDs',
  standardized_name VARCHAR(255) COMMENT 'Auto-generated descriptive name',
  
  -- Companion tracking (thread gauges)
  companion_gauge_id INT COMMENT 'Links GO to NO GO gauge',
  gauge_suffix CHAR(1) COMMENT 'A=GO, B=NO GO, NULL for others',
  is_spare BOOLEAN DEFAULT FALSE COMMENT 'Unassigned spare gauge',
  
  -- Foreign keys
  FOREIGN KEY (category_id) REFERENCES gauge_categories(id),
  FOREIGN KEY (companion_gauge_id) REFERENCES gauges(id) ON DELETE SET NULL,
  
  -- Indexes for performance
  INDEX idx_system_id (system_gauge_id),
  INDEX idx_custom_id (custom_id),
  INDEX idx_companion (companion_gauge_id),
  INDEX idx_category (category_id),
  INDEX idx_equipment_category (equipment_category),
  INDEX idx_spare_search (is_spare, equipment_category, category_id);
```

### 2. Thread Gauge Specifications

```sql
CREATE TABLE gauge_thread_specifications (
  gauge_id INT PRIMARY KEY,
  
  -- Core specifications
  thread_size VARCHAR(20) NOT NULL COMMENT '.500-20, M10x1.5, .750-6',
  thread_type VARCHAR(20) NOT NULL COMMENT 'standard, metric, acme, npt, sti, spiralock',
  thread_form VARCHAR(10) COMMENT 'UN, UNF, UNEF, UNS, UNR, UNJ, UNJR, NPT, NPTF',
  thread_class VARCHAR(10) NOT NULL COMMENT '2A, 3B, 6g, 6G, 2G, 4C, L1, L2, L3',
  gauge_type VARCHAR(10) NOT NULL COMMENT 'plug, ring',
  
  -- Special attributes
  thread_hand VARCHAR(5) DEFAULT 'RH' COMMENT 'RH=Right Hand, LH=Left Hand',
  acme_starts INT DEFAULT 1 COMMENT '1, 2, 3, 4 for ACME multi-start',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  
  -- Indexes for search
  INDEX idx_thread_search (thread_type, thread_size, gauge_type),
  INDEX idx_thread_class (thread_class),
  
  -- Validation constraints
  CONSTRAINT chk_thread_form CHECK (
    (thread_type = 'standard' AND thread_form IN ('UN', 'UNF', 'UNEF', 'UNS', 'UNR', 'UNJ', 'UNJR')) OR
    (thread_type = 'npt' AND thread_form IN ('NPT', 'NPTF')) OR
    (thread_type NOT IN ('standard', 'npt') AND thread_form IS NULL)
  ),
  
  CONSTRAINT chk_acme_starts CHECK (
    (thread_type = 'acme' AND acme_starts BETWEEN 1 AND 4) OR
    (thread_type != 'acme' AND acme_starts = 1)
  ),
  
  CONSTRAINT chk_gauge_type CHECK (
    gauge_type IN ('plug', 'ring')
  )
) ENGINE=InnoDB;
```

### 3. Hand Tool Specifications

```sql
CREATE TABLE gauge_hand_tool_specifications (
  gauge_id INT PRIMARY KEY,
  
  -- Tool identification
  tool_type VARCHAR(20) NOT NULL COMMENT 'caliper, micrometer, depth_gauge, bore_gauge',
  format VARCHAR(20) NOT NULL COMMENT 'digital, dial',
  
  -- Measurement specifications
  range_min DECIMAL(10,4) NOT NULL COMMENT 'Minimum measurement value',
  range_max DECIMAL(10,4) NOT NULL COMMENT 'Maximum measurement value',
  range_unit VARCHAR(10) DEFAULT 'inches' COMMENT 'inches, mm',
  resolution DECIMAL(10,6) NOT NULL COMMENT 'Measurement resolution',
  
  -- Ownership
  ownership_type VARCHAR(20) DEFAULT 'company' COMMENT 'company, employee',
  owner_employee_id INT COMMENT 'If employee-owned',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_employee_id) REFERENCES users(id),
  
  -- Indexes
  INDEX idx_tool_type (tool_type, format),
  INDEX idx_ownership (ownership_type, owner_employee_id),
  
  -- Validation
  CONSTRAINT chk_range CHECK (range_min < range_max),
  CONSTRAINT chk_ownership CHECK (
    (ownership_type = 'employee' AND owner_employee_id IS NOT NULL) OR
    (ownership_type = 'company' AND owner_employee_id IS NULL)
  )
) ENGINE=InnoDB;
```

### 4. Large Equipment Specifications

```sql
CREATE TABLE gauge_large_equipment_specifications (
  gauge_id INT PRIMARY KEY,
  
  -- Equipment details
  equipment_type VARCHAR(50) NOT NULL COMMENT 'cmm, optical_comparator, height_gauge, surface_plate, hardness_tester, force_torque_tester',
  capacity VARCHAR(100) COMMENT 'Measurement capacity/range description',
  accuracy_class VARCHAR(20) COMMENT 'Accuracy classification',
  
  -- Location and environment
  fixed_location BOOLEAN DEFAULT TRUE COMMENT 'Cannot be moved/checked out',
  requires_environmental_control BOOLEAN DEFAULT FALSE COMMENT 'Temperature/humidity requirements',
  environmental_requirements TEXT COMMENT 'Specific environmental needs',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_equipment_type (equipment_type),
  INDEX idx_location_control (fixed_location, requires_environmental_control)
) ENGINE=InnoDB;
```

### 5. Calibration Standard Specifications

```sql
CREATE TABLE gauge_calibration_standard_specifications (
  gauge_id INT PRIMARY KEY,
  
  -- Standard specifications
  standard_type VARCHAR(50) NOT NULL COMMENT 'gauge_block, master_ring, reference_standard',
  nominal_value DECIMAL(15,6) NOT NULL COMMENT 'Nominal measurement value',
  uncertainty DECIMAL(15,6) NOT NULL COMMENT 'Measurement uncertainty (±)',
  uncertainty_units VARCHAR(20) DEFAULT 'inches' COMMENT 'inches, mm, microinches',
  
  -- Traceability
  traceability_organization VARCHAR(50) COMMENT 'NIST, NPL, PTB, etc.',
  traceability_certificate VARCHAR(100) COMMENT 'Certificate number',
  
  -- Access control
  access_restricted BOOLEAN DEFAULT TRUE COMMENT 'Restricted to qualified personnel',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_standard_type (standard_type),
  INDEX idx_nominal_value (nominal_value)
) ENGINE=InnoDB;
```

### 6. Gauge Categories

```sql
CREATE TABLE gauge_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_type ENUM('thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard') NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_equipment_type (equipment_type, is_active),
  UNIQUE KEY unique_category (equipment_type, category_name)
) ENGINE=InnoDB;

-- Initial data
INSERT INTO gauge_categories (equipment_type, category_name, display_order) VALUES
-- Thread Gauge Categories
('thread_gauge', 'Standard', 1),
('thread_gauge', 'Metric', 2),
('thread_gauge', 'ACME', 3),
('thread_gauge', 'NPT', 4),
('thread_gauge', 'STI', 5),
('thread_gauge', 'Spiralock', 6),

-- Hand Tool Categories
('hand_tool', 'Caliper', 1),
('hand_tool', 'Micrometer', 2),
('hand_tool', 'Depth Gauge', 3),
('hand_tool', 'Bore Gauge', 4),

-- Large Equipment Categories
('large_equipment', 'CMM', 1),
('large_equipment', 'Optical Comparator', 2),
('large_equipment', 'Height Gauge', 3),
('large_equipment', 'Surface Plate', 4),
('large_equipment', 'Hardness Tester', 5),
('large_equipment', 'Force/Torque Tester', 6),

-- Calibration Standard Categories
('calibration_standard', 'Gauge Block', 1),
('calibration_standard', 'Master Ring', 2),
('calibration_standard', 'Master Plug', 3),
('calibration_standard', 'Reference Standard', 4);
```

### 7. Gauge ID Configuration

```sql
CREATE TABLE gauge_id_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL,
  gauge_type VARCHAR(20) COMMENT 'plug, ring, or NULL for single types',
  prefix VARCHAR(4) NOT NULL COMMENT '2-4 character prefix',
  current_sequence INT DEFAULT 0 COMMENT 'Current sequence number',
  is_locked BOOLEAN DEFAULT FALSE COMMENT 'Locked after first use',
  locked_at TIMESTAMP NULL COMMENT 'When prefix was locked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (category_id) REFERENCES gauge_categories(id),
  
  -- Constraints
  UNIQUE KEY unique_prefix (prefix),
  UNIQUE KEY unique_config (category_id, gauge_type),
  
  -- Validation
  CONSTRAINT chk_prefix_format CHECK (
    LENGTH(prefix) BETWEEN 2 AND 4 AND
    prefix REGEXP '^[A-Z]+$'
  )
) ENGINE=InnoDB;

-- NOTE: The default prefix configuration should be handled by the application
-- during initial setup, not hardcoded in SQL. The application will:
-- 1. Create categories
-- 2. Allow admin to configure prefixes for each category
-- 3. Insert the gauge_id_config records with proper category IDs
--
-- Example of what the application would generate:
-- INSERT INTO gauge_id_config (category_id, gauge_type, prefix) 
-- VALUES (1, 'plug', 'SP'), (1, 'ring', 'SR');
--
-- But the actual category IDs (1, 2, 3...) would come from the 
-- application after it creates the categories.
```

### 8. Companion History Tracking

```sql
CREATE TABLE gauge_companion_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gauge_id INT NOT NULL COMMENT 'The gauge whose companion changed',
  companion_gauge_id INT COMMENT 'New companion gauge',
  companion_serial VARCHAR(100) COMMENT 'Serial number of new companion',
  action ENUM('paired', 'unpaired', 'replaced') NOT NULL,
  reason VARCHAR(255) COMMENT 'Why the change was made',
  changed_by INT NOT NULL COMMENT 'User who made the change',
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (gauge_id) REFERENCES gauges(id),
  FOREIGN KEY (companion_gauge_id) REFERENCES gauges(id),
  FOREIGN KEY (changed_by) REFERENCES users(id),
  
  -- Indexes
  INDEX idx_gauge_history (gauge_id, changed_at),
  INDEX idx_companion_changes (companion_gauge_id)
) ENGINE=InnoDB;
```

### 9. System Configuration

```sql
CREATE TABLE gauge_system_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(50) NOT NULL UNIQUE,
  config_value VARCHAR(255),
  config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description VARCHAR(255),
  is_locked BOOLEAN DEFAULT FALSE COMMENT 'Cannot be changed after initial setup',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Initial configuration
INSERT INTO gauge_system_config (config_key, config_value, description) VALUES
('id_display_mode', 'both', 'Display preference: system, custom, or both'),
('prefixes_locked', 'false', 'Whether ID prefixes are locked'),
('calibration_standard_enabled', 'true', 'Enable calibration standards module');
```

## Common Queries

### Find All Thread Gauges with Specifications
```sql
SELECT 
  g.*,
  ts.*,
  gc.category_name,
  CONCAT(g.system_gauge_id, ' - ', g.standardized_name) as display_name
FROM gauges g
JOIN gauge_thread_specifications ts ON g.id = ts.gauge_id
JOIN gauge_categories gc ON g.category_id = gc.id
WHERE g.equipment_category = 'thread_gauge'
  AND g.is_deleted = 0
ORDER BY g.system_gauge_id;
```

### Find Complete GO/NO GO Sets
```sql
SELECT 
  g1.system_gauge_id as go_gauge_id,
  g1.serial_number as go_serial,
  g2.system_gauge_id as nogo_gauge_id,
  g2.serial_number as nogo_serial,
  g1.standardized_name
FROM gauges g1
JOIN gauges g2 ON g1.companion_gauge_id = g2.id
WHERE g1.gauge_suffix = 'A'
  AND g1.is_spare = FALSE
  AND g2.is_spare = FALSE
  AND g1.is_deleted = 0;
```

### Find Available Spares by Specification
```sql
SELECT 
  g.*,
  ts.*
FROM gauges g
JOIN gauge_thread_specifications ts ON g.id = ts.gauge_id
WHERE g.is_spare = TRUE
  AND g.equipment_category = 'thread_gauge'
  AND ts.thread_size = '.500-20'
  AND ts.thread_type = 'standard'
  AND ts.thread_class = '2A'
  AND ts.gauge_type = 'plug'
  AND g.gauge_suffix = 'A'
  AND g.is_deleted = 0;
```

### Generate Next ID for Category
```sql
-- Get next ID for standard thread gauge plug
SELECT 
  CONCAT(gic.prefix, LPAD(gic.current_sequence + 1, 4, '0'), 'A') as next_id
FROM gauge_id_config gic
JOIN gauge_categories gc ON gic.category_id = gc.id
WHERE gc.equipment_type = 'thread_gauge'
  AND gc.category_name = 'Standard'
  AND gic.gauge_type = 'plug';
```

## Migration Considerations

### From Existing System
1. Map existing `type` values to new `equipment_category`
2. Parse existing gauge IDs to determine category
3. Create specification records based on equipment type
4. Generate standardized names
5. Identify and link GO/NO GO pairs
6. Copy existing IDs to `custom_id` field

### Rollback Plan
1. Specification tables can be dropped without affecting main gauges table
2. New columns can be dropped from gauges table
3. Original gauge_id remains unchanged

## Performance Optimizations

### Indexing Strategy
- Primary lookups by system_gauge_id and custom_id
- Category and equipment type filtering
- Spare searching by specifications
- Companion relationships
- History tracking by gauge and date

### Query Optimization
- Use JOIN with specification tables only when needed
- Create views for common gauge type queries
- Consider materialized views for complex reports

## Security Considerations

### Access Control
- Calibration standards restricted to qualified personnel
- Spare management limited to QC/Admin roles
- Prefix configuration locked after initial setup
- Companion changes require elevated permissions

### Audit Requirements
- All companion changes tracked in history
- System configuration changes logged
- Gauge creation/modification in existing audit_logs table

---

*This schema represents the complete database design for the gauge standardization system, implementing clean separation of concerns with type-specific specification tables.*