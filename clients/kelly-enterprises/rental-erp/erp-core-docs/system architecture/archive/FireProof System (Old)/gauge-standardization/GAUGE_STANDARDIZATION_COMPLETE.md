# Gauge Standardization - Complete Implementation Guide

## Overview
This document contains everything needed to implement the gauge standardization system: database schema, business rules, and workflows.

## Database Schema

### 1. Modify Existing Gauges Table

```sql
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

### 2. Create Categories Table

```sql
CREATE TABLE gauge_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_type ENUM('thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard') NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
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

### 3. Create ID Configuration Table

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
  
  FOREIGN KEY (category_id) REFERENCES gauge_categories(id),
  UNIQUE KEY unique_prefix (prefix),
  UNIQUE KEY unique_config (category_id, gauge_type),
  
  CONSTRAINT chk_prefix_format CHECK (
    LENGTH(prefix) BETWEEN 2 AND 4 AND
    prefix REGEXP '^[A-Z]+$'
  )
) ENGINE=InnoDB;
```

### 4. Create Companion History Table

```sql
CREATE TABLE gauge_companion_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gauge_id INT NOT NULL COMMENT 'The gauge whose companion changed',
  companion_gauge_id INT COMMENT 'New companion gauge',
  companion_serial VARCHAR(100) COMMENT 'Serial number of new companion',
  old_companion_id INT COMMENT 'Previous companion gauge',
  old_companion_serial VARCHAR(100) COMMENT 'Serial number of old companion',
  action ENUM('paired', 'unpaired', 'replaced') NOT NULL,
  reason VARCHAR(255) COMMENT 'Why the change was made',
  changed_by INT NOT NULL COMMENT 'User who made the change',
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (gauge_id) REFERENCES gauges(id),
  FOREIGN KEY (companion_gauge_id) REFERENCES gauges(id),
  FOREIGN KEY (old_companion_id) REFERENCES gauges(id),
  FOREIGN KEY (changed_by) REFERENCES users(id),
  
  INDEX idx_gauge_history (gauge_id, changed_at),
  INDEX idx_companion_changes (companion_gauge_id)
) ENGINE=InnoDB;
```

### 5. Create System Configuration Table

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

### 6. Create Thread Gauge Specifications Table

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
  
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  INDEX idx_thread_search (thread_type, thread_size, gauge_type),
  
  CONSTRAINT chk_thread_form CHECK (
    (thread_type = 'standard' AND thread_form IN ('UN', 'UNF', 'UNEF', 'UNS', 'UNR', 'UNJ', 'UNJR')) OR
    (thread_type = 'npt' AND thread_form IN ('NPT', 'NPTF')) OR
    (thread_type NOT IN ('standard', 'npt') AND thread_form IS NULL)
  ),
  
  CONSTRAINT chk_thread_class CHECK (
    -- NPT can have L1, L2, L3 or NULL
    (thread_type = 'npt' AND (thread_class IN ('L1', 'L2', 'L3') OR thread_class IS NULL)) OR
    -- Standard threads follow [1-3][AB] pattern
    (thread_type = 'standard' AND thread_class REGEXP '^[1-3][AB]$') OR
    -- Metric follows case-sensitive pattern
    (thread_type = 'metric' AND thread_class REGEXP '^[4-6][gGhHeEfF]$') OR
    -- ACME follows [2-5][GC] pattern
    (thread_type = 'acme' AND thread_class REGEXP '^[2-5][GC]$') OR
    -- STI and Spiralock may have their own patterns
    (thread_type IN ('sti', 'spiralock'))
  ),
  
  CONSTRAINT chk_acme_starts CHECK (
    (thread_type = 'acme' AND acme_starts BETWEEN 1 AND 4) OR
    (thread_type != 'acme' AND acme_starts = 1)
  )
) ENGINE=InnoDB;
```

### 7. Create Hand Tool Specifications Table

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
  
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_employee_id) REFERENCES users(id),
  
  INDEX idx_tool_type (tool_type, format),
  INDEX idx_ownership (ownership_type, owner_employee_id),
  
  CONSTRAINT chk_range CHECK (range_min < range_max),
  CONSTRAINT chk_ownership CHECK (
    (ownership_type = 'employee' AND owner_employee_id IS NOT NULL) OR
    (ownership_type = 'company' AND owner_employee_id IS NULL)
  )
) ENGINE=InnoDB;
```

### 8. Create Large Equipment Specifications Table

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
  
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  
  INDEX idx_equipment_type (equipment_type),
  INDEX idx_location_control (fixed_location, requires_environmental_control)
) ENGINE=InnoDB;
```

### 9. Create Calibration Standard Specifications Table

```sql
CREATE TABLE gauge_calibration_standard_specifications (
  gauge_id INT PRIMARY KEY,
  
  -- Standard specifications
  standard_type VARCHAR(50) NOT NULL COMMENT 'gauge_block, master_ring, master_plug, reference_standard',
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
  
  FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  
  INDEX idx_standard_type (standard_type),
  INDEX idx_nominal_value (nominal_value)
) ENGINE=InnoDB;
```

## Business Rules

### ID System
- **System IDs**: SP0001A (Standard Plug GO), CA0001 (Caliper), LE0001 (Large Equipment), CS0001 (Calibration Standard)
- **Prefixes**: 2-4 characters, configurable during setup only, lock after first use
- **Suffixes**: A=GO, B=NO GO (thread gauges only)
- **Sequential**: 0001-9999, then 10000+ (never resets)

