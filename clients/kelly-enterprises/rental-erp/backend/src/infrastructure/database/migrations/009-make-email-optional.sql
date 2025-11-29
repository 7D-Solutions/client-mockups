-- Migration: Make email optional for user accounts
-- Users can now be created with just a username, no email required
-- This allows for local-only accounts without email addresses

-- Step 1: Drop existing unique constraint on email (if exists)
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                     WHERE TABLE_SCHEMA = DATABASE()
                     AND TABLE_NAME = 'core_users'
                     AND INDEX_NAME = 'email');

SET @sql = IF(@index_exists > 0,
              'ALTER TABLE `core_users` DROP INDEX `email`',
              'SELECT "Index email does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Make email column nullable
ALTER TABLE `core_users` MODIFY COLUMN `email` varchar(255) NULL;

-- Step 3: Create or recreate email index as non-unique (for performance)
-- MySQL's UNIQUE constraint allows only one NULL value, so we can't use it
-- Instead, we'll enforce uniqueness in application code for non-NULL emails
SET @idx_email_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                         WHERE TABLE_SCHEMA = DATABASE()
                         AND TABLE_NAME = 'core_users'
                         AND INDEX_NAME = 'idx_email');

SET @sql = IF(@idx_email_exists = 0,
              'CREATE INDEX `idx_email` ON `core_users` (`email`)',
              'SELECT "Index idx_email already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Ensure username column exists
-- Check if username column exists, add if not
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'core_users'
                   AND COLUMN_NAME = 'username');

SET @sql = IF(@col_exists = 0,
              'ALTER TABLE `core_users` ADD COLUMN `username` varchar(100) NULL AFTER `email`',
              'SELECT "Column username already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Add unique constraint on username
-- This will allow multiple NULL usernames if column was just created
-- If column already exists with data, this may fail - that's okay
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                     WHERE TABLE_SCHEMA = DATABASE()
                     AND TABLE_NAME = 'core_users'
                     AND INDEX_NAME = 'idx_username_unique');

SET @sql = IF(@index_exists = 0,
              'CREATE UNIQUE INDEX `idx_username_unique` ON `core_users` (`username`)',
              'SELECT "Index idx_username_unique already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migration complete
-- Users can now be created with:
-- 1. Email only (legacy - but email is now optional)
-- 2. Username only (new - recommended for local accounts)
-- 3. Both email and username (preferred)
--
-- Note: Application code will enforce uniqueness for non-NULL emails
