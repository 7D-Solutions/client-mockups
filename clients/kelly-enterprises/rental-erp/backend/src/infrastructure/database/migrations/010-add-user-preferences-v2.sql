-- Migration: Add user preferences to core_users table
-- Date: 2025-01-26
-- Description: Add preference columns for theme, language, timezone, notifications, and display settings

-- Add preference columns to core_users table
ALTER TABLE core_users
ADD COLUMN theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
ADD COLUMN language VARCHAR(10) DEFAULT 'en',
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN push_notifications BOOLEAN DEFAULT FALSE,
ADD COLUMN gauge_alerts BOOLEAN DEFAULT TRUE,
ADD COLUMN maintenance_reminders BOOLEAN DEFAULT TRUE,
ADD COLUMN default_view VARCHAR(20) DEFAULT 'list',
ADD COLUMN items_per_page INT DEFAULT 50;

-- Create index for theme-based queries (if needed for reporting)
CREATE INDEX idx_user_theme ON core_users(theme);

-- Set defaults for existing users (only update NULL values)
UPDATE core_users
SET
    theme = COALESCE(theme, 'light'),
    language = COALESCE(language, 'en'),
    timezone = COALESCE(timezone, 'UTC'),
    email_notifications = COALESCE(email_notifications, TRUE),
    push_notifications = COALESCE(push_notifications, FALSE),
    gauge_alerts = COALESCE(gauge_alerts, TRUE),
    maintenance_reminders = COALESCE(maintenance_reminders, TRUE),
    default_view = COALESCE(default_view, 'list'),
    items_per_page = COALESCE(items_per_page, 50)
WHERE theme IS NULL
   OR language IS NULL
   OR timezone IS NULL
   OR email_notifications IS NULL
   OR push_notifications IS NULL
   OR gauge_alerts IS NULL
   OR maintenance_reminders IS NULL
   OR default_view IS NULL
   OR items_per_page IS NULL;
