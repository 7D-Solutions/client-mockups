-- Migration: Add must_change_password field
-- Date: 2025-10-22
-- Description: Add must_change_password field to track if user needs to change password on next login

-- Add must_change_password column (defaults to false for existing users)
ALTER TABLE core_users
ADD COLUMN must_change_password TINYINT(1) DEFAULT 0 AFTER password_hash;

-- Create index for better query performance
CREATE INDEX idx_must_change_password ON core_users(must_change_password);
