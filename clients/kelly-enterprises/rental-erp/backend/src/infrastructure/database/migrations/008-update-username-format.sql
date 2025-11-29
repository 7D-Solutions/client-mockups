-- Migration: Update username format to first.last
-- Date: 2025-10-23
-- Description: Convert usernames to first.last format based on name field
-- Prerequisites: Migration 003-add-user-profile-fields.sql must be run first

-- Update usernames to first.last format from name field
-- Only run if username column exists (migration 003 completed)
UPDATE core_users
SET username = LOWER(REPLACE(TRIM(name), ' ', '.'))
WHERE name IS NOT NULL
  AND username IS NOT NULL;
