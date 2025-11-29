-- Migration: Create inventory module tables
-- Purpose: Track current locations + movement history
-- Date: 2025-10-30
-- Philosophy: Two-table pattern (industry standard)

-- =====================================================
-- IMPORTANT: TEST DATA ONLY
-- =====================================================
-- Current database contains only test data
-- No initial data migration needed
-- Test data will be recreated through normal operations
-- =====================================================

-- =====================================================
-- TABLE 1: Current item locations (single source of truth)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_current_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Polymorphic reference to item
  item_type ENUM('gauge', 'tool', 'part', 'equipment', 'material') NOT NULL,
  item_identifier VARCHAR(100) NOT NULL,

  -- Current location (THE source of truth)
  current_location VARCHAR(50) NOT NULL,

  -- Quantity in this location
  -- Gauges/Tools: always 1 (unique items)
  -- Parts: actual quantity (can be any number)
  quantity INT NOT NULL DEFAULT 1 COMMENT 'Always 1 for gauges/tools, variable for parts',

  -- Audit metadata
  last_moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_moved_by INT NOT NULL,

  -- Allows: Gauges/tools in one location only, parts in multiple locations
  UNIQUE KEY unique_item_location (item_type, item_identifier, current_location),

  -- CRITICAL for "What's in location A1?" queries
  INDEX idx_location (current_location),

  -- Fast lookup for specific items
  INDEX idx_item (item_type, item_identifier),

  -- Foreign keys
  FOREIGN KEY (current_location) REFERENCES storage_locations(location_code) ON DELETE RESTRICT,
  FOREIGN KEY (last_moved_by) REFERENCES core_users(id) ON DELETE RESTRICT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Current item locations - single source of truth for ALL items including parts';

-- =====================================================
-- TABLE 2: Movement history (audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Start with 4 basic movement types
  movement_type ENUM('transfer', 'created', 'deleted', 'other') NOT NULL,

  -- Polymorphic reference
  item_type ENUM('gauge', 'tool', 'part', 'equipment', 'material') NOT NULL,
  item_identifier VARCHAR(100) NOT NULL,

  -- Quantity moved (always 1 for gauges/tools, variable for parts)
  quantity INT NOT NULL DEFAULT 1 COMMENT 'Always 1 for gauges/tools, variable for parts',

  -- Parts-specific fields (reserved for future)
  order_number VARCHAR(50) DEFAULT NULL COMMENT 'Sales order (future)',
  job_number VARCHAR(50) DEFAULT NULL COMMENT 'Job number (future)',

  -- Location tracking
  -- Both nullable: from_location NULL = created, to_location NULL = deleted/sold/consumed
  from_location VARCHAR(50) DEFAULT NULL,
  to_location VARCHAR(50) DEFAULT NULL,

  -- Audit metadata
  moved_by INT NOT NULL,
  moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(255) DEFAULT NULL,
  notes TEXT DEFAULT NULL,

  -- Essential indexes only
  INDEX idx_item_lookup (item_type, item_identifier),
  INDEX idx_movement_date (moved_at),

  -- Foreign keys
  FOREIGN KEY (from_location) REFERENCES storage_locations(location_code) ON DELETE SET NULL,
  FOREIGN KEY (to_location) REFERENCES storage_locations(location_code) ON DELETE SET NULL,
  FOREIGN KEY (moved_by) REFERENCES core_users(id) ON DELETE RESTRICT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Movement history - audit trail';

-- =====================================================
-- Optional: Clean up old storage_location field
-- =====================================================
-- Can optionally drop the field from gauges table if it exists
-- Or just leave it unused (simpler approach)
-- Uncomment if you want to remove it:
-- ALTER TABLE gauges DROP COLUMN IF EXISTS storage_location;

-- =====================================================
-- Verification Queries
-- =====================================================
-- Run these to verify tables were created correctly:
-- DESCRIBE inventory_current_locations;
-- DESCRIBE inventory_movements;
-- SHOW CREATE TABLE inventory_current_locations;
-- SHOW CREATE TABLE inventory_movements;
