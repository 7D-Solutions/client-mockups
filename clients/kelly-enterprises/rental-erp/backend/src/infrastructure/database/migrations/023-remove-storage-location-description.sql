-- Migration: Full warehouse location hierarchy (Facility → Building → Zone → Location)
-- Reason: Future-proof multi-tenant, multi-building, admin-customizable system
-- Industry Standard: SAP/Dynamics warehouse management hierarchy
-- Date: 2025-11-05

-- ============================================================================
-- 1. FACILITIES TABLE (Top level - for multi-tenant future)
-- ============================================================================
CREATE TABLE IF NOT EXISTS facilities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  facility_code VARCHAR(50) UNIQUE NOT NULL,
  facility_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_facility_code (facility_code),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default facility
INSERT INTO facilities (facility_code, facility_name, display_order) VALUES
  ('main', 'Main Facility', 1);

-- ============================================================================
-- 2. BUILDINGS TABLE (Physical structures within facility)
-- ============================================================================
CREATE TABLE IF NOT EXISTS buildings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  building_code VARCHAR(50) NOT NULL,
  building_name VARCHAR(100) NOT NULL,
  facility_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_building_facility
    FOREIGN KEY (facility_id) REFERENCES facilities(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  UNIQUE KEY uk_building_code_facility (building_code, facility_id),
  INDEX idx_building_code (building_code),
  INDEX idx_facility_id (facility_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Get the facility ID for default data
SET @main_facility_id = (SELECT id FROM facilities WHERE facility_code = 'main' LIMIT 1);

-- Insert default buildings
INSERT INTO buildings (building_code, building_name, facility_id, display_order) VALUES
  ('building_1', 'Building 1', @main_facility_id, 1),
  ('building_2', 'Building 2', @main_facility_id, 2);

-- ============================================================================
-- 3. ZONES TABLE (Functional areas within buildings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS zones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_code VARCHAR(50) NOT NULL,
  zone_name VARCHAR(100) NOT NULL,
  building_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_zone_building
    FOREIGN KEY (building_id) REFERENCES buildings(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  UNIQUE KEY uk_zone_code_building (zone_code, building_id),
  INDEX idx_zone_code (zone_code),
  INDEX idx_building_id (building_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Get building IDs for default data
SET @building_1_id = (SELECT id FROM buildings WHERE building_code = 'building_1' LIMIT 1);
SET @building_2_id = (SELECT id FROM buildings WHERE building_code = 'building_2' LIMIT 1);

-- Insert default zones for Building 1
INSERT INTO zones (zone_code, zone_name, building_id, display_order) VALUES
  ('receiving', 'Receiving', @building_1_id, 1),
  ('qc', 'Quality Control', @building_1_id, 2),
  ('shop_floor', 'Shop Floor', @building_1_id, 3),
  ('tool_crib', 'Tool Crib', @building_1_id, 4),
  ('shipping', 'Shipping', @building_1_id, 5),
  ('storage', 'Bulk Storage', @building_1_id, 6);

-- Insert default zones for Building 2
INSERT INTO zones (zone_code, zone_name, building_id, display_order) VALUES
  ('storage', 'Bulk Storage', @building_2_id, 1),
  ('shop_floor', 'Shop Floor', @building_2_id, 2);

-- ============================================================================
-- 4. UPDATE STORAGE_LOCATIONS TABLE
-- ============================================================================

-- Drop description column, add building_id and zone_id
ALTER TABLE storage_locations
  DROP COLUMN IF EXISTS description,
  ADD COLUMN building_id INT NULL AFTER location_code,
  ADD COLUMN zone_id INT NULL AFTER building_id,
  ADD CONSTRAINT fk_storage_location_building
    FOREIGN KEY (building_id) REFERENCES buildings(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  ADD CONSTRAINT fk_storage_location_zone
    FOREIGN KEY (zone_id) REFERENCES zones(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  ADD INDEX idx_building_id (building_id),
  ADD INDEX idx_zone_id (zone_id);

-- Assign all existing locations to Building 1 by default
UPDATE storage_locations SET building_id = @building_1_id WHERE building_id IS NULL;
