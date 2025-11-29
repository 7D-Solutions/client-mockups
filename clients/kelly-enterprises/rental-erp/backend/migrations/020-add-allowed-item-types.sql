-- Migration: Add allowed_item_types column to storage_locations table
-- Date: 2025-11-04
-- Purpose: Allow restricting which item types (gauges, tools, parts) can be stored in each location

-- Add allowed_item_types column to storage_locations table
-- Note: JSON columns cannot have DEFAULT values in MySQL
ALTER TABLE storage_locations
ADD COLUMN allowed_item_types JSON NULL
COMMENT 'Types of items allowed in this location (gauges, tools, parts)';

-- Update existing locations to allow all types by default
UPDATE storage_locations
SET allowed_item_types = '["gauges", "tools", "parts"]';
