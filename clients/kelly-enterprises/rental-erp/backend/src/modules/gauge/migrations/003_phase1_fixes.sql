-- Phase 1 Fixes - Address issues identified in database audit

-- 1. Fix gauge_transactions column naming (user_id → actor_user_id)
-- First check if column exists and needs renaming
ALTER TABLE gauge_transactions 
  CHANGE COLUMN user_id actor_user_id INT NOT NULL;

-- 2. Create missing gauge_location_history table
CREATE TABLE IF NOT EXISTS gauge_location_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gauge_id INT NOT NULL,
  location VARCHAR(255),
  changed_by INT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_glh_gauge FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
  CONSTRAINT fk_glh_user FOREIGN KEY (changed_by) REFERENCES core_users(id) ON DELETE RESTRICT,
  INDEX idx_gauge_location (gauge_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add missing columns to gauge_companion_history
ALTER TABLE gauge_companion_history
  ADD COLUMN IF NOT EXISTS old_companion_id INT NULL AFTER companion_gauge_id,
  ADD COLUMN IF NOT EXISTS companion_serial VARCHAR(100) NULL AFTER companion_gauge_id,
  ADD COLUMN IF NOT EXISTS old_companion_serial VARCHAR(100) NULL AFTER old_companion_id;

-- Add foreign key for old_companion_id
ALTER TABLE gauge_companion_history
  ADD CONSTRAINT fk_gch_old_companion 
    FOREIGN KEY (old_companion_id) 
    REFERENCES gauges(id) 
    ON DELETE SET NULL;

-- 4. Add gauge_suffix to gauges table if missing (for thread gauges)
-- This is needed for GO/NO GO pair identification
ALTER TABLE gauges
  ADD COLUMN IF NOT EXISTS gauge_suffix VARCHAR(5) NULL AFTER gauge_id;