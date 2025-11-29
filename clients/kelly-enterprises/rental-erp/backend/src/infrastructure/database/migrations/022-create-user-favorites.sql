-- Migration: Create user favorites table
-- Purpose: Store user-customizable favorites with drag-and-drop ordering
-- Date: 2025-10-30
-- Feature: Left sidebar navigation with personalization

-- =====================================================
-- IMPORTANT: TEST DATA ONLY
-- =====================================================
-- Current database contains only test data
-- No initial data migration needed
-- User favorites will be created through normal usage
-- =====================================================

-- =====================================================
-- TABLE: User Favorites (navigation personalization)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- User reference
  user_id INT NOT NULL,

  -- Navigation item ID (see VALID_ITEM_IDS in FavoritesService.js)
  -- Examples: 'gauge-management', 'inventory', 'out-of-service', 'low-stock'
  item_id VARCHAR(50) NOT NULL,

  -- Display order (lower numbers appear first)
  -- Position is user-controlled via drag-and-drop
  position INT NOT NULL,

  -- Audit metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  FOREIGN KEY (user_id) REFERENCES core_users(id) ON DELETE CASCADE,

  -- Prevent duplicate favorites for same user
  UNIQUE KEY unique_user_item (user_id, item_id),

  -- Fast lookup for user's favorites in display order
  INDEX idx_user_position (user_id, position)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User-customizable navigation favorites with drag-and-drop ordering';

-- =====================================================
-- Verification Queries
-- =====================================================
-- Run these to verify table was created correctly:
-- DESCRIBE user_favorites;
-- SHOW CREATE TABLE user_favorites;
-- SELECT * FROM user_favorites ORDER BY user_id, position;
