-- Migration: Create storage_locations table for configurable storage locations
-- Purpose: Allow companies to define their own storage location system
-- Date: 2025-10-29

-- Create storage_locations table
CREATE TABLE IF NOT EXISTS storage_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique location code (e.g., A1, SHELF-A1, RACK-1-BIN-3)',
  description VARCHAR(255) DEFAULT NULL COMMENT 'Optional description of the location',
  location_type ENUM('bin', 'shelf', 'rack', 'cabinet', 'drawer', 'room', 'other') DEFAULT 'bin' COMMENT 'Type of storage location',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this location is currently in use',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_type (location_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configurable storage locations for gauges and equipment';

-- Insert default storage locations (A1-L5 format)
-- Sorted alphabetically by location_code
INSERT INTO storage_locations (location_code, location_type) VALUES
-- Row A
('A1', 'bin'),
('A2', 'bin'),
('A3', 'bin'),
('A4', 'bin'),
('A5', 'bin'),
-- Row B
('B1', 'bin'),
('B2', 'bin'),
('B3', 'bin'),
('B4', 'bin'),
('B5', 'bin'),
-- Row C
('C1', 'bin'),
('C2', 'bin'),
('C3', 'bin'),
('C4', 'bin'),
('C5', 'bin'),
-- Row D
('D1', 'bin'),
('D2', 'bin'),
('D3', 'bin'),
('D4', 'bin'),
('D5', 'bin'),
-- Row E
('E1', 'bin'),
('E2', 'bin'),
('E3', 'bin'),
('E4', 'bin'),
('E5', 'bin'),
-- Row F
('F1', 'bin'),
('F2', 'bin'),
('F3', 'bin'),
('F4', 'bin'),
('F5', 'bin'),
-- Row G
('G1', 'bin'),
('G2', 'bin'),
('G3', 'bin'),
('G4', 'bin'),
('G5', 'bin'),
-- Row H
('H1', 'bin'),
('H2', 'bin'),
('H3', 'bin'),
('H4', 'bin'),
('H5', 'bin'),
-- Row I
('I1', 'bin'),
('I2', 'bin'),
('I3', 'bin'),
('I4', 'bin'),
('I5', 'bin'),
-- Row J
('J1', 'bin'),
('J2', 'bin'),
('J3', 'bin'),
('J4', 'bin'),
('J5', 'bin'),
-- Row K
('K1', 'bin'),
('K2', 'bin'),
('K3', 'bin'),
('K4', 'bin'),
('K5', 'bin'),
-- Row L
('L1', 'bin'),
('L2', 'bin'),
('L3', 'bin'),
('L4', 'bin'),
('L5', 'bin')
ON DUPLICATE KEY UPDATE location_code = location_code;
