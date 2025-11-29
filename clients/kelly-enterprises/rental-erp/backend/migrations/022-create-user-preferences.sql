-- Migration 022: Create user_preferences table for cross-device user settings
-- This table stores user-specific preferences like column configurations, UI settings, etc.

CREATE TABLE IF NOT EXISTS user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  preference_key VARCHAR(255) NOT NULL,
  preference_value JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Ensure one preference per user per key
  UNIQUE KEY unique_user_preference (user_id, preference_key),

  -- Foreign key to core_users table
  CONSTRAINT fk_user_preferences_user
    FOREIGN KEY (user_id)
    REFERENCES core_users(id)
    ON DELETE CASCADE,

  -- Index for fast lookups
  INDEX idx_user_preferences_user_id (user_id),
  INDEX idx_user_preferences_key (preference_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment for documentation
ALTER TABLE user_preferences COMMENT = 'Stores user-specific preferences for cross-device synchronization';
