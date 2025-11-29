-- Migration: Add allowed_item_types to storage_locations table
-- Purpose: Enable location-level filtering of which item types can be stored
-- Date: 2025-11-04

-- Add allowed_item_types column to storage_locations table
ALTER TABLE storage_locations
ADD COLUMN allowed_item_types JSON DEFAULT '["gauges", "tools", "parts"]'
COMMENT 'Types of items allowed in this location (gauges, tools, parts)';

-- Update existing locations to allow all types by default
UPDATE storage_locations
SET allowed_item_types = '["gauges", "tools", "parts"]'
WHERE allowed_item_types IS NULL;

-- Add index for JSON queries (MySQL 5.7+)
-- This improves performance when filtering locations by item type
CREATE INDEX idx_allowed_item_types ON storage_locations((CAST(allowed_item_types AS CHAR(100))));
