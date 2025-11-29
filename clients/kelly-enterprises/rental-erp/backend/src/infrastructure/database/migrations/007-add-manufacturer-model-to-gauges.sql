-- Migration: Add manufacturer and model_number columns to gauges table
-- Created: 2025-10-22
-- Purpose: Add manufacturer and model number fields to gauges table to support gauge metadata

-- Add manufacturer column
ALTER TABLE `gauges`
ADD COLUMN `manufacturer` VARCHAR(255) NULL AFTER `serial_number`;

-- Add model_number column
ALTER TABLE `gauges`
ADD COLUMN `model_number` VARCHAR(100) NULL AFTER `manufacturer`;

-- Add index for searching by manufacturer
CREATE INDEX `idx_manufacturer` ON `gauges` (`manufacturer`);

-- Add index for searching by model
CREATE INDEX `idx_model_number` ON `gauges` (`model_number`);
