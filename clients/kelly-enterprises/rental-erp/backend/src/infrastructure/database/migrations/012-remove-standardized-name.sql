-- Migration 012: Remove standardized_name column
-- Rationale: Display names should be computed from specifications, not stored
-- Impact: BREAKING CHANGE - removes standardized_name column
-- Date: 2025-10-28
-- Note: Made idempotent - can be run multiple times safely

-- Step 1: Drop FULLTEXT index that includes standardized_name (if it exists)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'gauges'
   AND INDEX_NAME = 'idx_search') > 0,
  'DROP INDEX idx_search ON gauges',
  'SELECT ''idx_search does not exist, skipping'' AS Status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Remove the standardized_name column (if it exists)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'gauges'
   AND COLUMN_NAME = 'standardized_name') > 0,
  'ALTER TABLE gauges DROP COLUMN standardized_name',
  'SELECT ''standardized_name does not exist, skipping'' AS Status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Add optimized search indexes on actual data fields (if they don't exist)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'gauges'
   AND INDEX_NAME = 'idx_gauge_id_search') = 0,
  'CREATE INDEX idx_gauge_id_search ON gauges(gauge_id)',
  'SELECT ''idx_gauge_id_search already exists'' AS Status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'gauges'
   AND INDEX_NAME = 'idx_serial_search') = 0,
  'CREATE INDEX idx_serial_search ON gauges(serial_number)',
  'SELECT ''idx_serial_search already exists'' AS Status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'gauge_thread_specifications'
   AND INDEX_NAME = 'idx_thread_size_search') = 0,
  'CREATE INDEX idx_thread_size_search ON gauge_thread_specifications(thread_size)',
  'SELECT ''idx_thread_size_search already exists'' AS Status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'gauge_thread_specifications'
   AND INDEX_NAME = 'idx_thread_class_search') = 0,
  'CREATE INDEX idx_thread_class_search ON gauge_thread_specifications(thread_class)',
  'SELECT ''idx_thread_class_search already exists'' AS Status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Optimize JOIN performance with composite index (if it doesn't exist)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'gauge_thread_specifications'
   AND INDEX_NAME = 'idx_thread_spec_lookup') = 0,
  'CREATE INDEX idx_thread_spec_lookup ON gauge_thread_specifications(gauge_id, thread_size, thread_type, thread_class, gauge_type)',
  'SELECT ''idx_thread_spec_lookup already exists'' AS Status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Remove gauge_suffix from gauge_thread_specifications if it exists
-- (It should only be in gauges table, not specs table - architecturally incorrect placement)
-- Note: Wrapped in conditional to avoid error if column doesn't exist
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'gauge_thread_specifications'
   AND COLUMN_NAME = 'gauge_suffix') > 0,
  'ALTER TABLE gauge_thread_specifications DROP COLUMN gauge_suffix',
  'SELECT ''gauge_suffix column does not exist, skipping'' AS Status'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
