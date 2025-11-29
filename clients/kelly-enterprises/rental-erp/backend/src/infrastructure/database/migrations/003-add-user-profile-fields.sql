-- Migration: Add user profile fields
-- Date: 2025-10-19
-- Description: Add username, department, and phone fields to core_users table

-- Add username column with unique constraint
ALTER TABLE core_users 
ADD COLUMN username VARCHAR(50) UNIQUE DEFAULT NULL AFTER name;

-- Add department column
ALTER TABLE core_users 
ADD COLUMN department VARCHAR(100) DEFAULT NULL AFTER username;

-- Add phone column
ALTER TABLE core_users 
ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER department;

-- Create indexes for better query performance
CREATE INDEX idx_username ON core_users(username);
CREATE INDEX idx_department ON core_users(department);

-- Update existing users to have username generated from email
UPDATE core_users 
SET username = LOWER(SUBSTRING_INDEX(email, '@', 1))
WHERE username IS NULL;

-- Handle duplicates by appending numbers
SET @row_number = 0;
UPDATE core_users u1
JOIN (
    SELECT id, username,
           @row_number := IF(@current_username = username, @row_number + 1, 0) AS row_num,
           @current_username := username
    FROM core_users
    ORDER BY username, id
) u2 ON u1.id = u2.id
SET u1.username = CONCAT(u1.username, '_', u2.row_num + 1)
WHERE u2.row_num > 0;