### Thread Gauge Rules
- All thread gauges except NPT require GO/NO GO pairs
- Sets checkout together, not individually
- Companion links: SP0001A ↔ SP0001B
- Empty companion = spare gauge
- Regular users see complete sets only
- QC/Admin see everything (sets, spares, incomplete)

### Naming Conventions
- Thread: `.500-20 UN 2A Thread Plug Gauge GO`
- Hand Tool: `0-6" Digital Caliper`
- Large Equipment: `Mitutoyo PJ-300 Optical Comparator`
- Calibration Standard: `0.1000" Grade 0 Gauge Block`

### Calibration Rules
- **Unsealed**: Due date = Calibration date + frequency
- **Sealed**: Due date = Unseal date + frequency (clock starts when unsealed)
- **Verify Before Use**: No fixed schedule for some hand tools
  - Quick verification required at checkout
  - Pass = proceed with checkout
  - Fail = block checkout, require full calibration
  - Note: Terminology pending - may be "Calibrate Before Use"

### Form Requirements

**Sealed Thread Gauges**:
- Serial Number* (required)
- Gauge ID (optional - can be spare)
- Seal Status* = Sealed
- Initial Calibration Date (disabled)
- Calibration Certificate #* (required)

**Unsealed Thread Gauges**:
- Serial Number* (required)
- Gauge ID* (required - must be assigned)
- Seal Status* = Unsealed  
- Initial Calibration Date* (required)
- Calibration Certificate #* (required)

### Ownership Rules (Hand Tools)
**Company-Owned**:
- Stored at company location
- Available for checkout
- Location tracking required

**Employee-Owned**:
- No checkout (employee keeps)
- No location tracking
- Calibration tracking only

### Special Rules
- Large equipment cannot be checked out (fixed location)
- Calibration standards have restricted access
- NPT gauges are single (no GO/NO GO)
- Hand tools are never sealed

## Implementation Notes

1. **Prefix Configuration**: Application handles during setup, not SQL scripts
2. **Category IDs**: Application looks up IDs, not hardcoded
3. **Soft Deletes**: is_deleted = 1 for retirement (preserve history)
4. **Spare Management**: is_spare flag tracks unassigned gauges

## Technical Implementation Details

### Validation Patterns

**Thread Gauge Validation Regex**:
```javascript
// Standard threads (decimal format)
const standardPattern = /^\.(\d{3})-(\d+)\s+(UN|UNF|UNEF|UNS|UNR|UNJ|UNJR)\s+(\d+[A-B])$/;
// Example: .500-20 UN 2A

// Metric threads
const metricPattern = /^M(\d+)x([\d.]+)\s+(\d+[g-h|G-H])$/;
// Example: M10x1.5 6g

// NPT threads (single gauges)
const nptPattern = /^\.(\d{3})-(\d+)\s+NPT$/;
// Example: .500-14 NPT

// ACME single start
const acmeSinglePattern = /^\.(\d{3})-(\d+)\s+ACME\s+([2-5][GC])$/;
// Example: .750-6 ACME 2G

// ACME multi-start
const acmeMultiPattern = /^\.(\d{3})-(\d+)\s+ACME\s+([2-5][GC])\s+(\d)-START$/;
// Example: .750-6 ACME 4C 2-START
```

### ID Generation Logic

**Thread-Safe Sequential ID Generation**:
```sql
-- Get next ID with row locking
START TRANSACTION;
SELECT current_sequence INTO @current 
FROM gauge_id_config 
WHERE category_id = ? AND gauge_type = ?
FOR UPDATE;

UPDATE gauge_id_config 
SET current_sequence = current_sequence + 1,
    is_locked = TRUE,
    locked_at = COALESCE(locked_at, NOW())
WHERE category_id = ? AND gauge_type = ?;

-- Generate the ID
SET @next_id = CONCAT(@prefix, LPAD(@current + 1, 4, '0'), @suffix);
COMMIT;
```

### Common SQL Queries

**Find All Thread Gauges with Specifications**:
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

**Find Complete GO/NO GO Sets**:
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

**Find Available Spares by Specification**:
```sql
SELECT 
  g.*,
  ts.*
FROM gauges g
JOIN gauge_thread_specifications ts ON g.id = ts.gauge_id
WHERE g.is_spare = TRUE
  AND g.equipment_category = 'thread_gauge'
  AND ts.thread_size = ?
  AND ts.thread_type = ?
  AND ts.thread_class = ?
  AND ts.gauge_type = ?
  AND g.gauge_suffix = ?
  AND g.is_deleted = 0;
```

**Generate Next ID for Category**:
```sql
SELECT 
  CONCAT(gic.prefix, LPAD(gic.current_sequence + 1, 4, '0'), 'A') as next_id
FROM gauge_id_config gic
JOIN gauge_categories gc ON gic.category_id = gc.id
WHERE gc.equipment_type = 'thread_gauge'
  AND gc.category_name = 'Standard'
  AND gic.gauge_type = 'plug';
```

### Audit Trail Requirements

**Companion Change History Format**:
```
Date: 2025-01-15 14:30
Action: Companion Changed
Gauge: SP1001B (NOGO-12346)
Old Companion: SP1001A (GO-12345)
New Companion: SP1001A (GO-98765)
Reason: GO gauge damaged during use
Changed By: John Smith (QC)
```

This requires tracking in the gauge_companion_history table with both old and new companion IDs and serial numbers.

---

*This document contains the complete gauge standardization implementation requirements.*