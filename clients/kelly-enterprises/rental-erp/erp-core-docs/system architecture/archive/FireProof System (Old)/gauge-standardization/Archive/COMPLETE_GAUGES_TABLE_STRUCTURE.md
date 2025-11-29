# Complete Gauges Table Structure

## Overview
This document shows the complete structure of the gauges table after implementing the gauge standardization system. It combines existing columns with new standardization columns.

## Complete Table Structure

```sql
CREATE TABLE gauges (
  -- Primary Key
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Basic Identification (Existing)
  gauge_id VARCHAR(50) COMMENT 'Legacy gauge ID field',
  serial_number VARCHAR(100) NOT NULL COMMENT 'Physical serial number',
  type VARCHAR(50) COMMENT 'Legacy type field',
  
  -- Manufacturer Information (Existing)
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  
  -- Calibration Fields (Existing)
  last_calibration_date DATE,
  calibration_due_date DATE,
  calibration_frequency INT DEFAULT 365 COMMENT 'Days between calibrations',
  calibration_certificate VARCHAR(100),
  initial_calibration_date DATE,
  
  -- Status and Location (Existing)
  status ENUM('available', 'checked_out', 'out_for_calibration', 'under_maintenance', 'retired') DEFAULT 'available',
  location VARCHAR(100),
  seal_status ENUM('sealed', 'unsealed') COMMENT 'For thread gauges',
  
  -- Range Fields (Existing - for hand tools)
  range_min DECIMAL(10,4),
  range_max DECIMAL(10,4),
  range_unit VARCHAR(10) DEFAULT 'inches',
  
  -- Standardization Fields (NEW)
  equipment_category ENUM('thread_gauge', 'hand_tool', 'large_equipment', 'calibration_standard'),
  category_id INT,
  system_gauge_id VARCHAR(20) COMMENT 'SP0001A, CA0001, LE0001, CS0001',
  custom_id VARCHAR(50) UNIQUE COMMENT 'Customer legacy IDs',
  standardized_name VARCHAR(255) COMMENT 'Auto-generated descriptive name',
  
  -- Companion Tracking (NEW - thread gauges)
  companion_gauge_id INT COMMENT 'Links GO to NO GO gauge',
  gauge_suffix CHAR(1) COMMENT 'A=GO, B=NO GO, NULL for others',
  is_spare BOOLEAN DEFAULT FALSE COMMENT 'Unassigned spare gauge',
  
  -- Audit Fields (Existing)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  updated_by INT,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Foreign Keys
  FOREIGN KEY (category_id) REFERENCES gauge_categories(id),
  FOREIGN KEY (companion_gauge_id) REFERENCES gauges(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id),
  
  -- Indexes for Performance
  INDEX idx_serial (serial_number),
  INDEX idx_system_id (system_gauge_id),
  INDEX idx_custom_id (custom_id),
  INDEX idx_companion (companion_gauge_id),
  INDEX idx_category (category_id),
  INDEX idx_equipment_category (equipment_category),
  INDEX idx_spare_search (is_spare, equipment_category, category_id),
  INDEX idx_status (status, is_deleted),
  INDEX idx_calibration_due (calibration_due_date, is_deleted),
  
  -- Constraints
  CONSTRAINT chk_range CHECK (range_min IS NULL OR range_max IS NULL OR range_min < range_max),
  CONSTRAINT chk_suffix CHECK (
    (equipment_category != 'thread_gauge' AND gauge_suffix IS NULL) OR
    (equipment_category = 'thread_gauge' AND gauge_suffix IN ('A', 'B', NULL))
  )
) ENGINE=InnoDB;
```

## Column Usage by Equipment Type

### Thread Gauges
- Uses: serial_number, manufacturer, model, seal_status
- Uses: system_gauge_id, companion_gauge_id, gauge_suffix, is_spare
- Does NOT use: range_min, range_max
- Specifications in: gauge_thread_specifications table

### Hand Tools  
- Uses: serial_number, manufacturer, model, range_min, range_max, range_unit
- Uses: system_gauge_id
- Does NOT use: seal_status, companion_gauge_id, gauge_suffix
- Always unsealed
- Specifications in: gauge_hand_tool_specifications table

### Large Equipment
- Uses: serial_number, manufacturer, model, location
- Uses: system_gauge_id
- Does NOT use: seal_status, range fields, companion fields
- Cannot be checked out (fixed location)
- Specifications in: gauge_large_equipment_specifications table

### Calibration Standards
- Uses: serial_number, manufacturer, model, location
- Uses: system_gauge_id
- Does NOT use: seal_status, range fields, companion fields
- High security, fixed location
- Specifications in: gauge_calibration_standard_specifications table

## Migration Notes

When implementing the standardization system:

1. **Keep existing columns** to maintain backward compatibility
2. **Add new columns** using the ALTER TABLE statement in DATABASE_SCHEMA_FINAL.md
3. **Populate equipment_category** based on existing type values
4. **Generate system_gauge_id** for all existing records
5. **Copy existing gauge_id** to custom_id field if preserving legacy numbers
6. **Create specification records** in appropriate tables based on equipment_category

## Important Considerations

1. **Existing gauge_id column**: Keep for backward compatibility, new system uses system_gauge_id
2. **Type column**: Keep for backward compatibility, new system uses equipment_category
3. **NULL handling**: Many columns will be NULL depending on equipment type
4. **Soft deletes**: is_deleted = 1 for retired gauges (preserves history)

---

*This document shows the complete gauges table structure combining existing ERP system columns with new gauge standardization columns.*